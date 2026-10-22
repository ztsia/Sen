# B05 · Feel: QA ledger

## Run 1 (full): fix first, 4 Major, 5 Minor

Fixed in `b46c021`, except where it says otherwise.

| # | Sev | Fix | Tier, and why |
|---|---|---|---|
| 1 | Major | `haptic()`'s two paths now return one promise type. `pnpm typecheck` is clean. | 1: one file, no behaviour change. |
| 2 | Major | `useSheetResize` returns a callback ref, because Radix mounts the sheet's content after the sheet's effects run. Pinned by `motion.spec` *a sheet whose content changes eases to its new height* (more than 3 distinct heights; QA's FLOW-9b saw only `[732, 285]` before) and the mutant `sheet-jumps`. | 3: the Sheet block is shared by every sheet. |
| 3 | Major | The tab bar marks a tap (`tabChangeNext`), so a tab tapped within a second crossfades whichever way history goes. Pinned by `motion.spec` *the Home tab, tapped from a pushed screen deep in history* and the mutant `motion-home-tab-pops`. | 3: the tab bar is navigation. |
| 4 | Major | `src/lib/haptics.test.ts` covers bridge 2 (each moment's constant), bridge 1 (the long-press tick only), a failed `info()`, and a browser. Mutants `haptic-bridge-never-called` and `haptic-old-shell-called`. | 2: the haptics area only. |
| 5 | Minor | The metrics ignore mutations on the ripple's own nodes and `data-pressed`. The host is now positioned by a base-layer `:has(> .press)` rule rather than a style write, so it leaves no late mutation either. | 3, since it rides with 2 and 3. |
| 6 | Minor | **Accepted, with a lever.** A tab crossfade holds taps for 400–1280 ms at 4× CPU, where `patterns.md` says no longer than 200 ms. Most of it is the new tab screen's render, which motion-off navigation pays too. The rest is compositing, which this machine does in software. The owner judges it on the phone. If it feels slow, tabs switch at once (drop `tab` from `routerTransition`'s types). | None. |
| 7 | Minor | **Watched.** The metrics passes with motion on and 4× CPU failed `subscription` once and `scan-after` once, in 76 runs each; `main` failed neither. Neither reproduces alone. The functional suite runs reduced and is unaffected. The next full run re-measures. | None. |
| 8 | Minor | Ten mutants in `qa/mutants.ts` (suites `feel` and `motion`): direction, tabs, reduced motion, Home tab, sheet height, ripple on a switch, Undo, toggle, bridge call, old shell. | 1: test-only. |
| 9 | Minor | `own-transfer`'s *covered* check. Before `792e9fa` it failed 2 runs in 48, against 0 in 72 on `main`. `792e9fa` names the moving parts only while Sen's own transitions run, and after it the test passed 60 of 60. QA's one failure in its full run came from the same cause, while the permanent name was still in place. | 3, in `792e9fa`. |
| 10 | Note | Fixed: `<summary>` rows get the ripple, and a failed `info()` is tried again at the next moment. **Left as is:** an error shown after Enter in a field plays no haptic. The guard that stops a buzz on every keystroke can't tell Enter from typing, and a silent refusal costs less than one that buzzes per key. | 2: the haptics area. |

**The batch takes tier 3** (fixes 2, 3 and 5 reach shared code), so a fresh full run follows.

## Run 2 (full): fix first, 3 Major, 4 Minor

Fixed in `d30fa4a`.

| # | Sev | Fix | Tier, and why |
|---|---|---|---|
| 1 | Major | The sheet's height animation fed its own ResizeObserver: 135 `animate()` calls from one tap, and 3 s of creeping. Now one animation runs at a time, and the next change is measured from where it ended. `motion.spec` now pins the duration too (the last height change within 450 ms of the first). Mutants `sheet-jumps` and `sheet-too-slow` are killed. | 3: the Sheet block. |
| 2 | Major | A render still showing Home, while history had already moved on, recorded the next tab's history step as Home's. Home's step is now recorded only while `/` is the address. *Home tab* passed 40 of 40, where it failed about 10% before. No mutant: only a timing race shows it, so a single run can't judge it. | 3: the tab bar. |
| 3 | Major | **Cause found.** The Payments list guessed a row at 56 px and a day header at 40 px; they measure 58 to 74 px and 34 px. Until the list measured them, a taller row covered the next for a frame. The flake predates B05, and B05's extra work made the race likelier. The guesses are now 58 and 34 px. `own-transfer` passed 40 of 40. | 2: one screen. |
| 4 | Minor | **Watched.** In the feel pass at 4× CPU, `scan-after` failed 6 of 12 (2 of 12 on `main`) and `subscription` 1 of 12. Both are timing-bound journeys under a slowed CPU. Run 3 re-measures. | None. |
| 5 | Minor | **Accepted** (run 1, 6): a push costs about 100 ms more before the new screen's first frame at 4× CPU: the capture plus the motion. The ripple answers within one frame, so the first visible change stays under 100 ms. The owner judges the rest on the phone. | None. |
| 6 | Minor | A `<label>` row around a checkbox, switch or radio gets the ripple. | 2. |
| 7 | Minor | `reject-while-typing` is pinned by `field.test.tsx` (a tap, Enter, typing, and an error on load). **Left without a test:** the ripple on a disabled control (no screen has one that can be pressed); the skeleton's fade; `canTransition()`'s check, which only a browser without view transitions shows; the shared-amount id check (ids are UUIDs). Kotlin's `hapticConstant` mapping is read, not tested. | 1: tests. |
| 9 | Note | The error haptic now follows a tap or Enter (`justCommitted`), so an error shown on load, or after Enter, is right too. | 2. |

**The batch takes tier 3** (fixes 1 and 2), so run 3 is a fresh full run. The main session spawns
`qa-eyes` once the diff report exists, since the reviewer can't.

## Run 3 (full): fix first, 2 Major, 4 Minor (and the eyes pass)

Fixed in `963ad1b` and the commit after it.

| # | Sev | Fix | Tier, and why |
|---|---|---|---|
| 1 | Major | **Cause found, in the journey.** `own-transfer` searches Payments and waited for a row that is in the unfiltered list too. The search runs 200 ms after typing stops, so the step read the list while it swapped: the full list's height, with the filtered rows placed by stale measurements under the sticky day. B05's extra work made that moment likelier. The journey now waits for the search's own status (*26 payments match*), and passed 90 of 90. Run 2's estimate fix (58 and 34 px) stays, since it's right regardless. | 1: the journey only. |
| 2 | Major | `motion.spec` pins D140's numbers: a push runs `sen-in-right` for 200 ms. It also covers Scan's long-press haptic. Mutants `motion-slow`, `motion-forward-from-left` and `long-press-silent` are killed. **Still without a test:** the ripple on a disabled control (nothing pressable is disabled), the shared-amount id check (ids are UUIDs), and the ripple's reduced-motion rule (`app.css` already zeroes every animation under reduced motion). | 1: tests. |
| 3 | Minor | **Watched.** In the feel pass (motion on, 4× CPU), `scan-after` misses *Reading receipt…* when the made-up reader holds it under about 900 ms, and `subscription` is read before it settles. 2 of 42 runs fail on the branch; `main` fails `scan-after` too, at other times. The functional suite runs reduced and is unaffected. | None. |
| 4 | Minor | Part fixed: `useSheetResize` no longer measures as a sheet opens (43 ms of the profile); the observer's first report is its baseline. **Accepted** (runs 1 and 2): a push or a sheet answers 60–150 ms later than `main` at 4× CPU. The ripple answers within a frame, which run 3 measured at 22 ms. The owner judges the rest on the phone. | 2: the sheet only. |
| 5 | Minor | Eyes pass, weighed by the reviewer against `main`: no regression beyond 4. Pre-existing and left for their own slices: the toast drawn over an open sheet (worst on Remove's confirm), the *Category* title flipping as a sheet closes, Undo's late effect, and Account's red *RM42.10 less*. | None. |
| 6 | Minor | A scroll that begins on a row cancels the press, and the ripple goes at once rather than fading. The ripple still starts on `pointerdown`, as D140 says. | 2: it runs only on `pointercancel`, which no journey fires. |

**The batch takes tier 2:** the journey and test changes, the cancel path and the sheet's baseline
each stay in one area. So run 3's reviewer is resumed, scoped to press feedback, sheets and the
Payments search.

## Retro

Run 1 came late on two things:
- **The typecheck.** Every local check piped `pnpm -s typecheck` into `tail`, which hid the error and
  its exit code. Run the fast checks without pipes before handing a branch to QA.
- **The sheet hook.** It was checked only by eye, and never with a test that samples heights.

What it cost most: the reviewer's run (about 280k tokens and 2 hours on Sonnet). It had no Agent
tool, so it ran the sweep and the eyes pass itself. `CLAUDE.md` says subagents can't start
subagents, but the `qa` skill told the reviewer to start its helpers. The skill now says what to do
without the tool: the reviewer runs the sweep, and the main session spawns `qa-eyes`.
