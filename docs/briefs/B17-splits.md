# B17 · Splits

**Stage 4 · Receipts and shared bills** · after: B16 · next: B18

## Goal

Any bill can be split, whoever paid it, and your books stay exact.
- Your spending is your share.
- Repayments tick friends off.
- What you owe a friend is matched to your payment to them.
- *Just my part* keeps only your items from a group receipt.

Friends tick on the payer's phone here; B18 adds the public link.

## Read first

- `spec_v2.md`:
  - §6.3: *Every payee is a merchant*, the paying-back exception
  - §6.4: ***Just my part***
  - §6.6: the rows for splits, unseen names and the *Others* pool
  - §7:
    - *Spending vs cash flow*, *The shared-bill rule* and its worked example
    - *Owing exists only on a split*
    - *Splits*: every bullet except *The link* and *Paying from the same phone*
    - *Lending*
  - §15: `splits`, `split_members`, `split_picks`, `payer_names`, `receipt_items.kind`, and the views
    for owed and split shares
  - §16: `/splits` and `/match`
- Decisions: D19, D64, D65, D66, D70, D71 (with its amendment), D92.
- `docs/screens.md`:
  - `split`, `shared`, `confirm` (after *Split*) and `txn` (*Split*)
  - the paying-back prompt and owe reminder rows
  - *Defaults to confirm* item 7
- `docs/flows.md`: `split-mine`, `paid-back`, `split-theirs`, `split-stuck` and `lend`.

## Builds

### Data and rules
- **The tables,** with ids made on the phone, so `POST /splits` returns the same split on a retry.
- **Who paid:** you, or a friend (`paid_by`, `payer_member_id`).
- **Members:** you, friends named by the payer, and the unnamed *Others* (`is_others`).
- **Picks:** an item one person ticks is theirs; an item several people tick is split evenly between
  them, by largest remainder.
- **Done:**
  - each person taps *I've ticked everything I had*
  - a Done can be undone until the lock, and ticking again undoes it
  - friends the payer ticked for count as done
- **The lock (D71):** everyone is done **and** every item is claimed. The payer can lock without
  waiting once every item is claimed. After the lock, only the payer changes a tick.
- **The stuck case:** the payer settles an item nobody ticked with *Everyone* or *Someone else…*.
- **The split-share view,** in SQL and mirrored in TypeScript for live display: each member's
  items, shared items divided evenly, overrides kept, and shares always adding up to the total. A
  split from a payment with no items shares its total evenly, and any share can be changed.

### On your books (D19)
- **If you paid:**
  - your spending is the smaller of `my_share` and the amount minus the linked repayments
  - *Owed to you* is the amount minus `my_share` minus repaid, never below zero
  - *Write off* raises `my_share`
- **If a friend paid:** your share is an amount you owe, not a transaction. Your payment to them,
  within RM5 and 30 days, becomes the spending, in the receipt's categories, with the receipt
  attached. *I've paid* ticks it by hand (Public Bank doesn't notify money out).
- **Lending** is a split of a payment whose whole amount goes to one friend (D70).

### Matching repayments (`/match`)
- **Money in that matches an open share** ticks it.
- **Money in from a name Sen hasn't seen, when it fits a share:** *Review* asks *Whose split share is
  it?*, with the shares it could be and *Not a split*. The answer teaches `payer_names`, for you
  alone.
- **The payer's tick list:** how each share was ticked (*matched: Ryt, today 11:58*, or *ticked by
  you*).
- **A payee matched to a split you owe** gets the native ***Paying back*** prompt first, offline,
  instead of a new merchant rule. Owed shares and their learned bank names join the offline copy.
- **The owe reminder:** an hour after the split, if your share is unpaid, one push written by code
  (a one-off job, B06), and a *Review* row.

### *Just my part* (D92)
- **You tick your items.** On *Done*, every unticked item folds into one *Others' items* line
  (`receipt_items.kind = others`), keeping the printed total exact in sen. The full read stays in
  `receipt_extractions`, and *Others* always counts as done, so the split locks at once.
- **If a friend paid,** you owe your part, matched as above. A payment to a new name that fits
  offers *Paying back* first.
- **If you paid the whole bill:**
  - *Others* owes the rest as one pool
  - money in that fits asks *Is this for … others' part?* once
  - a status card reads *RM30.40 of RM45.60 back*
  - *Write off* is there any time

### Screens made real
- **`split`:** the status card first, then the items with who ticked them, the payer's tick list,
  *You owe…* and *Your share, your spending*. The QR and the link come in B18.
- **`shared`.**
- **`confirm`'s *Split* flow,** and `txn`'s *Split* (share, *Just my part*, lend).
- ***Waiting on others*** in *Review*. The *Shared* filter in `payments`.

## Done when

1. SQL tests:
   - §7's worked table: Ali repays, then Ben repays
   - largest remainder: RM20.99 shared three ways gives RM7.00, RM7.00 and RM6.99
   - the lock matrix: who's done against what's claimed, and the payer's lock
   - repayment matching, and an amount owed matched within RM5 and 30 days
2. Playwright walks `split-mine`, `paid-back`, `split-theirs` (the friend's side simulated),
   `split-stuck` and `lend`, in all six looks.
3. The *Paying back* prompt shows offline on the emulator, and the owe reminder pushes once.
4. *Just my part* keeps the printed total exact, and the *Others* pool's status card counts
   repayments.
5. **On the Xiaomi:** a real split with a friend paying back is ticked by the bank notification.
