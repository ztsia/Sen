# Handoff

## Where things stand (4 Nov)

**B08 · First run, accounts and categories** is built on `B08/first-run-accounts`. No PR yet. B07 merged (#22).
- **QA run 1** (`qa/B08/report.md`, published: https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv; eyes in
  `qa/B08/eyes.md`): *fix first*, 4 Major, 8 Minor, 7 Notes. **All fixed** after the owner's go, as one tier-3
  batch (the money module changed): `qa/B08/ledger.md` § *QA run 1: the fixes* has each one and its proof.
  The choices they needed are **D147**.
- **QA run 2** is next: a fresh full run (tier 3). The owner asked to stop after each QA run and wait for their
  go before fixing or opening the PR.
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
- **CI's `e2e:server`** now walks first run (`e2e/first-run.server.spec.ts`): the redirect, RM0.00, a lost save.

## What to do next

1. QA run 2 (fresh `qa-reviewer`, thin prompt). Commit its record, start its eyes pass, publish, report to the
   owner, and wait for their go.
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

- D129–D147. One account per app (D145). Deploys happen only by merge (D122).
