# B40 · Integrations: lunchbot (P9)

**Stage 9 · Sharing and data** · after: B39 · last

**Built only if the owner is still running the DingDong lunch pool** (D23, D102). Ask in the handoff
before starting; if the pool has stopped, skip this slice and record that in `docs/decisions.md`.

## Goal

Other apps can hand Sen a shared bill and read back the repayments Sen matched, through a generic,
scoped and revocable adapter. lunchbot is the first: its pools become splits, and colleagues'
deposits are matched like split shares.

## Read first

- `spec_v2.md`:
  - §7: *The lunch pool*, all of it
  - §15: `api_tokens`, and `splits.source`, `integration_id` and `external_ref`
  - §16: `/integrations/v1/shared-bills/:ref` and `/integrations/v1/matched-payments`, and *Auth*
  - §17: *Integration tokens*
- Decisions: D19, D23, D102.
- `docs/local.md`: *lunchbot changes, in its own repo*.

## Builds

### Tokens
- **`api_tokens`:** kind `integration`, `integration_id` and `scopes`, stored hashed, rate-limited
  and revocable.
- **Created in Settings and shown once.** A token reaches only its integration's routes and bills.

### Routes
- **`PUT /integrations/v1/shared-bills/:ref`,** idempotent, creates or updates a split with
  `source = integration` and `external_ref`. It holds the total, the date, each member's share, and
  later your actual consumption, which replaces your pledge as your share.
- **`GET /integrations/v1/matched-payments?after=:cursor`** returns only the repayments matched to that
  integration's bills since the cursor.

### Matching (§7)
- **The bill** is your payment to the seller: the same amount within 3 days, or linked by you.
- **Deposits are repayments:**
  - a colleague's payment is matched to their pending pledge
  - the first time a name pays, *Review* asks which member it is, and after that their deposits file
    themselves
  - a deposit before you've paid the seller waits on the pool
- **A pool bought before Sen started** has no bill, but its deposits still count as repayments, never
  income.
- **The `lunch_*` tables** are folded into splits, `split_members` and `payer_names`.

## Done when

1. Tests:
   - a pool sent twice is one split
   - your pledge, then your actual consumption, sets your share
   - deposits match pledges, and the first unknown name asks
   - a token can't reach another integration's bills
   - a revoked token fails
2. lunchbot sends a pool and reads its matched deposits (lunchbot's side is built in its own repo).
