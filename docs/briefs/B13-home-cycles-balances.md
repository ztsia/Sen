# B13 · Home, pay cycles and balance checks

**Stage 3 · Capture to ledger** · after: B12 · next: B14

## Goal

Home tells the truth.
- **Left until payday,** pace against the last cycle, and total balance with the unaccounted gap, all
  computed in SQL over real data.
- **Pay cycles** start when salary actually lands.
- **Balance checks** measure what capture missed.

**Daily use starts when this slice ships.**

## Read first

- `spec_v2.md`:
  - §7: *Balance*, *Balance checks* (all of it), *Spending vs cash flow*, *Refunds*, *Income* and
    *Pay cycles* (all of it, edge cases included)
  - §9.2
  - §9.6: *Without capture*, the calendar month and the optional payday
  - §9.7: the card, and step 2 only
  - §12.3: the definition of `project_cycle_end`
  - §15: `balance_checks`, and *SQL views and functions* (balances, pay cycles, unaccounted,
    projection)
  - §18: the scheduler row (Home's warning)
- Decisions: D14, D18, D21, D30, D59, D60, D68, D79.
- `docs/screens.md`: `home`, `cycle`, `balance-check`, `payday` and `accounts`, plus *Defaults to
  confirm* items 3 and 4, as settled in B04.
- `docs/flows.md`: `daily`, `balance-check`, `payday` (step 2) and `capture-off`.
- Skills: `database` and `dataviz` (the pace line).

## Builds

### Pay cycles (one SQL function, tested hard)
- **A cycle starts on a credit marked salary.** That means income in the *Salary* category, set by
  its payer's merchant rule (kind `salary`). A new employer's first salary is marked once: *This is
  my salary* on `txn`, or in *Review*.
- **A salary within 15 days of the last one** doesn't start a cycle.
- **Before the first salary,** the cycle starts on the opening date.
- **Without capture** (D79), a cycle is the calendar month unless an expected payday is set. With
  one, a cycle starts on that payday or on a salary they mark.
- **Names and dates:** a cycle is called by the month most of it falls in. Everything uses Kuala
  Lumpur dates.
- **The expected payday** (the last working day, or a day number) is used only for estimates: days
  to go, the projection, and a late-salary warning from the morning job.

### The figures (SQL views, `security_invoker`)
- **Spending this cycle** uses `my_share`, with refunds subtracted from their purchase in the
  purchase's cycle (D21) and the shared-bill rule ready for B17. *Unaccounted* is the cycle's
  adjustments netted together.
- **Left until payday** is income received this cycle minus spending this cycle.
- **Pace** is spent by this day against the same day of the last cycle.
- **Total balance and the gap** come from the last balance check.
- **Outbox rows are included**, so the figures and balances count what hasn't synced yet (§5).
- **`project_cycle_end`:**
  - spent so far
  - plus declared subscriptions due before payday (none until B22)
  - plus the recent daily pace of variable spending × days to the expected payday

### `home`, made real (D59)
- **Health warnings,** including *Capture is off* (B07) and *Daily jobs have stopped*.
- **The *Payday* card.**
- **The large figure,** in the look's `heroFigure`, with days to go:
  - *Over by RM…* in the warning colour below zero
  - *Spent since you started* before the first salary (or what B04's review chose)
  - the month's spending against last month without capture
- **Pace,** with its small line, opening `payments` for this cycle. The first cycle says it has no
  last cycle.
- **The quiet balance row** opens `accounts`. Offline, a chip shows how many rows aren't synced.
- **Sen's note** stays hidden until B29.
- **The `cycle` sheet:** income, spending and the result, the cycle's dates, and the estimate at
  payday labelled as one.

### Balance checks (D18)
- ***Review* asks** weekly for the first four weeks from first run, then on each payday.
- **`balance-check`:** each tracked account's computed balance beside a box, and *Matches*.
- ***Save*** books each difference as an `adjustment` in *Unaccounted*, dated at the check
  (`balance_checks`). Unaccounted money in is never income.
- **The gap shows** on Home, and *Last checked* on `accounts`.

### Payday (D60)
- **When a salary starts a cycle,** Home shows the *Payday* card, with step 2, the balance check.
  - Step 1 (claims) comes in B25.
  - Steps 3 and 4 (Sen) come in B30.
- ***Skip*** sends a step to *Review*.

### Payments
- **The cycle filter.**

## Done when

1. SQL tests with hand-checked fixtures:
   - cycles across a salary, an early salary, a bonus within 15 days, no salary yet, and calendar
     months with and without a payday
   - left until payday, pace and the gap, with refunds and adjustments
2. A balance check books the right adjustment, outbox rows included. The gap shows on Home.
3. `home` in every state of `screens.md`'s *Varies*, in Playwright, in all six looks.
4. **Home's figures match a hand check over a real week** (the owner checks a few on the phone).
   **Daily use begins.**

## On your phone

- [ ] On Home: is *left until payday* right? Tap it: does the sheet explain it?
- [ ] Do the first weekly balance check.
