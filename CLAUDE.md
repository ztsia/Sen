# CLAUDE.md

A personal finance tracker, made in Malaysia for its owner. It's an Android app that:
- turns the payment notifications from the bank and e-wallet apps each person chooses (the owner's: Touch 'n Go, Ryt Bank, Public Bank and Grab) into transactions (D86)
- keeps account balances
- reads receipts, scanned or forwarded by email (D51, D56)
- has an AI agent that watches the money

It's called **Sen** (D48). It's for the owner, and by invitation a few friends and family, each seeing only their own data (D52). Not commercial: nobody pays inside it (D98). Its source is public under AGPL-3.0 (D85), published from a clean snapshot on 8 Oct 2026. The design history before that stays in the owner's private archive.

## Read these first

| File | What it is | Treat it as |
|---|---|---|
| `spec_v2.md` | The system | The contract, **under review** in the design track below. If code disagrees with it, the code is wrong |
| `docs/decisions.md` | Decisions made with the owner, numbered | Settled. Don't reopen one unless the owner does |
| `docs/flows.md`, `docs/screens.md`, `docs/ui/patterns.md` | Journeys, screen map, shared UI patterns, written by `S2` | The UX contract. Journeys and screens are approved (6 Oct), with a clickable wireframe in `docs/ui/wireframe.html`. Patterns are written for six looks (6 Oct), and their defaults confirmed (D83, 7 Oct) |
| `docs/modules.md`, `docs/briefs/` | The slice map: forty slices in nine stages, built one at a time, and one brief per slice. Written by `S3` (D111) | Your branch's boundary. A build session starts from its brief |
| `docs/notifications.md` | What each bank app's notifications look like, anonymised | The parsers' source. Add to it whenever a new format turns up |
| `docs/cloud.md` | What a cloud session has, can reach, and must never hold | Measured facts. Update it when you measure something new |
| `qa/escapes.md` | Every bug the owner found by hand that QA had passed, why it was missed, its pin and the question it added (D137) | Add an entry before fixing one |
| `docs/local.md` | What only the owner, or a machine with a device, can do | A queue. Add to it instead of attempting these |
| `docs/handoff.md` | The one handoff, from the last session to you | Read it first. Rewrite it before you end |
| `docs/workflow/` | Sen's additions to the `workflow` plugin's skills: `qa.md`, `database.md`, `uiux.md`, `brief.md` | Wins over the plugin's skill where they differ |

## Where the build is

**Design came first, deliberately** (D7: the owner's previous app worked feature by feature but
didn't hang together). The design track is done: the spec grilled and decided (`S1`), journeys,
screens, patterns and six looks (`S2`, D75–D84), and the slice map, forty slices in nine stages with
a brief each (`S3`, D111). The spec's later revisions are D85–D110.

**Built:** B01 (design system and the six looks), B02 (the shell and the listener; its week on the
owner's phone is still to run), B03 and B04 (the walking skeleton, its review and the redesign,
D130), B05 (the server, database and sign-in; then QA tooling and Feel, D139, D140). **Next:** B06.
Each slice waits only for the owner's merge; `docs/handoff.md` says where things stand now.


## Non-negotiables

- **Money is integer sen, never a float.** That means `BIGINT` in Postgres, integers in TypeScript,
  and user input parsed as text into sen. `0.1 + 0.2` must be impossible anywhere money flows.
- **Row-level security on every table, from its first migration**, keyed on `user_id`. The API runs each request as the signed-in user through a database role that can't bypass RLS, and the admin never reads anyone's money (D52).
- **Secrets never ship in the app.** No cloud session ever holds production credentials
  (`docs/cloud.md` §3).
- **Real financial data never enters the repo.** That covers notification text, receipts,
  statements, balances and account numbers. Test fixtures are anonymised copies; the real ones live
  in the gitignored `private/`.
- **The employee handbook never enters the repo or any AI's context**, and **real claim values never
  enter the repo, test fixtures or a build session's context.** The handbook forbids copying, storing
  or transmitting it. Claim schemes are entered in the app's Settings, in the owner's own words, and
  inside the app Sen may see what the owner typed (D95). A local session capturing ESS may see them too, and
  writes only to `private/` (D110).
- **Models draft, the owner confirms, code computes.** No number a model produces is stored or shown
  as fact. The agent only states figures its tools returned or the person typed, and a `calc` tool
  does its arithmetic (D108). One draft acts before it's confirmed: a
  template for new notification wording books its payments at once, marked, and *No* undoes them,
  because code still reads every amount from the raw text (D87).
- **A prediction never shares a table with a fact.** That applies to forecasts, estimates and
  projections.
- **Every input has a dedupe key.** A retried sync, a re-posted notification or a file shared twice
  is a no-op.
- **The notification listener discards apps the person hasn't chosen, and OTP/TAC messages, in native
  code**, before anything is stored or reaches JavaScript. Messaging, SMS, email and social apps can
  never be chosen (D86).
- **One navigation and one set of UI patterns** (`docs/ui/patterns.md`). No screen invents its own
  list row, form, sheet, or empty, loading or error state.

## Stack

| Layer | Choice |
|---|---|
| App | A **Capacitor** shell for Android around a **web app** (React, TypeScript, Vite), hosted on Vercel (D42) |
| Native pieces | Kotlin, in the shell: the notification listener, parsing, the category prompt, the outbox and sync, the scanner, share-to-app, push, widgets |
| UI | shadcn/ui on Tailwind v4, with this app's own design (D43) |
| Client state | TanStack Query and Zustand |
| Offline queue | The shell's SQLite outbox |
| Backend | One Hono API on Vercel Functions, Neon Postgres (Drizzle), Better Auth with emailed codes (D54) |
| Schedules and realtime | One small Cloudflare Worker: cron triggers that call `/jobs/tick`, and a relay that pushes "something changed" hints, never data (D99, D100) |
| Storage | Cloudflare R2 for receipt images |
| AI | Claude through Anthropic's own API and Gemini through Vertex AI (D55, D120), both called through the Vercel AI SDK. Models are provisional until each phase tests them on its golden set in `evals/`, named only in `ai/models.ts` (D94) |
| Agent | Our own small loop in Claude Code's shape: main prompt, skills, tools, subagents (D53), engineered in `spec_v2.md` §12.5 (D94) |

The full table is in `spec_v2.md` §5.1.

**The web app is the real UI.** Android's WebView is Chromium, so what a cloud session tests in
Chromium at a phone viewport is what runs on the phone (`docs/cloud.md` §4). Native-only features
(the notification listener, the scanner, notification buttons, widgets) get a dev-only simulator
panel, so flows can be walked in a browser.

**Two rules the shell imposes:**
- **Nothing in the web app runs while the app is closed.** Anything that must (capture, the category
  prompt, sync) lives in Kotlin.
- **The shell loads only our own site.** No third-party scripts, and the native bridge answers no
  other origin (`spec_v2.md` §17).

## The owner

Works from a phone through cloud sessions, rarely at a laptop. A session on the laptop does
everything it can first and reports once, with only what needs the owner. Nothing is deployed by
hand: a merge to `main` is the only step (D122).

## Commands

From the repo root (Node 22, pnpm 10; `scripts/session-setup.sh` installs packages in a cloud session):

| Command | What it does |
|---|---|
| `pnpm install` | Install everything |
| `pnpm dev` | The web app at `localhost:5173`, with the dev panel; `/dev/gallery` shows every building block; `?scenario=` and `?state=` pick the made-up scenario and a screen state on load |
| `pnpm build` | The web app's production build, as Vercel runs it. A build is production, without dev tools, unless `SEN_ENV=preview` or Vercel's `VERCEL_ENV=preview` says otherwise |
| `pnpm test` | Unit tests: money, the looks' ports, the hygiene check, the no-float rule, the web app's pure parts |
| `pnpm e2e` | Playwright on a preview build and a production build, at a phone viewport, under the real CSP: journeys once in Minted light, and every screen in the catalogue (`e2e/catalogue.ts`) in the looks `E2E_LOOKS` names, with its tree and the scripted checks |
| `pnpm typecheck`, `pnpm lint`, `pnpm format` | TypeScript strict, ESLint (with the no-float rule), Prettier |
| `pnpm looks` | Regenerates `apps/web/src/styles/looks.gen.css` from `docs/ui/directions/assets/`; CI fails if it's stale |
| `pnpm --filter @sen/web e2e:trees` | Re-records each screen's accessibility tree in `apps/web/e2e/trees/` after a screen changes; CI fails on a stale one |
| `node scripts/qa-diff.mjs` | QA's diff against `main` (D137): trees, pixels in all twelve look-and-mode pairs, and the scripted checks, into `qa-artifacts/<branch>/diff/index.md`; then the metrics (D139): each screen, journey tap, API route and the build, on the branch and on `main`, judged by `qa/limits.ts` (`--metrics-only` for just those) |
| `node scripts/mutants.mjs` | The breakage checks in `qa/mutants.ts`, each made in a worktree of HEAD; a mutant its suite doesn't catch is a finding (D139) |
| `pnpm --filter @sen/web e2e:lived` | The lived-in journeys: across a deploy, resume, offline, a slow network, 200% text, 360×640, a year of data (`?scenario=year`) |
| `node scripts/live-metrics.mjs --url <origin>` | A deployed preview's server timings (the `live-metrics` workflow runs it on every preview); production gets only the signed-out part |
| `pnpm hygiene` | The repo hygiene check: tracked `private/` paths, and the `DENYLIST` strings if set |
| `scripts/local-db.sh start\|stop\|reset` | The local Postgres 16 with pgTAP (started by the session hook): `sen_dev` and `sen_test`, never Neon (`docs/cloud.md` §5) |
| `pnpm test:db` | A fresh `sen_test`, every migration, pgTAP (RLS for two people over every table, the catalogue check), then the API's tests on it, and the route sweep: every route in `apps/api/src/routes.table.ts` given the same bad requests. With `QA_METRICS=<dir>`, each request's `Server-Timing` is recorded. One at a time: it drops `sen_test` |
| `pnpm --filter @sen/api dev` | The API on Node at `127.0.0.1:8787/api`, on `sen_dev`; `SEN_BACKEND=api pnpm dev` runs the web app against it (sign in as `weiming@example.com`, code `123456`). If `sen_dev` isn't migrated and seeded, run the preview's deploy step on it from `apps/web`: `VERCEL=1 VERCEL_ENV=preview DATABASE_URL_UNPOOLED=postgres://sen_owner@127.0.0.1:5432/sen_dev BETTER_AUTH_SECRET=<48 characters> pnpm exec tsx scripts/db-deploy.ts`, then delete `public/db-deploy.txt` |
| `pnpm --filter @sen/web e2e:server` | The sign-in journey in Chromium against the local API and `sen_test` (after `pnpm test:db`) |
| `gradle -p apps/shell/core test` | The capture core's Kotlin tests; needs no Android SDK |
| `bash scripts/android-sdk.sh` | Installs the Android SDK in a cloud session (about 2 minutes), to build the shell's APKs there: then `pnpm --filter @sen/shell sync` and `gradle assembleDebug` in `apps/shell/android` |
| `node apps/shell/scripts/icons.mjs` | Renders the launcher and notification icons from the looks' SVGs into the Android resources |
| `node apps/web/scripts/frame-times.mjs` | Each look's frame times at 390×844 with the CPU slowed 4×, against a running `vite preview` |

QA's database is the local Postgres: `pnpm test:db` migrates `sen_test`; a preview's is Neon's
`sen-preview`, seeded with Wei Ming (`docs/local.md`).

**Ports:** two end-to-end runs never overlap, and nor do two `pnpm test:db` (each drops `sen_test`).
A brief for agents running at once gives each its own ports (main e2e 4173/4174, `qa-diff`
4175/4176, `e2e:lived` 4177/4178, `e2e:server` 4179 with the API on 8788, the dev API 8787) and says
who holds the database.

## Layout

| Path | What it holds |
|---|---|
| `apps/web/` | The web app: Vite, React, TanStack Router, Tailwind v4 and shadcn/ui. `src/components/ui/` is shadcn's, customised in place; `src/blocks/` the building blocks of `patterns.md` §7; `src/frame/` the tab bar, Sen's button and the shell of every screen; `src/screens/registry.ts` every screen id, `skeleton` or `real`, and `src/screens/skeleton.ts` the walking skeleton's screens, shown in previews only; `src/data/` the one backend interface (`backend.ts`), a query hook per screen (`hooks.ts`) and the skeleton's fake, with Wei Ming's month (`fake/scenario.ts`) and its edge states (`fake/variants.ts`); `src/dev/` the dev panel and gallery; `e2e/` Playwright |
| `packages/core/` | Pure TypeScript shared by the app, the API and the worker: the money module, pay cycles and KL days (`cycles.ts`), and the shared types with zod: §15's rows (`schema.ts`), each screen's read shape (`views.ts`) and every write (`commands.ts`). The template engine later |
| `packages/looks/` | The six looks as `DIR` modules, ported from `docs/ui/directions/src/`, each loaded only when shown |
| `apps/api/` | The Hono API (B05), at `/api` on the web app's origin, bundled into Vercel's Build Output by `apps/web/scripts/vercel-output.mjs` |
| `packages/db/` | Drizzle's schema, migrations, RLS and grants, the deploy step and the pgTAP tests (its README) |
| `apps/shell/` | The Capacitor shell for Android (B02): application id **`io.github.ztsia.sen`**, name **Sen** (`.debug`, *Sen review*, for the review build). `android/` is the app, with our Kotlin in `app/src/main/java/io/github/ztsia/sen/` (the listener, the outbox, the bridge's two plugins `SenShell` and `SenCapture`) and its emulator tests in `app/src/androidTest/`; `core/` the pure Kotlin capture core (no Android SDK); `data/` the curated apps and the brands' steps; `sites.json` the one address each build loads; `www/` the page shown when the site can't load |
| `apps/worker/` | The Cloudflare Worker: schedules and the realtime relay (B06) |
| `scripts/` | Sen's session setup hook, the hygiene check, QA's diff and breakage checks, the local database |

## Conventions

- Dates and month boundaries are always in `Asia/Kuala_Lumpur`. Store `timestamptz` in UTC.
- **Design pages and their assets:** every published page has its source here (`docs/ui/README.md`
  lists them with their links). Every custom asset a look uses (its icons, tab bar, marks, theme
  tokens and fonts) is a file in `docs/ui/directions/assets/`, written by `build.mjs` and
  `fonts.mjs`. Change the source, never the exported file.
- **shadcn, customised in place** in `apps/web/src/components/ui/`, with a `// Sen:` note on the
  first line saying what changed, so an upgrade (`shadcn add <x> --dry-run`) can keep it.
  `patterns.md`'s building blocks are compositions of them, in `apps/web/src/blocks/`.

## Skills

The `workflow` plugin brings `qa`, `uiux`, `database`, `llm`, `security` and `brief`, with Sen's
additions in `docs/workflow/`. Sen's own:

| Skill | Use it when |
|---|---|
| `dataviz` | Any chart, stat tile or chart colour. It comes from the owner's claude.ai account, not the repo |
| `frontend-design` | Narrowed when `S2` closed (D57, D84): only for a look's own drawing (its figure, strip, avatar, tab bar and reveal) or a new look for the pool. Every screen follows `docs/ui/patterns.md` and `uiux` instead |
| `supabase-postgres-best-practices`, `neon`, `neon-postgres` | General Postgres and Neon practice. Where they disagree with `database` (and `docs/workflow/database.md`) or D54–D55, ours win |

The stack's own skills came with `npx skills add` (B01): `shadcn`, `vercel-react-best-practices` and
`web-design-guidelines` (vercel-labs), and the `capacitor-*` skills (Capawesome). Where one disagrees
with `uiux`, `patterns.md` or a decision, ours win; a build session never stops to ask the questions
a skill says to ask.

## Overrides

- **The shadcn note** is `// Sen:`.
