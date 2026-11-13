# B29 · Check-ins, limits and closing the gap

**Stage 7 · Sen** · after: B28 · next: B29 · Watches and scheduled reports

## Goal

Sen watches without nagging.
- **A 9pm note,** only on days something is worth saying: code finds the signals; a silent day costs
  nothing.
- **At most one push a day.**
- **A Sunday summary.**
- **Limits in the owner's own words** (*two bubble teas a week*) are counted by code. The payment's
  own notification says where you stand, with no model.
- **When the unaccounted gap grows,** Sen asks pointed questions and opens manual entry.

Watches and scheduled reports are the next slice (B29 · Watches and scheduled reports).

## Read first

- `spec_v2.md`:
  - §12.1: *Watch* (all of it, including *Where you stand* and *A wallet about to run dry*), and
    *Review* (check-ins and memory)
  - §12.3: `get_checkin_signals`, `get_week_review`, `get_quiet_days`, `post_checkin` and
    `stay_silent`; `propose_limit` and the *Proposal* part
  - §12.4, all of it, with its worked message
  - §12.5: the skills `checkin`, `hold-to-word` and `close-the-gap`, and *Background runs*
  - §9.2: Sen's note
  - §9.3: *Am I keeping my experiment?*
  - §15: `agent_memory` (`kind`, `check`), `agent_proposals` and `alerts_sent`
  - §16: `POST /match` (the limits a new payment touches) and `POST /jobs/tick` (the evening job)
- Decisions: D31, D35, D94, D152.
- `docs/screens.md`: `home` (Sen's note), `insights`, `agent/watches` (it lists the limits), and the
  native surfaces table's *Where you stand*.
- `docs/flows.md`: `daily` (9pm) and `gap`.
- B28's proposal machinery, which `propose_limit` uses.

## Builds

### Signals (SQL; deterministic)
- **`get_checkin_signals(date)`** returns named signals not yet sent (not in `alerts_sent`):
  - a budget past 80%, or over (D31)
  - a payment above 95% of that category's usual payments
  - a day with nothing captured, when you usually spend that day
  - an experiment one away from breaking
  - a deadline or promise within 3 days
  - five or more *Review* items older than 3 days
  - a missed subscription charge
  - a claim missing evidence
  - **a wallet holding less than it usually pays tomorrow** (*TnG has RM8; tomorrow's tolls usually
    take RM12*)

### The evening job (21:00)
- **No signals means no model call.**
- **Otherwise,** a fresh run with the `checkin` skill, on the background-runs job's model. The fixed
  part is the prompt, memory and the open threads, with no chat history. The message is in §12.4's
  format, and the signals arrive as a tool result.
- **`post_checkin({push, message})`:**
  - code checks the lengths and every figure
  - **at most one push a day** (`sen_push:{date}`)
  - **no push if Sen was opened since 18:00**; the message still posts
  - the message goes into the conversation and onto Home
- **`stay_silent(reason)`.**
- **Sunday:** `get_week_review` gives the week against a typical week, each experiment's progress,
  and amounts owed for more than 7 days. Up to 120 words, pushed only if the day's push is unused.
- **Pushes written by code** (health alerts, claim reminders, a watch) don't count against the one.
- **A job's first model call** picks its default on its golden set and records a decision.

### Limits (`hold-to-word`)
- ***Two bubble teas a week*** becomes a limit with a `check` that code can count: merchant keys or a
  category, count or sum, a limit and a window (`agent_memory`, kind `experiment` or `rule`). The
  owner confirms it through a `propose_limit` proposal, which shows its effect before the tap.
- **Counted by code,** never by the model. A limit one away from breaking is a check-in signal.
- **The Insights card *Am I keeping my experiment?*** (seeded in B20) shows weekly counts against the
  limit.
- **Where you stand, on the payment's own notification** (§12.4, the native surfaces table):
  - after a payment is booked, `/match` counts the limits it touches and code writes the line
    (*3rd Tealive this week, limit 2 · RM41.00 left for drinks*)
  - it goes on the payment's own prompt; a payment with no prompt gets a quiet notification of its
    own
  - a tap opens `agent/watches` at that limit
  - no model runs, and it isn't one of Sen's pushes

### Closing the gap (`close-the-gap`, capture only)
- **When the gap grows, or a usual spending day is empty,** Sen asks: *Nothing was captured on
  Saturday. Did you pay for anything?*, using `get_quiet_days` and `ask_user`.
- **For each yes,** `open_screen` opens `manual` with the day filled in, never the amount.

### Home
- **Sen's latest note shows on Home,** and on the large widget (B23).

## Done when

1. Tests with a fake clock:
   - a day with no signals makes no model call
   - one push a day
   - the 18:00 rule
   - Sunday's summary
   - every signal kind fires once, the wallet signal included
2. A limit's check counts right on fixtures, and the line on a payment's notification reads right at
   each count (under, at, over), with no model call.
3. **A week of check-ins the owner didn't mute** (P6's bar).

## On your phone

- [ ] Live with the 9pm notes for a week. Mute any that annoy you, and say why.
- [ ] Tell Sen a limit in your own words; confirm it. Make a payment it touches and read the line on
      its notification.
