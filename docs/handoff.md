# Handoff

Rewritten 9 Oct 2026 by a short session that prepared B02 and stopped, at the owner's word, before
building anything. The protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it
before you end.

## Where things stand

- **B01 is merged** (ztsia/Sen PR #2). Its phone checks still wait on Vercel (below).
- **B02 · The shell and the listener: not started.** Its branch `B02/shell-listener` exists, from
  `main`, with one commit: the `capacitor-app-creation` skill, added with `npx skills add`, pinned in
  `skills-lock.json` and listed in `CLAUDE.md`. Continue on that branch; don't make another.
- The owner starts B02 in a later session.

## Decided on 9 Oct, and why

- **The shell loads the web app from Vercel, with a service worker for offline**, not a bundled app
  with live updates (the brief's choice; record it in `spec_v2.md` §5.1 when B02 starts). Why:
  - the debug shell loading one review alias (§17) works only this way
  - one deploy pipeline, not a second one for signed live-update bundles
  - the web app and the API share one origin: no CORS, first-party cookies, headers set the CSP
  - Capacitor 8 (checked in `@capacitor/android` 8.5.3's source) injects its bridge with
    `addDocumentStartJavaScript` restricted to the app URL's origin, and answers messages through
    `addWebMessageListener` with the allowed-origin rules, so the bridge works on pages the service
    worker serves offline, and only for our origin
  Covered in B02: a fallback page inside the APK (*Connect once to finish setting up Sen*) for a
  first launch offline or a lost cache; the shell reports its version over the bridge and the web
  app feature-detects methods, which are only ever added; a new version applies on the next launch,
  never mid-session; all six look chunks precached.
  **Test it first:** the airplane-mode check on GitHub Actions' emulator, serving the build on the
  runner and reaching it as `localhost` through `adb reverse` (a secure context, so no Vercel
  needed). If remote loading fails there, switch to bundling before building on it.
- **Vercel is needed only to finish B02** (the release must point at production, and the owner
  installs it), not to build or test it.
- **If the emulator doesn't run on GitHub's runners**, record it in `docs/cloud.md` §5 and make the
  emulator tests runnable from the owner's laptop with one command, listed in `docs/local.md`.
- **Skills live committed in `.claude/skills/`, never installed by a setup script**: pinned, loaded
  at startup, no network needed. No Android, Kotlin or Actions skill was worth adding (only
  third-party ones of unknown quality).

## Open with the owner

- **Nothing in `docs/local.md` is done yet**: Vercel, `DENYLIST`, secret scanning, the cloud
  environment, the ESS capture, the samples. None blocks starting B02.
- Copper's overspent figure is verdigris green against patterns.md §3; kept until the owner says.

## What to do first

- Start B02 from its brief, on `B02/shell-listener`. Measure first whether the Android SDK installs
  in a session (`docs/cloud.md` §5 asks), so the APK can be built here, not only in Actions.

## Don't reopen

D1–D113, unless the owner raises one. In particular the slice order (D111), no screen mockups (D84),
one brief, one branch; shadcn first, customised in place; and the remote-load decision above.
