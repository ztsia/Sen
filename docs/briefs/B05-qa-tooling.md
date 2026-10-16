# B05 · QA tooling: measure everything, learn from every escape

Branch `B05/qa-tooling`, from `main` once ztsia/Sen#16 is merged (D139). Before *B05 · Feel* and B06.

**Why:** the owner found two big problems by chance, the first time they signed in on the phone:
- sign-in took seconds, because the API ran in Washington beside a Singapore database (E2)
- a deploy took several closes and reopens to arrive, and each one re-downloaded all 3.7 MB (E3)

No run we do could have caught either, because QA has four blind spots:
- it checks what the spec says, so a problem the spec never names never fails anything
- it starts in a fresh browser, so nothing ever spans a deploy, a resume or a week
- it judges still screenshots, so delay, motion and feel are invisible
- it runs on a fast machine against a local database, so latency never shows

And B05's QA took four runs (about $60), mostly finding input edge cases one route at a time.

**The principle (D139, the owner's):** measure, don't guess causes. No check names a cause: no
"function is in `sin1`", no "file X under N KB", because the causes are too many to list. Instead,
every run we already do records what it cost a person (time) and a phone (data, CPU, memory).
Numbers are judged against human limits and against `main`, and only the flagged ones reach the
reviewer, who finds out why. This is D137's diff-driven QA, extended from how screens look to how
the app performs.

## What it adds

1. **Metrics from the runs we already do**, written by `node scripts/qa-diff.mjs` to
   `qa-artifacts/<branch>/metrics/` (`index.json`, and a section in `diff/index.md`). Each is
   recorded on the branch and on `main`, side by side:
   - **Every catalogue entry** (the one-look pass, Minted light, CPU slowed 4× and a mobile network
     profile through CDP):
     - time until the screen settles
     - requests and bytes
     - main-thread long tasks
     - JS heap
     - layout shift
     - console errors and warnings
   - **Every journey step:** time from the tap to the first visible change (Event Timing, as INP
     measures it), and time until it settles.
   - **The API** (`apps/api/test`, through a wrapper on the pools): time, query count, rows and
     response bytes for each request. The API sends a `Server-Timing` header everywhere (database
     time and query count; numbers only, never data), so any client run can split server time from
     network time.
   - **The live preview** (`scripts/live-metrics.mjs`, the PR's Vercel deploy found through the
     GitHub deployments API): sign-in and the main reads, cold and warm, split by `Server-Timing`.
     A workflow on `deployment_status` writes them to the job summary, with no Claude involved. The
     cloud is in the US, so the server's own share is what's judged.
   - **The build:**
     - what a first install downloads
     - what an update from `main` costs a phone: the bytes of files not already cached
     - the first screen's JS
     - the largest chunks
2. **Judging, in `qa/limits.ts`**, two ways, both stated as what a person feels or a phone pays,
   never as a cause:
   - *Human limits:* a tap answered within 100 ms; a screen settled within 1 s and an action done
     within 1 s, throttled; a server answer within 300 ms of server time; an update under 1 MB on
     mobile data.
   - *Against `main`:* worse by more than 25% and more than a floor, so noise doesn't flag.

   A flag doesn't fail CI, because timings vary. The sweep lists every flag, and the reviewer must
   explain each one in the ledger: the cause found, then fixed or accepted with a reason.
3. **Lived-in journeys** (`apps/web/e2e/lived.spec.ts`), for time and real conditions:
   - **across a deploy:** two builds, as checked by hand for D138, open untouched, then in use
   - background and resume
   - an expired session
   - offline mid-action
   - a slow network
   - switching apps mid-form
   - the back gesture mid-sheet
   - large text (200%)
   - a 360×640 phone
   - **a year of data:** a scenario that extends Wei Ming's month to twelve, so lists, Insights and
     search are measured at the size real use reaches
4. **Feel, captured.** Each journey is recorded as video. A filmstrip of frames (every 50 ms for
   the second after each tap) goes to the eyes pass, which gains feel questions: does every tap
   answer at once, does each change look connected to what caused it, does anything jump or stall.
   *B05 · Feel* is judged by these.
5. **The backend sweep**, so input edge cases are found in one pass, not four runs:
   - **A route table** (`apps/api/src/routes.table.ts`): every route with its auth, methods and
     body schema. A test fires the same bad requests at each:
     - signed out
     - another person's id
     - a foreign Origin, and a missing one
     - not JSON
     - a NUL character
     - deep nesting
     - an oversized body
     - the wrong method
     - an unknown path

     A route missing from the table fails. Every later route gets the sweep by being listed.
   - **Breakage checks** (`scripts/mutants.mjs`): a list of dangerous edits, each giving a file, a
     find, a replace and the suite that must turn red. They're applied in a temporary git worktree,
     never the working tree (B05's `git checkout` lost work). Seeded with B05's:
     - drop `FOR UPDATE`
     - weaken a `WITH CHECK`
     - the fixed code in production
     - `signedOut()` ignoring offline
     - `forgetKept()` removed
     - `checkBody` unlimited
     - D138's `skipWaiting` removed

     Each slice adds its own. A survivor is a finding.
6. **The learning loop** (docs, skills and agents):
   - **`qa/escapes.md` gains two columns:** *Which run could have caught it* and *What changed in
     the tooling*. An escape is closed only when a tool, skill or agent changed, not just a pin.
     Backfill E1–E3.
   - **Each slice ends with a retro in its ledger:**
     - what QA found late, or round after round
     - what cost the most (`docs/usage.md`)
     - which skill, agent or tool changed because of it
   - **The general lessons go to the owner's `claude_skills` repo as a PR** at each slice's end.
     The session adds the repo (`add_repo`); if access is refused, the owner grants it
     (docs/local.md).
   - **The QA documents are updated:**
     - the `qa` skill, `qa-reviewer`, `qa-eyes` and the `brief` skill
     - the reviewer's order: mechanical first (the route sweep, breakage checks, metrics flags,
       the diff), then judgement on flags and changes only
     - the uiux checklist gains *Waiting on the server* and feel items

## Done when

- **The metrics run without noise:** `qa-diff.mjs --base HEAD` (the branch against itself) reports
  every metric and no flag, twice in a row.
- **The metrics catch E2 and E3 without being told their causes:**
  - a throwaway branch with the function back in `iad1` gets its live metrics flagged on its
    preview
  - restoring the old service worker (full re-download, waiting forever) gets flagged by the build
    metrics and by the lived-in deploy journey
- **The route sweep covers every route in `routes.ts` and `resource.ts`.** Removing any one of
  B05's input checks, through the breakage list, turns it red.
- **Every listed breakage check is killed.**
- **CI is still green and its e2e job at most about 5 minutes longer.** The workflow on
  `deployment_status` posts a summary on a preview.
- **The learning loop is in place:** escapes.md backfilled; `qa`, `qa-reviewer`, `qa-eyes`,
  `brief`, `uiux` and CLAUDE.md's QA lines describe the new run; the `claude_skills` PR is opened.
- **The goal it serves:** B06's QA in at most two runs, measured in `docs/usage.md`.

## How to build it

The main session designs `qa/limits.ts`, the route table's shape and the breakage list (the
non-negotiables' logic). Implementers take the metrics collectors (the catalogue and journeys, the
API wrapper, the build), `live-metrics.mjs` with its workflow, the lived-in journeys and the year of
data, each batch owning its files (the `brief` skill). End-to-end runs never overlap.
