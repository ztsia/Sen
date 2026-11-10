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

---

# Run 2 (fresh full run, tier 3, 4 Nov): criteria written from the docs before the source

Sources: `docs/briefs/B08-first-run-accounts.md`; `spec_v2.md` §7, §8, §9.5, §9.6, §15; D14, D16, D17,
D26, D28, D33, D38, D79, D86, D93, D132, D145, D146, D147; `docs/flows.md` `first-run`; `docs/screens.md`
`first-run`, `accounts`, `account`, Settings; `docs/ui/patterns.md` §3, §7. Run 1's criteria were not
read before these were written. Each has its sad twin in the same entry (`Sad`).

## Data (Postgres, `sen_test`)

R2-AC-1  The accounts table holds the brief's columns, typed
         Given  migration 0013+ applied
         When   `\d accounts`
         Then   `opening_balance` is `bigint`; `opening_at` and `archived_at` are `timestamptz`; `kind`
                accepts only `tracked`/`elsewhere`; `notifier_package`/`notifier_label` nullable; `currency`
         Sad    INSERT kind `savings` → check violation; opening_balance `12.5` → rejected (no rounding)
         Spec   §15 accounts; brief *Data*; non-negotiable *integer sen*

R2-AC-2  One live account per app (D145, D146 (6))
         Given  user A has a live tracked account for `my.com.tngdigital.ewallet`
         When   A inserts a second live account for the same package
         Then   unique violation; 1 live row
         Sad    after archiving the first, a new one for that package is accepted; user B may hold one for
                the same package
         Spec   D145, D146 (6)

R2-AC-3  `account_names` maps one (package, label) to one of the person's own accounts
         Given  A's row (pkg, 'Main Account') → A's account
         When   the same row is inserted again
         Then   unique violation (user_id, package, label)
         Sad    A's row pointing at B's account id is rejected, with the same error as for a random uuid
         Spec   §15 account_names; D146 (5)

R2-AC-4  Categories table: kind, flags, system key; Sen's three can't be archived; Unaccounted flagless
         Given  A's seeded categories
         When   UPDATE Cash/Salary/Unaccounted SET archived_at = now()
         Then   rejected (check); UPDATE Unaccounted SET is_discretionary = true → rejected
         Sad    archiving Groceries succeeds; renaming Cash keeps system_key `cash`
         Spec   §8, §15 categories, D146 (6), D147 (5)

R2-AC-5  The starting list is exactly D33's
         Given  a new person
         When   first run starts (`setup.start`)
         Then   21 categories: 18 spend (§8's table, in its names) + Salary, Interest & returns, Other income
                (income); is_meal only Meals; is_beverage only Drinks & desserts; is_discretionary exactly
                Drinks & desserts, Shopping, Entertainment, Gifts & treats, Travel; system_key salary/cash/
                unaccounted on Salary/Cash/Unaccounted, null elsewhere
         Sad    a second `setup.start` leaves 21 rows; someone who already has categories gets none seeded
         Spec   §8, D33, D146 (3)

R2-AC-6  Unaccounted can never be picked by hand
         Given  A's Unaccounted category
         When   a transaction of kind `spend` with Unaccounted's id is inserted / sent through any command
         Then   rejected; Unaccounted absent from every category picker on screen
         Sad    an `adjustment` with Unaccounted is accepted
         Spec   §8 table, brief *Data*, D146 (6)

R2-AC-7  Transactions exist with their core columns, money integer
         When   `\d transactions`
         Then   account_id, bank_event_id, occurred_at, direction (out|in), amount bigint, currency, kind,
                merchant_raw, merchant_key, category_id, my_share bigint, source, status, created_at,
                updated_at, deleted_at
         Sad    direction `sideways`, kind `gift`, amount `1.5` each rejected
         Spec   §15 transactions; brief

R2-AC-8  The balance view: opening + in − out, strictly after opening_at, `amount` not `my_share`
         Given  opening 100000 at T; in 5000 at T+1s; out 1250 at T+1h; out 999 at exactly T; out 700 at
                T−1s; out 12000 with my_share 4000 at T+2h; out 300 at T+3h with deleted_at set
         When   SELECT from the balance view
         Then   100000 + 5000 − 1250 − 12000 = 91750
         Sad    each excluded row (at T, before T, deleted) moves nothing; the view is security_invoker
         Spec   §7 *Opening balance*, *Balance*; brief *the balance view*; D146 (4)

R2-AC-9  The total is tracked live accounts only
         Given  A has two tracked accounts (91750, 0) and one elsewhere account with transactions
         Then   total = 91750; the elsewhere account shows no balance anywhere
         Sad    an archived tracked account doesn't count in the total (or, if it does, the spec says so)
         Spec   §7 *Elsewhere*, *Balance*

R2-AC-10 RLS on every new table and view
         Given  A's rows in accounts, account_names, categories, transactions, user_settings
         When   read as B, as no user, as the admin, as the API role
         Then   0 of A's rows each; INSERT as B with user_id = A rejected (WITH CHECK)
         Sad    A reads all of A's own
         Spec   non-negotiable RLS; D52; §15

R2-AC-11 Cross-person references are impossible
         When   B inserts a transaction naming A's account_id or A's category_id
         Then   rejected, same error as for a random uuid
         Spec   D146 (5)

## API (`apps/api`, local, `sen_test`)

R2-AC-12 `/accounts` lists the person's accounts with view balances; archived flagged
         Then   each tracked live: name, app label, balance (sen, integer), opening balance, opening_at,
                checked = opening_at (D147 (2)); elsewhere: no balance; archived: with `archived`
         Sad    B's `/accounts/:A's id` → 404, same as a random uuid
         Spec   brief *Screens made real*, D147 (2)(4)

R2-AC-13 Accounts need the Capture switch (D146 (7))
         Given  capture off   When  GET /accounts   Then  403 `{code:'capture_off'}`
         Sad    capture on → 200

R2-AC-14 Opening balance typed as text into sen
         When   "1234.50" / "0"   Then  123450 / 0 stored, BIGINT
         Sad    "12.345", "abc", "-5", "1e3", "99999999999999999999", a JSON number 12.5 → 4xx
                `{code, message, field}`, never a 500, never a rounded value
         Spec   non-negotiable *integer sen*, D146 (4)

R2-AC-15 Correcting an opening balance keeps opening_at
         Then   opening_at unchanged after an edit; balance moves by exactly the difference
         Spec   D146 (4)

R2-AC-16 Every write is idempotent (a dedupe key)
         When   the same command (same id) is sent twice
         Then   one row; the second returns success and changes nothing
         Spec   non-negotiable *dedupe key*

R2-AC-17 `/me` reports setup; finishing sets `setup_done_at`
         Then   `setupDone` false → true after the last step; `user_settings.setup_done_at` not null
         Sad    finishing twice leaves the first timestamp

R2-AC-18 Names and payday validated
         Then   own_names = {'TAN WEI MING'}; expected_payday 'last working day' or 1..31
         Sad    payday 0, 32, 'abc'; a name 10 000 chars; a NUL → 4xx, not stored
         Spec   §15 user_settings, D14, D17

R2-AC-19 Category commands: rename, add, archive, flags; system ones refuse archive in words
         Sad    archive Cash → 4xx with a message a person can read; add with kind 'x' → 4xx
         Spec   §8, brief, D146 (6)

R2-AC-20 The offline copy carries the ledger
         Then   `/sync/changes` returns categories, accounts, account names and own names; paging by one
                counter returns each row once across pages
         Spec   brief *Added to the offline copy*, D146 (9)

## First run (web app at 390×844, native steps simulated)

R2-AC-21 Seven steps in order, *Step N of 7*; the tab bar hidden throughout
         Spec   §9.5, screens.md *Rules* (tab bar hides during first-run)

R2-AC-22 Who is sent to first run (D146 (2))
         Then   not set up + shell + capture → first run; capture on in a plain browser → not sent;
                set up → never sent; opening /first-run after setup lands on Home (steps never come back)
         Spec   D26, D146 (2), §9.5

R2-AC-23 Closed mid-way reopens at the same step, with what was typed
         When   reload at step 4; reload at step 5 with a balance typed but not saved
         Then   step 4 again; step 5 with the typed amount
         Spec   brief *Done when* 1, flows *Closed mid-setup*, D146 (1)

R2-AC-24 Accounts step: one per chosen app, nothing else
         Given  chosen TNG, Ryt, Public Bank, Grab
         Then   exactly 4 balance fields, named from the curated list; no *Add*; a card wallet (Google
                Wallet) offers none; TNG's line says *eWallet and GO+ together*, Ryt's *Main account and
                pockets together*
         Sad    an empty field blocks Continue with words; 0 is accepted and shows RM0.00
         Spec   D145, D146 (4), D147 (1)(3)

R2-AC-25 Amounts typed like a bank app (D132, D147 (1))
         When   1,2,5,0   Then  12.50; stored 1250
         Sad    `.` and letters ignored; 0 → 0.00; backspace from 0.00 empties

R2-AC-26 Name and payday saved
         Then   own_names {'TAN WEI MING'}; payday defaults to the last working day; a day number saves
         Sad    offline at step 6–7: they survive (outbox) and reach the server once on reconnect (D146 (8))

R2-AC-27 Finishing lands on Home with the accounts' opening balances in the total
         Then   Home's total balance = sum of typed balances; Accounts shows each opening balance
         Spec   brief *Done when* 2

R2-AC-28 Access refused → *Skip for now* → Home shows *Capture is off* with *Fix*
         Spec   flows `first-run` *When it goes wrong*

R2-AC-29 Without capture: the short first run (sign-in, categories, Cash locked on, no payday)
         Spec   §9.6, D79, D147 (5)

## Screens made real

R2-AC-30 Accounts: the total; each tracked account with balance and last checked; Elsewhere without
         balance; archived with *Bring back*; bringing one back over a newer live one refused in words
         Spec   screens.md `accounts`, D147 (2)(4)

R2-AC-31 Account: balance, opening balance, the feeding app, recent payments (an empty state now)
         Spec   screens.md `account`

R2-AC-32 Without capture there is no Accounts entry, and its URL doesn't show money
         Spec   screens.md *A person sees only what they can use*

R2-AC-33 Settings → Categories: rename, add, archive (with *Bring back*), flags; Unaccounted shown as not
         pickable / not archivable; patterns' rows and forms
R2-AC-34 Settings → You: names (capture only), expected payday
R2-AC-35 Money as `RM1,284.50`; never a float on screen (`12.5`, `12.499999`)
         Spec   patterns §3

## Non-negotiables

R2-AC-36 No float in any money path in the diff (`parseFloat`, `toFixed`, `Number(` on amounts)
R2-AC-37 The preview seed and fixtures hold no real financial data
R2-AC-38 The production bundle holds no secret
R2-AC-39 The admin reads none of anyone's accounts, balances or categories
R2-AC-40 Timezone: with the browser in another timezone, opening_at and dates show in KL time and the
         balance doesn't move
R2-AC-41 One set of UI patterns: first run's steps, Accounts, Account, Categories and You use the
         shared rows, forms, empty and error states

## Added after reading run 1's criteria (written after the source was read: weaker evidence)

R2-AC-42 First run's draft never reaches the next person on the device: sign-out, or a different person
         signing in, empties `sen.firstRun`   (run 1 AC-21s; B08 security review)
R2-AC-43 Playwright walks `first-run` with the native steps simulated, in all six looks   (brief done-when 5)
R2-AC-44 pgTAP and the catalogue check cover every new table and view   (brief done-when 4)

---

# Run 3 (fresh full run, 10 Nov): criteria written from the docs before the source

Written from `spec_v2.md` §7, §8, §9.5, §9.6, §15; D14, D17, D26, D33, D79, D86, D93, D145–D147;
`docs/screens.md` (`first-run`, `accounts`, `account`, Settings → You / Categories and rules);
`docs/flows.md` `first-run` (core); the brief. Not read before writing: the source, and the earlier
runs' criteria. IDs are `R3-AC-n`; each sad twin is `n.s`.

## Data (`sen_test` / my own `sen_qa`)

R3-AC-1   Money columns are integer sen
          Given  the migrated schema
          When   `information_schema.columns` is read for `accounts.opening_balance`,
                 `transactions.amount`, `transactions.my_share`
          Then   each is `bigint`
R3-AC-1.s A fractional opening balance is refused
          When   `INSERT … opening_balance = 10.5` (as the API role, as a person)
          Then   an error (or it's coerced only by an explicit cast nobody makes); never stored as 10.5
          Spec   CLAUDE.md non-negotiable; §15

R3-AC-2   RLS on every new table, forced, keyed on user_id
          Then   `accounts`, `account_names`, `categories`, `transactions`, `user_settings` have
                 `relrowsecurity` and `relforcerowsecurity` true and a policy comparing user_id
R3-AC-2.s User B reads none of A's rows through any table or view (`account_balances`,
          `balance_totals`), with no user id set reads 0 rows, and can't insert a row with A's user_id
          Spec   CLAUDE.md; §15; D52

R3-AC-3   Views are security_invoker
          Then   `account_balances` and `balance_totals` have `security_invoker=true` in reloptions
R3-AC-3.s As B, `select * from account_balances` returns no A row
          Spec   §15

R3-AC-4   Balance = opening + in − out, after opening_at only
          Given  an account opening RM100.00 at T; transactions in RM50.00 at T+1s, out RM20.00 at
                 T+1s, out RM7.00 at T−1s, in RM1000.00 at exactly T
          Then   the balance is 13000 sen (10000 + 5000 − 2000), the T and T−1s rows not counted
R3-AC-4.s A deleted (`deleted_at` set) transaction after T doesn't count; another person's
          transaction naming this account is impossible (FK or RLS refuses)
          Spec   §7 *Opening balance*, *Balance*; brief Done-when 2; D146(4)

R3-AC-5   The total sums tracked accounts only
          Given  two tracked accounts (13000, 5000) and one elsewhere and one archived
          Then   `balance_totals` = 18000; elsewhere shows no balance (§7)
R3-AC-5.s A person with no accounts gets a total of 0 or no row, never an error
          Spec   §7 *Elsewhere*, *Balance*

R3-AC-6   One live account per app
          When   a second live account with the same `notifier_package` is inserted for one person
          Then   it's refused (unique violation)
R3-AC-6.s The same package for two different people is allowed; an archived account doesn't block a
          new one
          Spec   D145, D146(6)

R3-AC-7   Categories seeded once from the starting list
          Given  a person after first run's start
          Then   exactly 18 spend categories with the names of §8, and 3 income (Salary, Interest &
                 returns, Other income); flags: Meals is_meal; Drinks & desserts is_beverage +
                 is_discretionary; Shopping, Entertainment, Gifts & treats, Travel is_discretionary;
                 nothing else flagged; system keys salary, cash, unaccounted on Salary, Cash,
                 Unaccounted
R3-AC-7.s Starting first run again (retry) adds nothing: still 21 rows; a person who already has
          categories gets none added
          Spec   §8; D33; D146(3)

R3-AC-8   Unaccounted can't be picked by hand
          Then   Unaccounted isn't offered in any category picker (Settings → Categories lists it
                 read-only or not at all); the API refuses a manual transaction / rule on it
R3-AC-8.s A transaction of kind ≠ adjustment booked to Unaccounted is refused by the database
          Spec   §8; brief Done-when 3; D146(6)

R3-AC-9   System categories are never archived; renaming one breaks nothing
          When   Cash is renamed "Tunai"
          Then   its system_key is still `cash`
R3-AC-9.s Archiving Salary/Cash/Unaccounted is refused (API error shape, and the DB check)

R3-AC-10  Composite user_id references
          When   B inserts a transaction with A's account_id, or an account_name naming A's account
          Then   refused (FK failure), with no signal whether the id exists
          Spec   D146(5)

## API (`apps/api`, local)

R3-AC-11  GET /accounts lists the person's accounts with balance from the view, opening balance and
          opening_at, feeding app, and `archived` ones separately
R3-AC-11.s Signed out → 401 `{code,message}`; capture off → 403 `capture_off` (D146(7)); B gets none
          of A's
R3-AC-12  GET /accounts/:id for one's own account → the account; another's id → 404 (not 403)
R3-AC-12.s A malformed id → 400/404 structured, never 500
R3-AC-13  Opening balance correction keeps `opening_at` (D146(4))
R3-AC-13.s A negative, fractional ("12.345"), non-numeric, or huge (> 2^53) opening balance is
          refused with `{code,message,field}`
R3-AC-14  Every write is idempotent: the same command (same id) twice changes nothing — one account,
          one category
R3-AC-14.s Two first-run "add account" calls for the same app (different ids) → one live account,
          the second is refused or upserts
R3-AC-15  /me says `setupDone` after first run finishes; before, false
R3-AC-15.s Finishing twice changes `setup_done_at` once (or keeps the first)

## First run (web, 390×844, native steps simulated)

R3-AC-16  A signed-in person in the shell with Capture who hasn't finished is sent to first run at
          *Step 2 of 7*; a finished person never sees it again (D26, D146(2))
R3-AC-16.s A person with Capture in a plain browser isn't sent to first run (D146(2))
R3-AC-17  The accounts step offers exactly one account per chosen app, named from the curated list,
          and nothing else (no *Add a pot*, no Elsewhere) (D145, §7)
R3-AC-17.s Un-ticking an app in step 2 removes its account from step 5; a card wallet (Google
          Wallet) gets no account
R3-AC-18  A balance typed "1,234.50" is stored as 123450 sen; "0" is RM0.00 and allowed (D147(1))
R3-AC-18.s Empty balance blocks *Next* with words; "12.345", "abc", "-5" are refused in words; no
          float at any step
R3-AC-19  Reload at each step reopens at the same step with what was typed (D146(1))
R3-AC-19.s After finishing, a reload goes Home, not back into first run; steps never come back (D26)
R3-AC-20  The name step stores own_names = {'TAN WEI MING'}; the payday step stores the last working
          day by default, or a day number 1–31
R3-AC-20.s Payday 0 or 32 refused; an empty name is allowed or refused in words, never a crash
R3-AC-21  The short first run (no capture) is sign in and categories, any switchable off except
          Sen's own (Cash locked on, D147(5)); no payday question (D79)

## Screens made real

R3-AC-22  Accounts shows the total and each tracked account's balance from the view, its line saying
          what the one figure holds (*eWallet and GO+ together*), archived ones with *Bring back*
          (D147(3),(4))
R3-AC-22.s Empty state per patterns when no accounts; error state when the API fails
R3-AC-23  Account shows balance, opening balance, the app that feeds it; `checkedAt` = opening_at
          (D147(2))
R3-AC-24  Settings → Categories: rename, add, archive, set flags — each persists across reload and is
          in the DB
R3-AC-24.s Duplicate name, empty name, over-long name refused in words; Unaccounted's flags locked
R3-AC-25  Settings → You: names and expected payday persist (row in user_settings)
R3-AC-25.s Without capture, names aren't shown (screens.md: names capture only)

## Non-negotiables touched

R3-AC-26  No float in money: grep of the diff for parseFloat/toFixed/Number( on amounts → none in
          money paths
R3-AC-27  Every input has a dedupe key: first-run writes carry client ids; a replayed outbox
          `setting.set` is a no-op
R3-AC-28  The admin reads nobody's accounts, balances or categories
R3-AC-29  One set of UI patterns: the new screens use patterns.md's list row, form, empty/loading/
          error states
R3-AC-30  The built bundle holds no secret

# Run 4 (fresh full run, 10 Nov): criteria written from the docs before the source

Written from the brief, `docs/modules.md` § B08, `spec_v2.md` §7, §8, §9.5, §9.6, §15; D14, D16, D17,
D26, D28, D33, D38, D79, D86, D93, D132, D145–D148; `docs/screens.md` (`first-run`, `accounts`, `account`,
Settings → You / Categories and rules, the rules every screen follows); `docs/flows.md` (`first-run`,
`invited`, the core journeys); `docs/ui/patterns.md` §3, §7; `docs/workflow/qa.md`. Not read before
writing: the source and the earlier runs' criteria (only their headings, for the file's format). IDs
are `R4-AC-n`; each sad twin is `n.s`. Observables are row counts, stored values in sen, HTTP codes
with `{ code, message, field? }`, and rendered strings at 390×844.

## Data (Postgres: `sen_test` via `pnpm test:db`, then my own probes on it)

R4-AC-1   Money columns are integer sen
          When   `information_schema.columns` is read for `accounts.opening_balance`,
                 `transactions.amount`, `transactions.my_share`
          Then   each `data_type` is `bigint`
R4-AC-1.s A fractional amount is never stored
          When   the API role inserts `opening_balance = 10.5` (a numeric literal)
          Then   it errors or is refused; no row holds a fractional value (bigint cannot)
          Spec   NN money; §15

R4-AC-2   Every new table has RLS enabled and forced, keyed on `user_id`
          When   `pg_class.relrowsecurity` / `relforcerowsecurity` are read for `accounts`,
                 `account_names`, `categories`, `transactions` (and `user_settings`)
          Then   both are true, and each has a policy comparing `user_id` with the request's user id
R4-AC-2.s A person with no user id set reads nothing
          When   the API role queries each table and view with no user id set
          Then   0 rows (or an error), never another person's rows
          Spec   NN RLS; §15

R4-AC-3   User B sees none of user A's rows, through any table or view
          Given  A and B each with accounts, categories and transactions
          When   B (as the API role) selects from every new table and `account_balances`, `balance_totals`
          Then   0 of A's rows; B's own rows only
R4-AC-3.s B can't write into A's world
          When   B inserts a transaction naming A's `account_id` or `category_id`, or updates A's account
          Then   refused (0 rows updated / FK or RLS error); and the error is the same whether A's id
                 exists or is random (no existence oracle, D146 (5))
          Spec   NN RLS; D52; D146 (5)

R4-AC-4   Views are `security_invoker`
          When   `pg_class.reloptions` is read for the balance views
          Then   it contains `security_invoker=true`
R4-AC-4.s Without it, the view would leak; a view read as B returns only B's balances (covered by AC-3)
          Spec   §15 *Every view is created WITH (security_invoker = true)*

R4-AC-5   The admin never reads anyone's money
          When   the admin, as the API role with their own user id, reads `accounts`, `transactions`,
                 `account_balances` for another person
          Then   0 rows
R4-AC-5.s No admin function returns accounts, balances or categories of another person
          Spec   NN; D52; §9.6

R4-AC-6   The starting categories are exactly the list (D33)
          When   `seed_categories()` runs for a new person
          Then   21 rows: 18 `spend` and 3 `income`, names exactly §8's table; flags exactly:
                 Meals meal only; Drinks & desserts beverage + discretionary; Shopping, Entertainment,
                 Gifts & treats, Travel discretionary; every other flag false; `system_key` = salary on
                 Salary, cash on Cash, unaccounted on Unaccounted, null elsewhere
R4-AC-6.s Seeding twice, or for someone who already has categories, adds nothing
          When   `setup.start` / `seed_categories()` runs again, or for a person who added a category first
          Then   still one row per name; no duplicate set (D146 (3)); a category added before first run
                 joins the starting list rather than replacing it
          Spec   §8; D33; D146 (3); B DW3

R4-AC-7   Sen's own categories are never archived; Unaccounted carries no flags
          When   `archived_at` is set on Salary, Cash or Unaccounted, or a flag set true on Unaccounted
          Then   a check constraint (or the API) refuses it; the row is unchanged
R4-AC-7.s An ordinary category archives and comes back
          When   Shopping is archived, then brought back
          Then   `archived_at` set, then null; its id is unchanged
          Spec   §8; D146 (6)

R4-AC-8   Unaccounted can't be picked by hand
          When   a transaction with `kind = spend` (source manual or notification) is given Unaccounted's id
          Then   refused by the database (trigger) and by the API
R4-AC-8.s A balance check's adjustment may use it
          When   `kind = adjustment`, `source = adjustment` with Unaccounted
          Then   accepted
          Spec   §8; §7 *Balance checks*; B DW3; D146 (6)

R4-AC-9   One live account per app (D145)
          When   a second live account with the same `notifier_package` is inserted for the same person
          Then   unique violation; 1 live row
R4-AC-9.s An archived account doesn't block a new one; two people may share a package
          When   the first is archived, then a new live one is added; or B adds the same package
          Then   accepted
          Spec   D145; D146 (6)

R4-AC-10  `accounts.kind` is tracked or elsewhere; `account_names` unique per (user, package, label)
          When   kind 'savings' is inserted; or the same (package, label) twice
          Then   both refused
R4-AC-10.s An `account_names` row can't point at another person's account
          Then   refused by the composite FK (D146 (5))
          Spec   §15; D146 (5)

R4-AC-11  The balance view: opening + in − out, only what moved strictly after `opening_at`
          Given  opening RM100.00 at T; out 12.30 at T−1 µs; out 5.00 at T exactly; in 20.00 at T+1 µs;
                 out 3.45 at T+1 day; out 7.00 at T+2 days with `deleted_at` set
          Then   balance = 10000 + 2000 − 345 = 11655 sen
R4-AC-11.s The boundary rows and a deleted row don't count; another person's rows don't count
          Then   removing the T−1 µs, T and deleted rows changes nothing; B's identical rows move only B
          Spec   §7 *Opening balance*, *Balance*; B DW2; D146 (4)

R4-AC-12  The total is the sum of tracked, live accounts' balances
          Then   `balance_totals` = Σ of tracked accounts' balances, in sen, exactly
R4-AC-12.s An *Elsewhere* account's figure isn't in the total and isn't shown
          Spec   §7 *Elsewhere*, *Balance*; screens `accounts`

R4-AC-13  `transactions` holds its core columns with checks
          Then   columns from the brief exist; `direction` ∈ out|in; `kind` ∈ spend|income|transfer|
                 repayment|refund|adjustment; `source` ∈ notification|receipt|manual|inferred|adjustment;
                 `status` ∈ needs_attention|done|pending; `my_share` defaults to `amount`
R4-AC-13.s A bad enum value, or a negative amount, is refused
          Spec   §15; B *Data*

R4-AC-14  `user_settings` holds `own_names text[]` and `expected_payday` (last working day or a day number)
          Then   a day number 1–31 or "last working day" is stored
R4-AC-14.s Day 0, 32, or text is refused
          Spec   §15; §7 *Pay cycles*; D14

R4-AC-15  Two requests on one pooled connection never see each other's user id
          Then   a second transaction on the same connection, with no user id set, reads 0 rows
R4-AC-15.s After a failed (rolled-back) request, the user id doesn't linger either
          Spec   docs/workflow/qa.md; §5

## API (`apps/api`, local, `sen_test`)

R4-AC-20  `/accounts` returns the person's accounts with balances from the view
          Then   each account's balance in sen equals `account_balances`; its feeding app's label;
                 opening balance; archived ones only with `archived`
R4-AC-20.s With *Capture* off, `/accounts` answers 403 `{ code: "capture_off" }` (D146 (7))

R4-AC-21  An opening balance is typed text parsed into sen
          When   a setup/account command carries `"0"`, `"1284.50"`, `"12"` (or the shape the API takes)
          Then   stored 0, 128450, 1200 sen
R4-AC-21.s Empty, a float number, `"1.005"`, `"abc"`, a value past bigint, a NUL are refused
          Then   400 `{ code, message, field }`, never 500, never a row
          Spec   NN money; D132; D146 (4); D148

R4-AC-22  Every write is idempotent by its key
          When   the same account/category command (same id) is sent twice
          Then   one row; the second changes nothing
R4-AC-22.s Two different accounts for one app are refused in words (one per app)
          Spec   NN dedupe; D145

R4-AC-23  Correcting an opening balance keeps `opening_at`
          Then   `opening_balance` changes; `opening_at` is unchanged (D146 (4))
R4-AC-23.s Another person's account id: 404, same as a random id; nothing changes

R4-AC-24  Categories: add, rename, archive, set flags
          Then   each persists; `/categories` returns them
R4-AC-24.s A taken name (case/space-insensitive), an empty name, Unaccounted's flags, archiving a
          system category: refused with a field error
          Spec   §8; B *Screens made real*

R4-AC-25  `/me` says `setupDone`; finishing sets `setup_done_at` once
          Then   false before; true after `setup.finish`; a second finish doesn't move the timestamp
R4-AC-25.s Finishing before any account / names? — what the spec requires; an unauthenticated `/me` is 401

R4-AC-26  `/sync/changes` carries accounts, account names, categories and own names, paged past one page
          Then   every row arrives exactly once across pages
R4-AC-26.s A row changed between pages isn't lost

R4-AC-27  D148: an app chosen after first run can get its account
          Given  a person who finished first run, then chose another app
          Then   that app is listed under *Not added yet*; adding it with a typed balance makes one
                 account, `opening_at` = save time; 0 counts
R4-AC-27.s Empty balance refused; a second add for the same app refused; nothing made silently

R4-AC-28  D147 (4): archived accounts are listed with *Bring back*
R4-AC-28.s Bringing one back over a newer live account for the same app is refused in words

## First run (web app at 390×844, native steps simulated)

R4-AC-40  Who is sent to first run (D146 (2))
          Then   signed in, unfinished, in the shell with Capture → `/first-run`, *Step 2 of 7*;
                 unfinished without Capture → the short first run (categories); finished → Home
R4-AC-40.s Capture in a plain browser isn't sent; a finished person typing `/first-run` lands Home

R4-AC-41  Closed mid-setup reopens at the same step, with what was typed (B DW1)
          Then   reload at step 4 shows step 4; a balance typed and not saved is still there
R4-AC-41.s Signing out clears the draft; another person on the phone starts clean

R4-AC-42  The accounts step: one field per chosen app, named from the curated list (D145)
          Then   TNG's says *eWallet and GO+ together*, Ryt's *Main account and pockets together* (D147 (3));
                 a card wallet gets no field; typed bank-style (1,2,5,0 → 12.50); typed 0 → RM0.00
R4-AC-42.s An empty balance can't continue; the button says what's missing; nothing saved

R4-AC-43  Names and payday
          Then   `TAN WEI MING` stored in `own_names`; payday default *last working day*; a day number stored
R4-AC-43.s A blank name? (what the spec allows); payday 0 / 32 not offered

R4-AC-44  Finishing lands on Home and the steps never come back (D26)
          Then   `setup_done_at` set; Home; Accounts lists each typed balance exactly
R4-AC-44.s A failed save shows an error in words, keeps what was typed, and retries

R4-AC-45  Access refused → *Skip for now*; Home shows *Capture is off* with *Fix*

R4-AC-46  The short first run (no Capture): the categories, Cash locked on (D147 (5)); no payday question (D79)

## Screens made real

R4-AC-50  `accounts`: the total; each tracked account with its balance; *Elsewhere* without balance;
          *Not added yet* with *Add* (D148); figures equal the view, `RM1,284.50` format (P §3)
R4-AC-50.s With Capture off, no Accounts in More and the route doesn't open

R4-AC-51  `account`: its balance, opening balance, the app that feeds it, checked at `opening_at` (D147 (2))
R4-AC-51.s Another person's account id in the URL shows not-found, never their data

R4-AC-52  Settings → Categories: rename, add, archive, flags; Unaccounted shown but not editable/pickable
R4-AC-52.s A taken name is refused in words, the typed text kept

R4-AC-53  Settings → You: names and payday persist across reload; names only with Capture

R4-AC-54  Every new screen uses the shared blocks (list row, form, sheet, empty/loading/error) (NN, P §7)

R4-AC-55  Timezone: with the browser in `America/New_York`, opening dates/balances don't move (conventions)

## Non-negotiables touched

R4-AC-60  No float money in the diff (`parseFloat`, `toFixed` on amounts, `Number(` on amount strings,
          division outside the money module): 0 unsafe hits
R4-AC-61  No secret in the built bundle; no real financial data in fixtures (`pnpm hygiene`, gitleaks)
R4-AC-62  Every input has a dedupe key (AC-22)
R4-AC-63  RLS on every table from its first migration (AC-2, AC-3)
R4-AC-64  One navigation, one set of UI patterns (AC-54)

## Run 4: added after reading the source (weaker evidence)

R4-AC-70  A balance check's adjustment into Unaccounted is accepted, and can't later become a spend there
          (the trigger fires on `kind` too): pinned by a test, so a change to the trigger goes red
R4-AC-71  Every capture-gated route and command (GET /accounts/:id, account.edit, account.archive) answers
          403 `capture_off` with Capture off, pinned by a test
R4-AC-72  Each screen's committed accessibility tree matches what the screen renders (first-run@accounts)

# Run 4, scoped (tier 2, 10 Nov): the fixes in 23da7b6..0944abe

Area: Accounts and adding an app's account (§7, screens.md *Accounts*, D145, D147 (4), D148), and the money
field wherever an amount is typed while an error shows (patterns.md §2, §7). Resumed reviewer: these
criteria were written after reading the fix commits, so they're the criteria the fixes call for.

R4S-AC-1  An app whose only account is archived isn't offered as new
          When   the account is archived and the app is still chosen
          Then   no *Add <app>* on Accounts; *Bring back <name>* is there
R4S-AC-1.s A chosen app with no account at all, archived or live, is still offered
          Then   *Add <app>* shows for it, beside an archived one's *Bring back*
R4S-AC-2  With no live tracked account, Accounts shows no total and no *Check balances*
          Then   no "In 0 accounts", no RM0.00 figure; what is there says what to do in words
R4S-AC-2.s Bringing the account back restores the total exactly
          Then   "In 1 account" and the opening balance as before; `opening_at` unchanged
R4S-AC-3  `/accounts`'s archived rows carry their package; another person's archived rows aren't there
R4S-AC-4  A typed amount is drawn in the text colour while an error shows: computed `color` of the amount
          equals the field's `--foreground`, in light and dark; the label and message stay `--destructive`
R4S-AC-4.s An empty field with an error shows its placeholder (if any) in its own muted colour, not red
R4S-AC-5  (finding 1) pgTAP: an adjustment books to Unaccounted, and can't become a spend there
R4S-AC-6  (finding 2) the three Capture checks each answer 403 `capture_off`, pinned by a test
R4S-AC-7  (finding 4) the spec, a decision and the schema say what a NULL `my_share` means; no reader
          of `my_share` skips the coalesce
R4S-AC-8  (finding 5) CI re-records the trees and fails on any difference; a stale placeholder fails it
