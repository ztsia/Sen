# B05 · Feel: motion, feedback and haptics, acceptance criteria

Run 1 (full). Written from `docs/briefs/B05-feel.md`, `docs/decisions.md` D140, `docs/ui/patterns.md`
§8 (the motion contract, which this slice rewrote), `spec_v2.md` §5.1 (the bridge's methods are only
ever added) and the `CLAUDE.md` non-negotiables, **before** the implementation was read. The handoff
was read first (as `CLAUDE.md` says); it describes what was built, so these criteria are weaker than
a blind run on the "how", but every observable below comes from the contract documents.

The slice has no schema, SQL or API route of its own: phase 4 doesn't apply. Screens and the shell:
phases 1-3, 4b, 5, 6.

Viewport 412x915 unless a criterion says otherwise. "Motion on" means `prefers-reduced-motion: no-preference`;
"reduced" means `reduce`.

## Screen transitions (brief §1, D140, patterns §8)

AC-1  Forward is a push
      Given  Home, motion on
      When   a row that pushes a screen is tapped (Home -> a payment's detail)
      Then   a view transition runs; the root has the forward type; the new screen's group animates
             `translateX` from a non-zero right offset to 0; the old group moves left and dims; it
             lasts 200 ms (+-20 ms) with `cubic-bezier(0.2, 0, 0, 1)`
      Spec   D140; patterns §8 Forward

AC-2  Back is the reverse (sad twin of AC-1)
      Given  the pushed screen from AC-1
      When   the in-app back button, then the browser's back (the Android back gesture), then *Done*
             on a screen that has one, are used
      Then   each plays the back type (new screen slides in from the left or the pushed one slides out
             to the right), never the forward type; the URL ends on the previous screen each time
      Spec   D140; patterns §8 Back

AC-3  A tab switch crossfades, and from a pushed screen too
      Given  Home, then a pushed screen under another tab
      When   a tab is tapped in each case
      Then   the type is the crossfade: no `translateX` on the screen group; opacity only; the tab bar
             does not move or fade and plays the look's own `switch` motion
      Spec   D140; patterns §8 A tab switch

AC-4  The tab bar and Sen's button stay live above a transition
      Given  a push in progress
      When   it is captured mid-way (at 100 ms)
      Then   the tab bar and the Sen button are at their rest positions, fully opaque, not slid or dimmed
      Spec   D140 ("the old screen shifts left and dims"); the patterns' regions

AC-5  A sheet's own history step moves nothing
      Given  a screen with a sheet (a filter sheet; a split sheet)
      When   the sheet opens and the browser back closes it
      Then   no screen transition runs under it (no slide of the screen behind), the sheet rises and
             falls on its own, and the URL stays on the screen
      Spec   patterns §8 A sheet

AC-6  The shared amount
      Given  Payments (or an Account's list) and a payment row
      When   the row is tapped, and then back
      Then   the amount shares one transition name between row and detail's figure while it runs, and
             nowhere in the page outside a transition (names unique at any time); the amount's text is
             identical before, during and after: never an in-between figure
      Spec   patterns §8 One shared element, Money never counts

AC-7  Taps are blocked while a transition runs, and not after
      Given  a push in progress
      When   a second tap lands on the old screen at 50 ms, and another at 400 ms
      Then   the first does nothing (or at most one navigation happens); the second works; the app is
             never left unresponsive
      Spec   patterns §8 Speed ("Taps are blocked while a screen transition runs")

AC-8  Fast repeated navigation settles
      Given  motion on
      When   five forward/back/tab navigations are fired within 300 ms
      Then   the app ends on the screen of the last one, with no stuck overlay, no stale
             `view-transition` pseudo-elements, and no uncaught console error
      Spec   brief §1 (direction-aware); robustness

## Press feedback (brief §2, D140)

AC-9   Ripple within one frame
       Given  any button, chip, list row (`NavRow`, `Item`), tab and Sen's button
       When   `pointerdown` is dispatched at a point inside it
       Then   in the same frame (the same task before the next rAF) a ripple element exists inside or on
              the target, centred on the pointer's offset, and it's removed after its animation
       Spec   D140 ripple on pointerdown; brief §2

AC-10  The ripple does not belong to what shouldn't have one (sad twin)
       Given  switches, checkboxes, and anything marked no-press
       When   they get a pointerdown
       Then   no ripple element appears on them; and a disabled button gets none either
       Spec   D140 ("Every button, chip, row and tab"); patterns §8 haptics for toggles

AC-11  The ripple never changes layout
       Given  a row, a button, a chip
       When   pressed and held
       Then   its bounding box, the page's scroll height and the CLS counter are unchanged (0 layout
              shift attributable to a press); text is not clipped
       Spec   brief "no layout shift from motion"

AC-12  Press feedback is not at a call site
       Given  the diff
       When   the new press code is grepped
       Then   it lives in the shadcn parts, blocks and one module, not as per-screen `className`
              scale or tint classes
       Spec   brief §2; CLAUDE.md *shadcn first*, `className` is for layout only

## Change motion (brief §3)

AC-13  A Review row clears and the next slides up
       Given  Review with three rows and motion on
       When   the first row is answered
       Then   the row slides/fades out, the rows below close the gap (their tops move to the cleared
              row's old top over the transition), and at the end exactly two rows remain with the
              expected order; the toast appears
       Spec   brief §3; patterns §8 Change motion

AC-14  A write that fails does not leave the screen frozen or the row lost (sad twin)
       Given  Review, the network failing (offline or the write rejected)
       When   a row is answered
       Then   the screen is interactive within 100 ms; the row either stays, with the error shown, or
              clears with its toast and queued write; it is never gone with no trace
       Spec   brief §3; spec §5.1 offline writes

AC-15  Money never counts
       Given  any screen with an amount, sampled every 50 ms across a transition or change motion
       When   the amount's text is read in each frame
       Then   every sampled text is one of {the value before, the value after}, never in between; no
              frame shows a rolling digit element
       Spec   brief §3, D140, patterns §8; CLAUDE.md money rule (integer sen; formatting only)

AC-16  A skeleton fades into its content
       Given  a screen in its loading state (`?state=loading`) then loaded
       When   content arrives
       Then   the content fades in (opacity from below 1 to 1), the skeleton is gone at the end, the
              page doesn't jump (CLS 0)
       Spec   brief §3

AC-17  A sheet eases to a new height
       Given  a sheet that changes step (a split sheet; a sheet showing an error)
       When   its content changes
       Then   its height transitions, not jumps (a frame between the two heights exists), and ends at
              the new content's height with nothing clipped
       Spec   brief §3

AC-18  A toast slides in and out
       Given  an action with a toast (Undo)
       When   it's shown and dismissed or times out
       Then   it has an entry and an exit animation (position or opacity in-between values)
       Spec   brief §3

## Haptics (brief §4, patterns §8)

AC-19  A browser has no haptics, and calling them is harmless
       Given  a plain browser (no shell)
       When   every moment that has a haptic occurs
       Then   no error, no unhandled promise, nothing thrown; the action itself happens as normal
       Spec   brief §4 "A browser has no haptics"

AC-20  The bridge is versioned and checked first
       Given  a shell reporting bridge version 1 (older) and one reporting 2 (current)
       When   a haptic moment occurs
       Then   with v1 the web app never calls `haptic` (zero calls); with v2 it calls `haptic` once per
              moment with the right kind; a shell that throws is swallowed
       Spec   spec §5.1 methods only ever added; brief §4

AC-21  Haptics only on the listed moments
       Given  a shell stub that counts `haptic` calls
       When   the user scrolls a list, taps ordinary rows and buttons, opens a sheet, navigates tabs
       Then   zero haptic calls; and exactly one per: confirm (a change with Undo), Undo, an error
              after a tap, a long-press, a toggle (on and off each)
       Spec   patterns §8 Haptics ("never on scroll or on every tap")

AC-22  A rejected input gives a reject haptic once, not on mount (sad twin)
       Given  a form with a validation error
       When   the form first renders with an error already visible, and when a tap produces one
       Then   no haptic on render of an already-showing error; one reject on a tap that produces it,
              not one per re-render
       Spec   patterns §8 "an error after a tap"

AC-23  The shell's `haptic` method is covered by an emulator test and goes through Android's own
       constants (so the touch-feedback setting governs it)
       Given  `apps/shell` Kotlin
       When   `haptic` gets each kind, an unknown kind, and no kind
       Then   known kinds call `performHapticFeedback` with a constant; an unknown or missing kind
              rejects or no-ops without crashing; the test asserts it. (Emulator not reachable here:
              read, and record as not executed.)
       Spec   brief §4 and Done-when; patterns §8

## Reduced motion (brief §5, patterns §8)

AC-24  Reduced motion: no slide, no fade, no change motion
       Given  `prefers-reduced-motion: reduce`
       When   a push, a back, a tab switch, a Review row clearing, a sheet height change and a skeleton
              loading happen
       Then   no `view-transition` animation with a non-zero duration runs for the screen; the final
              state is there in the first frame after the action; no element has a running
              `transform`/`opacity` animation lasting beyond 50 ms from motion.css (except the ripple)
       Spec   patterns §8 Reduced motion; brief §5

AC-25  Reduced motion keeps the ripple as a tint without spreading (sad twin of AC-24)
       Given  reduce
       When   a button receives pointerdown
       Then   press feedback is still visible (a tint) but its box does not grow (no scale animation)
       Spec   patterns §8 Reduced motion

AC-26  Reduced motion turns taps and navigation into immediate ones
       Given  reduce
       When   a push is made
       Then   the tap isn't blocked at all (the next tap at 20 ms works)
       Spec   patterns §8 Speed

## Speed and smoothness (brief §6, Done-when)

AC-27  A tap's first visible change is within 100 ms, in every look (the metrics' limit)
       Given  the journeys' taps, motion on, the CPU not throttled
       When   the first-change time is read from the metrics
       Then   none is over 100 ms; any flag in the diff report has a measured cause
       Spec   brief §6; `qa/limits.ts`

AC-28  No layout shift from motion
       Given  every catalogued screen at load and across a navigation
       When   CLS is read
       Then   0 (or below the limit in qa/limits.ts)
       Spec   brief Done-when

AC-29  The trees are unchanged except where a screen gained an element
       Given  `apps/web/e2e/trees/*.aria.yml` at HEAD against `main`
       When   the diff report compares trees
       Then   no tree changed unless it gained an element the brief calls for; none lost an element
       Spec   brief Done-when

AC-30  Functional e2e is not flaky under motion
       Given  the e2e suite, run twice
       When   compared
       Then   the same pass/fail both times; functional specs run with reduced motion; motion.spec runs
              with it on
       Spec   brief Done-when ("The tests stay reliable")

## Looks and unchanged behaviour

AC-31  One motion for all six looks
       Given  the six looks, motion on
       When   a push is run in each
       Then   the same duration and easing in every look; the tab bar's `switch` is the look's own
       Spec   D140

AC-32  The new look crossfade (B04) and the look's own moments still work
       Given  a pinned look change and each look's figure, avatar and reveal
       When   they run
       Then   they're not replaced by the screen push; the look-change crossfade is not a push
       Spec   docs/screens.md; patterns §8 "A look's own motion stays in its own moments"

AC-33  The core journeys still pass with motion on (flows.md: first-run, pay-new, scan-after)
       Given  a fresh start
       When   each core journey is walked with motion on
       Then   every step's assertion holds and no console error
       Spec   docs/flows.md; D124

## Non-negotiables this slice touches

AC-34  No real financial data in the diff or fixtures
       Given  the diff
       When   grepped for account numbers, real names, secrets
       Then   nothing real; hygiene check clean
       Spec   CLAUDE.md non-negotiables

AC-35  No float arithmetic on money in the diff
       Given  the diff
       When   grepped for new `parseFloat`, `toFixed`, `* 0.`, `Math.round(` near money
       Then   no hit on a money path; the no-float lint rule is green
       Spec   CLAUDE.md "Money is integer sen"

AC-36  No third-party script, no new network origin (the shell loads only our own site)
       Given  the build and the CSP
       When   the built output and package changes are inspected
       Then   no new dependency that loads remote scripts; no secret in the bundle; the new bridge
              method answers only our origin as the others do
       Spec   CLAUDE.md; spec §17

AC-37  One navigation and one set of patterns
       Given  the diff in screens
       When   read
       Then   no screen invents its own transition, ripple or press tint: they go through the shared
              module and the blocks
       Spec   CLAUDE.md last non-negotiable; patterns §8


## Run 1 results

| AC | Status | Evidence |
|---|---|---|
| AC-1 | pass | types forward; new screen translate(100%) -> none, 200 ms, easing on keyframes; old translate(-25%) opacity 0.6 |
| AC-2 | pass | sequence forward back forward back; back old translate(100%), new from translate(-25%). *Done* not exercised |
| AC-3 | fail | Home tab from Payments played `back`; Review tab played `tab` |
| AC-4 | pass | tabbar group y unchanged at 90 ms; its old pseudo hidden. The Sen button was not measured separately |
| AC-5 | pass | Ask Sen sheet open then back: 0 view transitions; category sheet: 0 |
| AC-6 | pass | 1 [data-sen] per row (15 rows), ids unique, no name left after, Account list not skipped |
| AC-7 | pass | tap at 50 ms and later: no stuck state, no error. Block length: see finding 6 |
| AC-8 | pass | 5 taps in 200 ms + history jumble: ends on last, 0 console errors |
| AC-9 | pass | row, tab and 12 of 12 Home tappables had .press in the same task as pointerdown |
| AC-10 | pass | switch false, disabled false; no checkbox on that screen; `summary` rows get none (finding 10) |
| AC-11 | pass | box unchanged, scrollHeight unchanged, CLS 0.005 |
| AC-12 | pass | grep for active:bg/opacity/scale: no hits |
| AC-13 | pass | change transition recorded; 12 -> 11 rows; the closing of the gap was not measured frame by frame |
| AC-14 | unreachable | the preview has no failing write path in its fake |
| AC-15 | pass | sampled live [data-sen] texts are real values only; no counter code in the diff |
| AC-16 | unreachable | CLS passes (0.005); the opacity fade itself was not sampled |
| AC-17 | fail | heights seen [732,285]; ResizeObserver never attached (finding 2) |
| AC-18 | unreachable | not measured (sonner defaults) |
| AC-19 | pass | every moment ran in Chromium with no error |
| AC-20 | pass | stub shell: v1 0 calls, v2 right kinds, throw swallowed. Behaviour right; no repo test (finding 4) |
| AC-21 | pass | scroll, tabs, sheet open: []; toggles, confirm, undo exact |
| AC-22 | unreachable | no test and not driven |
| AC-23 | unreachable | no emulator here. Read: ShellTest asserts a `performed` key and that an unknown kind rejects; the constant mapping is not asserted |
| AC-24 | pass | vts [] across push, back, tab, Review clear; forced reduce in settings: not reachable (no switch found) |
| AC-25 | pass | animation none, transform none, opacity 0.12 |
| AC-26 | pass | no view transition ran, so nothing could block |
| AC-27 | pass | no step.firstChangeMs flag; head median delta 0 ms over 171 steps. The screen itself arrives 128-199 ms after a tap at 4x (finding 6) |
| AC-28 | pass | 0 layoutShift flags; Payments load CLS 0.005 |
| AC-29 | pass | 0 trees changed, 0 new |
| AC-30 | fail | 1 of 1392 failed (own-transfer covered), passed 2 of 2 alone; the motion-on journeys failed 2 of 76 on head, 0 of 76 on main |
| AC-31 | pass | six looks: forward, 200 ms, same easing |
| AC-32 | pass | new-look runs its own untyped view transition; avatar states e2e green; catalogue pixels unchanged |
| AC-33 | pass | scan-after with motion on and at 4x CPU; first-run and pay-new in the e2e and the metrics runs |
| AC-34 | pass | pnpm hygiene passed; made-up scenario data only |
| AC-35 | pass | new toFixed/Math.round only in scripts/frame-times.mjs for milliseconds; lint green |
| AC-36 | pass | dist-production grep: no key, DB URL or token; only w3.org/react.dev/localhost strings; no new dependency |
| AC-37 | fail | the shared modules are used and no `active:` tints remain; but `pnpm typecheck` fails (finding 1), and the sheet hook is dead (finding 2) |
