# Handoff

## Where things stand (15 Oct)

**B05 · Server, database and sign-in is in progress** on branch `B05/server`, brief
`docs/briefs/B05-server.md`. B04 and its QA tooling are merged (#13, #14).

**Done so far:**
- `review` had sat two days behind `main` (an early redesign snapshot); moved to `main` with the
  owner's yes. `.github/workflows/review.yml` now fast-forwards `review` to `main` after every merge
  when `review` is already merged; tip for a stale page in `docs/local.md`.
- `scripts/local-db.sh start|stop|reset|url`: Postgres 16 from Ubuntu's packages, run as `postgres`
  in `/var/lib/sen-pg`, trust auth on 127.0.0.1:5432, databases `sen_dev` and `sen_test`, owner role
  `sen_owner`. pgTAP 1.3 and `pg_prove` from apt, after an `apt-get update` (a fresh VM's index lacks
  them). Starts in about 1.5 s.
- The deploy shape (probe): `apps/web/scripts/vercel-output.mjs` writes Vercel's Build Output v3
  after `vite build`: the web app as static files and the API (`apps/api`, Hono) bundled by esbuild
  into one Node function at `/api`. vercel.json stays the source of headers and rewrites, translated
  into routes. `X-Robots-Tag: noindex` added there (D127).

**Decided in the build (owner to see, not to answer):**
- The API lives at `/api/*` on the web app's own domain (§16's paths, under `/api`).
- `app_user` and `sen_auth` are created by the first migration without passwords; the deploy step
  sets each one's password from an HMAC of `BETTER_AUTH_SECRET`, so the owner adds no variable.
- The owner's account comes from `SEN_OWNER_EMAIL` (Vercel, Production), created by the deploy
  step when no admin exists: one variable instead of a seed command.
- Previews have no Gmail: there, sign-in codes are fixed and shown by the dev panel. Production
  always sends real mail and refuses to start without it.

### What to do next
1. Check the probe's preview: `/api/health` answers and the web app's headers survive.
2. `packages/db`: Drizzle schema (auth_*, user_access, invitations, user_settings, audit_log),
   roles and grants, policies, the deploy step, seeds. pgTAP harness and catalogue check in CI.
3. `apps/api`: Better Auth (email OTP), per-request transaction as `app_user`, errors, resource
   routes, audit writer, admin guard. Then the web app: auth-aware, sign-in and Account real.

## Don't argue again
- D129–D137 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
