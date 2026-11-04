import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Command, WriteResult } from '@sen/core/commands';
import { senFromDb } from '@sen/core/money';
import { Id } from '@sen/core/schema';
import type { AccountRow, AccountsView, AccountView, SettingsView } from '@sen/core/views';
import { schema } from '@sen/db';
import { audit } from './audit';
import type { Env } from './context';
import type { Db } from './db';
import { ApiError, notFound, parse } from './errors';

/**
 * The ledger's routes and commands (B08, spec §7, §8, §16): accounts with their balances from the
 * balance view, the categories, and first run's start and finish. Every read and write runs as its
 * person, so RLS decides whose rows they reach; the database holds the rules (one account per app,
 * D145; Unaccounted never picked by hand; system categories never archived), and this file turns each
 * refusal into words.
 */

type Vars = Env['Variables'];
type LedgerCommand = Extract<Command, { type: `account.${string}` | `category.${string}` | `setup.${string}` }>;

export const isLedgerCommand = (cmd: Command): cmd is LedgerCommand =>
  cmd.type.startsWith('account.') || cmd.type.startsWith('category.') || cmd.type.startsWith('setup.');

/** Accounts and balances come with capture (§9.6): without it they don't appear, and the API agrees. */
function needsCapture(v: Vars) {
  if (!v.access.features.capture)
    throw new ApiError(403, 'capture_off', 'Accounts come with capture. Ask the admin to switch it on.');
}

/** A Postgres refusal, by its code and constraint, in words the person can act on. */
function refusal(e: unknown): ApiError | null {
  const err = (e as { cause?: unknown }).cause ?? e;
  const { code, constraint } = err as { code?: string; constraint?: string };
  if (code === '23505' && constraint === 'accounts_one_per_app')
    return new ApiError(409, 'account_exists', 'That app already has an account in Sen. Each app has one.');
  if (code === '23505' && constraint === 'categories_live_name')
    return new ApiError(409, 'name_taken', 'You already have a category with that name.', 'name');
  if (code === '23505') return new ApiError(409, 'exists', 'That’s already there.');
  if (code === '23514' && constraint === 'categories_system_kept_check')
    return new ApiError(409, 'system_category', 'Sen needs this category, so it can’t be archived. You can rename it.');
  if (code === '23514' && constraint === 'categories_unaccounted_flags_check')
    return new ApiError(409, 'system_category', 'Unaccounted is only for balance checks, so it takes no flags.');
  if (code === '23514' && constraint === 'categories_income_flags_check')
    return new ApiError(409, 'income_flags', 'Money-in categories take no spending flags.');
  if (code === '23514' && constraint === 'accounts_elsewhere_check')
    return new ApiError(400, 'invalid', 'An account kept elsewhere has no app and no balance in Sen.');
  return null;
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw refusal(e) ?? e;
  }
}

// --- reads ---------------------------------------------------------------------------------------

type BalanceRow = { account_id: string; balance: string | number };

/** Every live account, with its computed balance (tracked only) and the app that feeds it. */
async function accountRows(db: Db, me: string): Promise<{ row: AccountRow; opening: number; openingAt: Date }[]> {
  const a = schema.accounts;
  const rows = await db
    .select()
    .from(a)
    .where(and(eq(a.userId, me), isNull(a.archivedAt)))
    .orderBy(asc(a.createdAt), asc(a.name));
  const balances = await db.execute<BalanceRow>(
    sql`select account_id, balance from account_balances where user_id = ${me} and archived_at is null`,
  );
  const byId = new Map(balances.rows.map((b) => [b.account_id, senFromDb(b.balance)]));
  return rows.map((r) => ({
    row: {
      id: r.id,
      name: r.name,
      kind: r.kind,
      balance: r.kind === 'tracked' ? (byId.get(r.id) ?? r.openingBalance) : null,
      opening: r.kind === 'tracked' ? r.openingBalance : null,
      // the opening balance was typed from the app, so it counts as the first check; later checks arrive with B13
      checkedAt: r.kind === 'tracked' ? r.openingAt.toISOString() : null,
      app: r.notifierLabel,
      package: r.notifierPackage,
    },
    opening: r.openingBalance,
    openingAt: r.openingAt,
  }));
}

/** Settings → Categories: every category, archived ones too, in the list's order. Rules arrive with B12. */
export async function settingsCategories(db: Db, me: string): Promise<SettingsView['categories']> {
  const c = schema.categories;
  const rows = await db.select().from(c).where(eq(c.userId, me)).orderBy(asc(c.position), asc(c.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    rules: 0,
    meal: r.isMeal,
    beverage: r.isBeverage,
    discretionary: r.isDiscretionary,
    system: r.systemKey,
    archived: r.archivedAt !== null,
  }));
}

export function ledgerRoutes() {
  const r = new Hono<Env>();

  /** `accounts` (screens.md): the total, each tracked account's balance, and the ones kept elsewhere. */
  r.get('/accounts', async (c) => {
    needsCapture(c.var);
    const me = c.var.person.id;
    const a = schema.accounts;
    const [rows, archived] = await c.var.db(async (db) => [
      await accountRows(db, me),
      await db
        .select({ id: a.id, name: a.name })
        .from(a)
        .where(and(eq(a.userId, me), isNotNull(a.archivedAt)))
        .orderBy(asc(a.name)),
    ]);
    const tracked = rows.filter((x) => x.row.kind === 'tracked').map((x) => x.row);
    const view: AccountsView = {
      total: tracked.reduce((s, a) => s + (a.balance ?? 0), 0),
      tracked,
      elsewhere: rows.filter((x) => x.row.kind === 'elsewhere').map((x) => x.row),
      // the gap a balance check found: B13
      gap: null,
      archived,
    };
    return c.json(view);
  });

  /** `account`: its balance, opening balance and app. Its payments arrive with B09, its checks with B13. */
  r.get('/accounts/:id', async (c) => {
    needsCapture(c.var);
    // an id that isn't one is simply not there, as an unknown path is
    const parsed = Id.safeParse(c.req.param('id'));
    if (!parsed.success) throw notFound();
    const id = parsed.data;
    const me = c.var.person.id;
    const found = (await c.var.db((db) => accountRows(db, me))).find((x) => x.row.id === id);
    if (!found) throw notFound();
    const view: AccountView = {
      account: found.row,
      opening: found.opening,
      openingAt: found.openingAt.toISOString(),
      recent: [],
      checks: [],
    };
    return c.json(view);
  });

  /**
   * A picker's categories (§6.8): live ones of a kind, never Unaccounted (§8). Most used first once
   * there are payments (B09); until then, the list's order.
   */
  r.get('/categories', async (c) => {
    const kind = parse(z.enum(['spend', 'income']), c.req.query('kind') ?? 'spend');
    const me = c.var.person.id;
    const cat = schema.categories;
    const rows = await c.var.db((db) =>
      db
        .select({ id: cat.id, label: cat.name })
        .from(cat)
        .where(
          and(
            eq(cat.userId, me),
            eq(cat.kind, kind),
            isNull(cat.archivedAt),
            sql`${cat.systemKey} is distinct from 'unaccounted'`,
          ),
        )
        .orderBy(asc(cat.position), asc(cat.createdAt)),
    );
    return c.json(rows);
  });

  return r;
}

// --- commands ------------------------------------------------------------------------------------

/** One ledger command, as its person, with its audit entry and its undo. */
export async function runLedgerCommand(v: Vars, cmd: LedgerCommand): Promise<WriteResult> {
  const me = v.person.id;
  switch (cmd.type) {
    case 'setup.start':
      return v.db(async (db) => {
        const r = await db.execute<{ n: number }>(sql`select seed_categories() as n`);
        const n = r.rows[0]?.n ?? 0;
        if (n)
          await audit(db, {
            userId: me,
            entity: 'categories',
            entityId: me,
            action: 'seed',
            after: { n },
            actor: 'system',
          });
        return { said: n ? 'Your categories are ready' : 'Setup continues', undo: null };
      });

    case 'setup.finish':
      return v.db(async (db) => {
        const t = schema.userSettings;
        await db.insert(t).values({ userId: me }).onConflictDoNothing();
        // the first finish counts; a retry keeps its time
        const done = await db
          .update(t)
          .set({ setupDoneAt: sql`now()`, updatedAt: sql`now()` })
          .where(and(eq(t.userId, me), isNull(t.setupDoneAt)))
          .returning();
        if (done.length)
          await audit(db, { userId: me, entity: 'user_settings', entityId: me, action: 'setup.finish', actor: 'user' });
        return { said: 'You’re all set', undo: null };
      });

    case 'account.add':
      needsCapture(v);
      return guarded(() =>
        v.db(async (db) => {
          const a = schema.accounts;
          const tracked = cmd.kind === 'tracked';
          if (!tracked && (cmd.app || cmd.opening !== 0))
            throw new ApiError(400, 'invalid', 'An account kept elsewhere has no app and no balance in Sen.');
          const [row] = await db
            .insert(a)
            .values({
              id: cmd.id,
              userId: me,
              name: cmd.name,
              kind: cmd.kind,
              notifierPackage: cmd.app?.package ?? null,
              notifierLabel: cmd.app?.label ?? null,
              openingBalance: cmd.opening,
            })
            // the same id again is a retry: nothing changes
            .onConflictDoNothing({ target: [a.userId, a.id] })
            .returning();
          const undo: Command = { type: 'account.archive', id: cmd.id, archived: true };
          if (!row) return { said: `${cmd.name} added`, undo };
          await audit(db, {
            userId: me,
            entity: 'accounts',
            entityId: cmd.id,
            action: 'add',
            after: row,
            actor: 'user',
          });
          return { said: `${cmd.name} added`, undo };
        }),
      );

    case 'account.edit':
      needsCapture(v);
      return guarded(() =>
        v.db(async (db) => {
          const a = schema.accounts;
          const [before] = await db
            .select()
            .from(a)
            .where(and(eq(a.userId, me), eq(a.id, cmd.id)))
            .for('update');
          if (!before) throw notFound();
          if (cmd.opening !== undefined && before.kind !== 'tracked' && cmd.opening !== 0)
            throw new ApiError(400, 'invalid', 'An account kept elsewhere has no balance in Sen.');
          const patch = {
            ...(cmd.name !== undefined ? { name: cmd.name } : {}),
            ...(cmd.opening !== undefined ? { openingBalance: cmd.opening } : {}),
          };
          const undo: Command = {
            type: 'account.edit',
            id: cmd.id,
            ...(cmd.name !== undefined ? { name: before.name } : {}),
            ...(cmd.opening !== undefined ? { opening: before.openingBalance } : {}),
          };
          const same =
            (patch.name === undefined || patch.name === before.name) &&
            (patch.openingBalance === undefined || patch.openingBalance === before.openingBalance);
          const said = cmd.opening !== undefined ? 'Opening balance saved' : 'Account renamed';
          if (same) return { said, undo: null };
          const [after] = await db
            .update(a)
            .set({ ...patch, updatedAt: sql`now()` })
            .where(and(eq(a.userId, me), eq(a.id, cmd.id)))
            .returning();
          await audit(db, {
            userId: me,
            entity: 'accounts',
            entityId: cmd.id,
            action: 'edit',
            before,
            after,
            actor: 'user',
          });
          return { said, undo };
        }),
      );

    case 'account.archive':
      needsCapture(v);
      return guarded(() =>
        v.db(async (db) => {
          const a = schema.accounts;
          const [before] = await db
            .select()
            .from(a)
            .where(and(eq(a.userId, me), eq(a.id, cmd.id)))
            .for('update');
          if (!before) throw notFound();
          const said = cmd.archived ? `${before.name} archived` : `${before.name} is back`;
          const undo: Command = { type: 'account.archive', id: cmd.id, archived: !cmd.archived };
          if ((before.archivedAt !== null) === cmd.archived) return { said, undo: null };
          const [after] = await db
            .update(a)
            .set({ archivedAt: cmd.archived ? sql`now()` : null, updatedAt: sql`now()` })
            .where(and(eq(a.userId, me), eq(a.id, cmd.id)))
            .returning();
          await audit(db, {
            userId: me,
            entity: 'accounts',
            entityId: cmd.id,
            action: cmd.archived ? 'archive' : 'unarchive',
            before,
            after,
            actor: 'user',
          });
          return { said, undo };
        }),
      );

    case 'category.add':
      return guarded(() =>
        v.db(async (db) => {
          const c = schema.categories;
          const [row] = await db
            .insert(c)
            .values({
              id: cmd.id,
              userId: me,
              name: cmd.name,
              kind: cmd.kind,
              // after the last one
              position: sql`(select coalesce(max(position), 0) + 1 from categories where user_id = ${me})`,
            })
            .onConflictDoNothing({ target: [c.userId, c.id] })
            .returning();
          const undo: Command = { type: 'category.archive', id: cmd.id, archived: true };
          if (row)
            await audit(db, {
              userId: me,
              entity: 'categories',
              entityId: cmd.id,
              action: 'add',
              after: row,
              actor: 'user',
            });
          return { said: `${cmd.name} added`, undo };
        }),
      );

    case 'category.edit':
      return guarded(() =>
        v.db(async (db) => {
          const c = schema.categories;
          const [before] = await db
            .select()
            .from(c)
            .where(and(eq(c.userId, me), eq(c.id, cmd.id)))
            .for('update');
          if (!before) throw notFound();
          const patch = {
            ...(cmd.name !== undefined ? { name: cmd.name } : {}),
            ...(cmd.meal !== undefined ? { isMeal: cmd.meal } : {}),
            ...(cmd.beverage !== undefined ? { isBeverage: cmd.beverage } : {}),
            ...(cmd.discretionary !== undefined ? { isDiscretionary: cmd.discretionary } : {}),
          };
          const undo: Command = {
            type: 'category.edit',
            id: cmd.id,
            ...(cmd.name !== undefined ? { name: before.name } : {}),
            ...(cmd.meal !== undefined ? { meal: before.isMeal } : {}),
            ...(cmd.beverage !== undefined ? { beverage: before.isBeverage } : {}),
            ...(cmd.discretionary !== undefined ? { discretionary: before.isDiscretionary } : {}),
          };
          const said =
            cmd.name !== undefined && cmd.name !== before.name ? `Renamed to ${cmd.name}` : `${before.name} saved`;
          const same = (Object.keys(patch) as (keyof typeof before)[]).every(
            (k) => (patch as Record<string, unknown>)[k] === before[k],
          );
          if (same) return { said, undo: null };
          const [after] = await db
            .update(c)
            .set({ ...patch, updatedAt: sql`now()` })
            .where(and(eq(c.userId, me), eq(c.id, cmd.id)))
            .returning();
          await audit(db, {
            userId: me,
            entity: 'categories',
            entityId: cmd.id,
            action: 'edit',
            before,
            after,
            actor: 'user',
          });
          return { said, undo };
        }),
      );

    case 'category.archive':
      return guarded(() =>
        v.db(async (db) => {
          const c = schema.categories;
          const [before] = await db
            .select()
            .from(c)
            .where(and(eq(c.userId, me), eq(c.id, cmd.id)))
            .for('update');
          if (!before) throw notFound();
          const said = cmd.archived ? `${before.name} archived` : `${before.name} is back`;
          const undo: Command = { type: 'category.archive', id: cmd.id, archived: !cmd.archived };
          if ((before.archivedAt !== null) === cmd.archived) return { said, undo: null };
          const [after] = await db
            .update(c)
            .set({ archivedAt: cmd.archived ? sql`now()` : null, updatedAt: sql`now()` })
            .where(and(eq(c.userId, me), eq(c.id, cmd.id)))
            .returning();
          await audit(db, {
            userId: me,
            entity: 'categories',
            entityId: cmd.id,
            action: cmd.archived ? 'archive' : 'unarchive',
            before,
            after,
            actor: 'user',
          });
          return { said, undo };
        }),
      );
  }
}
