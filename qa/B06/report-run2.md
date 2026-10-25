# QA B06 · Jobs, realtime, push and backups, run 2

**Published report:** https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d (version 2, this run; private to the owner)

```
VERDICT   fix first
          57 criteria, 55 pass, 2 fail, 0 not reachable
          phases run: 1-6      screenshots: qa-artifacts/B06_jobs-realtime-backups/screens/
```

Full run on `B06/jobs-realtime-backups` at `3c7005a`, reviewer on Opus, 25 Oct 2026. The reviewer wrote the criteria and flows from the docs before reading the code (the run 2 sections of `acceptance.md` and `flows.md`). **Bias:** it had seen run 1's findings table before writing them, so R2-AC-36, 38 and 43 aren't independent of run 1. (The harness refused the reviewer's write; the main session saved this from its final message.)

Run 1's eight fixes hold. The scheduler, relay, health check and backups work end to end, through the real Worker (`wrangler dev`) and the real API on QA's own `sen_qa`:
- a test job set a minute ahead ran once under two simultaneous crons
- a change on one device reached another in under 5 s with no reload
- the RLS matrix is clean
- every forged, expired or swapped pass was refused

One Major is left (the relay's own checks have no test), plus five Minors that matter.

## Suites (from the sweep)

- **typecheck, lint, `pnpm test`:** all clean.
- **`pnpm security`:** passes (audit, gitleaks over 403 commits, security lint). `pnpm hygiene` passes.
- **`pnpm test:db`:** pgTAP 216 ok; API 125 pass, 7 skipped; route sweep green.
- **e2e:** `pnpm e2e` 1397 pass; `e2e:lived` 24 pass; `e2e:server` 4 pass.
- **`mutants.mjs`:** 39 of 52 killed, 5 survived, 8 stale. All 8 stale ones are killed when re-run with LF line endings (finding 4).
- **`qa-diff`:** one tree changed (`settings/data`, as the brief asks). Pixels changed in `settings/data` (12 pairs) and `settings/claims` (6 pairs, tab-label anti-aliasing only, per the eyes pass). No check findings. Two metrics flags, both noise when re-measured (ledger).
- **QA's flows** (`qa/e2e/b06r2-flows.spec.ts`, `b06r2.config.ts`): 12 flows; FLOW-R2-3 fails its stamp steps (finding 3).

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | The relay's own guards have no test: a hint posted without the secret, or a channel opened without a pass, leaves every suite green | `node scripts/mutants.mjs --only relay-hint-no-secret,relay-connect-no-pass` | R2-AC-23, 24; D100 |
| 2 | Minor | A suspended person's due one-off job makes every tick answer "next in 1 min", so the Worker wakes Neon every minute | suspend a person with a due job, then `runTick()` | R2-AC-21; D141 |
| 3 | Minor | With the relay down when a screen opens, the *Updated…* stamp stays away for 30 s (introduced by run 1's fix 6) | FLOW-R2-3 | R2-AC-32; patterns §7 |
| 4 | Minor | On Windows every multi-line breakage check reads "stale" (CRLF worktree): 8 guards unjudged, 3 of them run 1's fixes | `node scripts/mutants.mjs` | D139; run 1 #5 |
| 5 | Minor | On Windows qa-diff never confirms a flag (`\|` goes through cmd.exe), yet its report says three samples | `metrics/logs/confirm-steps-head.log` | D139 |
| 6 | Minor | Nothing tests the 30-day window on stored dumps | `mutants.mjs --only storage-counts-old-dumps` | R2-AC-46; D142 (3) |
| 7 | Minor | A person can register any number of push tokens (300 accepted); each push loops over all of them | 300 × `PUT /api/push/token` | D142 (5) |
| 8 | Minor | A plain Sign out leaves the push token on the server if the app's DELETE doesn't get through | `POST /api/auth/sign-out` without the DELETE | R2-AC-35; D142 (5) |
| 9 | Minor | The Insights tab takes about 2.5 s to settle, with a see-through frame and two skeletons. **Standing: main does the same** | re-measure the `ask` journey | eyes F2; patterns §7, §8 |
| 10 | Note | An open relay socket outlives its pass and Sign out everywhere (it carries topic-only hints) | read `channel.ts` | D100 |
| 11 | Note | A deliberate sign-out lands on *You were signed out* in error red (B05; main does it too) | FLOW-R2-6b | patterns §7 |
| 12 | Note | Settings → Data: the Checks rows don't say what they'll do, and a stale last backup carries no warning | eyes R2-1 | screens.md |
| 13 | Note | B05's `for-update-you` guard survived this run | `mutants.mjs --only for-update-you` | B05 run 2, 22 |
| 14 | Note | The scheduler functions refuse only a set user id; an empty one lists everyone | psql as app_user | §5 |

### 1 · Major · The relay's guards have no test

No suite imports `apps/worker/src/index.ts` or `channel.ts`; only `clock.ts` is tested. Checked by hand, the Worker behaves correctly today:
- `hint no bearer: 401`
- `A's signature on B's channel: refused`
- `expired pass: refused`

No suite would notice if any of that regressed:

```
| `relay-hint-no-secret` | unit | **SURVIVED** | anyone can post hints to any person's open screens, without the relay secret |
| `relay-connect-no-pass` | unit | **SURVIVED** | a screen opens any person's channel by naming it, with no signed pass |
```

### 2 · Minor · A suspended person's job keeps the scheduler awake

`jobs_people('once')` skips suspended people, but `jobs_next_once()` doesn't. Their due job never runs and never leaves `due`, and `nextTick` clamps the past time to now + 1 min:

```
tick at 2026-10-25T09:03:38.391Z: ran 0, next 2026-10-25T09:04:38.391Z (+1 min)
tick at 2026-10-25T09:03:38.410Z: ran 0, next 2026-10-25T09:04:38.410Z (+1 min)
the job: [ { status: 'due', attempts: 0 } ]
without it, now: next 2026-10-25T13:00:00.000Z
jobs_people(once) | 0      jobs_next_once | 2026-10-22 08:59:27+00
```

Nothing in this build can create it: suspending arrives with B38, and only the admin schedules one-off jobs. It becomes Major once those land. The `once` filter is also untested: `once-jobs-for-suspended` survived.

### 3 · Minor · The stamp waits 30 s

Run 1's fix 6 makes the stamp read `useLive.updatedAt`, which only the realtime module sets: on a hint, a reconnect or a 30 s poll. A screen that loads normally while the relay refuses shows no stamp until the first poll. Run 1's own FLOW-2, with its 15 s timeout, would now fail.

```
first run:  expect(locator).toBeVisible() failed ... Timeout: 15000ms ... element(s) not found
re-run:     stamp 3 s after load: 0 · stamp appeared after: 30401 ms · fallback took 30476 ms
```

Screenshots: `FLOW-R2-3-step-0-loaded-no-stamp.png`, `FLOW-R2-3-step-1-stamp.png`.

### 4 · Minor · Stale breakage checks on Windows

The repo sets `* text=auto` and Git for Windows checks out CRLF, so a `find` containing `\n` never matches. The sweep showed 8 stale, and the worktree's file was `with CRLF line terminators`.

The reviewer rewrote the worktree with `core.eol=lf` and re-ran those 8: all were killed. That covers `test-job-for-members`, `health-counts-members`, `polling-after-reconnect`, `watchdog-pushes-members`, `kept-after-sign-out` and the three motion checks. So run 1's finding 5 is only partly fixed.

### 5 · Minor · qa-diff's confirm step on Windows

```
'\sask$' is not recognized as an internal or external command,
operable program or batch file.
```

The base API run also failed (`relation "scheduled_jobs" does not exist`), so no route has main's numbers to compare against. Both flags were re-measured by hand, three runs per side (details in the ledger). Both are noise:
- `ask/3`: main 2490–2582 ms, branch 2522–2698 ms
- `refund/2`: main 1694–1826 ms, branch 1673–1809 ms

### 6 · Minor · The 30-day window is untested

```
| `storage-counts-old-dumps` | db | **SURVIVED** |
probe: 3 GB 31 days old + 2.5 GB today + 9 GB failed → { used: 2500000000, allowance: 10000000000, warnAt: 5000000000 }
```

The code is right today (only the 2.5 GB counts); no test would catch it changing.

### 7 · Minor · No cap on push tokens

```
member registered 300 of 300 made-up tokens; rows: [ { n: 300 } ]
```

There's no per-person cap and no rate limit; `fcmPusher.send` calls FCM once per token.

### 8 · Minor · Sign out and the server's token

The web app sends `DELETE /push/token`, raced against 3 s, before signing out. The server's `/auth/sign-out` deletes nothing; only `revoke-sessions` does.

```
POST /auth/sign-out (phone-2, no DELETE first): { status: 200, body: '{"success":true}' }
admin tokens after a plain sign-out: [ '../../etc/passwd', 'phone-1', 'phone-2', "t'); delete from push_tokens; --" ]
```

The odd tokens come from the hostile-value probes and are stored as literal text, as they should be.

### 9 · Minor · The Insights tab (standing)

This is the eyes pass's one `wrong`, on `ask/3`:
1. a see-through frame of Home behind skeleton bars
2. a first skeleton with no app bar
3. a second, different skeleton, still empty at 1 s

Main measures the same, so B06 didn't cause it. Suggested follow-up: the tab opens on its own skeleton, with its app bar.

### Notes 10–14

- **10.** A connected socket is never closed when its pass expires or the session is revoked, so a lost phone keeps getting topic-only hints until it disconnects.
- **11.** `200 POST /api/auth/sign-out | 401 GET /api/me` → `"You were signed out" shown => 1`, on the branch and on main (662b7d2).
- **12.** Eyes R2-1: the Checks rows look like navigation. The Export pill is low-contrast in Instrument, Mercury and Copper dark, and already was on main.
- **13.** `| for-update-you | db | **SURVIVED** |`. Its concurrent-write test may be among the 7 skipped.
- **14.** `select set_config('app.user_id','',true); select * from jobs_people('daily');` returns both people's ids. No route runs that way.

## Run 1's findings, re-checked

| Run 1 | Status | Evidence |
|---|---|---|
| 1 Major (lost phone keeps pushes) | fixed | FLOW-R2-6: 2 → 0 tokens, lost phone 401; trailing-slash and capitalised paths 404 |
| 2 Major (test routes open to members) | fixed | member gets 403 on both; mutant killed with LF |
| 3 Minor (members make health green) | fixed | `jobs_health()` is admin only (0009); mutant killed with LF |
| 4 Minor (polling test blind) | fixed | `polling-after-reconnect` killed with LF |
| 5 Minor (tooling on Windows) | still failing | both scripts run now, but see findings 4 and 5 |
| 6 Minor (stamp before load) | fixed | `stamp-before-load` killed; the fix introduced finding 3 |
| 7 Minor (toast promised a push) | fixed | *Test job set for 17:09. Push isn't set up here, so it only runs.* |
| 8 Minor (stamp moved the screen) | fixed | it's now a floating pill (FLOW-R2-3 step 1) |

## Probes (phase 3)

The reviewer added 10 entries to `qa/mutants.ts`. The four survivors are findings 1, 2 and 6; the six killed are guards that hold:

| Broke | Caught |
|---|---|
| `relay-hint-no-secret` | **no** |
| `relay-connect-no-pass` | **no** |
| `once-jobs-for-suspended` | **no** |
| `storage-counts-old-dumps` | **no** |
| `daily-jobs-for-suspended` | yes |
| `backups-shown-to-members` | yes |
| `health-passes-without-backup` | yes |
| `watchdog-pushes-members` | yes (with LF) |
| `no-hint-after-change` | yes |
| `no-reload-on-reconnect` | yes |

## Phase 4 by hand

**RLS** on the four new tables (`sen_qa`):

| As | What they reach |
|---|---|
| no user id | 0 rows in each table |
| B | 0 of A's rows; inserting or moving A's rows is refused; updating or deleting them hits 0 rows |
| A (admin) | own rows only |
| `push_token_claim` | only rows holding its one token |
| a pooled connection | its local setting is `''` after commit |

**Worker** (`wrangler dev`):
- **/health:** 503 `late: cron` before any cron run, 200 after one.
- **/schedule:** refuses no secret, the wrong secret and a junk `at`; a valid wake makes the next cron tick.
- **/hint:** refuses an unknown topic, a topic carrying data, an oversized body and non-JSON.
- **Hints:** each reaches only its own channel, as `{seq, topics}`.

**API:**
- **Push tokens:** hostile values (`'); delete…`, `../`, 4097 chars, a number, blank) either get the error shape or are stored as literal text.
- **Health:** at the boundaries (25 h, 26 h 1 min, a failed backup newer than the good one) it answers 200, 503 and 503.
- **Evening frame:** runs once per person under two simultaneous ticks, and the next tick is set for 07:00 KL.

**Bundle and CSP:** no Firebase SDK, private key, `client_email` or secret name in the bundle; the CSP names both relays exactly.

## What couldn't be tested, and why

- **A backup landing in R2 and restoring (done-when 4).** The workflow lives in the private `sen_ops`, and there are no R2 or production credentials here, by design.
- **A real push on the Xiaomi (done-when 3).** It needs the phone and the Firebase service account; it's queued in `docs/local.md`.
- **cron-job.org emailing the owner (done-when 5).** Only the local half was checked: the Worker's `/health` and `/health/jobs` both returned 503.
- **The deployed Workers and Cloudflare's Git builds.** Tested with `wrangler dev` locally.
- **The whole-codebase claude-security scan (done-when 8).** Not run; it's queued for the owner.
- **Metrics confirmation as qa-diff runs it.** It can't start on Windows, so the two flags were re-measured by hand instead.
