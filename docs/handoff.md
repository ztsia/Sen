# Handoff

## Where things stand (16 Oct)

**B05 · Server, database and sign-in is built and QA'd: its PR is open** from `B05/server` (brief
`docs/briefs/B05-server.md`). It waits for the owner's merge, after their one step below. Next
slice: B06 (`docs/briefs/B06-jobs-realtime-backups.md`), from `main` once B05 is merged.

**What B05 built** (READMEs in `packages/db` and `apps/api`):
- Neon via Drizzle: migrations 0000–0006 (roles, B05's tables, grants, Better Auth's ids and rate
  limits, `admin_members()`, `auth_sign_in_check()`, invitations unique by `lower(email)`). RLS on
  every table through `ownRows`; `app_user` and `sen_auth` can't bypass it.
- `pnpm test:db`: pgTAP (103: RLS for two people over every table, the catalogue check, the
  functions) and the API's 39 tests, on the local Postgres. CI job `db`, with the browser journey
  `e2e:server` (3). Every later table joins `tap_sen.fixture()` and is proven by `rls.sql` as is.
- The API at `/api` in Vercel's Build Output; Better Auth by emailed code, Sen sending the code
  itself (a failed send says so). Previews: code always `123456`, `/db-deploy.txt` reports the
  database step. Proven on live previews against Neon.
- Web: the `api` backend (server for what it holds, the fake around it in previews), sign-in and
  Settings → Account real, the signed-out gate (offline lets a signed-in person in).
- `review` follows `main` after each merge (`.github/workflows/review.yml`).

**QA:** four runs, every finding fixed but 27 (a code sent just before a suspension still signs in;
the app then signs out with *paused*). Ledger `qa/B05/ledger.md`; report, all runs:
https://claude.ai/artifact/AzAyheGoaGbcR68PSDJWdz. Last: run 4 *ship*, then its Minor fixed (tier 1).

**Decided in the build (owner to see, not to answer):**
- The API under `/api`; migrations in Vercel's build (D122's recommendation), so `sen_ops` needs no
  database URL for B05.
- Roles' passwords derive from `BETTER_AUTH_SECRET` (Neon takes plain text only, sent only when a
  role can't log in). The owner's account comes from `SEN_OWNER_EMAIL`.
- Sessions 90 days from last use; codes 10 minutes, 3 tries; codes 5 a minute per address and 5 in
  10 minutes per email. The owner's seed makes them *Unlimited* (D98).
- Writes only from Sen's own origin, as JSON.

### What to do first
1. If the PR's CI is red, fix it: the `db` job (Postgres, pgTAP, the browser journey) runs there
   for the first time.
2. After the merge: the owner's first sign-in (docs/local.md). Then B06.

### Open with the owner
- docs/local.md *Now*: `SEN_OWNER_EMAIL` in Vercel before the merge; then first sign-in, Q14 (inbox
  or spam, Gmail and one other), and sign out everywhere.

## Don't argue again
- D129–D137 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
