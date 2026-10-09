# B02 · Flows (QA run 3)

Written from the docs before the implementation was opened (run 2), re-read for run 3. Each is walked in
Chromium at 412×915 (D42) with the dev panel standing in for the shell, in `qa/e2e/b02-r3-flows.spec.ts`. Native-only steps
(the real listener, the emulator) are checked through the Kotlin core here and CI's emulator run.

FLOW-1  Choosing your apps                                              (happy)
        Actor  owner, in a dev/preview build (simulated shell)
        Entry  More → Settings → Capture → Your apps
        Steps  1. the curated installed apps are suggested  2. tap *Choose these*
               3. reload the screen
        Ends   the owner's four are ticked, and stay ticked after reload; the wording says what Sen
               stores and that new wording goes to Google once, digits masked
        Covers AC-26, AC-29, AC-30   Spec §6.2, D86, flows `first-run` step 2

FLOW-2  A messaging app can't be chosen                                 (sad)
        Entry  Your apps → *More*
        Steps  1. search for WhatsApp / Messages (SMS)  2. try to tick it
        Ends   its switch is disabled with a line saying why; the chosen list is unchanged
        Covers AC-27s, AC-28, AC-28s   Spec §6.2, D86

FLOW-3  Notification access, restricted                                  (happy + sad)
        Entry  Settings → Capture → Notification access
        Steps  1. access off: *Open settings*  2. simulate greyed-out: Sen's app info is offered
               3. simulate granted
        Ends   the screen reads granted
        Covers AC-31, AC-31s   Spec §6.2, §9.5 step 3

FLOW-4  Keep Sen running on a Xiaomi, and on an unknown brand            (happy + sad)
        Entry  Settings → Capture → Keep Sen running
        Steps  1. the battery step first  2. Xiaomi's steps: Autostart, No restrictions, lock in recents
               3. switch the simulated brand to one with no entry
        Ends   Xiaomi shows its steps; the unknown brand shows only the generic step, no error
        Covers AC-32, AC-32s   Spec §6.2, D86

FLOW-5  A payment captured, then replayed                                (happy + sad)
        Entry  dev panel → simulate a notification from a chosen app
        Steps  1. simulate a Ryt payment  2. open Captured on this phone  3. *Post it again* (replay)
               4. simulate a second identical payment with a new `when`
        Ends   step 2: one row, raw text exact, KL time; step 3: still one row, last-event unchanged;
               step 4: two rows
        Covers AC-20, AC-21, AC-21s, AC-23s, AC-33   Spec §6.2

FLOW-6  An OTP and an unchosen app never arrive                          (sad)
        Entry  dev panel
        Steps  1. simulate an OTP from a chosen app  2. simulate a notification from an unchosen app
        Ends   Captured on this phone is unchanged after both
        Covers AC-16, AC-17   Spec §6.2, D86, non-negotiable

FLOW-13 A batch of OTP shapes against the real filter                   (sad, native)
        Actor  the listener (no UI: the pure Kotlin core is what the shell runs)
        Entry  the core's `OtpFilter`/`CaptureGate`, from QA's own Gradle probe (`qa/B02/core-probe`)
        Steps  1. each of AC-17's OTP shapes  2. each of AC-17s's payments
        Ends   every OTP shape is dropped; every payment is kept
        Covers AC-17, AC-17s   Spec §6.2, D115

FLOW-7  Share samples                                                    (happy + sad)
        Entry  Captured on this phone → *Share samples*
        Steps  1. tap Share with nothing ticked  2. tap a row (the whole row ticks)  3. Share
        Ends   step 1 says to tick first and shares nothing; step 3 shares exactly the ticked event's text
        Covers AC-34, AC-34s

FLOW-8  The hidden tests                                                 (happy + sad)
        Entry  More → Settings → Account → Version
        Steps  1. tap the version  2. long-press it  3. tap each test
        Ends   step 1 opens nothing; step 2 shows the three tests; each calls the bridge
        Covers AC-36, AC-36s

FLOW-9  Production in a browser                                          (happy)
        Entry  a production build, Settings → Capture
        Steps  1. open Capture  2. look for the dev panel
        Ends   Capture says it lives in the Android app; no dev panel; no simulator code in the bundle
        Covers AC-38, AC-38s

FLOW-10 Opens offline                                                    (happy + sad)
        Entry  a production build, loaded once online
        Steps  1. wait for the worker  2. go offline  3. reload Home and a deep route  4. call the API
        Ends   both render offline; the API isn't answered from cache
        Covers AC-5, AC-5s, AC-42

FLOW-11 Back                                                             (happy + sad)
        Entry  a screen with a sheet
        Steps  1. open a sheet  2. back  3. on a non-Home tab, back  4. on Home, back (shell: exits)
        Ends   sheet closes first; then Home; in the browser, back from Home doesn't land on a blank page
        Covers AC-8

FLOW-12 Another timezone                                                 (sad)
        Entry  browser timezone `America/New_York`
        Steps  1. simulate a payment stamped 23:30 KL on 31 Oct  2. open Captured on this phone
        Ends   the row reads 31 Oct, 23:30 (KL), not 31 Oct 11:30 or 1 Nov
        Covers AC-41

## The core journeys

`docs/flows.md` marks no journey as **core** (searched: no match for "core"). Run 1 noted the same.
So this run walks the journeys B02 touches instead: `first-run` steps 2–4 (FLOW-1 to FLOW-4, as
Settings → Capture's screens, which B08 reuses), `capture-off` step 3 (FLOW-3) and `offline`
(FLOW-10). Recorded as an open question: which journeys are core.
