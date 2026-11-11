# Handoff

## Where things stand (11 Nov)

B08 merged (#23). Between slices, the owner and a design session settled the UI's foundations and how
slices are built: **D151**. Written on branch `ccr-0a86f474-pcz1jx` (no PR yet); the plugin's half on
`ztsia/workflow`, branch `workflow/plan-then-delegate` (1.3.0, no PR yet).
- **Radix stays.** React Aria was weighed (a shadcn base since July 2026) and not adopted.
- **Charts:** shadcn's Chart → plain Recharts in `ChartContainer` → hand-drawn only where Recharts can't
  (the spending calendar). One-value meters are `Progress`. The built charts move over in **B08 · Charts**
  (`docs/briefs/B08-charts.md`), before B09. Recharts is about 110 KB gzipped (measured), so its own chunk.
- **Sen's chat** starts from shadcn's AI Elements when it's reworked (`docs/workflow/uiux.md`).
- **Plan first, build the seams, delegate the rest:** a slice opens with `docs/plans/<slice>.md`, units
  with owned files and a model each; the main session builds only foundations and seams; a Haiku unit
  aims under about 100k tokens of context. **No advisor** (session-wide only, can't be per agent, checked
  in the docs and the 2.1.322 binary): builders ask the main session, answered in the same conversation.

## What to do next

1. If the owner asks: PRs for this branch (to `main`) and for `workflow/plan-then-delegate`.
2. **B08 · Charts**, branch `B08/charts` from `main` (after this branch merges). Write the plan first
   (`docs/plans/B08-charts.md`), build unit 1 (the seam) yourself, then brief units 2–5 in parallel.
3. Then **B09 · Template engine** (`docs/briefs/B09-template-engine.md`). It maps `{account}` names (all
   to the app's one account, D145) and decides what happens to an app's account when it's un-chosen.

## Waiting on the owner's go (don't start), and the audit under way

- **The polish pass, audit started (owner's go, 11 Nov):** seven Fable auditors at `xhigh`, one per area
  (`docs/polish/README.md`), each writing `docs/polish/<area>.md`; they never edit or take screenshots.
  Captures were made by script (catalogue in Minted, tabs in all looks, the gallery) and sliced to phone
  height in the session's scratchpad. Their view requests go to `own/<area>/requests.md`, for one Haiku
  batch. Next: merge the seven plans (shared fixes once, at the component level), bring the owner the
  *Needs the owner* list, then write `docs/plans/polish.md`. Building waits for the owner's go. If the
  scratchpad is gone, re-capture with `E2E_CATALOGUE=shots E2E_SHOTS=<dir>` on `e2e/catalogue.spec.ts`.
- **Sen's chat on AI Elements**, against benchmark references the owner will share.
- **A re-spec of Sen** (spec §12), with the owner.

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
