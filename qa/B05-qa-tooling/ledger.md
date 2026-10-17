# B05 · QA tooling: ledger

## Found by the new tools while they were built (16 Oct)

Each was found by a tool this slice adds, on its first run, before any QA run: the point of D139.

| # | Found by | What a person or the data would suffer | Fix | Evidence |
|---|---|---|---|---|
| T1 | The route sweep | An oversized body's 413 went out without `Cache-Control: no-store`: the body limit sat before the header middleware | `bodyLimit` after it (`app.ts`); bodies over 256 KB refused for every route | `sweep.test.ts`, every write route's *refuses bad bodies* |
| T2 | Lived-in, 200% text | At Android's largest font size, More's and Insights' rows drew their value over the title, and Review's suggestion bar drew *Apply all* over its words | The rows and the bar wrap at large text: `NavRow` (`group.tsx`), More's `LinkRow`, Review's bar | `lived.spec.ts` *at 200% text*, all six pass; screenshots checked at 200% |
| T3 | Lived-in, ended session (server) | A session that ended elsewhere sent the person to sign-in with no word of why | Sign-in says *You were signed out. Sign in again to carry on.* | `server.spec.ts` *a session that ends while Sen is open* |
| T4 | Breakage check `for-update-resource` survived | Dropping the resource PUT's row lock went unnoticed: no test sent identical upserts together. Concurrent creates could also log twice, the lock having no row yet to hold | The sweep sends three identical upserts at once, creating and updating; the PUT creates with `ON CONFLICT DO NOTHING` first | The mutant is killed (13 of 13); the test fails with the lock dropped |
| T5 | The API's `Server-Timing` | Pool queries made through pg's callback form weren't counted at first, so Better Auth's routes reported 0 queries | `timing.ts` wraps callback calls too | `/api/me` reports 6 round trips, `/api/settings` 10 |

## Done-when: the metrics catch E2 and E3 without being told their causes

- **E2, the function in the wrong region.** A throwaway branch with the region pin removed
  (`B05/qa-tooling-iad1-probe`; a session can't delete a branch, so the owner does, `docs/local.md`) deployed a preview; the `live-metrics` workflow on its
  deploy flagged, with no Claude involved: `GET /api/me` 1,318 ms server time (1,313 ms of it
  database, 6 queries), `GET /api/settings` 2,194 ms (10 queries), the code send 447 ms, each over the
  300 ms limit. The same routes on this branch's own preview, in `sin1`: 18 ms, 23 ms, 9 ms, no flag.
  The table shows the cause to whoever reads it (database time per query), but no check names it.
- **E3, the service worker.** Breakage checks `update-never-switches` (no `skipWaiting`) and
  `update-downloads-everything` (no reuse of cached assets) are both killed by the lived-in deploy
  journeys: the first never reaches the new build, the second downloads over the 1 MB limit.

## Done-when: the metrics without noise (not quite met)

`qa-diff.mjs --base HEAD --metrics-only` (the branch against itself) should flag nothing, twice. Four
pairs of runs, each change made from what the last showed:

| Rule | Confirmed flags on identical code | Pass time |
|---|---|---|
| Cold opens over a slow network, three samples of everything | not measured: 414 standing, 70 minutes | 70 min |
| Opens from the service worker's cache; one sample, then three for what flags | 1–4 a run | 18–19 min |
| Crossing a human limit counts only as a real step worse than `main`; confirm on two workers | 3, 3 | 12–14 min |
| A timing must be 50% worse (bytes and counts 25%) | **1, 2** | 12–13 min |

The rest is a single journey tap running slow now and then (`step:daily/2` first change 312 ms
against 136 ms; `step:lost-phone/2` settle 232 against 127): about 1 or 2 false flags among 1,317
numbers. The reviewer's rule covers it: every flag is re-measured once before it's explained
(`qa-reviewer`, phase 4b). Chasing zero would cost more runs than the flags do.

## No full QA run (owner, 17 Oct: not enough quota)

Recommended and accepted: every app change this slice made has its own test, shown failing first
where it matters (T1–T5), and the mechanical runs already cover what a full run would re-check: the
route sweep (every route), 13 of 13 breakage checks killed, the lived-in journeys, the region probe.
The one visual risk, the row wrap at normal text size, is the diff against `main` in all twelve pairs
below. A full run is better spent on *B05 · Feel*, which changes screens and flows.

## The diff against `main` (17 Oct)

`node scripts/qa-diff.mjs`, all six looks: 87 entries, **0 trees changed, 0 pixels changed in all
twelve pairs**, 0 check findings: the row wrap changes nothing at normal text size. Metrics: 1
confirmed flag, `screen:split-public` blocking 666 ms against 362 ms. Re-measured five times a side:
head 293–490 (median 306), main 332–495 (median 349). **Noise, accepted**; nothing this branch changed
reaches the friend's split page.

## Retro

- **Found late or round after round:** nothing reached a QA run; the tools found T1–T5 on their first
  runs. What took rounds was the metrics design itself: four pairs of noise runs (table above).
- **What cost the most** (`docs/usage.md`): the metrics implementer, about $67 of the slice's about
  $133. Two causes, both the main session's: its brief asked for cold opens, three samples of
  everything, which measured first installs and took 70 minutes; and after two usage-limit stops, its
  resumed runs went on Opus, not the Sonnet it started on. The other four implementers together cost
  about $4.
- **What changed because of it:**
  - the `brief` skill: a brief for agents running at once names each one's ports, build folders and
    who holds the test database (two configs shared port 4175; two runs could drop `sen_test`)
  - the `brief` skill: a brief that measures says how the person meets the thing (a phone opens Sen
    from its cache) and gives a time budget, before the agent builds; and a resumed agent's model is
    checked in its next report
  - `qa/limits.ts`: limit crossings need a real step worse than `main`; timings need 50%
  - the general lessons went to `claude_skills` (`workflow/measure-dont-guess`)
