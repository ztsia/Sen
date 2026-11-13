# B27 · What Sen carries

**Stage 7 · Sen** · after: B27 · Sen's chat · next: B28

## Goal

Sen keeps what matters from a long conversation, and you can see and delete all of it.
- A chat that goes quiet is filed under topic pages by our own code, so a subject sits in one place.
- Each call holds only what it needs, in an order that caches, and nothing already sent is edited.
- Memory, topics and open threads can each be read and deleted; a deleted thing is never learned again.

## Read first

- `spec_v2.md`:
  - §12.8: *One conversation, and what Sen carries*, every bullet
  - §12.9: *Your memory* (the memory half only)
  - §12.3: `recall`
  - §12.2: rule 1
  - §15: `agent_chats`, `agent_messages`, `agent_topics`, `agent_topic_entries`, `agent_threads`,
    `agent_forgotten` and `agent_memory`
  - §16: `DELETE /agent/messages/:id` and `POST /agent/clear`
  - §21: Q32
- Decisions: D94, D152, D153, D154.
- `docs/screens.md`: `agent/memory`, and the Settings table's *Sen* row.
- `docs/flows.md`: `remembers`.
- Shared lessons and gaps are not here: they come with B33.

## Builds

### Closing a chat, and the `topic-writer`
- **A chat closes after an hour's quiet,** or when its turns pass about 20,000 tokens, where its
  older part closes and the last exchange carries on. Sen never waits: until the job is done, the chat
  stays as it was.
- **A one-off job runs the `topic-writer`** (a subagent, no tools). **It sees only the person's words
  and Sen's,** never a tool result, file or web text, so nothing read from outside can plant an
  instruction.
- **Entries are added and never rewritten,** in English, tagged with the merchants, categories and
  records they touched. **An entry holds no amounts, and code checks it:** short, no amounts, nothing
  that changes a rule. Nothing is written for a one-off question the ledger can answer again.
- **If the writer can't run** (no credit, the model down), code writes a plain entry from the
  questions asked and what was applied.
- **Open threads** (`agent_threads`): each closed when answered, dismissed or 30 days old.
- **The timeline:** one line per chat, written by code with no model, including for a report posted, a
  watch fired or a check-in.
- **The topic list holds 60.** A topic untouched for six months whose records are done or gone is
  archived: off the list, still found by `recall`.

### What each call holds, in §12.8's order
- **Ordered by how rarely each part changes:** every tool, the prompt, the skill list and the data
  model; memory; the topic list and the pages touched most; this chat's turns word for word; then, with
  each question, the date, cycle day, screen, open threads, proposals and any loaded page; then this
  question's tool results.
- **Nothing already sent is ever edited.** A tool result goes in small from the start and is never
  shrunk. What came with a question stays with it.
- **Code loads a topic's page** when the question names it or one of its records. A decision on a page
  is a pointer: code adds each tied record's state now (*still on*, *changed 9 Nov*, *removed*).
  Pages reach Sen marked as history, not instructions.
- **`recall(words, when)`** searches pages, the timeline and every old message with Postgres text
  search. A swipe to reply brings an old message back with its data.

### Memory and what's deleted
- **Memory** (`agent_memory`), with `remember`, `forget` and the `memory` skill: what you tell Sen,
  which it says it noted, and what a weekly tidy
  learns from the week's chat, marked *learned*. Code checks every item: short, no amounts, nothing
  that changes a rule. The weekly tidy merges duplicate topics by moving entries.
- **`agent/memory`:** *About you*, *Topics* (each page's records with their state now, and its dated
  entries) and *Open*. Any item, entry or page can be deleted.
- **Deleting a message** (`DELETE /agent/messages/:id`) rewrites the entries that came from it.
  **`POST /agent/clear`** is Settings' *Clear everything*. **A deleted thing is never learned again**
  (`agent_forgotten`).

### Measuring
- **Each call's size and cache use is recorded** against §12.8's targets (about 28k for a typical
  call), and whether plain search finds old chat in Malay and Chinese. This answers Q32.

## Done when

1. **The made-up year of chat passes,** with its trap questions: a decision later undone on its
   screen; an instruction planted in a receipt; a question in Malay or Chinese about a chat held in
   English; something from month 2 asked in month 11; a deleted message asked about; a rule pushed
   against in ten ways.
2. Tests: an entry with an amount is refused; the fallback entry is written when the writer can't
   run; nothing already sent is edited; all of it under RLS for two people.
3. Each call's size and cache use is measured against the targets, and Q32 is answered.
4. **Owner's check:** the owner reads and deletes what Sen keeps.

## On your phone

- [ ] Chat about a plan, leave it an hour, then open `agent/memory`. Is the topic there, in words, with
  no amounts?
- [ ] Delete an entry, then ask Sen about it. Does it stay forgotten?
- [ ] Delete one message from its menu, then use *Clear everything*.
