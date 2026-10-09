# B10 · New wording: drafting and booking

**Stage 3 · Capture to ledger** · after: B09 · next: B11

## Goal

Capture works from nothing, for anyone, with any bank. A notification with an amount and no template
is drafted into a template by a cheap model at sync, checked by code, and **booked at once**, marked
*new wording*. The owner confirms it in *Review*, and *No* undoes it completely. **No number the
model writes is ever stored.**

**Real transactions start here.**

## Read first

- `spec_v2.md`:
  - §6.2: *New wording: a model writes a template* (steps 1–5) and *Keeping model calls rare*
  - §5.1: *Models* and *Template drafting*
  - §9.6: *AI credit* (the daily safety ceiling applies to everyone)
  - §11: *AI costs*
  - §12.6: the bar for any model
  - §15: `channel_rules` and `ai_usage`
  - §16: `/sync` (drafting) and `/templates/:id/confirm` and `/reject`
  - §17: the threat model, on digit masking
  - §18: the wording row
- Decisions: D15, D34, D55, D87, D94, D98 (the ceiling only).
- `docs/screens.md`: `review` (*New notification wording*), `skipped`, and Settings → *Capture*.
- `docs/flows.md`: `new-wording`.

## Builds

### Drafting, at sync
1. **No amount, no model.** Code files the event as `skipped`, free, every time.
2. **With an amount and no template:**
   - group by app, one call per app per batch
   - mask long runs of digits
   - add what the chosen apps posted within 2 minutes either side; known neighbours go only as
     skeleton, kind and *same amount: yes/no*
   - call the cheap-tier model through the AI SDK on Vertex, with a zod schema: template, kind,
     `ignore_reason`, and the model's own reading of the amount
   - leave room in the schema for pair-rule proposals, which B11 adds
3. **Code checks every proposal.** It must:
   - match the whole notification
   - read a valid `{amount}`
   - use only the allowed blanks
   - not match notifications another template already reads
   - give code's amount exactly equal to the model's own reading

   A proposal that fails is retried once with the reason. Then the event stays `unparsed`, with the
   reason recorded.
4. **`ignore`, `hold` and `context` templates** apply at once and never ask. Their events show in
   *Skipped*.
5. **A money template starts `provisional` and books at once.** Its payments are marked *new
   wording*. `/sync` returns the new templates so the shell re-reads its own events.
6. **Classify first (D119).** A wording no template knows arrives with all its numbers masked (B02
   masks every long number until then). A cheap-tier call classifies it: transaction, OTP, promotion,
   order or delivery, account notice, or other. On the phone (B09), the raw digits wait in memory only
   for the answer; a transaction is stored with them and drafted as a money template; an OTP is dropped
   and drafted from the masked text as `ignore: OTP`; the rest become `ignore` or `context` templates.
   Offline or late, the event is stored masked and classified at the next sync. Learned OTP wordings
   are listed in Settings → Capture, with *This was a payment* to undo, which retires the template.
   **Before fixing the classifier's model, test it (D94):** the cheap tier's candidates against Jev
   (TypeSafe AI) on the soak's anonymised samples, for OTP-against-transaction accuracy, cost and speed.

### Confirming
- ***Review* holds one item per provisional template,** such as *New Ryt wording: RM12.90 paid at ZUS
  COFFEE, Main Account. Right?* Later payments with that wording join the same item.
- ***Yes*** makes the template `active`.
- ***No*** makes it `rejected`, dismisses its payments, returns their events to `unparsed`, and
  offers *Enter by hand*.
- ***This was a payment*** on a *Skipped* event: re-draft that wording as money. If no money template
  passes the checks, open `manual` with the event's text beside it. Write this behaviour into
  §6.2, which doesn't spell it out.

### Keeping calls rare
- **Promos:** each becomes an `ignore` template.
- **Channel rules:** three promos on one app's channel, and no payment, add a `channel_rules` row,
  which is synced down and dropped natively (§6.2).
- **A daily cap on calls per person,** and the daily safety ceiling in sen, estimated from token
  counts using the versioned rate card in code (D98), never stored.
- **When it can't draft** (offline, at the cap or at the ceiling), the event waits as *Waiting to
  read new wording*.
- **Every call** is recorded in `ai_usage`, with its tokens and outcome, and no cost column.

### The model
- **Build the eval harness, `evals/`, the first slice to call a model** (D120): one golden set per job
  (anonymised cases with their expected answers, from `notifications.md` and the soak's samples), a
  runner that calls each candidate through the AI SDK, and scores by code (the class, whether the
  template passes code's checks, the amount read), with tokens, cost and latency. What code can't
  score (how a template or merchant is named), the session reads in a blind side-by-side sample of
  the candidates' answers and judges, recording why; the owner decides where it's a matter of taste.
  Later phases add their own job's set (receipts in P4, the agent in P6).
- **Benchmark the cheap candidates** on it: Claude Haiku 5.5, Gemini 3.5 Flash-Lite and, for
  classifying, Jev. Name the winner only in `ai/models.ts`, and record a decision.
- **The live drafter test needs a key, so it runs in the benchmark session only.** CI replays
  recorded model responses to test the checks.

### Screens made real
- **`review`'s *New wording* rows.**
- **Settings → *Capture*:** learned wordings (provisional, active, ignored), channel rules, and the
  *Skipped* list. *Captured on this phone* is removed.
- **`txn`** shows *New wording: right?* while its template is provisional.

## Leaves for later

- Pair rules the model proposes: B11 consumes them. Categories: B12.

## Done when

1. In the benchmark session, every sample in `notifications.md` drafts its documented template.
   CI replays it.
2. Tests on the checks: a planted mismatch between the model's amount and code's is rejected, as are
   a partial match, an unknown blank, and an overlap with an existing template.
3. *No* dismisses every payment of that template and returns their events to `unparsed`. *Yes*
   activates it. Both work with *Undo*.
4. Promos make channel rules after three, and the channel is then dropped on the phone (emulator).
5. Offline, and at the cap, events wait with the right label and draft when allowed.
6. **On the Xiaomi:** the soak's events and new payments become transactions. A real payment with a
   new wording books within a minute of syncing.

## On your phone

- [ ] Open *Review*: confirm or reject each *New wording* item.
- [ ] Pay somewhere new, and check the payment appears in *Payments* within a minute.

## Needs from you first

- A Google Cloud project with the Vertex AI API on, and its key in Vercel's *Production*
  environment (`docs/local.md`).
- For the benchmark session only: a separate key with a spending cap, removed afterwards
  (`docs/cloud.md` §3).
