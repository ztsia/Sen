# B01 · Flows

Run 2 (8 Oct): kept run 1's flows (written from the docs only) and added FLOW-15 to FLOW-21 from the
docs, before reading any source in this run.

Written from the docs only, before the source was read. Every flow is walked at a phone viewport
(412×915) in Chromium against `vite preview` (and the production build where named), with
Playwright specs in `qa/e2e/`.

```
FLOW-1  Switch through all six looks, light and dark                    (happy)
        Actor  owner   Entry  /dev/gallery, dev panel
        Steps  1. open the dev panel  2. pick each look in turn  3. for each, Light then Dark
        Ends   <html data-look> and the computed tokens match each look's theme.css; no request
               leaves the origin; no console error or CSP violation
        Covers AC-13, AC-15, AC-16, AC-16s, AC-17   Spec patterns.md §1, §2; spec §17

FLOW-2  Move between the tabs                                            (happy)
        Actor  owner   Entry  /
        Steps  1. Home is active  2. tap Review  3. tap Insights  4. tap More  5. browser back
        Ends   exactly one aria-current="page" at each step, on the tapped tab; Sen's button on
               each; back from a non-Home tab lands on Home
        Covers AC-21, AC-21s, AC-24, AC-27

FLOW-3  Scan: tap against long-press                                     (happy + sad)
        Actor  owner   Entry  any tab screen
        Steps  1. tap Scan  2. return  3. hold Scan 300 ms  4. hold Scan 600 ms  5. back
        Ends   1 goes to the scanner stand-in with no sheet and no tab bar; 3 opens nothing;
               4 opens scan-more without navigating; 5 closes the sheet and stays
        Covers AC-23, AC-23s, AC-25, AC-26

FLOW-4  Review's badge                                                   (happy + sad)
        Actor  owner   Entry  dev panel state switcher
        Steps  set the count to 0, 5, 99, 100, 120
        Ends   no badge / "5" "5 to review" / "99" / "99+" / "99+"
        Covers AC-22, AC-22s

FLOW-5  Type an amount into the money input                              (happy + sad)
        Actor  owner   Entry  /dev/gallery, money input
        Steps  1. type 1,284.50  2. clear, type 12.505  3. blur  4. press submit
        Ends   1 shows RM1,284.50 (128450 sen); 3 shows a message under the field; 4 stays
               enabled and says what's wrong; the typed text is kept
        Covers AC-31, AC-31s, AC-32

FLOW-6  A sheet and the back button                                      (happy + sad)
        Actor  owner   Entry  /dev/gallery, sheet
        Steps  1. open the sheet  2. browser back  3. open again, close with Close  4. browser back
        Ends   2 closes the sheet and stays on /dev/gallery; 4 leaves the gallery (no dangling entry)
        Covers AC-26, AC-26s

FLOW-7  A change with Undo                                               (happy + sad)
        Actor  owner   Entry  /dev/gallery, toast
        Steps  1. trigger the change  2. tap Undo  3. trigger twice  4. wait 6.5 s
        Ends   Undo reverts; second toast replaces the first; the toast is gone after 6 s
        Covers AC-33, AC-33s

FLOW-8  Production opens on "Not built yet"                              (happy + sad)
        Actor  anyone  Entry  production build, /
        Steps  1. open /  2. open /dev/gallery  3. look for the dev panel
        Ends   "Not built yet" with no data, in Minted; no dev panel; no gallery
        Covers AC-46s, AC-47s, AC-48

FLOW-9  Reduced motion and the avatar                                    (happy + sad)
        Actor  owner   Entry  dev panel avatar player
        Steps  1. play each of the eight states in each look  2. turn on reduced motion
        Ends   eight distinct states per look; under reduced motion two frames 1 s apart are equal
        Covers AC-41, AC-41s

FLOW-10 Text scale 1.5×                                                  (sad)
        Actor  owner   Entry  dev panel, text scale 1.5×
        Steps  1. switch to 1.5×  2. scroll the gallery
        Ends   no element's text overflows its box with overflow hidden; amounts aren't ellipsised
        Covers AC-40, AC-29

FLOW-11 Another timezone                                                 (sad)
        Actor  owner   Entry  /dev/gallery with the browser in America/Los_Angeles
        Ends   the day header shows the same date as in Asia/Kuala_Lumpur
        Covers AC-37

FLOW-12 Going offline                                                    (sad)
        Actor  owner   Entry  /dev/gallery
        Steps  1. context.setOffline(true)  2. reload attempt is not part of B01 (no service
               worker until B02)  3. back online
        Ends   the offline banner appears while offline and goes on reconnect
        Covers AC-49

FLOW-13 Mercury and Copper with WebGL missing                            (sad)
        Actor  owner   Entry  /dev/gallery, Chromium with WebGL disabled
        Ends   a still drawing; no uncaught error
        Covers AC-18

FLOW-14 Accessibility sweep                                              (happy)
        Entry  /dev/gallery in all 12 combinations
        Ends   axe reports no contrast or label violations; every interactive element ≥48 px
        Covers AC-38, AC-39
```

```
FLOW-15 A wrong address                                                  (sad)
        Actor  owner   Entry  /s/no-such-screen, then /nowhere
        Steps  1. open the address  2. tap the error state's button
        Ends   1 shows the shared error state in words with a button, the tab bar present, no
               TanStack default page; 2 lands on Home with Home's tab current
        Covers AC-53, AC-53s   Spec patterns.md §7

FLOW-16 Scan long-press with a finger                                    (happy + sad)
        Actor  owner   Entry  / at 412×915 with touch
        Steps  1. touchstart on Scan, hold 600 ms, touchend  2. close  3. touch tap Scan
        Ends   1 opens scan-more and the lift activates nothing under the finger (URL unchanged,
               sheet open); 3 goes to the scanner stand-in with no sheet
        Covers AC-54, AC-54s, AC-23

FLOW-17 Switching to a look whose chunk is slow, then one that fails     (sad)
        Actor  owner   Entry  /dev/gallery, dev panel
        Steps  1. delay the next look's chunk 3 s and switch  2. go offline and switch to a look
               not yet loaded
        Ends   1 the tab bar stays styled in the old look until the new one arrives; 2 no
               unhandled error, a styled look remains
        Covers AC-56

FLOW-18 Undo, then change again                                          (sad)
        Actor  owner   Entry  /dev/gallery, toast
        Steps  1. change  2. Undo  3. change again at once
        Ends   3 shows a toast
        Covers AC-57

FLOW-19 Home → Review → Home → back                                      (sad)
        Actor  owner   Entry  /
        Steps  tap Review, tap Home, browser back
        Ends   back leaves the app (history leaves the origin or stays on Home), never Review
        Covers AC-59

FLOW-20 Keyboard focus against tap focus                                 (happy + sad)
        Actor  owner   Entry  /dev/gallery
        Steps  1. Tab to a button  2. tap a button with the pointer
        Ends   1 shows a focus ring; 2 shows none
        Covers AC-65

FLOW-21 The production bundle                                            (sad)
        Actor  anyone  Entry  the production build's dist/
        Steps  grep the built JS for the gallery, the dev panel, keys and tokens
        Ends   none found
        Covers AC-11, AC-61
```

## Core journeys

`docs/flows.md` marks no journey as **core** (searched for "core": no match). And B01 builds no
screen, since every screen is a placeholder until B03. So no core journey can be walked; this is
recorded under `notTested`.
