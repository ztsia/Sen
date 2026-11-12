# Polish plan: Review and capture

Screens: `review` (with `@empty` and `@error`), `skipped`, `manual`, `scan`, `scan-more`, `crop`,
`confirm` and `receipt`. I audited them from the captures in Minted light and dark, and in the other
five looks where the catalogue has them (`review`, `scan`). I held them against `docs/ui/patterns.md`,
`docs/screens.md`, `docs/workflow/uiux.md`, the phone checklist in the `uiux` skill, `qa/escapes.md` and
the eyes questions. Every one of these screens is still `skeleton` in `screens/registry.ts`, so it
shows in previews only. The real slices (B08, B10, B15, B16) build on them, so polish here carries
into the real screens.

Paths are under `apps/web/src/` unless they start at the repo root. Screenshots are the polish
captures (`<entry>--<look>-<mode>--p<n>.png`; p1 is the top of the screen at 390×844).

**What a person sees first, screen by screen, as built now:**
- `review`: Sen's *Apply all* bar, then *Needs you · 12*. That's right. Below it, three different
  card shapes mix in one group.
- `manual`: the amount. That's right, but *RM* floats far from the digits, and the 17 category cards
  push the account, the date and the more-details link below the fold.
- `scan`: a paragraph and a card of tips. The main action sits in the middle of the screen, with
  half a screen empty under it.
- `confirm`: the merchant's name and a placeholder photo tile. The total, which is the thing to
  check, is near the bottom of the first screen.
- `receipt`: a large receipt icon and the merchant. The total is in a fact grid further down.

## Findings

### 1. Money in Minted, every screen: amounts read "RM8 . 00" and "RM2 , 000 . 00"
- Seen: in Minted, the default look, every amount drawn by `Money` has a wide gap on each side of its
  dot and comma. Examples: *RM8 . 00 · Siti Aminah Bt Yusof*, *+RM2 , 000 . 00 into Ryt Bank*, *Phone
  bill claim · RM88 . 00*. In *Waiting on others*, *Items* and the totals, *RM48 . 80* reads like a
  typewriter (`review--minted-light--p1/p2/p3`, `confirm--minted-light--p1/p2`, `receipt--minted-light--p1`,
  the same in dark, and Home's *Spent RM3 , 873 . 53* behind `scan-more--minted-light--p1`). The typed
  amount in `manual` shows *0 . 00*. Instrument, Firefly, Line, Mercury and Copper all draw *RM8.00*
  correctly (`review--instrument-light--p1` and the others).
- Why it matters: the amount is the first thing a person checks on every Review question and every
  receipt. In the default look it looks like a rendering fault, so *Would I trust this with my money*
  fails on the figure itself. The likely cause: `.num` sets `font-variant-numeric: tabular-nums`, and
  Minted's UI font (Schibsted Grotesk) draws the dot and comma at a digit's width under `tnum`.
  Patterns §3 asks for tabular figures only *where amounts line up in a column*.
- Change (component, plus one utility):
  1. Add `.num-sep { font-variant-numeric: normal; }` beside `.num` in `styles/app.css`.
  2. In `Money`, split the formatted text on `/([.,])/` and wrap each `.` and `,` in
     `<span className="num-sep">`. The digits stay tabular, so columns still line up, since every
     separator then has the same proportional width. Keep the `<wbr />` after a comma, the `whole`
     behaviour and the `sr-only` spoken text as they are.
  3. In `MoneyInput`, remove `num` from the input's classes. An input can't wrap its separators, and
     digits entering from the right don't need fixed widths.
  4. Check the change in Minted against Instrument: in Payments the decimals must still line up.
  5. Leave the charts' own `formatSen` text (`blocks/charts.tsx`) to B08 · Charts, but tell that
     slice about it.
- Files: `blocks/money.tsx`, `blocks/money-input.tsx`, `styles/app.css`
- Priority: P1
- Shared: every screen that shows money in Minted (Home, Payments, Insights, every detail). This is
  one fix, also for the Components unit.
- Builder: Sonnet, small (the split has to keep `whole` and the comma's `<wbr />`)

### 2. `manual`: the date can't be changed, so yesterday's cash payment is booked as now
- Seen: *When · Now* is a plain row with no tile and no chevron (`manual--minted-light--p1`). It
  opens nothing. Only a link from Sen's quiet-day question pre-fills a day.
- Why it matters: the most common reason to add a payment by hand is that it happened earlier (cash
  at a hawker last night, a payment the listener missed while the phone was off). Booked as *now*, it
  lands in the wrong day, and maybe the wrong cycle, and every chart built on it is off. That hurts
  use. Two more problems: the row is information drawn like a control, and its text starts at 16 px
  while *Paid from Ryt Bank* above it starts after a 32 px tile, so one card has two left edges.
- Change (screen):
  1. Make *When* a `NavRow` with `icon={CalendarIcon}`, a `value` of *Now*, *Yesterday* or the
     `shortDay`, and an `onOpen` that opens a `Sheet` titled *When was it?*.
  2. In that sheet, put three `NavRow`s (*Now*, *Yesterday*, *Pick a day*) and a native
     `<input type="date">` (max today, KL) that shows when *Pick a day* is tapped. A past day saves at
     midday KL, as `day` does now.
  3. Keep the draft while the sheet is open (it's state in `Manual`, so it already is). Reuse
     `isPastDay` for the check.
- Files: `screens/scan/manual.tsx`
- Priority: P1
- Shared: none
- Builder: Sonnet, medium
- Needs the owner: no decision is bent. `screens.md` says *the time (now)* as the default. I'm only
  flagging it as behaviour, not looks.

### 3. `review`: the *Checks* group mixes three card shapes, with two left edges and destinations without tiles
- Seen: *Checks · 7* holds answer cards (*+RM2,000.00 into Ryt Bank…*, *+RM100.00 from Tan Ah Kow*,
  *ZUS COFFEE, CHAGEE → Drinks & desserts*) between cards that open a screen (*A balance check is
  due*, *A receipt Sen couldn't read*, *Phone bill claim*, *A payday step you skipped*)
  (`review--minted-light--p1/p2`). The open-a-screen cards indent their text 16 px from the card edge.
  The answer cards indent 12 px (`ReviewRow`'s `p-3`). Down the page the text jumps between x=29 and
  x=34, in every look, and most visibly in Line, where the cards are rules (`review--line-light--p1`:
  *A balance check is due* sits 17 px right of every question above it). The cards that open a screen
  are destinations, but they have no `IconTile`. And *Checks* doesn't say what's in it: two of its
  questions are about money in, one is Sen's proposal.
- Why it matters: Review is the screen a person works through every day. A ragged left edge and a
  mix of shapes make it look assembled rather than designed. That is the owner's "not so nice", and
  it breaks D130 rule 3 (icons on everything you go to) and the one-row-pattern rule. Grouping by what
  the question *is* lets a person batch them: all the categories, then all the money in.
- Change (screen):
  1. Replace `KINDS` with these groups, in this order:
     *Categories* (`TagsIcon`: `new-merchant`);
     *Money in* (`ArrowDownLeftIcon`: `money-in`, `transfer-missing`, `money-in-share`);
     *Splits* (`SplitIcon`: `owe-share`);
     *From Sen* (`SparklesIcon`: `proposal`);
     *New wording* (`MessageSquareTextIcon`);
     *To check* (`ListChecksIcon`: `receipt-waiting`, `receipt-unread`, `balance-check`, `claim-due`,
     `payday-step`).
  2. Render *To check* as **one** `GroupCard` (no label, since the kind header is the label) of
     `NavRow`s:
     - `receipt-waiting`: `ReceiptTextIcon`, tone `accent`, title *{Merchant} receipt*, description
       *Read and waiting for you to check it*, `value={<Money sen={total} />}`
     - `receipt-unread`: `ImageOffIcon`, title *A receipt Sen couldn't read*, description *Enter it by
       hand; the photo is kept · {when}*
     - `balance-check`: `ScaleIcon`, title *A balance check is due*, description *The last one was …*
     - `claim-due`: `HandCoinsIcon` (as More's Claims), title *{name} claim*, description *Due …*,
       `value` the amount
     - `payday-step`: `CalendarCheckIcon` (as Home's payday plan), title *A payday step you skipped*,
       description the step
  3. Delete `OpensRow`.
  4. Make `ReviewRow`'s padding `px-4 py-3` (it is `p-3`), so the question's left edge matches
     `GroupCard`'s rows (16 px). Set the answers strip's negative margin to `-mx-4` with `px-4` to match.
- Files: `screens/review/review.tsx`, `blocks/rows.tsx` (`ReviewRow` padding)
- Priority: P2
- Shared: the `ReviewRow` padding reaches every Review question
- Builder: Sonnet, medium

### 4. `review` answers: Sen's pick looks like a focused, already-chosen button, and *Other…* looks like plain text
- Seen: the suggested chip (*Public Bank*, *Income*) has a 1 px primary border plus a 2 px 40 % ring.
  That's a double outline that reads like a keyboard focus ring, or a selected state
  (`review--minted-light--p2`, every look). *Other…* is a `ghost` chip with no border or fill, so it
  reads as a word left at the end of the row (`review--minted-light--p1`, *Other…* beside *Meals* and
  *Groceries*).
- Why it matters: a person may take the ringed chip as already answered and scroll past, so the
  question stays. *Other…* opens the full category sheet. It's the way out when both guesses are
  wrong, and it doesn't look tappable (eyes question 3). Patterns §7 asks for *a sparkle and an accent
  outline*, not a ring.
- Change (block, `ReviewRow`):
  - Suggested chip: replace `border-primary text-primary ring-2 ring-primary/40` with
    `border-primary bg-primary/8 text-primary`. That keeps the sparkle and the `sr-only` *, Sen
    suggests this*, with no ring.
  - *Other…*: `variant="outline"` (as the other answers) with `text-muted-foreground`, plus a
    trailing `ChevronRightIcon` (16 px, `aria-hidden`), so it reads as *more choices*.
- Files: `blocks/rows.tsx`
- Priority: P2
- Shared: every Review question; the gallery's `ReviewRow`
- Builder: Haiku, small

### 5. `review` *Waiting on others*: a refund not yet received is in money-in green, a bare split amount says nothing, and the rows don't line up
- Seen (`review--minted-light--p3`, dark the same):
  - *Shopee refund · +RM59.00* is drawn in `money-in` green with a plus, in the same column as money
    you have. It's money Sen is *watching for*.
  - *Bbq Place · 1 of 2 paid you back · RM48.80*: nothing says whether RM48.80 is the bill, your
    share or what's still to come. It's what's still to come (the comment in `review.tsx`).
  - The split rows lead with a 32 px tile, but the refund row has none, so its text starts 88 px
    further left than the rows above it, in the same card.
  - The receipt card under them is a `ReviewRow` whose third chip wraps to a second line.
- Why it matters: green with a plus means money in, everywhere (patterns §3). Showing an expectation
  in it is a forecast drawn as a fact, which is the spirit of the *prediction never shares a table
  with a fact* rule. An amount that doesn't say what it is fails *the figures look right and
  consistent*. The ragged edge is the same problem as finding 3.
- Change (screen):
  1. Give *Waiting on others* the same sub-headers as *Needs you* (the `h3` with icon and count):
     *Splits · 2* (`SplitIcon`), *Refunds · 1* (`RotateCcwIcon`) and *Receipts · 1* (`ReceiptTextIcon`).
     Each has its own card, so no card mixes rows with and without tiles.
  2. Splits: keep `ListRow`, but change `secondary` to *{people} · RM48.80 to come* and drop the
     amount on the right. Or, if the amount must stay on the right, add an optional `amountNote` prop
     to `ListRow` that draws a caption (`text-xs text-muted-foreground`, *to come*) under the amount.
     Choose the prop if Payments or Shared need it too.
  3. Refunds: a `NavRow` without `onOpen`, title *{Merchant} refund*, description *RM59.00 expected by
     Sun, 25 Oct · Sen is watching for it*, written with `<Money sen whole kind="out"
     className="text-muted-foreground">` inside the sentence, or plain text. Show no amount in a money
     colour.
  4. Receipts: render as `NavRow`s that open the receipt's choices, or keep the `ReviewRow` with the
     shorter set from finding 29.
- Files: `screens/review/review.tsx`, `blocks/rows.tsx` (if `amountNote` is added)
- Priority: P2
- Shared: `amountNote` would serve `shared` and a split's payment row
- Builder: Sonnet, medium

### 6. `confirm`: the total, the thing to check, sits below the fold of attention, and the photo appears twice
- Seen: the top card holds a grey photo placeholder (56×80), the merchant at `text-xl` and a *View
  photo* button, which opens the same photo the tile shows (`confirm--minted-light--p1`). The total,
  *RM64.13*, sits in a fact grid near the bottom of the first screen, with *Items add up to the total
  ✓* floating under the card in body text.
- Why it matters: the screen answers *did Sen read this receipt right?* (D67). The first thing to see
  is the total and whether the items add up, then the items. D130 rule 1 says to say what's primary.
  Two controls for one photo add noise. `screens.md` says *View photo* is rarely needed.
- Change (screen):
  1. Replace the top `Card` with `HeaderCard`:
     - `mark`: the photo thumbnail as a `button` (48×64, `rounded-md bg-muted`, `aria-label="View
       photo"`), which opens the photo sheet
     - `title`: the merchant (`readableName`)
     - `figure`: `<Money sen={total} />`
     - `meta`: `momentLabel(occurredAt)`
     - `source`: *Read from your photo*, or *Typed in by you* when it's by hand
  2. Remove the *View photo* button.
  3. Move *Items add up to the total* into the header too, under the meta line: a `CircleCheckIcon`
     (16, `text-icon`) and the words, or the difference in words when it doesn't add up.
  4. Remove the *Total* entry from the fact grid, so only *Service charge, spread in* and *Tax, spread
     in* stay. Put the grid directly under *Items* with the footer *Prices include tax and service*,
     as `receipt` does.
  5. By hand, keep the merchant `Input` in the header's `title` slot.
- Files: `screens/scan/confirm.tsx`; `blocks/facts.tsx` only if `HeaderCard` needs `mark` to accept a
  button (it takes a `ReactNode`, so it shouldn't)
- Priority: P2
- Shared: the same header shape as finding 9 (`receipt`), so the two receipt screens match
- Builder: Sonnet, medium

### 7. `confirm`'s bottom bar: *Done* 48 px and *Split* 40 px side by side, and a third button under them
- Seen: *Done* (filled, 48) and *Split* (secondary, 40) share one row at different heights, so their
  tops and bottoms don't line up. *Not a payment? Keep it as evidence* is a full-width ghost button
  under them. The sticky bar takes about 130 px of every screen (`confirm--minted-light--p2`, dark the
  same).
- Why it matters: two buttons of different heights side by side look misaligned, not ranked (eyes
  question 4). The rare *evidence* choice takes permanent space beside the main action.
- Change (screen):
  1. Sticky bar: *Done* full width at `size="default"`, then *Split* full width at `size="sm"
     variant="secondary"`, stacked with `gap-2`. That's the same stack as `scan`'s *Take a photo* /
     *From gallery*.
  2. Move *Not a payment? Keep it as evidence* out of the sticky bar to the end of the scrolling
     content, as a `ghost` `size="sm"` button under the note row.
- Files: `screens/scan/confirm.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, small

### 8. `confirm`: the doubtful price is marked in the text colour, so the one thing to fix doesn't stand out
- Seen: *Nasi impit · ⚠ Check this price · RM5.14*. The icon is `text-icon`, the words are
  `text-foreground` and the price is plain (`confirm--minted-light--p1`).
- Why it matters: a doubtful read is a warning, and patterns §3 draws a warning in `money-warning`,
  with an icon and words. In grey it's one row among five, and people will press *Done* past it.
- Change (screen): in the item's `description`, set the icon and the words *Check this price* to
  `text-money-warning`. Draw that row's price with `<Money kind="warning">`. Leave the other rows
  unchanged.
- Files: `screens/scan/confirm.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, small

### 9. `receipt`: a detail page without its figure, a hand-made photo card, and an action drawn as a destination
- Seen (`receipt--minted-light--p1/p2`, dark the same):
  - The `HeaderCard` has the receipt icon, *Nasi Kandar Abc* at body size and the date, but no figure.
    *Total RM58.30* is in a fact grid further down.
  - *View photo* is its own card with an empty 48×64 grey box (hand-rolled `button`).
  - *Keep as evidence only* is a `NavRow` with a chevron, so it looks like it opens a screen, but it
    acts at once.
- Why it matters: the detail page pattern (patterns §7, `txn.tsx` the reference) is `HeaderCard`
  with the amount large, then the actions, then the facts, then what's linked. Rare actions go behind
  ⋯ (D130 rule 4). A chevron that acts at once breaks *information and actions never look alike*.
- Change (screen):
  - `HeaderCard`: `figure={<Money sen={rc.total} />}`, `copy={rc.total}`, `meta` the date, and
    `source` *From your receipt photo*, *From an email* or *Kept as evidence only*. Remove *Total*
    from the fact grid (keep *Tax*, *Service*, *People*).
  - Add an `ActionBar` under the header:
    - *Photo* (`ImageIcon`), opens the photo sheet; shown when `hasPhoto`
    - *Note* (`StickyNoteIcon`), opens `NoteSheet`
    - *Payment* (`LinkIcon`), opens `txn`; shown when attached
    - `more=[{ label: 'Keep as evidence only', icon: ArchiveIcon, … }]`, shown when not evidence,
      with *Undo* in its toast
  - Delete the photo card.
  - The bottom `GroupCard` keeps only what's linked: *Attached to* (finding 10 fixes its value), or
    *Payment · Waiting for its payment*, and the note as a row when one exists.
- Files: `screens/more/receipt.tsx`
- Priority: P2
- Shared: the same header shape as `confirm` (finding 6)
- Builder: Sonnet, medium

### 10. `NavRow`: a long value wraps into a ragged two-line block on the right
- Seen: *Note · Dinner with Ali and / Kah Hoe* and *Attached to · RM58.30 on / Ryt Bank*, each
  right-aligned over two lines beside a one-line title (`receipt--minted-light--p2`).
- Why it matters: D130 rule 5 wants a *short* current value. A two-line value on the right pulls the
  eye off the row's name, and the rows go uneven in height.
- Change (block and screens):
  - In `NavRow`, give `value` `line-clamp-1` (keep `text-pretty`), so it never runs past one line.
  - Document in its JSDoc that a long value goes in `description`.
  - In `receipt`: Note becomes title *Note* with `description={rc.note}` (`line-clamp-2`), and no
    `value`. Attached becomes title *Attached to*, with `description` *RM58.30 on Ryt Bank*. Leave the
    lived-in fallback (a value wraps under the title at 200 % text) as it is: `basis-24` still lets
    the actions wrap below at large text.
- Files: `blocks/group.tsx`, `screens/more/receipt.tsx`
- Priority: P2
- Shared: every `NavRow` with a long value (Settings, More, Accounts). Check them for a value that
  would now cut off, and move it to `description`.
- Builder: Sonnet, small

### 11. `manual`: the amount field: *RM* floats far from the digits, and the label sits left of a centred number
- Seen: *Amount* sits at the left edge. *RM* is about 70 px left of *0.00*, which is centred in a
  fixed `8ch` box, all over a full-width underline (`manual--minted-light--p1`, dark the same).
- Why it matters: the amount is the primary thing on this screen (`screens.md`: *the amount, large*).
  As drawn, it reads as three separate things. The layout comes from a call-site selector hack
  (`[&_div.flex]:justify-center [&_input]:w-[8ch] [&_label]:text-center`), and the label's centring
  doesn't even take.
- Change (block):
  1. Add `align?: 'start' | 'center'` to `MoneyInput`. With `center`:
     - the label is `text-center`, or `sr-only` with the field's own `aria-label`, since the screen
       title says *Add expense*
     - the row is `justify-center gap-1` with `items-baseline`
     - the prefix is `text-2xl text-muted-foreground`
     - the input sizes to its text (`[field-sizing:content] min-w-[4ch]`, which Chromium and Android's
       WebView support), so *RM* sits right beside the digits
     - the underline is the row's own width (`self-center px-2`), not the screen's
  2. In `manual`, use `<MoneyInput align="center" …>` and delete the wrapper `div`'s selectors.
- Files: `blocks/money-input.tsx`, `screens/scan/manual.tsx`
- Priority: P2
- Shared: any other big centred amount (`balance-check`, payday) can take `align="center"`
- Builder: Sonnet, small

### 12. `manual`: seventeen category cards fill the screen and push the account, the date and *More details* below the fold
- Seen: a 4-column grid of 17 cards, each 80 px tall, with a lone *Fees & charges* on a fifth row
  (`manual--minted-light--p1`). *Paid from*, *When* and *More details* start below the first screen.
- Why it matters: what's usual (the most used categories) is mixed with what's rare. A person has
  to scroll past categories they never use to check the account and the date, which is how wrong
  entries happen. `screens.md` asks for *the categories, most used first*.
- Change (screen):
  1. Show the first 7 categories (they arrive most used first) as tiles, then an eighth tile, *All
     categories*, with `LayoutGridIcon` on a neutral tone. That tile opens `CategorySheet`, which,
     after finding 13, shows the same tiles.
  2. If the chosen category isn't among the 7, it replaces the seventh tile, selected, so the choice
     is always visible.
  3. That makes two rows, and *Paid from*, *When* and *More details* come up into the first screen.
- Files: `screens/scan/manual.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, small

### 13. `CategorySheet`: categories as a plain text list here, but tinted tiles in `manual`
- Seen: Review's *Other…*, `confirm`'s category row and a payment's category open `CategorySheet`, a
  list of words with hairline separators and a check on the current one (`blocks/category-sheet.tsx`).
  `manual` shows the same categories as tinted icon tiles. `manual`'s *Paid from* also reuses this
  sheet for accounts.
- Why it matters: D130 rule 6 says categories are icon tiles. The same choice drawn two ways in one
  flow is pattern drift. The sheet is also where a person goes when Sen's two guesses are wrong.
- Change (block):
  1. Extract `manual`'s tile grid into `blocks/category-grid.tsx` (`CategoryGrid`: `choices`,
     `value`, `onChange`, the same `ToggleGroup` markup and classes).
  2. Use it in `manual` and in `CategorySheet`'s list branch, with `categoryIcon` and `categoryTone`.
     The current choice is shown selected with the ring, and the check is dropped.
  3. Give `CategorySheet` an optional `kind: 'category' | 'plain'` (default `category`). `manual`'s
     *Paid from* passes `plain` and keeps the text rows (accounts aren't categories), each with a
     `WalletIcon` tile, as a `NavRow`.
- Files: `blocks/category-sheet.tsx`, new `blocks/category-grid.tsx`, `screens/scan/manual.tsx`
- Priority: P2
- Shared: every screen that opens `CategorySheet` (`txn` in Money records, `confirm`, Review). Tell
  the Records and Components units.
- Builder: Sonnet, medium

### 14. `manual`: *More details* sits off the left edge, and its fields appear unannounced
- Seen: *More details ⌄* is a ghost button whose label starts at 32 px, while *Category* and
  *Amount* start at 16 (`manual--minted-light--p1`).
- Why it matters: it's misaligned, and it's the only disclosure of its kind. `confirm` and `receipt`
  use a muted *Add a note* row (D90) for the same thing.
- Change (screen): remove the ghost button and the `more` state. Add two `NavRow`s to the same
  `GroupCard` as *Paid from* and *When*:
  - *Merchant* (`StoreIcon`), with `value` the typed merchant or *Add*, which opens a small `Sheet`
    with the merchant `Input`
  - *Note* (`StickyNoteIcon`), with `value` *Add*, which opens the existing `NoteSheet`

  Keep the draft in `Manual`'s state as now.
- Files: `screens/scan/manual.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, small

### 15. `scan`: the tips look tappable, and the main action is in the middle of the screen with half a screen empty below
- Seen: *For a good read* is a `GroupCard` of three `NavRow`s with icon tiles (*Lay it flat*, *Stand
  in the light*, *Get the whole receipt in*) that open nothing. *Take a photo* sits at about 45 % of
  the screen's height, with nothing below *Add by hand* (`scan--minted-light--p1` and all twelve
  look-and-mode pairs). In the dark looks (`scan--firefly-dark`, `--mercury-dark`, `--copper-dark`)
  the neutral tiles nearly vanish (finding 20).
- Why it matters: tiles mean *you can go here or do this* (D130 rule 3). Tips with tiles invite a
  tap that does nothing. The screen also has an intro paragraph *and* a tips card, which is two
  explanations (rule 7). The main action belongs in the bottom third, in thumb reach (patterns §7,
  *Screens*).
- Change (screen): make the screen `flex flex-col` with the content in `flex-1`.
  1. One intro line: *Take a photo of the receipt: flat, in good light, all of it in.* With a
     payment: *…of this payment's receipt…*. Drop the *In Sen's Android app* sentence, since it tells
     people in the app about the app.
  2. Remove the tips `GroupCard`.
  3. Fill the middle with a framing guide as the primary visual: a `rounded-[var(--radius-card)]
     border-2 border-dashed border-border aspect-[3/4] max-h-[45dvh]` box centred, with `ScanLineIcon`
     (48 px, `text-icon`) inside. It's a `button` that opens the camera (`aria-label="Take a photo"`),
     like the main button.
  4. Put the three buttons in a bottom block (`mt-auto px-4 pb-4`), as `manual`'s Save is: *Take a
     photo* (default), *From gallery* (sm secondary), *Add manually* (sm ghost, finding 26).
- Files: `screens/scan/scan.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, small

### 16. `scan-more`: *Scan receipt* isn't the largest, and the rows are hand-made with round icons
- Seen: *Add a payment* lists *Scan*, *From gallery* and *Add manually* at one size, each with a
  round grey disc (`ItemMedia` with `rounded-full`), where every other leading icon is a square
  `IconTile`. In dark the discs and the grab handle almost disappear (`scan-more--minted-light--p1`,
  `--minted-dark--p1`).
- Why it matters: `screens.md` says *Scan receipt (the largest)*, and patterns §1 names it *Scan*.
  Round discs are a second icon-tile style. And the most common choice looks no more likely than the
  rare one.
- Change (frame sheet):
  1. In `ScanMoreSheet`, draw the first choice as the sheet's main `Button` (`size="default"`, full
     width, `CameraIcon`, label *Scan receipt*) at the top.
  2. Under it, a `GroupCard` with no label and two `NavRow`s, *From gallery* (`ImageIcon`) and *Add
     manually* (`PencilIcon`), with no chevron (they act; pass `trailing={null}` or add a `noChevron`
     prop if `NavRow` needs one).
  3. Remove the hand-made `Item` rows.
- Files: `frame/sheets.tsx`; `blocks/group.tsx` if a `noChevron` prop is added
- Priority: P2
- Shared: none
- Builder: Sonnet, small

### 17. `confirm`'s Split sheet: choices drawn as stacked buttons with explanation paragraphs under them
- Seen (code, `screens/scan/split-sheets.tsx`): *Who paid?* is two equal secondary buttons. *How do
  you split it?* is *Share a link* (filled) with a paragraph under it, then *Just my part*
  (secondary) with another paragraph. `MatchSheet` is a list of bare labels.
- Why it matters: patterns §7's block table puts *a sheet's choices* in `NavRow`s. A button with a
  paragraph under it is the *list of text* drift `uiux` warns about. A payment picked by label alone,
  with no amount or date, is hard to choose with confidence.
- Change (screen-level sheets):
  - *Who paid?*: two `NavRow`s, *I paid* (`UserIcon`) and *A friend paid* (`UsersIcon`), each opening
    the next step.
  - *How do you split it?*: *Share a link* (`Share2Icon`, tone `accent`, description *Everyone ticks
    their own items on their phone*) and *Just my part* (`ListChecksIcon`, description *You tick
    yours; the rest becomes Others' items*). Remove the two paragraphs.
  - `MatchSheet`: rows as `ListRow` with the account tile, the payment's label, *{account} ·
    {momentLabel}* and the amount. This needs `choices` to carry `amount`, `at` and `account`. Check
    `useMatches`'s shape, and add them to the fake if missing.
- Files: `screens/scan/split-sheets.tsx`; `data/fake/*` if `useMatches` lacks the fields
- Priority: P2
- Shared: none
- Builder: Sonnet, small

### 18. `skipped`: each notification is cut to two lines, so you can't tell whether it was a payment
- Seen: the body text is `line-clamp-2` (*Pay with eWallet at any participating merchant this
  weekend and enjoy up to RM5 cashback.* only just fits, `skipped--minted-light--p1`). A longer one
  would end in *…* with no way to read the rest.
- Why it matters: the screen asks *did Sen throw a payment away by mistake?* That's answered only by
  reading the whole notification. Patterns §7's raw notification row shows the title and text *as the
  app wrote them, line breaks kept*.
- Change (screen): remove `line-clamp-2` from the text paragraph. Keep `whitespace-pre-line` and
  `wrap-anywhere`.
- Files: `screens/review/skipped.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, small

### 19. Names: the same bill appears as *BBQ PLACE* and *Bbq Place* on one screen
- Seen: *Kah Hoe · BBQ PLACE* (an answer chip), *HAIDILAO* (*You owe Mei*), *ZUS COFFEE, CHAGEE*
  (Sen's proposal), then *Bbq Place*, *Nasi Kandar Abc* and *Mr Diy receipt* lower down
  (`review--minted-light--p1/p2/p3`, `receipt--minted-light--p1`).
- Why it matters: patterns §2 (*Names as people read them*) shows payees through `readableName`. Half
  the names on Review skip it, so one bill is spelled two ways, and the ones that pass turn acronyms
  into *Bbq*, *Abc* and *Diy*.
- Change (screen and lib):
  1. In `review.tsx`, pass `s.bill` (money-in-share chips) and `i.bill` (owe-share) through
     `readableName`.
  2. In `lib/names.ts`, inside a multi-word name, keep any word of 2–3 letters with no vowel
     (`/^[^AEIOU]{2,3}$/`) in capitals (*BBQ*, *KFC*), except the name particles `BT`, `BN`, `HJ`, `SDN`,
     `BHD`, `MR`, `DR`, which stay title case.
  3. Add unit cases to the names test (`BBQ PLACE` becomes *BBQ Place*, `SITI AMINAH BT YUSOF` stays
     *Siti Aminah Bt Yusof*, `SATE KAJANG HJ SAMURI` stays as now).
  4. Sen's proposal title is a server string. Note it for B12 (proposals) to carry the merchants as
     fields, so they can pass through `readableName`.
- Files: `screens/review/review.tsx`, `lib/names.ts` and its test
- Priority: P2
- Shared: every payee shown through `readableName` (Payments, Home, details)
- Builder: Sonnet, small

### 20. Neutral `IconTile` disappears in the dark looks
- Seen: `bg-muted` on `bg-card` is almost the same colour in Firefly, Mercury and Copper dark, and in
  Minted dark for `scan-more`'s discs. The tile's square is gone, and only a faint icon remains
  (`scan--copper-dark--p1`, `scan--mercury-dark--p1`, `scan--firefly-dark--p1`, `scan-more--minted-dark--p1`).
- Why it matters: the tile is how D130 says *you can go here*. In dark it reads as a stray glyph.
- Change (block): in `blocks/tile.tsx`, make the neutral tone `bg-foreground/8 text-icon`, so it
  shows on any card in any look. Check all twelve pairs in `/dev/gallery`.
- Files: `blocks/tile.tsx`
- Priority: P2
- Shared: every neutral tile (Settings, More, every `NavRow`). This belongs to the Components unit;
  listed here because it's most visible on `scan`.
- Builder: Haiku, small

### 21. `skipped`: the same bell-off tile on every card, and an action chip unlike Review's
- Seen: every card leads with an identical `BellOffIcon` tile beside *TNG eWallet · Today, 10:00*.
  *This was a payment* is a `secondary` chip with a check icon, while Review's answers are `outline`
  chips (`skipped--minted-light--p1`).
- Why it matters: a tile on information, repeated identically, is noise (D130 rule 3). The app's
  own icon would help a person scan. The same kind of control (answer a question about a capture)
  should look the same on both screens.
- Change (screen): replace the `IconTile` with `AppIcon` from `screens/capture/common.tsx` (move it to
  `blocks/` if importing across screens is unwelcome), at 32 px, given the event's app. If no icon is
  known, show no tile. Make the button `variant="outline" size="chip"` with the same `CircleCheckIcon`.
- Files: `screens/review/skipped.tsx`; `screens/capture/common.tsx` or a new `blocks/app-icon.tsx`
- Priority: P3
- Shared: *Captured on this phone* uses the same raw-row idea
- Builder: Haiku, small

### 22. `review`: Sen's bar wraps one word onto a second line
- Seen: *Sen suggested 2 answers, marked / below.* in Minted, Instrument, Mercury and Copper
  (`review--minted-light--p1`, `review--copper-light--p1`). It fits on one line in Line.
- Change (screen): shorten the text to *Sen suggested 2 answers* (or *an answer*). The sparkles on the
  chips already mark them. Keep `basis-40` for large text.
- Files: `screens/review/review.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 23. `review@empty`: *Needs you · 0* above *All clear*
- Seen: the heading counts zero, then the empty state says *Nothing needs you.* (`review_empty--minted-light--p1`).
- Change (screen): with no items, the section title is *Needs you*, with no count.
- Files: `screens/review/review.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 24. `review@error`: the error hides *Missing a payment?*, which works offline
- Seen: only the error card shows (`review_error--minted-light--p1`). Adding a payment goes through
  the outbox and needs no connection.
- Why it matters: patterns §7: *what works offline still works*.
- Change (screen): move the *Missing a payment?* / *Skipped notifications* `GroupCard` out of
  `Loaded`'s children in `Review`, so it renders under the error state too. With an error, show only
  *Missing a payment?*, since the skipped count needs the data.
- Files: `screens/review/review.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 25. `confirm`: *RM64.13 ÷ 1 = RM64.13 a person* at one person, and a plain number between the stepper buttons
- Seen: at 1 the sum says nothing (`confirm--minted-light--p2`). The count is in `num` at `text-2xl`
  between two 40 px outline buttons, with the minus greyed.
- Change (screen): show the division line only when `pax >= 2`. At 1, keep only *Without a split,
  the whole bill is your spending.* Keep the stepper as is.
- Files: `screens/scan/confirm.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 26. One thing, four names and two icons: *Add by hand*, *Add manually*, *Add expense*, *Add it*
- Seen: `scan` says *Add by hand* (`PencilIcon`), `scan-more` says *Add manually* (`PencilLineIcon`),
  the screen is titled *Add expense*, and Review says *Missing a payment? · Add it*.
- Why it matters: patterns §1 (*Words*) and §5 (*the same icon for the same thing*). D69 names it
  *Add manually*.
- Change (screens): `scan`'s button becomes *Add manually*. Both use `PencilIcon`. Keep the title *Add
  expense* (`screens.md`) and Review's question as they are.
- Files: `screens/scan/scan.tsx`, `frame/sheets.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 27. `crop`: a build note shown to the person, and a card inside a card
- Seen: *Adjusting the corners arrives with the scanner.* under a card that holds a second grey box
  with the corners (`crop--minted-light--p1`). The box is `max-w-72`, so half the screen is empty.
- Change (screen):
  - Remove the card wrapper, so the photo box sits on the background at full width (`w-full flex-1
    max-h-[60dvh] aspect-[3/4] mx-auto rounded-[var(--radius-card)]`).
  - Replace the note with *Check the whole receipt is inside the frame.*
  - B15 replaces the box with the real photo and draggable corners. Note it in the B15 brief.
- Files: `screens/scan/crop.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 28. `review`: *You owe Mei* says *tick it*, but there's nothing to tick
- Seen: *HAIDILAO · If you've paid already, tick it: Sen can't see every payment*, over the chips
  *I've paid* and *Open the split* (`review--minted-light--p1`).
- Change (screen): change the line to *{Bill} · Paid already? Tap I've paid: Sen can't see every
  payment.*, with the bill through `readableName` (finding 19).
- Files: `screens/review/review.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 29. `review`: the waiting receipt's third answer wraps to a second row
- Seen: *Attach to a payment…* · *Evidence only* / *Enter the payment* (`review--minted-light--p3`).
  Patterns §2 says chips sit in one row. `ReviewRow` wraps on purpose (QA B04 redesign run 2, 10),
  and wrapping is right for large text. At normal size, though, the labels are simply too long.
- Change (screen): at normal size, keep the three answers on one row by making the labels *Attach…*,
  *Evidence only* and *Enter it*. Each button keeps an `aria-label` with the full words (*Attach to a
  payment*, *Enter the payment*). Leave the wrap behaviour in `ReviewRow` as it is.
- Files: `screens/review/review.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small
- Needs the owner: these labels are written in `screens.md` (*Attach to a payment…*, *Evidence only*,
  *Enter the payment*). Shortening them changes words the screen map set.

### 30. `confirm`'s item sheet: *Remove this item* is a plain ghost button with no Undo
- Seen (code, `screens/scan/item-sheet.tsx`): a `ghost` button in the text colour, which removes the
  item at once.
- Why it matters: patterns §2 gives an action that removes something the `destructive` colour, and
  §7 gives every change an *Undo*.
- Change (screen): add `className="text-destructive"` to the ghost button. After removing, call
  `toastUndo('Removed {description}', restore)`, where `restore` puts the item back at its index.
- Files: `screens/scan/item-sheet.tsx`, `screens/scan/confirm.tsx` (the `onRemove` handler, for the
  restore)
- Priority: P3
- Shared: none
- Builder: Haiku, small

### 31. `manual`: the near-duplicate warning is drawn in grey
- Seen (code): *Looks like {payment}, which Sen already has.* with `TriangleAlertIcon` in `text-icon`.
- Change (screen): set the icon to `text-money-warning`. Keep the words in the text colour, since it
  doesn't block (`screens.md`).
- Files: `screens/scan/manual.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, small

## Keep

- **Review's structure:** one *Apply all* bar, *Needs you* counted, questions grouped under an icon
  header with a count, answers in place as chips, *Waiting on others* not counted, and *Missing a
  payment?* / *Skipped notifications* as a closing card with their state on the right. It's the right
  shape. Polish its edges, don't redesign it.
- **Review's question cards:** the amount and payee semibold on one line, then what Sen knows in one
  muted line, then the answers. Money in carries its `+` and green, and spending is plain.
- **Sen's suggestions marked with a sparkle**, plus the screen-reader text *, Sen suggests this*.
  Keep both through finding 4.
- **`ReviewRow`'s one-answer-at-a-time and `settleTap` guards**, the toast with *Undo* raised by the
  row itself, and `useChangeMotion` on the list. None of these show in a screenshot, so don't lose
  them in a refactor.
- **The wrap of answer chips at large text** (QA B04 redesign run 2) and `basis-40` on Sen's bar.
  These are lived-in fixes.
- **`manual`'s amount entry** (D132: digits from the right, two decimals, parsed as text into sen),
  autofocus on the amount, the sticky *Save* in thumb reach, and the tinted category tiles with a ring
  on the chosen one.
- **`confirm`'s list-first design** (D66, D89): one category row that says *Mixed* when it is, every
  item with tax and service spread in, the add-up check in words, and the stepper with its plain
  sentence.
- **`receipt`'s *Prices include tax and service.*** footer under the items. It's one line, in the
  right place.
- **`scan`'s button hierarchy:** one filled 48 px action, then a 40 px secondary, then a ghost. The
  stacked buttons should stay as they are when they move down.
- **The empty and error states** use `EmptyState` (*All clear · Nothing needs you.*) and an error
  card that says what happened and what to do, with *Try again*, in words and the text colour, never
  red.
- **Dates:** *Today, 12:31*, *Yesterday, 22:10*, *Mon, 12 Oct, 10:15*, never numeric.
- **Line's rules** instead of cards on Review: the question rows read well as a ruled list. Finding 3's
  shared left edge will make Line cleaner still.

## Needs the owner

1. **Finding 29:** shorten the waiting receipt's answers to *Attach…*, *Evidence only* and *Enter it*
   (full words in their labels for TalkBack), so they fit one row. `screens.md` sets the longer words.
2. **Finding 2** (no decision bent, flagged because it's behaviour, not looks): *When* in `manual`
   becomes choosable (*Now*, *Yesterday*, *Pick a day*). `screens.md` gives *now* as the default but
   doesn't say whether it can change.
