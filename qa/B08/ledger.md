# B08 · QA ledger

## The security review (D144): low note, fixed (tier 1)

- **What:** first run's draft (`sen.firstRun`: balances typed but not saved, the name, the payday) wasn't
  tied to a person and outlived sign-out, so on a shared device the next person would see it.
- **Tier 1:** one source change (`forgetKept`, `keepFor` in `apps/web/src/data/api/backend.ts`) and its
  test; no other behaviour changes; not a Blocker.
- **Red** (`pnpm exec vitest run apps/web/src/data/auth.test.ts`, before the fix):
  `× take first run’s unsaved draft with them`, `× take first run’s draft when someone else signs in`,
  `Tests 2 failed | 20 passed (22)`.
- **Green** (after): `Tests 22 passed (22)`; typecheck and lint clean.

## QA run 1: the metrics flags (each measured, `qa-artifacts/B08_first-run-accounts/diff/index.md` § Metrics)

| Flag | Cause, measured | Verdict |
|---|---|---|
| `screen:receipt`, `screen:sign-in`, `screen:settings/capture/access@capture-off` console 12 / 9 / 2 vs 0 | Opened warm (service worker) and throttled as the metrics run does (`qa/e2e/b08-measure.spec.ts`): the only messages are Chromium's own preload warnings, *A preload … is not used because it is a cross-world service worker resource mismatch* and *preloaded … but not used*. They swing either way between runs: that run had main's sign-in at 18 and head's at 0. Cold, both sides log one *Service Worker registration blocked* warning | Accepted: browser noise, no app error on either side. Follow-up: the metrics' console count could ignore Chromium's preload warnings |
| `step:first-run/18` settle 1601 ms (main: none) | The film shows *Finish* dimmed for ~0.45 s (`setup.finish`, then `invalidateQueries()` refetching every active query), then Home's skeleton until the strip ends. Home's own open is over 1000 ms on main too (standing `screen.settleMs`) | The waiting button's missing words are finding 9; the rest is accepted with Home's standing item (Home becomes real in a later slice) |
| `api:GET /api/me` queries 10 vs 6 | `/me` now reads `setup_done_at` in its own `c.var.db()` transaction: BEGIN, `set_config`, SELECT, COMMIT = +4 round trips. Median app time 13.5 ms | Accepted: read once per session and kept. Follow-up: read it in the access lookup's transaction |
| `api:GET /api/sync/changes` queries 14 vs 10 | Four new SELECTs (categories, accounts, account_names, user_settings) in the existing transaction = +4. Median 14.2 ms | Accepted: one query per table the offline copy carries (D146 (9)) |
| metrics runs: `scan-after` failed on head ×2, `first-run` on main ×3 | head: the journey waits for *Reading receipt…*, a 0.4–0.8 s screen; four warm throttled walks per side show it every time, windows overlapping. main: its own `first-run` journey failed in main's build; not investigated (not this branch's) | Finding 12 (racy assertion) |

## QA run 1: the fixes (4 Nov)

**The batch is tier 3, so run 2 is a fresh full run.** Finding 1's fix changes `typedSen` in the money module, a
core module the non-negotiables name, and the money input every amount form shares. Every other fix rides in the
same batch. Commits `1504f36`..`f6d20f9`.

| # | Fix | Proof it's guarded |
|---|---|---|
| 1 | `typedSen`: a typed 0 is `0.00`; backspace from 0.00 empties it; `pastedSen('0')` is `0.00` (D147 (1)). The receipt form refuses a zero total in words, as the manual form already did | Red: `money.test.ts` 3 failed / 65 passed on the old `money.ts`; green 68/68. `first-run.server.spec.ts` types 0 into GrabPay and saves RM0.00. Breakage check `zero-is-no-amount` killed |
| 2 | First run's accounts step rereads the account list when a save fails, so Next again edits the saved account instead of adding it twice | `first-run.server.spec.ts` (QA's FLOW-R, now in CI's `e2e:server`): red without the reread (*waiting for Step 6 of 7*), green with it |
| 3 | `journeys.spec` expects 4 accounts and TNG's 7,815.40 at the balance check (D145); `redesign-pins` expects a typed 0 refused as *above zero* (D147 (1)); `production.spec`'s B04 list drops the five screens B08 made real; `server.spec`'s session end is caught by More, which now reads the server | `e2e:server` 7/7; `pnpm e2e` in Minted 411/413, then the two fixed and green |
| 4 | The redirect's rule is `firstRunFor(me, shell)` in `screens/outside/logic.ts`, tested on all six cases; `e2e:server` adds an unfinished person without capture (held, Cash locked, finishes) and one with (a browser isn't held) | Red: QA's exact break in `logic.ts` fails 1 of 11; green 11/11. Breakage check `first-run-for-everyone` killed (the `web` suite now runs `screens/outside`) |
| 5 | Accounts lists archived accounts with *Bring back* (D147 (4)); `/accounts` returns `archived` | `ledger.test.ts`: archived listed, bringing back over a newer live account refused |
| 6 | The short first run reads Settings' categories: Cash is shown locked on with its reason, Unaccounted left out | `first-run.server.spec.ts`: Cash disabled, *Start using Sen* finishes |
| 7 | pgTAP fixture: the RM30.50 payment carries a RM10.00 share; the balance still counts RM30.50 | Breakage check `balance-uses-share` killed |
| 8 | `kept-after-sign-out` and `no-hint-after-change` refreshed; QA's seven new checks added, plus `zero-is-no-amount` | `mutants.mjs --only` the ten: 10/10 killed |
| 9 | *Finish*, *Next* (saving) and *Start using Sen* show a spinner and words while waiting (`blocks/pending.tsx`, moved out of sign-in) | Run 2's filmstrip |
| 10 | The offline banner says what offline means on the step: sign-in needs a connection; elsewhere what's typed is kept and Next saves it once back online | Run 2 |
| 11 | The `year` scenario's test gets a 20 s limit; its own 1.5 s measure stays the speed check | `pnpm test` 483/483 |
| 12 | **Not fixed.** The core journey's scan-after step races its 0.4–0.8 s *Reading* screen in the metrics run, on `main` too, with the same windows; it isn't B08's code. Follow-up for the QA tooling: wait for the step's own outcome, not a transient screen | |
| 14 | More asks for accounts only with Capture | Run 2 |
| 19 | The accounts step offers each saved account's opening, not its computed balance (`AccountRow.opening`) | `logic.test.ts`: computed 99, offered 320050 |
| Eyes 1 | Under each account, what its figure holds (*eWallet and GO+ together*, *Main account and pockets together*) on first run and Accounts (D147 (3)); B13's brief carries it to the balance check | Trees re-recorded |
| Eyes 3 | The opening balance counts as each account's first check (D147 (2)) | `ledger.test.ts`; trees |
| Eyes, look again | The name and payday fields lose placeholders that read as typed values; the empty Accounts state no longer says *first run* | Trees |

**Left as Notes, with reasons:** 13 (an un-chosen app keeps its account: un-choosing in Settings is B02's picker, and archiving the
account belongs with B09's mapping of notifications to accounts, named in the handoff); 15 (an opening below 0 and a long name are
refused by the database's checks where they matter; a negative opening stays possible for stored credit, D93); 16 (Home is B13's);
17 and 18 (tests); the eyes pass's other *look again* notes outside B08's screens (sheets in B04's journeys, the Members toast,
already a follow-up).

## QA run 2: the metrics flags, cause and verdict

From `node scripts/qa-diff.mjs` (8 confirmed flags, 333 standing). Each cause was measured (the probes are in
`qa/e2e/b08r2-*.probe.mjs`, against the fake preview build at 390×844 with the CPU 4× slower, head on :4185 and
main's build from the base worktree on :4186).

| Flag | Cause, measured | Verdict |
|---|---|---|
| `screen:manual` console 2 vs 0 | Every message is Chromium's *A preload for … is found, but is not used because it is a cross-world service worker resource mismatch*, from opening a screen under a warm service worker. Three opens each: head 17, 0, 28; main 26, 5, 6. Not the slice | Accepted: harness noise. Follow-up for the tooling: don't count that warning |
| `step:first-run/7` settle 230 vs 81 ms | The journey gained a reload at step 4 (done-when 1), so tap 7 is a different tap on each side; 230 ms is well inside the 1 s limit | Accepted |
| `step:first-run/18` settle 1243 ms (no main number) | *Finish*. *Finishing…* shows at 56 ms (run 1's finding 9 fixed). CPU profile from tap to Home: first run is left at 286–307 ms, Home's figure is drawn at 786–879 ms, and the time is native rendering (`(program)` 879–887 ms) with JS under 100 ms. The rest is Home's own first draw | Accepted: answered at once, in words; Home is B13's |
| `step:first-run/20` settle 1217 ms (no main number) | More → Accounts inside the journey: the Accounts screen's code is a lazy chunk (`accounts-*.js`, `can-open-*.js`, `undo-2-*.js`) fetched at ~231 ms, its card drawn at 613 ms; the remainder is the slide-in. Main loads its Accounts the same way | Accepted |
| `step:balance-check/1` settle 1052 vs 525 ms | The same tap, More → Accounts. Main's number comes from a walk that then failed (`In 4 accounts` isn't on main). Measured directly, three each: head 599, 643, 625 ms to the total; main 542, 586, 564 ms | Accepted: about 10%, within noise of the ratio |
| `step:balance-check/5` first change 136 ms (no main number) | *Save* on the skeleton balance check (B13's screen); the base walk stopped before it. The same class as main's 90 standing first-change items | Accepted; B13 builds the screen |
| `api:GET /api/me` queries 10 vs 6 | One more `asPerson` transaction (begin, `set_config`, the `user_settings` select, commit) just to read `setup_done_at`: medians 6 → 10 queries, dbMs 3.5 → 5.35 locally | **Not accepted: QA run 2 finding 8.** Read it in the transaction the request already opens |
| `api:GET /api/sync/changes` queries 14 vs 10 | The four new kinds the brief adds to the offline copy, one select each (categories, accounts, account names, your names), inside the same transaction | Accepted: the brief's own addition |

Standing (main breaks the same limits): 333 numbers, already explained in earlier slices' ledgers; none is new to B08.

## QA run 2: the fixes (10 Nov)

**The batch is tier 3, so run 3 is a fresh full run.** Finding 8's fix changes the access middleware every
signed-in request passes through (auth), and finding 6's the frame every screen sits in. Commits
`854096f`..`2494013`.

| # | Fix | Proof it's guarded |
|---|---|---|
| 1 | `category.add` seeds the starting list first, in its own transaction, so a category added before first run joins the list and Sen's Cash, Unaccounted and Salary always exist; the made-up backend does the same. Settings' empty state no longer says categories come with the first payment | Red: `ledger.test.ts` › *a category added before first run* fails on the old `ledger.ts` (*expected [Pets] to have a length of 22 but got 1*); green 16/16. Breakage check `seed-before-add` killed |
| 2 | Account's Checks card says *None since the opening balance on 5 Nov* when the opening is the last check (D147 (2)) | Trees re-recorded; run 3's eyes |
| 3 | Accounts: the holds line has its own line and wraps, never cut | Trees re-recorded; run 3's eyes |
| 4 | First run, finished on Sen's server, sends a link to it Home with `replace`. The made-up backend keeps every scenario's first run open for review (the catalogue walks it on Wei Ming) | Red: `first-run.server.spec.ts:54` fails on the old screen (*Received …/s/first-run*); green 2/2 |
| 5 | Accounts reads /me first: without Capture it says *Accounts come with Sen reading your bank notifications, which isn't switched on for you*, and never asks the server | Run 3 |
| 6 | The frame leaves its offline banner off on first run, which says what offline means on each step itself | Run 3 |
| 7 | Not fixed: QA tooling, `scan-after` misses a 0.4–0.8 s screen with three workers, on `main` too. Follow-up in the handoff | — |
| 8 | `setupDone` is read with the access row (a left join on `user_settings`), so /me runs no second transaction | `test:db` 199 passed; run 3's metrics |
| Eyes: balance-check | Each card says what its one figure holds (`BalanceCheckView` rows carry `package`); Save shows *Saving…* | Run 3's eyes |
| Eyes: first run's skeletons | `Steps` starts the Settings and Accounts reads at once, so later steps open with their form | Run 3's filmstrips |
| Eyes: accounts empty | *Choose apps* opens Settings → Capture → Apps where it's built | Run 3 |
| Probes | QA's seven probes kept as breakage checks, with `seed-before-add` | `mutants.mjs --only` the eight: 8/8 killed |

Left, with reasons:
- **Eyes, first run's accounts step (blanks go red):** flows.md step 5 asks each account for today's balance,
  so a blank is refused; the error says *or 0*, for an empty wallet.
- **Notes 9–16:** 9 is the phone's (phone step 8); 10 (an account for any package) books nothing: the listener
  discards an unchosen or blocked app in native code (D86), so no payment ever reaches it; 11
  and 12 are within the rules (12: a person without Capture has no accounts); 13, 15 and 16 are QA tooling,
  in the handoff's follow-ups; 14 is B13's Home.
