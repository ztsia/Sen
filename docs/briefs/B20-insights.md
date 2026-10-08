# B20 · Insights

**Stage 5 · Insights and plans** · after: B19 · next: B21

## Goal

Insights answers *where did my money go, and am I on track?* with question cards. Each card is a
chart from SQL views over real data, and a one-line takeaway written by code. By now there's about a
month of real data, with receipts and splits already shaping spending, so the figures can be checked
by hand.

## Read first

- `spec_v2.md`:
  - §4 principle 9
  - §7: *Spending vs cash flow*, *Refunds*, *Pay cycles* and unaccounted
  - §8: the flags, including that a beverage counts only as the whole transaction
  - §9.3, all of it
  - §15, *SQL views and functions*: per-cycle and rolling 12-month spending, meal and beverage stats,
    eating out against groceries, unaccounted per period
- Decisions: D19, D21, D62, D66, D73, D79, D83.
- `docs/ui/patterns.md` §4, all of it.
- `docs/screens.md`: `insights`, `insights/year`, and `payments` filtered.
- `docs/flows.md`: `insights`.
- Skills: `dataviz` (read it before any chart code) and `database`.

## Builds

### Views (SQL, `security_invoker`, tested on hand-checked fixtures)
- **Spending per cycle per category,** with `my_share`, refunds in the purchase's cycle, the
  shared-bill rule, and *Unaccounted* netted.
- **Cumulative spending by cycle day,** this cycle against last, with the estimate to payday from
  `project_cycle_end`.
- **The typical level by this day:** the 12-month median per category, for *Where did it go?*.
- **Discretionary spending per day,** for the calendar.
- **Payments under RM15:** their count and total.
- **The meal average:** a bill ÷ the people who ate it, or your share on a split. Recent cycles for
  the sparkline.
- **Eating out against groceries.**
- **What was left at each payday:** the last six cycles and their median.
- **The unaccounted gap per cycle,** with capture only.
- **Top merchants this cycle.**
- **The year:** spending by month and the savings rate. Relief tags join in B26.

### `insights`
- **The cycle picker,** then the cards (§9.3):
  - *Am I on track?*
  - *Where did it go, and what changed?*
  - *When does the money leak?* (the calendar, on the sequential ramp)
  - *Do the small things add up?*
  - *What does a meal cost me?* (labelled an estimate)
  - *Eating out or cooking?*
  - *Am I saving more than before?*
  - *Can I trust these numbers?*
  - *Where do I spend most often?*
- ***The year*** is a row at the foot, opening `insights/year`.
- **A card with no data isn't shown.**
- **Each takeaway is one line written by code from the view,** never by a model.
- ***Ask Sen about this*** stays hidden until B27.
- **The budgets, goals, commitments and experiment cards** arrive in B21, B22 and B29.
- **A category opens `payments`,** filtered.
- **Charts follow `patterns.md` §4 exactly:**
  - focus and context by default; series only for parts that are different things
  - three hues at most, in a fixed order
  - tap tooltips
  - takeaways that say the answer in words

### Q15
- **Is a line item ever both a meal and a drink?** Check against the month's receipts, and settle it
  in §8.

## Done when

1. View tests against hand-computed fixtures, including:
   - a refund in another cycle
   - a split you paid, partly repaid
   - an adjustment netted
   - a no-capture person by calendar month
2. Every card renders in all six looks, light and dark, and passes the `dataviz` checks. A card with
   no data is absent.
3. **The owner hand-checks one month's figures** on three cards of their choice, and they match
   (P5's bar).

## On your phone

- [ ] Open Insights after a month of use. Pick three cards and check them against *Payments*.
