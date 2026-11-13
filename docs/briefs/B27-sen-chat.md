# B27 · Sen's chat

**Stage 7 · Sen** · after: B27 · Sen's harness and reading · next: B27 · What Sen carries

## Goal

Sen's conversation looks and acts as it was drawn.
- One sheet, opened from any tab, with each part of an answer in its own card and a figure that shows
  where it came from.
- Sen's avatar travels with the answer, and a long-press on a message opens a floating menu.
- *Ask Sen about this*, starters that fit the screen, and the island's *Sen working*.

## Read first

- `spec_v2.md`:
  - §12.3: *What Sen answers with* (the parts)
  - §12.2: rule 1 (a figure traced, or *not checked*)
  - §9.3: *Pinning*
  - §15: `agent_messages` (`parts`, `replaces_id`)
  - §16: `POST /agent/chat`, `GET /agent/results/:id`
- Decisions: D68, D76, D108, D135, D151, D152, D153, D154.
- `docs/screens.md`: `sen`, including the avatar's state table.
- `docs/ui/patterns.md`: §4 *Cards*, §7 *Sheets and dialogs* (the floating menu) and *Sen's chat*, §8
  (motion, reduced motion).
- `docs/flows.md`: `ask`.
- `docs/modules.md`, *Three design pages* (D154): Sen's chat is drawn and approved before this slice
  starts. Build to that page; don't design as you build.
- `packages/looks/src/types.ts`: `AVATAR_STATES`.

## Builds

### The sheet, from shadcn's AI Elements
- **Each AI Element is customised in place,** in `apps/web/src/components/ui/` or `src/blocks/`, with
  a `// Sen:` note on its first line (`CLAUDE.md`, *Conventions*), restyled to `patterns.md`.
- **A turn's shape:** yours is a bubble on the right; Sen's is full width with no bubble, under a
  head row. The header says *Looking at: …*, with ⋯ and ×; the ⋯ menu lists each of its screens once
  that screen is real (`agent/usage` now, the rest with their slices).
- **The steps line** is open while Sen works and folds into one line that is the answer's source.
- **The parts B27 · Sen's harness and reading produces,** each in its own card in §4's anatomy: text,
  chart, table, figures, question (options, the recommended one first), button, follow-ups, saved and
  notice. The proposal, file, playground, checklist, coming up, compare and from-the-web parts get
  their cards in their own slices.
- **A figure's tap** shows its source and opens the records behind it. One Sen couldn't trace has a
  dotted underline in the warning colour, and a tap says *not checked*.
- **Chips wrap onto a second line, never scroll sideways:** a sideways swipe belongs to back and to
  reply.
- **The web app must not value-import `@sen/core/views`, `sync` or `commands`:** zod trips the CSP.
  Import types only.

### The composer
- **One row:** a plus for a photo, the camera or a PDF, the field, and *Send*, which becomes *Stop*
  while Sen answers. *Stop* keeps what was shown.
- **Reply:** a swipe on a message makes a chip above the field. **Versions:** an edited question
  makes a new version and keeps the old, with ‹ 1/2 › to move between them.
- **Starters** are rows in the empty chat, from code's signals and the screen Sen was opened from
  (D135), with no model call. A jump-to-latest button carries the avatar's state.

### The avatar
- **It uses the eight states every look already draws** (`AVATAR_STATES`), and nothing is redrawn:
  resting, a new note, listening, working, with helpers, answering, paused, done.
- **It travels with the answer:** one avatar goes to the head of the new answer, leads its steps,
  rides down with the text, and rests on what waits. Earlier answers keep none. Only one ever moves.
- **Each state has the line TalkBack speaks** (`docs/screens.md`'s table). Reduced motion cuts, and
  the avatar holds one still frame per state.

### A message's floating menu
- **A long-press lifts the message, dims the rest, and opens the menu beside it,** above or below as
  room allows. A tap outside or back closes it. It is never a bottom sheet, and TalkBack gets its
  items as actions.
- **Its items** are those in `docs/screens.md`, including *Pin to Insights* on a chart, table or
  figures. Pinning uses B20's card-by-definition seam: the card arrives with a *New* mark and *Undo*.
  *Delete* calls the route B27 · What Sen carries builds. Thumbs up and down set
  `agent_messages.thumb`, which the weekly tidy reads later (§12.9).

### Opening Sen
- ***Ask Sen about this*** on a card, `txn`, `split` and `budgets` opens Sen with the question ready.
  Opening a screen never calls a model.
- **The island's *Sen working*:** Sen's state, then *Answer ready*.
- **States:** streaming, offline (*Sen needs a connection*, composer off), paused, and a question
  sent while Sen works, marked *Waiting*.

## Done when

1. Tests: every built part draws from a stored message after a reload; an untraced figure shows
   *not checked*; the menu's items are offered to TalkBack as actions; chips never overflow at 360 px;
   the web app's bundle has no value import of `@sen/core/views`, `sync` or `commands`.
2. `sen` in all six looks, light and dark, every built part and state, matching the approved page.
   The avatar's eight states show, and reduced motion cuts.
3. **Owner's check:** the owner asks five real questions on the phone, and every part reads and acts
   as drawn, in all six looks.

## On your phone

- [ ] Ask Sen five things you want to know. Does the avatar go to each answer and rest after?
- [ ] Tap a figure, then a *not checked* one.
- [ ] Long-press a chart and pin it to Insights. Undo it.
- [ ] Type a question and edit it. Move between the two versions.
- [ ] Turn on *Remove animations*: does the avatar cut?

## Needs from you first

- The approved design page for Sen's chat.
