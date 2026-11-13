# B32 · Research

**Stage 7 · Sen** · after: B31 · next: B33

## Goal

Sen can research the web on any topic: savings rates, card terms, promos. One generic tool does it,
and a research skill is only a goal for it.
- **A figure from the ledger may go into a search** when the question needs it, but code rounds it
  and strips account numbers and names first. Nothing is refused.
- **Findings come back as drafts** with their source and date, shown as Google's terms require.
- **A long question runs in the background** and posts a brief.
- **Only figures the owner confirms** reach code.

## Read first

- `spec_v2.md`:
  - §12.1: *Research and optimise*
  - §12.2 rule 6, all of it
  - §12.3: `research(goal)`, the *From the web* part in *What Sen answers with*, and `compare_products`
    (its inputs)
  - §12.5: the `researcher` subagent, the note on Vertex search grounding, and *A research skill is a
    goal for `research`*
  - §12.6: the researcher's job, which changes only within Google
  - §15: `products` and `research_briefs`
  - §17: *Links leave the app*
  - §21: Q24
- Decisions: D39, D55 (grounding keeps queries up to 3 days, and its clarification as D152 amends
  it), D94 (sources), D152, D153.
- `docs/screens.md`: `sen` (findings from the web) and `agent/research`.
- `docs/flows.md`: `research`.
- `docs/ui/patterns.md`: §7, *Sen's chat*, and §4 (the card anatomy).
- B27 · Sen's chat's parts, which the from-the-web card joins. Draw it to the chat's approved design
  page (`docs/modules.md`, *Three design pages*); don't design as you build.

## Builds

### Asking
- **One generic tool, `research(goal)`,** runs the `researcher` on any topic. A research skill (B33's
  two, and any later) is a goal for it: a template for the question, what to pull out, and what code
  does with the result.
- **A ledger figure may go into a search** (*where should I keep RM23,000 of savings*):
  - code **rounds** any ledger figure first
  - code **strips account numbers and names**
  - **nothing is refused**
- **The `researcher` subagent** runs separately, with search grounding only (Vertex can't combine
  search with function tools in one request). It's its own job in admin, and moves only within
  Google. Its default is picked on its golden set, with a decision recorded.
- **A long question runs in the background** (a run of its own, queued as a one-off job like any
  continuation, B27's) and posts a brief into the conversation when it's done.

### Findings
- **Each finding is `{text, figure_text?, source: {url, title, site}, checked_on}`.**
- **Sources:** each redirect is followed once, and only the final `https:` page address is stored,
  never an internal address.
- **The *From the web* part,** whose card is drawn here:
  - the grounded text is shown **unedited**, with a numbered marker by each figure
  - below it, the numbered sources: title, site, *checked 8 Oct 2026*, and an external-link icon
  - *Confirm* on a figure
  - Sen's own comment is a separate bubble
  - search suggestions sit at the foot, if Q24's answer requires them
  - it looks different from an answer from the ledger, and in all six looks
- **Sen writes no URLs:** code strips any that aren't this run's sources. Every source opens in the
  default browser through `openInBrowser(url)`.
- **`research_briefs`** hold the question, the findings and their sources, as one of Sen's own
  things (a *Saved* line with *Open* and *Undo*). They expire after 2 years, removed by the morning
  job.

### Confirming
- **The owner confirms the figures they trust into `products`,** by their own tap on the card (never
  Sen's): kind `savings`, `card` or `wallet`, terms as integers (sen and basis points), the source
  and the date.
- **Only confirmed figures** reach `compare_products` (B33).
- **`agent/research`** lists briefs and confirmed products.

### Q24
- **Settle Google's terms:**
  - under-18 users
  - whether invite-only sharing is consumer use
  - whether search suggestions must show

  Record the answer in the spec.

## Done when

1. Tests:
   - a ledger figure in a search is rounded, and no search carries an exact figure, an account number
     or a name
   - nothing is refused for carrying a figure
   - a planted URL in Sen's text is stripped
   - sources store their final address only
   - unconfirmed findings never reach `products`
   - a long question runs in the background and posts a brief
2. A researched question shows dated, numbered sources that open in the browser.
3. Q24 is answered.

## On your phone

- [ ] Ask Sen where to keep your savings. Open a source; confirm one rate.
- [ ] Ask a long question; leave the chat; read the brief when it posts.
