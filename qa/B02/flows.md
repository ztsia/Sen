# B02 · Flows (QA run 4)

Written from the docs before the implementation was opened (run 2), re-read for runs 3 and 4. Each is walked in
Chromium at 412×915 (D42) with the dev panel standing in for the shell, in `qa/e2e/b02-r4-flows.spec.ts` (run 4). Native-only steps
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
        Steps  1. each of AC-17's OTP shapes (a–s, and run 4's t–ap)  2. each of AC-17s's payments (1–20)
        Ends   every OTP shape is dropped; every payment is kept (`Probe4.kt` for run 4's cases; `Probe`–`Probe3` re-run)
        Covers AC-17, AC-17s   Spec §6.2, D115

FLOW-14 A dropped OTP is visible on the phone, without its text          (sad, run 4)
        Entry  dev panel → *Post an OTP* from a chosen app; then from an unchosen app
        Steps  1. post an OTP from a chosen app  2. open Captured on this phone
               3. post an OTP from an unchosen app  4. reload Captured on this phone
        Ends   step 2: no event row; the heartbeat log has one drop entry naming the app and a time, with
               none of the OTP's text or digits; step 4: the log is unchanged (no entry for the unchosen app)
        Covers AC-47, AC-47s   Spec §6.2, D115

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

`docs/flows.md` marks no journey as **core** (run 4 searched again: `grep -i core docs/flows.md` has no
match). Runs 1–3 noted the same; the handoff now holds it for the owner.
So this run walks the journeys B02 touches instead: `first-run` steps 2–4 (FLOW-1 to FLOW-4, as
Settings → Capture's screens, which B08 reuses), `capture-off` step 3 (FLOW-3) and `offline`
(FLOW-10). Recorded as an open question: which journeys are core.

## Run 5: the capture path only (D116)

Written from the docs before the source was opened (see the run-5 note in `acceptance.md`). The owner
set this run's scope: the other journeys (FLOW-1 to FLOW-14) aren't walked again. Every notification is
made up.

FLOW-15 A doubtful OTP from a chosen app, in the simulator                 (sad, handled)
        Actor  owner (dev build)    Entry  dev panel → *Post a maybe-OTP*
        Steps  1. open Settings → Capture → Captured on this phone (note the row count)
               2. dev panel: *Post a maybe-OTP*  3. reopen Captured on this phone
               4. dev panel: *Post it again*  5. reload Captured on this phone
        Ends   step 3: one new row, its number shown as bullets, with the muted line *Maybe a one-time code,
               so its numbers are hidden*; no 4+ digit code anywhere in the page's text; step 5: still one
        Covers AC-54s, AC-57, AC-59   Spec §6.2, D116

FLOW-16 A plain payment and a footer-only payment, unmasked               (happy)
        Entry  dev panel → simulate a payment from a chosen app
        Steps  1. simulate a chosen app's payment (no OTP word)  2. open Captured on this phone
        Ends   the row's title and text are exactly as posted; no muted line under it
        Covers AC-50s, AC-53s, AC-57s   Spec §6.2

FLOW-17 A clear OTP and an unchosen app, after the mask                    (sad)
        Entry  dev panel → *Post an OTP*; then a notification from an unchosen app
        Steps  1. *Post an OTP*  2. open Captured on this phone  3. post from an unchosen app  4. reload
        Ends   no event row for either; one drop entry for step 1 only, with no text or digits
        Covers AC-48, AC-49, AC-56s   Spec §6.2, D86

FLOW-18 Share samples with a masked row                                    (sad, handled)
        Entry  Captured on this phone → *Share samples*
        Steps  1. tick the masked row and a plain row  2. share (the browser's share/clipboard stand-in)
        Ends   the shared text holds the masked text (no code) and marks it as a maybe one-time code; the
               plain row is exact
        Covers AC-58, AC-58s   Spec brief *Share samples*, D116

FLOW-19 A batch of doubtful shapes through the real core                   (sad, native)
        Actor  the listener (no UI: the pure Kotlin core the shell runs)
        Entry  `qa/B02/core-probe`, `Probe5.kt`
        Steps  1. each AC-50/51/52/53/61/62/63 case through the gate, the filter, the mask and the key
               2. the key over the masked text against the key over the raw text  3. hostile sizes (AC-64)
        Ends   every case lands where its criterion says
        Covers AC-48 to AC-55, AC-61 to AC-64   Spec §6.2, D115, D116

FLOW-20 The simulator and the core agree                                   (sad)
        Entry  dev panel's simulator store, driven from Playwright with the same inputs as FLOW-19
        Steps  1. post each input through the simulator  2. read the stored rows
        Ends   for every input, the simulator's stored text equals the core's (or the gap is recorded)
        Covers AC-59s   Spec CLAUDE.md (simulator walks native flows)

### Core journeys, run 5

Still none marked core in `docs/flows.md` (open with the owner since run 1). By the owner's scope for this
run, the other journeys aren't walked; the capture path above stands in for the "payment captured" journey
the handoff recommends as core.

## Run 6: the capture path only (scoped)

Written from the docs before reading the implementation. Walked in Chromium at 412×915 through the dev
simulator panel (the listener itself is native; its Kotlin core is exercised by `Probe6.kt`).
Every notification is made up.

```
R6-FLOW-1  A payment from a chosen app lands on Captured, exactly          (happy)
           Entry  dev panel -> simulate Ryt Bank "Card payment completed 👍" /
                  "RM12.90 paid at Kedai Kopi 椰 using your Main Account."
           Steps  1. open settings/capture/captured  2. simulate  3. reload the list
           Ends   one new top row: Ryt Bank + KL time; title and text byte-identical; no muted line
           Covers R6-AC-14, R6-AC-19

R6-FLOW-2  An unchosen app and an OTP leave nothing                        (sad)
           Entry  dev panel
           Steps  1. simulate an unchosen app's payment  2. simulate a chosen app's "Your TAC is 482913."
                  3. open Captured
           Ends   row count unchanged; "482913" nowhere on the page
           Covers R6-AC-1, R6-AC-2, R6-AC-3, R6-AC-22

R6-FLOW-3  A payment with a TAC footer and a store number is masked       (sad)
           Entry  dev panel -> "Paid RM12.90 at KEDAI 4829. Never share your TAC."
           Steps  1. simulate  2. open Captured
           Ends   the row reads "Paid RM12.90 at KEDAI ••••. Never share your TAC." with the muted line
           Covers R6-AC-10, R6-AC-11, R6-AC-20, R6-AC-22

R6-FLOW-4  The same notification twice                                     (sad)
           Entry  dev panel: post the same notification (same key, same when) twice
           Ends   one row
           Covers R6-AC-15

R6-FLOW-5  A no-OTP-word notification with a long reference                (sad; D119)
           Entry  dev panel -> Grab "Your GrabPay Wallet has been charged MYR 12.40 for booking
                  00129876543-K4XQ2PLM7RTWA-G-1."
           Ends   the reference's long digit run masked, MYR 12.40 kept, no muted line (not marked)
           Covers R6-AC-14, R6-AC-20

R6-FLOW-6  Share samples of a masked row                                  (sad)
           Steps  1. Captured -> Share samples  2. tick the masked row by tapping its body  3. share
           Ends   shared text holds "••••", not "4829"
           Covers R6-AC-23

R6-FLOW-7  Another timezone                                               (sad)
           Entry  browser timezone America/New_York; simulate a post at 23:30 KL on 31 Oct 2026
           Ends   the row shows the KL time and date
           Covers R6-AC-21
```

### Core journeys

`docs/flows.md` still marks no journey as core (open with the owner, `docs/handoff.md`). None of the
candidate journeys (`pay-known`, `pay-new`, `scan-after`) is reachable in B02, whose capture stops at
the outbox. R6-FLOW-1 is the capture path's end-to-end walk and stands in for them.
