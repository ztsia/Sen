# Cloud sessions

This doc covers four things about a Claude Code cloud session for this repo:
- what it has
- what it can reach
- how its environment is set up
- what it must never hold

**These are facts. Measure them wherever possible.** They were researched on 5 Oct 2026 from the
Claude Code docs. Sessions fill in the table in §5 as they measure things.

## 1. What a session is

- **A fresh VM per session.** Ubuntu 24.04 x86_64, about 4 vCPUs, 16 GB RAM and 30 GB disk. The repo
  is cloned in, and nothing from the owner's machine carries over.
- **Preinstalled:**
  - Node 20, 21 and 22 (22 is on `PATH`), with npm, pnpm and yarn
  - Java 21 with Gradle
  - Docker and docker compose
  - PostgreSQL 16 (installed, but not running until started)
  - Python, git and `gh`
  - Chromium. GCO_events measured Chromium 141 there in September 2026. **Never run
    `playwright install`**: pin `@playwright/test` to the preinstalled browser instead.
- **What it loads from the repo:** `CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, the hooks in
  `.claude/settings.json`, and `.mcp.json`. It also loads skills enabled on the owner's claude.ai
  account, and claude.ai connectors.
- **What it doesn't load:** plugins enabled in `.claude/settings.json`. That's why the stack's skills
  are added to `.claude/skills/` with `npx skills add` (`CLAUDE.md`) rather than installed as a plugin.
- **An idle VM pauses after a few minutes and can be reclaimed.** Commit and push work in progress
  often. Background processes, such as a dev server or a tunnel, don't survive a pause.
- **Command timeouts:** 2 minutes by default, up to 10. After that a command moves to the background
  for up to 30 more minutes.
- **Startup:** `scripts/session-start.sh` runs on every start and resume (a SessionStart hook). It
  points the session at unread handoffs and, once the app exists, installs packages and starts the
  local database.

## 2. The environment: paste this once

Create it at claude.ai/code: environment selector → *Add environment*. Name it `finance-tracker`.

**Network access: Custom.** Tick *Also include default list of common package managers*, then add:

```text
neon.com
better-auth.com
ai-sdk.dev
ui.shadcn.com
tweakcn.com
capacitorjs.com
capawesome.io
vercel.com
```

- All eight are for documentation only. The web app deploys through Vercel's GitHub integration, and
  the shell builds on GitHub Actions, so no session needs to reach either service directly.
- If an environment was created before 5 Oct with the Expo hosts (`expo.dev`, `*.expo.dev`,
  `exp.host`, `reactnativereusables.com`, `docs.uniwind.dev`), remove them: the app no longer uses
  Expo (D42).
- **Never add the production database's host** (`*.neon.tech`). No cloud session may reach it (§3).

**Environment variables:** none. The Expo token an earlier version of this doc asked for is no longer
needed (D42); delete it if it's set.

**Setup script:** paste the contents of `scripts/cloud-setup.sh`. It installs global tools once. If
it finishes in under about 5 minutes, the environment is snapshotted, so later sessions start with
those tools already installed.

## 3. What a session must never hold

| Credential | Why not |
|---|---|
| The production database URL (Neon) | Its owner role bypasses RLS. A test run pointed at production is the one mistake that can't be undone |
| R2 access keys | They can read and write every receipt image |
| The production Vertex AI key | It costs money. Only the receipt benchmark gets a key: a separate one with a spending cap, added for that session and removed afterwards |
| Anything in `private/` | Real financial data stays on the owner's machine and in the chat |
| Any ESS password, session cookie, token, real address or recipe (D96, D103, D105) | A work credential, and the address names the employer. ESS is driven only from the owner's phone, where the password is saved; sessions build against a made-up ESS and recipe. Only a local session on the owner's laptop may watch ESS, writing to `private/` (D110) |
| The scheduler's secret, the relay's signing key, and `sen_ops`' secrets (D85, D99) | They can start jobs for everyone, or read the backup |
| Real claim values or the employee handbook (D10, D95) | Real values never enter a build session; the handbook never enters any AI's context |

Tests run against a **local** Postgres inside the VM, never against Neon.

## 4. Seeing the app without an emulator

The Android emulator needs hardware virtualisation (KVM) to run at a usable speed, and the Claude
Code docs don't list it, so assume there's no emulator. The UI is a web app (D42), and Android's
WebView is Chromium, so most of the app can be seen without one. These are the checks, cheapest
first:

| Check | Runs where | Catches |
|---|---|---|
| Unit and SQL tests | In the session | Logic, data, RLS |
| Component tests (React Testing Library) | In the session | Screen behaviour, without pixels |
| The web app + Playwright at a phone viewport | In the session | Whole journeys on the real UI, with a screenshot per step. Native-only parts use the simulator panel |
| Kotlin unit tests | In the session for the template engine, kept in a pure Kotlin module that needs no Android SDK (Java 21 and Gradle are preinstalled); anything that needs Android, on GitHub Actions | The template engine and the rest of the capture path |
| An Android emulator on GitHub Actions | GitHub's runners | Native journeys: the listener, notification buttons, widgets. Run at the end of a phase |
| The owner's phone | The release shell from GitHub Actions, loading production; a debug shell for a preview (`spec_v2.md` §17) | Real device, real notifications |

## 5. Verified

Sessions fill this in when they measure. Never assume a result.

| Question | Result | Measured |
|---|---|---|
| Is there hardware virtualisation? (`ls /dev/kvm`) | **No.** `/dev/kvm` doesn't exist, so no Android emulator runs in a session | 8 Oct 2026, B01 |
| Does a local Postgres start in the session (Docker, or a package install)? | | |
| What Chromium version is installed, and which `@playwright/test` version matches it? | **Chromium 141.0.7390.37** (`/opt/pw-browsers/chromium-1194`), which is **`@playwright/test` 1.56.1**, pinned in `apps/web/package.json`. Node 22.22, pnpm 10.28 | 8 Oct 2026, B01 |
| Can a session build the Capacitor shell's APK itself, or only GitHub Actions? (The Android SDK isn't preinstalled) | **Yes, in the session**, once the SDK is installed: `dl.google.com` answers, so the command-line tools unzip into `/opt/android-sdk` and `sdkmanager` adds `platform-tools`, `platforms;android-36` and `build-tools;36.0.0` (AGP fetches `build-tools;35.0.0` itself), about 2 minutes. Then `npx cap sync android` and `gradle assembleRelease assembleDebug assembleE2e` build all three APKs with the preinstalled Gradle 8.14.3 and Java 21. Write `sdk.dir=/opt/android-sdk` in `apps/shell/android/local.properties` (gitignored). **Maven Central rate-limits the VM** (HTTP 429 from `repo.maven.apache.org` and, under Gradle's load, `repo1.maven.org`); Google's mirror `maven-central.storage-download.googleapis.com/maven2/` answers, through a session-only init script in `~/.gradle/init.d/` that swaps the URL. There's still no emulator here (no KVM) | 9 Oct 2026, B02 |
| What can a session reach? | npm, and GitHub through git (`git clone`, `git ls-remote`), so `npx skills add` works; `github.com` pages over HTTPS answer 403. `ui.shadcn.com` answers, so the shadcn CLI works, but it writes `import { cn } from "cn"` and adds a stray `cn` package: fix the import to `@/lib/utils` and remove the package after every `shadcn add` | 8 Oct 2026, B01 |
| How smoothly does each look draw? (`apps/web/scripts/frame-times.mjs`, the gallery's top screen: four large figures, 390×844, CPU slowed 4×) | Minted and Instrument: 60 fps. Line: 60 fps median, short stalls while its pen writes. Firefly: about 30 fps. **Mercury and Copper: about 15 fps** here, where WebGL runs on SwiftShader, a software renderer; without the CPU slowdown, Mercury 60 fps and Copper 30. A second VM, the same day, measured slower: Firefly 15–20 fps, **Mercury 12 and Copper 10** (100 ms median), and without the slowdown Mercury 20 and Copper 15–20, on 4 cores. So a cloud VM's numbers vary from one to the next; read them as an upper bound and compare looks within one run. A phone's GPU should do better, and Home shows one figure, not four: the phone check in B01's PR says | 8 Oct 2026, B01 |
| Does an Android emulator run on GitHub's standard runners for this repo? | **Yes.** `ubuntu-latest` with KVM switched on by a udev rule, and `reactivecircus/android-emulator-runner@v2` at API 34 (`google_apis`, x86_64): it boots and runs the shell's 7 emulator tests in about 6 minutes of the job (`.github/workflows/shell.yml`, run 37881271168) | 9 Oct 2026, B02 |
