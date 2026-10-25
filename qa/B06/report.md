# QA B06 · Run 3, scoped re-check (tier 2): the scheduler

**Published report:** https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d (version 4, this re-check; version 3 is run 3's full report; private to the owner)

```
VERDICT   ship (for this area)
          10 criteria: 8 pass, 0 fail, 2 not reachable (each only read in the code)
          fixed findings: #2 fixed, note #11 fixed
          new: #15 Minor, #16 Minor (gaps in the tests; the behaviour is right)
          phases: scoped, db4e5b9..8579176      screenshots: qa-artifacts/B06/scoped/screens/
```

Run 3's reviewer, resumed, 25 Oct 2026. (The harness refused its write; the main session saved this from its final message.)

**Area:** the Worker's scheduler, from the cron each minute to the API's `/jobs/tick` and back, with the API's wakes (spec §16, D99, D141).

**Left out:** run 3's other fixes in `e025494`, which the ledger records as tier 1 (backups, the relay pass, the jobs topic, the storage words, the mutants entry). Not walked again; their tests ran green in this run's suites.

**Suites at 8579176:**

| Suite | Result |
|---|---|
| typecheck, lint | clean |
| unit | 416/416 (Worker 15/15, including the 3 new `scheduler.test.ts` tests) |
| test:db | pgTAP 218/218; API 129 pass, 7 skipped |
| breakage checks on the area | 5 of 7 killed |
| scoped flow | `qa/e2e/b06r3-scoped.spec.ts`: FLOW-R3S-1 passes (5 steps) |

## Re-checked findings

**#2 (Major) → fixed.**
- `scheduler.test.ts` now drives `Scheduler.cron()`. Run 3's check `r3-scheduler-ticks-every-minute` is killed: `AssertionError: expected "vi.fn()" to be called 1 times, but got 180 times`.
- **Measured on the real Worker** (`wrangler dev`, local API, `sen_qa`), counting ticks as calls of `jobs_next_once()` (each tick makes one; `track_functions` was on for the measurement, reset since):
  - six crons with nothing due made 1 tick (`ticks after 6 crons: 1`);
  - FLOW-R3S-1 made 1 tick across its four crons, at the test job's minute (`ticks before: 1 … ticks after: 2`). The four were one before the job's minute, two at once after it, and one more.
  - The job ran once (`done 1`, one ok `job_runs` row).

**#11 (Note) → fixed.**
- After a tick, `cron()` now reads the state again. It keeps the later `lastCron` and applies the soonest wake that came during the tick.
- Both halves are guarded; each probe fails the test *wakes sooner when the API asks, and keeps a wake that comes while a tick runs*:
  - `r3s-tick-drops-wake`: killed, `expected { next: 1792904400000, … } to match object { next: 1792894200000, … }`
  - `r3s-tick-overwrites-cron`: killed

## New findings

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 15 | Minor | Nothing tests that a refused tick is remembered as failing. Without it, the Worker's `/health` stays green while every tick fails | `node scripts/mutants.mjs --only r3s-failure-not-remembered` | R3S-AC-2; D141 |
| 16 | Minor | Nothing tests that, of two wakes during one tick, the sooner one wins | `--only r3s-later-wake-wins` | R3S-AC-4 |

**15.**
- **The surviving edit:** a non-2xx tick returning `afterTick(s, now, undefined)` instead of `afterFailure(s, now)` survives (`Tests 99 passed (99)`).
  - The retry still comes after 5 minutes, so the new retry test passes; it only counts calls.
  - But `failingSince` would never be set, so the Worker's `/health` would never say `tick`. D141 makes that one of the monitor's two signals (a secret rotated on one side, a broken deploy).
- **The behaviour is right today, measured end to end:** a second Worker was given the wrong scheduler secret.
  - It was refused 3 times, about 5 minutes apart (`[ERROR] tick: 401`), the first at 15:12:43 UTC.
  - `/health` read `{"ok":true}` until 15:27:01, then `{"code":"late","message":"Late: tick.","late":["tick"]}` at 15:29:01, and 503 at 15:31:02.
- **Why Minor:** `/health/jobs` still fails after 26 hours.

**16.**
- **The surviving edit:** `this.woke = Math.min(this.woke ?? at, at)` → `this.woke = at` survives (`Tests 99 passed (99)`), because the test makes only one wake during its tick.
- **Effect:** if two one-off jobs are scheduled during one tick, the later wake wins and the sooner job waits for it.
- **Why Minor:** ticks take seconds, so this is rare.

## Probes

| Broke | Caught? |
|---|---|
| `cron` without the `due()` gate (#2) | yes |
| the state from before the tick saved back (lastCron steps back) | yes |
| a wake during a tick dropped | yes |
| the `ticking` guard removed (a second tick starts during a tick) | yes |
| a refused tick not remembered as failing | **no** (#15) |
| the later of two wakes during a tick wins | **no** (#16) |
| `wake-delays` (run 1's) | yes |

The new edits are in `qa/mutants.ts`, under *QA B06 run 3's scoped re-check*.

## What couldn't be tested, and why
- **The deployed Workers' crons and cron-job.org's email:** out of a QA session's reach (docs/local.md).
- **R3S-AC-4 and R3S-AC-8:** each was only read in the code, never run, so they are "not reachable": the sooner of two wakes wins (#16 is the missing test); a failed tick keeps a wake.
- **Beyond the area:** nothing reached past the scheduler, so no full run is needed for these fixes.
