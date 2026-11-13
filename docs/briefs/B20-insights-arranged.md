# B20 · Insights, arranged

**Stage 5 · Insights and plans** · after: B20 · Insights: its data and cards · next: B21

## Goal

Insights is the person's own.
- Cards can be moved, made *Wide* or *Small*, and removed, in place, and every move has a tap path.
- Tabs can be added, renamed, moved and removed.
- *Reset* brings the first four tabs and their cards back.

## Read first

- `spec_v2.md`:
  - §9.3: *Insights*, especially the tabs, *Pinning* and *A card opened*
  - §9.8: *Charts* (what a card's view is drawn with)
  - §15: `insight_tabs`, `insight_cards` and `saved_queries`
  - §16: `POST /queries/:id/run`
- Decisions: D62, D73, D152, D153, D154.
- `docs/screens.md`: `insights` and `insights/card`.
- `docs/ui/patterns.md`: §4 *Cards*, §8 (motion, reduced motion), §10 (the long-press line).
- `docs/flows.md`: the Insights journey.
- `docs/modules.md`, *Three design pages* (D154): Insights' cards and tabs are drawn and approved
  before this slice starts. Build to that page; don't design as you build.

## Builds

### Arranging a card, in place
- **A long-press starts arranging.** Each card shows a handle, *Wide* or *Small*, and *Remove*, with
  *Done* in thumb reach. The cards sway slowly; with reduced motion nothing sways.
- **Every move has a tap path.** No control is drag-only: the approved page draws each path, and a test
  does every move without a drag.
- **A hole is filled** by the next small card, so a tab never shows an empty half row.
- **Remove acts at once** and offers *Undo*, as everything undoable does.

### Tabs
- **The tab row gains *Add tab*.** A tab's own menu has *Rename*, *Move* and *Remove*. A card moves
  between tabs too.
- **Limits:** at most eight tabs, and twelve cards in a tab. Reaching one is refused in words, and
  the control that would add past it says why.
- **Removing a tab** removes its cards with it, at once, with *Undo* (`docs/screens.md`).

### *Reset*
- **In the screen's menu, behind a dialog** (it can't be undone). It brings back the first four tabs
  and their cards, from `seed_key`, and removes the rest.

### The seam: a card added by definition
- **One function adds a card from its definition** (its kind, saved query, title, size and options)
  to a tab, through the app's own command with zod, so a retried add is a no-op (it has an id made on
  the phone). `created_by` says `seed`, `user` or `agent`.
- **It's the seam B27's *Pin to Insights* and B28's `set_card` use.** Nothing here calls them. A card
  added this way goes to the tab you're on, with a *New* mark until it's opened and a toast with
  *Undo*.
- **A card added this way says it's empty** when it has nothing to show; a seeded one is hidden
  (§9.3).

## Done when

1. Tests, on two people under RLS:
   - every move (*Wide*, *Small*, move, *Remove*) works by taps alone
   - the limits hold at eight tabs and twelve cards
   - *Reset* restores the seeded four tabs and their cards exactly
   - adding a card by definition twice makes one card
2. `insights` arranging and tab states in all six looks, light and dark, with reduced motion cutting.
3. **Owner's check:** the owner rearranges Insights on the phone, and *Reset* brings the first four
   back.

## On your phone

- [ ] Long-press a card. Make it *Wide*, move it, remove it, then undo.
- [ ] Add a tab, rename it, move a card into it, then remove the tab.
- [ ] Reach twelve cards in a tab: is the refusal clear?
- [ ] Open the screen's menu, tap *Reset*, and confirm the first four tabs are back.

## Needs from you first

- The approved design page for Insights' cards and tabs.
