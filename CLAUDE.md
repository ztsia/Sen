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
| `docs/local.md` | What only the owner, or a machine with a device, can do | A queue. Add to it instead of attempting these |
| `docs/handoff.md` | The one handoff, from the last session to you | Read it first. Rewrite it before you end |

### Session rotation

**`docs/handoff.md` is the one handoff.** Read it before anything else. **Every session rewrites it
before it ends**, whether its slice is finished or not, and whenever the owner says *hand off*. Never
append to it: it's the state now, not a log, and git keeps the old versions. Keep it under about 60
lines:
- where things stand: which slice is next or in progress, and on which branch (*One brief, one branch*)
- what was decided, and why
- what's open with the owner
- what to do first
- what must not be argued over again

Anything still true next week belongs in the spec, `docs/decisions.md`, `docs/cloud.md`,
`docs/local.md` or a brief instead.

**One brief, one branch.** Each slice is built on exactly one branch, named after its brief's file:
`B01/design-system` for `docs/briefs/B01-design-system.md`, `B07/sync` for `B07-sync.md`. The harness
assigns each cloud session a `claude/…` branch; ignore it, and work on the slice's branch instead:
1. Look for it: `git fetch origin && git ls-remote --heads origin '<branch>'`.
2. **If it exists, continue it.** Never create a second branch for the same brief:
   `git checkout -B <branch> origin/<branch>`, then read the handoff there.
3. **If it doesn't, create it from `main`:** `git checkout -b <branch> origin/main`, and push with
   `git push -u origin <branch>`.

A slice may span sessions, all on that one branch. Its PR is opened from it when the slice is done,
with the slice's label as its title (*B07 · Sync and the outbox*).

**When context runs high, or the owner says *hand off*, mid-slice:**
1. Commit and push.
2. Rewrite `docs/handoff.md` on the branch: what's done and verified, what's next, and anything
   decided. Push again.
3. End with one line for the owner to paste into the next session: *Continue B07 from branch
   `B07/sync`*.

`scripts/session-start.sh` also names the newest unmerged branch that changed the handoff, as a
safety net.

## Where the build is

**Nothing is built, deliberately.** The design track comes first. The owner's previous project
built module by module, and every feature worked but the app didn't hang together
(`docs/decisions.md` D7). The track has three steps:

1. **`S1`** (done, 5 Oct): grill `spec_v2.md` with the owner, section by section, and log the decisions.
2. **`S2`** (done, 7 Oct): user journeys, screen map and shared UI patterns. Journeys, screens and the wireframe are approved (6 Oct). The identity is settled (D75).
   Six looks, each a theme, an icon and Sen's avatar (D76), make a pool: four play each year, one a
   quarter (D77, D78). All six are built in `docs/ui/directions/`: Minted, Instrument, Firefly, Line,
   Mercury and Copper. Each draws its own tab bar on shared outlines (D80), and everything a look
   draws is saved in `docs/ui/directions/assets/`. Each look has its chart palette (one set of hues,
   tuned per look by `palette.mjs`) and icon tokens (D81), and `docs/ui/patterns.md` is written,
   with the reveal's shared frame (§9). Screens weren't mocked up: the walking skeleton is the
   mockup, in all six looks, and each look's reveal is built in code (D84).
   On 7 Oct the owner refined the spec once more (2.8, D85–D102): open source, capture from apps each
   person chooses, templates that start from nothing, Sen's structure, claims with Sen and a printable
   claim pack, ESS filed from the phone, AI credit, realtime, and the island.
   On 8 Oct, spec 2.9 (D103–D110): ESS becomes an adapter run from recipes, which signs in from the
   phone and fetches the payslip on payday; Sen's figures are traceable rather than clipped, skills
   run on Sen's model, and its chat takes files.
3. **`S3`** (done, 8 Oct): the slice map in `docs/modules.md`, with one brief per slice in
   `docs/briefs/` (D111). Forty slices in nine stages, built one at a time: the design system and
   looks, the shell and listener, the walking skeleton with the owner's review, then the server, and
   capture to ledger, after which daily use starts (B13). Claims by hand come before Sen; the ESS
   adapter after it.

**No app code until `S3`'s slice map is merged, and Sen is published** (`docs/local.md`). Then B01
starts in `ztsia/Sen`. The next slice waits only for the owner's merge.

**Built so far:** B01, the design system and the six looks (the workspace, money, the frame, the
building blocks, the dev panel and the gallery). In progress: B02, the shell and the listener, on
`B02/shell-listener`.

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

Works from a phone through cloud sessions, rarely at a laptop.

- **Design sessions (`S1`–`S3`) are conversations.** Ask, but batch questions, prefer multiple
  choice, keep messages short, and always recommend an answer.
- **Put what the owner must weigh inside the question's options.** Text written just before a
  question box can be hidden; the owner once missed a whole list that way.
- The owner reads every trade-off and often comes back with a better idea. Recommend clearly
  anyway.
- **Build sessions run unattended: never stop to ask.** Record the question in the handoff and keep
  going on everything else.
- Anything the owner must do by hand goes in `docs/local.md`, with steps a phone can follow.
- Commit and push work in progress often. An idle cloud VM can be reclaimed, and uncommitted work
  goes with it.

## Conventions

- One slice at a time, each ending in one PR to `main` titled with its label (*B07 · Sync and the
  outbox*). A slice may span sessions (*Session rotation*).
- Dates and month boundaries are always in `Asia/Kuala_Lumpur`. Store `timestamptz` in UTC.
- **Design pages and their assets live in the repo**, so nothing depends on a published page or a
  font CDN staying up. Every published page has its source here (`docs/ui/README.md` lists them
  with their links), and publishing goes from a committed file. Every custom asset a look uses (its
  icons, tab bar, marks, theme tokens and fonts) is saved as a file in `docs/ui/directions/assets/`,
  written by `build.mjs` and `fonts.mjs`. Change the source, never the exported file.
- **shadcn first, customised in place.** Every building block starts from a shadcn/ui component
  (the `uiux` skill). When its defaults don't fit the phone, edit the shadcn file itself in
  `apps/web/src/components/ui/`, with a `// Sen:` note on its first line saying what changed, so an
  upgrade (`shadcn add <x> --dry-run`) can keep it. Never write a parallel, hand-rolled version of
  something shadcn has. `className` at a call site is for layout only. `patterns.md`'s building
  blocks are compositions of them, in `apps/web/src/blocks/`.
- **Commands**, from the repo root (Node 22, pnpm 10; `scripts/session-start.sh` installs packages):

  | Command | What it does |
  |---|---|
  | `pnpm install` | Install everything |
  | `pnpm dev` | The web app at `localhost:5173`, with the dev panel; `/dev/gallery` shows every building block |
  | `pnpm build` | The web app's production build, as Vercel runs it. A build is production, without dev tools, unless `SEN_ENV=preview` or Vercel's `VERCEL_ENV=preview` says otherwise |
  | `pnpm test` | Unit tests: money, the looks' ports, the hygiene check, the no-float rule, the web app's pure parts |
  | `pnpm e2e` | Playwright on a preview build and a production build, at a phone viewport, under the real CSP |
  | `pnpm typecheck`, `pnpm lint`, `pnpm format` | TypeScript strict, ESLint (with the no-float rule), Prettier |
  | `pnpm looks` | Regenerates `apps/web/src/styles/looks.gen.css` from `docs/ui/directions/assets/`; CI fails if it's stale |
  | `pnpm hygiene` | The repo hygiene check: tracked `private/` paths, and the `DENYLIST` strings if set |
  | `gradle -p apps/shell/core test` | The capture core's Kotlin tests; needs no Android SDK |
  | `bash scripts/android-sdk.sh` | Installs the Android SDK in a cloud session (about 2 minutes), to build the shell's APKs there: then `pnpm --filter @sen/shell sync` and `gradle assembleDebug` in `apps/shell/android` |
  | `node apps/shell/scripts/icons.mjs` | Renders the launcher and notification icons from the looks' SVGs into the Android resources |
  | `node apps/web/scripts/frame-times.mjs` | Each look's frame times at 390×844 with the CPU slowed 4×, against a running `vite preview` |

  The QA database arrives with the server (B05).
- **Layout** (B01):

  | Path | What it holds |
  |---|---|
  | `apps/web/` | The web app: Vite, React, TanStack Router, Tailwind v4 and shadcn/ui. `src/components/ui/` is shadcn's, customised in place; `src/blocks/` the building blocks of `patterns.md` §7; `src/frame/` the tab bar, Sen's button and the shell of every screen; `src/screens/registry.ts` every screen id, `skeleton` or `real`; `src/dev/` the dev panel and gallery; `e2e/` Playwright |
  | `packages/core/` | Pure TypeScript shared by the app, the API and the worker: the money module now; cycles and the template engine later |
  | `packages/looks/` | The six looks as `DIR` modules, ported from `docs/ui/directions/src/`, each loaded only when shown |
  | `apps/api/` | The Hono API (B05) |
  | `apps/shell/` | The Capacitor shell for Android (B02): application id **`io.github.ztsia.sen`**, name **Sen** (`.debug`, *Sen review*, for the review build). `android/` is the app, with our Kotlin in `app/src/main/java/io/github/ztsia/sen/` (the listener, the outbox, the bridge's two plugins `SenShell` and `SenCapture`) and its emulator tests in `app/src/androidTest/`; `core/` the pure Kotlin capture core (no Android SDK); `data/` the curated apps and the brands' steps; `sites.json` the one address each build loads; `www/` the page shown when the site can't load |
  | `apps/worker/` | The Cloudflare Worker: schedules and the realtime relay (B06) |
  | `scripts/` | The session hooks, the hygiene check and the QA report |

### Models and subagents

The main session (Opus) decides, talks with the owner, works on the non-negotiables, and reviews what
comes back. It hands work down by judgement, never by ritual. `.claude/agents/` has `implementer`
(Sonnet), for a change already decided and big enough to be worth a brief; `scout` (Haiku), for
lookups, logs and summaries; and `qa-reviewer` (Sonnet by default; the main session picks Opus for a
run when it judges one needs it). A brief costs a cold start, so a small edit is quicker done in place.
No per-task review loops: the main session reads a subagent's diff itself, and QA checks the slice.

## Skills

| Skill | Use it when |
|---|---|
| `qa` | A slice is finished and before its PR, or a non-negotiable was touched. It spawns the `qa-reviewer` subagent and **sets the three tiers for fixing what QA finds** |
| `uiux` | Choosing shadcn components for a screen, building one, or checking one before it's done. Ported from GCO_events (D43): it reads its component index first, then only the docs it shortlists |
| `dataviz` | Any chart, stat tile or chart colour. It comes from the owner's claude.ai account, not the repo |
| `frontend-design` | Narrowed when `S2` closed (D57, D84): only for a look's own drawing (its figure, strip, avatar, tab bar and reveal) or a new look for the pool. Every screen follows `docs/ui/patterns.md` and `uiux` instead. Installed with `npx skills add` |
| `database` | Designing or checking tables, migrations, SQL, RLS policies, views, functions, or an API route or sync that touches data. Ported from the owner's `claude_skills` and cut down to this stack. Its rules win over the vendor skills below |
| `supabase-postgres-best-practices`, `neon`, `neon-postgres` | General Postgres and Neon practice: indexes, locking, pooling, branching. Installed with `npx skills add`. Where they assume Supabase, or steer towards Neon's own Auth, Functions, Storage or AI Gateway, `database` and D54–D55 win |

The stack's own skills came with `npx skills add` (B01), because cloud sessions don't load plugins:
`shadcn` (shadcn/ui's CLI and components), `vercel-react-best-practices` and `web-design-guidelines`
(vercel-labs), and `capacitor-app-development`, `capacitor-plugins`, `capacitor-plugin-development`,
`capacitor-react` and `capacitor-push-notifications` (Capawesome), with `capacitor-app-creation` added
in B02 for creating the shell. Where one disagrees with `uiux`, `patterns.md` or a decision, ours
win; a build session never stops to ask the questions a skill says to ask.

Skills are model-invoked from their descriptions, so no session needs to be told to use one.
**Our own skills are knowledge, not modes (D82).** Invoking one loads what to do and what must be
true; it never asks which mode to run in or produces an audit report for someone else to act on.
Build sessions run unattended and call skills themselves.
