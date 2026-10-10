# B05 · Server, database and sign-in

**Stage 2 · Ground** · after: B04 · next: B06

## Goal

The API runs on Vercel, the database on Neon, and the owner signs in with an emailed code. Every
request runs as its signed-in person under RLS, proven by tests that every later table must also
pass. Roles, invitations, switches and AI credit are designed into the first migration (D52, D98),
though their screens come in B38.

## Read first

- `spec_v2.md`:
  - §5: *Every request runs as you*, and *Requests with no signed-in person*
  - §5.1: *Auth*, *Backend* and *Database*, plus *Local development*
  - §15: the opening paragraph, then `auth_*`, `user_access`, `invitations`, `user_settings` and
    `audit_log`, and *SQL views and functions*
  - §16: the `/auth/*` row, plus *Auth*, *Validation* and *Errors*
  - §17: *RLS*, *Previews never see real data* and *Login*
- Decisions: D13, D52, D54, D98, which is designed in only.
- Docs: `docs/cloud.md` §3 (no production credentials in a session) and §5.
- Skills: `database` (its rules win), `neon-postgres` and `supabase-postgres-best-practices`.

## Builds

### The database
- **A local Postgres for development and tests:** `scripts/local-db.sh start|stop|reset`, started
  by `session-start.sh`. Record how it runs in a session in `docs/cloud.md` §5.
- **Drizzle owns schema, migrations, policies and views.** Migrations run on a fresh database in CI.
- **Roles:**
  - the owner role, used for migrations only
  - `app_user`, which owns nothing and has no `BYPASSRLS`
  - Better Auth's own role, granted on `auth_*` only
- **An RLS policy helper** compares `user_id` with
  `nullif(current_setting('app.user_id', true), '')::uuid`, using `WITH CHECK` on writes.
- **A pgTAP harness** with a two-person fixture, run in CI, plus **a catalogue check that fails if
  any table lacks RLS, or a view lacks `security_invoker`.** Every later slice adds its tables to
  both.
- **Deploying migrations to production** must use the owner role without putting its URL in the
  public repo's Actions (§17). Choose between Vercel's build step, with a production-only variable,
  and `sen_ops`, and record the choice. **Either way it runs by itself on a merge to `main`, never
  from the laptop (D122)**; the build step is recommended, because a failed migration then fails
  the deploy.

### The API
- **One Hono app on Vercel Functions** (Node), sharing the Vercel project with the web app.
- **Every request:** Better Auth checks the session. Each database step then opens a short
  transaction, runs `set_config('app.user_id', …, true)` and queries as `app_user`, on a driver with
  real interactive transactions.
- **zod on every input**; errors as `{ code, message, field? }`.
- **The generic resource-route pattern for later slices:**
  - list, get, and upsert by an id the client made
  - patch of changed fields only
  - delete as a tombstone (`deleted_at`) where the outbox syncs the table
- **An `audit_log` writer,** with actor `user`, `agent` or `system`; append-only.

### Sign-in
- **Better Auth:** the email OTP plugin with a 6-digit code, sent from Sen's Gmail with its app
  password; `disableSignUp`; UUID ids; tables prefixed `auth_`; no admin plugin.
- **Tables designed in now:**
  - `user_access`: admin flag, feature switches, AI fields, `suspended_at`. Read-only to its person.
  - `invitations`
  - `user_settings`: `own_names`, `expected_payday` and `updated_at`. Later slices add their own
    columns.
- **A one-time seed** creates the owner's account with the admin flag. The steps go into
  `docs/local.md`.
- **Screens made real:**
  - `sign-in`: the code, wrong or expired codes, *Send a new code*, and *Sen is invitation-only*
  - Settings → *Account*: email, *Sign out*, and *Sign out everywhere*, which revokes every session
- **The web app's data layer is now auth-aware.** Signed out, every route goes to `sign-in`.

### Previews
- **A separate Neon project** for previews, seeded from B03's made-up scenario for the tables that
  exist. Each later slice extends the seed with its own tables.

## Leaves for later

- The shell's session (Keystore, the bridge): B07. Inviting and accepting, Members, and the credit
  ledger: B38.

## Done when

1. Sign-in by code works on a preview and in production.
2. pgTAP proves a second person can't read, insert, update or delete the first person's rows in
   every table, and `app_user` can't get round RLS.
3. Better Auth's role can't read any table except `auth_*`.
4. The catalogue check passes, and fails when a planted table lacks RLS.
5. *Sign out everywhere* revokes another browser's session.
6. Q14 is answered: does the code reach the inbox, or spam, in Gmail and one other provider?
7. The preview runs on seed data only. No preview can reach production.

## Needs from you first

- Two Neon projects: `sen` (production) and `sen-preview`, with their connection strings in
  Vercel's *Production* and *Preview* environments. Never paste them into a session.
- Sen's Gmail account and its app password, plus a random Better Auth secret, both as Vercel
  environment variables. The steps are in `docs/local.md`.

## Notes

- A cloud session never holds a production credential (`docs/cloud.md` §3). Tests run against the
  local Postgres only.
