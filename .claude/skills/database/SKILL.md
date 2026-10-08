---
name: database
description: How to design and check the data layer and backend security of this app, a money tracker on Neon Postgres (Drizzle), with RLS keyed on user_id and enforced per request, one Hono API on Vercel Functions, and Better Auth. Use when designing tables, writing or changing a migration, SQL, an RLS policy, a view or function, an API route that touches data, or the outbox sync, and before calling any of them done.
---

# Database and backend security, for Sen

You design and review the data layer of a money app, where a wrong row or a float is a real loss.
Ported from the owner's `claude_skills` repo and cut down to this app (`spec_v2.md` §5, §15–§17;
D52–D55). Its general Supabase-first advice is replaced by the architecture below.

## The architecture (settled: don't redesign it)

- **Neon Postgres.** Drizzle owns the schema, migrations, RLS policies and views. Nothing else
  writes schema.
- **One Hono API on Vercel Functions** (Node). Every request:
  1. Better Auth verifies the session.
  2. Each database step opens a short transaction and runs
     `select set_config('app.user_id', $1, true)`. The `true` makes it transaction-local, so a
     pooled connection can't carry one person's id into another request. A long request, such as an
     agent run, opens a fresh transaction per step and never holds one across a model call.
  3. Queries run as `app_user`, a role that owns no tables and has no `BYPASSRLS`.

  Use a driver with real interactive transactions: Neon's WebSocket `Pool`, or `pg` over the pooled
  URL. The setting must share a transaction with the queries.
- **Policies** compare `user_id` with `nullif(current_setting('app.user_id', true), '')::uuid`.
  The `nullif` matters: on a reused pooled connection the setting reverts to `''`, which would
  otherwise throw. Use `WITH CHECK` on insert and update, so a row can't be moved to another person.
  Tables a person may only read, such as `user_access` and `ai_usage`, get a select policy only.
- **The owner role** is used only by migrations and the backup. The export connects as `app_user`
  with the requester's id.
- **Better Auth has its own role**, granted only on the `auth_*` tables. Sign-up is off
  (`disableSignUp`), ids are UUIDs (`generateId: "uuid"`), and the admin plugin isn't used, because
  it can impersonate people.
- **Views** are created `WITH (security_invoker = true)`, or they read as their owner and skip RLS.
  Functions are `SECURITY INVOKER` unless a route documents why not.
- **The admin (D52)** is a flag on `user_access`. Its reads across people (members, invitations,
  monthly AI usage) and its writes (switches, AI caps) go only through `SECURITY DEFINER` functions
  that check the flag first. A `security_invoker` view can't do this, because it would show the
  admin only their own rows. Never a money table.
- **Requests without a session never set a user id.** Each kind goes through one narrow
  `SECURITY DEFINER` function that checks its token and touches only the rows the token names:
  - the public split page, scoped to its one split
  - accepting an invitation, which also creates the person's `user_access` row
  - lunchbot's integration token
  - the export's report-back

  The calendar's `state` is signed with a server secret, so it needs no table.
- **Cron jobs** list people through one narrow function, then call the API once per person, which
  runs as that person. Each job is idempotent per person and Kuala Lumpur date, because Vercel Cron
  never retries a run and may deliver one twice.
- **Previews never touch real data.** They use a separate Neon project with anonymised seed data.
  A branch of production would copy everyone's money, and the owner role would bypass RLS on it.

## Rules that are never traded off

- **Money is `BIGINT` sen in MYR.** The one exception is a subscription's declared amount, in its
  billing currency's smallest unit. Never `float`, `real` or `numeric` for money. An exchange rate is
  `NUMERIC`, for display only.
- **Every input has a dedupe key, enforced by a `UNIQUE` constraint.** Ids are made on the phone. An
  event's id, and its transaction's, are UUIDv5 of the dedupe key. The outbox sends edits as changed
  fields, and server deletes leave `deleted_at` tombstones.
- **A prediction never shares a table with a fact:** forecasts, estimates, plans and drafts.
- **Timestamps** are `timestamptz` in UTC. Day, month and pay-cycle boundaries are computed in
  `Asia/Kuala_Lumpur`.
- **Multi-row writes that must be atomic** (pairing a transfer, splitting a salary, applying a
  proposal) are one Postgres function or one transaction, never several requests.
- **The agent's tools never return claims** (`spec_v2.md` §12.2 rule 7).
- **Fixtures are anonymised.** Real financial data never enters the repo.

## The vendor skills

`supabase-postgres-best-practices`, `neon-postgres` and `neon` are installed for general Postgres
and Neon practice: indexes, locking, pooling, branching. Where they assume Supabase (`auth.uid()`,
`supabase-js`, Supabase's roles), translate to the `app.user_id` setting above. Where they steer
towards Neon's own Auth, Functions, Object Storage or AI Gateway, this app's decisions win: Better
Auth, Vercel Functions, R2 and Vertex AI (D54, D55). Neon Auth, which is managed Better Auth, is the
one the foundations slice may weigh.

## Designing data

1. List every entity, relationship, mutation and input source the work implies.
2. Tables: column types, `NOT NULL`, defaults, foreign keys with `ON DELETE`, `user_id`, and the
   dedupe key's `UNIQUE` constraint.
3. Policies for each table and operation, written as above.
4. Indexes: `user_id` first in composite indexes that match the screens' queries, plus an index on
   every foreign key.
5. Boundaries: which route, which transaction, and what must be atomic.
6. A zod schema for every API input.
7. Write the Drizzle schema (or SQL), the policies, the indexes and the route boundaries, with a
   comment on any choice that isn't obvious.

## What must be true

Check every schema, migration, route and function, new or existing, against this list, by reading
it and how a request reaches it. Fix anything that fails before calling the work done:
- RLS is on, with `WITH CHECK`
- the role can't bypass RLS
- the user id is set per transaction
- views are `security_invoker`
- every input has a dedupe key
- no money as a float
- no prediction in a fact table
- tombstones where the outbox syncs
- no N+1 query, no missing index
- zod on every input
- the admin's reads across people stay within the limit

## Tests that must exist

- **RLS:** person B reads none of person A's rows through any table, view or function. The admin
  reads none of anyone's money. A person can't raise their own AI cap or switch on their own
  features. A split-link function reaches nothing beyond its one split. With no user id set, every
  table reads empty.
- **Transaction-local identity:** two concurrent requests on one pooled connection never see each
  other's user id.
- **Dedupe:** the same notification twice, a retried sync and a repeated split create are each a
  no-op.
- **Money:** shares and apportionments sum exactly to the total, in sen.

These run with pgTAP or Vitest on a local Postgres, never against Neon.
