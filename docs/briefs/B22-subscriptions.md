# B22 · Subscriptions and exchange rates

**Stage 5 · Insights and plans** · after: B21 · next: B23

## Goal

Declared subscriptions forecast their charges, which are kept apart from the facts: each real charge
is matched, or flagged *missed*. Foreign amounts show an honest exchange rate, for display only. The
commitments cards show what's spoken for before you spend.

## Read first

- `spec_v2.md`:
  - §4 principle 3 (predictions never share a table with facts)
  - §6.4: invoice emails
  - §9.3: the rows for *How much is spoken for before I spend?* and *What renews soon?*
  - §11, all of it
  - §12.3: `get_subscriptions` and `find_recurring` (the views now; Sen in B28)
  - §15: `subscriptions` and `subscription_charges`
  - §16: the morning job's subscription matching, misses and exchange rates
- Decisions: D56, D99.
- `docs/screens.md`: `subscriptions`.
- `docs/flows.md`: `subscription`.
- Skill: `database`.

## Builds

### Data
- **Declaring a subscription:** name, merchant key, amount in its billing currency's smallest unit
  (such as US cents), currency, cadence, and next renewal.
- **Forecasts live in `subscription_charges`,** never in transactions:
  - an expected date and amount
  - status `expected`, `matched` or `missed`
  - `UNIQUE (subscription_id, expected_date)`
- **Matching, in the morning job and after sync:** by the subscription's merchant, an amount
  tolerance and a date window. No match by the end of the window means *missed*. The MYR amount
  actually charged is the truth.

### Exchange rates (D99), display only
- **Before the first charge:** Bank Negara's 17:00 middle rate, fetched by the morning job, with the
  ECB as fallback. It's rounded to 4 decimal places, stored as `NUMERIC` and shown as text:
  *≈ RM40.88 · BNM 7 Oct*.
- **After the first charge:** that charge's own rate, the MYR charged ÷ the declared amount.
- **Kept on the person's `subscriptions` row,** never in a shared table. Never used to compute money.

### The rest
- **A forwarded invoice from a declared subscription** attaches to its charge. One from a new sender
  shows *Declare this subscription?* on `subscriptions`; Sen proposes it from B28.
- **`find_recurring`,** a view of charges that look recurring, for B28's proposals.
- **`project_cycle_end`** (B13) now adds declared subscriptions due before payday.
- **The cards:**
  - *What renews soon?*: the monthly commitment and the next renewals, forecast against actual
  - *How much is spoken for before I spend?*: fixed costs, spending so far and what's left, as part
    to whole

  Define fixed costs in §9.3 as declared subscriptions due this cycle, plus the payday plan's *due*
  items once B30 builds them.
- **`subscriptions`:** declare, edit, and see each forecast against its charge.

## Done when

1. Tests:
   - a USD subscription matches its MYR charge and shows the effective rate
   - a charge outside the window leaves the forecast *missed*
   - a matched forecast never counts as spending
   - the BNM fetch falls back to the ECB
2. The projection includes subscriptions due before payday (test).
3. Playwright walks `subscription`. pgTAP covers the new tables.

## On your phone

- [ ] Declare two real subscriptions, one in USD. After their next charge, check each matched.
