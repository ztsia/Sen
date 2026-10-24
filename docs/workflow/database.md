# Database: what Sen adds to the workflow's `database` skill

Sen's data layer is settled: don't redesign it (`spec_v2.md` §5, §15–§17; D52–D55). This file wins
where it differs from the plugin's skill. A wrong row or a float here is a real loss of money.

## The architecture

- **Neon Postgres.** Drizzle owns the schema, migrations, RLS policies and views. Nothing else writes
  schema.
- **One Hono API on Vercel Functions** (Node). Each request: Better Auth verifies the session; each
  database step opens a short transaction and runs `select set_config('app.user_id', $1, true)`
  (transaction-local, so a pooled connection can't carry one person's id into another request); the
  queries run as `app_user`, which owns no tables and has no `BYPASSRLS`.
- **A long request** (an agent run) opens a fresh transaction per step and never holds one across a
  model call.
- **The driver** has real interactive transactions: Neon's WebSocket `Pool`, or `pg` over the pooled
  URL. The setting must share a transaction with the queries.
- **Policies** compare `user_id` with `nullif(current_setting('app.user_id', true), '')::uuid`. The
  `nullif` matters: on a reused pooled connection the setting reverts to `''`. `WITH CHECK` on insert
  and update. Read-only tables (`user_access`, `ai_usage`) get a select policy only.
- **The owner role** is used only by migrations and the backup. The export connects as `app_user`
  with the requester's id.
- **Better Auth has its own role**, granted only on the `auth_*` tables. Sign-up is off
  (`disableSignUp`), ids are UUIDs (`generateId: "uuid"`), and its admin plugin isn't used, because
  it can impersonate people.
- **Views** are `WITH (security_invoker = true)`; functions are `SECURITY INVOKER` unless a route
  documents why not.
- **The admin (D52)** is a flag on `user_access`. Reads across people (members, invitations, monthly
  AI usage) and writes (switches, AI caps) go only through `SECURITY DEFINER` functions that check
  the flag first. Never a money table.
- **Requests without a session never set a user id.** Each kind goes through one narrow
  `SECURITY DEFINER` function that checks its token and touches only what the token names: the public
  split page (its one split), accepting an invitation (which also creates `user_access`), lunchbot's
  integration token, and the export's report-back. The calendar's `state` is signed, so it needs no
  table.
- **Cron jobs** list people through one narrow function, then run once per person, as that person.
  Each job is idempotent per person and KL date: a tick may come twice.
- **Previews never touch real data:** a separate Neon project (`sen-preview`) with the anonymised
  seed. Never a branch of production, which would copy everyone's money.
- **Neon takes a role's password only in plain text over SQL** (`docs/cloud.md` §5).

## Rules never traded off

- **Money is `BIGINT` sen in MYR.** The one exception: a subscription's declared amount, in its
  billing currency's smallest unit. Never `float`, `real` or `numeric` for money; an exchange rate is
  `NUMERIC`, for display only.
- **Every input has a dedupe key, with a `UNIQUE` constraint.** Ids are made on the phone; an event's
  id, and its transaction's, are UUIDv5 of the dedupe key. The outbox sends edits as changed fields,
  and server deletes leave `deleted_at` tombstones.
- **A prediction never shares a table with a fact:** forecasts, estimates, plans and drafts.
- **Timestamps** are `timestamptz` in UTC; day, month and pay-cycle boundaries are computed in
  `Asia/Kuala_Lumpur`.
- **Multi-row writes that must be atomic** (pairing a transfer, splitting a salary, applying a
  proposal) are one Postgres function or one transaction, never several requests.
- **Sen's tools never return claims** (`spec_v2.md` §12.2 rule 7).
- **A zod schema on every API input**, from `packages/core` (`commands.ts`).

## The vendor skills

`supabase-postgres-best-practices`, `neon-postgres` and `neon` are in `.claude/skills/` for general
Postgres and Neon practice. Where they assume Supabase (`auth.uid()`, `supabase-js`, its roles),
translate to the `app.user_id` setting above. Where they steer towards Neon's own Auth, Functions,
Object Storage or AI Gateway, Sen's decisions win: Better Auth, Vercel Functions, R2 and Vertex AI
(D54, D55).

## What must be true, for Sen

Beyond the plugin's list:
- tombstones wherever the outbox syncs
- the admin's reads across people stay within the limit above
- **RLS:** a person can't raise their own AI cap or switch on their own features; a split-link
  function reaches nothing beyond its one split; with no user id set, every table reads empty
- **Dedupe:** the same notification twice, a retried sync and a repeated split create are each a
  no-op
- **Money:** shares and apportionments sum exactly to the total, in sen
- **Tests** run with pgTAP and Vitest on the local Postgres (`scripts/local-db.sh`, `pnpm test:db`),
  never against Neon
- **Routes** are listed in `apps/api/src/routes.table.ts`, which the route sweep reads
