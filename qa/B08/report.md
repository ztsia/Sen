# QA B08 · run 1

Report, with screenshots: https://claude.ai/artifact/Pkj1my3wTFBwiM5qfvNnvv

Written by the main session from the reviewer's final message (its harness blocked it from writing here).

```
VERDICT   fix first
          55 criteria, 50 pass, 3 fail, 2 not reachable
          19 findings: 4 Major, 8 Minor, 7 Note       phases run: 1-6
```

First run, the slice's own journey, breaks in two ways: someone with an empty account can't finish it
(RM0.00 can't be typed), and it gets stuck if a save's answer is lost. The ledger underneath is sound:
RLS held in every cell run, the balance view's `opening_at` boundary is right, the category seed is
safe under concurrency, and every API refusal is `{ code, message, field }`, never a 500.

Scope from `origin/main` (`e9dc28c`). Criteria and flows written from the docs before reading the code;
FLOW-R, 12, 13 and 6x/6y added after, marked in `flows.md`.

## Suites

| Run | Result |
|---|---|
| typecheck, lint | clean |
| `pnpm test` | 480/481: `year` scenario timed out at 5199 ms (3122 ms alone): finding 11 |
| `pnpm security`, `pnpm hygiene` | pass |
| `pnpm test:db` | pgTAP 462/462; API 198 pass, 13 skipped |
| `pnpm e2e` | 613/615 with `E2E_LOOKS=minted,copper` (finding 3) |
| `e2e:lived` | pass |
| `e2e:server` | 4/5 (finding 3) |
| `mutants.mjs` | 84 killed, 2 stale (finding 8) |
| `qa-diff` | 0 check findings; 1 unexplored (`reading`); 6 metrics flags, all explained |
| QA flows (`qa/e2e/b08-flows.spec.ts`) | 62 steps in 19 flows; 4 fail (findings 1, 2, 5, 6) |

All-looks `pnpm e2e` stopped at 175/1415 (all passing) and re-run with two looks; the diff run covered all twelve look-and-mode pairs, and `first-run.spec` walked all six looks.

## Findings

| # | Sev | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | RM0.00 can't be typed, so first run can't be finished with an empty account | FLOW-3z | AC-22s, D146 (4) |
| 2 | Major | After a lost answer while saving accounts, every Next says *That app already has an account* | FLOW-R | AC-17, dedupe rule |
| 3 | Major | Three tests the slice made stale turn `pnpm e2e` (×2) and `e2e:server` (×1) red | suites | CI |
| 4 | Major | The first-run redirect, D146 (2), has no test: breaking it leaves every suite green | probe W3 | D146 (2) |
| 5 | Minor | An archived account has no way back once its toast goes | FLOW-6 step 6 | screens `accounts` |
| 6 | Minor | The short first run offers *Cash*; switching it off blocks *Start using Sen* with a 409 | FLOW-10s | §8, D146 (6) |
| 7 | Minor | No test guards *balances use amount, not my_share* | probe P2 | §7 |
| 8 | Minor | Breakage checks `kept-after-sign-out` and `no-hint-after-change` are stale | mutants | D139 |
| 9 | Minor | *Finish* waits with no spinner or words (flag `step:first-run/18`, 1601 ms) | film first-run/18 | patterns §7 |
| 10 | Minor | Offline at step 5, the banner says *the rest waits* but Next fails | FLOW-12 | D146 (8) |
| 11 | Minor | `pnpm test` red once: `year` scenario near its 5 s timeout | unit | CI |
| 12 | Minor | Scan-after core journey races its 0.4–0.8 s *Reading* screen under load | metrics run | D124 |
| 13 | Note | An app un-chosen after its account was saved keeps a live account | FLOW-13 | §7 |
| 14 | Note | More calls `/api/accounts` and gets a 403 for people without Capture | FLOW-10 | D146 (7) |
| 15 | Note | API accepts what screens never send (opening −500, names with Capture off, 2000-char name); `/sync/changes` carries accounts with Capture off | API probes | D146 (7) |
| 16 | Note | On the server preview, Home after first run shows the skeleton's RM29,871.77 beside real accounts | FLOW-1 step 9 | flows step 8 |
| 17 | Note | Committed Settings → Categories tree lacked *Add a category*; the diff run rewrote it | git diff | D137 |
| 18 | Note | Playwright `fill` on a money input as its sheet opens appends; a person's edits replace | FLOW-6y vs 6x | patterns §7 |
| 19 | Note | From reading only: a reopened accounts step treats the computed balance as the opening | `first-run.tsx` | §7 |

### 1 · Major: RM0.00 can't be typed
`typedSen` (`packages/core/src/money.ts:139`) strips leading zeros, so typing 0 leaves the field empty.
The accounts step refuses the empty field (*Type today’s balance, or 0.*), and the router keeps the
person at first run. The only way out is un-choosing that app. `docs/local.md` step 4 says *0 is fine*,
which isn't true today. Account → Edit can't correct an opening to 0 either.
```
FLOW-3z after typing 0: ""
FLOW-3z after typing 000: ""
FLOW-3z after fill 0.00: ""
```

### 2 · Major: a lost answer leaves the accounts step stuck
Each `account.add` gets a fresh `newId()`; `runCommand` only refetches after success, so the next Next
adds the saved app again under a new id and gets 409 `account_exists` every time. Only a reload gets
past it. Keeping each app's id in the draft, or refetching on failure, makes the retry a no-op.
```
FLOW-R retry responses: ["409 {\"code\":\"account_exists\",...}"]
FLOW-R accounts: ["Ryt Bank","TNG eWallet"]
waiting for getByText('Step 6 of 7') … not found
```

### 3 · Major: three stale tests
- `journeys.spec.ts` › balance-check expects *In 5 accounts*; D145 made it 4.
- `production.spec.ts` › *B04's screens say Not built yet* still lists `/s/accounts` and the other screens B08 made real.
- `server.spec.ts` › session-end: More now reads `/api/accounts`, so the person is already at sign-in before the test taps Settings.

### 4 · Major: the redirect has no test
`firstRunDue()` changed to `return !me.setupDone;` left every suite green (web unit 291/291). The unit
suite never loads the router, the fake skips the check, and `e2e:server` seeds only a finished Wei Ming.

## Probes
17 probes: 15 caught, 2 survived (P2 → finding 7, W3 → finding 4). Entries proposed for `qa/mutants.ts`:
`balance-boundary`, `balance-uses-share`, `one-account-per-app`, `unaccounted-by-hand`,
`accounts-without-capture`, `first-run-draft-kept`, `first-run-for-everyone`, and refreshed
`kept-after-sign-out` and `no-hint-after-change` (finds and replaces in the reviewer's message, kept in
`results.json`).

## Backend
RLS matrix over accounts, account_names, categories, transactions, account_balances, balance_totals,
user_settings: no user id 0 rows; the admin 0 of B's; B own rows; owner role all. Cross-person UPDATEs
changed 0 rows; inserting as B refused; DELETE denied. A pooled connection after A sees 0 rows. Two
`seed_categories()` at once: 21, then 0. API probes 41/41 to spec, bar finding 15's notes.

## Metrics
Console flags ×3: Chromium preload warnings, noise. `step:first-run/18`: finding 9. `/me` +4 queries
(setupDone) and `/sync/changes` +4 (four new tables): accepted. Verdicts in `ledger.md`.

## Not tested
First run in the real shell (Xiaomi; `docs/local.md`); shell outbox v5 (CI emulator only); AC-24s and
AC-28; the eyes pass (started by the main session); all-looks `pnpm e2e` to the end.
