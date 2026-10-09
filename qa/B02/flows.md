# B02 · The shell and the listener: flows

Written from the docs (phase 2), before reading the implementation. Native-only parts are driven
through the dev simulator panel (`CLAUDE.md`, *The web app is the real UI*); the real listener is the
emulator's and the phone's. Steps name the screens by their ids in `docs/screens.md`
(`settings/capture/*`). All at 412×915 in Chromium.

```
FLOW-1  Choosing your apps                                         (happy)
        Actor  owner, in the shell (simulated)   Entry  More → Settings → Capture → Your apps
        Steps  1. installed curated apps (TNG, Ryt, Public Bank, Grab) are listed and ticked
               2. the wording says Sen stores their notifications and sends new wording to Google
                  once, digits masked
               3. confirm the choice
        Ends   the chosen list holds the four packages (bridge/sim state), and the screen says so
        Covers AC-40, AC-43, AC-45, AC-46   Spec §6.2, §9.5 step 2

FLOW-2  Trying to choose WhatsApp or Gmail through More            (sad)
        Entry  Your apps → More → search "WhatsApp", then "Gmail", then a social app
        Steps  1. the app is found  2. it can't be ticked, and says why
        Ends   the chosen list is unchanged; nothing from them is captured afterwards
        Covers AC-42, AC-44   Spec §6.2, D86

FLOW-3  A chosen app's payment is captured and shown               (happy)
        Entry  dev panel → simulate a TNG notification "RM 12.90 · FAKE COFFEE"
        Steps  1. simulate  2. open Captured on this phone
        Ends   one row, newest first, title and text exactly as posted, time in KL
        Covers AC-22, AC-29, AC-50   Spec §6.2

FLOW-4  An unchosen app, and an OTP from a chosen one               (sad)
        Entry  dev panel → simulate WhatsApp "RM 50 to you", then Ryt "Your TAC is 123456"
        Ends   Captured on this phone gains no row for either; the heartbeat's last-event time doesn't
               move for them
        Covers AC-23, AC-24   Spec §6.2

FLOW-5  The same notification twice, then two real identical payments   (sad + happy)
        Entry  dev panel → simulate the same Ryt payment twice (same key, when, text); then a third with
               a new `when`
        Ends   2 rows: the re-post added nothing; the second real payment did
        Covers AC-26, AC-27   Spec §6.2, §6.5

FLOW-6  Notification access, greyed out                              (sad)
        Entry  Capture → Notification access
        Steps  1. Open settings  2. the switch is greyed (simulated)  3. the app-info route is offered
        Ends   the restricted-settings route is reachable from the screen, in words
        Covers AC-47   Spec §6.2, §9.5 step 3; flows first-run "When it goes wrong"

FLOW-7  Keep Sen running on a Xiaomi, and on an unknown brand        (happy + sad)
        Entry  Capture → Keep Sen running, with the simulated manufacturer Xiaomi, then "Acme"
        Ends   Xiaomi: battery step first, then Autostart / No restrictions / lock in recents.
               Acme: the battery step only, no crash
        Covers AC-48, AC-49   Spec §6.2

FLOW-8  The hidden tests                                             (happy + sad)
        Entry  More → Account → long-press the version
        Steps  1. short tap: nothing opens  2. long-press: three test buttons
        Ends   each button calls the bridge (recorded by the simulator)
        Covers AC-53

FLOW-9  Share samples                                                (happy + sad)
        Entry  Captured on this phone
        Steps  1. with nothing ticked, sharing says what's missing  2. tick two  3. share
        Ends   the share payload holds exactly those two events' text; no network request carried it
        Covers AC-51, AC-52

FLOW-10 Opening offline                                              (happy + sad)
        Entry  the production build, loaded once online
        Steps  1. go offline  2. reload  3. open Home and switch tabs  4. fetch /api/x offline
        Ends   the app renders from the SW cache; the API request fails (not served from cache)
        Covers AC-6, AC-7

FLOW-11 Back, in the shell's order                                   (happy)
        Entry  Home → Insights → open a sheet
        Steps  1. back: sheet closes  2. back: Home  3. Capture → Your apps → back: Capture
        Covers AC-13

FLOW-12 Another timezone                                             (sad)
        Entry  browser timezone America/Los_Angeles; a captured event at 23:30 KL on 31 Oct
        Ends   the soak list shows 31 Oct, 11:30 PM (KL), not 31 Oct 08:30 or 30 Oct
        Covers AC-50

FLOW-13 Capture screens in a plain browser                           (sad)
        Entry  the production build, no shell
        Ends   Settings → Capture says it needs the Android app, nothing throws
        Covers AC-54
```

## Core journeys

`docs/flows.md` marks no journey as **core** (searched for "core": no match, as in B01's run). B03
builds the tabs' screens, so the journeys in `flows.md` can't be walked end to end yet. As the
integration check, every run opens the production build, walks the five tabs and More, and checks no
page error. Recorded under `notTested` for the journeys themselves.
