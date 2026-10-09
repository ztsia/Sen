# B02 · Acceptance criteria (QA run 2)

Written from the docs only, before the implementation was opened: `spec_v2.md` §5, §5.1, §6.2, §9.5,
§17, §18, §21; `docs/briefs/B02-shell-listener.md`; `docs/decisions.md` D42, D77, D86, D101, D114,
D115; `docs/screens.md` (Settings, Capture's screens); `docs/ui/patterns.md` §6–§8; `docs/local.md`
(B02); `docs/cloud.md` §4–§5; `CLAUDE.md` non-negotiables. Run 1's ledger and report summary were
read first (they're QA records, not source); these criteria are re-derived from the docs, not copied.

Each criterion has a sad twin (`…s`). *Observable* names what passes or fails.

## The shell

AC-1  Application ids
      Given  the three Android build variants
      When   their merged manifests are read (`aapt dump badging`)
      Then   release is `io.github.ztsia.sen`, debug `io.github.ztsia.sen.debug`, e2e `io.github.ztsia.sen.e2e`
AC-1s Then   no two variants share an id (both installable side by side)
      Spec   D115; brief *Two builds*

AC-2  Each build loads exactly one address
      Given  `sites.json` and the built APKs
      Then   release loads only production; debug only one fixed preview alias
AC-2s Then   no `*.vercel.app` wildcard, no `allowNavigation` entry, anywhere in the shell's config;
             with no site configured the APK shows its own page, not a blank WebView or another site
      Spec   §17 *The shell trusts only our own site*; brief; D114

AC-3  The bridge answers only our origin
      Given  the shell's origin check (pure Kotlin, testable here)
      When   given the site's exact origin
      Then   it's accepted
AC-3s When   given `https://site.evil.com`, `https://evil.com/site`, `http://site` (scheme),
             `https://site:444` (port), `https://user@site`-style confusion, `https://site.` , a
             different case, `intent:`/`javascript:` URLs
      Then   each is refused, and an emulator test shows another origin has no native bridge
      Spec   §17; brief done-when 3

AC-4  External links leave the app
      When   `openInBrowser('https://…')` is called
      Then   it goes to `ACTION_VIEW`, never the WebView; a plain web page with no shell opens a new tab
AC-4s When   called with `http:`, `javascript:`, `intent:`, `file:` or a non-string
      Then   nothing opens
      Spec   §17 *Links leave the app*; brief

AC-5  The app opens offline
      Given  a production build served once online (service worker installed)
      When   the context goes offline and the page reloads, including a deep route
      Then   the app renders (Home, and the deep route), and every look's files were precached
AC-5s When   the API is called, online or offline
      Then   the worker never serves an API response from its cache
      Spec   §5.1 *Builds and updates*; D114

AC-6  A new deploy takes over at the next launch, never mid-session
      Given  an installed worker and an open page
      When   a new build is deployed and the page keeps running
      Then   the open page is not reloaded or swapped under the person; the next launch gets the new build
AC-6s Then   the old worker's cache is not left serving the old build forever after the next launch
      Spec   §5.1; D114

AC-7  First launch with no network
      Given  the APK's own fallback page
      Then   it says *Connect once to finish setting up Sen*
AC-7s Then   it contains no third-party script or remote resource
      Spec   §5.1; D114

AC-8  Back follows patterns.md §6
      When   a sheet is open and back is pressed
      Then   the sheet closes and the screen stays
AC-8s When   back on a tab screen other than Home → Home; back on Home → the app exits (not a blank page)
      Spec   patterns.md §6; brief *Android chrome*

AC-9  Status bar and edge-to-edge
      Then   the status bar's icons follow light and dark; `--safe-area-inset-*` are set from the
             system insets
AC-9s Then   in a plain browser nothing breaks (the inset variables fall back to 0 / env())
      Spec   brief *Android chrome*

AC-10 Haptics through the bridge
      When   `SenShell.haptic('light')` exists
      Then   long-press and commit call it; without it, `navigator.vibrate`
AC-10s When  the bridge is absent or throws, the UI action still completes
      Spec   brief *Notes*

AC-11 CI builds and signs
      Then   a workflow builds release and debug on changes under the shell; release is signed from an
             Actions secret; the owner gets a link
AC-11s Then  no keystore, password or token is committed; workflows don't use `pull_request_target`
      Spec   §17 *Secrets*, *Repo hygiene*; brief done-when 1

AC-12 Debug build has capture off
      Then   the debug variant never stores a notification
AC-12s Then  the release variant has capture on
      Spec   §17

AC-13 The bridge reports its version; methods are only added
      Then   the web app reads the shell's version before calling a method newer than it
AC-13s When  an older shell lacks a method, the web app doesn't call it (no uncaught error)
      Spec   §5.1; D114

AC-14 Secrets never ship
      When   the built web bundle and the APKs are grepped for keys and tokens
      Then   none is found
AC-14s Then  no production URL secret, no keystore, no `SEN_KEYSTORE*` value in the build output
      Spec   CLAUDE.md non-negotiable; §17

AC-15 Strict CSP and no third-party scripts
      Then   the production build sends a CSP with no third-party origins and `Referrer-Policy: no-referrer`
AC-15s Then  no `<script src>` from another origin in any built HTML
      Spec   §5.1, §17

## Capture (native)

AC-16 Chosen apps first
      Given  a chosen list [A]
      When   app B posts a notification
      Then   nothing is stored, logged or forwarded to JS, and its extras aren't read
AC-16s When  app A posts the same text, it is stored
      Spec   §6.2; D86; CLAUDE.md non-negotiable; done-when 4

AC-17 OTP/TAC dropped, English and Malay
      When   a chosen app posts "Your OTP is 123456", "TAC: 482913 for transfer", "Kod TAC anda ialah 123456",
             "Jangan kongsi kod 482913", "123456 is your verification code", "OTP123456"
      Then   none is stored
AC-17s When  a chosen app posts a payment that only mentions TAC/OTP ("Never share your TAC. You paid
             RM12.90 to ZUS COFFEE"), or a merchant containing those letters
      Then   it's stored
      Spec   §6.2; D115; CLAUDE.md non-negotiable; done-when 4

AC-18 The keyword list is in the repo and tested
      Then   a keyword file exists in English and Malay, and unit tests cover both languages
AC-18s Then  removing one Malay keyword turns a test red
      Spec   brief *The OTP and TAC filter*

AC-19 Group summaries, ongoing and conversation notifications are dropped
      Then   the listener's manifest refuses conversations; group summaries and ongoing notifications
             aren't stored
AC-19s Then  an ordinary, non-ongoing notification from a chosen app is stored
      Spec   §6.2; D115

AC-20 Raw event fields
      Then   the outbox row holds package, channel, key, postTime, when, title, text and big text,
             unchanged
AC-20s Then  a missing field (no big text, no channel) stores as null, not as a crash or "null"
      Spec   §6.2

AC-21 Dedupe key and UNIQUE
      Given  a stored event
      When   the listener reconnects and Android replays it (same package, key, when, text)
      Then   the outbox still has one row (UNIQUE on the key)
AC-21s When  a second genuine payment with identical text and a different `when` arrives
      Then   two rows; and moving a character between fields (title "ab"/text "c" vs "a"/"bc") gives
             different keys
      Spec   §6.2; D115; CLAUDE.md *Every input has a dedupe key*; done-when 4

AC-22 Channel drop list
      Then   a channel drop list exists and starts empty
AC-22s When  a channel is on the list, its notifications aren't stored
      Spec   brief *A channel drop list*; §6.2

AC-23 Local heartbeat
      Then   connect, disconnect and boot are recorded, with an hourly check; the last-event time moves
             when a new event is stored
AC-23s When  a duplicate/replay is ignored, the last-event time does not move
      Spec   §6.2 *Health*; D115

AC-24 No notification text is logged
      Then   no `Log.*` call in the capture path receives title/text/bigText
AC-24s Then  in any build type, including debug
      Spec   §6.2; D115; CLAUDE.md *Real financial data*

AC-25 Native code re-checks the chosen list
      When   the page calls `setChosen` with a denylisted or SMS package
      Then   native refuses it (not stored as chosen)
AC-25s When  the page sends a curated bank package, it's stored
      Spec   §6.2 (*lives in native code*); D86

## Choosing apps (D86)

AC-26 Curated list data file
      Then   a data file lists package, label, suggested account names; TNG `my.com.tngdigital.ewallet`,
             Ryt `my.rytbank.app`, Public Bank `com.pbb.mypb`, Grab `com.grabtaxi.passenger`
AC-26s Then  no denylisted/messaging package is in it
      Spec   §6.2; §21 Q2

AC-27 No QUERY_ALL_PACKAGES
      Then   the merged manifest has a `<queries>` launcher intent and no `QUERY_ALL_PACKAGES`
AC-27s Then  *More* still lists launchable apps outside the curated list (simulator)
      Spec   §6.2; D86

AC-28 Classifier: unchoosable apps
      Then   the default SMS app, `CATEGORY_SOCIAL` apps and the denylist (WhatsApp, Telegram, Gmail,
             Messenger…) are unchoosable; unit tests prove each
AC-28s Then  a curated bank is choosable; a disabled row says why it can't be turned on
      Spec   §6.2; D86; done-when 5; patterns.md §7 *Settings row*

AC-29 The picker's wording
      Then   it says Sen stores these apps' notifications, and a new wording goes to Google once, with
             digits masked
AC-29s Then  it doesn't claim anything false (e.g. "tested on Xiaomi" before a test)
      Spec   §6.2; brief

AC-30 Installed curated apps are suggested, ticked
      Then   *Your apps* suggests installed curated apps; the owner's four can be chosen in one tap
AC-30s Then  an uninstalled curated app isn't suggested
      Spec   §6.2; flows `first-run` step 2

## Access and Keep Sen running

AC-31 Notification access screen
      Then   shows whether access is granted, with *Open settings*
AC-31s When  the switch is greyed out (restricted), it offers Sen's app-info page for *Allow restricted settings*
      Spec   §6.2; §9.5 step 3; flows `first-run`

AC-32 Keep Sen running, per brand
      Then   the *ignore battery optimisations* dialog first, then the brand's steps from a data file
             generated from dontkillmyapp, chosen by `Build.MANUFACTURER`; Xiaomi's include Autostart,
             *No restrictions*, lock in recents
AC-32s When  the brand has no entry, only the generic step shows, with no error
      Spec   §6.2; D86; §9.5 step 4

## For the soak

AC-33 Captured on this phone
      Then   lists the outbox's events newest first: app and time on one line, then title and text
             exactly as written, selectable; times in Kuala Lumpur
AC-33s When  the outbox is empty, an empty state in patterns.md's form (one line + action)
      Spec   screens.md; patterns.md §7 *Raw notification row*, *Empty*

AC-34 Share samples
      Then   picking mode: a checkbox leads each row, the whole row ticks it; *Share* sends the ticked
             events as text through the share sheet
AC-34s When  nothing is ticked, nothing is shared and the screen says so
      Spec   brief *Share samples*; patterns.md §7

AC-35 Heartbeat visible
      Then   the soak screen shows listener connected/disconnected and the last event time
AC-35s Then  never-connected reads as such, not as a blank or "Invalid Date"
      Spec   screens.md; §6.2 *Health*

AC-36 Hidden tests
      When   the version row in Settings → Account is long-pressed
      Then   *Test category prompt* (three action buttons), *Test island* and *Switch icon* are offered
AC-36s When  the version is tapped (not long-pressed), nothing hidden opens
      Spec   brief; screens.md; docs/local.md

AC-37 Switch icon uses activity-aliases
      Then   two activity-aliases exist in the manifest, exactly one enabled by default
AC-37s Then  toggling never leaves zero launcher entries enabled
      Spec   D77; brief

## Web

AC-38 Browsers: simulated in dev and preview, explained in production
      Then   in dev/preview the dev panel simulates the shell; in production Capture says it lives in
             the Android app
AC-38s Then  the production bundle contains no simulator/dev panel code
      Spec   CLAUDE.md *The web app is the real UI*; §5.1

AC-39 Capture's screens are reachable from Settings → Capture
      Then   `settings/capture/apps`, `access`, `running`, `captured` each render, with back to Capture
AC-39s Then  an unknown `settings/capture/x` shows a not-found state, not a crash
      Spec   screens.md

AC-40 Patterns
      Then   rows are patterns.md's Settings/raw rows; targets ≥48 px; app bar back + title; no axe
             violations of serious/critical impact
AC-40s Then  no screen invents its own row, empty, loading or error state
      Spec   patterns.md §7–§8; CLAUDE.md *One navigation*

AC-41 Timezone
      Given  the browser in `America/New_York`
      Then   captured events' times read in Kuala Lumpur time, the same as under `Asia/Kuala_Lumpur`
AC-41s Then  an event at 23:30 KL on the last of a month shows that KL date
      Spec   CLAUDE.md *Conventions*; D14

AC-42 Offline banner
      When   the web app is offline
      Then   a banner shows, not an error, and Capture's screens still render
AC-42s Then  nothing tries to post to the network and throws
      Spec   patterns.md §7 *Offline*; flows `offline`

## Repo and docs

AC-43 Pure Kotlin module
      Then   a Gradle module with no Android SDK builds and runs its tests in a session
AC-43s Then  it fails red when its logic is broken (probe)
      Spec   brief *For later slices*

AC-44 No real data in the repo
      Then   fixtures are anonymised; `pnpm hygiene` passes
AC-44s Then  no `private/` path tracked
      Spec   CLAUDE.md non-negotiable

AC-45 Docs recorded
      Then   D114 recorded; `docs/local.md` has the phone steps (key, addresses, install, soak, hidden
             tests); `docs/cloud.md` §5 records APK building in a session and the emulator on GitHub
AC-45s Then  the handoff reflects the branch's state
      Spec   brief done-when 9; CLAUDE.md *Session rotation*

AC-46 Suites green
      Then   `pnpm test`, `pnpm typecheck`, `pnpm lint`, Kotlin core tests, `pnpm e2e` pass
AC-46s Then  the shell's emulator tests pass on CI (latest run for HEAD)
      Spec   brief done-when 1–5
