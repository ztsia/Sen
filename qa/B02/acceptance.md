# B02 · The shell and the listener: acceptance criteria

Written by the QA reviewer from the docs only, before reading the implementation (phase 1). Sources:
`docs/briefs/B02-shell-listener.md` (the brief), `docs/modules.md` B02, `spec_v2.md` §5, §5.1,
§6.2, §6.5, §9.5, §17, §18, §21; `docs/decisions.md` D42, D77, D86, D101, D114, D115;
`docs/screens.md` Settings; `docs/ui/patterns.md`; `CLAUDE.md` non-negotiables.

Each criterion can only pass or fail. *Sad* marks a criterion that checks a failure case fails the right
way; each happy criterion has its sad twin next to it. **Reach** says where it can be checked:
*session* (this VM: Kotlin JVM tests, Gradle builds, Chromium), *emulator* (GitHub Actions'
emulator, no KVM here), *phone* (the owner's Xiaomi).

## A. The shell

```
AC-1  Application ids
      Given  the Android app's Gradle config
      When   the release and debug variants are built
      Then   release is `io.github.ztsia.sen`, debug a different id (D115: `.debug`), so both install
             side by side; the id and name are recorded in CLAUDE.md
      Spec   brief §The shell; D115           Reach session (aapt dump of the built APKs)

AC-2  Each build loads exactly one address           (sad: no wildcard)
      Given  the release and debug builds
      Then   release loads only the production address, debug only one fixed preview alias;
             neither config contains a wildcard host (`*.vercel.app`) and `allowNavigation` is empty
      Spec   §17, brief                         Reach session

AC-3  The bridge answers only our origin             (sad twin of AC-4)
      Given  a page from another origin loaded in the shell's WebView
      When   it calls the native bridge (SenShell / SenCapture / Capacitor)
      Then   the call is refused; a test exists for it and fails when the origin check is removed
      Spec   §17, brief done-when 3             Reach emulator (test read; origin logic probed in session)

AC-4  Our own origin reaches the bridge
      Given  the configured site origin
      Then   the bridge's methods are callable; an origin that only shares a prefix
             (`https://sen.vercel.app.evil.com`, `http://` vs `https://`, another port) is refused
      Spec   §17                                Reach session (pure origin logic) / emulator

AC-5  Release captures; debug doesn't               (sad: debug records nothing)
      Then   capture is on in release and off in the debug build, so nothing is recorded twice
      Spec   §17, brief                         Reach session (build config)

AC-6  Opens offline through a service worker
      Given  the production web build, loaded once online
      When   the network goes away and the app is reloaded
      Then   the app renders (Home's tab bar shows); every built file, the six looks' chunks included,
             is in the SW cache
      Spec   §5.1, D114, brief done-when 2      Reach session (Chromium)

AC-7  The API is never cached                        (sad twin of AC-6)
      When   a request to `/api/...` is made through the SW
      Then   it goes to the network; offline it fails rather than serving a stale cached copy
      Spec   D114                               Reach session

AC-8  A new deploy waits for the next launch
      Given  a page controlled by SW v1, and a new build v2 deployed
      Then   the open page is not reloaded or swapped mid-session; v2 serves after the next launch
      Spec   D114, §5.1, patterns.md §10        Reach session

AC-9  First launch offline shows the APK's own page  (sad)
      Given  nothing cached and no network
      Then   the shell shows "Connect once to finish setting up Sen" from the APK, not a WebView error
      Spec   §5.1                               Reach session (file exists and is wired) / emulator

AC-10 The shell reports its version; the web app feature-detects
      Then   the web app reads the shell version over the bridge, and calling a method an older shell
             lacks does not throw (it checks first)
      Spec   §5.1, D114                         Reach session (unit) 

AC-11 openInBrowser only for https                  (sad: other schemes refused)
      When   the web app calls openInBrowser with `https://…` it goes to ACTION_VIEW (in a browser: a
             new tab); with `http:`, `javascript:`, `intent:`, `file:` nothing opens
      Spec   §17, brief notes                   Reach session (web side); Kotlin side by reading + emulator

AC-12 Haptics through the bridge, with a fallback
      Then   `SenShell.haptic('light')` is called when the shell is there; otherwise navigator.vibrate
      Spec   brief notes                        Reach session

AC-13 Back follows patterns.md §6
      Given  a sheet open over a screen
      When   Android back is pressed
      Then   the sheet closes first; then back one screen; on a tab other than Home, back goes to
             Home; on Home it leaves the app
      Spec   patterns.md §6, brief              Reach session (history in browser) / emulator

AC-14 Status bar and edge-to-edge
      Then   the status bar's icons follow light/dark; `--safe-area-inset-*` are set from the shell's
             insets
      Spec   brief, patterns.md §10             Reach emulator / phone; web side read in session

AC-15 Splash screen exists                          Reach session (resources)

AC-16 CI builds both APKs; the release is signed with an Actions secret only  (sad: no key in repo)
      Then   a workflow builds release and debug on changes under the shell; the keystore and its
             password come only from secrets; no keystore file is tracked; no workflow uses
             `pull_request_target`; a fork's PR gets no secret
      Spec   brief done-when 1, §17             Reach session (read + grep); a real run: not here

AC-17 The built web bundle holds no secret, and no dev simulator   (CLAUDE.md non-negotiable)
      Then   grep of the production build's JS finds no key/token, and no capture simulator code
      Spec   §17, CLAUDE.md                     Reach session

AC-18 The shell loads only our own site
      Then   no third-party script or font is requested by the production build; CSP is strict
      Spec   §5.1, §17                          Reach session
```

## B. Capture (native)

```
AC-20 The listener is a NotificationListenerService that refuses conversations
      Then   the manifest declares the service with BIND_NOTIFICATION_LISTENER_SERVICE and refuses
             conversation notifications in its meta-data
      Spec   §6.2, brief                        Reach session (merged manifest of the built APK)

AC-21 Group summaries and ongoing notifications are dropped     (sad)
      Given  a chosen app posts a group summary, or an ongoing notification
      Then   nothing is stored
      Spec   §6.2, D115                         Reach session (pure core) / emulator

AC-22 A chosen app's notification is stored
      Given  TNG is chosen
      When   it posts "RM 12.90" payment text
      Then   exactly one outbox row with package, channel, key, postTime, when, title, text, bigText
      Spec   §6.2, brief                        Reach session (core) / emulator

AC-23 An unchosen app leaves no trace                             (sad twin of AC-22)
      Given  WhatsApp, or any app not chosen
      When   it posts a notification (even one with "RM" in it)
      Then   0 outbox rows, nothing logged, nothing reaches JavaScript; checked BEFORE the OTP filter
      Spec   §6.2, D86, CLAUDE.md non-negotiable   Reach session (core + ordering) / emulator

AC-24 OTP and TAC are dropped, in English and Malay              (sad)
      Given  a chosen app
      When   it posts "Your OTP is 123456", "TAC: 123456 for transfer…", "Kod pengesahan anda…",
             "Jangan kongsi kod ini", "one-time password", "kata laluan sekali"
      Then   0 rows; the keyword list is a file in the repo, with tests
      Spec   §6.2, brief                        Reach session

AC-25 A payment is not mistaken for an OTP                         (sad twin of AC-24)
      Given  a chosen app's payment notification
      When   its text contains words with the letters of a keyword inside them ("Contact", "attack",
             "Stacks", "TACO BELL", "OTPro") or a merchant code
      Then   it is stored
      Spec   §6.2 (only OTP/TAC dropped)        Reach session

AC-26 Same notification twice: one row                           (dedupe non-negotiable)
      When   Android re-posts it (or the listener reconnects and replays it) with identical package,
             key, when and text
      Then   the outbox has 1 row; the dedupe key column is UNIQUE
      Spec   §6.2, §6.5, brief done-when 4      Reach session (SQLite schema/logic) / emulator

AC-27 Two genuine identical payments: two rows                   (sad twin of AC-26)
      When   two notifications have the same package, key and text but different `when`
      Then   2 rows. Also: different text with the same key and when → 2 rows
      Spec   §6.2                               Reach session

AC-28 The dedupe key is unambiguous and stable
      Then   hash(package + key + when + text) uses a field boundary, so ("ab","c") and ("a","bc")
             give different keys; the same input gives the same key on every run
      Spec   §6.2, §5 (ids derive from it)      Reach session

AC-29 Raw text is never changed
      Then   title, text and big text are stored exactly as posted (emoji, curly apostrophes, spacing)
      Spec   §6.2                               Reach session / emulator

AC-30 A local heartbeat
      Then   the listener's connect/disconnect, boot and an hourly check are recorded with times, and the
             time of the last event; shown in the soak screen
      Spec   §6.2 Health, D115, brief           Reach session (web sim) / emulator / phone

AC-31 A channel drop list, empty at start
      Then   a channel on the list is dropped before storage; the list ships empty
      Spec   §6.2, brief                        Reach session

AC-32 The capture path never parses money with a float          (CLAUDE.md non-negotiable)
      Then   no parseFloat/toFixed/Number( on amounts in the diff's money paths
      Spec   CLAUDE.md                          Reach session (grep)

AC-33 The pure Kotlin module builds and tests without the Android SDK
      Then   `gradle -p apps/shell/core test` passes with no SDK; at least one test
      Spec   brief §For later slices            Reach session
```

## C. Choosing apps

```
AC-40 The curated list is a data file
      Then   each entry has package, label and suggested account names; it holds the owner's four:
             my.com.tngdigital.ewallet, my.rytbank.app, com.pbb.mypb, com.grabtaxi.passenger
      Spec   D86, §21 Q2                        Reach session

AC-41 Installed apps found through <queries>, never QUERY_ALL_PACKAGES   (sad)
      Then   the merged manifest has a <queries> launcher intent and no QUERY_ALL_PACKAGES permission
      Spec   §6.2, D86                          Reach session (aapt / merged manifest)

AC-42 SMS, social and denylisted apps can't be chosen               (sad)
      Then   the default SMS app, CATEGORY_SOCIAL apps, and WhatsApp, Telegram, Gmail, Messenger are
             refused by the classifier; a test covers each
      Spec   §6.2, D86, brief done-when 5       Reach session

AC-43 A bank app can be chosen                                     (sad twin of AC-42)
      Then   TNG, Ryt, Public Bank and Grab are choosable
      Spec   D86                                Reach session

AC-44 The chosen list can't be widened by bypassing the picker     (sad)
      When   the web app (or any JS) asks the bridge to save a denylisted package as chosen
      Then   native code refuses it and it never captures
      Spec   D86 ("the chosen list lives in native code"), CLAUDE.md non-negotiable  Reach session

AC-45 The picker says what Sen stores, and the Google step
      Then   the apps screen says Sen stores these apps' notifications, and that each new wording goes
             to Google once with digits masked
      Spec   §6.2, brief                        Reach session (Chromium)

AC-46 The picker suggests installed curated apps, ticked; More searches every launchable app
      Spec   §6.2, §9.5 step 2, flows first-run step 2   Reach session (Chromium + simulator)

AC-47 Notification access, with the restricted-settings route
      Then   the access screen opens Android's notification-access page, and offers the app-info page
             for "Allow restricted settings" when the switch is greyed out
      Spec   §6.2, §9.5 step 3                  Reach session (Chromium + simulator)

AC-48 Keep Sen running: battery dialog first, then the brand's steps
      Then   the generic "ignore battery optimisations" step comes first; Xiaomi shows Autostart,
             battery saver "No restrictions" and lock in recents, from a data file generated from
             dontkillmyapp
      Spec   §6.2, D86                          Reach session

AC-49 An unknown brand gets the generic step only                   (sad twin of AC-48)
      Then   no crash, no empty brand section pretending to be steps
      Spec   §6.2                               Reach session
```

## D. For the soak

```
AC-50 Captured on this phone: newest first, raw text, in KL time
      Then   the list shows the outbox's events newest first, with title and text unchanged, dates in
             Asia/Kuala_Lumpur whatever the device's timezone
      Spec   brief, CLAUDE.md conventions       Reach session

AC-51 Never synced                                                  (sad)
      Then   opening the list and sharing samples make no network request carrying event text
      Spec   brief ("never synced")             Reach session

AC-52 Share samples: chosen events as text through the share sheet
      Then   ticking N events and sharing hands exactly those N events' text to the share sheet;
             with none ticked, share is not possible / says what's missing
      Spec   brief                              Reach session (Chromium; share stubbed)

AC-53 Hidden tests behind a long-press on the version
      When   the version row in Settings → Account is long-pressed
      Then   three buttons: a test category prompt with three actions, Test island, Switch icon;
             a short tap does not open them
      Spec   brief, docs/local.md               Reach session (web) / phone (effects)

AC-54 Capture screens only where capture can exist
      Then   in a plain browser (no shell), Settings → Capture doesn't offer controls that can't work
             (says it needs the Android app) and nothing throws
      Spec   screens.md Settings ("Shell, capture on")   Reach session
```

## E. UI contract and repo rules

```
AC-60 Capture's screens use patterns.md                            (CLAUDE.md non-negotiable)
      Then   app bar with back and title; settings rows (label, value/switch, chevron); list rows for
             events; empty / loading / error states as §7; no invented list row, form, sheet or state;
             touch targets ≥ 48 px; the tab bar's rules (§6) hold
      Spec   patterns.md §6, §7, §8             Reach session

AC-61 Navigation: One navigation                                   Reach session
      Then   More holds Settings → Capture; no second tab row or hamburger; no duplicate rows with the
             same label on one screen

AC-62 Docs written as the brief requires
      Then   spec §5.1 records remote vs bundled (D114); docs/local.md has the review-alias and phone
             steps; docs/cloud.md §5 says whether a session can build the APK and whether the emulator
             runs on GitHub's runners; §21 Q2 answered; docs/handoff.md rewritten by the session
      Spec   brief done-when 7, 9; CLAUDE.md    Reach session (read)

AC-63 No real financial data in the repo                           (CLAUDE.md non-negotiable)
      Then   Kotlin/TS fixtures and samples use anonymised names (TAN WEI MING etc.); `pnpm hygiene`
             passes
      Spec   CLAUDE.md                          Reach session

AC-64 Suites green: unit, typecheck, lint, e2e, Kotlin core          Reach session
```

## Unreachable here by construction

Done-when 4 (the emulator journeys) and 6 (the Xiaomi's week) and Q3, Q26, Q27, D77's icon test need
the emulator or the phone. They are criteria, but this VM has no KVM; they're reported as *not
reachable* unless a session-side proxy covers part of them.
