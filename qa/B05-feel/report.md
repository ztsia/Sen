# QA report: B05 · Feel (run 3, scoped re-check, commits 23613b0..778e21b)

**Published report:** https://claude.ai/artifact/GpVyhAnBmTSZJ9E9amaDuq

**VERDICT: ship** (for the three areas re-checked; the full run's open Minors stand)
10 new criteria (R3S-1 to R3S-7): 9 pass, 1 fail (the earlier probes still green: P4, P5 accepted, P8 new)
Area: press feedback on everything tappable; sheets whose content changes; the Payments search and the
`own-transfer` journey through it. Fixed findings re-checked: run 3's 1, 2, 4 (the sheet part), 6.
Left out: the 4x-CPU film and metrics passes, the other screens, the haptics area beyond the long-press test.
Screenshots: `qa-artifacts/B05-feel/screens/FLOW-R3S-*`.

Criteria and flows were added to `acceptance.md` and `flows.md` (*Run 3, scoped re-check*) from the
fixed findings and the spec, then I read the commits.

## Re-check of each fixed finding

| Run 3 # | Result | Evidence |
|---|---|---|
| 1 `own-transfer` flakes | **fixed** | 100/100 on the branch, 100/100 on main (`--repeat-each 100 --workers 3`). The ledger's cause holds for the journey: with the added wait removed again the same product fails 5 of 60. No user-visible frame found: rAF sampling of every frame after typing in the search (25 runs each, branch and main) saw no row under the sticky day header. Why the branch hits the bad moment more often than main stays unexplained. |
| 2 Tests have no teeth | **fixed**, two probes accepted | Probes P1 duration, P2 direction and P3 long-press are now RED in the repo's `motion` suite; mutants 28/28 killed, including `motion-slow`, `motion-forward-from-left`, `long-press-silent`. P4 (disabled guard) and P5 (id check) still green, accepted in the ledger with reasons I agree with. |
| 4 (sheet part) Sheets answer late | **still failing** | See finding S1. Removing the first measure changed nothing. |
| 6 A scroll flashes a ripple | **fixed** | Touch scroll from a row: ripple gone 20 ms (motion on) and 37 ms (reduced) after the `pointercancel`; with the cancel branch removed, about 400 ms. A tap still ripples in the first frame; ten tab taps leave no `.press` or `data-pressed`. |

## Suites

| Command | Result |
|---|---|
| typecheck, lint, prettier | clean |
| `pnpm test` | 364/364 |
| `journeys.spec` + `motion.spec`, preview | 50 passed |
| first-run, pay-new, scan-after, own-transfer, fix, split-stuck, hawker, motion on | 7 passed |
| `node scripts/mutants.mjs` | 28/28 killed |

## Findings

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| S1 | Minor | Every sheet renders twice as it opens, because `Sheet`'s `ref={area}` is a state-setting callback ref: opens answer 40-70 ms later than main at 4x CPU | R3-20, run 3 #4 |
| S2 | Minor | The press-cancel fix (run 3 #6) has no test in the repo's suites: probe P8 survives | R3S-7, D139 |
| Note | | Run 3's findings 3 (film pass), 4 (push and tab part), 5 and 7-8 stand; not re-run here | |

### S1. [Minor] Sheets open 40-70 ms later than main at 4x CPU, and the cause is the sheet's own ref

The `useSheetResize` fix removed one `getBoundingClientRect` and changed nothing measurable. `blocks/sheet.tsx`
passes `ref={area}`, a callback ref that calls `setArea`, so the Sheet re-renders as its content mounts.
Probe: the same build with `ref={area}` removed.

**Repro:** `qa/e2e/b05feel3-scoped-asksheet.spec.ts` (Ask Sen on Home, 4x CPU, pointerdown to the dialog in
the DOM, median of 14, two interleaved rounds); `b05feel3-sheetopen.spec.ts` for the Review chip.
```
ASKSHEET ask head:         median 273   (round 2: 239)
ASKSHEET ask no-ref probe: median 201   (round 2: 192)
ASKSHEET ask main:         median 166   (round 2: 179)
SHEETOPEN head motion on 264, head reduced 351, main motion on 198, main reduced 197   (ms, Review chip, 4x)
```
The probe still sits 25-35 ms above main, unexplained. A lever: attach the observer in the callback ref itself
(no state), so opening renders once. The easing itself is fine: the who-had-this sheet eases through 12 heights in
about 190 ms (main jumps in one frame), the category sheet settles in 257 ms at 4x (main 148), and a sheet that
opens makes no `animate()` call.

### S2. [Minor] The cancel branch is held only by a QA spec

`qa/e2e/b05feel3-scoped-press.spec.ts` asserts cancel to gone under 100 ms and fails on the probe build; the
repo's `feel` and `motion` suites stay green. Suggested mutant: file `apps/web/src/frame/press.ts`, find
`if (ev.type === 'pointercancel') {\n      clip.remove();\n      return;\n    }`, replace ``, suite: a new one
that runs `b05feel3-scoped-press.spec.ts` (or a unit test that dispatches `pointercancel`).

## Probes (each made alone, reverted; `git status` clean)

| Broke | Caught |
|---|---|
| `--motion-ms` 200 to 2000 ms | yes (was no) |
| forward slides in from the left | yes (was no) |
| long-press haptic removed | yes (was no) |
| ripple's disabled guard removed | no (accepted) |
| shared-amount id check removed | no (accepted) |
| haptic toggle kinds swapped | yes |
| cancelled press keeps its ripple | **no** (S2) |
| sheet height animation duration 0 | yes |
| journey's wait for the search status removed | own-transfer fails 5 of 60 (the wait is what holds it) |

## What I couldn't test, and why

- The film and metrics passes after the fixes (not re-run in a scoped check; finding 3 and the push part of 4 stand).
- Whether main hits the bad `own-transfer` moment at all without the wait: main passes the old journey 100/100, so the old failure is specific to the branch and unexplained.
- A real touch device's pointercancel timing; I used Chromium's touch emulation through CDP.
