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

---

# Run 2

Written from the brief, D140 and patterns §8 before reading any code. Phone 412x915, Minted light unless said.

FLOW-R2-1  Push and pop                                         (happy)
        Entry  `/payments` (More → Payments), motion on
        Steps  1. tap a payment row  2. wait for the transition  3. back by the button
               4. tap a row again, then `history.back()`  5. tap a row, then Done where the screen has one
        Ends   each step lands on the right screen; a transition ran for push and pop (200 ms); the
               detail's amount matches the row's
        Covers R2-1, R2-2, R2-6, R2-7

FLOW-R2-2  Tabs                                                 (happy)
        Entry  Home
        Steps  1. tap Insights  2. tap Money  3. push into a detail, then tap Home from it
        Ends   crossfade each time, never a slide; the tab bar never inside the captured region
        Covers R2-3, R2-4

FLOW-R2-3  Ripple on every kind                                 (happy)
        Steps  `pointerdown` without release on a button, a row, a chip, a tab, Sen's button, a disabled
               button, a switch; release, drag off, scroll
        Ends   ripple exists for the first five within a frame; none for disabled/switch; none left over
        Covers R2-11, R2-12, R2-14

FLOW-R2-4  Review: clear a row, with Undo                       (happy)
        Steps  1. open Review  2. resolve the first row  3. Undo from the toast
        Ends   the row slides out, others close the gap; toast slides in and out; Undo brings it back;
               one confirm haptic, one Undo haptic; the stored result matches the screen
        Covers R2-15, R2-16, R2-23

FLOW-R2-5  Reduced motion                                       (sad twin of all motion)
        Steps  emulate reduced motion; run FLOW-R2-1, -2, -4
        Ends   no animation; the screen changes at once; the ripple a tint only
        Covers R2-19

FLOW-R2-6  No View Transitions API                              (sad)
        Steps  delete `document.startViewTransition` before load; walk FLOW-R2-1 and -2
        Ends   navigation works, no console error. Covers R2-9

FLOW-R2-7  Hammering                                            (sad)
        Steps  tap a row and back at once; tab, tab, tab within 100 ms; a push then the back gesture mid-transition
        Ends   last request wins; not blank; taps work again within 300 ms. Covers R2-7, R2-10

FLOW-R2-8  Haptics through a fake shell, and without one        (happy + sad)
        Steps  install a fake bridge at version 2: toggle a switch on and off, confirm with Undo, Undo,
               a field error after a tap, a long-press on Scan, scroll, load; repeat with a bridge at
               version 1 and with none
        Ends   calls: one per moment, none on scroll/load; v1 and none: zero calls and no error. Covers R2-22, R2-23

FLOW-R2-9  Sheets and skeletons                                 (happy)
        Steps  open and close a sheet; a sheet with a step/error that changes its height; load a screen from cold
        Ends   no screen transition for the sheet; the height eases; skeleton fades to content, CLS 0. Covers R2-5, R2-17, R2-18, R2-27

FLOW-R2-10 Six looks                                            (happy)
        Steps  FLOW-R2-1 in each of six looks
        Ends   same duration and easing; each look's tab `switch` still plays. Covers R2-28

FLOW-R2-11 Core: first-run, pay-new, scan-after                 (happy)
        Entry  per `docs/flows.md`, with the dev simulator, motion on
        Ends   each journey's *Done* state. Covers R2-36

(Run 2, as walked: the specs are `qa/e2e/b05feel2-*.spec.ts`; `b05feel2.config.ts` says how to serve them. The
probes `b05feel2-homeflake`, `-sheetsettle` and `-sheetwobble` fail today by design: each pins a finding.)

---

# Run 3

FLOW-R3-1  Payments to a detail and back, motion on          (happy)
        Entry  Payments, 412x915, motion on
        Steps  1. tap a row  2. read the animation  3. Done / back
        Ends   forward then back types; 200 ms; amount shared; one transition name at a time
        Covers R3-1, R3-2, R3-5, R3-6, R3-12, R3-22
FLOW-R3-2  The same in reduced motion                         (sad)
        Ends   no `screen` animation; the same destinations. Covers R3-1s, R3-23
FLOW-R3-3  Ten tab taps in a second, then a tap from a pushed screen   (sad)
        Ends   last tab wins, no overlay; tab bar not animated. Covers R3-3, R3-3s
FLOW-R3-4  A Review row cleared, with and without a slow API   (happy/sad)
        Ends   one fewer row, gap closes; a slow write never freezes. Covers R3-11, R3-15
FLOW-R3-5  Haptic moments with a fake bridge                   (happy/sad)
        Ends   the exact list of calls; none on scroll or plain tap; version 1 and no bridge are quiet.
        Covers R3-16, R3-16s, R3-17
FLOW-R3-6  Back at the start, a duplicate amount, and no `startViewTransition`   (sad)
        Covers R3-2s, R3-5s, R3-7
FLOW-R3-7  Six looks: the same push, and a look change           (happy)
        Covers R3-25, R3-26
Then the core journeys `first-run`, `pay-new` and `scan-after` once each (docs/flows.md).

---

# Run 3, scoped re-check

FLOW-R3S-1  A scroll starting on a row, and ten quick taps          (happy/sad)   Covers R3S-1, R3S-1s, R3S-2
FLOW-R3S-2  Category sheet: pick, then error/step twice quickly       (happy/sad)   Covers R3S-3, R3S-3s
FLOW-R3S-3  Payments search: type, sample every frame, clear, no match (happy/sad)  Covers R3S-4, R3S-4s
FLOW-R3S-4  own-transfer, 100 runs, head against main                  (happy)       Covers R3S-5
