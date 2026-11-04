# B08 · First run, accounts and categories: acceptance criteria

Run 1, 4 Nov 2026. Written from the docs only, before reading the implementation: the brief
(`docs/briefs/B08-first-run-accounts.md`), `spec_v2.md` §5, §7, §8, §9.5, §9.6, §15, decisions D14,
D16, D17, D26, D28, D33, D38, D52, D79, D86, D93, D145, D146, `docs/flows.md` (`first-run`, the core
journeys), `docs/screens.md` (`first-run`, `accounts`, `account`, Settings) and `docs/ui/patterns.md`
§3, §7. Sources: § (spec), D (decision), B (brief), DW (brief *Done when* number), P (patterns), NN
(a CLAUDE.md non-negotiable).

Every criterion names an observable. A criterion ending in `s` is the sad twin of the one before it.

## The ledger's tables

AC-1  `accounts` has the spec's columns, money in BIGINT
      Then   `accounts` has id, user_id, name, kind, notifier_package, notifier_label,
             opening_balance (bigint), opening_at (timestamptz), currency, archived_at
      Spec   §15, B *Data*, NN money

AC-1s A kind outside tracked|elsewhere, or a fractional balance
      When   an insert has kind `savings`, or opening_balance 12.5
      Then   the insert fails (check / type error); no row
      Spec   §15, NN money

AC-2  One live account per app
      Given  A has a live tracked account for `my.com.tngdigital.ewallet`
      When   A inserts a second live account with the same notifier_package
      Then   it is refused (unique violation); A still has one live account for that app
      Spec   D145, D146 (6)

AC-2s The rule doesn't over-reach
      Then   (a) B can have an account for the same package; (b) A can hold two *Elsewhere*
             accounts with no package; (c) after A archives the TNG account, a new live one is allowed
      Spec   D145, D146 (6), §7 *Elsewhere*

AC-3  `account_names` maps (package, label) to one account
      When   A inserts the same (package, label) twice
      Then   the second is refused: UNIQUE (user_id, package, label)
      Spec   §15

AC-3s An account name can't point at another person's account
      When   A inserts an account_names row whose account_id is B's account
      Then   refused, with an error that doesn't distinguish "B's" from "doesn't exist"
      Spec   D146 (5), NN RLS

AC-4  `transactions` exists with the core columns
      Then   account_id, bank_event_id (nullable), occurred_at, direction (out|in), amount (bigint),
             currency, kind (spend|income|transfer|repayment|refund|adjustment), merchant_raw,
             merchant_key, category_id, my_share (bigint), source, status, created_at, updated_at,
             deleted_at
      Spec   B *Data*, §15

AC-4s A transaction naming B's account, category or bank event, or a fractional amount
      Then   refused; no row
      Spec   D146 (5), NN money

AC-5  `user_settings` has own_names (text[]), expected_payday, setup_done_at
      Spec   B *Data*, §15, D146 (1)

AC-5s An expected payday that is neither the last working day nor a day 1–31
      When   day 0, day 32 or a word other than the last-working-day value is stored
      Then   refused (check or the API's 400)
      Spec   §7 *Pay cycles*

## Categories

AC-6  The starting list, seeded at first run
      When   a new person's first run starts
      Then   they have exactly 21 categories: the 18 spending ones of §8 in its names, and Salary,
             Interest & returns, Other income as kind income; flags exactly as §8's table
             (Meals meal; Drinks & desserts drink+discretionary; Shopping, Entertainment, Gifts &
             treats, Travel discretionary; all others none); system_key salary on Salary, cash on
             Cash, unaccounted on Unaccounted, null on the other 18
      Spec   §8, D33, DW 3

AC-6s Seeded once, never twice
      When   first run's start is sent again (a retry, a second phone), and for a person who already
             has categories
      Then   the count stays 21 (or their own count); no duplicates by name
      Spec   D146 (3), NN dedupe

AC-7  Unaccounted can never be picked by hand
      When   a spend transaction (or any kind but adjustment) names Unaccounted
      Then   refused; the categories offered to pick (Settings, prompt lists) don't include it
      Spec   §8 table, B *Data*, DW 3, D146 (6)

AC-7s A balance check's adjustment may use it
      When   an `adjustment` transaction names Unaccounted
      Then   accepted
      Spec   §7 *Balance checks*

AC-8  Sen's three categories are protected
      When   Salary, Cash or Unaccounted is archived, or Unaccounted is given a flag
      Then   refused, by the database and the API (structured error, not a 500)
      Spec   §15 *system_key*, D146 (6)

AC-8s Renaming a system category keeps its key
      When   Cash is renamed `Tunai`
      Then   the row keeps system_key `cash`
      Spec   §15 *Key decisions*

## The balance view

AC-9  Balance = opening + in − out, only after opening_at
      Given  a tracked account opened at T with RM100.00, and transactions: out RM10.00 at T−1 s,
             in RM5.00 at T, out RM2.50 at T+1 µs, in RM40.00 at T+1 day, out RM3.00 at T+2 days
             deleted
      Then   its balance is 10000 + 4000 − 250 = 13750 sen (exactly at T not counted; deleted not
             counted)
      Spec   §7 *Balance*, *Opening balance*, B, DW 2, D146 (4)

AC-9s Balances use `amount`, not `my_share`
      Given  an out of RM120.00 with my_share RM40.00
      Then   the balance falls by 12000, not 4000
      Spec   §7 *Spending vs cash flow*

AC-10 The total is the sum of tracked accounts, Elsewhere has no balance
      Then   `balance_totals` = Σ of tracked, unarchived accounts' balances; an Elsewhere
             account adds nothing to it
      Spec   §7 *Elsewhere*, screens `accounts`

AC-11 The views are security_invoker, and RLS holds through them
      Then   reloptions include security_invoker=true; B sees none of A's balances; no user id set
             sees zero rows
      Spec   §15, NN RLS

## Row-level security

AC-12 RLS on every new table, two people
      Then   for accounts, account_names, categories, transactions: RLS enabled (and forced or the
             API role is non-owner), B reads 0 of A's rows, B can't update or insert as A
      Spec   NN RLS, DW 4

AC-12s No user id, the admin
      Then   with no `app.user_id`, every new table and view returns 0 rows; the admin, signed in,
             reads none of another's accounts, balances or categories
      Spec   NN RLS, D52

AC-13 pgTAP and the catalogue check cover every new table and view
      Spec   DW 4

## The API

AC-14 `/accounts` and `/accounts/:id` need Capture
      When   a person with Capture off asks
      Then   403 `{ code: "capture_off" }`; with Capture on, 200 with balances from the view
      Spec   D146 (7), §9.6

AC-14s Another person's account id
      Then   `/accounts/<B's id>` as A is 404, the same as a random id
      Spec   NN RLS

AC-15 Opening balances are integer sen, from text
      When   an account is saved with balance typed `1,284.50` (or digits `128450`)
      Then   `opening_balance` = 128450
      Spec   NN money, P §3 forms, B step 5

AC-15s A float, a string with letters, an over-large number
      When   the API receives 12.5, "12.5", "abc", 1e20
      Then   400 `{ code, message, field }`, no row, never a 500
      Spec   NN money, docs/workflow/qa.md routes

AC-16 `opening_at` is when the server saves it; a correction keeps it
      When   the account is saved, then its opening balance corrected
      Then   opening_at equals the first save's server time and doesn't move on correction
      Spec   B step 5, D146 (4)

AC-17 Every write is idempotent
      When   the same first-run account save, setup start, or category add is sent twice
      Then   one row; the second answer matches the first
      Spec   NN dedupe

AC-18 Categories: rename, add, archive, flags
      When   A renames, adds, archives and toggles flags through the API
      Then   the rows change accordingly; an archived category no longer appears to pick
      Spec   B *Screens made real*, §8

AC-18s A blank or over-long name, another person's category
      Then   400 with field `name`; 404 for B's id
      Spec   docs/workflow/qa.md routes

AC-19 The offline copy carries the new kinds
      Then   `/sync/changes` returns A's categories, accounts, account names and own names, none of B's
      Spec   B *Data* last bullet, D146 (9)

## First run (the shell)

AC-20 Seven steps, in order, one per screen
      Then   sign in, apps, notification access, Keep Sen running, accounts, your name, payday; the
             screen after sign-in reads *Step 2 of 7*
      Spec   §9.5, B, D146 (2)

AC-21 Closed partway, it reopens at the same step with what was typed
      Given  the person is on step 4 (or step 5 with a balance typed but not saved)
      When   the page is reloaded
      Then   it shows step 4 (step 5 with the typed balance)
      Spec   DW 1, flows `first-run` sad, D146 (1)

AC-21s The draft never leaks to the next person
      When   the person signs out mid-first-run and someone else signs in on that device
      Then   the next person sees none of the first person's typed values
      Spec   NN real data, D52

AC-22 Accounts step: one per chosen app, named from the curated list, nothing else
      Given  the apps chosen are TNG, Ryt, Public Bank and Grab
      Then   four balance fields, named as the curated list names them; no *Add a pot*, no way to add
             a second under one app, no Elsewhere
      Spec   §7 *Accounts follow the apps*, D145, D146 (4)

AC-22s Every balance is asked for
      When   Continue is tapped with a balance left empty
      Then   it stays on the step and says what's missing; 0 is accepted as a balance
      Spec   D146 (4), P §7 forms

AC-23 A typed balance is stored as typed
      When   `128450` is typed into TNG's field
      Then   it reads RM1,284.50 on screen, and `accounts.opening_balance` = 128450
      Spec   P §3, §7 forms, NN money

AC-24 Your name as the banks print it
      When   `TAN WEI MING` is entered
      Then   `user_settings.own_names` = {TAN WEI MING}
      Spec   §9.5 step 6, D17

AC-24s A blank name
      Then   it says the name is needed (or offers skip as the spec allows); never stores ''
      Spec   P §7 forms

AC-25 Expected payday, the last working day by default
      Then   the default choice is the last working day; choosing day 25 stores 25
      Spec   §9.5 step 7, D14

AC-26 Finishing lands on Home, and the steps never come back
      When   payday is saved
      Then   `home` shows; `setup_done_at` set; a reload or a new sign-in goes to home, not first run
      Spec   §9.5, D26, D146 (1)

AC-27 Who is sent to first run
      Then   (a) signed in, not finished, in the shell with Capture: first run; (b) not finished,
             Capture off, anywhere: first run; (c) Capture on in a plain browser: not sent
      Spec   D146 (2)

AC-28 Access refused: Skip for now
      When   notification access is skipped
      Then   first run goes on; once finished, `home` shows *Capture is off* with *Fix*
      Spec   flows `first-run` sad

AC-29 Home after first run
      Then   the large figure reads *Spent since you started* until a salary lands
      Spec   flows `first-run` step 8

AC-30 The walk in all six looks
      Spec   DW 5

## Screens made real

AC-31 `accounts`: the total, each tracked account with its balance, Elsewhere without one
      Then   each account's row shows its balance (equal to its opening balance before B09), the
             total equals their sum; *Last checked* doesn't claim a check that never happened
      Spec   screens `accounts`, DW 2

AC-31s Without Capture there's no `accounts`
      Then   the More menu doesn't offer it, and its URL doesn't show balances
      Spec   screens *A person sees only what they can use*, D52

AC-32 `account`: balance, opening balance, the app that feeds it; Edit and Archive
      Then   it shows the opening balance as typed, its app's name; editing the opening balance keeps
             opening_at; Archive offers Undo
      Spec   screens `account`, B, P toasts

AC-33 Settings → Categories: rename, add, archive, flags; Unaccounted can't be touched
      Then   each change is visible at once, with Undo where it isn't; Unaccounted offers no archive
             or flags
      Spec   B, §8, P §7

AC-34 Settings → You: names and payday
      Then   names and expected payday show and save; names only with Capture
      Spec   B, screens Settings table

## Non-negotiables touched

AC-35 No float in any money path of the diff (`parseFloat`, `toFixed`, `Number(` on amount text,
      division outside the money module)
      Spec   NN money

AC-36 No real financial data in fixtures or the seed; names made up (`TAN WEI MING`, Mei Ling)
      Spec   NN real data

AC-37 One set of UI patterns: first run's steps, Accounts, Account, Categories and You use the
      shared list row, form, sheet, empty, loading and error states
      Spec   NN patterns, P §7

AC-38 The build ships no secret
      Spec   NN secrets
