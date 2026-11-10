# QA B08 · First run, accounts and categories: run 3 (fresh full run, 10 Nov)

Published report: https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv · Run 2: [report-run2.md](report-run2.md)

```
VERDICT   fix first
          52 criteria, 49 pass, 1 fail, 2 not reachable
          phases run: 1-6      screenshots: qa-artifacts/B08_first-run-accounts/screens/ (27)
```

Branch `B08/first-run-accounts` at 2aada0f1, against `origin/main` e9dc28c1 (local `main` is stale at baa4b0e;
everything here used `origin/main`). Criteria (`R3-AC-*`) and flows (`R3-FLOW-*`) were written from the docs
before the source was read: `qa/B08/acceptance.md` and `flows.md`, *Run 3* sections. This session had no Agent
tool, so the reviewer ran the sweep itself (`qa-artifacts/…/sweep/index.md`), and **the eyes pass is still to
spawn** (main session) on `qa-artifacts/B08_first-run-accounts/diff/index.md`.

## Suites

| Suite | Result |
|---|---|
| typecheck, lint, unit | exit 0 |
| security | PASS audit, PASS gitleaks (409 commits, no leaks; v8.30.1 built from source), PASS lint |
| hygiene | exit 0 |
| test:db | pgTAP 462 ok; API 199 pass, 13 skipped (the route sweep's `runIf` for GETs) |
| e2e | 1415/1415 (50.5 min) |
| e2e:lived | 24/24 |
| e2e:server | 7/7 |
| breakage checks | 112/113 killed (11 new run-3 entries in `qa/mutants.ts`; 1 survives) |
| diff | 10 trees changed, 12 entries' pixels changed, 1 unexplored (`reading`, standing), 0 check findings; 9 metrics flags |
| QA's own (`qa/e2e/b08r3-flows.spec.ts`) | 8 specs, 7 pass; 1 fails on finding 2 (a pin) |

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | No test pages the offline copy past one page; a breakage there survives | `node scripts/mutants.mjs --only b08r3-changes-page-skips` | D146 (9), §5 |
| 2 | Minor | Accounts says *In 1 accounts* | one account → More → Accounts | R3-AC-22 |
| 3 | Minor | A taken category name shows as a toast over the sheet, not under the Name field | rename a category to *meals* | R3-AC-24.s, R3-AC-29; patterns.md §7 |
| 4 | Minor | First run's empty balances show *RM 0.00* beside *Type today’s balance, or 0.* | step 5, Next with nothing typed | R3-AC-29 |
| 5 | Minor | `balance-check.aria.yml` committed stale; `pnpm e2e` passed over it | `git diff apps/web/e2e/trees/balance-check.aria.yml` | D137 |
| 6 | Minor | More → Accounts settles ~0.4 s later than main in the harness; cause not found | harness re-run below | D139 |
| 7 | Minor | An app chosen after first run gets no account, and nothing can add one | Settings → Capture → apps after first run, then Accounts | D145, D86, §7 |
| 8 | Note | A numeric 10.5 written straight to the DB is stored as 11 | psql insert | money |
| 9 | Note | The API accepts a negative opening balance | `account.add … opening:-500` | §7 |
| 10 | Note | A retried `account.add` with a new name says *Changed added* (nothing changed) | same id twice | §6.7 |
| 11 | Note | A category name can hold U+202E (shows reversed) | `category.add` | §8 |

### 1 · Major · No test pages the offline copy past one page
`/sync/changes` pages five tables by one counter: a page ends at the 500th lowest version across all of them
(D146 (9)). Mutant: `const top = all.at(-1) ?? since` (the highest version seen) skips, permanently, every row of a
table with more than a page left. The phone's copy for the category prompt and B09's account names would silently
miss rows. No suite went red:
```
b08r3-changes-page-skips: SURVIVED (13 s)
 Test Files  5 passed (5)
      Tests  199 passed | 13 skipped (212)
```
The only paging assertion is `apps/api/test/ledger.test.ts:365  expect(down.body?.more).toBe(false);`. The code
is correct today. As F (600 categories, 2 accounts, 300 account names, a settings row):
```
v 672 more true cats 498 accts 2 names 0 own null
v 1075 more false cats 102 accts 0 names 300 own ["TAN F"]
received 902 unique 902; expected 902
```
Major by the rule: a guard on a critical path that no test holds. Keep the mutant; add a test that pages >500 rows
across two tables.

### 2 · Minor · *In 1 accounts*
`apps/web/src/screens/money/accounts.tsx`: ``In {v.tracked.length} accounts``. Pin: `R3-FLOW-5b` fails:
`Locator: getByText('In 1 account', { exact: true }) — element(s) not found`. Screenshot
`R3-FLOW-5b-step-1-one-account.png`.

### 3 · Minor · A taken name in a toast, not at the field
The API answers `409 {"code":"name_taken","message":"You already have a category with that name.","field":"name"}`;
`useWrite` turns it into a toast, which covers the *Discretionary* switch. The Name field stays unmarked (field
errors with that text: 0). patterns.md §7 *Forms*: a Field's message is below it. Same path for *Add a category*.
`R3-FLOW-6-step-3-taken-name.png`.

### 4 · Minor · *RM 0.00* placeholders beside *or 0*
Step 5 with nothing typed shows four large slate *RM 0.00* placeholders; Next puts *Type today’s balance, or 0.*
under each. Someone with an empty wallet is told to type what they already see. Run 1 removed the same kind of
placeholder from the name and payday fields. `R3-FLOW-3-step-1-empty-refused.png`.

### 5 · Minor · A stale committed tree
```
-        - paragraph: /Ryt Bank Sen has RM \d+,\d+\.\d+/
+        - paragraph: /Ryt Bank Sen has RM \d+,\d+\.\d+ Main account and pockets together/
-        - paragraph: /TNG eWallet Sen has RM \d+,\d+\.\d+/
+        - paragraph: /TNG eWallet Sen has RM \d+,\d+\.\d+ eWallet and GO\+ together/
```
D147 (3)'s lines are missing from the committed tree, and 1415 e2e passed. The tree match takes a regex as a
prefix, so text added after it goes unnoticed (run 2 saw a dropped placeholder pass the same way). This is a
tooling gap. The rewritten tree is left uncommitted for the parent.

### 6 · Minor · An unexplained flag: More → Accounts
`step:balance-check/1` (and `first-run/20`, the same tap). Harness re-run, 3 each (`-g balance-check
--repeat-each 3`): head 816 / 864 / 869 ms, main 446 / 468 / 511 ms. In the filmstrip the list skeleton stays up
the whole second. Outside the harness (`qa/e2e/b08r3-accounts-open.probe.mjs`) I used the same two `dist-qa`
builds, the service worker, the CPU 4× slower and the harness's network. Time to the total: head 579 / 536 / 565 /
666 ms, main 604 / 603 / 558 / 540 ms. Last DOM change: head 548 / 476 / 525 / 627 ms, main 549 / 534 / 519 /
490 ms. Nothing changed after the content. A fresh page tapped at once gave head 585–676 ms, main 604–780 ms.
The harness sees something my probe doesn't, so the cause is not found.

### 7 · Minor · An app chosen later gets no account
`account.add` is only sent by first run's step 5. After first run with one app, choosing TNG, Public Bank and
Grab in Settings → Capture leaves `select count(*) from accounts` = 1, and Accounts has no *Add*
(`R3-FLOW-9-step-2-accounts-no-add.png`). D145 says each chosen app feeds one account, and B09 will capture
payments from those apps with no account to book them to. The spec doesn't say when such an account is made: an
open question for the owner, beside run 2's note 13 (un-chosen apps).

### 8–11 · Notes
- 8: `insert … opening_balance … 10.5` as app_user → `select opening_balance` = `11`. Only the API writes, and
  zod refuses non-integers (`Invalid input: expected int, received number`).
- 9: `{"type":"account.add",…,"opening":-500}` → `{"said":"Neg added",…} [200]`. The phone can't type a minus,
  and the spec doesn't say whether an account can open below zero.
- 10: the same id with name *Changed* → `{"said":"Changed added"}`; the row stays *Grab*.
- 11: `‮slaeM` saved: `{"said":"‮slaeM added"}`.

## Backend, by hand (`sen_qa`, my own database)

- **Balance view**, worked out by hand first. Ryt opens at 10000 at T, with in 5000 at T+1s, out 2000 at T+1s,
  out 1 at T+1µs, in 100000 at exactly T, out 700 at T−1s, and a deleted out 333. Expected 10000 + 5000 − 2001 =
  12999. View: `12999` (money_in 5000, money_out 2001). TNG 5000. Archived PBe 99000, kept out of the total.
  `balance_totals` = `17999`, accounts 2. Elsewhere: no row.
- **RLS matrix** (rows visible / of them A's):

| Table or view | no user id | user A | user B | admin | sen_auth | owner role |
|---|---|---|---|---|---|---|
| accounts | 0/0 | 4/4 | 1/0 | 0/0 | permission denied | 5 (owner: migrations only) |
| account_names | 0/0 | 0/0 | 0/0 | 0/0 | permission denied | 0 |
| categories | 0/0 | 21/21 | 21/0 | 0/0 | permission denied | 42 |
| transactions | 0/0 | 7/7 | 0/0 | 0/0 | permission denied | 7 |
| user_settings | 0/0 | 0/0 | 0/0 | 0/0 | permission denied | 0 |
| account_balances | 0/0 | 3/3 | 1/0 | 0/0 | permission denied | 4 |
| balance_totals | 0/0 | 1/1 | 1/0 | 0/0 | permission denied | 2 |

  B's writes against A: a transaction or account name on A's account → FK violation (`Key is not present`, the
  same for a missing id); an insert with A's user_id → RLS; `UPDATE` of A's account → `UPDATE 0`; `user_id`,
  `opening_at`, `notifier_package`, `system_key` → `permission denied` (column grants); `DELETE` → denied. The
  pooled connection: after `set_config(…, true)` and commit, `app.user_id` reads `''` and 0 accounts are visible.
  The split-link function doesn't exist yet. `admin_members` returns no money columns.
- **Routes**, each with its own meaning. Everything is structured, with no 500 and no stack trace.
  - `account.add`: valid → 200; the same id again → no-op; a second for the app → 409 `account_exists`; 4 in
    parallel → 1 row; missing, float, text or huge openings → 400 with `field:opening`; 61 characters → *Keep it
    to 60 characters.*; blank → *Type a name.*; package `../etc` → 400; SQL text stored as text; Elsewhere with
    a balance → 400.
  - `account.edit` and `account.archive` on another's id → 404. A corrected opening keeps `opening_at`.
    *Bring back* over a newer live account → 409 in words.
  - Categories: rename Cash keeps `system_key`; archive Cash or Salary → 409 `system_category`; flags on
    Unaccounted or Salary → 409; a taken name, case-folded → 409 `name_taken`; NUL → 400; 41 characters → 400;
    `?kind=bogus` → 400.
  - First run: `setup.start` × 6 in parallel plus 2 adds → 23 categories; a category added before first run →
    22 with the 3 system ones; `setup.finish` twice keeps the first time.
  - Capture off: `/accounts` and `account.add` → 403 `capture_off`.

## Breakage checks: the run-3 probes (now in `qa/mutants.ts`)

| Mutant | Caught |
|---|---|
| `b08r3-balance-counts-deleted`: the view counts deleted payments | yes (db) |
| `b08r3-total-counts-archived`: the total counts archived accounts | yes (db) |
| `b08r3-seed-flag-drift`: Shopping without discretionary | yes (pgTAP) |
| `b08r3-system-category-archivable`: the system-kept check dropped | yes (db) |
| `b08r3-accounts-insert-open`: accounts INSERT `WITH CHECK (true)` | yes (db) |
| `b08r3-adjustment-anywhere`: an adjustment in any category | yes (db) |
| `b08r3-accounts-list-archived`: `/accounts` lists archived | yes (API) |
| `b08r3-account-add-without-capture`: no capture check on add | yes (API) |
| `b08r3-changes-page-skips`: the page ends at the highest version | **no: finding 1** |
| `b08r3-unchosen-app-account`: an un-chosen app offered an account | yes (web) |
| `b08r3-no-short-first-run`: no short first run without capture | yes (web) |

All 11 are worth keeping; they're already in the file (uncommitted). `git status` shows only `qa/` and the tree
the diff run rewrote.

## Metrics: each flag's verdict

| Flag | Cause (measured) | Verdict |
|---|---|---|
| `screen:sen` console 9 (main 0) | Traces from `QA_ONLY='["sen","home"]' QA_RUNS=3 … --trace on`: every message is Chromium's *A preload for '…/assets/react-….js' is found, but is not used because it is a cross-world service worker resource mismatch*. Main re-run the same way: sen 0 / 3 / 6, 9 of the same warning. Head's index.html has 29 modulepreloads, main's 26 (+logic, registry, uid). (`screen:sen` opens `/`; the sheet isn't opened in the metrics) | Accepted: main shows it too. Follow-up: the console metric should ignore this browser warning, or the service worker should answer modulepreloads |
| `settings/capture/access@capture-off` blocking 758 (main 440) | `qa/e2e/b08r3-blocking.probe.mjs`, 5 each: main 400–593 (median 458), head 415–526 (median 512) | Noise: the samples overlap |
| `first-run/7` settle 187 (main 69) | Filmstrip: Next on an empty step 5 now draws four field errors (validation is new in B08) | Accepted: by design (R3-AC-18.s), far under 1000 ms |
| `first-run/18` settle 1354 (no main) | Filmstrip: *Finishing…* for 3 frames, then the route's `Suspense` fallback (`ListSkeleton` in `router.tsx`, Home's chunk loading) for ~6 frames, then Home's own skeleton for ~6, then content. Two skeleton shapes in a row | Accepted as the first open of a lazy screen (screen.settleMs is standing on 83 screens). Follow-up: preload Home's chunk during step 7 (a proposal, not measured) |
| `first-run/20`, `balance-check/1` settle 1308 / 1141 (main 476) | Harness re-run 816–869 against 446–511; my probe equal (see finding 6) | **Unexplained: finding 6** |
| `split-mine/9` settle 389 (main 174) | Harness re-run, 3 each: head 131 / 331 / 361, main 322 / 328 / 383 | Noise: overlaps (B08 doesn't touch splits) |
| `balance-check/5` first change 112 (no main) | Harness re-run: 104 / 112 / 96 | Accepted: within 12 ms of the limit; step.firstChangeMs is standing on 81 taps |
| `api GET /sync/changes` queries 14 (main 10) | The route now runs 5 SELECTs (capture_apps, categories, accounts, account_names, user_settings) instead of 1: +4 = 14 − 10 | Accepted: by design (D146 (9)). Follow-up: one `UNION ALL` if Neon's round trips start to show |

## Changed screens (phase 5)

Every tree change traces to the brief, D145, D146 or D147:
- *Accounts 5 → 4* on More, and GO+ merged into TNG (D145).
- What each figure holds, and *Checked* from the opening (D147 (2), (3)).
- *Add a category* on Categories (the brief).
- Accounts without capture says why (D146 (7)).
- First run's apps and name states.
- Payments' count 1,151 → 1,139 and GO+ rows on *TNG eWallet* (D145, made-up data).

No change appeared that nothing asked for. Check findings: none. Unexplored: `reading` (standing, not B08's).
**Eyes pass: not run here.** The main session spawns `qa-eyes` on the diff report.

Flows: walked at 390×844 in Minted light (`qa/e2e/b08r3-flows.spec.ts`, `b08r3.config.ts`), against the API on
`sen_qa`, each step asserted and then screenshot. Also walked:
- the timezone check, in America/Los_Angeles: an account opened 00:30 KL on 10 Nov reads *10 Nov*, never *9 Nov*
- the core journeys (`first-run`, `pay-new`, `scan-after`), passing in the sweep's e2e

## What I couldn't test, and why

- **First run inside the shell:** who is held there, and the real native steps. It needs the phone; the browser
  walks the simulator. B08's phone steps are already queued in `docs/local.md`. R3-AC-16 is *not reachable*.
- **The shell's offline copy (Outbox v5) and its androidTest:** no emulator in a cloud session; CI runs them.
- **The eyes pass:** no Agent tool in this session, so the main session spawns it.
- **The security review (D144):** the main session's.
- **Accounts' empty and error states** (R3-AC-22.s): not walked by me; the catalogue covers them in the sweep.
- **Kotlin core tests:** `apps/shell/core` is unchanged against `origin/main`.
