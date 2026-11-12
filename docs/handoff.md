# Handoff

## Where things stand (12 Nov)

B08 merged (#23). **D151** (11 Nov) settled the UI's foundations and how slices are built: Radix
stays; charts on shadcn's Chart, then Recharts, then hand-drawn; Sen's chat from AI Elements; a slice
opens with `docs/plans/<slice>.md` and the main session builds only foundations and seams; no advisor
(builders ask the main session). It's on branch `ccr-0a86f474-pcz1jx` (no PR yet); the plugin's half
is on `ztsia/workflow`, branch `workflow/plan-then-delegate` (1.3.0, no PR yet). Since then: the
polish audit and a re-spec discussion with the owner, both below. No code has changed.

## What to do next

1. Carry on the re-spec with the owner (below). When it settles, record the decision (D152 on) and
   revise the spec, `docs/screens.md`, `docs/ui/patterns.md` and the slice map.
2. If the owner asks: PRs for this branch (to `main`) and for `workflow/plan-then-delegate`.
3. **B08 · Charts** (`docs/briefs/B08-charts.md`), branch `B08/charts` from `main`. Its brief predates
   the re-spec: check it against the chart list the re-spec settles, then write
   `docs/plans/B08-charts.md`, build the seam, brief the rest.
4. Then **B09 · Template engine** (`docs/briefs/B09-template-engine.md`): it maps `{account}` names
   (all to the app's one account, D145) and decides what happens to an un-chosen app's account.

## Waiting on the owner (don't build)

- **The polish pass: audit done.** Seven plans in `docs/polish/` (187 findings; shared fixes once in
  `components.md`) and the owner's 15 calls with recommendations in `docs/polish/decisions.md`,
  unanswered. The re-spec will overtake a few (amount styling, the goal ring, Insights' cards). Then
  `docs/plans/polish.md`: shared units first, then screens.
- **The re-spec of Sen's agent, chat and Insights: under discussion, nothing in the spec yet.** The
  owner's calls so far (12 Nov):
  - The chat runs on Claude Haiku. Research is one generic tool (Gemini with Google Search) that may
    search anything; each research skill is a goal for it. A ledger figure in a search is rounded by
    code, never blocked. A model picker is undecided (recommended: none).
  - One conversation, each call well under 100k tokens (Haiku's price step). No RAG: durable
    knowledge lives in the tables behind Sen's tools; dated notes of past chat and a search cover
    the rest.
  - Answers are typed parts (text, steps, chart, table, figures, records, question, proposal,
    button, follow-ups, web findings, file, playground, checklist, coming up, compare, saved,
    notice). A part takes its figures only by reference to a tool result; a figure taps through to
    its records.
  - Charts on shadcn's Chart and Recharts, interactive, one component for Sen's tool and the screens.
  - Insights becomes cards the person and Sen add, change and arrange, seeded with today's.
  - Also in: watches and scheduled reports, an Excel tool, memory with a weekly tidy and shared
    lessons, answers in the language asked.
  - Open: which further capabilities to take (a numbered list was offered), whether shared lessons
    may change Sen's skills behind a test gate, and six series colours per look.

## Open with the owner

- Phone steps for B08 (`docs/local.md` steps 1–9); plugin 1.3.0 to merge and move to (`docs/local.md`).
- B06's F1 and F2 (the owner's call); the B08 lessons for `ztsia/workflow` (`docs/local.md`).

## Follow-ups, not yet in a slice

- Stored credit without an app and *Elsewhere* accounts have no *Add* yet (D145); B11 needs Elsewhere.
- An account can open below zero through the API; the phone can't type it (QA B08 run 3, note 9).
- Names accept zero-width characters (QA B08 run 4, note 9).
- QA tooling: ignore Chromium's *cross-world service worker* console warning; record which signal set
  each step's settle time; the core journey's scan-after step races; `mutants.mjs` has no e2e suite.
- Shared transitions (eyes, B08 run 4): skeletons over data already shown, sheets that cut out, first
  run's *Suggested* card jumping; Members → *Remove*'s toast over its dialog. The polish pass covers these.
- Earlier: B07 QA 14 and notes 7–9 (`qa/B07/ledger.md`); no Kotlin breakage checks.

## Environment notes

- Playwright wants `chromium_headless_shell-1194`; this VM has 1243. Link
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux` → `…-1243/chrome-headless-shell-linux64`
  plus `headless_shell` → `chrome-headless-shell` in it. Never `playwright install`.
- Android: `bash scripts/android-sdk.sh`, `ANDROID_HOME=/opt/android-sdk`; androidTest variant `e2e`.
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod trips the CSP.

## Don't argue again

- D129–D151. Radix stays; charts in D151's order; no advisor. Deploys happen only by merge (D122).
