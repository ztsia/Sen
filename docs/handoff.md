# Handoff

Rewritten 9 Oct 2026 by the session that built B02's code. The protocol is in `CLAUDE.md`, *Session
rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: code done, QA run, PR next.** What's
  left is the owner's: Vercel, the signing key, installing, and the week of soak (`docs/local.md`, *B02:
  the shell on your phone*). The next slice doesn't wait for the soak; its answers are needed before B09.
- **Verified in the session:** the core's Kotlin tests (22); all three APKs build here (release,
  debug, e2e) and the emulator tests compile; unit 141/141; Playwright, the slice's capture journeys,
  axe and 48 px targets in Minted and Copper, light and dark, and the service worker offline in
  production; typecheck, lint, format, hygiene.
- **Verified on GitHub Actions:** see the PR. The `Shell` workflow runs the core, both APKs and the
  emulator tests (Android 14, KVM).
- **Not verified yet:** anything on the phone; the debug build against a real review alias.

## Decided in B02, and why

- **D114:** the shell loads the web app from Vercel; a service worker precaches every built file (2.5 MB
  in a preview, fonts half of it) and takes over at the next launch. With nothing cached, the APK's own
  page says *Connect once*. **D115** (proposed, owner confirms on the PR): id `io.github.ztsia.sen`;
  ongoing notifications dropped natively; the review alias follows a `review` branch; the key is made
  by a one-off workflow; an hourly heartbeat through WorkManager.
- **Capacitor's own prefix check isn't trusted:** the shell keeps only the site's exact origin in
  the WebView (`Origin.same`, in the core) and sends other https links to the browser.
- **The address each build loads is in `apps/shell/sites.json`**, null until Vercel is linked; then the
  APK shows *This build has no site yet*. A session fills it from the owner's message.
- **Native code never trusts the page:** `setChosen` runs the classifier again; the chosen-apps check
  runs before a notification's extras are read; no notification text is logged in any build.
- **Capture's steps are screens** (`settings/capture/apps`, `access`, `running`), so B08's first run
  reuses them; `settings/capture/captured` is the soak's, and B07 replaces it.
- **In a browser,** development and previews simulate the shell (`dev/capture-sim.ts`, dev-panel
  buttons); production says capture lives in the Android app.

## Open with the owner

- **Vercel**, then the two addresses into a session; **the signing key** (one workflow run); install;
  the soak; the hidden tests (island, icon, prompt). All in `docs/local.md`.
- **Is the review alias behind Vercel's login?** If it is, the debug build can't log in inside the
  WebView. Then either previews drop Vercel Authentication, or the debug build carries a bypass the
  owner pastes once. Recommend the bypass. Decide when the owner reports it.
- D115 on the PR. Copper's overspent green (from B01) still stands.

## What to do first

- If the PR has red CI or comments, fix them on `B02/shell-listener`.
- When the owner sends the Vercel addresses: write them into `sites.json`, push; the Shell workflow
  builds APKs that load them.
- When soak samples arrive: anonymise into `docs/notifications.md`, answer §21 Q2, Q3, Q26, Q27 and
  the launcher test (D77), and record whether Android 16 still delivers payments in full.
- Otherwise: B03, on `B03/skeleton-tabs` from `main` once B02 is merged.

## Don't reopen

D1–D115, unless the owner raises one. In particular remote against bundled (D114), the slice order
(D111), no screen mockups (D84), one brief, one branch; shadcn first, customised in place.
