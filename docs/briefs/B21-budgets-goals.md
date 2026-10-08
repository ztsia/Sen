# B21 · Budgets, goals and buckets

**Stage 5 · Insights and plans** · after: B20 · next: B22

## Goal

The owner can set a standing budget for chosen categories and see which are at risk mid-cycle. They
can set savings goals, and buckets for yearly lumpy costs, and see whether each is feasible on their
real surplus. Every figure is computed by code.

## Read first

- `spec_v2.md`:
  - §8: *Budgets*
  - §9.3: the rows for *Which budgets are at risk?* and *Will my goals make it?*
  - §10, all of it
  - §12.1: *Buckets for lumpy costs* (the data now; Sen's proposals in B28)
  - §12.3: what `get_budget_status`, `get_goals` and `find_yearly_costs` will need
  - §15: `budgets`, `goals` and `goal_contributions`, and the budget status view
- Decisions: D29, D31.
- `docs/screens.md`: `budgets`, `goals` and `goal`.
- `docs/flows.md`: `budget` and `goal`.
- Skills: `dataviz` and `database`.

## Builds

### Budgets (D29)
- **Only for the categories you choose:** a standing amount per pay cycle, with `effective_from` and
  `effective_to`, kept until changed. Each cycle starts fresh; nothing rolls over.
- **The budget status view:** spent this cycle against the amount, with how much of the cycle has
  gone.
- **The card:** a meter per budget, with a tick at the cycle elapsed, and `money-warning` with an
  icon and words only when at risk.
- **`budgets`:** add, change or remove a budget, from its card.
- **The 80% and *over* states** come from the view. B29 sends them inside Sen's one push (D31). No
  push is sent here.

### Goals and buckets (§10)
- **`goals`:** kind `goal` or `bucket` (buckets repeat yearly), target, date and status.
- **`goal_contributions`:** added by hand here. From B30, payday plan moves add them.
- **Computed by code:**
  - the amount needed each cycle
  - feasibility against your median surplus, with the sample size shown
  - the projected completion at the current rate
  - competing goals
  - the trade-off framing: *RM200 a cycle less on drinks brings this forward 3 months*, from your
    discretionary categories
- **No investment-return assumptions.**
- **The card *Will my goals make it?*,** and the screens `goals` and `goal`.

## Done when

1. View tests on hand-checked fixtures:
   - budget status at several points in a cycle
   - feasibility with a short history (the sample size shown)
   - the projected finish
   - competing goals
   - the trade-off sentence's numbers
2. Playwright walks `budget` and `goal` in all six looks.
3. pgTAP covers the new tables.

## On your phone

- [ ] Set a budget for one or two categories, and a goal. Do the numbers make sense?
