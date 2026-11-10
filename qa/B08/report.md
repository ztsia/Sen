# QA B08 · First run, accounts and categories: run 4 (fresh full run, 10 Nov)

Published report: https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv · Run 3: [report-run3.md](report-run3.md)

```
VERDICT   fix first
          74 criteria, 69 pass, 1 fail, 4 not reachable
          phases run: 1-6      no Blocker, no Major; 6 Minor, 6 Notes
```

Written by the main session from the reviewer's final message (the harness refused its write). Criteria
(`R4-AC-*`) and flows (`R4-FLOW-*`) were written from the docs before the source was read: `acceptance.md` and
`flows.md`, *Run 4* sections. The reviewer had no Agent tool, so it ran the sweep itself; the main session runs
the eyes pass (`eyes.md`) and the D144 security review.

The slice does what its brief asks when driven for real: the database rules, RLS, the balances worked out by
hand, first run end to end, adding an app later (D148), and every screen it made real. All 113 existing breakage
checks died. What holds it back: 5 of 7 new probes survived (findings 1 and 2), one failing criterion
(`my_share` has no default), and one broken Accounts state.

## The sweep

| Check | Result |
|---|---|
| typecheck, lint, unit | all pass |
| `pnpm security` | PASS (gitleaks built from source) |
| hygiene | pass |
| `test:db` | pgTAP 462/462; API 202 pass, 13 skipped (body-only sweep cases, which don't apply to GETs) |
| `e2e` | 1416 pass, 1 fail: `capture-off`, which passes 3/3 alone (note 7) |
| lived-in journeys | 24/24 |
| `e2e:server` | 7/7 |
| breakage checks | 113/113 killed |
| Kotlin core | 65/65 |
| diff | 10 trees and 12 entries' pixels changed, 0 check findings, 1 unexplored (`reading`, standing) |

The sweep script hit its 2-hour limit while the diff measured metrics; the reviewer finished it with a scratch
copy of the script that kept both finished catalogue runs. Every on-screen change is one the brief or a decision
calls for: GO+ folded into TNG (D145: Accounts 5 → 4, Payments 1,151 → 1,139 rows, the balance check), the
account lines and *Checked* (D147 (2), (3)), D148's *Not added yet*, first run's accounts step, a disabled row on
Capture → apps keeping its reason readable, *Add a category*, and *No accounts here* without Capture.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Minor | No test holds the Unaccounted trigger's other half: an adjustment may book there, and can't later become a spend | two edits to `0014`; pgTAP stays 462/462 | R4-AC-8.s, §7, §8, D146 (6) |
| 2 | Minor | Nothing tests the Capture check on `GET /accounts/:id`, `account.edit` or `account.archive` | delete `needsCapture`; suites stay green | D146 (7) |
| 3 | Minor | Accounts goes wrong after an app's only account is archived | R4-FLOW-12 | D147 (4), D148 |
| 4 | Minor | `transactions.my_share` defaults to NULL, not `amount`, and nothing records what NULL means | insert a spend | R4-AC-13 (fails), §7, §15 |
| 5 | Minor | A stale accessibility tree passes CI | qa-diff rewrote it | D137 |
| 6 | Minor | Still unexplained (run 3's finding 6): the harness times More → Accounts at about twice main | `qa/B08/accounts-tap*.probe.mjs` | phase 4b |
| 7 | Note | `capture-off` failed once in the sweep; passes 3/3 alone | `-g capture-off --repeat-each 3` | |
| 8 | Note | The API makes an account for any package, `com.whatsapp` included (run 2's note 10, still open) | api-probes-r2 | D86, D145 |
| 9 | Note | A zero-width space makes a second category that reads "Meals" | `category.add 'Me​als'` | §8 |
| 10 | Note | Backspace from 0.01–0.09 empties a money field instead of showing 0.00 | `typedSen` | D132, D147 (1) |
| 11 | Note | The database rounds a numeric opening of 10.5 to 11; only the API's integer check stands in front | psql as `app_user` | money |
| 12 | Note | On a preview with the real API, Home shows the skeleton's made-up figures right after first run | R4-FLOW-4 | D146 (10) |

### 1 · The Unaccounted trigger's other half is untested

Two single edits to `packages/db/migrations/0014_b08_ledger_functions.sql` each leave the database tests green:
- **(a)** `IF k = 'unaccounted' AND NEW.kind <> 'adjustment' THEN` → `IF k = 'unaccounted' THEN`. With this,
  B13's balance check could never book its gap.
- **(b)** `… UPDATE OF category_id, kind ON transactions` → `… UPDATE OF category_id ON transactions`. With this,
  an adjustment in Unaccounted can be updated into a hand-picked spend there.

```
(a) All tests successful. Files=6, Tests=462 … Result: PASS
(b) All tests successful. Files=6, Tests=462 … Result: PASS
```

Unbroken, as `app_user`: `adjustment into Unaccounted: ok`; `UPDATE kind='spend' on it: error:23514 Unaccounted
can't be picked: only a balance check books to it`. The trigger checks the kind but not the source: an
adjustment with `source = 'manual'` is accepted.

### 2 · Three Capture checks hold no test

Removing `needsCapture` from each in `apps/api/src/ledger.ts`, one at a time:
```
GET /accounts/:id  → Tests 202 passed | 13 skipped
account.edit       → Tests 110 passed | 13 skipped
account.archive    → Tests 110 passed | 13 skipped
```
`ledger.test` covers only `GET /accounts` and `account.add`. RLS still keeps rows to their owner, so nothing
leaks between people.

### 3 · Accounts after an app's only account is archived

Archive the only account (Account → Edit → *Archive this account*), then open Accounts:
```
In 0 accounts / RM0.00 / Check balances / Not added yet / Ryt Bank / Add /
Apps you chose after first run. Each gets one account. / Archived / Ryt Bank / Bring back
```
- The footer is untrue: Ryt was chosen at first run.
- Two ways back for one app. *Add* makes a new account, and *Bring back* is then refused for good.
- A zero total and *Check balances* with nothing to check.
- Cause: `NotAdded` suggests apps against live accounts only, so an archived account counts as missing.
- Screenshot: `R4-FLOW-12-step-1-archived-and-not-added.png`.

### 4 · `my_share` has no default

`AC13 my_share defaults to amount?:  NULL`. The spec says `my_share` defaults to `amount` (§7, §15). Postgres
can't default one column to another, so this needs a trigger or a written rule that NULL means the whole amount
(then every spending reader from B09 on must coalesce). Neither exists today. The balance view uses `amount`, so
B08's own figures are right.

### 5 · A stale tree passes CI

`apps/web/e2e/trees/first-run-accounts.aria.yml` still said `/placeholder: "0.00"` on all four accounts fields;
since run 3's fix the screen renders `""`. The catalogue passed it in every look, so the tree check doesn't hold
a placeholder, adding to the known gap that it reads a regex as a prefix. (The rewritten tree is committed with
this report.)

### 6 · More → Accounts: the harness and the probes still disagree

Flags: `step:balance-check/1` settle 1101 ms median against main's 535; `step:first-run/20` 1314 ms (no main
number); `step:balance-check/5` 1080 ms (main's walk fails on "5 accounts"). On the same `dist-qa` builds, service
worker warm, CPU 4×, the harness's network:
```
harness settle      head 1005/1101/1127   main 599/535/467
probe, warm         main 587 600 548 572 586   head 561 557 542 608 564   (ms to "In N accounts")
probe, code unseen  main 585 553 573 571       head 554 590 615 604
probe, tap at once  main 514 477 497           head 570 467 520   (no DOM change after 600 ms)
CDP loadingFinished after the tap: main 2 responses at ~171 ms; head 10 at 164–192 ms
```
Head's tap loads 10 chunks against main's 2, all from the service worker within 192 ms, so not the cause. In
the filmstrip More stays unchanged about 450 ms, then the slide and skeleton, content by about 700 ms. Cause not
found. **Tooling ask:** the harness should record which signal (the mutation target or the fetch URL) set each
step's settle time.

### 7–12 · Notes

- **7:** in the sweep, `✘ capture-off — locator.click … element is not stable … detached from the DOM` (the dev
  panel's *Widgets* button). Alone: `3 passed (18.4s)`.
- **8:** `account.add` for `com.whatsapp` answers 200.
- **9:** `'Me​als': 200 {"said":"Me​als added"}`, and now 2 live rows read "Meals". The name check refuses control
  and direction characters, but not U+200B, 200C, 200D, 2060 or FEFF.
- **10:** `0.05 ⌫ → ""` and `0.01 ⌫ → ""`, where 0.00 is expected. Elsewhere right: `1.25 ⌫ → "0.12"`.
- **11:** an `INSERT` of opening 10.5 as `app_user` stores `11`. The API refuses it: `400 {"code":"invalid",
  "message":"Invalid input: expected int, received number","field":"opening"}`.
- **12:** right after typing balances totalling RM7,684.50, Home says `Total balance RM29,871.77`, and Settings
  says "Categories and rules · 4 rules" (both from the fake). Production shows neither.

## Metrics (phase 4b)

| Flag | Measured | Verdict |
|---|---|---|
| `screen:insights` blocking 1576 vs 800 ms | `blocking.probe.mjs`: main 1711 1529 1649 1603 1563; head 1504 1658 1569 1433 1529 | Noise: main's 800 was a low sample |
| `screen:review@empty` console 4 vs 0 | `console.probe.mjs`: every message is Chromium's "cross-world service worker resource mismatch" preload warning; main logs it too (10, 26, 7), head 1, 0, 2 | Not the app (handoff follow-up stands) |
| `step:balance-check/1`, `first-run/20`, `balance-check/5` | finding 6 | Open |
| `step:first-run/18` (*Finish* → Home) 1382 ms | Home's own settle on main is 1383 ms | Standing |
| `step:members/9` 208 vs 80 ms | `member-tap.probe.mjs`: main 80 88 104 72 88; head 88 72 88 80 80 | Noise |
| D148 `/1`, `/4`, taken-name `/2`, `balance-check/5` first change 112–208 ms, no main number | new taps that open or submit a sheet; on main 99 of 161 taps exceed 100 ms (median 120) | Standing pattern |
| `GET /api/sync/changes` 14 vs 10 queries | four more tables (categories, accounts, account names, settings), one indexed select each | Accepted: the offline copy's cost (D146 (9)) |

## Probes (phase 3)

Each reverted with `git checkout` straight after.

| Broke | Caught? |
|---|---|
| The Unaccounted trigger refuses adjustments too | **No** |
| The trigger ignores `kind` changes | **No** |
| `GET /accounts/:id` without the Capture check | **No** |
| `account.edit` without the Capture check | **No** |
| `account.archive` without the Capture check | **No** |
| The 409 `account_exists` words dropped | Yes: `expected 'exists' to be 'account_exists'` |
| The `account_names` select policy opened to all | Yes: `rls.sql Failed 6/317` |

`qa/mutants.ts` entries to add once tests for findings 1 and 2 exist: `b08r4-adjustment-refused`,
`b08r4-trigger-ignores-kind`, `b08r4-account-read-without-capture`, `b08r4-account-edit-without-capture`,
`b08r4-account-archive-without-capture`, `b08r4-account-exists-words` (caught today),
`b08r4-account-names-select-open` (caught today); the finds and replaces are in the table above's edits.

## Backend (phase 4, on its own `sen_qa4`)

- **Balances by hand.** Ryt: opening 10000 sen at T; a payment at T−1 µs, one at T exactly and a deleted one left
  out; in 2000, out 345 → **11655**, the view says 11655. TNG: 5050 opening, a split bill of 3050 with a share of
  1000 → **2000** (amount, not share). Total **13655**, the Elsewhere account left out.
- **RLS matrix.** No user id, user B and the admin each read 0 of A's rows on `accounts`, `account_names`,
  `categories`, `transactions`, `account_balances`, `balance_totals` and `user_settings`. RLS enabled, not forced;
  no role can bypass it. A foreign account id and a random one give the same 23503. On a pooled connection the
  user id doesn't carry over, even after a rolled-back request.
- **Routes.** B08's three routes are in `routes.table.ts`. Hostile values always get the shaped error, never a
  500: the opening as `10.5`, `"1000"`, `1e13`, `null` or `true`, and taken, empty or 41-character names. MAX_SEN
  round-trips exactly. A repeated edit or archive leaves the version alone. Runs 1–2's probes: 64 of 65 pass (the
  one is note 8).

## Flows (Chromium, 390×844)

All pass but one: first run end to end, closed and reopened, an empty balance, a lost save that retries once,
never-again, Accounts and an account, D148's add, bringing back over a live account, sign-out clearing the draft,
the short first run, Categories, You, New York time, and production-env screens with no page error. The core
journeys pay-new, scan-after and first-run pass. **R4-FLOW-12 fails** (finding 3).

## Not tested, and why

- First run held in the shell for someone with Capture: Chromium can't be the shell; `logic.test` and the owner's
  phone step 1 cover it.
- Home's *Capture is off* after access is skipped: from the shell's own status; queued as B08 step 9 in
  `docs/local.md`.
- Outbox v5's offline copy on a device: no emulator here; CI runs its emulator tests.
- A row changed between two pages of `/sync/changes`: not run.
- The account screen with another person's id in the URL: the API answered 404; the screen wasn't walked.
