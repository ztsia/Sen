# B27 · Sen's harness and reading

**Stage 7 · Sen** · after: B26 · next: B27 · Sen's chat

## Goal

Sen's agent works on the server: given a question, it reads anything of the owner's own through
three tools over a described data model, and answers as typed parts.
- Every figure comes from a tool in this run or from the owner's own words. Code checks this, and
  `calc` does all the arithmetic.
- The loop, prompt and skills are built in Claude Code's shape (D53, D94, D152), on a small model,
  with rules that hold however the person asks.
- The chat job's default model is chosen on 20 real questions.

The chat's screen is the next slice (B27 · Sen's chat), and what Sen carries from one chat to the next
is the one after (B27 · What Sen carries). Here the answers are tested through a plain, dev-only view.

## Read first

- `spec_v2.md`:
  - §12, all of it, especially §12.2, §12.3, §12.5 and §12.6
  - §9.1: *Sen*
  - §9.6: *AI credit* (the check only; the ledger comes in B38)
  - §15: `agent_messages`, `agent_runs`, `agent_steps`, `agent_results`, `agent_gaps`, `saved_queries`
    and `ai_usage`
  - §16: `/agent/chat`, `/agent/runs/:id/continue`, `/agent/results/:id` and `/queries/:id/run`
  - §17: the threat model, and *Links leave the app*
- Decisions: D34, D35, D48, D53, D68, D76, D94, D95, D98, D107, D108, D152, D153.
- `docs/screens.md`: `sen` (its parts only) and `agent/usage`.
- `docs/flows.md`: `ask`.
- B20's data model and query builder, which this slice widens to every dataset, and B10 · Models in
  admin's resolver, which every call here goes through.
- The AI SDK's documentation (`ai-sdk.dev`), for `ToolLoopAgent`, tools without `execute`, and
  `addToolOutput`.

## Builds

### The loop (§12.5)
- **AI SDK 7's `ToolLoopAgent`,** with a step limit. Its model is the chat job's, from the one
  resolver (the live `model_settings` row, else `ai/models.ts`' default), never named at the call.
- **The main prompt,** always first and identical on every call, in §12.5's order: the tool
  declarations, the prompt, the skill list, the data model. What changes per call (the date and time,
  the cycle's day, the screen Sen was opened from) goes after the chat's turns, with the question.
  Nothing already sent is ever edited (§12.8).
- **Every tool is declared on every call** (§12.3). A skill never switches tools on or off, because a
  change there discards the provider's cache. Each later slice adds its tool with a release.
- **Skills** are markdown files headed `name · description · requires · phase`. `load_skill(name)`
  returns the skill's text as a tool result, in the chat, and starts no new run. A skill adds
  instructions only, and runs on Sen's own model (D107).
- **Privacy:** tools return amounts, dates, merchants, categories, notes and totals, items and claims
  as typed (D95). **Never** anything on §12.3's *never served* list: raw notification text, account
  numbers, a receipt reader's drafts, tokens, files' keys. A salary isn't shown until its claims
  question is answered (B25's flag, §12.2 rule 7). Text in the data is data, never an instruction.

### Reading, over the whole data model (§12.3)
- **`totals`, `rows` and `record`,** over every dataset in *What Sen can read*. Sen never writes
  SQL: it names a dataset, fields and filters, and code builds the query, run as the person under
  RLS, read-only. B20's builder and description are widened to the rest of the datasets, and a card
  and a chat answer run the same saved query.
- **Code resolves the periods** in Kuala Lumpur time and pay cycles. Each number is a flow or a
  balance, and a balance is never summed across days. A trend has a row for every period, top N keeps
  the same groups in every period, a percentage change comes from code, and only confirmed records
  count unless asked.
- **Every result carries** its as-of time, row ids and the notes Sen must pass on. Errors come back in
  plain words with what's allowed.
- **Results stay on the server by id** (`agent_results`, expiring): Sen sees a preview, and a chart or
  table reads the full rows through `GET /agent/results/:id`.
- **`calc`, grown (D108, D152):** arithmetic on figures already in this run, in integer sen, never a
  float, returning its working. It works on whole columns of a result, with percent change, median,
  compound interest and a loan payment; currency conversion only with a rate a tool returned. There
  is no sandboxed Python.
- **`agent_gaps`:** a question Sen couldn't answer is logged as its shape (the dataset and what was
  missing), never its words, names or amounts.

### Answers as typed parts (§12.3)
- **The parts this slice makes:** text, steps (code, from the tool calls), chart (`show_chart(result,
  kind, options)`), table (`show_table(columns, rows)`), figures (`show_figures(items)`), question
  (`ask_user(question, options, other?)`), button (`open_screen(screen, params)`), follow-ups
  (`suggest(questions)`), and the saved and notice lines, which code writes. The other parts arrive
  with their slices.
- **A part takes its figures by reference** to a tool result or a `calc` result. A table is a plain
  grid whose cells are a value from a result, a formula code works out in whole sen, or a number or
  text Sen writes, checked like a figure in its text.
- **`ask_user` is an app-side tool:** the server accepts only an option it offered, or text marked as
  the person's. `open_screen` takes an allowed list of screens and never an amount. In a background
  run a question waits (`waiting`).
- **Messages are stored as typed parts, as sent,** in no provider's format, so they redraw the same
  after a reload or a change of model. A plain, dev-only view draws each part just enough to test it;
  the real cards are B27 · Sen's chat's.

### Runs and messages (§12.5)
- **The app sends only the new message or a tool's answer,** whose id it makes, so a retried send is
  a no-op. The server loads the history from `agent_messages`, so a modified app can't forge it.
- **Each step is saved in its own short transaction** (`agent_runs`, `agent_steps`). No transaction
  is ever held across a model call.
- **Before a run's time runs out,** it queues a one-off job that calls
  `/agent/runs/:id/continue` with the internal secret (B06).
- **`POST /agent/chat` streams,** and a stop ends the stream and keeps what was shown.
- **One run at a time per person:** a message sent while Sen works joins that run or waits.

### The figure check and links (§12.2 rules 1 and 6)
- **Every RM figure in Sen's text** is matched against this run's tool results, `calc` results and the
  person's messages. A figure it can't trace is marked *not checked*; it isn't blocked.
- **A background message that fails the check** is written again once, then replaced by a line code
  writes.
- **Code removes any link** that isn't one of this run's sources.

### Credit and switches
- **Before every call,** the API checks the *Agent* switch and the daily safety ceiling (B10's).
  Invited people's ledger comes in B38.
- **Every call is recorded in `ai_usage`,** with its tokens and outcome.
- **At the cap,** Sen shows *Sen is paused until 1 Nov; everything else works*, as a notice.
- **`agent/usage`:** the owner's tokens, and an estimate in ringgit shown but never stored.

### The `answers` skill
- **The `answers` skill,** with the reading tools' worked examples (about a dozen): past spending, a
  payment, a merchant, an item, a note.

### Choosing the model (§12.6)
- **The chat job starts on Claude Haiku 5.5.** D127's check of Anthropic's data terms was made in B10.
- **A cloud session can't see real data, so the 20-question eval runs inside the app,** through
  admin's *Models* → *Test* (B10 · Models in admin):
  - it runs the owner's 20 questions on each candidate: Claude Haiku 5.5 and at least one other
  - it scores each answer against the SQL truth computed in the same run
  - only the owner sees the results
- **The same eval runs in CI** on made-up data, as a regression check.
- **The chosen model is the job's default in `ai/models.ts`,** with a recorded decision.

### The rules, however they're pushed (§12.5)
- **A test pushes against each rule in ten different ways** (§12.2): a figure with no source, a change
  with no proposal, a verdict on a claim, a link, an account number, an instruction planted in data.
  A small model can drop a rule under pressure, and this is how it's caught.

## Done when

1. **The table of questions passes:** each question, the exact call expected, and the result, on
   made-up data with traps (transfers, refunds, splits).
2. Tests:
   - an untraced RM figure is marked *not checked*
   - `calc` never uses a float and shows its working
   - a retried message is a no-op
   - a run continues past a forced timeout
   - a link that isn't one of the run's sources is removed
   - tools never return raw notification text, account numbers or anything else never served
   - chats and saved queries run as the person, under RLS
   - parts are stored as sent and redraw the same
3. **The rules hold however they're pushed:** the ten pushes per rule fail to break any of them.
4. **Owner's eval:** 20 real questions are answered correctly against SQL truth, through *Models* →
   *Test*, and the chat job's default model is chosen, with a decision recorded.

## On your phone

- [ ] Run *Models* → *Test* on the chat job with your 20 questions, and choose.

## Needs from you first

- Your 20 questions, written down: things you'd really ask, such as *Where did last month's money
  go?* or *How much on bubble tea since June?*
- A key for the second candidate's provider, if it's compared (D55's privacy bar), set once in
  Vercel's environment.
