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

## Retro

Run 1 came late on two things:
- **The typecheck.** Every local check piped `pnpm -s typecheck` into `tail`, which hid the error and
  its exit code. Run the fast checks without pipes before handing a branch to QA.
- **The sheet hook.** It was checked only by eye, and never with a test that samples heights.

What it cost most: the reviewer's run (about 280k tokens and 2 hours on Sonnet). It had no Agent
tool, so it ran the sweep and the eyes pass itself. `CLAUDE.md` says subagents can't start
subagents, but the `qa` skill told the reviewer to start its helpers. The skill now says what to do
without the tool: the reviewer runs the sweep, and the main session spawns `qa-eyes`.
