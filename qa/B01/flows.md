# B01 · Flows

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

## Core journeys

`docs/flows.md` marks no journey as **core** (searched for "core": no match). And B01 builds no
screen, since every screen is a placeholder until B03. So no core journey can be walked; this is
recorded under `notTested`.
