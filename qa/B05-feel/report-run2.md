# QA report: B05 · Feel (run 2, a fresh full run)

**VERDICT: fix first**
39 criteria, 28 pass, 6 fail, 5 not reachable
phases run: 1-3, 4b, 5, 6 (phase 4 does not apply: no schema, SQL or route)
screenshots: `qa-artifacts/B05-feel/screens/` (31 of this run's, named `FLOW-R2-*`, plus run 1's specs re-run)

Motion, the ripple, reduced motion, haptics and the six looks work as D140 says, and run 1's ten
breakage checks are all killed (23 of 23). But a sheet that changes content now wobbles for three
seconds instead of easing in 200 ms, the Home tab can land on More, and `own-transfer` flakes where
`main` does not. I had no Agent tool: I ran the sweep myself, and **the eyes pass was not run** (the
main session should spawn `qa-eyes`; `eyes.md` says where to look).

Order kept: criteria and flows (`acceptance.md`, `flows.md`, "Run 2") were written from the brief, D140,
patterns §8 and `CLAUDE.md` before I read any implementation, run 1's criteria or its report. I read
the handoff first (as `CLAUDE.md` says), which describes what was built.

## Suites (the sweep, run by me)

| Command | Result |
|---|---|
| typecheck, lint | clean |
| `pnpm test` | 360/360 |
| `pnpm test:db` | pgTAP 103 ok; API 78 pass, 5 skipped; route sweep green |
| `pnpm e2e` | 1393 pass, **1 fail**: `own-transfer` (finding 3), 46.8 min |
| `e2e:lived`, `e2e:server` | exit 0 both |
| `mutants.mjs` | 17/23 killed; the 6 `motion` mutants "not judged" because the `motion` suite failed unmutated (finding 2); re-run: 6/6 killed |
| `qa-diff.mjs` | 87 entries, 0 trees changed, 3 pixel diffs of at most 1/255, 0 check findings, 1 unexplored (`reading`), **13 metrics flags** (finding 5) |
| `prettier --check` | clean |

## Findings, worst first

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 1 | Major | A sheet whose content changes creeps and oscillates for ~3 s: `useSheetResize` feeds on its own animation | R2-18, patterns §8, brief §3 |
| 2 | Major | The Home tab from a pushed screen lands on More (regression from main, ~10% of the Home-tab test's runs) | R2-38, patterns §6 |
| 3 | Major | `own-transfer` fails 3 of 40 on the branch, 0 of 40 on main | R2-39, brief Done-when |
| 4 | Minor | With motion on and the slow CPU, `scan-after` fails 6 of 12 (main 2 of 12), `subscription` 1 of 12 (main 0) | R2-36, R2-39 |
| 5 | Minor | The push adds ~100 ms before the new screen's first frame at 4x CPU; 13 metrics flags | R2-25, R2-26, brief §6 |
| 6 | Minor | Rows that are a `<label>` around a checkbox lost their press feedback | R2-11, brief §2 |
| 7 | Minor | Five guards survive a deliberate break (no test holds them) | D139 |
| 8 | Note | The eyes pass was not run | qa skill |
| 9 | Note | Small notes (reject haptic with no tap, brief vs `performHapticFeedback`, unused `threshold`, run-1 spec flaws) | |

### 1. [Major] A sheet creeps for about 3 seconds instead of easing in 200 ms

`useSheetResize` (`apps/web/src/frame/motion.ts`) observes the sheet's scroll area and, on every
ResizeObserver callback, calls `sheet.animate()` from the last measured height to the current one. The
animation itself resizes the observed area, so the observer fires on the next frame and starts another
animation: 135 `animate()` calls after one tap. On `main` the sheet jumps once and rests within 154 ms.
The run-1 fix (a callback ref, so the hook attaches) is what started the loop. The repo's test only
requires more than 3 distinct heights, so it passes; probe P2 (200 ms changed to 3000 ms) left all seven
motion tests green. It is also the cause of the flag `step:fix/4` (settle 1407 ms against 579 on main).

**Repro:** serve a preview build on :4181 (see `qa/e2e/b05feel2.config.ts`), then from `qa/e2e`:
`./node_modules/.bin/playwright test -c b05feel2.config.ts b05feel2-sheetwobble b05feel2-sheetsettle -g 'head|category sheet: the'`

**Output:**
```
ANIMATE calls on the sheet [ms, keyframe heights, current height]:
 [[59,"[732px, 284.56px]",284],[73,"[284.56px, 687.23px]",687],[91,"[687.23px, 324.84px]",324],
  [107,"[324.84px, 651.51px]",651],[124,"[651.51px, 357.03px]",357],[140,"[357.03px, 622.04px]",622] ...] (135 calls)
head, 1x CPU, [ms, top, height]: [0,183,732] [92,590,325] [193,510,405] [292,467,448] [491,432,483]
  [791,420,495] [1091,417,498] [1192,470,445] [1491,521,394] [1992,531,384] [2293,574,341] [2792,583,332] [2892,626,289]
main:                            [0,183,732] [168,630,285] then still
sheetsettle: Expected: < 600   Received: 2997      sheetwobble: Expected: <= 3   Received: 135
```
Stills: `FLOW-R2-9-step-1..6` (the sheet's top edge drops from y=168 to y=292 over 2.5 s).
Fix direction: don't start a new animation while one runs (compare with the target height, not the
animated one), or disconnect the observer during the animation; pin the duration, not just the count of heights.

### 2. [Major] The Home tab lands on More

`TabBar` keeps Home's history step in a module variable, set in an effect on every render where
`active === 'home'`, from `history.location.state`. With the view transition, history moves at once but
React's new screen commits inside the transition's update callback, so a TabBar render with the stale
`active === 'home'` can run after history holds More's step and `homeIndex` becomes 1. Home from
Payments then calls `history.go(-1)`. Measured with a log line patched into a copy of my own build. A
second tap on Home works; it needs the tap within about a second of load (0 of 20 with a 1.5 s settle).
The new test `motion.spec` *the Home tab, tapped from a pushed screen deep in history* taps right after load, so
it fails ~10% and made the `motion` suite red unmutated in the sweep.

**Repro:** `N=30 ./node_modules/.bin/playwright test -c b05feel2.config.ts b05feel2-homeflake` from
`qa/e2e` (`BASE=http://localhost:4183` for a build of main); or in `apps/web`:
`pnpm exec playwright test e2e/motion.spec.ts --project preview -g 'Home tab' --repeat-each 30 --workers 2`

**Output:**
```
head: 9 of 30 landed on /more (another run 7 of 30). main: 0 of 30. head, 1.5 s settle: 0 of 20.
repo test: 3 failed, 27 passed ... unexpected value "http://localhost:4173/more"
1205 homeIndex=0 at / stateIdx=0
1354 pushState(state,,/more) at / idx=0
1425 homeIndex=1 at /more stateIdx=1          <- the stale render
2150 pushState(state,,/s/payments) at /more idx=1
2826 --- tapping Home
2868 go(-1) at /s/payments idx=2
2869 popstate -> /more idx=1
```
Fix direction: take Home's index from the render's own router location, or only when `history.location.pathname === '/'`.

### 3. [Major] `own-transfer` is flaky on the branch and not on main

Step 2 (*one row, filled in*): the scripted `covered` check finds the Public Bank → Ryt Bank row's button
under a `p.item-description "TransferFilled in"` that is not inside it, so a second copy of the row is on
top at that moment. Run 1 listed this as finding 9 and marked it fixed (`792e9fa`); it is still there. **I
did not find the cause** (a guess: the Payments list is briefly drawn twice while the search applies;
nothing measured says so). 160 repetitions in my own contexts never covered it.

**Repro:** `cd apps/web && pnpm exec playwright test e2e/journeys.spec.ts -g own-transfer --project preview --repeat-each 40 --workers 3`

**Output:**
```
head: 3 failed, 37 passed (1.2m)     main (worktree 9408d96): 40 passed (1.3m)
"check": "covered", "detail": "button \"Public Bank → Ryt BankTransfer\" 390×58 under p.item-description \"TransferFilled in\""
sweep: e2e exit=1 ... 1 failed [preview] › e2e/journeys.spec.ts:917:3 › own-transfer, 1393 passed (46.8m)
```

### 4. [Minor] The metrics' journeys fail more often with motion on

```
head: 7 failed, 17 passed (1.8m)  (scan-after 6/12, subscription 1/12)
main: 2 failed, 22 passed (1.6m)  (scan-after 2/12)
Locator: getByText('Reading receipt…')  Expected: visible  Timeout: 20000ms  Error: element(s) not found
strict mode violation: getByText('Claude Pro') resolved to 3 elements
```
Repro: `QA_SERVE=head QA_METRICS=$TMP/m QA_RESULTS=$TMP/r pnpm exec playwright test -c e2e/diff.config.ts --project metrics-head --workers 3 --repeat-each 12 -g 'scan-after|subscription' journeys.spec`
(`QA_SERVE=base QA_BASE_WEB=<main worktree>/apps/web --project metrics-base` for main). `main` flakes on
`scan-after` too, so this is older and B05 makes it likelier (run 1's finding 7, *watched*). Cause for
`scan-after`: the *Reading receipt…* screen is shown for a second or two, so it was probably never
committed (a guess); for `subscription`, the page was read before it settled.

### 5. [Minor] The push costs about 100 ms before the new screen's first frame at 4x CPU

```
tap -> first frame of the new screen at 4x CPU (ms), warm:   head [175,166,144,148,124,140]   main [66,63,55,39,36,41]
frame-times (transitions, 4x): minted push+back start 183 ms, median 16.7, p95 33.3, 3% over 33 ms;
  tabs: minted 16%, instrument 11%, firefly 10%, line 11%, mercury 16%, copper 19% of frames over 33 ms
flags: step:ask/4 firstChangeMs 368 vs 176 (over 100 ms); step:fix/4 settleMs 1407 vs 579; step:payday/8 1348 vs 852;
  step:proposal/3 1176 vs 607; eight more settle flags worse than main by 52-150%
```
Causes: the capture before the commit is measured (above); the 12 settle flags are the 200 ms of motion on
top of it (filmstrip `email-setup/1`: about 350 ms before the slide starts), and `fix/4` plus part of
`split-stuck/2` are finding 1. I did not measure each flagged step alone (payday/5 and 8, proposal/3,
claims/6, email-setup/4, capture-off/1, members/7 and 11, first-run/11): the same shape by the
filmstrips, not per-step measurements. The tab-crossfade lever is run 1's ledger item 6.

### 6. [Minor] Label rows lost their press feedback

`TAPPABLE` in `press.ts` takes `label[for]`, not a bare `<label>`. Three rows are labels around a control:
*Who has paid you back* (`shared/split.tsx`), `MinePicker` (`scan/split-sheets.tsx`) and *Change each
quarter* (`outside/new-look.tsx`); B05 removed `active:bg-accent` from the first two.
`qa/e2e/b05feel2-label.spec.ts` on `/s/split?id=<BBQ>`: `LABEL ROW {"rip":false,"text":"Set AYouRM30.00RM 30.00","cursor":"default"}`.
Still: a survey of every registered screen found no other `cursor: pointer` element outside a host.

### 7. [Minor] Guards no test holds

| Probe (made alone, reverted) | Suite | Result |
|---|---|---|
| P1 `press.ts` disabled-control guard removed | motion | survived (6 green; the 7th red for finding 2's flake) |
| P2 sheet animation 200 ms -> 3000 ms | motion | **survived** (7 green) |
| P3 `field.tsx` reject haptic while typing | motion and feel | **survived** (7 green; 24/24 unit) |
| P4 `router.tsx` transitions without the feature check | motion | survived (7 green; only a browser without the API can see it, my R2-9 specs pass) |
| P5 `kit.tsx` skeleton never fades | motion | survived (7 green) |
| P6 `motion.ts` shared-amount id used in CSS unchecked | motion | survived (7 green; ids are UUIDs, low risk) |
| P7 `changeMotion` ignores reduced motion | motion | killed |
| run 1's ten mutants | feel, motion | 23/23 killed (17 in the sweep, 6 on re-run) |

Kotlin `hapticConstant`'s API-level mapping has no JVM test (the emulator test checks only that the answer
holds `performed`).

## Mutants worth keeping (`qa/mutants.ts` entries, each needs a test first)

- `ripple-on-disabled`: `apps/web/src/frame/press.ts`, find `if (el.matches(':disabled, [aria-disabled=true], [data-disabled]')) return null;`, replace empty, suite `motion`
- `sheet-too-slow`: `apps/web/src/frame/motion.ts`, find `          duration: 200,`, replace `          duration: 3000,`, suite `motion`
- `reject-while-typing`: `apps/web/src/components/ui/field.tsx`, find `if (shown && !document.activeElement?.matches('input, textarea, [contenteditable]')) haptic('reject');`, replace `if (shown) haptic('reject');`, suite `feel`
- `transitions-without-check`: `apps/web/src/router.tsx`, find `defaultViewTransition: canTransition() ? routerTransition : false,`, replace `defaultViewTransition: routerTransition,`
- `skeleton-no-fade`: `apps/web/src/screens/kit.tsx`, the `waited.current ? <div className="fade-in-kids contents">…` return replaced by the bare fragment, suite `motion`

## Flows (`qa-artifacts/B05-feel/screens/`, `report.html`)

Pass: R2-1 push and pop (six looks), R2-2 tabs, R2-4 Review clear with Undo, R2-5 reduced motion, R2-6 no
View Transitions API, R2-7 hammering and a swallowed tap, R2-8 haptics through a stub shell (bridge 2, 1, throwing, none),
R2-10 six looks, R2-11 core journeys (first-run and pay-new with motion on at the slow-phone CPU; scan-after in my
own motion-on walk, but see finding 4). Fail: R2-3 ripple on every kind (finding 6), R2-9 sheets (finding 1).

## What I couldn't test, and why

- The haptic constants on a device, and the touch-feedback setting turning them off: the emulator test needs the Android SDK; queued in `docs/local.md`.
- The bridge's origin check for the new method: needs the shell.
- **The eyes pass:** no Agent tool, so `qa-eyes` was not spawned (finding 8).
- Toasts and rows added elsewhere sliding in and out, and focus after a push: not walked.
- The cause of finding 3, and of `scan-after`'s skipped *Reading receipt…*: not reproduced or measured.
- A new look getting the shared motion: run 1's spec needs a second server; the CSS has no per-look list (read, not run).
- Run 1's specs `b05feel-newlook`, `-tabsettle`, `-vtlen` need servers on other ports (they fail without); `FLOW-4b` has a locator that matches several *Ask Sen* buttons; `FLOW-8` ends in a tautology. My `b05feel2-haptics.spec.ts` replaces FLOW-8.

## The record

`qa/B05-feel/` : `acceptance.md`, `flows.md` (a "Run 2" section each, plus R2-38 and R2-39), `results.json`, this file, `eyes.md` (a run-2 note),
`report-run1.md`. Specs: `qa/e2e/b05feel2-*.spec.ts` and `b05feel2.config.ts` (the probes `homeflake`, `sheetsettle` and `sheetwobble` fail
today by design: each pins a finding). Source is clean (`git status` shows only `qa/` files).
