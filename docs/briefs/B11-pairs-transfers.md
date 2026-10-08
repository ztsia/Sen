# B11 · One payment, one transaction

**Stage 3 · Capture to ledger** · after: B10 · next: B12

## Goal

Every real payment is exactly one transaction:
- however many notifications describe it, whether duplicates, two apps, or a hold and its charge
- with its merchant filled in from a context notification
- a move between the owner's own accounts is one transfer, with a missing side filled in

Money in is classified as income, a transfer or a refund.

## Read first

- `spec_v2.md`:
  - §6.2: *Context* and *Pair rules* (both bullets), and *Each event ends up*
  - §6.3: *Holds never move money*
  - §6.5: the two-notifications row
  - §7: *One app can feed two accounts*, *Transfers between your own accounts* (all of it),
    *Money in from a person*, *Refunds* and *Income*
  - §15: `pair_rules`, `transfer_rules`, `bank_events.linked_event_id`, and the transfer columns on
    `transactions`
  - §16: `/pairs/:id/answer`
- Decisions: D17, D21, D37, D38, D88.
- `docs/notifications.md`: §1 to §6, especially Ryt's duplicates, the petrol hold and Grab's group
  order.
- `docs/flows.md`: `own-transfer`, `money-in` (step 3), `refund`, and `pay-known`'s sad paths.

## Builds

### Pair rules (Kotlin and TypeScript, shared fixtures)
- **`pair_rules`:** two templates, a relation, `window_s`, `match`, `keep`, `status` and
  `created_by`, with `UNIQUE (user_id, template_a, template_b, relation)`.
- **The relations:**
  - `duplicate`: the second copy is ignored
  - `same_payment`: one transaction, with the account from the bank's notification and the merchant
    or service from the other
  - `hold_for`: up to 3 hours, never more than the hold; a hold never moves money
  - `context_for`: fills the merchant or service of a payment within 10 minutes, from the same app
    or another
- **Applied natively and deterministically, in either order.** The first event makes the
  transaction; a partner arriving within the window merges its fields in and is marked `ignored`,
  linked to it.
- **The prompt waits for a partner:** up to 2 minutes, or up to 10 for a charge that names no
  merchant. B12 posts the prompt; this slice provides the wait.
- **Rules are made two ways:**
  - **by code:** two money events, the same amount, within 2 minutes, and no rule yet. *Review* asks
    *One payment or two?* once, and either answer is stored.
  - **by the model while drafting** (B10's schema gains pair proposals): code checks the proposal
    against the real pair and asks once.
- ***These were two payments*** on a merged payment undoes the merge.
- **Pair rules join the offline copy.**

### Transfers between your own accounts (D17)
- **Money to or from a name in `own_names` is a transfer,** never spending or income.
- **Both sides within 30 minutes** become one transfer, sharing a `transfer_group_id`.
- **A missing side,** such as Public Bank's money out:
  - it's filled in from `transfer_rules`, marked `source = inferred` and shown as *Filled in*
  - the first time, *Review* asks *Where did it come from?*, offering your accounts and *Elsewhere*
  - the real side replaces the filled-in one if it arrives
- **Money to your own name that no tracked account receives** went *Elsewhere*. Sen asks once.
- **Moves inside one app,** such as eWallet → GO+, are transfers by their `internal` template.

### Money in
- ***Review* asks money in that isn't a transfer:** *Income*, *Transfer*, or *Refund of…*, listing
  recent payments to that merchant.
- **A refund is linked to its purchase** (`linked_transaction_id`) and is never income. The
  spending maths that subtracts it is in B13 and B20.
- B17 adds *Whose split share is it?* in front of these questions.

### Screens
- **`payments`:** a transfer is one row, *Ryt → TNG eWallet*, and filled-in sides are marked.
- **`txn`:** *These were two payments*, and *Mark as…* transfer or refund.
- **`review`:** the rows above.

## Done when

1. Fixtures for each case produce exactly one correct transaction, in both engines and through
   `/sync`:
   - Ryt's duplicate
   - the petrol hold, then its charge
   - Grab's group-order hold, charge and context
   - Google Wallet and Ryt for one payment
   - Public Bank → Ryt with only Ryt's side
   - TNG → GO+
2. Each pair works in either arrival order, and outside its window it doesn't merge.
3. *One payment or two?* stores both answers as rules. *These were two payments* splits them back.
4. A filled-in side is replaced by the real one without double counting (SQL test on balances).
5. **On the Xiaomi:** a real duplicate, a real own transfer and a real Grab context are each seen
   to land as one transaction.

## On your phone

- [ ] Move money from Public Bank to Ryt. Answer *Where did it come from?* once, then do it again
      and check it fills itself in.
- [ ] Watch for Ryt's duplicates, and Grab's group order, in *Payments*.
