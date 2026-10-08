# B02 · The shell and the listener

**Stage 1 · Frame** · after: B01 · next: B03

## Goal

The Android shell runs on the owner's Xiaomi and captures notifications from the apps the owner
chose, stored only on the phone. This is P1's spike, but built as the real shell and the real capture
path, not thrown away.

**The soak starts here:** a week of real capture runs on the phone while B03 to B06 are built
(decided 8 Oct: the next slice doesn't wait for it). The soak's answers are needed before B09.

## Read first

- `spec_v2.md`:
  - §5: *Three places*, the table rows for capture and scanning, and *The shell owns the session*
    (read now, built in B07)
  - §5.1: *App*, *Builds and updates* and *Native pieces*
  - §6.2, all of it, apart from the template details
  - §9.5, steps 2–4
  - §17: *The shell trusts only our own site*, and the debug build
  - §21: Q2, Q3, Q26 and Q27
- Decisions: D42, D77 (launcher icon), D86, D101 (the island).
- Docs:
  - `docs/local.md`: the island and launcher-icon tests
  - `docs/notifications.md`, all of it
  - `docs/cloud.md` §4 and §5
- Skills: `capawesome-team/skills`, and `uiux` for the few web screens.

## Builds

### The shell
- **A Capacitor Android app.** The application id and name are recorded in `CLAUDE.md`.
- **It loads the web app from its Vercel address and opens offline,** with a service worker caching
  the app (§5.1). Decide between this and bundling the web app with live updates, and record the
  decision. Either way, the app opens in airplane mode.
- **Two builds (§17):**
  - **release:** loads production, capture on
  - **debug:** loads one fixed preview alias, capture off, with its own application id so both can
    be installed

  Decide how the alias follows the branch under review without changing per branch (for example, a
  Vercel domain assigned to a `review` branch), and write the steps into `docs/local.md`.
- **The native bridge answers only our origin.** `allowNavigation` stays empty, and other origins
  are refused with a test.
- `openInBrowser(url)` sends external links to the default browser (`ACTION_VIEW`), never the
  WebView.
- **Android chrome:** back, following `patterns.md` §6; the status bar following light and dark;
  edge-to-edge drawing with safe-area insets; haptics; a splash screen.
- **GitHub Actions** builds both APKs on changes under the shell. The release is signed with a key
  held only as an Actions secret, and the owner gets a download link.

### Capture (our own Kotlin plugin, §5.1)
- **The listener** is a `NotificationListenerService`. Conversation notifications are refused in its
  manifest, and group summaries are dropped.
- **The chosen-apps check runs first:** a notification from any other package is dropped before
  anything is stored or logged, and no record of it is kept.
- **The OTP and TAC filter** runs next, in English and Malay. Collect its keyword list, test it, and
  keep it in the repo.
- **Raw events go to a SQLite outbox:** package, channel, key, `postTime`, `when`, title, text and
  big text, with the dedupe key = hash(package + key + `when` + text), `UNIQUE`.
- **A local heartbeat:** listener connected, and when the last event arrived.
- **A channel drop list.** It starts empty; B10 fills it.

### Choosing apps (D86)
- **A curated list of Malaysian banks and e-wallets** as a data file: package, label, and the
  account names it suggests (for B08).
- **Installed apps are found** through `<queries>` for launcher intents, never
  `QUERY_ALL_PACKAGES`. *More* searches every launchable app.
- **Some apps can never be chosen:** the default SMS app, `CATEGORY_SOCIAL` apps, and a denylist
  (WhatsApp, Telegram, Gmail, Messenger and others). The classifier is unit-tested.
- **The picker's own wording** says plainly what Sen stores and that a new wording goes to Google
  once, with digits masked (§6.2).
- **Notification access**, plus the restricted-settings route: open the app's info page for
  *Allow restricted settings* (§6.2).
- ***Keep Sen running*:** the *ignore battery optimisations* dialog first, then that brand's steps,
  picked by `Build.MANUFACTURER` from a data file generated from dontkillmyapp when the shell is
  built. Only Xiaomi is tested.

  These steps are screens in the web app that call the bridge. B08 puts them into `first-run`;
  for now they're reached from Settings → *Capture*.

### For the soak only
- ***Captured on this phone***, under Settings → *Capture*: the outbox's events, newest first, with
  their raw text. It shows real data from the phone, never synced. B07 replaces it.
- ***Share samples***: the chosen events as text through the share sheet, so the owner can paste
  them into a session, which anonymises them into `notifications.md`.
- **Hidden test buttons** (a long-press on the version in Settings → Account):
  - a test category prompt with three action buttons
  - *Test island*: an Android 16 Live Update with a countdown
  - *Switch icon*: two activity-aliases, toggled

### For later slices
- **A pure Kotlin module** with Gradle and no Android SDK, testable in a session, ready for B09's
  template engine. Prove it with one test.

## Leaves for later

- Sync, the session in the shell, and the heartbeat sent to the server: B07.
- Reading notifications with templates: B09 and B10. Real prompts: B12.
- Push: B06. Scanner: B15.

## Done when

1. CI builds both APKs; the release is signed; the owner installs it from a link.
2. The release opens production in airplane mode.
3. A page from another origin can't call the bridge (test).
4. On GitHub Actions' emulator, a test app posts notifications:
   - an unchosen app's notification never reaches storage
   - an OTP is dropped
   - a listener reconnect that replays notifications still showing adds no duplicates
5. The picker's classifier test passes: SMS, social and denylisted apps can't be chosen.
6. **On the Xiaomi:** a week of real events from the chosen apps only, through at least one reboot
   and one idle day, as the heartbeat timestamps show.
7. Answered and written into `spec_v2.md` §21 and `docs/notifications.md`:
   - Q2: package names
   - Q3: survival
   - Q26: Ryt's duplicate gap
   - Q27: the island
   - the launcher-icon test (D77)
   - whether Android 16 still delivers payment notifications in full
8. New samples are anonymised into `docs/notifications.md`.
9. `docs/cloud.md` §5 records whether a session can build the APK itself, and whether the emulator
   runs on GitHub's runners.

## On your phone

- [ ] Install the release from the link. Choose your apps, grant access (with *Allow restricted
      settings* if it's greyed out), and do *Keep Sen running*.
- [ ] Pay normally for a week. Open *Captured on this phone* now and then.
- [ ] Reboot once. Leave the phone alone for a day once.
- [ ] Run the three hidden tests, and say what you saw (`docs/local.md` lists what to check).
- [ ] *Share samples* into a session for anonymising, including Ryt's duplicates with their times.

## Needs from you first

- The release signing key as an Actions secret. This slice writes the phone-friendly steps, for
  example a one-off workflow that makes the key and shows you where to paste it.

## Notes

- No real notification text goes into the repo, tests or logs; fixtures are anonymised (`CLAUDE.md`).
- Keep native code to what must run with the app closed (D42). The screens here are the web app's.
- **The bridge B01 calls** (`apps/web/src/lib/haptics.ts`, `open-in-browser.ts`): the web app looks
  for `window.SenShell` and calls `SenShell.haptic('light')` on a long-press and a commit, and
  `SenShell.openInBrowser(url)` for every external link (https only). Implement both on the bridge,
  answering only our origin; without them the web app falls back to `navigator.vibrate` and a new tab.
- **Back and safe areas:** B01 gives each sheet a history step, so back closes it in a browser. The
  shell's back button should do the same through history, and set `--safe-area-inset-*`, which the
  tab bar and sheets already read (`apps/web/src/styles/frame.css`).
- **Mercury and Copper on the phone:** B01 measured them at about 15 fps in a session, on a software
  WebGL renderer (`docs/cloud.md` §5). Check them on the Xiaomi in the debug shell.
