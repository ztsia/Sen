# B20 · Insights: its data and cards

**Stage 5 · Insights and plans** · after: B19 · next: B20 · Insights, arranged

## Goal

Insights answers *where did my money go, and am I on track?* with cards. A card is a saved query and
a part (spec §9.3, D152): code runs the query as the person, with no model, and draws the figure or
chart with a one-line takeaway it writes itself. By now there's about a month of real data, with
receipts and splits already shaping spending, so the figures can be checked by hand.

This slice builds the data underneath, the four tabs and their cards as card definitions, and how a
card looks and opens. Arranging, editing the tabs and *Reset* are the next slice's (B20 · Insights,
arranged).

## Read first

- `spec_v2.md`:
  - §4 principle 9
  - §7: *Spending vs cash flow*, *Refunds*, *Pay cycles* and unaccounted
  - §8: the flags, including that a beverage counts only as the whole transaction
  - §9.3, all of it, and §9.8 (the charts a card draws, from B08 · Charts)
  - §12.3: *Reading*, up to *What Sen can read*: the described data model, periods as tokens, flows
    and balances, and the rules every result follows
  - §15: `saved_queries`, `insight_tabs` and `insight_cards`; and *SQL views and functions*:
    per-cycle and rolling 12-month spending, meal and beverage stats, eating out against groceries,
    unaccounted per period
  - §16: `/queries/:id/run`
- Decisions: D19, D21, D62, D66, D73, D79, D83, D152, D153.
- `docs/ui/patterns.md` §4, all of it.
- `docs/screens.md`: `insights`, `insights/card`, `insights/year`, and `payments` filtered.
- `docs/flows.md`: `insights`.
- The approved design page for Insights' cards and tabs (`docs/modules.md`, *Three design pages*).
- Skills: `dataviz` (read it before any chart code) and `database`.

## Builds

### The data model and the query builder (§12.3)
- **The data model is described once, in code:** each dataset's fields to filter and group by, and
  its numbers, each marked a flow or a balance. This slice describes the datasets Insights needs;
  B27 widens it to every dataset.
- **Code builds every query from that description.** Nothing writes SQL by hand at a card, and no
  model is involved. A query is run as the person, under RLS, read-only.
- **Periods are tokens** (`this_cycle`, `last_cycle`), resolved by code in Kuala Lumpur time and pay
  cycles (§7). A trend has a row for every period, zero where nothing happened; top N keeps the same
  groups in every period; a percentage change comes from code. Only confirmed records count.
- **`saved_queries`** holds a query as the description, with periods as tokens, never its result.
  **`POST /queries/:id/run`** runs one for a card or a chart, as the person.

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
- **The takeaways code writes,** each one line, from these views, never from a model.

### `insight_tabs` and `insight_cards` (§9.3, §15)
- **Both tables, with RLS from the first migration,** and `seed_key` on each seeded row.
- **Seeded with the four tabs** (*This cycle*, *Food*, *Commitments*, *Over time*) **and their
  cards,** each a card definition like one anyone could make: its kind (the part it shows), saved
  query, title, size, position and options.
  - *This cycle:* *Am I on track?*, *Where did it go, and what changed?*, *When does the money leak?*
    (the calendar, on the sequential ramp) and *Do the small things add up?*
  - *Food:* *What does a meal cost me?* (labelled an estimate) and *Eating out or cooking?*
  - *Over time:* *Am I saving more than before?*, *Can I trust these numbers?*, *Where do I spend
    most often?* and ***The year***, a row at the foot opening `insights/year`
  - The budgets, goals, commitments and experiment cards arrive as definitions from B21, B22 and B29.
- **Every seeded card is drawn from its definition alone,** with no code of its own per card.
- **A seeded card with nothing to show yet is hidden.**

### The card (patterns §4)
- **One anatomy:** the title (the question), the figure or a one-line takeaway computed by code, its
  change, the view, then *as of*, always last.
- **Two sizes:** small, two to a row, and wide across the row.
- **Its states:** a skeleton shaped like the card on first load; on a refresh the old values stay with
  their time; a failed refresh keeps the last good values and marks *as of*; an empty card says so
  in its own words; a card whose data is gone goes grey, shows no figures and offers *Ask Sen*.
- **Charts follow `patterns.md` §4 exactly:**
  - focus and context by default; series only for parts that are different things
  - the palette's hues in a fixed order
  - tap tooltips
  - takeaways that say the answer in words

### `insights` and `insights/card`
- **The cycle picker,** then the active tab and its cards, built to the approved design page.
- **A category opens `payments`,** filtered.
- **`insights/card`:** a card opened shows its view large, its source and time, its watch when it
  has one (B29), and *Ask Sen about this*. A tap on a point shows its exact figure, and a second tap
  opens the payments behind it.
- ***Ask Sen about this*** stays hidden until B27 · Sen's chat.

### `payments` filtered, and Q15
- **`payments` filtered from a category,** as above.
- **Q15: is a line item ever both a meal and a drink?** Check against the month's receipts, and
  settle it in §8.

## Leaves for later

- Arranging in place, adding, renaming, moving and removing a tab, the limits and *Reset*: B20 ·
  Insights, arranged. A card added by Sen or *Pin to Insights*: B27.

## Done when

1. View tests against hand-computed fixtures, including:
   - a refund in another cycle
   - a split you paid, partly repaid
   - an adjustment netted
   - a no-capture person by calendar month
2. The query builder's tests: periods resolve in Kuala Lumpur time, a trend has a row for every
   period, a percentage change comes from code, and a query runs as the person, read-only, under RLS
   (pgTAP for the three new tables, for two people).
3. **Every seeded card is drawn from its definition alone,** in all six looks, light and dark, and
   passes the `dataviz` checks. A seeded card with no data is absent.
4. **The owner hand-checks one month's figures** on three cards of their choice, and they match
   (P5's bar).

## On your phone

- [ ] Open Insights after a month of use. Pick three cards and check them against *Payments*.
- [ ] Open a card: its view is large, and a tap on a point shows its figure.

## Needs from you first

- The approved design page for Insights' cards and tabs, drawn before this slice starts.
