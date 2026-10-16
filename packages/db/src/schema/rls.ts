import { sql, type SQL } from 'drizzle-orm';
import { pgPolicy, pgRole, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * The three roles (spec §17, packages/db/README.md). The first migration creates them; Drizzle only
 * refers to them. The owner role (Neon's `neondb_owner`, `sen_owner` locally) owns every table and is
 * used by migrations and the backup alone.
 */
/** The API's role: owns nothing, can't bypass RLS, sees only what its person's policies let it. */
export const appUser = pgRole('app_user').existing();
/** Better Auth's role: granted on the `auth_*` tables only. */
export const senAuth = pgRole('sen_auth').existing();

/**
 * The person a request runs as: set per transaction by the API (`set_config('app.user_id', …, true)`).
 * `nullif` because a pooled connection's setting reverts to '' after the transaction, which `::uuid`
 * would otherwise throw on. Wrapped in a subselect so Postgres evaluates it once per query, not per row.
 */
export const currentUser: SQL = sql`(select nullif(current_setting('app.user_id', true), '')::uuid)`;

type Op = 'select' | 'insert' | 'update' | 'delete';

/**
 * The RLS policy helper (B05): one policy per operation, for `app_user`, comparing `column` with the
 * request's person. Inserts and updates use `WITH CHECK`, so a row can't be written as, or moved to,
 * someone else. Grants still decide which operations exist at all (migrations' grants.sql): a table
 * a person may only read gets `['select']`.
 */
export function ownRows(
  table: string,
  column: AnyPgColumn | SQL,
  ops: Op[] = ['select', 'insert', 'update', 'delete'],
) {
  const mine = sql`${column} = ${currentUser}`;
  return ops.map((op) =>
    pgPolicy(`${table}_own_${op}`, {
      as: 'permissive',
      to: appUser,
      for: op,
      ...(op === 'insert' ? { withCheck: mine } : op === 'update' ? { using: mine, withCheck: mine } : { using: mine }),
    }),
  );
}

/** Better Auth's tables: RLS is on like every table, and only its own role passes. */
export function authOnly(table: string) {
  return [
    pgPolicy(`${table}_auth`, { as: 'permissive', to: senAuth, for: 'all', using: sql`true`, withCheck: sql`true` }),
  ];
}
