# B12 · Categories that stick

**Stage 3 · Capture to ledger** · after: B11 · next: B13

## Goal

Every payment ends up with a category for about one tap.
- A known merchant is filed silently.
- A new merchant gets a prompt with buttons straight after paying, and your answer makes a rule.
- Anything missed waits in *Review*, which is now real.

Any payment can be fixed, noted, marked, deleted or undone, and a missed one can be entered in about
10 seconds. *Just paid* shows in the island.

## Read first

- `spec_v2.md`:
  - §6.3, all of it
  - §6.6: the table rows for new merchants and money in, and *Not in Review at all*
  - §6.7 and §6.8
  - §7: *Cash and the physical TNG card*
  - §8: *Merchant rules* (every bullet except *Sen can set up rules*)
  - §9.1: *The island*, the *Just paid* moment
  - §15: `merchant_rules`, `merchant_aliases`, `transactions.note`, and `audit_log`
- Decisions: D22, D24, D25, D28, D70, D89, D90, D101, D112.
- `docs/screens.md`:
  - `review`, `txn`, `payments` and `manual`
  - the category prompt row of *Native surfaces*
  - Settings → *Capture* (the island switch) and → *Categories and rules*
- `docs/flows.md`: `pay-known`, `pay-new`, `hawker`, `manual` and `fix`.
- `docs/ui/patterns.md` §7: *Review row*, *Toasts and undo* and *Detail page*.
- B02's result for Q27, the island.

## Builds

### Rules (D89)
- **Merchant normalisation:** uppercase, collapse spaces, strip punctuation, strip trailing
  reference numbers. Shared TypeScript and Kotlin, with fixtures.
- **`merchant_rules`:** one per merchant key, with these facets now: category (`single` for now;
  `by_item` arrives in B16), and kind, for money in such as salary. Plus `set_by` and
  `confirmed_count`. The claim and relief facets come in B25 and B26.
- **`merchant_aliases`**, for B16.
- **Every payee gets a rule, personal names included (D70).** A cash withdrawal and a TNG card
  reload are ordinary rules (Cash, Transport).
- **Rules join the offline copy.**

### On the phone (native)
- **A known merchant** has its category applied silently. It's done; there's no review step.
- **A new merchant gets the category prompt:**
  - *RM12.90 · ZUS COFFEE*, with **the two best guesses** and a third button
  - until B15, the third button is *Other…*, opening *Review*; B15 makes it *Scan receipt*
  - tapping the body opens the full choice in the app
  - it waits for a pair partner or context (B11)
- **The two best guesses (D112)** come from a cheap-tier model, the first time a merchant is seen:
  - **Online:** the shell syncs the payment at once, and the server asks for the two likeliest of the
    person's own active categories, given the merchant's name, the amount and the time of day. The
    prompt waits at most 5 seconds.
  - **Offline, without an answer in time, or with no AI credit:** code guesses from the person's own
    history: the categories they chose most for payments of a similar amount at a similar time of day
    over 90 days, then their most used.
  - **The notification and the island keep the buttons they were posted with,** so nothing moves
    under the thumb. If the model answers late, its guesses replace history's in that payment's
    *Review* row.
  - Each call is recorded in `ai_usage` (purpose `category`) and checked against the daily ceiling.
  - Pick the model with a small benchmark on made-up Malaysian merchant names, and record it in
    `ai/models.ts`.
  - **A guess is only a button.** The tap makes the rule; the model never sets a category.
- **Answering from the notification** works with the app closed. The category and the new rule go
  into the outbox.
- **One prompt at a time:** a new prompt replaces an unanswered one, which stays in *Review*.
- ***Just paid* in the island** (D101), behind the `Island` interface, using Android 16 Live Updates:
  *−RM12.90*, expanding to the merchant, the two guesses and the third button, for 10 minutes. Then
  it stays as the ordinary notification.
  - It has a switch in Settings → *Capture* (`user_settings.island_just_paid`).
  - Xiaomi's own island API is added only if Q27 passed.

### `review`, made real for everything so far
- ***Needs you*:**
  - a new merchant: the two guesses and *Other…*
  - money in: *Income*, *Transfer*, *Refund of…*
  - new wording
  - *One payment or two?*
  - a transfer's other side
  - *Which account is this?*
- **The badge counts *Needs you* only,** live. Answering clears a row with *Undo*.
- **It works offline,** from the outbox.

### `txn` and editing (§6.7)
- **Category:**
  - when the category came from a rule: *Just this one* or *From now on*, which updates the facet on
    the payment's rule
  - a first answer makes the rule without asking
  - *Mixed* items come in B16
- **Notes (D90):** a muted *Add a note* row opens a small sheet. Notes are searchable, and marked in
  lists.
- ***Mark as…*** a transfer or a refund.
- ***Delete*:** a notification's payment is `dismissed`, and its raw text stays; a manual entry
  becomes a tombstone.
- ***Correct amount, time or account*,** beside the raw notification.
- ***Changes*** reads `audit_log`. Every change shows *Undo* in a toast.

### `payments`
- **Search** over merchants and notes; items join in B16.
- **Filters** for date range, account and category; the cycle filter comes in B13 and *Shared* in
  B17.

### `manual`
- **The amount** on a number pad, typed as text into sen. Categories, most used first. The account
  you used last, and the time now.
- ***More*** for merchant and note.
- **A near-duplicate warning** that doesn't block. `source = manual`.
- **The *Add expense* launcher shortcut.**

## Done when

1. Normalisation fixtures pass in both languages.
2. Tests for the guesses: the model's are used online and within 5 s; history's are used offline,
   late or at zero credit; a guess never sets a category. On the emulator, a new merchant's prompt is answered from the shade with the app closed. The rule
   is made, the next payment there files silently, and both sync.
3. Tests: *Just this one* changes only that payment. *From now on* changes the rule, and past
   payments stay. A first answer doesn't ask.
4. Every *Needs you* row kind so far clears with *Undo*, offline too, and the badge counts right.
5. Delete and *Undo* work for notification payments and manual entries. A dismissed event never comes
   back on re-read.
6. **On the Xiaomi:** *Just paid* shows in the island, and the prompt arrives within seconds of
   paying.
7. **A full week of real spending is captured and categorised, from no templates** (P3's bar), with
   the owner's sign-off.

## On your phone

- [ ] Pay at a new place: answer the prompt from the shade. Pay there again: no prompt.
- [ ] Swipe a prompt away, and answer it in *Review*.
- [ ] Use the app for a week. Is anything uncategorised or wrong?
