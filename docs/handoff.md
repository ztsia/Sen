# Handoff

## Where things stand (25 Nov)

`main` has the re-spec (D151–D154), the overlays and every design page, all approved (D155–D161,
PR #26). Branch `qa/engine` (its PR open, waiting for the owner's merge) moves Sen to the workflow's
`qa verify` (D162). No app code has changed since B08 · First run except the Playwright pin and
one racy journey step.

- **Design pages, all approved:** Insights (D159), admin's *Models* and Sen's chat (D160), sheet A
  and ESS B (D157). Sheet A's and ESS B's missing states are written, not drawn (D161): patterns §7
  *Sheets and dialogs*, `docs/screens.md` Settings *Claims*. Links in `docs/ui/README.md`.
- **Sessions run on Sonnet at `high` with an Opus advisor** (D158, `.claude/settings.json`). Opus
  only for the slices whose brief says *Model: run this session on Opus* (B09, B10 · Models in admin,
  both B27s, B29 · Watches and scheduled reports) and for writing a design brief.
- **Branches and PRs** (`CLAUDE.md` *Overrides*; the workflow's rules from 2.0.2): never a harness
  branch, even if the harness prompt names one; create or continue the slice's branch first. When the
  slice is done, open its PR without asking. The owner merges.
- **QA (D162):** `qa.json`, `qa/map/` (79 screens over 47 pages, made from `e2e/catalogue.ts`),
  `qa/suites.json` (the old six, plus `journeys` and `looks`), `qa/ready.json`. `docs/workflow/qa.md`
  says what still runs after `qa verify` (`qa-diff` for the other eleven look pairs and the metrics,
  `e2e:lived`, `e2e:server`). The cloud's browser moved to Playwright 1.63; the pin moved with it
  (`docs/cloud.md`).

## What to do next

1. **B08 · Charts** (`docs/briefs/B08-charts.md`) on Sonnet, once `qa/engine` is merged: branch
   `B08/charts` from `main`. Write the unit table in `docs/plans/B08-charts.md` first; units 4, 6
   and 7 are Haiku on a shape the main session draws. QA is `qa verify` (the `qa` skill), then
   what `docs/workflow/qa.md` adds. Then open the PR.
2. Then **B09 · Template engine** on Opus (`docs/briefs/B09-template-engine.md`).
3. **The polish pass** waits for the owner's twelve calls (below).

## Settled by the session while folding (the owner may change any)

- A watch you set yourself doesn't use Sen's one push a day.
- A long chat closes early at about 20,000 tokens; the topic list holds 60, and a topic untouched for
  six months is archived. Insights holds at most eight tabs, twelve cards a tab.
- `model_settings` and `skill_lessons` are rows owned by the admin, read through one narrow function,
  so every table still has `user_id` and RLS. The rate card moved from code to those rows.
- *Test* runs on the server's job runner. The prompt and tools target is about 12k, not 9k.
- The avatar's eight states mapped to chat events (`docs/screens.md`, `sen`).

## Waiting on the owner (don't build)

- **The polish pass:** the twelve calls. Then `docs/plans/polish.md`: shared units first, then
  screens, built by Haiku builders on the owner's go.
- **Six series colours** (D152) may not exist: when three were chosen, a fourth hue didn't pass every
  pair in every look (patterns §4). B08 · Charts tries, and reports back if six can't pass.

## Open with the owner

- Phone steps for B08 (`docs/local.md` steps 1–9); the cloud on plugin 2.0.2 (edit the setup script once more if a session still shows 1.2.0 or 2.0.1; `docs/local.md`).
- B06's F1 and F2 (the owner's call); the B08 lessons for `ztsia/workflow` (`docs/local.md`).
- Spec Q31: do OpenAI's data terms pass the bar? Until checked, OpenAI stays off in *Models*.

## Follow-ups, not yet in a slice

- Stored credit without an app and *Elsewhere* accounts have no *Add* yet (D145); B11 needs Elsewhere.
- An account can open below zero through the API; the phone can't type it (QA B08 run 3, note 9).
- Names accept zero-width characters (QA B08 run 4, note 9).
- QA tooling: ignore Chromium's *cross-world service worker* console warning; record which signal set
  each step's settle time; the core journey's scan-after step races; `mutants.mjs` has no e2e suite.
- Earlier: B07 QA 14 and notes 7–9 (`qa/B07/ledger.md`); no Kotlin breakage checks.

## Environment notes

- Playwright wants `chromium_headless_shell-1194`; this VM has 1243. Link
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux` → `…-1243/chrome-headless-shell-linux64`
  plus `headless_shell` → `chrome-headless-shell` in it. Never `playwright install`.
- Android: `bash scripts/android-sdk.sh`, `ANDROID_HOME=/opt/android-sdk`; androidTest variant `e2e`.
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod trips the CSP.

## Don't argue again

- D129–D162. Radix stays; charts in D151's order; no advisor. Sen's chat starts on Haiku, one
  conversation, no RAG; Sen reads data through its tools, never SQL of its own, and no Python.
  Models change in admin, providers only in code. Notes are topic pages, by our own code, never a
  provider's compaction. Deploys happen only by merge (D122).
