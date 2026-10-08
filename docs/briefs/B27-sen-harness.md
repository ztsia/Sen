# B27 · Sen's harness and answers

**Stage 7 · Sen** · after: B26 · next: B28

## Goal

Sen exists: one conversation, opened from a floating button on any tab, that answers questions about
the owner's money.
- Every figure comes from a tool in this run or from the owner's own words. Code checks this, and
  `calc` does all the arithmetic.
- The loop, prompt, skills and context are built in Claude Code's shape (D53, D94), bounded in cost
  however long the chat runs.
- The main model is chosen on 20 real questions.

## Read first

- `spec_v2.md`:
  - §12, all of it, especially §12.2, §12.3 (the always-on tools), §12.5 and §12.6
  - §9.1: *Sen*
  - §9.6: *AI credit* (the check only; the ledger comes in B38)
  - §15: `agent_messages`, `agent_summaries`, `agent_runs`, `agent_steps`, `agent_memory` and
    `ai_usage`
  - §16: `/agent/chat` and `/agent/runs/:id/continue`
  - §17: the threat model, and *Links leave the app*
- Decisions: D34, D35, D48, D53, D68, D76, D94, D95, D98, D107, D108.
- `docs/screens.md`: `sen`, `agent/memory` and `agent/usage`.
- `docs/flows.md`: `ask`.
- The AI SDK's documentation (`ai-sdk.dev`), for `ToolLoopAgent`, `prepareStep`, tools without
  `execute`, and `addToolOutput`.

## Builds

### The loop (§12.5)
- **AI SDK 7's `ToolLoopAgent`,** with a step limit. Tiers are resolved only in `ai/models.ts`.
- **The main prompt**, about 1,500 tokens, as §12.5's outline, always in this order: prompt, tool
  declarations, skill list, memory, rolling summary, messages. What changes per call (the date, the
  screen Sen was opened from) goes in the user turn.
- **Skills** are markdown files headed `name · description · tools · requires · phase`.
  `load_skill(name)` switches on that skill's tools through `prepareStep` → `activeTools`. Skills run
  on Sen's own model (D107).
- **The always-on tools:**
  - `load_skill`, `list_transactions`, `get_spending`, `search_notes`, `remember`
  - `link_record`, `show_chart` (named queries written in code), `open_screen` (an allowed list,
    never with an amount)
  - `ask_user` (an app-side tool; the server accepts only an option it offered, or text marked as
    yours)
  - **`calc`:** arithmetic on figures already in this run, in integer sen, returning its working;
    currency conversion only with a rate a tool returned (D108)
  - `propose` and `read_file` come with B28 and B31.
- **Privacy:** tools return amounts, dates, merchants, categories, notes and totals, and claims as
  typed (D95). **Never** raw notification text or account numbers. A salary isn't shown until its
  claims question is answered (B25's flag, §12.2 rule 7).

### Runs and messages
- **The app sends only the new message,** whose id it makes, so a retried send is a no-op. The
  server loads the history from `agent_messages`, so a modified app can't forge it.
- **Messages are stored as the SDK's `parts`,** so every card redraws after a reload.
- **Each step is saved in its own short transaction** (`agent_runs`, `agent_steps`). No transaction
  is ever held across a model call.
- **Before a run's time runs out,** it queues a one-off job that calls
  `/agent/runs/:id/continue` with the internal secret (B06).
- **`/agent/chat` streams.**

### Figures and links (§12.2 rules 1 and 6)
- **Every RM figure in Sen's text** is matched against this run's tool results and your messages.
  An untraced figure is shown marked *not checked*; it isn't blocked.
- **A background message that fails the check** is written again once, then replaced by a line code
  writes.
- **Code removes any link** that isn't one of this run's sources. Sources open in the default
  browser.

### Context, bounded (§12.5)
- **A fixed part,** identical on every call so it caches: the prompt, the skills and memory.
- **A rolling summary plus the last ten or so messages.** The `summariser` subagent (cheap tier)
  writes the summary, and code rejects one that contains a money figure.
- **Tool results only for the question at hand.**
- **`search_messages`:** five snippets at most.
- **Read `cachedContentTokenCount`,** and record what gets cached.

### Credit and switches
- **Before every call,** the API checks the *Agent* switch and the daily safety ceiling (B10's rate
  card). Invited people's ledger comes in B38.
- **At the cap,** Sen shows *Sen is paused until 1 Nov; everything else works*.
- **`agent/usage`:** the owner's tokens, and an estimate in ringgit shown but never stored.

### `sen`, made real
- **The sheet:** *Looking at: …*, ⋯ and ×.
- **The conversation,** with the UI tools drawn as shared patterns:
  - `ask_user` as Review-row buttons, the recommended one first and marked
  - `show_chart` as the chart card
  - `link_record` as the list row
  - `open_screen` as a button
- **Suggested questions** fitted to the screen, written in code; no model call.
- **States:** streaming, offline (*Sen needs a connection*), and paused.
- **The avatar's states, wired to what Sen is doing:** resting, a new note, listening, working, with
  helpers, answering, paused, done.
- ***Ask Sen about this*** on Insights cards, `txn`, `split` and `budgets` opens Sen with the
  question ready. Opening a screen never calls a model.
- **The island's *Sen working*:** Sen's state, then *Answer ready*.
- **Skills:** `answers` and `memory`. `agent/memory` lists and forgets.

### Choosing the model (§12.6)
- **A cloud session can't see real data, so the 20-question eval runs inside the app.** Build an
  admin-only screen, Settings → *Sen* → *Compare models*:
  - it runs the owner's 20 questions on each candidate (first Gemini 3.8 Flash and Claude Haiku 4.5)
  - it scores each answer against the SQL truth computed in the same run
  - only the owner sees the results
- **The same eval runs in CI on the preview seed,** as a regression check.
- **The owner's choice is named only in `ai/models.ts`,** with a recorded decision.

## Done when

1. Tests:
   - an untraced RM figure is marked
   - `calc` never uses a float and shows its working
   - a retried message is a no-op
   - a run continues past a forced timeout
   - the summary rejects a money figure
   - tools never return raw notification text or account numbers
   - chats run as the person, under RLS
2. **Owner's eval:** 20 real questions are answered correctly against SQL truth, and the main model is
   chosen.
3. `sen` in all six looks, with every UI tool's card and every state. The avatar's states show.

## On your phone

- [ ] Ask Sen five things you actually want to know. Are the figures right? Tap a *not checked* one.
- [ ] Run *Compare models* with your 20 questions, and choose.

## Needs from you first

- Your 20 questions, written down: things you'd really ask, such as *Where did last month's money
  go?* or *How much on bubble tea since June?*
- A key for the second candidate's provider, if it's chosen to be compared (D55's privacy bar).
