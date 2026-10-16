# The database

Neon Postgres, owned by Drizzle: schema, migrations, RLS policies, grants and functions
(`spec_v2.md` §15, §17; the `database` skill). Built from B05.

## Roles

| Role | Logs in as | Can |
|---|---|---|
| the owner (`neondb_owner` on Neon, `sen_owner` locally) | migrations and the backup only | own every table; bypasses RLS as their owner, so never used by a request |
| `app_user` | the API, for every request's data | only what its grants and its person's policies allow; owns nothing, no `BYPASSRLS`, a member of no role |
| `sen_auth` | Better Auth | read and write the `auth_*` tables, nothing else |

`app_user` and `sen_auth` are made by the first migration with no password. The deploy step
(`src/deploy.ts`) gives each one a password derived from `BETTER_AUTH_SECRET` (`src/roles.ts`), and
the API derives the same one to connect, so no variable holds them and no session sees them. Neon
takes only a plain password, so it's sent only when the role can't already log in with it.

## Every request runs as its person

The API opens a short transaction per step, sets `app.user_id` with `set_config(…, true)`, and
queries as `app_user` (`apps/api/src/db.ts`). Policies compare `user_id` with
`(select nullif(current_setting('app.user_id', true), '')::uuid)`, through `ownRows` in
`src/schema/rls.ts`.

## Adding a table (every later slice)

1. Its Drizzle table in `src/schema/`: `user_id` referencing `auth_user` with `ON DELETE CASCADE`,
   `.enableRLS()`, and `...ownRows('<table>', t.userId, [<the operations it allows>])`.
2. `pnpm exec drizzle-kit generate --name <slice>_<what>` in this folder, then a custom migration
   (`--custom`) with its grants to `app_user`, as `migrations/0002_b05_grants.sql` does.
3. A row per person in `tap_sen.fixture()` (`test/lib/helpers.sql`): `test/rls.sql` then proves
   nobody reads, writes or moves another's rows in it, and `test/catalogue.sql` checks its RLS,
   grants and policies.
4. A view is created `WITH (security_invoker = true)`; a `SECURITY DEFINER` function sets its
   `search_path` and checks who's asking first (`migrations/0004_admin_members.sql`).
5. Preview data for it: extend `apps/web/scripts/db-deploy.ts`' seed from the scenario.

## Commands

| Command | What it does |
|---|---|
| `scripts/local-db.sh start` | The local Postgres with pgTAP (started by the session hook) |
| `pnpm test:db` | A fresh `sen_test`, every migration, pgTAP, then the API's tests against it |
| `pnpm exec tsx src/migrate-cli.ts <owner url>` | Migrates a local database by hand |

On Vercel, `apps/web`'s build runs `scripts/db-deploy.ts` first: migrations, the roles' passwords,
and the seed (the owner's account from `SEN_OWNER_EMAIL` in production; Wei Ming in previews). A
failed migration fails a production deploy; a preview builds anyway and reports at `/db-deploy.txt`.
