# B30 · Payday plan, look-back and projection

**Stage 7 · Sen** · after: B29 · Watches and scheduled reports · next: B31

## Goal

Payday becomes the app's main moment, with all four steps of the *Payday* card. Steps 3 and 4 are
new:
- **Last cycle's look-back:** three reasons, and one experiment.
- **This cycle's plan:** due, set aside, left to spend. Every line is computed in SQL, and each move
  ticks itself off when its notification arrives.

*Can I afford it?* gets an answer with the trade-off, and a playground the owner can drag. The plan
shows in the chat as a checklist that ticks itself.

## Read first

- `spec_v2.md`:
  - §9.7, all of it
  - §12.1: *Plan* (all of it), and the payday look-back
  - §12.3: `get_payday_plan`, `get_cycle_review`, `project_cycle_end` and `simulate_spend`;
    `propose_plan`, `show_playground` and `show_checklist`, and the *Playground* and *Checklist*
    parts in *What Sen answers with*
  - §12.4: *Cycle end*
  - §12.5: the skills `payday-plan`, `look-back` and `afford-it`
  - §10: buckets' set-asides
  - §15: `payday_plans` and `payday_plan_items`
  - §16: `/match` (payday plan items)
- Decisions: D14, D60, D101 (*Payday moves*), D133 (goal money in its own account; a move ticked by
  hand), D152.
- `docs/screens.md`: `payday`, `home` (plan progress), `sen` (the playground and checklist cards),
  and *Defaults to confirm* item 2, as settled in B04.
- `docs/flows.md`: `payday` and `proposal`.
- `docs/ui/patterns.md`: §7, *Sen's chat*, and §4 (the card anatomy the two new cards follow).
- B28's proposal machinery, and B27 · Sen's chat's parts, which the two new cards join. Draw them to
  the chat's approved design page (`docs/modules.md`, *Three design pages*); don't design as you
  build.

## Builds

### The plan (SQL; a plan, never a fact)
- **`get_payday_plan(cycle)` computes every line in SQL:**
  - what's due before the next payday: declared subscriptions, claims due, and other known dues
  - each goal's and bucket's set-aside
  - what's left to spend
- **The `payday-plan` skill** writes it up and proposes it with `propose_plan`, whose fields are the
  app's own command, with its effect shown before the tap.
- ***Use this plan*** makes it active (`payday_plans`, `payday_plan_items`), with each move's
  accounts.
- **`/match` ticks a move** when its transfer's notification lands (`done_transaction_id`). A move
  into a goal adds a `goal_contributions` row.
- **A move into a goal goes to the account its money is kept in** (D133, `goals.account_id`), and
  the plan says so (*Move RM400 to Ryt Bank · Laptop pocket*).
- **A move can be ticked by hand** (D133), because some moves send no notification (a bank's own
  main-account-to-pocket move). The hand tick books the transfer between the two accounts and its
  goal contribution, deduped by the plan step, so a notification that lands later for the same move
  is matched to it rather than booked twice. Undo unticks it.
- **Home shows the progress** (*2 of 3 moves done*) until every move is ticked or hidden.
- **The island's *Payday moves*:** a segmented bar, one segment per move.

### The plan as a checklist (§12.3)
- **The *Checklist* part,** from `show_checklist(plan)`: the plan's steps, each ticking itself when its
  matching payment arrives. It takes its figures by reference to `get_payday_plan`'s result, so it
  shows no figure Sen made up.
- **Its card is drawn here,** in the chat, in the card anatomy of `patterns.md` §4, with its states:
  nothing ticked, some ticked, all done, a move ticked by hand.

### Cycle end
- **It starts when `/match` marks a salary,** not by the clock, and only once the claims question is
  answered (§12.2 rule 7).
- **The `look-back` skill** uses `get_cycle_review` to give the three biggest reasons, and one
  experiment, with *Track it* making it a limit through B29's `propose_limit`.
- **The *Payday* card gains steps 3 and 4,** for people with the agent and capture (D52). *Skip*
  sends a step to *Review*.
- **The day's push** is the payday one.

### `afford-it` and its playground
- ***Can I afford…*** and ***where will I end up?*** are answered with `simulate_spend` and
  `project_cycle_end`, with the trade-off, and an offer to set up a goal.
- **The *Playground* part,** from `show_playground(kind, params)`: sliders and a chart that code
  recomputes as you drag. The fixed kinds are a spending what-if, a goal's date against its monthly
  amount, a budget split, a loan payoff, and a test on your own past. Every number is code's, never
  a model's.
- ***Apply*** on a playground turns it into a proposal (a goal, a budget), through B28's tools.
- **Its card is drawn here,** to the chat's approved page, in all six looks, with its chart from
  §9.8 and its estimate dashed apart from a fact.

## Done when

1. `get_payday_plan` passes SQL tests on hand-checked fixtures. No figure in the plan comes from the
   model.
2. Plan items tick on matching transfers, in either order, idempotently, and the checklist part ticks
   with them.
3. A playground's numbers match code's for each of its five kinds, and *Apply* makes a proposal
   rather than a change.
4. **On a real payday:** the card runs all four steps (claims, balances, look-back, plan), and the
   plan ticks itself as the owner's transfers land.

## On your phone

- [ ] On payday, go through the whole card. Make the plan's moves in your bank apps and watch them
      tick.
- [ ] Ask Sen *Can I afford a RM600 phone?* and drag the playground.
