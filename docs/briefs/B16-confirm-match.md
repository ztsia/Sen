# B16 · Confirm and match

**Stage 4 · Receipts and shared bills** · after: B15 · next: B17

## Goal

`confirm` turns a receipt into its itemised list, adding up exactly to the total, with categories
decided by rules. Its *Done* attaches the receipt to the payment the notification recorded, whichever
arrived first. A payment with no receipt can still say what it was. Meal averages have their
headcount.

## Read first

- `spec_v2.md`:
  - §6.4: *Confirm screen* (every bullet except *Just my part*), *No receipt* and *Matching to a
    payment*
  - §6.5: the receipt and manual rows
  - §6.6: the receipt rows
  - §7: *A bill you paid and didn't split*
  - §8: *Merchant rules* (*by item* and aliases)
  - §15: `receipts`, `receipt_items`, `merchant_rules.category_mode`, `merchant_aliases` and
    `transactions.no_receipt`
  - §16: `/match`
  - §21: Q11
- Decisions: D51, D66, D67, D89, D90.
- `docs/screens.md`:
  - `confirm`, `receipt`, and `txn`'s receipt row
  - the quiet scan prompt row of *Native surfaces*
  - *Defaults to confirm* item 5, as settled in B04
- `docs/flows.md`: `scan-after` and `receipt-first`.

## Builds

### `confirm` (D66, D67, D89)
- **Merchant and date, then one category row:**
  - the category, when every item shares it
  - otherwise *Mixed*, with each item's category on its second line
  - either opens the category sheet
- **The items:**
  - each item's price includes its share of tax and service, spread pro rata by largest remainder,
    so the items add up exactly to the total
  - the receipt's own subtotal, tax and service lines stay
  - the arithmetic is checked on the full receipt
  - low-confidence values are marked in place
- **Categories:**
  - a known merchant's rule fills every item, and the model's guesses are ignored
  - the guesses are used only for a new merchant or a *by item* rule
  - a first mixed receipt makes a *by item* rule, with its largest category as the fallback
- **How many people ate,** a stepper (D66): the meal average is the bill ÷ the people who ate.
  Without a split, all of the bill is your spending.
- **A muted *Add a note* row.**
- ***View photo*** opens the image, zoomable.
- ***Done*** and ***Split***. *Split* reaches B17's flow; until then it shows *Not built yet*.
- ***Not a payment? Keep it as evidence*.**
- **By hand** (from *No receipt… → Enter the items*): the same list typed in, checked against the
  payment's amount. *RM3.20 not itemised* is allowed. It's saved with `source = manual`, no file,
  and an id made on the phone.

### Matching (`/match`, either order, idempotent)
- **An unlinked payment with the same amount within ±3 hours:**
  - **one:** attach the receipt, with the toast *Attached to RM58.30 on Ryt* and *Undo*
  - **several:** a sheet asks which
  - **none:** the receipt waits in *Review*'s *Waiting on others* and attaches itself when the payment
    syncs; it never creates a payment while capture is on
- **Without capture,** committing creates the payment (`source = receipt`).
- **A waiting receipt can be:**
  - attached by hand (likely payments: the same merchant, close amounts)
  - kept as evidence only (`evidence`)
  - entered as a payment
- **When the receipt's total equals the payment's amount,** its items become the payment's category
  breakdown, and the row reads *Mixed* with the largest category as its own. When the totals differ,
  the items are detail only. Only one receipt sets a payment's categories; a payment can hold
  several.
- **The receipt's merchant key** becomes an alias of the payment's rule (`merchant_aliases`).
- **A receipt answers a new merchant's prompt** (default 5, as settled in B04).
- **Tune the window and tolerance** (Q11) on real use, and record them.

### *No receipt* (D90) and the quiet prompt
- **`txn`'s receipt row:** *Scan the receipt* and *No receipt…*. *No receipt…* offers *Enter the
  items* or *Just a note*.
- **Either choice** sets `no_receipt`, cancels the scan prompt and has *Undo*.
- **The quiet scan prompt** for known merchants: *RM58.30 · NASI KANDAR ABC · Meals*, with *Scan
  receipt* for that payment. It clears after 10 minutes, and there's a switch in Settings →
  *Capture*.

### `receipt`
- **The digitised receipt:** items, the note, *View photo*, and *Keep as evidence only*.
- **`payments` search** now covers items.

## Done when

1. Unit tests for the spreading: largest remainder always gives back the exact total, on edge cases
   (zero tax, a single item, rounding ties). The full-receipt check passes.
2. SQL tests for matching: one, several, none and later, both orders, outside the window, totals
   that differ, and a second receipt.
3. Playwright walks `scan-after` and `receipt-first` with the simulator, in all six looks.
4. **On the Xiaomi:** a receipt scanned after paying attaches to its payment, and one scanned first
   waits, then attaches when the payment arrives (P4's bar).
5. *No receipt → Enter the items* and *Just a note* work with *Undo*, and the quiet prompt appears
   for a known merchant.
