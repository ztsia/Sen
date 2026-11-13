# Sen's agent, chat and Insights: the re-spec (D152)

Decided with the owner on 12 and 13 Nov (D152, D153). **Not yet folded into the spec.** This file holds the detail until
`spec_v2.md` (§9.3, §12, §15, §16), `docs/screens.md`, `docs/ui/patterns.md` (§4) and
`docs/modules.md` carry it; then it's deleted. The agent isn't built yet, so nothing here changes code
that exists. §14 lists what the spec revision still has to settle.

## 1. Models

- **Sen's chat starts on Claude Haiku**, through Anthropic's API. D127's check of Anthropic's data
  terms still comes first. **No model picker for members**; the admin chooses every job's model (§1.1).
- What Haiku changes in §12.5:
  - **Every tool is declared on every call; a skill adds only instructions.** Claude caches tools,
    then the system prompt, then messages, so switching tools on per skill (`activeTools`) would throw
    the cache away each time. Haiku caches from 512 tokens, so Sen's prompt is cached.
  - **Each call stays far under 100,000 tokens:** above that Haiku's price is five times higher (§3).
  - **The rules say they hold however the person asks,** and a test checks it: Haiku can drop a rule
    under pressure.
- The researcher stays on Gemini with Google Search (§2). Readers and other tiers stay as §12.6 says.
- These are the defaults Sen ships with. The context targets in §3 hold whichever model is chosen.

### 1.1 Models are chosen in admin (D153)

The owner changes a model, its effort or its provider from the admin account, with no release and no
change to Vercel's environment. This replaces *code names models only in `ai/models.ts`* (D94, D107,
D120): that file becomes the defaults, the list of jobs and the list of providers.

- **An admin *Models* screen lists each job:** Sen's chat, the researcher, each reader (receipts,
  templates, email, chat files), the diary writer, the review sorter, background runs, the pass that
  folds lessons. Each has a provider, a model, an effort, a fallback model, and the model's price per
  million tokens (input, cached input, output), which AI credit charges by (D98). A known model's price
  is filled in; a new one's is typed.
- **It takes effect on the next call.** The settings are one table for the whole app, not per person,
  written only through the admin's functions and read by the API at each call.
- **The model comes from the provider's own list, or is typed,** so a new generation can be chosen the
  day it's out. **Effort is one scale** that code maps to each provider's own setting, offering only
  the levels that model has.
- **Providers are a fixed list in code:** Anthropic, Google and OpenAI. Each is offered only once its
  data terms pass D34's bar and its key is in Vercel's environment, set once. A fourth provider is a
  code change on purpose: an address typed in admin could send every member's money data to any
  server, which the admin must never be able to do (D52).
- ***Test* before the switch:** it runs that job's golden set (D120) on the candidate and shows its
  score, cost and speed beside the current model's. The owner may switch whatever the score. One tap
  reverts, and every change is logged with who and when.
- **The researcher changes only within Google:** search with sources is a Vertex feature.
- **A conversation survives a switch:** messages are stored in no provider's own format, and the
  switch costs one uncached call.

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

## 7. What Sen can change

Reads are open-ended, so they get flexible tools. Changes are a short, known list, each with its own
rules, so **each thing gets its own tool**, with the action inside it (add, change, remove) and that
thing's own typed fields. There is no general write tool.

- **A write tool's fields are the app's own command** (`packages/core/src/commands.ts`): Sen can
  propose exactly what a screen can do and nothing more. *Apply* sends that command through the same
  write interface, logged as Sen's, and its *Undo* is the command's own.
- **Two kinds of change** (§12.2 rule 2 stands):

| Kind | What | How it happens |
|---|---|---|
| Sen's own things | Memory; a watch; a scheduled report; an Insights card; a calendar event (no amounts); a research brief; a lesson | At once, with a *Saved* line and *Undo* |
| Your money records, and how they're counted | A budget; a goal or bucket; a merchant rule; a subscription; a limit to hold you to (an experiment); a promise to watch for; the payday plan; a claim scheme from your words; an answer to a *Review* item; a payment's category, note, kind, share or claim tag, for one payment or many | A proposal: nothing changes until *Apply*; *Change…* opens the real form filled in |

- **Never by Sen, even as a proposal:** a payment's amount, date or account; adding or deleting a
  payment, a receipt or an account (a button opens the screen, and the person types the amount); a
  balance check; the settings for sign-in, members or which apps are read; confirming a figure from
  the web (the person's own tap on the web card); moving money or signing up for anything.
- **A proposal shows its effect before the tap,** worked out by code (*applies to 14 past payments*,
  *Drinks would be at 80% now*).
- **An amount in a proposal says where it came from:** your words, a tool's result, or Sen's
  suggestion. It can be changed before applying.
- **One card per change, with one line of why.** Several payments changed the same way are one card
  that lists them. Every proposal has a dedupe key, so a retried turn makes no second card.
- **Sen never says a change happened.** The card says it, once code has done it.
- New against the spec: watches, reports and cards among Sen's own things; a payment's fields changed
  by proposal outside *Review*, and many at once; the effect shown before the tap; *Change…*.

## 8. Insights as cards

Insights becomes cards the person and Sen add, change, arrange and remove. It starts seeded with
today's cards, written as the same card definitions, so nothing is lost and a reset is possible.
**The tabs stay, and are editable too** (13 Nov): it starts with today's four (*This cycle*, *Food*,
*Commitments*, *Over time*); the person and Sen add, rename, reorder and remove a tab and move a card
between tabs; a reset brings back the four with their cards. A
card is a saved query and a part (a number, numbers, a chart, a top list, a target, what needs you,
what's coming up, the latest report, a quick question). Code refreshes it with no model, with periods
as tokens (*this cycle*). A long-press on an answer's part pins it. Home stays as designed.

## 9. Watches and scheduled reports

- **A watch** is a saved query and a condition, in the person's words (*tell me when GrabFood passes
  RM200*, *when my refund lands*). Code checks it when a payment is captured and on the daily job, with
  no model. A test run at creation says where it stands now. It fires once, then not again until it
  clears.
- **A scheduled report** is an instruction and a schedule (*every Sunday, last week by category*).
  Each run is Sen in a fresh run that posts into the conversation.
- One screen lists every watch, report, rule and experiment, with its last run, *Pause* and *Delete*.

## 10. Memory and lessons

- **Each person's memory:** Sen notes what the person tells it and says so. A weekly pass over the
  week's chat and its thumbs merges, trims and adds, marked *learned*. Any item can be deleted, and a
  deleted one is never learned again. Code checks every item: short, no amounts, nothing that changes
  a rule.
- **Shared lessons:** when a tool falls short or the person corrects Sen, it writes a lesson with no
  names or amounts. A stronger model folds lessons into a skill's lessons section, kept as data. The
  change goes live only if Sen's test questions score at least as well as before, and the owner can
  undo it.
- **Gaps:** the questions Sen couldn't answer are listed for the owner.

## 11. Capabilities taken

- **The payment notification says where you stand** against the limits you set with Sen (*3rd Tealive
  this week, limit 2 · RM41 left for drinks*). Code writes the line; no model runs.
- **A wallet about to run dry** (*TnG has RM8; tomorrow's tolls usually take RM12*).
- **Item prices over time** need no tool of their own: §6's tools answer them.
- **An Excel file** with real formulas. **Answers in the language asked.**
- Offered and not taken, unless the owner brings one back: a *was this you?* check, petrol holds and
  double charges, which card to pay with as a widget, personal inflation, warranty and return dates, a
  statement check, cash shorthand, a pay-later tracker, the wait list, a payday sweep, trip mode, the
  annual-fee waiver, a split from a photo, acting on selected payments, a claim pack and tax folder.

## 12. The chat's design

From shadcn's AI Elements (D151), restyled to `patterns.md`. The owner's calls on 13 Nov are the
avatar and the long-press menu; the rest is the session's, which the owner left to it:

- **Sen's avatar travels with the answer.** One avatar goes to the head of the new answer, leads its
  steps, rides down with the text, and rests on a proposal while it waits. Earlier answers keep none.
  When the person has scrolled away, the jump-to-latest button carries it in its current state. With
  reduced motion it cuts instead of gliding.
- **It uses the eight states every look already draws** (D76: resting, a new note, listening, working,
  with helpers, answering, paused, done). Nothing is redrawn. The spec revision maps each chat event
  to one of them and gives each a spoken line.
- **A long-press on a message opens a floating menu beside it,** the message lifted and the rest
  dimmed, never a bottom sheet: *Copy*, *Select text*, *Reply*, *Pin to Insights*, thumbs, *Try again*.
  It's the chat's own menu, so §8's rule against the browser's long-press menus stands. Every item is
  also reachable without a long-press (TalkBack's actions). Answers carry no row of buttons beneath.
- **The shape of a turn:** the person's turns are bubbles on the right; Sen's are full width with no
  bubble, under a head row. The steps line is open while Sen works and folds into one line that is the
  answer's source (§4). Each part sits in its own card.
- **The proposal is the one raised, outlined card in the chat:** what will change, field by field,
  then *Dismiss*, *Change…* and *Apply* in thumb reach, with every state drawn (waiting, applying,
  applied, failed, expired) before it folds to one line (§4, §7).
- **Starters** are rows in the empty chat, taken from code's signals. **Follow-ups** are chips under
  the answer they belong to, wrapping onto a second line, never scrolling sideways.
- **The composer** is one row: a plus for a photo, the camera or a PDF (D109), the field, and *Send*,
  which becomes *Stop* while Sen answers. A swipe on a message replies to it, shown as a chip above
  the field. An edited question makes a new version and keeps the old one.
- **A figure Sen couldn't trace** has a dotted underline, and a tap says so; a tap on a traced figure
  shows its source (§4).
- **An answer from the web looks different** from one from the ledger (§2, §4).

## 13. Cards, on Insights and in an answer

The session's design (13 Nov), for Insights' cards (§8) and the same parts in the chat:

- **One anatomy:** a title row, the figure, its change, the view (a trend, bars, rows or a meter),
  then *as of*, always last. Up and down are coloured only where the direction means good or bad.
- **Two sizes:** small, two to a row, and wide. A hole left by a move is filled by the next small card.
- **Arranged in place:** a long-press starts it; each card shows a handle, *Wide* and *Remove*, with
  *Done* in thumb reach. Every move also has a tap path. (In the chat a long-press opens the
  message's menu instead, which holds *Pin to Insights*.)
- **States:** a skeleton shaped like the card on first load; on a refresh the old values stay with
  their time; a failed refresh keeps the last good values and marks *as of*; an empty card says so in
  its own words; a card whose data is gone goes grey with no figures and offers *Ask Sen*.
- **Pinning** from an answer adds the card with a *New* mark and a toast with *Undo* (§5, §8).
- **A card opened** shows its view large, its source and time, its watch when it has one, and
  *Ask Sen about this*.
- Amounts stay exact, to the sen (patterns §3); no shortened figures.

## 14. Still to settle while revising the spec

- Whether a person's own watches count against Sen's one push a day (recommended: they don't).
- Each job's default model, effort and fallback (§1.1), picked on its golden set; where *Test* runs
  (recommended: the server's job runner, in batches, on the anonymised golden set shipped with the
  API); whether OpenAI's data terms pass D34's bar.
- The tables this adds (the diary, saved queries, watches, reports, Insights' cards and tabs, lessons,
  the model settings and their log), and `agent_summaries` going.
- How many cards a tab holds, and how many tabs.
- The slices it touches in `docs/modules.md`: B08 · Charts' brief (written before this), Insights,
  the agent's, and the admin's *Models* screen.
- Which of the polish pass's 15 calls this overtakes (`docs/polish/decisions.md`: amount styling, the
  goal ring, Insights' card order).
