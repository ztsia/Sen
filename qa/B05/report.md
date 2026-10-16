# B05 · Server, database and sign-in: QA report (run 2, full, tier 3)

Published: https://claude.ai/artifact/AzAyheGoaGbcR68PSDJWdz (version 2; run 1 is version 1)

```
VERDICT   fix first
          99 criteria, 87 pass, 11 fail, 1 not reachable
          phases run: 1-6      screenshots: qa-artifacts/B05/server/screens/ (76)
```

The database and RLS hold under every attack tried, and run 1's five Majors are fixed. One new Major: when the code email fails to send, the API still answers success and the screen says a code is on its way. A second: run 1's web-side fixes are pinned only by QA's own specs, which no CI job runs. Six Minors, four of them on screens (a live-session suspension says nothing, Undo on You doesn't redraw, You errors offline in a browser, a long email is clipped).

Criteria were written from the docs before any B05 source was opened in this run. Run 1's criteria, report and ledger were read first, though, and the ledger names some of the implementation. AC-80 and FLOW-24 to FLOW-26 were added in phase 5, after the code was read. The run was cut off by a usage limit and resumed on 16 Oct, which meant repeating the diff run.

## Suites

| Suite | Result |
|---|---|
| unit | 320/320 pass |
| db | pgTAP 103/103, API 28/28 (pnpm test:db) |
| e2e | 1387/1387 pass (53.8 min) |
| e2e:server | 1/1 pass |
| qa specs | qa/e2e/b05-*: 30 run, 25 pass, 5 fail (findings 10, 21, 23, 24, 29) |
| typecheck | clean |
| lint | clean |
| diff | 1 screen changed (settings/account, as the brief asks), 0 new, 1 unexplored (reading, unchanged), 0 check findings |
| hygiene | passed (DENYLIST not set) |

## Findings, worst first

| # | Severity | Status | What breaks | AC / spec |
|---|---|---|---|---|
| 18 | Major | open | When the code email fails to send, the API answers 200 "success" and the screen says a code was sent | AC-40; spec §5.1 Auth, §17 Login; brief done-when 1 and 6 (Q14); patterns §7 Error |
| 19 | Major | open | Run 1's web-side fixes are pinned only by QA's own specs, which nothing in CI runs | AC-64; spec §5.1 (opens offline); qa skill (a test that guards a fix must fail on the code before it) |
| 1 | Major | fixed | Run 1: Nothing tested that production refuses the fixed code | qa/B05/report-run1.md |
| 2 | Major | fixed | Run 1: pgTAP couldn't see a weak UPDATE WITH CHECK | qa/B05/report-run1.md |
| 3 | Major | fixed | Run 1: Signed in but offline, opening Sen landed on sign-in | qa/B05/report-run1.md |
| 4 | Major | fixed | Run 1: After 3 wrong codes the new code was refused | qa/B05/report-run1.md |
| 5 | Major | fixed | Run 1: Malformed JSON got a 500 | qa/B05/report-run1.md |
| 10 | Minor | still failing | Run 1: A suspended person signs in and nothing says so | qa/B05/report-run1.md |
| 20 | Minor | open | A name with a NUL character gets a 500, locally and on the live preview | AC-75; spec §16 Validation, Errors |
| 21 | Minor | open | Undo on Settings → You restores the server, but the screen keeps showing the undone value | AC-74; spec §6.7; patterns §7 Toasts and undo |
| 22 | Minor | open | A write and its retry sent at the same moment are both audited | AC-73; CLAUDE.md *Every input has a dedupe key*; spec §5 (a retry is an upsert) |
| 23 | Minor | open | In a browser, going offline on Settings → You replaces the loaded payday with *Couldn't load your details* | AC-77; flows.md offline; patterns §7 Offline (a banner, not an error; what works offline still works) |
| 24 | Minor | open | Sign-in's email field isn't focused when the screen opens | AC-47; patterns §7 Forms |
| 29 | Minor | open | A long email on Settings → Account is clipped mid-address | AC-80; screens.md Account; patterns §7 Rows |
| 6 | Minor | fixed | Run 1: Code sends limited per IP only | qa/B05/report-run1.md |
| 7 | Minor | fixed | Run 1: A retried write added an audit row | qa/B05/report-run1.md |
| 8 | Minor | fixed | Run 1: /admin/members returned partial switches | qa/B05/report-run1.md |
| 9 | Minor | fixed | Run 1: Account and sign-in drifted from patterns | qa/B05/report-run1.md |
| 11 | Note | open | Run 1: Audit before/after use camelCase keys | qa/B05/report-run1.md |
| 12 | Note | open | Run 1: first-run asks to sign in again (B08) | qa/B05/report-run1.md |
| 13 | Note | open | Run 1: Every signed-out load calls /api/me and logs a 401 | qa/B05/report-run1.md |
| 14 | Note | open | Run 1: A preview's admin is a public email and code away | qa/B05/report-run1.md |
| 16 | Note | open | Run 1: The function's runtime holds the owner's DATABASE_URL | qa/B05/report-run1.md |
| 17 | Note | open | Run 1: The switch is `email`, not `email_receipts` | qa/B05/report-run1.md |
| 25 | Note | open | Unknown paths under /api/auth answer 404 with an empty body | AC-22; spec §16 Errors |
| 26 | Note | open | The API's own routes check neither Origin nor Content-Type; SameSite=Lax is the only cross-site guard | AC-75s, AC-76s; spec §17 |
| 27 | Note | open | A code sent just before a suspension still signs in | AC-72; spec §9.6 Suspend |
| 28 | Note | open | docs/local.md's Q14 SQL inserts the test address as typed | docs/local.md Q14; §5.1 |
| 15 | Note | fixed | Run 1: Pending invitations unique case-sensitively | qa/B05/report-run1.md |

### Each open or still-failing finding: detail, repro and real output

#### 18 · Major · When the code email fails to send, the API answers 200 "success" and the screen says a code was sent

Better Auth runs `sendVerificationOTP` through `runInBackgroundOrAwait`, which catches and logs any error (`better-auth/dist/context/create-context.mjs:215`). So a Gmail failure (a wrong or revoked app password, Gmail's daily limit, an outage) answers `200 {"success":true}`; sign-in moves to *Type the code* and says *Sen sent a 6-digit code to …*, and nothing ever arrives. Only Vercel's function log knows. With an unreachable SMTP host the request also hangs for nodemailer's 2-minute connect timeout before answering 200. Nothing in `api.test.ts` drives a failing mailer: its mailer always succeeds. This bites the owner's first production sign-in and makes Q14 (*inbox or spam?*) unanswerable when the real answer is *never sent*. patterns.md §7 *Error*: say what happened and what to do next.

Repro:
```
VERCEL_ENV=production DATABASE_URL=postgres://sen_owner@127.0.0.1:5432/sen_qa BETTER_AUTH_SECRET=<48 chars> GMAIL_USER=sen.qa@example.invalid GMAIL_APP_PASSWORD=nope SEN_API_PORT=8796 pnpm --filter @sen/api exec tsx src/local.ts
curl -X POST :8796/api/auth/email-otp/send-verification-otp -H 'content-type: application/json' -H 'origin: http://127.0.0.1:8796' -d '{"email":"qa-admin@example.com","type":"sign-in"}'
```
Output:
```
{"success":true} [200]

real	2m0.105s

(server log)
  timeoutType: 'CONNECT_TIMEOUT',
  code: 'ETIMEDOUT',
  command: 'CONN'

auth_verification: sign-in-otp-qa-admin@example.com|45|f   (a code stored that nobody received)
```

#### 19 · Major · Run 1's web-side fixes are pinned only by QA's own specs, which nothing in CI runs

Phase-3 probe: in `apps/web/src/data/auth.ts` `signedOut()` was made to read *can't ask the server* as signed out again (run 1's Major 3, a signed-in person opening Sen offline lands on sign-in). `pnpm test` stayed 320/320 and `pnpm --filter @sen/web e2e:server` stayed 1/1: `e2e/server.spec.ts` only walks sign-in online, and `pnpm e2e` builds with the fake backend, where the gate is skipped. Only QA's `qa/e2e/b05-offline.spec.ts` (FLOW-10c) and this run's FLOW-23 went red, and no workflow runs `qa/e2e`. The same holds for the sign-in screen's mapping of a 429 to *wait a minute* (run 1's 4) and the *paused* message (run 1's 10): their API halves are in `api.test.ts`, their screen halves only in `qa/e2e`. The ledger cites QA's specs as the evidence, so the fixes were real, but nothing will say when they regress. Move FLOW-10c (and the paused and wait messages) into `apps/web/e2e/server.spec.ts`, which CI's `db` job runs.

Repro:
```
sed -i "s/    return (await load()) === null;/    const s = await load(); return s === null || s === 'unknown';/" apps/web/src/data/auth.ts
pnpm test; pnpm --filter @sen/web e2e:server
(cd qa/e2e && ./node_modules/.bin/playwright test -c b05.config.ts b05-offline b05-r2.spec.ts:94)
git checkout -- apps/web/src/data/auth.ts
```
Output:
```
pnpm test:            Tests  320 passed (320)
e2e:server:           ✓  1 [server] › e2e/server.spec.ts:5:1 › signs in with a code, shows the email, and signs out everywhere (3.2s)
qa/e2e (QA's own):    ✘  2 b05-offline.spec.ts:10:1 › FLOW-10c signed in, then opened offline with the service worker (10.8s)
                      ✘  3 b05-r2.spec.ts:94:3 › FLOW-23 signed in, offline, then online › FLOW-23 (11.0s)
```

#### 10 · Minor · Run 1: A suspended person signs in and nothing says so

Fixed at the email step (FLOW-15 passes). Still failing with a live session: two 403s race, the first sign-in screen takes the *paused* reason and the second navigation remounts it without, so sign-in shows no word (FLOW-21). Diagnostic: 403 GET /api/me, 403 GET /api/settings, 200 POST /api/auth/sign-out ×2, then *Sign in to Sen | Your email | Sen emails you a 6-digit code.*

Repro:
```
as run 1 (qa/B05/report-run1.md)
```
Output:
```
Fixed at the email step (FLOW-15 passes). Still failing with a live session: two 403s race, the first sign-in screen takes the *paused* reason and the second navigation remounts it without, so sign-in shows no word (FLOW-21). Diagnostic: 403 GET /api/me, 403 GET /api/settings, 200 POST /api/auth/sign-out ×2, then *Sign in to Sen | Your email | Sen emails you a 6-digit code.*
```
Screenshots: qa-artifacts/B05/server/screens/FLOW-21-step-1-signed-in.png, qa-artifacts/B05/server/screens/FLOW-21-step-2-paused.png

#### 20 · Minor · A name with a NUL character gets a 500, locally and on the live preview

`you.bankNames` is `z.string().max(2000)`; Postgres `text` can't hold `\u0000`, so the insert fails with SQLSTATE 22021 and `onError` answers 500. No stack leaks. Strip or refuse control characters in zod (every later text input meets the same).

Repro:
```
curl -b <cookie> -X POST <api>/api/commands -H 'content-type: application/json' -d '{"type":"setting.set","key":"you.bankNames","value":"BEN\u0000 B"}'
```
Output:
```
local:   {"code":"server","message":"Something went wrong on Sen’s side."} [500]
         server log: code: '22021', routine: 'report_invalid_encoding_int'
preview: https://sen-9jbatnhej-ztsias-projects.vercel.app → {"code":"server","message":"Something went wrong on Sen’s side."} [500] NUL on the preview
```

#### 21 · Minor · Undo on Settings → You restores the server, but the screen keeps showing the undone value

Set the payday to day 12, tap the toast's *Undo*: `user_settings.expected_payday` is back to `last-working` with a second audit row, but the screen still has *A day* ticked with 12 in the field, because `you.tsx` keeps the payday in `useState` initialised once from the query. A reload shows the truth. A person reads the wrong payday until then, and editing the day again would write it back. Not checked whether `main`'s fake backend shows the same (the screen is B04's), but B05 is what makes the undo real.

Repro:
```
qa/e2e/b05-r2.spec.ts FLOW-22: sign in as qa-ben, /s/settings/you, A day → 12, blur, toast → Undo
```
Output:
```
Error: FLOW-22 step 2 (tap Undo): expect(locator).toBeChecked() failed
Locator:  getByRole('radio', { name: /last working/i })
Expected: checked
Received: unchecked
(database: expected_payday = last-working; audit rows a0 + 2: both passed)
```
Screenshots: qa-artifacts/B05/server/screens/FLOW-22-step-1-changed.png, qa-artifacts/B05/server/screens/FLOW-22-step-2-undone.png

#### 22 · Minor · A write and its retry sent at the same moment are both audited

`setYou` reads the row, compares, then upserts, under READ COMMITTED with no lock, so two identical requests in flight both see the old value and both write an audit row (the second with a stale *before*). The state ends right; the audit log gets a duplicate, and each has its own *Undo*. A `SELECT … FOR UPDATE` on the person's row (or an upsert with `WHERE … IS DISTINCT FROM`) would close it. An outbox retry after a timeout is exactly this case.

Repro:
```
5 × concurrent: curl -b ben.jar :8795/api/commands -d '{"type":"setting.set","key":"you.payday","value":{"kind":"day","day":N}}' &
```
Output:
```
 round 1 (day 4): audit rows added = 1
 round 2 (day 5): audit rows added = 2
 round 3 (day 6): audit rows added = 2
    action  | b | a |          created_at
 you.payday | 5 | 6 | 2026-10-15 20:29:09.959307+00
 you.payday | 5 | 6 | 2026-10-15 20:29:09.957242+00
 you.payday | 4 | 5 | 2026-10-15 20:29:09.816683+00
 you.payday | 4 | 5 | 2026-10-15 20:29:09.814246+00
```

#### 23 · Minor · In a browser, going offline on Settings → You replaces the loaded payday with *Couldn't load your details*

Signed in on the preview build, You loaded, then `context.setOffline(true)`: within 2 s the screen became the error state, while the banner above it promises *What you add is kept and syncs when you're back*. flows.md `offline`: in a browser, offline is read-only, so what was loaded should stay readable, and the banner's promise isn't true of a browser's writes (§5: in a browser, writes go straight to the API, online only). Settings → You is the only server-backed screen in B05, so it's the first to show this; every slice that moves a screen to the server will inherit it.

Repro:
```
qa/e2e/b05-r2.spec.ts FLOW-24
```
Output:
```
FLOW-24: offline on You: You're offline. What you add is kept and syncs when you're back. | You | Couldn't load your details | Check your connection, then try again. Nothing you've added is lost. | Try again
```
Screenshots: qa-artifacts/B05/server/screens/FLOW-24-step-1-online.png, qa-artifacts/B05/server/screens/FLOW-24-step-2-offline.png

#### 24 · Minor · Sign-in's email field isn't focused when the screen opens

patterns.md §7 Forms: *The first field to fill is focused.* The code step focuses its field; the email step doesn't (no autofocus), so `document.activeElement` is the body.

Repro:
```
qa/e2e/b05-r2.spec.ts FLOW-25: open /s/sign-in
```
Output:
```
FLOW-25: focused on open: (empty: document.body)
expect(received).toBe(expected)  Expected: "email"
```
Screenshots: qa-artifacts/B05/server/screens/FLOW-25-step-1-focus.png

#### 29 · Minor · A long email on Settings → Account is clipped mid-address

The Email row's value is one line that overflows its cell: with `nurul.aisyah.binti.abdul.rahman.long.address@example-university.edu.my` the first line runs past the card's right edge and the middle of the address is cut, so the person can't read their own email. Run 1 left this untested. Let the value wrap anywhere (`wrap-anywhere`, as the code step's address does) or take a line of its own.

Repro:
```
qa/e2e/b05-r2.spec.ts FLOW-26
```
Output:
```
FLOW-26: email cell: {"sw":339,"cw":155,"right":356,"vw":390}
expect(received).toBeLessThanOrEqual(expected)  Expected: <= 156  Received: 339
```
Screenshots: qa-artifacts/B05/server/screens/FLOW-26-step-1-account.png

#### 25 · Note · Unknown paths under /api/auth answer 404 with an empty body

Better Auth's handler answers its own 404 with no body, so `/api/auth/nope` (or a trailing slash on a real route) breaks §16's `{ code, message }` shape. The web app never calls one, so it's cosmetic.

Repro:
```
curl -i https://sen-9jbatnhej-ztsias-projects.vercel.app/api/auth/nope
```
Output:
```
HTTP/2 404
referrer-policy: no-referrer
x-robots-tag: noindex

(empty body)
```

#### 26 · Note · The API's own routes check neither Origin nor Content-Type; SameSite=Lax is the only cross-site guard

Better Auth's routes refuse a foreign Origin (`INVALID_ORIGIN`), but `/api/commands` accepts one, and accepts a `text/plain` body. Browsers don't send a `SameSite=Lax` cookie on a cross-site POST, so no page can use this today; it's one setting away from mattering (a `SameSite=None` change for the shell, say).

Repro:
```
curl -b admin.jar :8795/api/commands -H 'content-type: application/json' -H 'origin: https://evil.example' -d '{...you.payday...}'
curl -b ben.jar :8795/api/commands -H 'content-type: text/plain' -d '{...}'
```
Output:
```
revoke-sessions foreign origin: {"message":"Invalid origin","code":"INVALID_ORIGIN"} [403]
commands foreign origin: {"said":"Payday saved",...} [200]
text/plain json: {"said":"Payday saved",...} [200]
```

#### 27 · Note · A code sent just before a suspension still signs in

The suspension check runs when a code is asked for, not when it's used, so a code sent a minute before *Suspend* makes a session. Every route then answers 403 `suspended`, so nothing is read. B38's *Suspend* signs people out everywhere and can delete open codes then.

Repro:
```
send for qa-ben → suspend in the database → POST /api/auth/sign-in/email-otp with 123456
```
Output:
```
sessions for ben before: 1
{"token":"…","user":{"name":"Qa Ben",…}} [200] sign-in with pre-suspension code
sessions for ben after: 2
/me → {"code":"suspended",…} [403]
```

#### 28 · Note · docs/local.md's Q14 SQL inserts the test address as typed

`auth_sign_in_check` compares `auth_user.email` with `lower(trim(address))`, and the seed lower-cases, but the hand-run `insert into auth_user … values ('Test', 'you@outlook.com', true)` doesn't. An address typed with a capital (common on a phone keyboard) would then be *Sen is invitation-only*. `lower('…')` in the step fixes it.

Repro:
```
docs/local.md lines 20–29
```
Output:
```
select auth_sign_in_check('qa-ben@example.com') -- ok; a row stored as 'You@outlook.com' would never match lower(trim(…))
```

### Run 1's findings, re-checked

- **1** (Major, fixed): Nothing tested that production refuses the fixed code. Probe 6 (`fixedCode = true`) now fails 2 tests in api.test.ts; a production-target API refused 123456 with INVALID_OTP.
- **2** (Major, fixed): pgTAP couldn't see a weak UPDATE WITH CHECK. Probe 7 (`WITH CHECK (user_id is not null)` on user_settings) fails rls.sql tests 34–36.
- **3** (Major, fixed): Signed in but offline, opening Sen landed on sign-in. FLOW-10c and FLOW-23 pass. Its pin is only in qa/e2e: finding 19.
- **4** (Major, fixed): After 3 wrong codes the new code was refused. FLOW-4 passes; curl: 3 × INVALID_OTP, TOO_MANY_ATTEMPTS, resend, 123456 signs in.
- **5** (Major, fixed): Malformed JSON got a 500. not json / empty body → 400 {"code":"invalid","message":"That isn’t valid JSON."}; [1,2] → 400.
- **10** (Minor, still failing): A suspended person signs in and nothing says so. Fixed at the email step (FLOW-15 passes). Still failing with a live session: two 403s race, the first sign-in screen takes the *paused* reason and the second navigation remounts it without, so sign-in shows no word (FLOW-21). Diagnostic: 403 GET /api/me, 403 GET /api/settings, 200 POST /api/auth/sign-out ×2, then *Sign in to Sen | Your email | Sen emails you a 6-digit code.*
- **6** (Minor, fixed): Code sends limited per IP only. 6th code for one email → 429 too_many; 21st lookup from one address → 429.
- **7** (Minor, fixed): A retried write added an audit row. Sequential retry: no second row (probe 3 caught). Concurrent retries still duplicate: finding 22.
- **8** (Minor, fixed): /admin/members returned partial switches. GET as the admin: all seven switches for each member.
- **9** (Minor, fixed): Account and sign-in drifted from patterns. Email row without a tile; one banner offline (FLOW-23); cancel says *Stay signed in*. Chevron action rows kept on purpose (ledger). See eyes.md.
- **11** (Note, open): Audit before/after use camelCase keys. Left on purpose (ledger). Still so: before->>'expectedPayday'.
- **12** (Note, open): first-run asks to sign in again (B08). Left (B08). CORE-1 note: first-run signed in shows *Step 1 of 7 · Sign in to Sen*.
- **13** (Note, open): Every signed-out load calls /api/me and logs a 401. Left on purpose. Still: CORE-2 console errors ["401 GET /api/me"].
- **14** (Note, open): A preview's admin is a public email and code away. Left on purpose (made-up data only). Confirmed on the branch preview.
- **16** (Note, open): The function's runtime holds the owner's DATABASE_URL. Left on purpose (ledger).
- **17** (Note, open): The switch is `email`, not `email_receipts`. Left until B38 (ledger).
- **15** (Note, fixed): Pending invitations unique case-sensitively. PEND@ beside pend@ → duplicate key "invitations_open_email_key".

## Probes (phase 3)

| What was broken | Caught? | Note |
|---|---|---|
| auth_sign_in_check() answers 'ok' for an unknown email (0005) | Yes | admin.sql test 7 "an unknown address is not invited" failed |
| the API's suspension check removed (app.ts) | Yes | api.test.ts "refuses a suspended person": expected 200 to be 403 |
| the retried-write no-op removed (routes.ts setYou) | Yes | api.test.ts "makes a retried write a no-op": expected 4 to be 3 |
| invitations_own_select USING (invited_by is not null) (0001) | Yes | rls.sql tests 11–13 and 47–49 failed |
| signedOut() reads 'unknown' (offline) as signed out (auth.ts) | **No** | pnpm test 320/320 and e2e:server 1/1 stayed green; only QA's qa/e2e FLOW-10c and FLOW-23 went red (finding 19) |
| fixedCode = true in production (auth.ts) | Yes | api.test.ts: 2 tests failed (run 1 finding 1 fixed) |
| user_settings_own_update WITH CHECK (user_id is not null) (0001) | Yes | rls.sql tests 34–36 failed (run 1 finding 2 fixed) |
| resource DELETE made a hard delete (resource.ts) | Yes | api.test.ts "patches only the fields sent, and tombstones on delete" failed |

After each probe, `git status` showed no app source changed.

## RLS matrix (sen_qa, every cell queried)

| Table | No user id | A (admin) | B | sen_auth | Owner |
|---|---|---|---|---|---|
| user_access, user_settings, invitations, audit_log | none | a | b | permission denied | a,b |
| auth_user, auth_session, auth_account, auth_verification, auth_rate_limit | denied | denied | denied | all | all |
| `admin_members()` | "only the admin can list members" | 2 rows, switches only | "only the admin can list members" | permission denied | — |
| `auth_sign_in_check()` | permission denied (app_user) | denied | denied | ok / not_invited / suspended | — |

B's write attacks all failed:
- **Updating A's settings:** 0 rows.
- **Inserting a row as A, or giving his own row to C:** "new row violates row-level security policy".
- **Deleting A's audit rows:** permission denied.
- **Making himself admin:** permission denied.
- **`row_security = off`:** "query would be affected by row-level security policy".
- **`DISABLE RLS`:** "must be owner".
- **`SET ROLE sen_owner` or `SET ROLE sen_auth`:** denied.

On one pooled `app_user` connection, the setting reads `[]` after commit, and the next query returns 0 rows.

## Diff and eyes

The diff run covered 87 entries:
- **Changed:** 1 tree and its pixels in all 12 pairs, `settings/account`: the Email row and *Sign out everywhere*, both of which the brief asks for.
- **Unexplored:** 1, `reading`, unchanged since B04.
- **Check findings:** none.

I did the eyes pass myself, over all twelve pairs (`qa/B05/eyes.md`): *right*, plus a *look again* at long emails (finding 29).

## What I couldn't test, and why

- **Sign-in in production, and X-Robots-Tag on a production response:** production deploys only from main (D122); proved on the branch preview and a local production-target API. Queued in docs/local.md *Now*.
- **Q14: whether a real code reaches the inbox or spam:** needs Sen's Gmail and the owner's mailboxes (docs/local.md). Finding 18 means a failed send would look like spam from the outside.
- **A real Gmail send failing on Vercel (wrong app password):** no production credentials in a session; reproduced locally with an unreachable SMTP host.
- **That no preview can reach production:** Vercel's environment scoping isn't visible from a session.
- **x-forwarded-for spoofing past the per-address lookup limit on Vercel:** Vercel overwrites the header; locally it is spoofable (rotating it gave 22 × 403, no 429), which is expected off Vercel.
- **The sweep and the eyes pass as separate helpers:** this reviewer has no Agent tool (as in run 1): the sweep ran as a script, and the eyes pass was done by the reviewer itself (eyes.md).
- **Whether main shows finding 21 (Undo on You) with the fake backend:** not run; the screen is B04’s.
- **The shell's session (Keystore, the bridge):** B07.
