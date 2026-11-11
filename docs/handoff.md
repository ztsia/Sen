# Handoff

## Where things stand (10 Nov)

**B08 · First run, accounts and categories** is finished on `B08/first-run-accounts`, with its PR open to
`main`, waiting for the owner's merge. B07 merged (#22).
- **QA:** four full runs and a scoped re-check (`qa/B08/report.md`; earlier runs `report-run1..3.md`; eyes
  `eyes.md`; published at https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv, version 5). Last verdict **ship**;
  its findings 13 and 14 are fixed (`qa/B08/ledger.md`, which ends with the retro). Security review (D144):
  no High or Medium (`qa/B08/security.md`).
- **Decisions this slice:** D145 (the owner: one account per app; Ryt's pockets and TNG's GO+ are part of their
  app's account), D146 (B08's mechanisms), D147 (QA run 1's calls), D148 (an app chosen after first run gets its
  account on Accounts, *Not added yet*), D149 (`my_share` NULL is the whole amount), D150 (the owner: a wrong
  field's label and message may be red, never the amount).
- **Database:** migrations 0013–0014 (`accounts`, `account_names`, `categories`, `transactions`, views
  `account_balances`, `balance_totals`, `user_settings.setup_done_at`); pgTAP `packages/db/test/ledger.sql`.
- **API:** `/accounts`, `/accounts/:id`, `/categories`, `/me`'s `setupDone`, the `setup.*`, `account.*`,
  `category.*` commands (`apps/api/src/ledger.ts`); `/sync/changes` carries the ledger.
- **Shell:** outbox v5 keeps the offline copy. **Web:** first run saves as it goes; Accounts, Account,
  Settings → Categories and → You are real. `?scenario=new` is before first run.
- **CI:** `e2e:server` walks first run and Accounts; a new step re-records every accessibility tree and fails on
  any difference (`toMatchAriaSnapshot` alone passed stale trees).
- **Preview seed:** Wei Ming finished; Mei Ling (`meiling@example.com`, code 123456) hasn't.

## What to do next

1. If the owner asks for changes on the PR, make them on `B08/first-run-accounts`.
2. After the merge: **B09 · Template engine** (`docs/briefs/B09-template-engine.md`), branch
   `B09/template-engine` from `main`. B09 maps `{account}` names (all to the app's one account, D145) and decides
   what happens to an app's account when the app is un-chosen (QA B08 note 13).
3. Still open from before: B06's F1 and F2 (the owner's call).

## Open with the owner

- The phone steps for B08 are in `docs/local.md` (steps 1–9), and the B08 lessons for `ztsia/workflow`.

## Follow-ups, not in B08

- Stored credit without an app and *Elsewhere* accounts have no *Add* yet (D145 kept them); B11 needs Elsewhere.
- Whether an account can open below zero (QA B08 run 3, note 9): the API accepts it, the phone can't type it.
- Names accept zero-width characters, so *Me​als* sits beside *Meals* (QA B08 run 4, note 9).
- QA tooling: the console metric should ignore Chromium's *cross-world service worker* warning; the harness
  should record which signal set each step's settle time (QA B08 run 4, 6: More → Accounts measures twice main in
  the harness, equal in probes); the core journey's scan-after step races a 0.4–0.8 s screen (run 1, 12);
  `mutants.mjs` has no e2e suite, so colour and layout breakage checks can't be listed.
- Shared transitions the eyes pass flagged (B08 run 4): skeletons for data already on screen, sheets that cut
  out, first run's *Suggested* card jumping the list; Members → *Remove*'s toast over its dialog (on `main`).
- Earlier ones: B07 QA 14 and notes 7–9 (`qa/B07/ledger.md`); no Kotlin breakage checks.

## Environment notes

- Playwright wants `chromium_headless_shell-1194`; this VM has 1243. Make
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux` → `…-1243/chrome-headless-shell-linux64`
  plus a `headless_shell` link to `chrome-headless-shell` in it. Never `playwright install`.
- Android: `bash scripts/android-sdk.sh`, `ANDROID_HOME=/opt/android-sdk`; the androidTest variant is
  `e2e` (`:app:compileE2eAndroidTestKotlin`).
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod trips the CSP.
- The workflow plugin here is 1.1.0; main's is 1.2.0 (see `docs/local.md`).

## Don't argue again

- D129–D150. One account per app (D145). Deploys happen only by merge (D122).
