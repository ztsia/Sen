# B25 · Claims

**Stage 6 · Claims by hand** · after: B24 · next: B26

## Goal

Each month's claims draft themselves on the 1st, chase their missing evidence, remind by code, and
lay out a submission kit for ESS. When the salary that repays them lands, it's split into repayments
and income, so a reimbursed phone bill never counts as spending. This is built before Sen
(decided 8 Oct), so Sen reads income that's already right (§12.2 rule 7).

**Real claim values never enter this session, the repo or the fixtures** (`CLAUDE.md`). Every test
uses made-up schemes. The owner types the real ones into the app.

## Read first

- `spec_v2.md`:
  - §13, everything above §13.1
  - §6.4: *filed as evidence only*
  - §6.6: the rows for claims, ESS email and the salary
  - §9.7: step 1 (the asked version)
  - §12.2 rule 7
  - §15: `claim_schemes`, `claims`, `claim_items` and `claim_evidence`, the claim scheme on
    `merchant_rules` and `transactions`, `user_settings.ess_sender`, and `email_messages.kind`
  - §16: the morning job's claim drafts and reminders
- Decisions: D10, D45, D50, D95, D96 (approval emails), D104 (the asked version only; the payslip is
  B35).
- `docs/screens.md`: `claims`, `claim`, Settings → *Claims*, and `payday`.
- `docs/flows.md`: `claims`, and `payday` step 1.

## Builds

### Schemes and tagging
- **Settings → *Claims*:** schemes start from nothing (D95).
  - Each has a name, a period (monthly), a cap (typed as text into sen), the deadline day of the
    following month, and where its amount comes from: tagged spending or the evidence receipt.
  - *Describe it to Sen* stays hidden until B28.
- **Settings also holds the ESS sender's address** (D96).
- **The claim-scheme facet on merchant rules:** a rule can carry a scheme, and payments it files
  carry it too. Tag from `txn` or a rule.

### The month's claim (morning job, on the 1st, and refreshed as evidence arrives)
- **One claim per scheme and period,** `UNIQUE (user_id, scheme_id, period)`.
- **The amount,** computed by code:
  - either the period's tagged spending, or the evidence receipt's amount
  - capped at the scheme's cap
- **`claim_items`:** the transactions it covers. Travel covers that month's TNG card reloads up to
  the claim amount, so the salary split has something to repay (§13).
- **`claim_evidence`** holds the bill PDF and the My50 receipt, plus *what's missing*, such as
  *My50 receipt not added yet: share it to the app*.

### Reminders, all by code and outside Sen's one push
- ***Review*** from 7 days before the deadline.
- **A push** 3 days before, and on the day.
- **The deadline in Google Calendar** (B24).
- **Each sent once** per scheme, period and reminder (`alerts_sent`).

### Submitting by hand
- **`claims`:** this period's claim per scheme, with its amount, status, deadline and evidence.
  *Download claim pack* comes in B26, and *Send to ESS* in B34.
- **`claim`, the submission kit:**
  - each value in ESS's order, with *Copy*
  - each file with *Open* and *Share*
  - missing evidence, with how to add it
  - ***Submitted***, with an optional ESS reference
- **Statuses:** `to_submit → submitted → approved → paid`, or `rejected` with a reason. A rejected
  claim's expense stays your spending.

### Approval emails (D96)
- **Mail from the ESS sender** (stored by B19) goes to a parser, never a model. It looks for a
  submitted claim's reference and a fixed status word: *approved*, *diluluskan*, *rejected*,
  *ditolak*.
- **`approved_amount`** defaults to the claim's amount, and is changed by hand when only part is
  approved. Record in §13 how a partly approved amount arrives.
- **Mail the parser can't place** shows in *Review*: *Approved: [claim]*, *Rejected*, or *Not a
  claim*.

### The salary (D45)
- **When a salary that starts a cycle lands while claims are submitted or approved,** the *Payday*
  card's step 1 and *Review* ask: *Did this salary include your claims?* The approved claims are
  named, with *Yes* preselected.
- ***Yes* splits the salary credit:**
  - the claims' part becomes repayments to the transactions they cover, so their spending drops
    (D19)
  - the rest is income
  - both transactions keep `source = notification` and the event's id, the second with a derived id
  - the claims become `paid`, with *Undo*
- ***No*** leaves them submitted, and the question comes back with the next salary.
- **Until it's answered, the salary is held back from Sen** (rule 7). Store the flag B27 will read.

## Done when

1. Fake-clock tests with made-up schemes:
   - drafts on the 1st
   - evidence refreshing a draft
   - the cap
   - each reminder sent once
   - the deadline in the calendar
2. Salary split tests:
   - repayments reduce the covered spending exactly
   - income is the rest
   - *Undo* restores the salary
   - a partly approved claim uses `approved_amount`
3. The parser places a made-up approval and rejection by reference, in English and Malay. Anything
   else goes to *Review*.
4. Playwright walks `claims` and step 1 of `payday`. pgTAP covers the new tables.
5. **On the phone:** the owner types in their real schemes, and the next month's claims draft
   themselves with the right evidence.

## On your phone

- [ ] Add your schemes in Settings → *Claims*, in your own words and figures, and the ESS sender's
      address.
- [ ] On the 1st, check each claim's draft and what's missing. Submit as usual, tap *Submitted*,
      then answer the salary question on payday.
