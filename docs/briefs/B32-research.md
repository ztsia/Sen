# B32 · Research

**Stage 7 · Sen** · after: B31 · next: B33

## Goal

Sen can research the web: savings rates, card terms, promos. It does this without ever putting the
owner's figures in a search. Findings come back as drafts with their source and date, shown as
Google's terms require. Only figures the owner confirms reach code.

## Read first

- `spec_v2.md`:
  - §12.1: *Research and optimise*
  - §12.2 rule 6, all of it
  - §12.3: `research`, `get_products` and `compare_products` (its inputs)
  - §12.5: the `researcher` subagent, and the note on Vertex search grounding
  - §15: `products` and `research_briefs`
  - §17: *Links leave the app*
  - §21: Q24
- Decisions: D39, D55 (grounding keeps queries up to 3 days), D94 (sources).
- `docs/screens.md`: `sen` (research drafts) and `agent/research`.
- `docs/flows.md`: `research`.

## Builds

### Asking
- **`research(question)`:** code first checks the question contains no amounts and none of the
  owner's figures, and refuses it otherwise.
- **The `researcher` subagent** runs separately, with search grounding only (Vertex can't combine
  search with function tools in one request). Its tier comes from `ai/models.ts`.

### Findings
- **Each finding is `{text, figure_text?, source: {url, title, site}, checked_on}`.**
- **Sources:** each redirect is followed once, and only the final `https:` page address is stored,
  never an internal address.
- **In the chat:**
  - the grounded text is shown **unedited**, with a numbered marker by each figure
  - below it, the numbered sources: title, site, *checked 8 Oct 2026*, and an external-link icon
  - Sen's own comment is a separate bubble
  - search suggestions sit at the foot, if Q24's answer requires them
- **Sen writes no URLs:** code strips any that aren't this run's sources. Every source opens in the
  default browser.
- **`research_briefs`** expire after 2 years, removed by the morning job.

### Confirming
- **The owner confirms the figures they trust into `products`:** kind `savings`, `card` or `wallet`,
  terms as integers (sen and basis points), the source and the date.
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
   - a question carrying an amount or the owner's figure is refused
   - a planted URL in Sen's text is stripped
   - sources store their final address only
   - unconfirmed findings never reach `products`
2. A researched question shows dated, numbered sources that open in the browser.
3. Q24 is answered.

## On your phone

- [ ] Ask Sen where to keep your savings. Open a source; confirm one rate.
