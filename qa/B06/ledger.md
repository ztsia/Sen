# B06 · QA ledger

## Run 1 → fixes (25 Oct)

One batch, **tier 3** (a fresh full run): finding 3's fix adds migration 0009, which changes a SQL
function (`jobs_health()`), and finding 8's changes the shared screen frame (`src/frame/screen.tsx`).

| Finding | Fix | Guard (red before the fix) |
|---|---|---|
| 1 Major | `/auth/revoke-sessions` deletes every one of the person's push tokens, once the sessions are revoked (`app.ts`) | `jobs.test.ts` › *forgets every phone’s token when the person signs out everywhere*: red `expected 2 to be +0`; mutant `revoke-keeps-tokens` |
| 2 Major | `POST /push/test` and `/jobs/test` refuse a member, 403 `forbidden`; the route table says `admin` | *refuses the test push and the test job to a member*: red `{status: 200, …}`; the old tests now run as the admin; mutant `test-job-for-members` |
| 3 Minor | `jobs_health()` counts only the admin's runs (0009) | *counts only the admin’s runs*: red `{ ok: true }`; mutant `health-counts-members` |
| 4 Minor | The polling test runs past two of the old interval's beats, answering pings | QA's probe P9 (deleting `stopPolling()`) now red; mutant `polling-after-reconnect` |
| 5 Minor | `mutants.mjs` imports by file URL; both scripts start pnpm through Windows' shell; `qa-diff` doesn't try `local-db.sh` on Windows. Twelve B06 breakage checks in `qa/mutants.ts`, and a `unit` suite (core and the Worker) | run 2 runs both |
| 6 Minor | The stamp says nothing until the screen has loaded once | `live-stamp.test.tsx` › *says nothing before the screen has loaded once*: red; mutant `stamp-before-load` |
| 7 Minor | `/jobs/test` answers whether push is on; the toast promises a push only then | `jobs.test.ts` asserts `push: true` |
| 8 Minor | The stamp is a pill floating over the content's top, so nothing moves | run 2's eyes pass |

**Left:** notes 9–13. 9 is D142 (5)'s design. 10, 11 and 12 are named for later: the tick's
per-person queries outside `Server-Timing`, production's CSP naming the preview relay, and a wake
during a tick (a few milliseconds' window; read, not reproduced). 13's look-agains go to run 2's eyes.

## Run 2's metrics flags (25 Oct, the reviewer)

qa-diff's confirm step can't start on Windows (run 2, finding 5), so both flags were single samples.
Re-measured by hand, three times on each side at once (`e2e/diff.config.ts`, `--repeat-each 3`):

| Flag | Main (ms) | Branch (ms) | Verdict |
|---|---|---|---|
| `step:ask/3` settle (first pass 2908 vs 455) | 2582, 2533, 2490 | 2698, 2522, 2551 | **Noise against main; standing.** Main's 455 was an outlier. Over the 1000 ms limit on both: the Insights tab's first frames (eyes run 2, F2). Follow-up: the tab opens on its own skeleton with its app bar (run 2, finding 9) |
| `step:refund/2` settle (first pass 1835 vs 1189) | 1694, 1760, 1826 | 1673, 1733, 1809 | **Noise against main; standing.** Over 1000 ms on both |

B06's diff touches neither screen beyond comments and the shared frame's wrapper; the numbers agree.

## Run 2 → fixes (25 Oct)

One batch, **tier 3** (a fresh full run): finding 2's fix adds migration 0010, which changes two SQL
functions (`jobs_next_once()`, `push_token_claim()`), and finding 3's changes the realtime store every
screen reads (`src/data/realtime.ts`).

| Finding | Fix | Guard (red before the fix) |
|---|---|---|
| 1 Major | The Worker's routes get tests, with stand-in Durable Objects (`apps/worker/src/index.test.ts`; `cloudflare:workers` is swapped for a stub in the `worker` project): a hint needs the relay secret (not the scheduler's), a screen opens only the channel its signed pass names (none, a bare channel name, a forged or expired pass are refused), a wake needs the scheduler's secret | mutants `relay-hint-no-secret`, `relay-connect-no-pass` |
| 2 Minor | `jobs_next_once()` skips suspended people, as `jobs_people('once')` does (0010) | `jobs.sql`: *nor sets the next wake*, *a suspended person's due job doesn't run*; mutants `next-once-for-suspended`, `once-jobs-for-suspended` |
| 3 Minor | The realtime module dates the stamp from a screen's first successful load (the query cache), not only from a hint, reconnect or poll | `realtime.test.ts` › *dates the stamp from the first load, without waiting for a poll*: red `expected null to deeply equal …`; mutant `stamp-waits-for-poll` |
| 4 Minor | `mutants.mjs` matches each find in the file with its CRLFs read as LF | the eight checks run 2 found stale, re-run in a fresh (CRLF) worktree |
| 5 Minor | Both scripts quote any argument with a space or one of cmd.exe's operators (`&|<>^()%!`); checked with a pattern holding `|`, `\`, `&` and quotes. The base API run's failure was this laptop's `pg_prove` shim, which ran `/work`'s tests (the branch's) against main's schema; it now copies the calling checkout's `test/` into the container | run 3's qa-diff |
| 6 Minor | A test for the 30-day window: a good dump 31 days old and a failed one today hold nothing | `jobs.test.ts` › *counts only the good dumps of the last 30 days as held*; mutant `storage-counts-old-dumps` |
| 7 Minor | `push_token_claim()` keeps each person's newest ten tokens; registering again makes a token new (0010) | *keeps a person’s newest ten tokens …*; mutants `push-tokens-uncapped`, `push-token-not-refreshed` |
| 8 Minor | A sign-out that ends the person's last session deletes their tokens on the server; with another session left, the app's DELETE is what forgets that phone (D142 (5), reworded) | *forgets the person’s tokens when a sign-out ends their last session*; mutants `sign-out-keeps-tokens`, `sign-out-forgets-other-phones` |

**Left:**
- **9 (standing):** the Insights tab's first frames are main's too. Follow-up: the tab opens on its own
  skeleton with its app bar, in the slice that builds Insights.
- **10:** an open socket outlives its pass and the session. It carries topic-only hints, and the
  screen can do nothing with one without a session, so it's left.
- **11:** a deliberate sign-out says *You were signed out* in error red; it's B05's, and main does it
  too. Named for the slice that next touches sign-in.
- **12:** the Checks rows' wording, and the stale-backup warning, go to run 3's eyes pass.
- **13:** `for-update-you` (B05) survives. Its test runs (`api.test.ts`, *two identical writes sent at
  once*, 20 at a time) and isn't one of the 7 skipped, but it doesn't catch the lock's removal here.
  B06 doesn't touch that route; named as a follow-up for B05's area (`docs/handoff.md`).
- **14:** an empty `app.user_id` is the scheduler's own call: that is how the tick lists people. No
  route runs that way.

**The guards, judged** (`node scripts/mutants.mjs --only …` at 5730827, in a fresh worktree checked
out with CRLF line terminators): 18 of 18 killed. They are the ten above plus the eight run 2 found
stale on Windows (`test-job-for-members`, `health-counts-members`, `polling-after-reconnect`,
`watchdog-pushes-members`, `kept-after-sign-out`, `motion-ignores-reduced`, `motion-home-tab-pops`,
`ripple-flashes-on-scroll`), so finding 4's fix holds. Unit 412 pass, pgTAP 218, API 128 pass and 7
skipped, typecheck and lint clean.

## Run 3 → fixes (25 Oct)

Sorted fix by fix. The batch is **tier 2**, from note 11's fix, which changes how the Worker's
scheduler behaves (one area, no migration). The rest are tier 1: tests, a word, and a formatting rule.

| Finding | Tier | Fix | Guard (red before the fix, or the break QA used) |
|---|---|---|---|
| 1 Major | 1 (test) | `jobs.test.ts` › *never counts a failed backup as the last one*: the newest backup failed and the last good one is 49 h before the morning tick. The monitor answers 503 `late: [backup]`, Settings → Data shows the good one, and the watchdog pushes the admin | `r3-health-counts-failed-backup`, `r3-last-backup-counts-failed` killed |
| 2 Major | 1 (test) | `scheduler.test.ts` drives the Durable Object's `cron()` with a stand-in storage and tick (the Worker's stub base class now keeps `ctx` and `env`): one tick in 3 hours of crons, and a failed tick retried at 5 minutes, not each minute | `r3-scheduler-ticks-every-minute` killed |
| 3 Major, not B06's | — | **Deferred.** The toast over the Members *Remove* sheet comes from shared toast and sheet layering B06 doesn't touch. `git diff main...HEAD` on `components/ui`, `blocks` and `members.tsx` shows two lint comments only. Named in the handoff as a follow-up for main | — |
| 4 Minor | 1 (test) | `jobs.test.ts` (core) › *refuse a signature changed in any one byte*: the first, 16th and last bytes | `r3-pass-checks-one-byte` killed |
| 5 Minor | 1 (test) | The hint test names `['settings']` for the `jobs` topic, instead of comparing with `TOPIC_QUERIES` itself | `r3-jobs-topic-reloads-nothing` killed |
| 6 Minor | 1 (a word) | Past half, the row reads *5.70 GB of 10 GB, over half* (`storageWords`, moved to `data/checks.ts`) | `checks.test.ts` › *says when backups pass half of R2*: red `storageWords is not a function`; `storage-warning-no-words` killed. No screenshot: the fake has no over-half state, and a run's eyes see it in the preview |
| 7 Minor | 1 (tooling) | `push-token-shared` (0008's replaced copy) removed; the reviewer's `r3-push-token-shared-0010` holds it. Every other migration check edits the function's last definition (listed). A note above `MUTANTS` says so | `r3-push-token-shared-0010` killed |
| note 9 | 1 | `formatBytes` says GB from 999.5 MB | `checks.test.ts`: red `expected '1000 MB' to be '1.00 GB'` |
| note 11 | **2** | A wake asked for while a tick runs is kept and applied when it ends, and the tick's save keeps the latest cron time | `scheduler.test.ts` › *keeps a wake that comes while a tick runs*: red (`next` was the API's 3 h, not the wake's 10 min); `scheduler-loses-wake-in-tick`, `scheduler-cron-steps-back` killed |

All nine checks were killed at e025494. Unit 416 pass, pgTAP 218, API 129 pass and 7 skipped,
typecheck and lint clean. The re-check for tier 2 is run 3's reviewer, resumed on the scheduler.

**Left:** note 8 (a preview's moved clock can't say *Today* for a real backup; production's label
reads the real clock); note 10 (`/health/jobs` is open by design, D141, so cron-job.org needs no
secret; one query per call, every 3 hours); 12 (accepted, measured, not B06's); 13 (B05's
`for-update-you`, as run 2); 14 (the eyes' look-agains, named for the slice that next touches
Settings → Data).

## Run 3's scoped re-check → fixes (25 Oct)

The scheduler re-check said **ship** for its area (findings 2 and 11 fixed, measured on the real
Worker), with two gaps in the tests. Both are tier 1: tests only, at 9db4fac.

| Finding | Fix | Guard |
|---|---|---|
| 15 Minor | `scheduler.test.ts` › *says ticks are failing once they have failed for 15 minutes*: refused ticks, `/health` ok at 14 minutes, `late: ['tick']` at 16 | `r3s-failure-not-remembered` killed |
| 16 Minor | › *keeps the sooner of two wakes that come while a tick runs* | `r3s-later-wake-wins` killed |

## Retro

**Found late, round after round.** Every Major after run 1 was a guard with no test, found only by a
breakage check the reviewer wrote that run:
- run 2: the relay's secret and pass;
- run 3: a failed backup counting, and the scheduler's due gate;
- the scoped re-check: the Worker's failing-tick signal.

The code was right each time. The build made twelve breakage checks for B06, all after run 1, for
the guards run 1 had named. It never listed every guard the decisions name (D99–D100, D141–D142,
§18) with a check for each, so each run found the next unguarded one. Two runs also lost ground to
the tools:
- run 2's eight "stale" checks were Windows line endings in `mutants.mjs`;
- run 2's base API numbers came from the laptop's `pg_prove` shim running the branch's tests;
- run 3's `push-token-shared` edited a function a later migration had replaced.

Run 1's fix 6 caused run 2's finding 3: the stamp waited for its first poll.

**What cost most** (`usage.mjs`, this session, $108): the three full QA runs, $15, $23 and $33 (run 3
includes its scoped re-check). This session's own work came to $31, and the sweeps and eyes passes to
$6. Run 3 spent five hours elapsed, most of it waiting out a usage limit.

**What changed because of it:**
- `scripts/mutants.mjs` matches across CRLF files, and both QA scripts quote cmd.exe's operators;
- the Worker's routes and scheduler have a test harness (`workers-stub.ts`);
- `qa/mutants.ts` says a check on a SQL function must edit the migration that defines it last;
- the `pg_prove` shim copies the caller's own `test/` (the handoff records it).

**For the `workflow` plugin** (not yet sent to `ztsia/workflow`; listed in the handoff):
- the `mutants.mjs` template needs the CRLF and quoting fixes;
- the `brief` and `qa` skills should ask the build to list each guard the slice's decisions name,
  with a breakage check per guard, before the first QA run;
- the sweep should be a read-only agent, not `implementer` (the owner asked why QA had one).
