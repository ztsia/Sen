# QA B06 · Jobs, realtime, push and backups, run 1

**Report:** https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d

*Written by the main session from the reviewer's final message: the harness refused the reviewer's
own write to this file.*

```
VERDICT   fix first
          51 criteria, 48 pass, 2 fail, 1 not reachable
          phases run: 1-6 (no diff report or mutants index: both scripts fail on Windows)
```

Full run on branch `B06/jobs-realtime-backups` at `bb76e60`, reviewer on Opus, 25 Oct 2026. Criteria and
flows were written from the docs before reading the code; AC-51 was added after reading the code, so its
evidence is weaker.

The scheduler, the relay and the health checks held up: overlapping ticks, forged and expired passes,
cross-channel hints, KL-date keys and the RLS matrix all behaved. Twelve of thirteen hand-made breakage
probes went red.

## Suites (from the sweep)

- typecheck and lint: clean
- `pnpm test`: 402/402
- `pnpm test:db`: pgTAP 216 ok, API 122 pass (7 skipped), route sweep green
- `pnpm e2e`: 1397 pass; `e2e:lived`: 24 pass; `e2e:server`: 4 pass
- `pnpm security` (audit, gitleaks, security lint) and `pnpm hygiene`: pass
- **`mutants.mjs` and `qa-diff.mjs` did not run** (finding 5)
- QA's own flows (`qa/e2e/b06-flows.spec.ts`): 7 of 8 pass; FLOW-5 fails because of finding 2

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Sign out everywhere leaves every phone's push token, so a lost phone keeps getting the person's pushes | Sign in, register tokens, `POST /api/auth/revoke-sessions`, count `push_tokens` | AC-51; D142 (5); flows.md lost-phone |
| 2 | Major | `POST /api/push/test` and `POST /api/jobs/test` are open to every member, not the admin only | As a member: `POST /api/jobs/test {}` → 200 | AC-38; D142 (4) |
| 3 | Minor | Any member can make `/health/jobs` green with their own `job_runs` rows | Insert a `backup`/`ok` row as `app_user` with a member's id | AC-44; D142 (2); §18 |
| 4 | Minor | The unit test for "polling stops once the relay is back" can't see polling continue | Delete `stopPolling()` in `onopen`; realtime.test.ts stays green | AC-35; D100 |
| 5 | Minor | `mutants.mjs` and `qa-diff.mjs` fail on the Windows laptop, and `qa/mutants.ts` has no B06 entry | `node scripts/mutants.mjs`; `node scripts/qa-diff.mjs` | docs/workflow/qa.md; D139 |
| 6 | Minor | *Updated just now* shows over a loading skeleton, before anything has loaded | FLOW-2 step 1 | AC-34, AC-50; patterns §7 |
| 7 | Minor | *Schedule a test job*'s toast promises a push that may never come, and nothing shows the job ran | FLOW-7 | AC-39; patterns §7 |
| 8 | Minor | The stamp moves the screen content by about 30 px when it appears and goes | FLOW-2 steps 2–3 | AC-34; patterns §7 |
| 9 | Note | Anyone who knows another person's FCM token can take it (D142's design) | As Ben, `PUT /api/push/token {"token":"tok-a"}` | D142 (5) |
| 10 | Note | The tick's own database work isn't in its `Server-Timing` | Sweep metrics | D139 |
| 11 | Note | Production's CSP also allows the preview relay | vercel.json | §17 |
| 12 | Note | Found by reading, not run: a wake that lands during a tick can be lost | scheduler.ts | D141 |
| 13 | Note | The eyes pass's other look-agains on Settings → Data | eyes.md | patterns §2, §7 |

### 1 · Major: Sign out everywhere leaves every phone's push token

D142 (5): a push token belongs to one person and sign-out deletes it, "because a stale token would show
someone's notifications on a phone they've left". `apiAuth.signOutEverywhere()` → `letGo()` → `stopPush()`
deletes only this device's token, and only if push started in this session; `/auth/revoke-sessions` revokes
every session but leaves every `push_tokens` row. Against `sen_qa`, as qa-ben with four tokens:

```
push_tokens for Ben before: 4 · sessions: 1
POST /api/auth/revoke-sessions → {"status":true}  [200]
tokens after sign out everywhere: 4
sessions: 0
```

### 2 · Major: the test routes are open to every member

D142 (4): Settings → Data's *Checks* are admin only. The screen hides them from a member, but both routes
have access `person` in `routes.table.ts` and `personJobRoutes`, rate-limited, with no admin check, and
`apps/api/test/jobs.test.ts` asserts a member gets 200.

```
== member Ben: POST /api/jobs/test (D142 says admin only)
{"runAt":"2026-10-25T08:20:00.000Z"}  [HTTP 200]
== member Ben: POST /api/push/test (D142 says admin only)
{"code":"not_configured","message":"Push isn't set up here."}  [HTTP 503]   <- got past to the send itself
```

### 3 · Minor: a member's own rows make `/health/jobs` green

`record_backup()` is owner-only, but migration 0008 grants `INSERT, UPDATE` on `job_runs` to `app_user`, and
`jobs_health()` takes `max(ran_at)` over `job='backup' and status='ok'` from everyone's rows. No route exposes
`job_runs` today: defence in depth for the guard that tells the owner backups stopped.

```
INSERT 0 1   (as app_user, app.user_id = Ben: (Ben,'backup','fake','ok'))
INSERT 0 1   ((Ben,'morning','fake-m','ok'))
GET /api/health/jobs -> {"ok":true}  [HTTP 200]
```

### 4 · Minor: a test that can't catch polling continuing

`realtime.test.ts` looks for invalidations only in the 25 s after the reconnect; the 30 s interval's next
tick lands at about 60 s. Probe P9 (deleting `stopPolling()` from `onopen`) stayed 15/15 green. Behaviour
is right today (FLOW-2 step 4).

### 5 · Minor: QA tooling on Windows, and no B06 breakage checks

```
mutants.mjs: Error [ERR_UNSUPPORTED_ESM_URL_SCHEME] ... Received protocol 'c:'
             (scripts/mutants.mjs:25: import(join(root, 'qa/mutants.ts')) needs pathToFileURL)
qa-diff.mjs: Error: pnpm install --frozen-lockfile --prefer-offline failed (null)
             (spawnSync('pnpm') with no shell)
```

No pixel or tree diff against main, no scripted checks, no Metrics section, no mutants index. `qa/mutants.ts`
has no B06 entry.

### 6 · Minor: the stamp over a loading screen

With the relay unreachable from the start, `LiveStamp` shows `real ?? new Date()`: *Updated just now* above
skeleton rows, where the app bar's title would be. Eyes pass: *wrong*. `FLOW-2-step-1-stamp.png`.

### 7 · Minor: the test job's toast

"Test job set for … Its push arrives then." on a device just told "Push isn't set up here.", or with no phone
registered. After the job ran, Settings → Data showed nothing new. Eyes pass: *wrong*.

### 8 · Minor: the stamp shifts the content

The Payday label's top moves about 30 CSS px when the stamp appears and goes (`FLOW-2-step-2-fallback.png`,
`FLOW-2-step-3-back.png`).

### Notes 9–13

- **9.** As Ben, `PUT /api/push/token {"token":"tok-a"}` (the admin's token) → 200, the row is now Ben's.
  D142 (5)'s design; tokens never leave the phone or the server.
- **10.** `POST /api/jobs/tick … queries max=2`: the tick's per-person work runs through `deps.pool`, outside
  the counted connection.
- **11.** Production's CSP `connect-src` names both relays, preview included.
- **12.** By reading: `Scheduler.cron()` saves a result built from state read before the fetch, so a `wake()`
  during that fetch is overwritten; a job scheduled after `jobs_next_once()` waits for the next frame.
- **13.** From `eyes.md`: the Checks rows read like links and never show a result; in Line the Export card and
  rows start at different left edges; in Instrument dark and Mercury dark *Export everything* barely stands
  out; a member sees nothing about backups; real server *Sat, 24 Oct, 23:30* vs the fake's *Yesterday, 03:00*.

## Probes

Each probe: one deliberate defect, its suite run, then `git checkout -- <file>`.

| # | What was broken | Caught | Suite output |
|---|---|---|---|
| P1 | Dropped `for update skip locked` from the one-off claim (`tick.ts`) | yes | ran twice |
| P2 | A frame's run reclaimed whatever its state | yes | `[ok,2]` instead of `[ok,1]` |
| P3 | The run key's day taken in UTC | yes | runs() returned `[]` |
| P4 | Morning limit 26 h → 260 h | yes | got `{ok:true}` |
| P5 | `once()` sends even when the key is already claimed (`alerts.ts`) | yes | alerts sent twice |
| P6 | `jobs_people()` stops refusing a request with a person set (0008) | yes | pgTAP 1 of 37 failed |
| P7 | `push_token_claim()` stops taking the token from its last owner | yes | pgTAP 32, 34 failed |
| P8 | `verifyPass()` ignores expiry | yes | core jobs.test.ts |
| P9 | Polling continues after reconnect | **no** | 15/15 green: finding 4 |
| P10 | Worker cron-late limit 5 → 50 min | yes | clock.test.ts |
| P11 | `MAX_SLEEP_MS` dropped | yes | clock.test.ts |
| P12 | `wake()` can move the next tick later | yes | clock.test.ts |
| P13 | The stamp shows whenever the relay isn't live | yes | live-stamp.test.tsx |

Proposed `qa/mutants.ts` entries: P1, P2, P3, P4, P5, P7 (suite `db`), P9 (suite `web`, after finding 4's
fix), and P8 and P12 under a new `unit` suite (`vitest run packages/core apps/worker`).

## Backend checks

On the reviewer's own `sen_qa` (left in place).

- **RLS matrix**, the same for `scheduled_jobs`, `job_runs`, `alerts_sent`, `push_tokens`: no user id 0,
  empty user id 0, A 1 own, B 1 own, `sen_auth` permission denied, owner role 2. B inserting for A, moving
  its row to A, updating or deleting A's: refused / `UPDATE 0` / `DELETE 0`.
- **Pooled connection:** after commit and after rollback, `app.user_id` reads back empty.
- **Routes:** `/jobs/tick` with no, wrong or cookie-only secret → 401 `{code,message}`. `/realtime/token`:
  401 signed out; another person's `channel` in the body is ignored; 300 s life. `/push/token`: 400 with
  `field: token` for oversize, number, missing, whitespace; NUL refused; SQL metacharacters stored as text.
- **Relay** (`wrangler dev`): a real pass opens its channel; swapped channel, expired, wrong key or a split
  channel don't; hints `{"seq":1,"topics":["settings"]}`; a data-bearing topic refused 400; `ping`/`pong`;
  `/health` 503 `late:[cron]` before the first cron, 200 after.
- **Done-when 1, live:** the test job ran exactly once under two crons and two direct ticks at once.
- **Timings:** every B06 route's median under 20 ms locally (no comparison with main: finding 5).
- **Built app:** no `private_key`, `client_email`, secret names, `firebase`, `gstatic` or `googleapis` in
  `dist-production` or `dist`.
- **Diff greps:** no float in any money path; divisions only on byte counts, for display.

## Not tested

- A test push arriving on the phone (done-when 3) and sign-out deleting the phone's token through the shell
  (AC-10): `docs/local.md` B06 item 5.
- A backup landing in R2 and restoring (done-when 4): `sen_ops`, production secrets.
- The deployed cron stopping and the monitor's email (done-when 5): Cloudflare and cron-job.org.
- The pixel and tree diff, scripted checks, metrics against main, `qa/mutants.ts`' standing checks
  (finding 5). The eyes pass looked at Settings → Data in all twelve looks and the flows' screenshots; no
  filmstrips, so taps weren't judged.
- The live relay under the real CSP (flows ran on `vite dev`; `production.spec.ts` checks the CSP).
- The whole-codebase claude-security scan (done-when 8): queued for the owner.
- The evening frame on its own (shares the morning's code and key scheme).

## Files

`qa/B06/acceptance.md`, `flows.md`, `eyes.md`, `results.json`; `qa/e2e/b06.config.ts`, `b06-setup.ts`,
`b06-flows.spec.ts`. To re-run the flows: `qa/e2e/node_modules` as a junction to `apps/web/node_modules`,
then `b06.config.ts`'s header.
