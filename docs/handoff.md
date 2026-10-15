# Handoff

## Where things stand (15 Oct)

**B05 · Server, database and sign-in is in progress** on branch `B05/server`, brief
`docs/briefs/B05-server.md`. B04 and its QA tooling are merged (#13, #14).

**Built and verified:**
- `review` follows `main` after each merge (`.github/workflows/review.yml`, fast-forward only).
- Local Postgres: `scripts/local-db.sh` (docs/cloud.md §5). `pnpm test:db`: fresh `sen_test`,
  migrations, pgTAP (98: RLS for two people over every table, the catalogue check, the admin's
  function), then the API's 18 tests on it. CI job `db`.
- `packages/db` (README there): Drizzle schema, migrations 0000–0004 (roles, B05's tables, grants,
  Better Auth's ids and rate limits, `admin_members()`), `ownRows` policy helper, the deploy step.
- Deploy: Vercel's Build Output from `apps/web/scripts/vercel-output.mjs`: static app + the API as
  one Node function at `/api`. `apps/web/scripts/db-deploy.ts` runs first in the build. **Proved on
  real previews:** migrations on Neon, roles' passwords set, Wei Ming seeded (`/db-deploy.txt`), and
  sign-in by code over curl (`weiming@example.com`, `123456`).
- `apps/api` (README there): Better Auth (email OTP, `sen_auth`), per-request transaction as
  `app_user`, `{code,message,field}` errors, `/me`, `/settings`, `/commands` (You's names and
  payday, with audit and undo; `member.*` 403 for members), `/admin/members`, the resource pattern.
- Web shared ground: `src/data/api/` (client, backend: server for what it holds, the fake around it
  in previews), `src/data/auth.ts`, `__SEN_BACKEND__` (api on Vercel; fake/none for local e2e), the
  signed-out gate in `router.tsx`.

**In progress (a Sonnet implementer's brief, may need finishing):** sign-in and Account screens
wired to `auth`, trees re-recorded, `e2e/server.spec.ts` (journey against the local API) in CI.

**Decided in the build (owner to see, not to answer):**
- The API is under `/api` (spec §16 notes it). Migrations run in Vercel's build (D122's
  recommendation), so `sen_ops` needs no database URL for B05.
- Roles' passwords derive from `BETTER_AUTH_SECRET`; Neon takes them only in plain text, sent only
  when the role can't log in. The owner's account comes from `SEN_OWNER_EMAIL` (docs/local.md).
- Previews have no Gmail: their code is always `123456`. Production refuses to start without Gmail.
- Sessions last 90 days from last use; codes 10 minutes, 3 tries; 3 codes a minute per address.
- The owner's seed makes them *Unlimited* (D98: their usage is their own bill).

### What to do next
1. Review the implementer's work; commit; check the preview in a browser (sign-in, Account).
2. The full QA run (`qa` skill), then the PR *B05 · Server, database and sign-in*.

### Open with the owner
- docs/local.md *Now*: `SEN_OWNER_EMAIL` before the merge, then first sign-in, Q14, sign out everywhere.

## Don't argue again
- D129–D137 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
