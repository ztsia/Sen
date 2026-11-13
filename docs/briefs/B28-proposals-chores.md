# B28 · Proposals and chores

**Stage 7 · Sen** · after: B27 · What Sen carries · next: B29 · Check-ins, limits and closing the gap

## Goal

Sen changes your money records only by a proposal. The owner applies it with a tap: code applies the
change through the app's own write interface, logged as Sen's, with *Undo*.
- Sen sets up merchant rules from what the owner types, and proposes budgets, goals, buckets,
  subscriptions, promises, claim schemes, and a change to one payment or many.
- Sen sets its own things at once, with a *Saved* line and *Undo*. Here that is an Insights card.
- Sen sorts the *Review* backlog every night for one-tap approval.

## Read first

- `spec_v2.md`:
  - §12.1: *Chase and file* (promises, what's owed, chores, claims) and *Plan* (buckets)
  - §12.2 rules 2, 3 and 7
  - §12.3: *Changing: one tool per thing*, with its table of the two kinds of change, the *never by
    Sen* list, the effect shown before the tap, an amount's source, one card per change, and the
    *Proposal* and *Saved* parts; the reading tools `totals`, `rows` and `record` (what Sen reads of
    splits, promises, claims and subscriptions); `find_recurring` and `find_yearly_costs`
  - §12.4: *Review's suggested answers*
  - §12.5: the skills `merchant-rules`, `budgets`, `goals-buckets`, `subscriptions`, `owed`,
    `promises`, `review-chores` and `claims`, and the `review-sorter` subagent
  - §8: *Sen can set up rules*
  - §9.3: *Pinning*, and `set_card`
  - §11: *suggest a new subscription*
  - §13: *Sen can draft a scheme*
  - §15: `agent_proposals`, `promises` and `insight_cards`
  - §16: `/proposals/:id/apply` and `/dismiss`
- Decisions: D36, D40, D89, D90, D94, D95, D152.
- `docs/screens.md`: `review` (Sen's suggestions) and `sen` (the proposal's card).
- `docs/flows.md`: `proposal`.
- `docs/ui/patterns.md`: §7, *Sen's chat* (the proposal is the one raised, outlined card).
- `packages/core/src/commands.ts`: the commands the tools carry.
- B20 · Insights, arranged: the card-by-definition seam that `set_card` uses.
- `docs/modules.md`, *Three design pages* (D154): Sen's chat is drawn and approved before B27 · Sen's
  chat. Draw the proposal part's card here to that page; don't design as you build.

## Builds

### One tool per thing (§12.3)
- **A tool for each thing Sen can change,** with the action inside it and that thing's own typed
  fields. There is no general write tool. Every tool is declared on every call, so a skill never
  switches one on.
- **A tool's fields are the app's own command** (`packages/core/src/commands.ts`): Sen can propose
  exactly what a screen can do and nothing more.
- **This slice's tools:** `propose_budget`, `propose_goal`, `propose_rule`, `propose_subscription`,
  `propose_promise`, `propose_scheme`, `propose_payment_change` and `answer_review`. The tool for a
  limit comes with B29's `hold-to-word`, and the one for the payday plan with B30, each on this
  slice's machinery.
- **Never by Sen, even as a proposal** (§12.3):
  - a payment's amount, date or account
  - adding or deleting a payment, a receipt or an account (a button opens the screen, and the owner
    types the amount)
  - a balance check
  - the settings for sign-in, members or which apps are read
  - confirming a figure from the web
  - moving money or signing up for anything
- **One card per change, with one line of why.** Several payments changed the same way (category,
  note, kind, share or claim tag) are one card that lists them.
- **Every proposal has a dedupe key,** so a retried turn makes no second card.
- **An amount in a proposal says where it came from:** the person's words, a tool's result, or Sen's
  suggestion. It can be changed before applying.

### Proposals (`agent_proposals`)
- **A proposal is saved** with its kind, its payload (the app's own command, checked with zod), its
  `effect` and its `dedupe_key`, unique per person.
- **Code works out the effect before the tap** (*applies to 14 past payments*, *Drinks would be at
  80% now*). Sen never says a change happened: the card says it, once code has done it.
- **`/proposals/:id/apply` and `/dismiss`:** *Apply* sends the command through the app's write
  interface, `audit_log` records actor `agent`, and *Undo* is the command's own. No model call.
  Proposals outlive their chat.
- ***Change…*** opens the real form, filled in.
- **A proposal card** in the chat and also in *Review*, drawn here to the chat's approved page: what
  will change, field by field, each amount with its source, and its effect; *Dismiss*, *Change…* and
  *Apply* in thumb reach. Its states: waiting, applying, applied, failed, expired. Once decided it
  folds to one line.

### Sen's own things (set at once)
- **`set_card`:** Sen adds an Insights card or tab when the owner asks, through the card-by-definition
  seam from B20 · Insights, arranged. The card arrives with a *New* mark, a *Saved* line with *Open*,
  and *Undo*. It holds a query, never a result.
- **The rest** (memory, a watch, a scheduled report, a calendar event, a research brief, a lesson)
  arrive with their slices.

### Skills and their checks
- **`merchant-rules` with `find_merchants(text)`** (§8):
  - one proposal per merchant
  - code checks the keys exist, the category is active and isn't *Unaccounted*, and the facet is
    category, kind, *by item* or a claim scheme
  - **code refuses a relief facet**
  - the card reads *SHOPEE MY, SHOPEEPAY → Shopping, from now on; 14 past payments stay as they are*
  - for a merchant not seen yet, the proposal waits as a staged rule, and becomes the first guess on
    its first prompt
- **`budgets`, `goals-buckets` and `subscriptions`:**
  - goals and buckets use `find_yearly_costs`, for lumpy costs such as road tax or CNY
  - subscriptions use `find_recurring`, and invoices from B22
- **`promises`:** `promises` holds refunds and returns to watch for. Matching marks them landed; the
  morning job chases one past its date. They're listed in *Waiting on others*.
- **`owed`:** Sen reads who owes what through `rows` on splits. It reminds by sharing the split link
  again (default 7).
- **`claims`:**
  - Sen reads claims, their evidence and deadlines through `rows` and `record`
  - ***Describe it to Sen*** on a scheme proposes a claim scheme with `propose_scheme`: code turns
    `cap_text` into sen, and **every figure must appear in the person's own message**
  - no verdict on approval, and no tax advice (rule 3)

### Chores
- **The `review-sorter` subagent** (its own job and model, set in admin) prepares a suggested answer
  for each *Review* item, with a reason and a confidence. Its tools are `rows`, `record` and
  `answer_review`. It applies nothing. It runs nightly and after a big sync, never when a screen
  opens. If this is the job's first call of a model, pick its default on its golden set and record a
  decision.
- ***Review*'s bar *Apply all***, and each suggested button marked. Every applied answer can be
  undone.
- **Note-based suggestions** (D90): a note can mark one of that row's own buttons. A note never
  changes a rule.

## Done when

1. Every kind of proposal shows its effect, applies and undoes, logged as Sen's, in tests. A retried
   turn makes no second card.
2. Code refuses:
   - anything on the *never by Sen* list
   - a relief facet
   - an unknown merchant key
   - *Unaccounted*
   - a scheme whose figures aren't all in the person's message
3. *Apply* and *Dismiss* make no model call, and a proposal outlives its chat.
4. `set_card` adds a card at once with a *Saved* line, and *Undo* removes it.
5. The nightly sort produces suggestions without applying anything. *Apply all* applies them, and each
   can be undone.
6. **On the phone:** *Anything from KK MART is groceries* produces the right card, and a night's sort
   clears a real backlog with one tap.

## On your phone

- [ ] Tell Sen a rule in your own words. Apply it, then undo it.
- [ ] Ask Sen to put a card on Insights. Undo it.
- [ ] Leave a few *Review* items overnight; use *Apply all* in the morning.
