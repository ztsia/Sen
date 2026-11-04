# Handoff

## Where things stand (4 Nov)

**B08 · First run, accounts and categories** is built on `B08/first-run-accounts`; its first full QA run
(Opus) is under way. No PR yet. B07 merged (#22).
- **D145 (the owner, 4 Nov): one account per app.** Ryt's Main and its pockets are one account, TNG's
  eWallet and GO+ are one: Ryt notifies neither pocket moves nor interest. No second account under an
  app, no *Add a pot*. Spec §6.2, §7, §9.5, flows, screens, modules and notifications.md say so.
- **Database:** migrations 0013–0014: `accounts` (one live per app), `account_names`, `categories`
  (seeded once by `seed_categories()`), `transactions` (core columns), views `account_balances` and
  `balance_totals`; `user_settings.setup_done_at`. Composite `(user_id, …)` keys everywhere.
  pgTAP `packages/db/test/ledger.sql` (the `opening_at` boundary on hand-checked rows).
- **API:** `/accounts`, `/accounts/:id`, `/categories`, `/me`'s `setupDone`, Settings' categories, and
  `setup.*`, `account.*`, `category.*` commands (`apps/api/src/ledger.ts`, tests `ledger.test.ts`).
  `/sync/changes` carries categories, accounts, account names and own names.
- **Shell:** outbox v5 keeps that offline copy (emulator tests compile; CI runs them).
- **Web:** first run saves as it goes and reopens at its step with what was typed; the router sends a
  signed-in person to it until finished (in the shell with capture, or anywhere without). Accounts,
  Account (Edit, Archive), Settings → Categories (rename, add, archive, flags) and → You are real.
  `canOpen` keeps production from offering buttons into skeleton screens. Scenario `?scenario=new`.
- **Preview seed:** Wei Ming finished; **Mei Ling** (`meiling@example.com`, code 123456) hasn't, to walk
  first run in the review shell.
- The mechanisms are **D146** (10 points).

## Checked so far

typecheck, lint, unit (479), `pnpm test:db` (pgTAP and API, 211), the first-run journey, the six-look
walk (`e2e/first-run.spec.ts`), trees re-recorded, the real flow against the local API (rows checked in
`sen_dev`). Security review: nothing High or Medium (`qa/B08/security.md`); its low note fixed
(`qa/B08/ledger.md`). The full six-look `pnpm e2e` is QA's sweep's to run.

## What to do next

1. QA run 1's report: commit its record, publish it, fix by tier (`qa/B08/ledger.md`), start the eyes
   pass once its diff report exists (subagents can't start their own here).
2. The retro at the bottom of `qa/B08/ledger.md`, `usage.mjs --log B08`, then the PR *B08 · First run,
   accounts and categories*.
3. Still open from before: B06's F1 and F2 (the owner's call); lessons for `ztsia/workflow` from B06–B08.

## Open with the owner

- The phone steps for B08 are in `docs/local.md`. Nothing else waits on them.

## Follow-ups, not in B08

- Account names: B08 makes the table and writes none; B09 maps `{account}` names (all to the app's one
  account, D145).
- Stored credit without an app and *Elsewhere* accounts have no *Add* yet (D145 kept them; the brief
  didn't ask for the screen). B11 needs Elsewhere for transfers.
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

- D129–D146. One account per app (D145). Deploys happen only by merge (D122).
