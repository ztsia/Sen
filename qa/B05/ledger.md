# B05 · QA ledger

## After run 1 (full, Opus, 15 Oct): fix first, 5 Major, 5 Minor, 7 Note

**Tier: 3, a fresh full run.** The batch adds two migrations (`0005_sign_in_check`: a `SECURITY
DEFINER` function for Better Auth's role; `0006_invitations_email_case`: a changed unique index) and
changes navigation (the signed-out gate in `router.tsx`) and the app shell's offline banner, so it
reaches the whole flow.

| # | Severity | Fix | Evidence |
|---|---|---|---|
| 1 | Major | `api.test.ts` *codes*: production sends random codes, never `123456`, and refuses `123456`; a preview sends `123456` | QA's probe (`fixedCode = true`) now fails 4 tests; green on the real code |
| 2 | Major | `rls.sql`'s give-away test moves the row with an UPDATE whose WHERE names no column, to the third person | Under `WITH CHECK (user_id is not null)`: tests 34–36 fail; green on the real policy |
| 3 | Major | `auth.signedOut()` is true only when the server says no session; offline or a failing server lets a signed-in person in | QA's FLOW-10c passes |
| 4 | Major | Better Auth's limit on `/sign-in/email-otp` is 10 a minute (a code allows 3 tries itself); a 429 on verify says *wait a minute*, distinct from a used-up code | `api.test.ts` *takes a new code after three wrong ones*; QA's FLOW-4 passes |
| 5 | Major | `readJson` answers 400 to a body that isn't JSON; an empty PATCH is a 400 | `api.test.ts` *answers 400, not 500*; *refuses an empty patch* |
| 6 | Minor | 5 codes per email in 10 minutes, 20 lookups per address a minute (`limits.ts`, shared through `auth_rate_limit`); our 429s carry `code: too_many` | `api.test.ts` *rate limits* (4 tests) |
| 7 | Minor | The same value again changes nothing and logs nothing, in `setting.set` and the resource PUT | `api.test.ts` *makes a retried write a no-op*; *repeated PUT a no-op* |
| 8 | Minor | `/admin/members` fills all seven switches | `api.test.ts` *lists members for the admin* |
| 9 | Minor | Email row without a tile (patterns §7: a row that opens nothing has none); sign-in's buttons enabled offline, saying *Signing in needs a connection*; one banner, the shell's, with sign-in's words; the dialog's cancel says *Stay signed in*. **Kept:** *Sign out* and *Sign out everywhere* as `NavRow`s with chevrons, like B04's approved *Delete account*; *Sign out everywhere* opens its confirmation | QA's FLOW-8, FLOW-10 pass |
| 10 | Minor | `auth_sign_in_check()` (for `sen_auth` only) says `suspended`, and sign-in says *Your access to Sen is paused*; a 403 `suspended` from any route signs out and says so | `admin.sql` (4 tests); `api.test.ts` *tells a suspended person*; QA's FLOW-15 (rewritten to the new behaviour) passes |
| 15 | Note | Pending invitations unique on `lower(email)` | `admin.sql` *a second open invitation … in other case is refused* |

**Left, with reasons:**
- 11 (audit keys in camelCase): the audit log is read by Sen's code, which writes it; one naming,
  Drizzle's, is kept. Revisit if a SQL view reads `before`/`after`.
- 12 (first-run asks to sign in again): first-run is B08's.
- 13 (signed-out loads call `/api/me`): one 401 on a signed-out load; harmless, and the gate
  redirects before any screen reads.
- 14 (a preview's admin is a public email and code away): previews hold only made-up data (§17);
  the fixed code is how a preview is used without mail.
- 16 (the function's runtime holds the owner's `DATABASE_URL`): the Neon integration sets it for
  every environment's runtime; the API reads it only to build the roles' URLs (`env.ts`), and its
  tests pin that the owner's name and password never reach a connection.
- 17 (`email` vs `email_receipts`): the stored keys are `MemberSwitches`' (`@sen/core/views`), the one
  shape the app and API share; spec §15's name is the same switch. A check on the keys comes with the
  admin's writes (B38).

**Checks after the batch:** typecheck, lint, format clean; unit 320/320; `pnpm test:db` pgTAP
103/103 and API 28/28; `e2e:server` 1/1; QA's `qa/e2e/b05-*` 23/23.

## After run 2 (full, Opus, 16 Oct): fix first, 2 Major, 7 Minor, 4 Note

**Tier: 2, the run-2 reviewer resumed on the areas the fixes touched**: signing in and out (spec §17
*Login*, §16 `/auth/*`), the API's handling of a request's input (§16 *Validation*, *Errors*), and
Settings → You. No migration, no schema, RLS, view or function change; no navigation structure,
`components/ui/` part, pattern, shared store, money or theme change. The router's edit is inside
its sign-out handler only.

| # | Severity | Fix | Evidence |
|---|---|---|---|
| 18 | Major | Sen sends the code itself and waits for Gmail: a failure is `502 mail_failed`, says *Sen couldn't send the email*, and keeps no code. The per-address limit on sends moved with it (5 a minute) | `api.test.ts` *says so when the code's email couldn't be sent*; *stops a sixth code* (it caught the moved limit) |
| 19 | Major | `apps/web/e2e/server.spec.ts` (CI's `db` job): opening offline while signed in, and paused access at both steps. `src/data/auth.test.ts`: every server answer's screen result, and the gate | Reverting `signedOut()` turns 2 unit tests red; QA's specs 30/30 |
| 10 | Minor | One sign-out at a time when several requests come back 403 together; the *paused* reason is kept until the next sign-in | `server.spec.ts` *a suspended person is told*, via Settings → You (two reads at once) |
| 20 | Minor | A body holding `\u0000` is a 400 | `api.test.ts` *refuses a NUL character* |
| 21 | Minor | Settings → You resyncs when the saved values change | QA's FLOW-22 |
| 22 | Minor | The row is made and locked (`FOR UPDATE`) before comparing; the resource PUT locks too | `api.test.ts` *two identical writes sent at once*: 5 parallel, one audit entry |
| 23 | Minor | `me` and Settings' core keep their last answer on the device for offline; forgotten at sign-out | QA's FLOW-24 |
| 24 | Minor | The email field is focused when sign-in opens | QA's FLOW-25 |
| 29 | Minor | A long email wraps in Account | QA's FLOW-26 |
| 25 | Note | An unknown `/api/auth` path answers the error shape | `api.test.ts` *(25)* |
| 26 | Note | A write from another origin is a 403, and anything but JSON a 415 (Better Auth guards its own routes) | `api.test.ts` *(26)* |
| 28 | Note | The Q14 SQL in docs/local.md lower-cases the address | docs/local.md |

**Left:** 27 (a code sent just before a suspension still makes a session): every route then answers
403 and the app signs out and says *paused*, so nothing is reachable.

**Checks after the batch:** typecheck, lint, format clean; unit 335/335; `pnpm test:db` pgTAP
103/103 and API 33/33; `e2e:server` 3/3; QA's `qa/e2e/b05-*` 30/30.

## After run 3 (scoped re-check, 16 Oct): fix first, 2 Major, 2 Minor, 3 Note

All twelve of run 2's fixes held. **Tier: 2**, the same reviewer resumed on signing in and out and
the API's input handling. Finding 30's fix is one line in `forgetSession()` (sign-out), not the
offline store's design; later slices that keep money offline inherit the forgetting from it.

| # | Severity | Fix | Evidence |
|---|---|---|---|
| 30 | Major | `forgetSession()`, which every way a session ends passes through (401, 403 suspended, sign-out), forgets the kept reads too | `auth.test.ts` *are forgotten whenever the session is*; QA's FLOW-31 passes |
| 32 | Major | The API's test pools are 10 wide and the test sends 20 writes at once | Without `FOR UPDATE`: *two identical writes sent at once* fails on a fresh `pnpm test:db`; with it, 37/37 |
| 31 | Minor | A NUL anywhere in a body to `/api/auth/*` is a 400, before Better Auth | `api.test.ts` *(31)* |
| 33 | Minor | A `null` or malformed Origin on a write is a 403 | `api.test.ts` *(33)* |
| 34 | Note | Only a real NUL is refused (`hasNul` on the parsed body), not the text `\u0000` | `api.test.ts` *(34)* |
| 35 | Note | Gmail's connection, greeting and socket time out in 10, 10 and 20 seconds | `mail.ts` |
| 36 | Note | The send route parses its own body (a bad one is a 400) and checks Origin | `api.test.ts` *(36)* |

**Checks after the batch:** typecheck, lint, format clean; unit 336/336; `pnpm test:db` pgTAP
103/103 and API 37/37; `e2e:server` 3/3; QA's `qa/e2e/b05-*` 33/33.
