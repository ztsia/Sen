# QA B08 · run 2 (fresh full run, tier 3)

Report with screenshots: https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv (version 2; version 1 was run 1)

```
VERDICT   fix first
          44 criteria, 40 pass, 3 fail, 1 not reachable
          16 findings: 0 Blocker, 1 Major, 7 Minor, 8 Note
          phases run: 1-6      screenshots: qa-artifacts/B08/first-run-accounts/screens/
```

One Major: a category added in a browser before first run means first run never seeds the starting list, so the person never gets Cash, Unaccounted or Salary. Everything else holds: RLS in every cell, the balance view's opening_at boundary, integer sen end to end, first run's reload and zero paths, and 94/94 breakage checks killed. Seven Minors are words, a contradiction on Account, a truncated line, a reopenable first run and four extra round trips on /me.

Scope: `origin/main` (`e9dc28c`) to `afdf5db`. Criteria (R2-AC-1…41) and flows written from the docs before the source was read; R2-AC-42…44, FLOW-R2-5b and FLOW-R2-12 were added after and are marked. Phase 3 started at the source; the sweep ran in this session (no Agent tool here), so **the eyes pass is the main session's to spawn** against `qa-artifacts/B08/first-run-accounts/diff/index.md` (run 1's `eyes.md` is still the committed one).

## Suites

| Run | Result |
|---|---|
| typecheck | clean |
| lint | clean |
| unit | pnpm test pass |
| security | pnpm security pass (audit, gitleaks whole history, lint rules); hygiene pass |
| db | pgTAP 462/462; API 198 pass, 13 skipped (GET-only sweep cases) |
| e2e | 1415/1415, six looks |
| lived | 24/24 |
| server | 7/7 |
| mutants | 94/94 killed, 0 surviving, 0 stale |
| diff | 10 trees changed, 12 entries with pixel changes, 1 unexplored (reading), 0 check findings; 8 metrics flags, all explained |
| qa flows | qa/e2e/b08r2-flows.spec.ts: 28 steps in 12 flows, 4 steps fail (findings 1, 2, 4, 9) |
| api probes | qa/B08/api-probes-r2.probe.ts: 24, 2 fail (findings 1, 10) |

## Findings

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | A category added before first run stops the starting list for good: no Cash, Unaccounted or Salary, ever | API: `category.add` (Pets) then `setup.start` as the same person (qa/B08/api-probes-r2.probe.ts › run 2: the seed). UI: FLOW-R2-12 — capture | R2-AC-5; spec §8, D33, D146 (2)(3) |
| 2 | Minor | Account says *Last checked 5 Nov* and, lower down, *Checks: Not checked yet* | FLOW-R2-6 step 2: Accounts → TNG eWallet. | R2-AC-31; D147 (2); screens.md `account` |
| 3 | Minor | On Accounts, Ryt's *Main account and pockets together* is cut to *…pockets toget…* at 390 px | FLOW-R2-6 step 1; catalogue `accounts` in minted light. | R2-AC-30; D147 (3); patterns §3 (a name truncates, meaning shouldn't) |
| 4 | Minor | After first run is finished, /s/first-run still opens at *Step 2 of 7* | FLOW-R2-4 step 1: finish first run, then open /s/first-run. | R2-AC-22; §9.5, D26 |
| 5 | Minor | Without Capture, /s/accounts says *Couldn't load your accounts. Check your connection* | FLOW-R2-10 step 4: a person without Capture opens /s/accounts. | R2-AC-32; patterns §7 Error; screens.md (a person sees only what they can use) |
| 6 | Minor | Offline, first run shows two offline banners that promise different things | FLOW-R2-5 step 1 or FLOW-R2-5b step 1: go offline on any first-run step. | R2-AC-41; patterns §7 Offline |
| 7 | Minor | The core `scan-after` journey still fails under the metrics run's load (on main too) | node scripts/qa-diff.mjs (metrics-head / metrics-base, journeys.spec with 3 workers) | D124 core journeys; run 1 finding 12 |
| 8 | Minor | `GET /api/me` now costs four more database round trips: `setupDone` is read in a second transaction | node scripts/qa-diff.mjs (metrics, pnpm test:db with QA_METRICS); medians from metrics/{base,head}/api.jsonl | D139 (metrics); D146 (1) |
| 9 | Note | In a plain browser, a name typed offline at step 6 is lost, though the step says Next saves it | FLOW-R2-5: capture person in a browser, /s/first-run, offline at step 6, type a name, Next, online, Finish. | D146 (8); R2-AC-26 |
| 10 | Note | The API makes an account for any package, a messaging app's included | POST /api/commands {type:'account.add', app:{package:'com.whatsapp', label:'WhatsApp'}, opening:10000, …} | D86, D145 |
| 11 | Note | After renaming Sen's Unaccounted, a new category may be called *Unaccounted*, and the picker offers it | category.edit Unaccounted → 'Gap'; category.add 'Unaccounted'; GET /api/categories?kind=spend | §8 |
| 12 | Note | The API marks setup done with no accounts at all | setup.start skipped; POST /api/commands {type:'setup.finish'} | D146 (4) |
| 13 | Note | A committed tree was stale and CI's tree check passed it | git diff apps/web/e2e/trees/first-run-name.aria.yml after node scripts/qa-diff.mjs | D137 (trees) |
| 14 | Note | On a server preview, Home after first run shows the skeleton's made-up figures | FLOW-R2-5 step 2 (any finish on the server preview) | flows.md first-run step 8 |
| 15 | Note | The catalogue's `first-run@apps` entry now holds the apps already chosen, so the fresh-person view is off watch | diff/index.md › first-run@apps | D137 (catalogue) |
| 16 | Note | The metrics walk the branch's journeys on main's build, so a journey the slice changed compares against an aborted walk | metrics/logs/metrics-base.log, confirm-steps-base.log | D139 |

### 1 · Major · A category added before first run stops the starting list for good: no Cash, Unaccounted or Salary, ever

`seed_categories()` seeds only when the person has **no** categories at all (D146 (3)). Someone with Capture who signs in from a plain browser is, by D146 (2), not sent to first run, and Settings → *Categories and rules* is open to them: it says *No categories yet · Categories show here once your first payment is in* and offers *Add a category*. Adding one (say *Pets*) means first run's `setup.start` later seeds nothing, so the person ends with one category: none of D33's list and none of the three Sen relies on (`system_key` salary, cash, unaccounted). B13's balance-check adjustments need Unaccounted and B10's salary cycles need Salary; nothing in the app can create them again. The empty state's words are also wrong for this person: categories come from first run, not from a first payment.

**Repro:** API: `category.add` (Pets) then `setup.start` as the same person (qa/B08/api-probes-r2.probe.ts › run 2: the seed). UI: FLOW-R2-12 — capture person in a browser, Settings → Categories → Add a category *Pets*, then open /s/first-run and continue.

**Output:**

```
[probe] category.add before start: 200; setup.start: 200 Setup continues; categories: 1; system: none
[r2] Categories before first run: Categories Rules No categories yet Categories show here once your first payment is in. Add a category
[r2] early categories after first run start: 1 [{"name":"Pets","system_key":null}]
```

Screenshots: `screens/FLOW-R2-12-step-1-categories-before.png`, `screens/FLOW-R2-12-step-3-first-run.png`

### 2 · Minor · Account says *Last checked 5 Nov* and, lower down, *Checks: Not checked yet*

D147 (2) makes the opening balance the account's first check, and the FactGrid shows it. The *Checks* card on the same screen still says *Not checked yet.*, because `checks` is `[]` until B13. One screen, two answers to the same question.

**Repro:** FLOW-R2-6 step 2: Accounts → TNG eWallet.

**Output:**

```
[r2] Account: TNG eWallet RM12.50 … Opening balance RM12.50 on 5 Nov Fed by Touch 'n Go eWallet Last checked 5 Nov Recent payments No payments on this account yet. Checks Not checked yet.
```

Screenshots: `screens/FLOW-R2-6-step-2-account.png`

### 3 · Minor · On Accounts, Ryt's *Main account and pockets together* is cut to *…pockets toget…* at 390 px

D147 (3)'s line, which tells the person what Ryt's one figure holds, truncates on one line beside the balance; TNG's wraps. Seen on the server walk and in the catalogue's own Accounts screen (*Main account and pocket…*). The words are what makes the figure checkable, so they shouldn't be the part that's cut.

**Repro:** FLOW-R2-6 step 1; catalogue `accounts` in minted light.

**Output:**

```
Rendered: "Main account and pockets toget…" (FLOW-R2-6-step-1-accounts.png) and "Main account and pocket…" (first-run--minted-light--10_accounts.png)
```

Screenshots: `screens/FLOW-R2-6-step-1-accounts.png`, `screens/first-run--minted-light--10_accounts.png`

### 4 · Minor · After first run is finished, /s/first-run still opens at *Step 2 of 7*

The router sends a person *to* first run until it's done, but nothing sends them *away* once it is: `FirstRun` renders the steps whatever `setupDone` says. In a browser (or any link to it) the steps come back, contrary to §9.5 *The setup steps don't come back* (D26). The Android back gesture from Home doesn't reach it (FLOW-R2-4 step 2 stays on Home), so on the phone it needs a link.

**Repro:** FLOW-R2-4 step 1: finish first run, then open /s/first-run.

**Output:**

```
[r2] /s/first-run after setup: http://localhost:4181/s/first-run Choose your apps Step 2 of 7 Sen reads notifications only from the apps you choose here. …
```

Screenshots: `screens/FLOW-R2-4-step-1-first-run-again.png`

### 5 · Minor · Without Capture, /s/accounts says *Couldn't load your accounts. Check your connection*

The API answers 403 `capture_off` (right, D146 (7)), but the screen shows the generic load error: it blames the connection and offers *Try again*, which can never work. patterns §7 *Error*: what happened and what to do next. Reached by a typed or old link only (More hides Accounts).

**Repro:** FLOW-R2-10 step 4: a person without Capture opens /s/accounts.

**Output:**

```
[r2] /s/accounts without capture: Couldn't load your accounts Check your connection, then try again. Nothing you've added is lost. Try again
```

Screenshots: `screens/FLOW-R2-10-step-4-accounts-url.png`

### 6 · Minor · Offline, first run shows two offline banners that promise different things

The frame's banner (*What you add is kept and syncs when you're back*) and first run's own (*What you've typed is kept; Next saves it once you're back online*) stack at the top of each step. patterns §7: offline is *a banner*. Two, with different promises, read as two states.

**Repro:** FLOW-R2-5 step 1 or FLOW-R2-5b step 1: go offline on any first-run step.

**Output:**

```
[r2] offline Next at step 5: You're offline. What you add is kept and syncs when you're back. Your accounts Step 5 of 7 You’re offline. What you’ve typed is kept; Next saves it once you’re back online. …
```

Screenshots: `screens/FLOW-R2-5-step-1-offline-name.png`, `screens/FLOW-R2-5b-step-1-offline-next.png`

### 7 · Minor · The core `scan-after` journey still fails under the metrics run's load (on main too)

Run 1's finding 12, still open (the handoff lists it as a follow-up): the step waits for the 0.4–0.8 s *Reading receipt…* screen and misses it with three workers. It fails on the base branch as well, so it's standing, not this slice's. It passes in `pnpm e2e` (1415/1415).

**Repro:** node scripts/qa-diff.mjs (metrics-head / metrics-base, journeys.spec with 3 workers)

**Output:**

```
✘ 14 [metrics-head] › e2e/journeys.spec.ts:953:3 › scan-after (27.6s)
  Locator: getByText('Reading receipt…')  Expected: visible  Timeout: 20000ms  Error: element(s) not found
✘ 14 [metrics-base] › e2e/journeys.spec.ts:953:3 › scan-after (27.3s)
```

### 8 · Minor · `GET /api/me` now costs four more database round trips: `setupDone` is read in a second transaction

Metrics flag `api:GET /api/me 200` api.queries 10 against main's 6. Cause, measured: the four extra statements are one more `asPerson` transaction (begin, `set_config('app.user_id', …)`, the `user_settings` select, commit) that `/me` opens after the access lookup's own, only to read `setup_done_at`. `/me` is read at every app start and by the router's first-run rule, and on Neon each round trip is a network hop. Folding the read into the transaction the request already has (or reading it with the access row) removes them.

**Repro:** node scripts/qa-diff.mjs (metrics, pnpm test:db with QA_METRICS); medians from metrics/{base,head}/api.jsonl

**Output:**

```
base /api/me n 3 queries med 6 appMs med 12 dbMs med 3.5
head /api/me n 6 queries med 10.0 appMs med 11.75 dbMs med 5.35
```

### 9 · Note · In a plain browser, a name typed offline at step 6 is lost, though the step says Next saves it

Offline, *Next* on *Your name* fires `setting.set`, which in a browser fails at once (toast *Couldn't save. Check your connection · Retry*) while first run moves on to step 7; after reconnecting and *Finish*, `own_names` is `{}` and only the payday was saved. A capture person isn't routed to first run in a browser (D146 (2)), and in the shell the write goes to the native outbox, which this cloud session can't run. So the routed path is untested: queued as phone step 8 in docs/local.md.

**Repro:** FLOW-R2-5: capture person in a browser, /s/first-run, offline at step 6, type a name, Next, online, Finish.

**Output:**

```
user_settings.own_names = {} ; audit_log: setup.finish 23:50:19.949, you.payday 23:50:19.952 (no you.bankNames)
```

Screenshots: `screens/FLOW-R2-5-step-1-offline-name.png`, `screens/FLOW-R2-5-step-2-online-finish.png`

### 10 · Note · The API makes an account for any package, a messaging app's included

`account.add` checks the package's shape only, not that it's one of the person's chosen apps, nor D86's never-choosable kinds. The screens only offer chosen apps, so this is defence in depth: B09 maps a chosen app's `{account}` names to its account.

**Repro:** POST /api/commands {type:'account.add', app:{package:'com.whatsapp', label:'WhatsApp'}, opening:10000, …}

**Output:**

```
[probe] account.add for com.whatsapp: 200 {"said":"WhatsApp added","undo":{"type":"account.archive",…}}
```

### 11 · Note · After renaming Sen's Unaccounted, a new category may be called *Unaccounted*, and the picker offers it

Harmless to the rules (the system key stays on the renamed one), but the picker then shows a category named Unaccounted, which §8 says is never picked by hand.

**Repro:** category.edit Unaccounted → 'Gap'; category.add 'Unaccounted'; GET /api/categories?kind=spend

**Output:**

```
[probe] add "Unaccounted" after rename: 200; picker has: Unaccounted
```

### 12 · Note · The API marks setup done with no accounts at all

`setup.finish` doesn't check that an account was saved for each chosen app; the screens do (every balance is asked for, D146 (4)).

**Repro:** setup.start skipped; POST /api/commands {type:'setup.finish'}

**Output:**

```
[probe] finish with no accounts: 200; setupDone true
```

### 13 · Note · A committed tree was stale and CI's tree check passed it

`apps/web/e2e/trees/first-run-name.aria.yml` still recorded `/placeholder: TAN WEI MING`, which run 1's fixes (f6d20f9) removed from the name field; `pnpm e2e` passed 1415/1415 over it. The diff run rewrote the tree (left uncommitted for the parent to commit). The tree match doesn't notice a dropped placeholder.

**Repro:** git diff apps/web/e2e/trees/first-run-name.aria.yml after node scripts/qa-diff.mjs

**Output:**

```
-    - textbox "Your name":
-      - /placeholder: TAN WEI MING
-      - text: tan wei ming
+    - textbox "Your name": tan wei ming
```

### 14 · Note · On a server preview, Home after first run shows the skeleton's made-up figures

Run 1 note 16, unchanged: Home is B13's. A new person who typed RM3,478.49 sees *Total balance RM29,871.77* and a payday plan. On the skeleton build Home is right (*Spent since you started RM0.00*, total RM9,725.50).

**Repro:** FLOW-R2-5 step 2 (any finish on the server preview)

**Output:**

```
Home: Payday plan · 2 of 3 · Left until payday RM1,931.27 · Total balance RM29,871.77
```

Screenshots: `screens/FLOW-R2-5-step-2-online-finish.png`

### 15 · Note · The catalogue's `first-run@apps` entry now holds the apps already chosen, so the fresh-person view is off watch

Head's tree for `/s/first-run?scenario=new` (apps) has all four switches on and no *Suggested · Sen found 4 banks and e-wallets · Choose these 4* card; main's had the card. A fresh browser still shows the card (FLOW-R2-1 step 1), so the screen is right, but the entry that guards the first thing a new person sees now records a different state.

**Repro:** diff/index.md › first-run@apps

**Output:**

```
-  - paragraph: Suggested
-  - paragraph: Sen found 4 banks and e-wallets on this phone.
-  - button "Choose these 4"
+    - switch "Touch 'n Go eWallet" [checked]
```

Screenshots: `screens/FLOW-R2-1-step-1-apps.png`

### 16 · Note · The metrics walk the branch's journeys on main's build, so a journey the slice changed compares against an aborted walk

`first-run` and `balance-check` fail on the base side ("In 4 accounts" isn't on main, which has 5), so main's numbers for those steps are missing or belong to different taps. Five of the eight flags come from that (first-run/7, /18, /20, balance-check/1, /5). The reviewer measured them directly instead (verdicts in the ledger). The tooling could mark a flag whose base walk failed.

**Repro:** metrics/logs/metrics-base.log, confirm-steps-base.log

**Output:**

```
✘ 17 [metrics-base] › first-run (30.9s)
✘ 25 [metrics-base] › balance-check (24.1s)  Locator: getByText('In 4 accounts') … element(s) not found
```

## Probes (phase 3): one deliberate defect each, then restored

| Broke | Caught | What went red, and the entry to keep |
|---|---|---|
| categories_own_select policy USING (true) in 0013 | yes | pgTAP rls.sql 6 failed (56-58, 200-202), catalogue.sql 4 failed. Keep: b08-categories-select-open (packages/db/migrations/0013_b08_ledger.sql, find the categories_own_select USING clause, replace USING (true), suite db) |
| account_balances created without security_invoker | yes | pgTAP ledger.sql 39, 42-44 and catalogue 1-4 failed. Keep: b08-balance-view-definer (0014, find "CREATE VIEW account_balances WITH (security_invoker = true) AS", replace "CREATE VIEW account_balances AS", suite db) |
| GET /categories offers Unaccounted (filter line removed) | yes | ledger.test.ts › seeds the starting categories once (D33), and Unaccounted is never offered went red. Keep: b08-picker-offers-unaccounted (apps/api/src/ledger.ts, remove the `is distinct from 'unaccounted'` line, suite db) |
| account.add without onConflictDoNothing (a retry is no longer a no-op) | yes | ledger.test.ts › one per app, with today’s balance as its opening went red. Keep: b08-account-add-retry (ledger.ts, drop the onConflictDoNothing on account.add, suite db) |
| setup.finish updates setup_done_at on every call | yes | ledger.test.ts › finishes once, and says so on /me went red. Keep: b08-finish-overwrites (ledger.ts, `.where(and(eq(t.userId, me), isNull(t.setupDoneAt)))` → `.where(eq(t.userId, me))`, suite db) |
| first run offers a card wallet (Google Wallet) an account | yes | logic.test.ts › suggests one account per chosen app … none for a card wallet went red. Keep: b08-card-wallet-account (apps/web/src/screens/outside/logic.ts, drop `&& a.kind !== 'wallet'`, suite web) |
| senFromDb accepts "12.5" (a fraction) from the database | yes | money.test.ts › refuses anything that isn’t whole sen, never rounding went red. Keep: b08-sen-from-db-fraction (packages/core/src/money.ts, regex adds (?:\.[0-9]+)?, suite unit) |
| app.user_id set session-wide (is_local false) | yes | 14 API tests red across 3 files; already in qa/mutants.ts as user-id-session-wide |

All eight caught. The project's own breakage checks: 94/94 killed, none surviving, none stale (run 1 had 2 stale; both fixed). Probes ran in the `.git/sen-qa/probes` worktree against a database of their own (`sen_probe`), never this checkout; `git status` shows only QA's files, `docs/local.md` and the tree the diff run rewrote.

## Backend (phase 4)

- **RLS matrix** (fixture: Aisyah admin, Ben, Chong), count of Ben's rows:

| Table or view | no user id | Ben (owner) | Chong (B) | Aisyah (admin) | sen_auth role | sen_owner |
|---|---|---|---|---|---|---|
| accounts | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| account_names | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| categories | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| transactions | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| account_balances | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| balance_totals | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |
| user_settings | 0 | 1 | 0 | 0 | 42501 | 1 (owner, migrations only) |

  Chong writing Ben's rows: INSERT → *new row violates row-level security policy*; UPDATE → 0 rows; moving `user_id` → *permission denied*. No split-link function exists yet. The admin's functions return no money columns. Pooled connections: the `user-id-session-wide` probe turned 14 API tests red.
- **Balance view, worked by hand:** TNG opening 100000 at 12:00 KL; +5000 at 12:00:01; −1250; −999 at exactly 12:00 (not counted); −700 at 11:59:59 (not counted); −12000 with my_share 4000; −300 tombstoned. Expected 100000 + 5000 − 1250 − 12000 = **91750**; the view said `5000 | 13250 | 91750`. Ryt: −1 sen 1 µs after its opening → −1. Total over live tracked accounts = **91749** (archived 777 and Elsewhere's 50000 in left out). A corrected opening (100500) kept `opening_at` and moved the balance to 92250.
- **Routes:** the sweep covered the generic cases for every route (13 GET-only cases skip by design). Own probes: NUL in names and labels → 400 `invalid`; payday 0, 32, 15.5, "15", weekly, a string, null → 400 shaped; opening 12.5, "12.50", 1e20, MAX_SEN+1 → 400 with nothing stored; two `account.add` for one app at once → 200 + 409 `account_exists`, one live; bringing an archived account back over a newer one → 409 *That app already has an account in Sen. Each app has one.*

## Cost (phase 4b)

Eight flags, each with a measured cause and a verdict in `qa/B08/ledger.md` § *QA run 2: the metrics flags*. One isn't accepted (finding 8, `/me`). Five come from the metrics walking this branch's changed journeys on main's build, where they fail (finding 16).

## What changed on screen (phase 5)

10 trees changed. Each traces to D145 (one account per app: *In 4 accounts*, GO+ gone from the balance check and first run), D147 (*Checked*, what each figure holds), the brief (Account's *Edit*, Categories' *Add a category*) or new empty-state words. One isn't wanted: the catalogue's `first-run@apps` state (finding 15). 0 check findings. 1 unexplored (`reading`, as in run 1, not this slice).

## Flows walked

| Flow | Status | Steps |
|---|---|---|
| FLOW-R2-1 First run, the owner's whole way | pass | 5 |
| FLOW-R2-2 Closed at step 4, and at step 5 mid-typing | pass | 2 |
| FLOW-R2-3 An empty balance, then 0 | pass | 2 |
| FLOW-R2-4 Steps never come back | fail | 2 |
| FLOW-R2-5 Offline at the name step (a plain browser) | fail | 2 |
| FLOW-R2-5b Offline at the accounts step (run 1 finding 10) | pass | 2 |
| FLOW-R2-6 Accounts and Account | fail | 2 |
| FLOW-R2-8 Settings → Categories: Cash and Unaccounted | pass | 2 |
| FLOW-R2-9 Settings → You | pass | 1 |
| FLOW-R2-10 Without capture | pass | 4 |
| FLOW-R2-11 In New York | pass | 1 |
| FLOW-R2-12 A category added in a browser before first run | fail | 3 |
| FLOW-R2-C2 pay-new (core), in the sweep's journeys.spec | pass | 3 |
| FLOW-R2-C3 scan-after (core), in the sweep's journeys.spec | pass | 5 |
| FLOW-R2-C1 first-run (core) on the skeleton, in the sweep's journeys.spec | pass | 3 |

Run 1's fixed findings re-checked: 1 (RM0.00 typed) fixed (FLOW-R2-3); 2 (a lost save) covered by the retry probe and FLOW-R2-5b; 5 (archived accounts, *Bring back*) fixed (API probe); 6 (Cash locked on in the short first run) fixed (FLOW-R2-10); 9 (*Finishing…*) fixed (filmstrip first-run/18); 10 (offline at step 5) fixed (FLOW-R2-5b); 8 (stale breakage checks) fixed (none stale); 12 still open (finding 7).

## What I couldn't test, and why

- **First run on the Xiaomi itself: the shell's seven steps with real notification access, Keep Sen running, and closing the app at step 4**: needs the device; it is the owner's B08 phone steps 1-7 in docs/local.md.
- **A name typed offline at step 6 surviving through the shell's native outbox (D146 (8))**: the outbox is Kotlin; queued as phone step 8 in docs/local.md.
- **Home's *Capture is off* warning after *Skip for now* on access (R2-AC-28)**: the warning reads the shell's listener; a browser has none.
- **The security review of the diff (D144)**: the main session runs it; a reviewer has no part in it.
- **The Kotlin outbox v5 emulator tests**: need the Android SDK and an emulator; CI runs them.
- **The eyes pass**: this session has no Agent tool; the main session spawns `qa-eyes` on the diff report.

New QA files (uncommitted, for the main session to commit): `qa/B08/{acceptance,flows,ledger}.md` (run 2 sections), `qa/B08/results.json`, this report, `qa/B08/api-probes-r2.probe.ts`, `qa/e2e/b08r2-*` (flows spec, config, setup, four measuring probes), `docs/local.md` (B08 phone step 8), and `apps/web/e2e/trees/first-run-name.aria.yml` as the diff run rewrote it.
