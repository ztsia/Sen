# B05 · Server, database and sign-in: acceptance criteria

## Run 1 (full, 15 Oct)

Written from `spec_v2.md` (§5, §5.1, §9.6, §15, §16, §17), `docs/decisions.md` (D13, D52, D54, D98,
D122, D127), `docs/briefs/B05-server.md`, `docs/screens.md` (`sign-in`, Settings → Account),
`docs/flows.md` (`invited`, `lost-phone`, the core journeys), `docs/ui/patterns.md` §7 and
`docs/cloud.md` §3/§5 **before any B05 source was opened**. `docs/handoff.md` and the diff's file list
were read for scope only. The CLAUDE.md commands section was read for how to start the database.

The slice has a database, an API and two real screens (`sign-in`, Settings → Account): phases 1–6 run.
Conventions: money is integer sen; each criterion has a sad twin (`-s`); section I is the non-negotiables.

## A. Database: roles and RLS (spec §5, §15, §17; brief *The database*)

AC-1   Every table in the app's schemas has RLS enabled
       Then  `pg_class.relrowsecurity` is true for every table in `public` (auth_* included or explicitly
             reachable only by sen_auth)
       Spec  §15 opening, §17 RLS, CLAUDE.md
AC-1s  The catalogue check fails when a planted table lacks RLS, or a planted view lacks `security_invoker`
       Spec  brief Done-when 4, §15 *SQL views*

AC-2   `app_user` can't get round RLS
       Then  `rolbypassrls = false`, `rolsuper = false`, owns no table, view or function
       Spec  §5, §17, brief Done-when 2
AC-2s  As app_user, `SET row_security = off` then a select of another person's rows errors or returns 0 rows;
       `ALTER TABLE … DISABLE ROW LEVEL SECURITY` is refused (not owner)

AC-3   Person B reads none of person A's rows
       Given A and B each with rows in user_access, user_settings, audit_log (and invitations where scoped)
       When  app_user with `app.user_id` = B selects every table
       Then  0 of A's rows in each
       Spec  §17, brief Done-when 2, CLAUDE.md RLS
AC-3s  With `app.user_id` unset, or set to '', app_user reads 0 rows from every table and no error leaks a row

AC-4   Person B can't write A's rows
       Then  insert with user_id = A fails WITH CHECK; update/delete of A's rows changes 0 rows;
             B can't move their own row to user_id = A
       Spec  brief *RLS policy helper* (WITH CHECK on writes), Done-when 2
AC-4s  Same writes for B's own rows succeed where the table is writable to its person

AC-5   `user_access` is read-only to its person
       Then  as app_user with A's id, A reads A's user_access row
       Spec  §15 user_access ("read-only to its person; written only by the admin's functions")
AC-5s  A cannot update their own `is_admin`, `features`, `ai_unlimited`, `suspended_at`, nor insert a second
       user_access row, nor delete theirs (error or 0 rows)

AC-6   Better Auth's role reaches only `auth_*`
       Then  sen_auth can read/write auth_user, auth_session, auth_account, auth_verification
       Spec  §5 *Requests with no signed-in person*, brief Done-when 3
AC-6s  sen_auth: `select` on user_settings, user_access, invitations, audit_log → permission denied

AC-7   `audit_log` is append-only, with actor in (user, agent, system)
       Then  app_user can insert an own row with actor `user`
       Spec  §15 audit_log, brief *audit_log writer*
AC-7s  app_user update/delete of own audit rows → refused or 0 rows; actor 'admin' or NULL → rejected

AC-8   One pending invitation per email
       Then  `UNIQUE (email) WHERE accepted_at IS NULL` exists
       Spec  §15 invitations
AC-8s  A second pending invitation for the same email fails; once the first is accepted, a new one is allowed

AC-9   The admin never reads anyone's money (D52)
       Given the owner with is_admin, and member B
       Then  as app_user with the owner's id, B's user_settings and audit_log rows are invisible (0 rows)
             and the admin's member listing returns only invitations/switches/credit/support facts
       Spec  §9.6, §17 *The admin*, D52
AC-9s  A member calling the admin's function gets an error or nothing, never the member list

AC-10  A pooled connection never carries a user id across requests
       When  one connection runs A's transaction (set_config local) then B's
       Then  after A's commit `current_setting('app.user_id', true)` is empty; B sees only B's rows
       Spec  §5 *Every request runs as you*
AC-10s A set_config with is_local=false would leak; the code must use is_local=true (verified by the
       identity test failing when it's changed)

AC-11  Ids are UUIDs; Better Auth's tables are prefixed `auth_`; no admin plugin
       Spec  §5.1 Auth, §15
AC-11s No `auth_user.role`/`impersonatedBy` columns (admin plugin) exist

AC-12  Migrations run on a fresh database, and a re-run is a no-op
       Spec  brief *Drizzle owns schema … Migrations run on a fresh database in CI*
AC-12s A second run of the migrator changes nothing (no error, no duplicate role or policy)

## B. The API (spec §16; brief *The API*)

AC-20  A signed-in request runs as its person
       Then  `/api/me` (or equivalent) for A returns A's email and settings, for B returns B's
       Spec  §5, §16
AC-20s No session cookie → 401 `{code, message}`, never 500 and never a row

AC-21  zod on every input; errors `{ code, message, field? }`
       Then  a valid settings write → 2xx, row changed in the database
       Spec  §16 Validation, Errors
AC-21s Missing field, wrong type, out-of-range payday (0, 32, -1, 1.5), 10 000-char name, SQL metacharacters,
       malformed JSON → 4xx with `{code,message,field?}`; no stack trace, no 500, no row change

AC-22  Unknown route / wrong method → structured 404/405, never an HTML stack
       Spec  §16 Errors
AC-22s Path traversal (`/api/../../etc/passwd`, `%2e%2e`) → 404 structured

AC-23  Writes are idempotent by a client-made id (dedupe key)
       When  the same command (same id) is posted twice
       Then  the second changes nothing: one audit row, same state
       Spec  CLAUDE.md *Every input has a dedupe key*, §5 *a retry is an upsert*
AC-23s The same id with a different body does not apply twice or silently overwrite (rejected or no-op)

AC-24  Every change writes `audit_log` with actor `user`, before and after
       Spec  §6.7 *Every change is in audit_log*, brief
AC-24s A rejected (invalid) write writes no audit row

AC-25  The admin's routes refuse everyone else
       Then  owner → `/api/admin/members` 200; a member → 403 structured; `member.*` command by a member → 403
       Spec  brief *The admin's routes*, §16
AC-25s No session → 401 on `/api/admin/*`

AC-26  `X-Robots-Tag: noindex` on every production response (web app and API, errors included)
       Spec  D127, brief
AC-26s A 404 and a 401 from the API carry it too

AC-27  Resource routes: list, get, upsert by client id, patch of changed fields, tombstone delete
       Then  B's GET of A's resource id → 404 (no data); patch of one field leaves the others
       Spec  brief *generic resource-route pattern*
AC-27s Upsert of a row with another person's id/user_id never touches theirs

AC-28  Code sends are rate-limited per address
       Spec  brief (rate limits), §17 Login
AC-28s Over the limit → 429 structured, no new code

## C. Sign-in and Account (screens.md `sign-in`, Settings → Account; flows `invited`, `lost-phone`; §17 Login)

AC-40  An invited/known email gets a 6-digit code; the right code signs in
       Then  the app lands on `home`; an `auth_session` row exists; Account shows the email
       Spec  screens.md `sign-in`, D13, §5.1
AC-40s A wrong code shows a wrong-code message, stays on the code step, creates no session

AC-41  Sign-up is off
       When  an email with no account asks for a code
       Then  *Sen is invitation-only* shows; `auth_user` count unchanged
       Spec  §5.1 `disableSignUp`, flows `invited`
AC-41s Posting a correct-looking code for an unknown email directly to the API creates no user

AC-42  An expired or exhausted code fails, and *Send a new code* recovers
       Then  the expired/used-up message, then *Send a new code* sends one that works
       Spec  screens.md `sign-in`, flows `first-run` (Wrong or expired code)
AC-42s After the allowed wrong tries, even the right code is refused

AC-43  Signed out, every route goes to `sign-in`
       When  deep links `/`, `/settings/account`, `/more/…` open with no session
       Then  `sign-in` shows; no money is rendered
       Spec  brief *Signed out, every route goes to sign-in*
AC-43s An expired/revoked session cookie behaves as signed out (not a broken screen or error page)

AC-44  *Sign out* ends this session
       Then  back to `sign-in`; this session's row gone; reload stays on `sign-in`
       Spec  screens.md Account
AC-44s Other browsers stay signed in after a plain *Sign out*

AC-45  *Sign out everywhere* revokes every session, another browser's included
       Then  `auth_session` rows for the person = 0; browser 2's next request → sign-in
       Spec  §17 Login, flows `lost-phone`, brief Done-when 5
AC-45s Another person's sessions are untouched (count unchanged)

AC-46  Sign out everywhere is confirmed first (destructive, can't be undone → a dialog)
       Spec  patterns §7 *Dialogs only for something destructive that can't be undone*
AC-46s Cancelling the dialog revokes nothing

AC-47  The sign-in form follows patterns
       Then  Field with label above and message below; email `inputMode=email`; code `inputMode=numeric`,
             `autocomplete=one-time-code`; first field focused; submit stays enabled and says what's missing
       Spec  patterns §7 Forms
AC-47s Submitting an empty or malformed email shows a message under the field, no request sent with junk

## D. Seeds and previews (brief *Previews*, §17)

AC-50  The owner's seed makes one admin account, once
       Then  one auth_user, one user_access with is_admin = true; running the seed again changes nothing
       Spec  §5.1 Auth, brief *one-time seed*
AC-50s Without the owner email set, the seed does nothing (no account with an empty or default email)

AC-51  The preview seed is made-up data only (Wei Ming), idempotent
       Spec  §17 *Previews never see real data*, CLAUDE.md
AC-51s A re-run makes no duplicate rows

AC-52  The fixed preview code never works in production
       Spec  §17 Login, brief Done-when 7
AC-52s A production build/config without Gmail refuses to start, rather than falling back to a fixed code

AC-53  Local tooling can't reach a remote database
       Spec  docs/cloud.md §3
AC-53s A non-local DATABASE_URL given to the local API is refused

## I. Non-negotiables touched

AC-60  Money is integer sen: every money column in B05's tables (`ai_free_monthly`, `ai_daily_ceiling`,
       `ai_welcome_credit`) is BIGINT; the diff has no parseFloat/toFixed/Number() on amounts
       Spec  CLAUDE.md, §15
AC-60s No numeric/real/double precision money column

AC-61  Secrets never ship: the built JS contains no DATABASE_URL, BETTER_AUTH_SECRET, Gmail password or role password
       Spec  §17 Secrets, CLAUDE.md
AC-61s The session cookie is HttpOnly (JS can't read it), Secure in production, SameSite set

AC-62  Real financial data never enters the repo: seeds and fixtures are made-up
       Spec  CLAUDE.md
AC-62s `pnpm hygiene` passes

AC-63  One set of UI patterns: sign-in and Account use the shared blocks (GroupCard/NavRow, Field, Dialog),
       their empty/loading/error states follow patterns §7
       Spec  CLAUDE.md, patterns §7
AC-63s An API error on Account (e.g. sign out fails offline) shows what happened and what to do, not a blank

## Added during phase 5 (after the code was read: weaker evidence)

AC-64  Signed in, the app opened offline stays signed in and opens what works offline
       Spec  flows.md `offline` (Review, manual entry and scanning work offline), §5.1 (the service worker
             caches every file, so the app opens offline), §18
AC-64s Offline is never read as signed out: no `sign-in` screen for someone whose session is valid

AC-65  A suspended person is told, in words, that their access is paused
       Spec  §9.6 *Suspend*, D52, D98 (the API refuses them from B05)
AC-65s Their screens never show data the server refused, as if nothing were wrong
