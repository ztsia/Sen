# The Android shell

The Capacitor shell around the web app, with capture in Kotlin (`spec_v2.md` §5, §6.2; brief
`docs/briefs/B02-shell-listener.md`). It loads the web app from Vercel and keeps it offline with a
service worker (D114).

| Path | What it holds |
|---|---|
| `android/` | The Android app. Our Kotlin is in `app/src/main/java/io/github/ztsia/sen/`: `capture/` (the listener, the outbox, the heartbeat, installed apps, Keep Sen running), `bridge/` (the `SenShell` and `SenCapture` plugins), `moments/` (the hidden tests). Emulator tests in `app/src/androidTest/` |
| `core/` | The capture core in pure Kotlin, with no Android SDK: the gate (chosen apps first), the OTP and TAC filter and its phrases, the classifier, the dedupe key. B09's template engine goes here |
| `data/` | `capture-apps.json`, the curated banks and e-wallets (checked on Play), and `keep-running.json`, each brand's steps, written by `scripts/keep-running.mjs` from dontkillmyapp.com |
| `sites.json` | The one address each build loads: release (production), debug (the review alias), e2e (the emulator's test server) |
| `www/` | The page inside the APK, shown when the site can't load and nothing is cached yet |
| `e2e/serve.mjs` | The emulator tests' site: the web build, served as Vercel serves it, with an offline switch |
| `scripts/` | `icons.mjs` (launcher and notification icons from the looks' SVGs), `keep-running.mjs` |

Three builds: **release** (production, capture on), **debug** (the review alias, capture off, its own
id, so both install), **e2e** (GitHub Actions' emulator only). The `Shell` workflow builds and tests them;
`Shell signing key` makes the release key once (`docs/local.md`).
