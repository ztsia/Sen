# B03 · Skeleton: the five tabs

**Stage 1 · Frame** · after: B02 · next: B04

## Goal

Every screen under the five tabs exists, with made-up data, in all six looks, and its journeys can
be clicked through. This is the first half of the walking skeleton, which is Sen's mockup (D84).

It also builds **the data layer every later slice plugs into**, so the skeleton is never thrown
away. Later slices replace fake data with real data behind the same hooks.

## Read first

- `docs/screens.md`: *The map*, *Rules every screen follows*, *Home*, *Review*, *Scan*, *Insights*
  and *More*, which covers `more`, `payments`, `txn` and `receipt`.
- `docs/flows.md`, the journeys these screens carry:
  - capture: `pay-known`, `pay-new`, `hawker`, `money-in`, `own-transfer`, `refund`
  - receipts: `scan-after`, `receipt-first`
  - fixing: `manual`, `new-wording`, `fix`
  - the cycle: `daily`, `insights`, `budget`, `goal`, `subscription`
- `docs/ui/patterns.md`, all of it.
- `spec_v2.md`:
  - §6.3, §6.4 (confirm screen), §6.6 (the *Review* table), §6.7 and §6.8
  - §7, spending against cash flow
  - §9.2 and §9.3
  - §15, for the shapes the data layer returns
  - §16, for the routes the fake stands in for
- Decisions: D59, D62, D66, D67, D68, D69, D72, D73, D83, D89, D90, D92.
- Skills: `uiux` (read its component index first) and `dataviz`.

## Builds

### The data layer
- **Reads** are query hooks per screen, such as `useHome(cycle)`, `useReview()` and
  `usePayments(filters)`, on TanStack Query.
- **Writes** go through one write interface. It has three backends behind the same calls:
  - `fake`, now, in memory
  - `api`, the browser, from B05 and B07
  - `outbox`, the shell, from B07
- **The return types follow `spec_v2.md` §15's columns**, with money always integer sen. Keep them
  in one shared module of types, with zod schemas, that B05's API will reuse.
- **Optimistic writes with *Undo*** work in the fake, so the skeleton behaves like the app.

### The made-up scenario
- **Wei Ming's month**, with made-up names and amounts (D11):
  - the owner's accounts, in the style of `notifications.md`
  - about 60 payments across a cycle, with salary, transfers, a refund, receipts, a hawker and
    Grab orders
  - splits in each state, budgets, goals, subscriptions, *Review* items of every kind, and a
    *Waiting on others* list
- **Edge states:**
  - before the first salary
  - the first cycle, with no last cycle
  - counting by calendar month (D79)
  - offline with rows not synced
  - empty
  - the cap reached
- The scenario lives in one place. B05 turns it into the preview database's seed.

### The screens, with made-up data
- **Home:**
  - `home` with every part in `screens.md`: health warnings, the *Payday* card, the large figure
    drawn by each look's `heroFigure`, the strip, pace, Sen's note and the quiet row
  - the `cycle` sheet
- **Review:**
  - `review`, with every *Needs you* row kind in `screens.md`'s table
  - Sen's suggestions bar
  - *Waiting on others*, *Missing a payment?* and *Skipped notifications*
  - `skipped`
- **Scan:**
  - `scan`: in a browser, the file picker and a stand-in for `crop`, which B15 makes real
  - `scan-more`
  - `reading`
  - `confirm`: one screen, the by-hand mode, and *Split* → *Who paid?* → *Share a link* or *Just my
    part*, reaching `split` as a stand-in, which B04 builds
  - `manual`: the number pad, typed as text into sen
- **Insights:**
  - `insights` with every card in §9.3, with real charts on the made-up numbers, takeaways
    written by code from the fake data, and *Ask Sen about this*
  - `budgets`, `subscriptions`, `goals`, `goal` and `insights/year`
- **More:**
  - `more`
  - `payments`: search, filters, day headers, every mark, and virtualised
  - `txn`: every row in `screens.md`
  - `receipt`
- **Each screen's varying states** (empty, loading, error, offline, without capture) can be reached
  from the dev panel's state switcher.
- **Sen's button** opens a placeholder sheet until B04.

## Leaves for later

- `split`, `sen`, `accounts`, `claims`, Settings, `sign-in`, `first-run`, `payday`, `new-look` and
  the native stand-ins: B04.

## Done when

1. Each journey listed above clicks through in Playwright at 390×844, in all six looks, light and
   dark, with a screenshot per step.
2. An axe scan passes on every screen, in every look.
3. Every *Varies* state in `screens.md` for these screens can be reached and looks right.
4. No screen invents a pattern: a `uiux` checklist pass is in the PR.
5. In production, these screens still show *Not built yet*.

## On your phone

- [ ] Open the preview, in a browser or the debug shell, and walk the five tabs in a few looks.

## Notes

- Spend the effort on the parts that won't change: data shapes, building blocks and layout. Fake
  data can stay simple.
- Charts on made-up numbers still follow `dataviz` exactly. B20 only swaps their data.
