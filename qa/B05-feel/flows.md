# B05 · Feel: flows

Run 1 (full). Written from the docs before the implementation was read. Phone viewport 412x915,
Minted light, one variant, unless a flow says otherwise. Specs: `qa/e2e/b05feel-*.spec.ts`.

FLOW-1  A push forward, and back three ways                                   (happy)
        Entry  Home, motion on, preview build
        Steps  1. tap a payment row -> detail  2. in-app back  3. forward again, browser back
               4. forward again, tap Done/back control on a screen that has it
        Ends   each forward is the forward type and 200 ms; each back is the back type; URL right each time
        Covers AC-1, AC-2, AC-31   Spec D140, patterns §8

FLOW-2  Tabs                                                                   (happy)
        Entry  Home
        Steps  1. tap each of the five tabs  2. push a screen from Money, tap Home from there
        Ends   every switch is a crossfade (no screen translate); the tab bar is steady
        Covers AC-3, AC-4   Spec D140

FLOW-3  The shared amount                                                      (happy)
        Entry  Payments
        Steps  1. record the first row's amount text  2. tap it, sample the amount text every 50 ms
               3. back
        Ends   amount text only ever the same value; transition names unique and gone after
        Covers AC-6, AC-15   Spec patterns §8

FLOW-4  Review clears a row                                                    (happy)
        Entry  Review, three rows
        Steps  1. answer the first  2. sample row tops every 50 ms  3. Undo from the toast
        Ends   rows close the gap smoothly; the toast has Undo; Undo restores the row; state in the
               fake store is consistent
        Covers AC-13, AC-18, AC-21   Spec brief §3

FLOW-5  Fast hands, and a tap during a transition                              (sad)
        Entry  Home
        Steps  1. tap a row; at 50 ms tap another thing; 2. five navigations in 300 ms
               3. wait 500 ms, tap again
        Ends   no stuck state; the last navigation wins; the app is responsive; no console errors
        Covers AC-7, AC-8   Spec patterns §8 Speed

FLOW-6  Reduced motion, the whole journey                                      (sad twin of 1-4)
        Entry  Home, `reducedMotion: 'reduce'`
        Steps  1. push, back, tab  2. clear a Review row  3. open a sheet, change its step
               4. press a button and sample for a ripple/tint
        Ends   no view-transition animation of positive duration; no transform animation; the ripple
              is a tint with no growth; taps never blocked
        Covers AC-24, AC-25, AC-26   Spec patterns §8

FLOW-7  Ripple on pointerdown                                                  (happy + sad)
        Entry  Home
        Steps  1. dispatch pointerdown on a button, a row, a chip, a tab, Sen's button; check the ripple
               in the same task  2. the same on a switch, a checkbox, a disabled button
        Ends   ripple on the first group, none on the second
        Covers AC-9, AC-10, AC-11   Spec D140

FLOW-8  Haptics through a stub shell                                           (happy + sad)
        Entry  a page with `window.Capacitor`-style stub reporting bridge 1, then 2, then none
        Steps  1. confirm with Undo, tap Undo, trigger a validation error, long-press, toggle a switch
               2. scroll, open a sheet, tap tabs
        Ends   v1: zero haptic calls; v2: one per listed moment with the right kind, zero for the
               rest; none: no error
        Covers AC-19, AC-20, AC-21, AC-22   Spec brief §4

FLOW-9  Loading and sheets                                                     (happy)
        Entry  `?state=loading`, then a sheet screen
        Steps  1. content arrives  2. open a split sheet and move between its steps
        Ends   fade into content with CLS 0; the sheet's height animates; nothing clipped
        Covers AC-16, AC-17, AC-28   Spec brief §3

FLOW-10 Six looks                                                              (happy)
        Entry  Home in each look (pin via the dev panel / `?look=`)
        Steps  1. run one push in each  2. read the computed duration and easing of the transition
        Ends   identical timing in all six
        Covers AC-31, AC-32   Spec D140

FLOW-11 Core: `first-run` (as far as the build reaches)                        (core)
        Entry  `/s/first-run` signed out -> sign-in -> home
        Ends   gate, sign-in, home with the tab bar, no console error
        Covers AC-33   Spec docs/flows.md

FLOW-12 Core: `pay-new`                                                        (core)
        Entry  Review, ROTI BAKAR 88
        Steps  1. answer Meals  2. toast with Undo  3. Undo
        Ends   card gone then restored; toast text right
        Covers AC-33   Spec docs/flows.md

FLOW-13 Core: `scan-after`                                                     (core)
        Entry  Scan tab, a fake image
        Steps  1. scan -> reading -> confirm  2. people count  3. Done -> attached toast with Undo
        Ends   the toast, the payment attached, motion on throughout
        Covers AC-33   Spec docs/flows.md


## Run 1 results

| Flow | Status | Ends |
|---|---|---|
| FLOW-1 A push forward, and back three ways | pass | forward, back, forward, back recorded; new screen group 200 ms with the cubic-bezier(0.2,0,0,1) easing, translate 100% in, old translate -25% at opacity 0.6 |
| FLOW-2 Tabs crossfade, also from a pushed screen | fail | Home tab from Payments played `back`, not `tab` |
| FLOW-3 The shared amount | pass | one [data-sen] per row, names unique, none left after; amount text only ever a stored value |
| FLOW-4 Review clears a row, Undo | pass | 12 rows -> 11 -> 12; a `change` transition ran; haptics exactly [confirm, undo] |
| FLOW-5 Fast hands, tap during a transition, a sheet | pass | five navigations in 200 ms end on the last; no stuck transition; no console error; a sheet runs no screen transition |
| FLOW-6 Reduced motion, the whole journey | pass | no view transition, rows change at once, the ripple is a tint (animation none, transform none, opacity 0.12) |
| FLOW-7 Ripple on pointerdown | pass | ripple in the same task on row, tab and all 12 tappables on Home; none on a switch or a disabled button; box and scroll height unchanged |
| FLOW-8 Haptics through a stub shell | pass | bridge 1: 0 calls; bridge 2: toggle-on, toggle-off; a shell that throws: no page error from it |
| FLOW-9 Loading and sheets | fail | CLS 0.005 on load; the sheet jumped 732 -> 285 px with no in-between frame |
| FLOW-10 Six looks, one motion | pass | forward, 200 ms and the same easing in all six |
| FLOW-11 Core: first-run (as far as the build reaches) | pass | journeys.spec first-run passes in the e2e (reduced) and in both motion-on metrics runs |
| FLOW-12 Core: pay-new | pass | answered, toast with Undo, undone (journeys.spec, reduced and motion on) |
| FLOW-13 Core: scan-after with motion on, and at 4x CPU | pass | crop, Reading receipt…, confirm, three people RM21.38, Attached to RM64.13 on Ryt Bank with Undo; 0 console errors |

FLOW-11 to FLOW-13 are the core journeys. FLOW-11 and FLOW-12 were walked by the repo's `journeys.spec` (reduced motion in `pnpm e2e`, motion on in the metrics runs), FLOW-13 by `qa/e2e/b05feel-core.spec.ts`.
