# B02 · Acceptance criteria (QA run 4)

Run 4 keeps run 3's criteria, re-read against the docs as they now stand. Since run 3, spec §6.2 and D115
state the filter's rule in words: evidence sentence by sentence, the title apart from the text; advice
isn't evidence unless it points at a code; a strong keyword with a code anywhere in the rest drops; a weak
one (PIN, kod, code) only when joined to its code; a code is 4 to 8 digits, never an amount, date, time,
phone number or reference; in doubt it drops; each drop from a chosen app is logged by time and app, never
text. Run 4 adds AC-17 cases t–z and aa–ap, AC-17s payments 7–20, and AC-47 (the drop log). All were
written from the spec and decisions before `OtpFilter.kt` or `otp-keywords.txt` was opened. The reviewer
had read QA's own records first (run 3's report, the ledger, QA's `Probe3.kt`) to avoid repeating cases.

Originally written from the docs only, before the implementation was opened: `spec_v2.md` §5, §5.1, §6.2, §9.5,
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

AC-17 OTP/TAC dropped, English and Malay, in the shapes banks actually send (run 3)
      Given  a chosen app
      When   it posts any of these (each alone):
               a. "Your OTP is 123456"                         b. "TAC: 482913 for transfer"
               c. "Kod TAC anda ialah 123456"                   d. "123456 is your verification code"
               e. "OTP123456"                                    f. "Your OTP is 123 456. Valid for 3 minutes."
               g. "G-482910 is your verification code."          h. "TAC No. 482910 for RM50.00 transfer"
               i. "Your TAC for DuitNow Transfer of RM50.00 to TAN WEI MING is 482910. Valid for 3 mins."
                  (an amount's decimal point inside the clause)
               j. "Your one-time password is 482910"           k. "Your Ryt Bank OTP is 482910"
               l. "482910 is your Grab verification code"     m. "Kod pengesahan anda ialah 482910"
               n. "TAC anda: 482910"                            o. "Gunakan kod 482910 untuk log masuk"
               p. title "One-Time Password", text "482910. Valid for 3 minutes." (keyword and code in
                  different fields)
               q. "Your OTP is\n482910" (a line break), "Your OTP is\u00A0482910" (a no-break space)
               r. "YOUR TAC IS 482910" (case)                   s. "Your TAC is 4829. Do not share."
      Then   none is stored (the filter says OTP)
AC-17s When  a chosen app posts a real payment that merely shares words or digits with an OTP:
               "RM12.90 paid at 7-ELEVEN 123456 KL using your Main Account. Never share your PIN."
               "You've received RM42.50 from TAN PIN HUI. Reference number 20261009."
               "Card payment RM38.15 at PETRON approved. Approval code 482910. Never share your OTP."
               "Anda telah menerima RM50.00 daripada TAN WEI MING. No. Transaksi 48291077. Jangan kongsi TAC anda."
               "Transfer to TAC TRADING is successful. Ref: 48291077"
               "You've sent RM50.00 to OTP ENTERPRISE on 09 Oct, 14:30 (GMT+8) using your Main Account."
      Then   each is stored (a payment is never silently dropped as an OTP)
      Spec   §6.2; D115 (joined keyword and code); CLAUDE.md non-negotiable; done-when 4

AC-17 (run 4) More OTP shapes, none of them in any earlier QA run or the branch's tests
      Given  a chosen app
      When   it posts any of these (title | text | big text; "-" is absent):
               t.  "RM50.00 DuitNow to TAN WEI MING. TAC: 482910. Expires in 3 min."   (amount first)
               u.  "PBe: TAC 482910 for Fund Transfer RM100.00 to acct ending 1234. Not you? Call 03-2176 7000"
               v.  "Kod OTP anda untuk transaksi RM100.00 ialah 482910. Sah selama 5 minit."
               w.  "Masukkan 482910 sebagai kod pengesahan anda."  (code before a Malay keyword)
               x.  "Use one-time PIN 482910 to complete your RM120.00 purchase at SHOPEE"
               y.  "482910 adalah OTP anda. Jangan kongsi."
               z.  "Approve login? Code 482910 expires in 60s"   (weak keyword joined)
               aa. "Your OTP for TNG eWallet is 482910 (valid 5 mins). Ref: 8812"
               ab. "TAC=482910"
               ac. "OTP: 48 29 10"   (pairs)
               ad. "Do not share this OTP with anyone: 482910"   (advice that holds the code)
               ae. "Transaction Authorisation Code (TAC) 482910 for transfer RM100.00"
               af. "Kata laluan sekali (OTP) anda: 482910"
               ag. title "Your OTP" | text "482910"
               ah. "Your 2FA code is 482910"
               ai. "One Time Passcode (OTP): 482910"
               aj. "Your login code is 482910"
               ak. "Your TAC is ready! 482910"
               al. "otp 482910"
               am. "🔐 Your OTP is 482910"
               an. "482910 is your TAC for RM50.00 to TAN WEI MING"
               ao. title "Public Bank" | text "You have a new message" | big text "Your TAC is 482910"
               ap. "PIN: 4829"
      Then   none is stored (the gate's decision is a drop, not Keep)
AC-17s (run 4) More payments that share words or digits with an OTP
      When   a chosen app posts any of these:
               7.  "You've paid RM12.90 to ZUS COFFEE. Never share your OTP or TAC with anyone."
               8.  "Payment of RM1,250.00 to TAN WEI MING successful on 09/10/2026 14:30. Ref 482910."
               9.  "DuitNow QR payment RM8.50 to KEDAI TAC SENG. Transaction ID 20261009482910"
               10. "Received RM100.00 from TAN WEI MING. If you did not authorise this, call 03-2176 7000."
               11. "Ryt Bank: RM25.00 spent at GRAB*FOOD 482910 using card ending 1234."
               12. "Your card ending 4829 was charged RM38.15 at PETRON. Do not reveal your PIN or TAC to anyone."
               13. "Bayaran RM12.90 kepada ZUS COFFEE berjaya pada 09/10/2026. Jangan dedahkan OTP anda kepada sesiapa."
               14. "TNG eWallet: Reload of RM50.00 successful. Transaction No. 2026100914301234."
               15. "GrabPay: You paid RM15.00 to MAKCIK NASI LEMAK. Order code A-482910."
               16. "Pembayaran RM30.00 kepada TNB berjaya. Nombor akaun 220012345678."
               17. "Transfer of RM200.00 to 1234 5678 9012 successful."
               18. title "Public Bank" | "PBe: RM120.00 debited from acct 4829xxxx1234 on 09-10-26 14:30. Ref 482910. Never share your TAC."
               19. "Anda telah membayar RM12.90 kepada ZUS COFFEE. Rujukan: 482910."
               20. "Payment successful. RM12.90 to ZUS COFFEE. Reference code: 482910"
      Then   each is stored. (Spec §6.2 lets the filter drop *in doubt*; none of these is in doubt by the
             spec's own definition, since every number is an amount, date, time, phone number, account digits
             or a labelled reference, and every strong keyword sits in advice.)
      Spec   §6.2 *How the OTP/TAC filter decides*; D115

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

## Added in run 4

AC-47 A drop from a chosen app leaves a trace, never text
      Given  a chosen app
      When   it posts an OTP that the filter drops
      Then   the phone's log gains one entry with the time and the app, and the soak screen can show it
AC-47s Then  the entry holds no title, text, big text or digits from the notification; and a notification
             from an unchosen app (OTP or not) leaves no entry at all
      Spec   §6.2 *How the OTP/TAC filter decides* (last sentence), *The chosen list … never stored or logged*; D115

## Run 5: the capture path only (D116)

Scope, set by the owner: what happens to a chosen app's notification between the listener and storage
(what's dropped, what's stored, and exactly what text), and how that shows on *Captured on this phone* and
in the simulator. Sources: `spec_v2.md` §6.2 (*The chosen list*, *Also dropped*, *How the OTP/TAC filter
decides*, *What the filter keeps but might hold a code is masked*, *Raw text is stored first*, *Dedupe
key*); D86, D115, D116; `docs/ui/patterns.md` §7 *Raw notification row*; `docs/screens.md` (Settings →
Capture); the B09 and B10 briefs' D116 lines (for what B02 must hand them); `CLAUDE.md` non-negotiables.

Written before any of `apps/shell` or `apps/web` was opened in this run. The reviewer had read QA's own
records first (reports 1–4 and the ledger); the ledger's D116 row describes the masker in one sentence
("an OTP word anywhere (advice included) and a run of four or more digits (grouped, glued to letters, with
invisible characters) masks every such run as `•`, leaving amounts"). That's disclosed here because it's
a description of the code, though not the code. Every notification below is made up.

Two doc wordings differ slightly and both are held: §6.2 says the digits are "masked as `•`"; D116 says
"those numbers masked (`••••••`)". So a criterion passes on any mask of bullets that leaves no digit of
the number, and doesn't depend on the bullet count.

AC-48 Chosen first, still
      Given  an unchosen package (`com.example.notchosen`)
      When   it posts a doubtful OTP ("Paid RM12.90 at KEDAI 2241. Never share your TAC.") and a clear OTP
      Then   no outbox row, no drop-log entry, nothing reaches the page (gate says NOT_CHOSEN for both)
AC-48s When  the same doubtful text comes from a chosen app
      Then   it is stored (masked, AC-50); the mask never turns a chosen app's kept notification into a drop
      Spec   §6.2 *The chosen list … is checked first*; D86; CLAUDE.md *listener discards apps … in native code*

AC-49 A clear OTP is still dropped, on the raw text
      Given  a chosen app
      When   it posts "Your TAC is 482913 for a transfer of RM50.00 to TAN WEI MING."
      Then   no outbox row; one drop-log entry (time and app, no text); the mask never runs first and lets
             it through as a masked event
AC-49s When  a payment carries only a footer ("Never share your TAC") and no run of 4+ digits
      Then   it is stored with title, text and big text code-point identical to what was posted, maybe_otp 0
      Spec   §6.2 *How the OTP/TAC filter decides*; D115; D116 ("the native filter still drops a clear OTP/TAC")

AC-50 A doubtful OTP is stored masked and marked
      Given  a chosen app's notification the filter keeps
      When   it has an OTP word anywhere (strong or weak list, advice included) and a run of 4+ digits that
             isn't an amount, in the title, the text or the big text
      Then   every such run is stored as bullets (no digit of it left), in whichever field it sits, and
             maybe_otp = 1
AC-50s When  the same text has no OTP word
      Then   it is stored unmasked, maybe_otp 0 (a store number or reference with no OTP word stays)
      Spec   §6.2 *What the filter keeps but might hold a code is masked*; D116

AC-51 Amounts are left
      Given  a masked event (AC-50)
      Then   these stay exactly: `RM12.90`, `RM 1,234.50`, `RM1234.50`, `RM2500`, `MYR 2500`, `RM 2,500`,
             a bare decimal `1,234.56`, `-RM1,250.00`
AC-51s Then  a 4+ digit run that is neither a decimal amount nor after a currency is masked, even right after
             an amount (`RM12.90 482913` masks `482913`); `Ref 2500` masks `2500`
      Spec   §6.2 ("amounts (a decimal amount, or a number after a currency) are left")

AC-52 A code in disguise is masked too
      Given  a masked event's code written as `482 913`, `48 29 13`, `4 8 2 9 1 3`, `482-913`, `OTP482913`,
             `A-482913`, `48​29​13` (zero-width), `482 913` (no-break space), `482 913`
             (thin space), and fullwidth `４８２９１３`
      Then   no 4 or more of the code's digits survive in the stored text, in order (no `4829`, `8291`, `2913`
             and no `482`+`913` left readable across a separator)
AC-52s Then  a short number with no partner stays (`Table 12`, `No. 123`, `9:47 PM`)
      Spec   D116 ("so no possible code is ever stored"); §6.2 (a code "maybe grouped (one digit at a time too)
             or prefixed")

AC-53 Only the masked digits change
      Then   in a masked event, everything outside the masked numbers is code-point identical to what was
             posted: letters, punctuation, emoji, line breaks, no-break spaces, the amount
AC-53s Then  an unmasked event is code-point identical in all three fields, including emoji, U+00A0, U+200B,
             NFD accents, `\r\n` and trailing spaces; an absent field stays absent (null), not "" or "null"
      Spec   §6.2 *Raw text is stored first* ("Raw text is never changed, except a maybe OTP's masked digits")

AC-54 The dedupe key is taken from the masked text
      Then   the stored key equals the key computed over package, key, `when` and the masked fields, and
             differs from the key over the raw fields; two posts with the same package, key and `when` whose
             texts differ only in the masked number give one row
AC-54s When  the same masked notification is replayed (reconnect) → one row and the last-event time doesn't
             move; with a different `when` → two rows
      Spec   §6.2 ("Its dedupe key is taken from the masked text, so a code never reaches storage, even as a
             hash"); *Dedupe key*; D115; CLAUDE.md *Every input has a dedupe key*

AC-55 The code reaches no storage at all
      When   a doubtful OTP with code 482913 is stored
      Then   no table of the outbox (events, heartbeats/drop log, anything else) holds `482913` or the key
             computed from the raw text; no log line holds it
AC-55s Then  a masked event isn't logged as a drop (it wasn't dropped), and the last-event time moves
      Spec   D116; §6.2; CLAUDE.md *OTP/TAC … before anything is stored*

AC-56 What reaches the page
      Then   the bridge's list of events gives the masked text and `maybeOtp: true`; never the raw digits
AC-56s Then  a dropped OTP never reaches the page in any form
      Spec   §6.2; CLAUDE.md (OTP "before anything is stored or reaches JavaScript")

AC-57 *Captured on this phone* says so
      Then   a masked row shows its text with the bullets, and under it a muted line, exactly
             *Maybe a one-time code, so its numbers are hidden*
AC-57s Then  an unmasked row has no such line; the line is muted (not destructive or error colour) and the row
             is the same raw notification row (app and time, then title and text, selectable)
      Spec   §6.2 ("Captured on this phone says so under the row"); patterns.md §7 *Raw notification row*

AC-58 Share samples keeps the mask
      When   a masked row is ticked and shared
      Then   the shared text is the masked text, and says it's a maybe one-time code
AC-58s Then  an unmasked row is shared exactly as stored
      Spec   brief *Share samples*; D116

AC-59 The simulator walks the same path
      When   the dev panel posts a maybe-OTP, then posts it again
      Then   *Captured on this phone* gains one masked row with the muted line, and the replay adds nothing
AC-59s Then  the simulator's mask agrees with the native one on the same inputs (no code shown in the browser
             that the phone would hide, and the reverse)
      Spec   CLAUDE.md (*Native-only features … get a dev-only simulator panel, so flows can be walked*); D116

AC-60 The outbox upgrade (version 3) keeps what's there
      Given  a version-2 outbox with rows
      When   the app opens with version 3
      Then   `maybe_otp` exists, old rows read 0, no row is lost
AC-60s Then  a fresh install creates the column directly; a version-1 outbox upgrades through both steps
      Spec   D116 (the handoff's "Outbox VERSION 3 adds the column"); §18 (the outbox survives)

AC-61 A screen never claims a hidden number that wasn't hidden
      When   a kept notification has an OTP word and no 4+ digit run except an amount (`RM1,234.50 … TAC`)
      Then   its text is stored unchanged; the screen shows the muted line only if something was masked
AC-61s Then  when something was masked, the line always shows
      Spec   §6.2 (amounts are left); patterns.md §7 (the line says "its numbers are hidden")

AC-62 Words that only look like OTP words
      When   a payment has no OTP word but a substring of one (`TACO HOUSE 2241`, `SPINNEYS 1234`,
             `KODAK 5521`, `postcode 50450`, `CODEX 2026`)
      Then   it is stored unmasked, maybe_otp 0 (raw text is never changed otherwise)
AC-62s When  an OTP word is glued or cased oddly (`otp`, `Tac:`, `[TAC]`, `OTP:482913`, `T A C`)
      Then   it still counts (the event is dropped, or stored masked)
      Spec   §6.2 *Raw text is stored first*; D116

AC-63 An OTP in words the lists might not hold is never stored raw
      When   a chosen app posts a code in wording a Malaysian bank could use: `Your passcode is 482913`,
             `Kata laluan sekali guna anda: 482913`, `Nombor pengesahan anda ialah 482913`,
             `Your one-time PIN: 482913`, `Your security code: 482913`, `Your 2FA code is 482913`,
             `Gunakan 482913 untuk log masuk`, `您的验证码是482913`
      Then   it is dropped, or stored masked; never stored with `482913` readable
AC-63s Then  each drop is logged (time and app only)
      Spec   CLAUDE.md *OTP/TAC messages … discarded in native code*; D116 ("so no possible code is ever
             stored"); §6.2 (filter in English and Malay; "in doubt it drops")

AC-64 Hostile sizes don't stall the listener
      When   the text is 64 KB, or 20 000 single digits separated by spaces next to "TAC", or 5 000 grouped
             numbers
      Then   the gate, filter, mask and key finish in under 250 ms each on the VM, and the result obeys AC-50/52
AC-64s Then  an empty title and text with only a big text is handled like any other field (no crash)
      Spec   §6.2 *Background execution* (the listener stores natively; an ANR loses capture)

AC-65 Done-when 4, with the mask
      Then   the shell's emulator tests pass on CI for HEAD: an unchosen app never stored, an OTP dropped, a
             reconnect replay adds nothing, a doubtful OTP stored masked with its code nowhere in the outbox
AC-65s Then  the test that claims "nowhere in the outbox" reads every table, not only `events.text`
      Spec   brief *Done when* 4; D116
