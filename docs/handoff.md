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
- **D156:** design pages briefed with a render, look and fix loop; overlays and Sen's chat drawn by Fable.
- **D157 (14 Nov):** the owner chose sheet **A · Quiet** and ESS **B, status first, with *Set up*
  buttons**, and accepted ESS's new words. Both pages are published (`docs/ui/README.md`) but show
  options, not the final; each is drawn in full later. Still to draw for the sheet: a rows pick with
  search, a sheet at its cap with the fade, 1.5× text, 360×640, the other looks. For ESS: redoing a
  ready job, an unset address, *ESS needs you to sign in again*.
- **Sen's chat is drawn and published** (`docs/ui/sen-chat/design.html`). **The owner is looking at
  it.** Not yet reviewed in detail by the main session. Open on it: three either-ors (the head row in
  one line or two; a question's answers as rows or chips; the avatar resting in the header or with the
  newest answer; the agent picked the first of each) and what it bends: text has no card, *Edit* on
  your own message's menu, the message menu has six rows against D155's five, wrapped chips 16 px
  apart, the playground's *Apply* small and outlined. Its AI Elements names are from memory.
- **D158 (23 Nov), on workflow plugin 2.0.1:** sessions run on **Sonnet at `high` with an Opus advisor**
  (`.claude/settings.json`); Opus only for the slices `CLAUDE.md` *Overrides* lists and for writing a
  design brief. **Insights' page is drawn by an Opus subagent; *Models* and the two full drawings by
  Sonnet**, all at `high`, one at a time, each brief written on Opus with care. The cloud still loads
  plugin 1.2.0 until the owner edits the setup script (`docs/local.md`).

## What to do next

1. **Insights' design page is drawn and published** (23 Nov, Opus at `high`; `docs/ui/insights/`,
   link in `docs/ui/README.md`). **The owner is looking at it.** Either-ors (agent's pick first):
   tab row as chips or underlined tabs; a card's first line the question or the answer. **Cycle picker
   decided by the owner (23 Nov): both** — ‹ › for the next-door cycle, the button opens a sheet of
   every cycle by year with a bar of what was left, the short one in words; *Back to October* went
   to the app bar (a second action there, against patterns §7). Bends: an odd small card is drawn wide; the tabs are chips in the screen,
   not a second tab row; the screen menu adds *Arrange cards*, *Add a tab*, *Ask Sen for a card*;
   `insights/card` drops Sen's button for a full-width *Ask Sen about this*; 1.5× text stacks cards
   one to a row; source shows only on the opened card. Main-session nit: *Wide/Small* drawn as a
   checkbox labelled *Small*. Still to fix: the treemap's narrow cells, no table view drawn, the
   made-up pay drifts by 10 sen.
2. Then briefs, on Opus, for admin's *Models* page and the full drawings of sheet A and ESS B, each
   drawn by Sonnet at `high`, one at a time. Nothing is built from a page until the owner approves it;
   the overlay rebuild absorbs polish components 8, 15, 21 and home 17. `agent/memory` and
   `agent/watches` need no page unless the owner asks.
3. If the owner asks: a PR for this branch.
4. **B08 · Charts** (`docs/briefs/B08-charts.md`), branch `B08/charts` from `main` once this branch is
   merged, on Sonnet: the unit table in `docs/plans/B08-charts.md` (2.0.1's `| unit | what | who |
   model | after |`), build the shape, Haiku fills. Its brief names Sonnet `medium` for
   three chart units (4, 6, 7): 2.0.1's hook refuses that without a `Sonnet because:` line, so the
   unit table moves them to Haiku or gives each a clause. **Before its QA: move Sen to 2.0.1's QA engine**
   (`qa verify`, `qa.json`, the screen map; the plugin's `skills/qa/setup.md`), folding Sen's
   `docs/workflow/qa.md` and its `qa-diff`, `mutants` and `lived` scripts into it, in a Sonnet session.
5. Then **B09 · Template engine** on Opus (`docs/briefs/B09-template-engine.md`).

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

- Phone steps for B08 (`docs/local.md` steps 1–9); the cloud's move to plugin 2.0.1 (`docs/local.md`).
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

- D129–D158. Radix stays; charts in D151's order; no advisor. Sen's chat starts on Haiku, one
  conversation, no RAG; Sen reads data through its tools, never SQL of its own, and no Python.
  Models change in admin, providers only in code. Notes are topic pages, by our own code, never a
  provider's compaction. Deploys happen only by merge (D122).
