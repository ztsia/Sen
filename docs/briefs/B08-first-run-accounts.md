# B08 · First run, accounts and categories

**Stage 3 · Capture to ledger** · after: B07 · next: B09

## Goal

The owner goes through first run on the phone and ends with these real:
- their apps, notification access and *Keep Sen running*
- one account per chosen app, with today's balances
- their name as the banks print it, and the expected payday
- the starting categories

The ledger's tables exist (accounts, categories and transactions), with the balance view proven on
fixtures, ready for B09 to book the first transactions.

## Read first

- `spec_v2.md`:
  - §7: *Accounts*, *Opening balance*, *One app can feed two accounts*, *Elsewhere*, *Stored credit*,
    *Accounts follow the apps you chose*, *Cash and the physical TNG card* and *Balance*
  - §8: the categories, their flags and the starting list
  - §9.5, and §9.6's short first run (built in B38, but don't block it)
  - §15: `accounts`, `account_names`, `categories`, `transactions` (create it now, with its core
    columns), `user_settings`, and *SQL views and functions* (balances)
- Decisions: D14, D16, D17, D26, D28, D33, D38, D79, D86, D93.
- `docs/screens.md`: `first-run`, `accounts`, `account`, and Settings → *Categories and rules* and
  → *You*.
- `docs/flows.md`: `first-run`.
- Skill: `database`.

## Builds

### Data
- **`accounts`:** kind `tracked` or `elsewhere`, `notifier_package` and `notifier_label`, opening
  balance in sen, `opening_at`, currency, `archived_at`.
- **`account_names`:** a package and label mapped to an account. B09 uses it for `{account}`.
- **`categories`:** one flat list with `is_discretionary`, `is_meal` and `is_beverage`, kind spend or
  income, `system_key` for salary, cash and unaccounted, and `archived_at`.
  - It's seeded per person at first run from the starting list, plus *Salary*, *Interest & returns*
    and *Other income*.
  - *Unaccounted* can never be picked by hand.
- **`transactions`, with its core columns:**
  - `account_id`, `bank_event_id`, `occurred_at`, `direction`, `amount`, `currency`, `kind`
  - `merchant_raw`, `merchant_key`, `category_id`, `my_share`
  - `source`, `status`, the timestamps and `deleted_at`

  Later slices add their own columns.
- **The balance view,** `security_invoker`: opening balance plus money in minus money out, counting
  only what moved after `opening_at`, per account and in total. Tested on hand-checked fixture rows.
  B13 adds outbox rows and checks.
- **`user_settings`:** `own_names` (text[]) and `expected_payday` (the last working day, or a day
  number).
- Added to the offline copy (B07): categories, accounts, account names and own names.

### `first-run` (the shell)
- **One screen per step,** reopening at the same step if it's closed partway:
  1. sign in
  2. choose your apps (B02's picker)
  3. notification access, with *Allow restricted settings* when greyed out; capture starts here,
     and anything seen waits in the outbox
  4. *Keep Sen running*, for this phone's brand
  5. accounts: one suggested per chosen app (from the curated list's suggestions), *Add a pot*
     (GO+) and stored credit (D93), each with today's balance typed as text into sen; `opening_at`
     is when it's saved
  6. your name, as the banks print it (`TAN WEI MING` in examples)
  7. expected payday
- **The steps never come back.** Anything that breaks later is a Home warning (D26).

### Screens made real
- **`accounts` and `account`:** balances from the view, the app that feeds each account, and opening
  balances. *Last checked* waits for B13.
- **Settings → *Categories*:** rename, add, archive and set the flags.
- **Settings → *You*:** names and expected payday. The DuitNow QR comes in B18.

## Leaves for later

- Transactions from notifications: B09. Balance checks: B13. The browser's short first run: B38.

## Done when

1. The owner completes first run on the Xiaomi. Closing the app at step 4 reopens it at step 4.
2. Each account shows its opening balance. The balance view's fixture tests pass, including the
   `opening_at` boundary: money moved just before it doesn't count, just after does.
3. The categories match the starting list (D33), with their flags and system keys, and *Unaccounted*
   can't be picked.
4. pgTAP and the catalogue check cover every new table and view.
5. Playwright walks `first-run` with the native steps simulated, in all six looks.

## On your phone

- [ ] Run first run for real: your apps, the accounts with today's balances, your name, payday.
- [ ] Open *Accounts*. Do the balances match what you typed?

## Notes

- The soak's events stay unread until B09 and B10. Their transactions will be dated before
  `opening_at`, so they count as spending but not in balances (§7).
