# Handoff

## Where things stand (13 Nov)

B08 merged (#23); D151 and D152 merged (#24). No code has changed since B08. Branch
`ccr-55173031-oa1xly` (no PR yet) holds D153, D154 and the re-spec folded into the contract.

- **The re-spec of Sen's agent, chat and Insights is in the spec** (2.12: §9.3, §9.8, §12, §15, §16),
  `docs/screens.md`, `docs/flows.md`, `docs/ui/patterns.md` (§4, §7, §10) and `docs/modules.md`.
  `docs/respec.md` is gone.
- **The slice map gained five slices:** B10 · Models in admin, B20 · Insights, arranged, B27 · Sen's
  chat, B27 · What Sen carries, B29 · Watches and scheduled reports. B08 · Charts widened to the one
  chart component with thirteen kinds. Every brief it touches is revised or written.
- **The polish audit is done:** seven plans in `docs/polish/` (187 findings). Of the owner's 15 calls
  in `docs/polish/decisions.md`, the re-spec answered three (6, 7, 12); twelve wait.

## This session (13 Nov, branch `claude/bottom-sheet-redesign-9uv3is`): the overlays and the design pages

- **D155:** which overlay holds what, menus widened (patterns §7 amended). The 51 overlays are
  inventoried, shot and sorted: `docs/ui/overlays/` (`inventory.md`, its page in `docs/ui/README.md`).
  The owner approved the split: 31 stay sheets, 4 fold into menus, 1 inline, 1 dialog, 6 screens.
- **D156:** design pages run on Fable at `high`, each brief with a render, look and fix loop. Order:
  overlays, Sen's chat, Insights, *Models*; the ESS section of Claims alongside.
- **Drawn and published (14 Nov), waiting for the owner to choose** (links in `docs/ui/README.md`):
  the overlays' three sheet anatomies (A Quiet, B Floating card, C Action bar) with the menu and
  dialog, `docs/ui/overlays/design.html`; and the ESS section's two redesigns (A one card, B status
  first), `docs/ui/claims-ess/design.html`. Recommended: sheet A; ESS B with A's *Set up* button.
  After the choice: the chosen sheet drawn in full (a rows pick with search, a sheet at its cap, the
  fade, 1.5× text, 360×640, the other looks), and ESS's missing states.
- **Then:** brief Sen's chat page on the chosen sheet; then Insights; then *Models*. Nothing is built
  from a page until the owner approves it. The overlay rebuild is a unit plan after approval
  (`docs/modules.md`, *Waiting on the owner's go*); it absorbs polish components 8, 15, 21 and home 17.

## What to do next

1. If the owner asks: a PR for this branch, and one for `workflow/plan-then-delegate` (plugin 1.3.0,
   on `ztsia/workflow`).
2. **B08 · Charts** (`docs/briefs/B08-charts.md`), branch `B08/charts` from `main` once this branch
   is merged: write `docs/plans/B08-charts.md`, build the seam, brief the rest.
3. **The three design pages** (D154, `docs/modules.md`), each before its slice: admin's *Models*
   (before B10 · Models in admin), Insights' cards and tabs (before B20), Sen's chat (before B27 ·
   Sen's chat). A Fable subagent at `high` (D156) draws each from the spec and `docs/screens.md`; the main
   session briefs and reviews it; the owner approves; its source goes in `docs/ui/`.
4. Then **B09 · Template engine** (`docs/briefs/B09-template-engine.md`): it maps `{account}` names
   (all to the app's one account, D145) and decides what happens to an un-chosen app's account.

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
  screens, built by Haiku and Sonnet builders on the owner's go.
- **Six series colours** (D152) may not exist: when three were chosen, a fourth hue didn't pass every
  pair in every look (patterns §4). B08 · Charts tries, and reports back if six can't pass.

## Open with the owner

- Phone steps for B08 (`docs/local.md` steps 1–9); plugin 1.3.0 to merge and move to (`docs/local.md`).
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

- D129–D156. Radix stays; charts in D151's order; no advisor. Sen's chat starts on Haiku, one
  conversation, no RAG; Sen reads data through its tools, never SQL of its own, and no Python.
  Models change in admin, providers only in code. Notes are topic pages, by our own code, never a
  provider's compaction. Deploys happen only by merge (D122).
