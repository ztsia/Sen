# B33 · Sen's advice (P6b)

**Stage 7 · Sen** · after: B32 · next: B34

## Goal

Sen's three advisory skills work from confirmed products and real spending, with code doing every
comparison:
- a rate watcher for savings
- a product advisor (is a card worth it, and which to use for what)
- *money left on the table* once a cycle

## Read first

- `spec_v2.md`:
  - §12.1: *Research and optimise* (all of it)
  - §12.3: `get_products`, `compare_products` and `get_left_on_table`
  - §12.5: the skills `rate-watcher`, `product-advisor` and `left-on-table`
  - §7: a new card is a tracked account, and paying its bill is a transfer
- Decisions: D39, D40.

## Builds

- **`rate-watcher`:**
  - where to keep savings (Ryt, other digital banks, GO+, fixed-deposit promos)
  - researched through B32, with code comparing confirmed figures against the real balances, caps
    and promo end dates
  - a monthly re-check in the morning job that tells the owner when something changes
- **`product-advisor` with `compare_products(kind)`,** deterministic: spending by category over the
  last 12 cycles × each confirmed product's rates, within its caps, minus its fees.
  - It recommends a credit card only on the condition that the bill is paid in full every month, and
    then watches that it is.
  - Once products are held, it says which to use for each kind of spending.
  - Signing up is the owner's to do.
- **`left-on-table` with `get_left_on_table(cycle)`,** deterministic, once a cycle, in ringgit, each
  with its fix:
  - cashback missed by paying the wrong way (from confirmed products)
  - interest lost on idle balances
  - fees paid

## Done when

1. `compare_products` and `get_left_on_table` pass SQL tests on hand-checked fixtures: caps, fees,
   and a card that loses after fees.
2. Each skill answers using code's figures only, with the figure check passing.
3. **On the phone:** each answers a real question from confirmed products.
