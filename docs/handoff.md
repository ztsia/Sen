# Handoff

## Where things stand (13 Nov)

B08 merged (#23); D151 and D152 merged (#24). No code has changed since B08. The re-spec carries on
with the owner on branch `ccr-55173031-oa1xly` (no PR yet).

- **D152** (12 Nov), **D153** and **D154** (13 Nov): Sen's agent, chat and Insights, re-specified. **The detail
  is in `docs/respec.md`, not yet in the spec.**
- **D153:** every job's provider, model, effort and fallback is set on an admin *Models* screen, with
  a *Test* against the current model; providers stay a fixed list in code and keys in Vercel.
  Insights keeps its tabs, editable. The chat's avatar travels with the answer, on the eight states
  already drawn. A long-press on a message opens a floating menu, never a sheet.
- **D154:** what Sen carries (`docs/respec.md` §3): topic pages with entries added and never
  rewritten, written by our own code, no amounts, nothing already sent ever edited. A new area's
  design page is drawn by a Fable subagent at `xhigh`, then Sonnet builds; polish needs no design.
- `docs/respec.md` §12 and §13 hold the chat's and the cards' design, so the spec revision has it.
- **The polish audit is done:** seven plans in `docs/polish/` (187 findings), and the owner's 15 calls
  with recommendations in `docs/polish/decisions.md`, unanswered.

## What to do next

1. **Ask the owner whether the re-spec is complete.** `docs/respec.md` §1–13 are decided; §14 is what
   the spec revision settles. It's a design conversation: short messages, multiple choice, a
   recommendation each time.
2. **Then fold it into the contract:** `spec_v2.md` (§9.3, §12, §15, §16, and the admin's routes and
   screen), `docs/screens.md`, `docs/ui/patterns.md` (§4, and §8's long-press line), `docs/modules.md`
   and the briefs it touches (B08 · Charts' first), and delete `docs/respec.md`.
3. If the owner asks: a PR for this branch, and one for `workflow/plan-then-delegate` (plugin 1.3.0,
   on `ztsia/workflow`).
4. **B08 · Charts** (`docs/briefs/B08-charts.md`), branch `B08/charts` from `main`, once its brief
   matches `docs/respec.md` §5: write `docs/plans/B08-charts.md`, build the seam, brief the rest.
5. Then **B09 · Template engine** (`docs/briefs/B09-template-engine.md`): it maps `{account}` names
   (all to the app's one account, D145) and decides what happens to an un-chosen app's account.

## Waiting on the owner (don't build)

- **The polish pass:** the 15 calls. The re-spec overtakes a few (amount styling, the goal ring,
  Insights' cards), so answer them after it. Then `docs/plans/polish.md`: shared units first, then
  screens, built by Haiku and Sonnet builders on the owner's go.
- **Nothing from D152 is built** until the spec carries it and its slices are mapped.

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

- D129–D154. Radix stays; charts in D151's order; no advisor. Sen's chat starts on Haiku, one
  conversation, no RAG; Sen reads data through its tools, never SQL of its own, and no Python.
  Models change in admin, providers only in code. Notes are topic pages, by our own
  code, never a provider's compaction. Deploys happen only by merge (D122).
