# Sen's agent, chat and Insights: the re-spec (D152)

Decided with the owner on 12 Nov. **Not yet folded into the spec.** This file holds the detail until
`spec_v2.md` (§9.3, §12, §15, §16), `docs/screens.md`, `docs/ui/patterns.md` (§4) and
`docs/modules.md` carry it; then it's deleted. The agent isn't built yet, so nothing here changes code
that exists. §11 lists what the spec revision still has to settle.

## 1. Models

- **Sen's chat runs on Claude Haiku**, through Anthropic's API. D127's check of Anthropic's data terms
  still comes first. **No model picker** in the app.
- What Haiku changes in §12.5:
  - **Every tool is declared on every call; a skill adds only instructions.** Claude caches tools,
    then the system prompt, then messages, so switching tools on per skill (`activeTools`) would throw
    the cache away each time. Haiku caches from 512 tokens, so Sen's prompt is cached.
  - **Each call stays far under 100,000 tokens:** above that Haiku's price is five times higher (§3).
  - **The rules say they hold however the person asks,** and a test checks it: Haiku can drop a rule
    under pressure.
- The researcher stays on Gemini with Google Search (§2). Readers and other tiers stay as §12.6 says.

## 2. Research

- **One generic tool, `research(goal)`,** runs the researcher on any topic and returns findings with
  sources and dates. §12.2 rule 6's handling stays: a finding is a draft until confirmed, grounded
  text is shown unedited with numbered sources, Sen writes no URLs, sources open in the browser.
- **A research skill is a goal for it:** a template for the question, what to pull out, and what code
  does with the result (`rate-watcher`, `product-advisor`, and any later one).
- A long question runs in the background and posts a brief.
- **The guard is loosened** (amends D55's clarification and rule 6): a figure from the ledger may go
  into a search when the question needs it (*where should I keep RM23,000 of savings*). Code rounds
  any ledger figure first and strips account numbers and names. Nothing is refused.

## 3. One conversation, and what each call holds

One conversation for good: the person shouldn't have to remember which chat to continue. No RAG.
What must survive is what was decided, and that already lives as rows (goals, budgets, rules, watches,
memory) that tools read fresh; a year of chat is a few thousand messages, which plain search handles.

| In every call | Target size | Why it works |
|---|---|---|
| The prompt, every tool, the skill list | About 9k, cached | Changes only with a release |
| Memory, and the names of what's active (goals, budgets, watches, open proposals) | About 3k, cached | Amounts always come fresh from tools |
| The diary: one dated note per past stretch of chat (asked, concluded, decided, open), the last ten, and a line per older month | About 2k | A note is written once, in the background, and never re-summarised, so it doesn't blur |
| The last few turns, word for word | Up to 10k | An old tool result shrinks to a one-line stub |
| This question's tool results | Up to 8k | A big result stays on the server; Sen sees a preview, and parts read the full rows |

A typical call is about 25k; the oldest turns move into the diary at 50k. These are design targets,
not measurements. `recall(words, when)` searches the diary and every old message with Postgres text
search, and replaces `search_messages`; a swipe to reply brings an old message back with its data.
The diary replaces `agent_summaries`' one rolling summary. Meaning-based search is added only if tests
show plain search missing things.

## 4. What Sen answers with

An answer is an ordered list of typed parts, stored as sent, so it redraws the same later.

| Part | What it shows | In the spec before |
|---|---|---|
| Text | Sen's words; a tap on a figure shows its source and opens the records behind it | Yes; the tap is new |
| Steps | What Sen is reading, live, then one folded line that is the answer's source | New |
| Chart | Any kind in §5, from a tool result | Partly: fixed queries only |
| Table | A plain grid (below) | New |
| Figures | 1 to 4 big numbers, each with its change | New |
| Question | 2 to 4 options, the recommended one first | Yes (`ask_user`) |
| Proposal | What will change, field by field; *Apply*, *Change…*, *Dismiss*; folds to one line once decided | Yes; *Change…* and the fold are new |
| Button | Opens a screen already filled in | Yes (`open_screen`) |
| Follow-ups | 1 to 3 next questions, only when useful | New |
| From the web | Research text with numbered, dated sources; *Confirm* saves a figure | Yes |
| File | Excel with real formulas, CSV, a claim pack | New |
| Playground | Sliders and a chart that code recomputes as you drag; *Apply* turns it into a proposal. Fixed kinds: a spending what-if, a goal's date against its monthly amount, a budget split, a loan payoff, a test on your own past | New |
| Checklist | Steps that tick themselves when the matching payment arrives | Partly: the payday card |
| Coming up | Bills, instalments and deadlines by day | New |
| Compare | Products side by side with your own numbers | Partly: the tool, no card |
| Saved | The receipt for something Sen set up (*Watching: GrabFood over RM200*), with *Open* and *Undo*; written by code | New |
| Notice | A muted line about Sen or the data (capture was off, out of credit, stopped, offline); written by code | New |

- **A part takes its figures by reference** to a tool result or a `calc` result, so it can't show a
  number Sen made up.
- **A table is just a table.** Sen names the columns; there are no totals unless Sen asks for them.
  Each cell is a value from a tool result, a formula over other cells that code works out in whole
  sen, or a number or text Sen writes. A row or cell that is a record opens that record's page. There
  is no separate list-of-records part.
- **A number Sen writes itself** is checked like a figure in its text (D108): it passes when it
  matches a tool result or the person's words, and otherwise shows *not checked*.

## 5. Charts

shadcn's Chart on Recharts (D151). A chart is described as data (its kind, title, series, points,
unit, a note, options), and one component draws it for Sen's `show_chart` and for the screens.

| Kind | Variants | For |
|---|---|---|
| Line | Against last cycle; a limit line; a dashed estimate for the days ahead; stepped | Pace through the cycle, a balance, an item's price |
| Area | Single, stacked, shares of 100% | Balance over time, spending mix by month |
| Bar | Negatives coloured, value labels, one highlighted, a budget or typical line | Spend by day, week or cycle; net in and out |
| Stacked bar | Amounts or shares | Categories per cycle; by account |
| Ranked bar | Top N with *and N more*; a typical mark | Top categories, merchants, items |
| Bars with a line | A second axis only when the units differ | Spend against income; a running total |
| Donut | The total in the middle, one highlighted, category then merchant | Where the money went |
| Ring | One, or several with a total | Goals and budgets |
| Treemap | Tap into a category | The whole cycle at a glance |
| Waterfall | Cycle to cycle; pay to what's left | Why this cycle differed; the payday plan |
| Flow (Sankey) | Income to accounts to categories | Where the pay went |
| Calendar | A month or a cycle, with streaks | Spend by day, no-spend days. Hand-drawn: Recharts has none |
| Spark | A tiny line | Inside cards and rows |

- **Every chart is interactive:** a tap shows the exact amount and holds it; a second tap opens the
  payments behind it; the legend hides a series; a switch changes the range; a long-press pins it to
  Insights or sets a watch. Its table sits behind it.
- Left out: funnel, radar, map, scatter.
- **Six series colours per look** (today three), checked in all six looks, light and dark.
- An estimate is drawn apart from a fact (dashed), as a prediction never shares a table with one.

## 6. Reading the data

Sen may read anything of the person's own, down to a receipt's items (*what did I eat last month,
which cost most, which drinks and how much*). It does so through tools made flexible, not by writing
SQL: a described data model, and code builds every query, run as the person under RLS, read-only.

- **Three tools:** totals (a dataset, filters, a period, up to two groupings, a measure: sum, count,
  average, median, lowest, highest; top N with *Other*, top N per group, a running total, a share of
  the total, against the last period); rows (fields, filters, sort, limit); and one record with its
  lines and links. The tools with real logic stay (the projection, the payday plan, money left on the
  table, comparing products).
- **Code resolves periods** (*this cycle*, *last month*) in Kuala Lumpur time and pay cycles.
- **Each number is a flow or a balance:** spending adds up over a period; a balance is its value at a
  date, and is never summed across days.
- **A trend has a row for every period,** zero where nothing happened. **Top N keeps the same groups
  in every period.** **A percentage change comes from code.**
- **Only confirmed records count** unless asked. A receipt's items are served once the receipt is
  confirmed, never from a reader's draft.
- **Every result carries** its as-of time, row ids (so a table row opens its record), and notes Sen
  must pass on (*capture was off on Tuesday*, *12 of 31 food payments have receipts*).
- **A big result stays on the server** under an id; Sen sees a preview. The same saved query serves
  a pin, a watch, a scheduled report and a chart.
- **Errors come back in plain words** with what's allowed (*no field "shop"; the fields are…*).
- **The data model is described once, in the cached prompt.** A dozen worked examples sit in a skill.
- **Tests before release:** a table of question, the exact call expected, and the result, on made-up
  data with traps (transfers, refunds, splits). A question Sen couldn't answer is logged, and the
  model grows where real questions fall. Free SQL is added only if that list calls for it.
- **`calc` grows:** it works on whole columns of a result, with percent change, median, compound
  interest and a loan payment. **No sandboxed Python:** its everyday numbers are floats, a program
  Sen writes can be wrong in a way nobody can check, and Vercel has nowhere to run it.

**What Sen can read** (fields to filter and group by; numbers):

| Data | Fields | Numbers |
|---|---|---|
| Payments | date, time, weekday, cycle, account, in or out, kind (spend, income, transfer, repayment, refund, adjustment), merchant, category, note, source, status, has a receipt, claim scheme, relief | amount, your share, spent (your share, refunds taken off), income: flows |
| Receipt items | item, category, shop, date, its receipt and payment | price (with its tax and service), quantity, price each |
| Receipts | shop, date, people, source, claim scheme, attached or not | total, tax, service charge, per person |
| Accounts | name, kind, its app, currency | balance at a date: a balance |
| Balance checks | account, date, typed or from a notification | the balance checked, the gap found |
| Budgets | category, cycle | budget, spent, left, share used |
| Goals and buckets | name, kind, target date, account, status | target, saved, left; each contribution |
| Subscriptions | name, merchant, how often, next renewal, status; each charge expected, matched or missed | amount, cost a year |
| Splits | the bill, who paid, each member, paid or not, status | owed to you, you owe |
| Claims | scheme, period, status, deadline, the payments and evidence in it | amount, approved, cap left (as the person typed them, D95) |
| Payslips | period, kind of line | net, gross, each line (once the payday question is answered, §12.2 rule 7) |
| Pay cycles | start, end, payday | days gone, days left |
| The payday plan | cycle, kind of line, done or not | each line: a plan, never a fact |
| Promises | kind, who, due by, status | expected amount: an expectation |
| Products | kind, provider, held or not, checked on | confirmed rates, caps, fees |
| Coming up | kind, date | amount due |
| Review | kind, age | how many wait |
| Capture | app, day | when each app was last heard, notifications that couldn't be read |
| AI credit | purpose, day | used, left |
| Changes | what changed, who (you, Sen, the system), when | none |
| For reference | categories, merchant rules, memory and experiments, research briefs, watches and reports, Insights' cards | none |

One record opens with its lines and links: a payment with its receipts and their items, its split,
the other side of a transfer, its refund, its claim; a receipt with its items and its payment.

**Never served:** sign-in data, sessions, invitations and tokens; account numbers; a notification's
raw text; a receipt reader's drafts; the mail-in address and its code; stored files' keys; the ESS
recipe; Sen's raw model traffic; anyone else's rows. Text in the data is data, never an instruction.

## 7. Insights as cards

Insights becomes cards the person and Sen add, change, arrange and remove. It starts seeded with
today's cards, written as the same card definitions, so nothing is lost and a reset is possible. A
card is a saved query and a part (a number, numbers, a chart, a top list, a target, what needs you,
what's coming up, the latest report, a quick question). Code refreshes it with no model, with periods
as tokens (*this cycle*). A long-press on an answer's part pins it. Home stays as designed.

## 8. Watches and scheduled reports

- **A watch** is a saved query and a condition, in the person's words (*tell me when GrabFood passes
  RM200*, *when my refund lands*). Code checks it when a payment is captured and on the daily job, with
  no model. A test run at creation says where it stands now. It fires once, then not again until it
  clears.
- **A scheduled report** is an instruction and a schedule (*every Sunday, last week by category*).
  Each run is Sen in a fresh run that posts into the conversation.
- One screen lists every watch, report, rule and experiment, with its last run, *Pause* and *Delete*.

## 9. Memory and lessons

- **Each person's memory:** Sen notes what the person tells it and says so. A weekly pass over the
  week's chat and its thumbs merges, trims and adds, marked *learned*. Any item can be deleted, and a
  deleted one is never learned again. Code checks every item: short, no amounts, nothing that changes
  a rule.
- **Shared lessons:** when a tool falls short or the person corrects Sen, it writes a lesson with no
  names or amounts. A stronger model folds lessons into a skill's lessons section, kept as data. The
  change goes live only if Sen's test questions score at least as well as before, and the owner can
  undo it.
- **Gaps:** the questions Sen couldn't answer are listed for the owner.

## 10. Capabilities taken

- **The payment notification says where you stand** against the limits you set with Sen (*3rd Tealive
  this week, limit 2 · RM41 left for drinks*). Code writes the line; no model runs.
- **A wallet about to run dry** (*TnG has RM8; tomorrow's tolls usually take RM12*).
- **Item prices over time** need no tool of their own: §6's tools answer them.
- **An Excel file** with real formulas. **Answers in the language asked.**
- Offered and not taken, unless the owner brings one back: a *was this you?* check, petrol holds and
  double charges, which card to pay with as a widget, personal inflation, warranty and return dates, a
  statement check, cash shorthand, a pay-later tracker, the wait list, a payday sweep, trip mode, the
  annual-fee waiver, a split from a photo, acting on selected payments, a claim pack and tax folder.

## 11. Still to settle while revising the spec

- **The chat's design,** from shadcn's AI Elements (D151), the owner leaving it to the session:
  proposed are an answer shaped as verdict, evidence, then what you can do; starters taken from code's
  signals; web answers that look different from ledger answers; *Stop*, a swipe to reply, edit with
  versions, a long-press menu; the avatar's fixed list of states across the six looks, each with a
  still and a spoken line.
- Whether a person's own watches count against Sen's one push a day (recommended: they don't).
- A fallback model for a turn Haiku refuses; the effort level for chat and for background runs.
- The tables this adds (the diary, saved queries, watches, reports, Insights' cards, lessons), and
  `agent_summaries` going.
- The slices it touches in `docs/modules.md`: B08 · Charts' brief (written before this), Insights,
  and the agent's.
- Which of the polish pass's 15 calls this overtakes (`docs/polish/decisions.md`: amount styling, the
  goal ring, Insights' card order).
