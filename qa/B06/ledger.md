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
