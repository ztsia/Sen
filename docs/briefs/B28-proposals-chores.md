# B28 · Proposals and chores

**Stage 7 · Sen** · after: B27 · next: B29

## Goal

Sen changes nothing directly. It proposes, and the owner applies with a tap: code applies the change,
logged as Sen's, with *Undo*. Sen sets up merchant rules from what the owner types, proposes budgets,
goals, buckets, subscriptions, promises and claim schemes, and sorts the *Review* backlog every night
for one-tap approval.

## Read first

- `spec_v2.md`:
  - §12.1: *Chase and file* (promises, what's owed, chores, claims) and *Plan* (buckets)
  - §12.2 rules 2, 3 and 7
  - §12.3: `propose`, its kinds, `find_merchants`, `get_owed`, `get_promises`, `get_claims`,
    `get_deadlines`, `get_needs_attention`, `find_recurring` and `find_yearly_costs`
  - §12.4: *Review's suggested answers*
  - §12.5: the skills `merchant-rules`, `budgets`, `goals-buckets`, `subscriptions`, `owed`,
    `promises`, `review-chores` and `claims`, and the `review-sorter` subagent
  - §8: *Sen can set up rules*
  - §11: *suggest a new subscription*
  - §13: *Sen can draft a scheme*
  - §15: `agent_proposals` and `promises`
  - §16: `/proposals/:id/apply` and `/dismiss`
- Decisions: D36, D40, D89, D90, D94, D95.
- `docs/screens.md`: `review` (Sen's suggestions) and `sen`.
- `docs/flows.md`: `proposal`.

## Builds

### Proposals
- **`propose(kind, payload)`,** checked with zod and saved to `agent_proposals`.
- **The kinds:**
  - budget, merchant rule, subscription to declare, goal or bucket
  - promise to watch, answer to a *Review* item
  - claim scheme (B29 adds experiment checks; B30 adds the payday plan)
- **A proposal card** in the chat, and also in *Review*.
- **`/proposals/:id/apply` and `/dismiss`:** code applies the proposal, `audit_log` records actor
  `agent`, and *Undo* reverts it. No model call. Proposals outlive their chat.

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
- **`owed`:** `get_owed`. It reminds by sharing the split link again (default 7).
- **`claims`:**
  - `get_claims`, and claims in `get_deadlines` and `get_needs_attention`
  - ***Describe it to Sen*** on a scheme proposes `claim_scheme`: code turns `cap_text` into sen,
    and **every figure must appear in the person's own message**
  - no verdict on approval, and no tax advice (rule 3)

### Chores
- **The `review-sorter` subagent** (cheap tier) prepares a suggested answer for each *Review* item,
  with a reason and a confidence. It applies nothing. It runs nightly and after a big sync, never
  when a screen opens.
- ***Review*'s bar *Apply all***, and each suggested button marked. Every applied answer can be
  undone.
- **Note-based suggestions** (D90): a note can mark one of that row's own buttons. A note never
  changes a rule.

## Done when

1. Every kind of proposal applies and undoes, logged as Sen's, in tests.
2. Code refuses:
   - a relief facet
   - an unknown merchant key
   - *Unaccounted*
   - a scheme whose figures aren't all in the person's message
3. The nightly sort produces suggestions without applying anything. *Apply all* applies them, and each
   can be undone.
4. **On the phone:** *Anything from KK MART is groceries* produces the right card, and a night's sort
   clears a real backlog with one tap.

## On your phone

- [ ] Tell Sen a rule in your own words. Apply it, then undo it.
- [ ] Leave a few *Review* items overnight; use *Apply all* in the morning.
