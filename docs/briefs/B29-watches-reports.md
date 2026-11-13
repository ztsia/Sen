# B29 · Watches and scheduled reports

**Stage 7 · Sen** · after: B29 · Check-ins, limits and closing the gap · next: B30

## Goal

Sen watches for what the owner says, and reports when asked.
- *Tell me when GrabFood passes RM200* is checked by code at each payment and each morning, and pushes
  once when it fires.
- *Every Sunday, last week by category* arrives by itself, as a fresh Sen run.
- Both are Sen's own things: set at once, with a *Saved* line and *Undo*.

## Read first

- `spec_v2.md`:
  - §12.4: *A watch*, *A scheduled report*, and the pushes written by code
  - §12.3: *Changing: one tool per thing*, `set_watch` and `set_report`
  - §12.5: the `watches-reports` skill
  - §15: `watches`, `reports`, `saved_queries` and `agent_runs`
  - §16: `POST /match` and `POST /jobs/tick`
- Decisions: D94, D99, D152, D154.
- `docs/screens.md`: `agent/watches`, and the native surfaces table, *A watch fired*.
- `docs/flows.md`: `watch`.

## Builds

### Watches
- **`watches`:** a saved query and a condition, in the person's words (`words`). **Code checks it,
  with no model,** when a payment is captured (`/match`, after the matching) and on the morning job.
- **A test run when it's made** says where it stands now, in the *Saved* line.
- **It fires once,** as a push and a line in the conversation, then not again until it clears
  (`state`: `clear`, `fired`).
- **Its push doesn't count against Sen's one a day:** it's written by code, like a health alert.
- **The native *A watch fired* notification:** *GrabFood has passed RM200 this cycle.* It opens `sen`
  at its line.

### Scheduled reports
- **`reports`:** an instruction and a schedule. `/jobs/tick` starts each, when its `next_run_at` is
  due, as a fresh Sen run (`agent_runs`, kind `report`) with memory, the open threads and its
  instruction, never the recent chat.
- **The run posts into the conversation,** and pushes only if that day's push is still unused. Its
  timeline line is written by code.

### The tools and the screen
- **`set_watch` and `set_report`** with the `watches-reports` skill (*Tell me when…*, *every
  Sunday…*). Each acts at once, with a *Saved* line and *Undo*, and is marked as made by Sen. Their
  fields are the app's own command, so the card and the screen do the same thing.
- **`agent/watches`:** every watch and report, each with what it does in the person's words, its last
  run or where it stands now, *Pause* and *Delete*. A tap opens it; one is changed by asking Sen.
  Rules and limits also appear here as their own slices add them.
- **Every input has a dedupe key:** a retried tick, or a payment matched twice, fires nothing twice.

## Done when

1. Tests:
   - a watch is checked by code with no model call, at capture and on the morning job
   - it fires once and not again until it clears, and its push isn't counted in Sen's one a day
   - a report's run posts, and pushes only when the day's push is unused
   - a test run is made on creation
   - a retried tick or match is a no-op, as the person, under RLS
2. `agent/watches` in all six looks, every state; the *Saved* line and *A watch fired* as drawn.
3. **Owner's check:** a watch the owner sets in their own words fires once on a real payment, and a
   Sunday report arrives by itself.

## On your phone

- [ ] Tell Sen *tell me when GrabFood passes RM200*. Read the *Saved* line, then tap *Undo* and set it
  again.
- [ ] Make a real payment that crosses it. Does one notification arrive, and no second?
- [ ] Tell Sen *every Sunday, last week by category*. Does the report arrive on Sunday?
- [ ] *Pause* and *Delete* one from `agent/watches`.
