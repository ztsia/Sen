# QA report: B05 · Feel (run 3, a fresh full run)

**VERDICT: fix first**
40 criteria, 27 pass, 3 fail, 10 not reachable
phases run: 1-3, 4b, 5, 6 (phase 4 does not apply: no schema, SQL or route)
screenshots: `qa-artifacts/B05-feel/screens/` (78)

Motion, ripple, reduced motion and the core journeys work; but `own-transfer` still flakes on the branch (0 of 100 on main), the feel pass still fails two journeys, and D140's duration, direction and the long-press haptic are held by no test in the repo's suites.

Order kept: criteria and flows (`acceptance.md`, `flows.md`, *Run 3*) were written from the brief, D139/D140, patterns §8, `docs/flows.md` and spec §5.1 before I read any source and before I re-read runs 1 and 2's criteria or reports. I read the handoff first, which describes what was built. I had no Agent tool: I ran the sweep myself; the eyes pass was run by the main session (`eyes.md`, 26 entries: 6 wrong, 18 look again, 2 fine), and finding 5 weighs it.

## Suites (the sweep)

| Command | Result |
|---|---|
| unit | 364/364 pass |
| typecheck | clean |
| lint | clean |
| test:db | pgTAP 103 ok; API 78 pass, 5 skipped |
| e2e | 1393 pass, 1 fail (own-transfer) |
| lived | exit 0 |
| server | exit 0 |
| mutants | 25/25 killed |
| diff | 87 entries, 0 trees changed, 0 check findings, 11 metrics flags |
| prettier | clean after formatting QA specs |

## Findings, worst first

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 1 | Major | The functional `own-transfer` journey (motion reduced) fails 2-10% of runs on the branch and 0 of 100 on main: third run in a row | brief Done-when (tests stay reliable), R3-24 |
| 2 | Major | Tests have no teeth for D140's own numbers and the long-press haptic: 6 of 7 probes survive the repo's suites | R3-33, R3-16, D139 |
| 3 | Minor | The feel pass (motion on, 4x CPU) still fails `scan-after` and `subscription` on the branch (2 of 42); main passes | R3-20, brief Done-when |
| 4 | Minor | 11 metrics flags; the taps that open a sheet or push a screen answer 60-150 ms later than main at 4x CPU | R3-20, R3-21, brief §6 |
| 5 | Minor | Eyes pass: 6 `wrong` verdicts, weighed against main (none is a regression of the branch beyond the latency in finding 4) | qa/escapes.md E1, E2; patterns §7 |
| 6 | Minor | A scroll that starts on a row flashes a ripple | R3-8 |
| 7 | Note | Fixed since run 2, verified | run 2 |
| 8 | Note | Small notes |  |

### 1. [Major] The functional `own-transfer` journey (motion reduced) fails 2-10% of runs on the branch and 0 of 100 on main: third run in a row

Run 1 saw 2 of 48, run 2 saw 3 of 40 and called it fixed by the 58/34 px size guesses. Run 3: the full `pnpm e2e` failed it once (`covered`: the Payments row `Public Bank → Ryt Bank` 390×58 sits under the sticky day header `Wed, 1 Jul`), and a dedicated repeat failed 2/40, 2/60, 6/60 (head) against 0/40 and 0/60 (main). I bisected by reverting one thing at a time: ripple off (`installPress()` commented out) 2/60; payments.tsx back to main's 40/56 guesses 8/60 (so run 2's sizes help but do not cure it); kit.tsx (skeleton fade) reverted 6/60; app-shell.tsx (`screen-region` wrapper) reverted 3/60. None cured it. The cause is unfound (a guess: another B05 change moves the Payments list's first frame; untested). The brief's Done-when says the functional suite must be reliable.

**Repro:** `pnpm --filter @sen/web exec playwright test e2e/journeys.spec.ts -g own-transfer --project preview --repeat-each 60 --workers 3   (run it in the main worktree for the 0/60 baseline)`

```
  6 failed
  54 passed (1.7m)   [head]
  60 passed (1.8m)   [main]
+     "check": "covered",
+     "detail": "button \"Public Bank → Ryt BankTransfer\" 390×58 under div.sticky \"Wed, 1 JulSpent RM0.00RM 0.00\""
```

### 2. [Major] Tests have no teeth for D140's own numbers and the long-press haptic: 6 of 7 probes survive the repo's suites

Probes, each made alone against `pnpm exec vitest run --project web apps/web/src/{frame,lib,components}` and `e2e/motion.spec.ts --project preview` (the `feel` and `motion` suites). Survivors: `--motion-ms` 200 ms to 2000 ms; forward's new screen sliding in from the left (`sen-in-left`); the long-press haptic call deleted (`lib/long-press.ts`); the ripple's disabled-control guard removed; the shared-amount id check removed. Only the toggle-kind swap was caught. Run 2's QA specs (`qa/e2e/b05feel2-motion.spec.ts`) do kill the duration and direction probes (verified on probe builds), so they are held by QA specs but no mutant points at them, and nothing at all holds the long-press haptic: with it deleted, run 1 and 2's haptics and feel specs still pass 13 of 13.

**Repro:** `python3 probe script in the run's scratchpad; or: sed -i 's/--motion-ms: 200ms;/--motion-ms: 2000ms;/' apps/web/src/styles/motion.css && pnpm --filter @sen/web exec playwright test e2e/motion.spec.ts --project preview   (green)`

```
P1 motion-ms 200ms -> 2000ms | feel=green motion=green
P2 forward slides in from the left | feel=green motion=green
P3 long-press haptic removed | feel=green motion=green
P4 disabled controls get a ripple | feel=green motion=green
P5 shared-amount id no longer checked | feel=green motion=green
P7 haptic toggle kinds swapped | feel=green motion=RED
```

### 3. [Minor] The feel pass (motion on, 4x CPU) still fails `scan-after` and `subscription` on the branch (2 of 42); main passes

Third run watching this. `Reading receipt…` is in the DOM for about 900 ms on 4 of 6 branch runs, 400 ms on 2 of 6, and 1000 ms on all 6 of main, so Playwright's polling misses it. `/s/reading` appears at about 80 ms and the text at about 450 ms; confirm replaces it at about 855 ms or 1340 ms on the branch (bimodal), 1430-1570 ms on main. Why the branch's reader finishes early in some runs is not explained. A person sees the Reading screen for a shorter time with a made-up reader only; a real reader takes seconds.

**Repro:** `qa/e2e/b05feel3-reading.spec.ts (6 runs each on :4181 and :4183)`

```
READING head: paths [[87,"/s/reading"],[1348,"/s/confirm"]] ... [[73,"/s/reading"],[854,"/s/confirm"]]
READING main: ... [[116,"/s/reading"],[1468,"/s/confirm"]]
film-head: 2 failed (subscription, scan-after), 40 passed (3.5m)
```

### 4. [Minor] 11 metrics flags; the taps that open a sheet or push a screen answer 60-150 ms later than main at 4x CPU

Flags: settings/categories blocking 639 vs 420; hawker/1 first change 312 vs 176; own-transfer/2 settle 709 vs 442; payday/5 735 vs 394; proposal/3 1228 vs 555; ask/2 208 vs 88; ask/3 settle 2246 vs 212; ask/4 336 vs 112; capture-off/4 328 vs 184; export/2 230 vs 116; members/11 532 vs 254. Measured causes: (a) the ripple costs 2-3 ms in its handler and the next frame comes within 22 ms at 4x on Review, Payments and Home (so a press IS answered in a frame; the film strips show it late because the video capture slows the page); (b) opening the category sheet from a Review chip takes pointerdown-to-sheet 237-269 ms with motion on, 344 ms with motion reduced, 180 ms on main: the extra is not the view transition; a CPU profile shows 138 ms of `getBoundingClientRect` self time on the branch (43 ms in `useSheetResize`'s first measure, 52 ms in vaul) and none on main, but removing the first measure left the median at 277 ms, so the cause is not found (a guess: layout moved earlier, not removed); (c) ask/3's 2246 ms is a metric artifact: Home to Insights tab to content is 2.07-2.46 s on the branch and 1.84-2.10 s on main (about +250 ms), Insights being slow on both. Verdict: pushes and tabs, accepted as run 1/2 did (the owner judges on the phone); sheet open +60-150 ms is unexplained and left open.

**Repro:** `qa/e2e/b05feel3-sheetopen.spec.ts, b05feel3-presscost.spec.ts, b05feel3-profile.spec.ts, b05feel3-eyes.spec.ts (E-A)`

```
SHEETOPEN head motion on: median 264, 237, 279
SHEETOPEN head reduced: median 357, 344, 370
SHEETOPEN main motion on: median 205, 180, 220
PRESSCOST head /review: handler ms median 3, pointerdown->2nd frame median 22
TABINSIGHTS head content ms [2463,2343,2165,2263,2069]; main [2074,2105,2021,1836,2001]
```

### 5. [Minor] Eyes pass: 6 `wrong` verdicts, weighed against main (none is a regression of the branch beyond the latency in finding 4)

hawker/2 and fix/5 (a closing sheet shows another step's title, 'Category'; the page changes late): measured the same on main (title flips to 'Category' at 560 ms on main, 663 on branch; row gone 560 vs 663 ms; toast 647 vs 790). own-transfer/1 (nothing for a second): the made-up write lands about 0.6-0.8 s after the tap at 4x on both; only the ripple answers earlier. ask/3: see finding 4c, a metric artifact. members/10 and the toast over sheets: the shared toast overlaps an open sheet by 58 px on main too (Ask Sen sheet: no control covered, chips partly). Pre-existing, so not B05's, but the destructive Remove confirm is the worst place for it. fix/4 (snap with a white void): run 2's sheet spec passes (settles under 450 ms) so the easing works; the one-frame void I could not reproduce at 1x. Undo's late effect (proposal/3, fix/6): Undo measured at 4x: toast gone and value back together at 525 ms (branch) and 550 ms (main).

**Repro:** `qa/e2e/b05feel3-eyes.spec.ts`

```
HAWKER2 head: rowGone 663/616/603/651, toast 790/735/743/794; main: rowGone 560/520/571/571, toast 647/672/674/664
UNDOLAG head toastGone==meals 525/482/569; main 550/555/541
TOASTOVERSHEET head {"toast":true,"overlapPx":58,"covered":[]}; main identical
```

### 6. [Minor] A scroll that starts on a row flashes a ripple

The ripple starts on pointerdown by design, so a drag that begins on a list row shows one (faint, 12% opacity) before the browser decides it is a scroll. Measured: one ripple created by one scroll gesture over Payments, gone within about 400 ms. Android's own ripple waits about 100 ms for this reason. Left to the owner's phone.

**Repro:** `qa/e2e/b05feel3-angles.spec.ts R3-8`

```
ripples created by one scroll gesture: 1
```

### 7. [Note] Fixed since run 2, verified

Run 2's 1 (sheet creeping): the category-sheet settle spec passes. 2 (Home tab to More): `Home` flake spec passes 40 of 40. 3 (Payments row guess): sizes now 34/58, but see finding 1. 6 (label rows): a real press on a label row's text now shows a ripple (the run-2 spec aimed at the checkbox's own indicator and failed; I corrected its target). 7: `field.test.tsx` pins reject. Five of run 2's six `motion` mutants and all 25 in `qa/mutants.ts` are killed (25/25).

**Repro:** `qa/e2e/b05feel3-label.spec.ts`

```
REAL PRESS ripple count 1
```

### 8. [Note] Small notes

Payments scroll resets to the top on back, on main too (not a regression). A browser's long-press still calls `navigator.vibrate(10)`, where patterns §8 says a browser has none (pre-existing from B03). Run 1's measurement specs (`b05feel-newlook`, `-tabsettle`, `-vtlen`) assume main on another port and fail without it. Kotlin's `hapticConstant` mapping and `ShellTest` need an emulator; not run. `threshold` has no user.

**Repro:** `-`

```
SCROLL head: before 900, after 0; SCROLL main: before 900, after 0
```

## Probes (made alone, reverted; `git status` clean)

| Broke | Caught | Note |
|---|---|---|
| --motion-ms 200ms -> 2000ms (motion.css) | **no** | repo feel and motion suites green; QA spec b05feel2-motion kills it |
| forward's new screen slides from the left (sen-in-left) | **no** | repo suites green; QA spec b05feel2-motion kills it |
| long-press haptic deleted (long-press.ts) | **no** | nothing red, including 13 QA haptics and feel specs |
| ripple's disabled guard removed (press.ts) | **no** | nothing red |
| shared-amount id check removed (motion.ts) | **no** | nothing red |
| ripple's reduced-motion rule removed (motion.css) | **no** | nothing red; near-equivalent, app.css already zeroes animation-duration under reduced motion |
| haptic toggle kinds swapped (switch.tsx) | yes | motion.spec red |
| qa/mutants.ts's 25 existing breakage checks (the sweep) | yes | 25/25 killed |

**Worth keeping as `qa/mutants.ts` entries** (a suite that runs the QA specs, e.g. `qa/e2e/b05feel2.config.ts` against a preview build, or new repo tests):
- `apps/web/src/styles/motion.css`, find `--motion-ms: 200ms;`, replace `--motion-ms: 2000ms;`, suite: motion (needs a test reading the `screen` animation's duration, as `b05feel2-motion.spec.ts` does)
- `apps/web/src/styles/motion.css`, find `::view-transition-new(screen) {\n  animation: var(--motion-ms) var(--motion-ease) both sen-in-right;`, replace `sen-in-left`, suite: motion
- `apps/web/src/lib/long-press.ts`, find `haptic('long-press');`, replace ``, suite: feel (needs a test of `useLongPress`)
- `apps/web/src/frame/press.ts`, find `if (el.matches(':disabled, [aria-disabled=true], [data-disabled]')) return null;`, replace ``, suite: feel
- `apps/web/src/frame/motion.ts`, find `id && /^[\w-]+$/.test(id)`, replace `id`, suite: feel

## Flows

- **FLOW-R3-1** Payments to a detail and back, motion on (happy): pass. Ends: forward then back transitions at 200 ms; one shared-amount name; list returns (at the top, as on main)
- **FLOW-R3-2** A scroll that starts on a row (sad): pass. Ends: one ripple per gesture, gone by itself (finding 6)
- **FLOW-R3-7** Appearance, look change (happy): pass. Ends: the page opens with nine radios and no errors; the reveal itself was not exercised
- **FLOW-R3-8** A toast and an open sheet (sad): pass. Ends: head and main overlap by 58 px alike, no sheet control covered (finding 5)
- **FLOW-R3-core-1** first-run, motion on (happy): pass. Ends: home before the first salary
- **FLOW-R3-core-2** pay-new, motion on (happy): pass. Ends: answered with Undo, then undone
- **FLOW-R3-core-3** scan-after, motion on (happy): pass. Ends: attached with Undo (the 4x-CPU feel pass still fails it, finding 3)

## Criteria

- R3-1 Forward push: type forward, 200 ms, easing: **pass**. b05feel2-motion in six looks, translate(100%)/-25%
- R3-1s Reduced motion: no screen animation: **pass**. motion.spec reduced test and FLOW-6
- R3-2 Back reverses (button, history.back): **pass**. b05feel2-motion R2-2
- R3-2s Back at the first history entry: **unreachable**. not driven
- R3-3 Tab crossfades, tab bar still, also from a pushed screen: **pass**. motion.spec; types ['tab','forward'] after a tab tapped on its own screen
- R3-3s Ten tab taps in a second: **pass**. R2-7 spec, 3 fast taps and forward+back; ten not run
- R3-4 A sheet starts no screen transition: **pass**. motion.spec: types unchanged after a sheet
- R3-5 Shared amount name on one element: **pass**. 15 distinct payment rows and an account list: no duplicate id, one [data-sen] per row
- R3-5s Two payments with the same amount: **unreachable**. not driven; no duplicate id found
- R3-6 Taps blocked during a transition: **pass**. R2-7 spec
- R3-7 No startViewTransition: navigates, no error: **pass**. R2-9 absent and untyped
- R3-8 Ripple on pointerdown in the next frame: **pass**. handler 2-3 ms, 2nd frame 22 ms at 4x
- R3-8s Switch, checkbox, no-press, disabled get none: **unreachable**. switch passes; disabled guard unguarded (probe P4)
- R3-9 Reduced motion: ripple a tint: **pass**. FLOW-6
- R3-10 No call-site ripple code: **pass**. grep of screens/: none
- R3-11 Review row clears in motion: **pass**. motion.spec
- R3-11s Reduced motion, and a failed write never leaves a ghost: **unreachable**. reduced pass; failed write not driven
- R3-12 Money never counts: **pass**. run 1 FLOW-3 per-frame sampling
- R3-13 Toast slides, skeleton fades: **pass**. FLOW-9; toast in/out by eye only
- R3-14 Sheet eases to a new height: **pass**. b05feel2-sheetsettle under 600 ms at 4x
- R3-15 A slow round trip never freezes the screen: **unreachable**. preview uses the fake backend
- R3-16 Haptic once per moment incl. long-press: **unreachable**. long-press unguarded: probe P3
- R3-16s None on scroll, a plain tap, or on load: **pass**. b05feel2-haptics
- R3-17 No bridge or bridge 1: quiet: **pass**. haptics.test.ts, b05feel2-haptics
- R3-18 Kotlin uses the view's constants; ShellTest: **unreachable**. needs the emulator
- R3-19 Bridge answers no other origin: **unreachable**. needs the shell
- R3-20 First visible change within 100 ms: **fail**. 11 metrics flags; ripple answers in 22 ms, screens later (finding 4)
- R3-21 60 fps at 4x CPU: **unreachable**. frame-times not re-run; run 2's figures stand
- R3-22 No layout shift from motion: **pass**. R2-27 spec
- R3-23 Reduced-motion journey: **pass**. FLOW-6; core journeys pass with motion on
- R3-24 Functional suite reduced, feel pass on: **fail**. own-transfer flakes 2-10% on head, 0/100 main (finding 1)
- R3-25 Six looks, one motion: **pass**. b05feel2-motion x6
- R3-26 Look change still reveals: **unreachable**. Appearance opens; reveal not exercised
- R3-27 Docs match the build: **pass**. patterns §8, uiux, qa-eyes, local.md read
- R3-28 No float money, no counters: **pass**. diff grep: only frame-times.mjs stats
- R3-29 No migration; test:db green: **pass**. pgTAP 103 ok; API 78 pass, 5 skipped (it.runIf on GET routes)
- R3-30 No secrets or third-party scripts: **pass**. production bundle grepped: only CSS words
- R3-31 Trees unchanged: **pass**. 0 trees changed, 3 entries with 1-8 pixels
- R3-32 Shadcn edits carry a // Sen: note: **pass**. button, field, switch
- R3-33 Tests have teeth: **fail**. 6 of 7 probes survive the repo suites (finding 2)

## What I couldn't test, and why

- Kotlin hapticConstant and ShellTest, the bridge's origin check: need the emulator or a device
- 60 fps at 4x CPU (frame-times): not re-run; run 2's measurement stands
- Android Remove animations reaching the WebView as reduced motion, and touch-feedback setting silencing haptics: needs a phone; queued in docs/local.md
- Slow API round trip during a Review clear: the preview runs the fake backend; e2e:server has no motion spec
- Phase 4 (backend) does not apply: the slice has no schema, view or route. The route sweep and pgTAP ran in the sweep and are green.
- The cause of finding 1 (own-transfer) and of the sheet-open delay in finding 4: bisected and profiled, not found.
- Specs added this run: `qa/e2e/b05feel3-*.spec.ts` with `b05feel3.config.ts` (head on :4181, main's worktree on :4183), `b05feel3-probe.config.ts` (probe build on :4184) and `b05feel3-journeys.config.ts` (the repo's journeys with motion on). Run 1's `b05feel-newlook`, `-tabsettle` and `-vtlen` need main on another port and fail without it; `b05feel2-label.spec.ts` aimed at the checkbox's own indicator, and I corrected its target.
