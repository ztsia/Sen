# Handoff

## Where things stand (10 Nov)

**B08 · First run, accounts and categories** is built on `B08/first-run-accounts`. No PR yet. B07 merged (#22).
- **QA run 1** (`qa/B08/report-run1.md`, eyes `qa/B08/eyes-run1.md`): 4 Major, all fixed (D147).
- **QA run 2** (`qa/B08/report-run2.md`, eyes `qa/B08/eyes.md`; published at the same link,
  https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv, version 2): *fix first*, 1 Major (a category added before
  first run stopped the starting list), 7 Minor, 8 Notes, 2 eyes *wrong*. **Fixed** after the owner's go, as one
  tier-3 batch (the access middleware and the frame changed): `qa/B08/ledger.md` § *QA run 2: the fixes*.
- **QA run 3** (`qa/B08/report.md`, eyes `qa/B08/eyes.md`, run 2's eyes now `eyes-run2.md`; same link, version 3):
  *fix first*, 1 Major (no test paged the offline copy past one page), 6 Minor, 4 Notes, eyes 0 *wrong*.
  **Fixed** after the owner's go, as one tier-3 batch (a shared block's prop and `@sen/core`'s `Name`):
  `qa/B08/ledger.md` § *QA run 3: the fixes*. **D148** (the session's call on the owner's *Go*, open to
  overturn): an app chosen after first run gets its account on Accounts, under *Not added yet*.
- **QA run 4** (`qa/B08/report.md`; same link, version 5): *fix first*, 6 Minor, 6 Notes. **Fixed** as tier 2
  (`ledger.md` § *QA run 4: the fixes*; D149, `my_share` NULL is the whole amount), and re-checked by the same
  reviewer, scoped: **ship**, 2 new Minor (13: only archived accounts leaves Accounts with no empty state; 14: no
  test holds the amount's colour) and note 15 (every invalid field's label and message are red, against patterns
  §2: the owner's call). **Waiting for the owner's go** before the PR. Finding 6 (More → Accounts timing) open.
- **D145 (the owner, 4 Nov): one account per app.** Ryt's Main and its pockets are one account, TNG's eWallet
  and GO+ are one. No second account under an app, no *Add a pot*.
- **Database:** migrations 0013–0014 (`accounts`, `account_names`, `categories`, `transactions`, views
  `account_balances` and `balance_totals`, `user_settings.setup_done_at`); pgTAP `packages/db/test/ledger.sql`.
- **API:** `/accounts` (with `archived`), `/accounts/:id`, `/categories`, `/me`'s `setupDone`, and the
  `setup.*`, `account.*`, `category.*` commands (`apps/api/src/ledger.ts`). `/sync/changes` carries the ledger.
- **Shell:** outbox v5 keeps the offline copy (emulator tests compile; CI runs them).
- **Web:** first run saves as it goes; the router's rule is `firstRunFor` (`screens/outside/logic.ts`).
  Accounts, Account, Settings → Categories and → You are real. `?scenario=new` is before first run.
- **Preview seed:** Wei Ming finished; **Mei Ling** (`meiling@example.com`, code 123456) hasn't.
- **CI's `e2e:server`** now walks first run (`e2e/first-run.server.spec.ts`): the redirect, RM0.00, a lost save,
  and a finished person sent Home.

## What to do next

1. On the owner's go: run 4's fixes by tier (findings 1–5 at least: tests for the Unaccounted trigger's other
   half and the three Capture checks, plus their `b08r4-*` breakage checks; Accounts after an archived app's
   only account; `my_share`'s rule; the tree check holding placeholders), recorded in `qa/B08/ledger.md`.
2. Then the retro at the bottom of `qa/B08/ledger.md`, `usage.mjs --log B08`, the PR *B08 · First run, accounts
   and categories*, and CLAUDE.md's Built/Next line.
3. Still open from before: B06's F1 and F2 (the owner's call); lessons for `ztsia/workflow` from B06–B08.

## Open with the owner

- The phone steps for B08 are in `docs/local.md` (step 4's *0 is fine* is now true).

## Follow-ups, not in B08

- Account names: B08 makes the table and writes none; B09 maps `{account}` names (all to the app's one
  account, D145). B09 also decides what happens to an app's account when the app is un-chosen (QA B08 note 13).
- Stored credit without an app and *Elsewhere* accounts have no *Add* yet (D145 kept them; the brief
  didn't ask for the screen). B11 needs Elsewhere for transfers.
- Whether an account can open below zero (QA B08 run 3, note 9): the API accepts it, the phone can't type it.
- QA tooling: the console metric should ignore Chromium's *cross-world service worker* preload warning; the
  harness should record which signal set each step's settle time (QA B08 run 4, 6: More → Accounts measures
  twice main in the harness, equal in probes). The tree check's gap is closed: CI re-records the trees (run 4, 5).
- Names accept zero-width characters, so *Me​als* sits beside *Meals* (QA B08 run 4, note 9).
- QA tooling: the core journey's scan-after step waits for a 0.4–0.8 s screen and races it under load (QA
  B08 run 1, 12); it should wait for the step's outcome.
- Earlier ones: B07 QA 14 and notes 7–9 (`qa/B07/ledger.md`); no Kotlin breakage checks; Members →
  *Remove*'s toast over *Export their data first* (main).

## Environment notes

- Playwright wants `chromium_headless_shell-1194`; this VM has 1243. Make
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux` → `…-1243/chrome-headless-shell-linux64`
  plus a `headless_shell` link to `chrome-headless-shell` in it. Never `playwright install`.
- Android: `bash scripts/android-sdk.sh`, `ANDROID_HOME=/opt/android-sdk`; the androidTest variant is
  `e2e` (`:app:compileE2eAndroidTestKotlin`), not `assembleDebugAndroidTest`.
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod trips the CSP.

## Don't argue again

- D129–D149. One account per app (D145). Deploys happen only by merge (D122).
