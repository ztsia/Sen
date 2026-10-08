# B29 · Check-ins, experiments and closing the gap

**Stage 7 · Sen** · after: B28 · next: B30

## Goal

Sen watches without nagging.
- **A 9pm note,** only on days something is worth saying: code finds the signals; a silent day costs
  nothing.
- **At most one push a day.**
- **A Sunday summary.**
- **Limits in the owner's own words** become experiments that code counts.
- **When the unaccounted gap grows,** Sen asks pointed questions and opens manual entry.

## Read first

- `spec_v2.md`:
  - §12.1: *Watch* (all of it), and *Review* (check-ins and memory)
  - §12.3: `get_checkin_signals`, `get_week_review`, `post_checkin`, `stay_silent`,
    `get_unaccounted`, `get_quiet_days` and `get_rule_status`
  - §12.4, all of it, with its worked message
  - §12.5: the skills `checkin`, `hold-to-word` and `close-the-gap`
  - §9.2: Sen's note
  - §9.3: *Am I keeping my experiment?*
  - §15: `agent_memory` (`kind`, `check`) and `alerts_sent`
  - §16: the evening job
- Decisions: D31, D35, D94.
- `docs/screens.md`: `home` (Sen's note) and `insights`.
- `docs/flows.md`: `daily` (9pm) and `gap`.

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

### The evening job (21:00)
- **No signals means no model call.**
- **Otherwise,** a fresh run with the `checkin` skill: the fixed part, plus a message in §12.4's
  format, with the signals arriving as a tool result.
- **`post_checkin({push, message})`:**
  - code checks the lengths and every figure
  - **at most one push a day** (`sen_push:{date}`)
  - **no push if Sen was opened since 18:00**; the message still posts
  - the message goes into the conversation and onto Home
- **`stay_silent(reason)`.**
- **Sunday:** `get_week_review` gives the week against a typical week, each experiment's progress,
  and amounts owed for more than 7 days. Up to 120 words, pushed only if the day's push is unused.
- **Pushes written by code** (health alerts, claim reminders) don't count against the one.

### Experiments (`hold-to-word`)
- ***Two bubble teas a week*** becomes an experiment with a `check` that code can count: merchant
  keys or a category, count or sum, a limit and a window. The owner confirms it through an
  `experiment` proposal.
- **The Insights card *Am I keeping my experiment?*:** weekly counts against the limit.

### Closing the gap (`close-the-gap`, capture only)
- **When the gap grows, or a usual spending day is empty,** Sen asks: *Nothing was captured on
  Saturday. Did you pay for anything?*
- **For each yes,** `open_screen` opens `manual` with the day filled in, never the amount.

### Home
- **Sen's latest note shows on Home,** and on the large widget (B23).

## Done when

1. Tests with a fake clock:
   - a day with no signals makes no model call
   - one push a day
   - the 18:00 rule
   - Sunday's summary
   - every signal kind fires once
2. An experiment's check counts right on fixtures.
3. **A week of check-ins the owner didn't mute** (P6's bar).

## On your phone

- [ ] Live with the 9pm notes for a week. Mute any that annoy you, and say why.
- [ ] Tell Sen a limit in your own words; confirm the experiment.
