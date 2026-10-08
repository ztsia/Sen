# B38 · Members, invitations and AI credit

**Stage 9 · Sharing and data** · after: B37 · next: B39

## Goal

The owner can invite friends and family:
- **Each person sees only their own money.** The admin can't read it either.
- **Each person gets only the features switched on for them.**
- **Each person spends their own AI credit,** from a welcome amount and a monthly allowance, with no
  payments inside Sen.

The tables were designed in at B05; this slice builds the flows.

## Read first

- `spec_v2.md`:
  - §9.6, all of it
  - §5: *Requests with no signed-in person* (accepting an invitation)
  - §11: *AI costs* (the ledger)
  - §15: `user_access`, `invitations` and `ai_credit_entries`
  - §16: `/admin/*`, and `/auth/*` (accepting)
  - §17: *The admin*
- Decisions: D52, D79, D98.
- `docs/screens.md`: Settings → *Members*, `agent/usage`, `sign-in` (from an invitation), and
  `first-run` (the short one).
- `docs/flows.md`: `invite` and `invited`.
- Skill: `database` (`SECURITY DEFINER` functions that check the admin flag).

## Builds

### Inviting
- **Settings → *Members* → *Invite*:**
  - their email
  - *Browser/PWA* or *Android shell*
  - their switches
  - welcome credit, and an allowance or *Unlimited*
- **The invitation email** carries a link, its token stored hashed, with an expiry.
- ***Resend*** and ***Revoke***.
- **Accepting goes through one narrow `SECURITY DEFINER` function,** which creates the account (sign-up
  stays off).
- **Expired invitations** offer *Ask for a new invitation*. An email nobody invited is told *Sen is
  invitation-only*.
- **The short first run (D79):** sign in, then categories. They count by calendar month, and can set a
  payday later in Settings → *You*.

### Switches (D98)
- ***Shell*, *Capture* (needs *Shell*), *Agent*, *Splits*, *Receipts by email*, *Calendar* and
  *Claims*.** The ESS adapter stays the owner's alone.
- **Enforced in the API on every route,** and in the UI, which shows only what a person can use. *Not
  shown* is never the only guard.
- **With *Capture* off,** the shell unbinds its listener, and `/sync` refuses bank events (B07).

### AI credit (D98)
- **`ai_credit_entries`,** append-only, with `UNIQUE (user_id, dedupe_key)`:
  - `welcome`, `grant`, `usage`, `refund` and `reversal`
  - in the buckets `free`, `balance` and `covered`
- **The monthly free allowance,** by Kuala Lumpur calendar month, is spent before the balance.
- **Each call's charge** is its token counts × the rate card's version at that moment, in integer sen,
  rounded once. Failed calls aren't charged. *Unlimited* people's usage is recorded as covered.
- **The balance and the allowance left are computed, never stored.** The owner has no ledger.
- **Before every model call, jobs included:** the switch, plus allowance left or a positive balance,
  plus the daily ceiling. At zero, AI features pause and everything else works.
- **`agent/usage`** shows each person their balance and this month's free use.

### Members (admin only, through definer functions)
- **For each member:**
  - switches
  - credit: balance, this month's free use, *Grant*, *Refund*, allowance, *Unlimited*, daily ceiling
  - shell version and *Capture connected*
- **Shell seats** counted against Google's 20-device limit.
- ***Suspend*** signs them out everywhere.
- ***Remove*** offers their export (B37), then deletes their data through a function the owner can't
  read through.
- **Never their money or chosen apps.**

## Done when

1. pgTAP:
   - the admin functions return no money and no chosen apps
   - a member can't read anyone else's rows
   - `user_access` is read-only to its person
2. Credit tests:
   - the allowance is spent before the balance
   - the monthly reset in Kuala Lumpur time
   - an *Unlimited* person's usage is covered
   - a failed call isn't charged
   - a price change applies only to later calls
3. An invited test friend, in a browser, completes the `invited` journey, sees only their own
   features and data, and pauses at zero credit.
4. Every route refuses a feature that's switched off (test).

## On your phone

- [ ] Invite a test address of your own; accept it in a browser; check what it can and can't see.
