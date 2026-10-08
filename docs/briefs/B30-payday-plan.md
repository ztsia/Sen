# B30 · Payday plan, look-back and projection

**Stage 7 · Sen** · after: B29 · next: B31

## Goal

Payday becomes the app's main moment, with all four steps of the *Payday* card. Steps 3 and 4 are
new:
- **Last cycle's look-back:** three reasons, and one experiment.
- **This cycle's plan:** due, set aside, left to spend. Every line is computed in SQL, and each move
  ticks itself off when its notification arrives.

*Can I afford it?* gets an answer with the trade-off.

## Read first

- `spec_v2.md`:
  - §9.7, all of it
  - §12.1: *Plan* (all of it), and the payday look-back
  - §12.3: `get_payday_plan`, `get_cycle_review`, `project_cycle_end` and `simulate_spend`
  - §12.4: *Cycle end*
  - §12.5: the skills `payday-plan`, `look-back` and `afford-it`
  - §10: buckets' set-asides
  - §15: `payday_plans` and `payday_plan_items`
  - §16: `/match` (payday plan items)
- Decisions: D14, D60, D101 (*Payday moves*).
- `docs/screens.md`: `payday`, `home` (plan progress), and *Defaults to confirm* item 2, as settled
  in B04.
- `docs/flows.md`: `payday`.

## Builds

### The plan (SQL; a plan, never a fact)
- **`get_payday_plan(cycle)` computes every line in SQL:**
  - what's due before the next payday: declared subscriptions, claims due, and other known dues
  - each goal's and bucket's set-aside
  - what's left to spend
- **The `payday-plan` skill** writes it up and proposes it (proposal kind `payday_plan`).
- ***Use this plan*** makes it active (`payday_plans`, `payday_plan_items`), with each move's
  accounts.
- **`/match` ticks a move** when its transfer's notification lands (`done_transaction_id`). A move
  into a goal adds a `goal_contributions` row.
- **Home shows the progress** (*2 of 3 moves done*) until every move is ticked or hidden.
- **The island's *Payday moves*:** a segmented bar, one segment per move.

### Cycle end
- **It starts when `/match` marks a salary,** not by the clock, and only once the claims question is
  answered (§12.2 rule 7).
- **The `look-back` skill** uses `get_cycle_review` to give the three biggest reasons, and one
  experiment, with *Track it* making it a B29 experiment.
- **The *Payday* card gains steps 3 and 4,** for people with the agent and capture (D52). *Skip*
  sends a step to *Review*.
- **The day's push** is the payday one.

### `afford-it`
- ***Can I afford…*** and ***where will I end up?*** are answered with `simulate_spend` and
  `project_cycle_end`, with the trade-off, and an offer to set up a goal.

## Done when

1. `get_payday_plan` passes SQL tests on hand-checked fixtures. No figure in the plan comes from the
   model.
2. Plan items tick on matching transfers, in either order, idempotently.
3. **On a real payday:** the card runs all four steps (claims, balances, look-back, plan), and the
   plan ticks itself as the owner's transfers land.

## On your phone

- [ ] On payday, go through the whole card. Make the plan's moves in your bank apps and watch them
      tick.
