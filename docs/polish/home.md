# Polish plan: Home

Screens: `home` (and `@capture-off`, `@empty`, `@error`, `@offline`), `cycle`, `payday` (and
`@before-salary`, `@month`), `new-look`. Audited from the captures at 390×844 in all six looks for
`home`, Minted light and dark for the rest, against `patterns.md`, D129, D130, D150 and
`qa/escapes.md`.

**Primary, in one line:** *Left until payday*, the large figure; main action: none (the payday card's
*Start* on payday).

What a person sees today, in short: the figure is right and each look's material is lovely, but
the column under it is four boxes drawn three different ways, the pace chart sits in the middle of
its card with empty margins, Sen's note is cut mid-word, the quiet row's *Gap* doesn't say what it
means, and a few of the looks' decorations collide with the cards. None of it is wrong in data; it
reads unfinished.

## Findings

### 1. Home: the cards are see-through outlines, so the look's drawing runs through them
- Seen: Minted light and dark (`home--minted-*`, `home_capture-off--*`, `home_empty--*`): the rosette
  behind the figure runs through the *Payday plan* card's chevron and right across the pace card,
  where its grey strokes cross the chart and look like a third line, in the same grey as *Last*. In
  `home_empty--minted-light` the empty pace card is mostly rosette. Firefly's glows show through the
  pace card (`home--firefly-light`). In Copper, Mercury and Line, Home's boxes are thin outlines
  while the same look's cards on every other screen carry its material (Line's rules, Copper's and
  Mercury's surfaces). Home is also the only screen with four surface treatments at once: outline
  (payday strip, pace, quiet row), translucent `muted/50` (Sen's note), no box (the figure), and
  Instrument's black figure card.
- Why it matters: the first screen a person opens is the one that looks least finished. A chart
  someone reads for "am I on track?" must not have decoration drawn through it (patterns §4, marks
  are the only ink in a chart). D130's calm screens are cards; patterns §7.2 says rows sit in a
  rounded card, and `uiux.md` says the `card` class is for real cards, which these are.
- Change (screen): give Home's blocks the real card surface. In `home.tsx`, the three
  `Item variant="outline"` blocks (payday strip `data-testid="payday-strip"`, pace `data-testid="pace"`,
  quiet row `data-testid="quiet"`) and `SenNote`'s `Item variant="muted"` all get
  `className="card bg-card border-border …"` (keep their existing layout classes; the `card` class is
  what each look's `look.css` paints, as `StatTiles` already does in `blocks/facts.tsx`). Sen's note
  keeps its avatar as what marks it as Sen's, not a different fill. The look's backdrop (Minted's
  rosette, Firefly's sky, Mercury's room) then shows only in the gaps and around the figure, which
  has no box. Check Line light: the cards become Line's rules, as on every other screen.
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P1
- Shared: `widgets` preview in the dev panel if it reuses these blocks; none else
- Builder: Haiku, S (then a look at all six looks, light and dark)

### 2. Every amount in Minted reads as broken: "RM3 , 873 . 53"
- Seen: Minted, every capture with an amount set in body text: `home--minted-*` (*Spent RM3 , 873 . 53*,
  *RM29 , 871 . 77*, *RM42 . 10*), `cycle--minted-*` (all three tiles, *RM740 . 53*), `payday--minted-*`
  (*RM5 , 800 . 00*, *RM152 . 00*). The comma and the point each take a full digit's width, so the
  amount looks like a typewriter glitch with spaces in it. The other five looks are fine.
- Why it matters: Minted is the default look, and money is the content. An amount that looks wrong
  is read as wrong (trust). Patterns §3 asks for `tabular-nums` so columns line up, not for spaced
  separators.
- Change (block): the cause is Minted's UI font (Schibsted Grotesk), whose `tnum` feature also makes
  the comma and full stop tabular. In `Money` (`blocks/money.tsx`), wrap each separator in its own
  span that turns tabular figures off for that glyph only:
  `<span className="num-sep">,</span>` and the same for the `.` before the sen (split the formatted
  text on `,` and on the last `.`), with `.num-sep { font-variant-numeric: normal; }` next to `.num`
  in `styles/app.css`. Digits stay tabular, so a right-aligned column still lines up on its last two
  digits. Keep the `<wbr />` after each comma and the `sr-only` spoken amount exactly as they are.
  Also apply it wherever an amount is set outside `Money` with `.num` (search `className=.*\bnum\b`).
  Confirm in Minted light: *RM3,873.53* reads tight, and Payments' list still aligns.
- Files: `apps/web/src/blocks/money.tsx`, `apps/web/src/styles/app.css`
- Priority: P1
- Shared: every screen with an amount, in Minted (and any future look whose font does the same)
- Builder: Haiku, S

### 3. new-look: a back arrow that keeps, next to *Go back* that reverts
- Seen: `new-look--minted-light`, `new-look--minted-dark` (the reveal to Instrument): the app bar
  has a back arrow and the title *A new look*; at the bottom, *Keep it* and *Go back*. In the code the
  arrow keeps the new look (`onBack={() => land(false)}`), while *Go back* restores the old one.
- Why it matters: two controls that both say "back" do opposite things with the person's choice.
  Patterns §9: the back gesture keeps the new look, and the card has exactly *Keep it*, *Go back* and
  the switch. A visible back arrow isn't in the frame, and it's the first thing a thumb from the top
  reaches.
- Change (screen): drop the app bar's back button on `new-look`. Either give `Screen` no `bar`
  and put the moment's own heading in the content, or add a `back={false}` option to `AppBar` that
  renders the title without the button (if added, it's a frame change: note it in `app-bar.tsx`'s
  doc comment). Android's back gesture still keeps the new look, as now (`land(false)` stays the back
  handler).
- Files: `apps/web/src/screens/outside/new-look.tsx` (and `apps/web/src/frame/app-bar.tsx` if the option is added)
- Priority: P1
- Shared: none
- Builder: Haiku, S

### 4. Home pace card: the chart sits in the middle of its card, with empty margins
- Seen: every look (`home--*`): the pace line starts about 50 px in from the card's text edge and
  stops about 60 px short of its right edge; the chart is drawn 230 px wide inside a 345 px card.
  The code says why: the SVG keeps its 320×88 shape inside a box held to 64 px high, so it
  letterboxes.
- Why it matters: a chart narrower than the words above and below it looks like a placeholder, and
  the first point (day 1) floats in space instead of starting at the edge everything else starts at.
- Change (block, for B08 · Charts to carry): the pace chart fills its card's content width, edge to
  edge with the text above it, at 64 px high. Now: give `PaceSpark` a `height` prop and draw with
  `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"` on its paths and markers'
  rings, or measure the box; in B08 · Charts, its `ChartContainer` takes `className="aspect-auto h-16 w-full"`.
  Delete the comment in `home.tsx` about letterboxing once it's gone.
- Files: `apps/web/src/blocks/charts.tsx` (`PaceSpark`), `apps/web/src/screens/home/home.tsx`
- Priority: P2
- Shared: anywhere else `PaceSpark` is used (widgets preview)
- Builder: Sonnet, S (coordinate with B08 · Charts; if Charts lands first, check it there instead)

### 5. Home pace card: it leads with the total, but the spec's figure is the pace
- Seen: `home--minted-light` and all looks: the card's first line is *Spent **RM3,873.53** this
  cycle*, with the amount at body size and bold; the answer to "am I on track?", *RM273.53 more than
  last cycle by this day*, is muted secondary text under the chart.
- Why it matters: spec §9.2 figure 2 is *"Spent this cycle vs the same day of the last cycle. Pace,
  not total."* The screen shows the total first and the pace as a footnote, so the eye lands on a
  number that doesn't say whether it's good or bad. The figure above already answers "how much".
- Change (screen): swap their weight, keeping both texts (screens.md lists both). First line, body
  size (`text-base`) in the text colour, the delta as `Money` medium: *RM273.53 more than last cycle by
  this day* (or *The same as…*, or *Your first cycle: nothing to compare with yet*). Under the chart,
  `text-sm` muted: *Spent RM3,873.53 this cycle*, amount in normal weight. The chevron stays on the
  first line. The legend stays last (finding 18).
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 6. Home quiet row: *Gap at 1 Oct's check* doesn't say what the gap is
- Seen: every look (`home--*`): *Total balance RM29,871.77* on the left, *Gap at 1 Oct's check
  RM42.10* right-aligned.
- Why it matters: "gap" is an internal word. A person can't tell whether RM42.10 is good, bad,
  missing or extra. `balance-check` names the same number *Unaccounted* (screens.md, spec §7), so Home
  and the screen it opens use two words for one thing.
- Change (screen): label it *Unaccounted at 1 Oct's check*, the word `balance-check` uses. Keep the
  sign rule as it is (money in shows `+`, spending plain).
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P2
- Shared: the widgets (screens.md: the large widget says the gap) if they reuse the label
- Builder: Haiku, XS

### 7. Home: the look's backdrop stops short, with a hard edge under the app bar and above the tab bar
- Seen: Firefly light and dark (`home--firefly-*`): the dusk gradient begins in a straight line just
  under the wordmark and ends in a straight line about 160 px above the tab bar, with flat background
  below it. Mercury light and dark (`home--mercury-*`): the same edge under the wordmark.
- Why it matters: a material that ends in a ruled line mid-screen reads as a rendering fault, not a
  look.
- Change (screen): the backdrop covers the whole screen region, behind the app bar and down to the
  tab bar, and stays still while the content scrolls. `HomeMaterial` is inside `<main>`, so it ends at
  the column's height (which stops above `main`'s bottom padding) and starts below the app bar. Move
  `HomeMaterial` to wrap the whole `Screen` in `Home()`, make the layer each look's `decorate` inserts
  (`.ff-sky`, Mercury's `.room`, Minted's `.wm-rosette`) `position: absolute; inset: 0` of that
  wrapper (not of the scrolling column), and keep the `data-testid` lookups `decorate` does (they
  search inside the root, which still contains them). Check the payday effects (`paydayFx`) still
  find `.hero` and `.seal`.
- Files: `apps/web/src/screens/home/home.tsx`, `apps/web/src/screens/home/material.tsx`, each look's
  `look.css` in `packages/looks/src/*/` where the backdrop layer is positioned
- Priority: P2
- Shared: none (Home is the only screen with a look backdrop)
- Builder: Sonnet, M (all six looks, light and dark, and with the payday card)

### 8. Home offline: *2 not synced yet* floats on its own row and pushes the balance under Sen's button
- Seen: `home_offline--minted-light`, `home_offline--minted-dark` (p1 and p2): the outline chip
  *2 not synced yet* sits alone between the pace card and Sen's note, left-aligned, like a stray tag.
  With the offline banner and the chip, Home no longer fits one screen: on a 844 px phone the quiet
  row's *Gap* and chevron sit under Sen's button until scrolled.
- Why it matters: D130 keeps Home to one screen. The chip says the figures include unsynced rows, so
  it belongs with the figures, not between two unrelated cards.
- Change (screen): move it under the large figure, as part of its sub line: *12 days to go · 2 not
  synced yet*, the second part with `CloudOffIcon` (size 16) in `text-money-pending`, words and icon
  together (patterns §3, §7 offline). Remove the separate `Badge`. The hero's `aria-label` adds
  *, including 2 not synced yet*. If `HeroFigure`'s `sub` can't take a node, add an optional
  `note?: ReactNode` prop to `HeroFigure` rendered after `.hero-sub` on the same line.
- Files: `apps/web/src/screens/home/home.tsx`, `apps/web/src/blocks/hero.tsx`, `apps/web/src/styles/frame.css` (`.hero-sub` line)
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 9. Home empty: an empty chart under a figure that already says RM0.00
- Seen: `home_empty--minted-light`, `home_empty--minted-dark`: *Spent since you started RM0.00*, then a
  pace card that repeats *Spent RM0.00 this cycle* over 100 px of nothing (a dot and a hairline) and
  *Your first cycle: nothing to compare with yet*. Nothing on the screen says what will fill it.
- Why it matters: a new person's first Home should say what happens next. Patterns §7: an empty
  state says what will appear and offers the action that fills it; an empty card isn't drawn
  (Insights' rule, which fits here).
- Change (screen): when `h.pace.spent === 0`, render the pace card without the chart and legend, as
  one line in the same card: an `IconTile` (`ReceiptIcon`, neutral) only if it's tappable (it still
  opens `payments`, so yes), title *Nothing spent yet this cycle*, line (`text-sm` muted) *Payments
  show up here as your bank apps tell Sen about them.* Use `NavRow`'s layout inside the card. No new
  button: Scan is one tab away.
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 10. Home spacing: 12 px between everything, the figure crowded by the cards around it
- Seen: all looks: every block is 12 px from the next (`gap-3`), including the gap from the strip to
  the pace card and from the payday strip to *Left until payday*. The pace card's content starts 12
  px in (`p-3`) while the payday strip and quiet row start 16 px in, so three left edges inside cards
  don't line up (`home--minted-light`: pace text at x≈29, payday tile and *Total balance* at x≈33).
  The pace card's chevron is 16 px; the other two cards' are 20 px.
- Why it matters: D130 and patterns §7 (spacing: 16 between cards, 24 between groups). The figure is
  the one thing to look at first and needs air around it to read as primary. Misaligned inner edges
  are what makes a screen look "a bit not so nice" without anyone saying why.
- Change (screen): the column `gap-4` (16). The hero button gets `my-2` (so 24 above and below).
  The pace card's padding `p-4` (matching the `Item size="sm"` rows' 16 px inner edge; check by
  measuring both at 390 wide). Its chevron `size-5`, like the others.
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, XS

### 11. Home *Payday plan · 2 of 3*: a count without what it counts or what's next
- Seen: every look: one line, *Payday plan · 2 of 3*, a calendar tile and a chevron.
- Why it matters: patterns §7 *Status cards* names this exact card: state in words first (*2 of 3
  moves done*), then what it's waiting for. "2 of 3" alone could be steps, moves or days.
- Change (screen, view): the title reads *Payday plan: 2 of 3 moves done*; a second line (`text-sm`
  muted, `ItemDescription`) names the next move: *Waiting for ASB RM500.00*. The second line needs a
  `next?: string` (the move's label and amount, formatted by code) on `HomeView.payday` for the
  `progress` stage, filled by the fake and the API's Home view. If that's not in this pass, ship the
  words alone.
- Files: `apps/web/src/screens/home/home.tsx`, `packages/core/src/views.ts`,
  `apps/web/src/data/fake/` (Home's view), the API's Home route
- Priority: P2
- Shared: the medium widget if it shows the plan
- Builder: Haiku, XS for the words; Sonnet, S for the next move

### 12. payday steps: amounts in muted grey and tiles on rows you can't open
- Seen: `payday--minted-light`, `payday--minted-dark`: *Phone bill RM88.00*, *Parking RM64.00*, each with
  the same hand-and-coins tile, amounts in muted secondary grey, no chevron. In the code, the
  look-back's three reasons and the plan's moves are built the same way (`NavRow` with
  `value={formatSen(…)}`).
- Why it matters: patterns §7.3, information never gets an icon tile (a tile says "you can go
  here"); §3, spending is the plain text colour and an amount goes through `Money` (tabular, read out
  as money). Grey amounts read as disabled or not counted. Two identical tiles add nothing.
- Change (screen and block): in `payday.tsx`'s `ClaimsStep`, `LookBack` and `Plan`, drop `icon` from
  these `NavRow`s and pass `value={<Money sen={x.sen} className="text-base font-normal" />}` (spending
  colour; plan lines the same). In `NavRow` (`blocks/group.tsx`), give a `value` that's an amount the
  text colour: add `className="text-foreground"` when `value` isn't a string, or a `money` prop; and
  make the doc comment true in code: without `onOpen` or `press`, don't render the tile even if `icon`
  is passed. Before that last change, list every `NavRow` call site without `onOpen`/`press` that
  passes `icon`, and say in the PR which ones change.
- Files: `apps/web/src/screens/money/payday.tsx`, `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: any other screen with information `NavRow`s that pass an icon or an amount as a string
- Builder: Sonnet, S

### 13. payday claims: *Undo* floats under the list, out of line with it
- Seen: `payday--minted-*`: a ghost *Undo* button below the claims card, its icon indented about 18 px
  from the card's left edge, alone in the middle of the screen.
- Why it matters: it isn't clear what *Undo* undoes until you read up. It belongs to the *Done*
  status, and every other edge on the screen is at 16 px.
- Change (screen): move *Undo* into the *Done* status card as its action: `variant="outline"
  size="sm"`, `self-start`, under the *waiting* line (if `StatusCard` takes no action, add an optional
  `action?: ReactNode` to it in `blocks/status.tsx`, rendered last in the card). Remove the free
  ghost button.
- Files: `apps/web/src/screens/money/payday.tsx`, `apps/web/src/blocks/status.tsx`
- Priority: P2
- Shared: other status cards that may want an inline action (claims, splits)
- Builder: Haiku, S

### 14. payday without a payday: the same words for two different reasons, under a ✓
- Seen: `payday_before-salary--minted-*` and `payday_month--minted-*` are identical: a check-circle
  tile, *Nothing to go through*, *There's no payday to go through right now.*, *Back to Home*.
- Why it matters: the line repeats the title and explains nothing. Counting by month (D79) there is
  no payday at all, and "right now" suggests one is coming. A check mark says something got done.
- Change (screen): icon `CalendarClockIcon`. Before the first salary: title *Your salary hasn't
  landed yet*, line *This opens on payday, when your salary arrives.* (add *expected Fri, 30 Oct* when
  the cycle has an expected payday). Counting by month: title *You count by month*, line *Set a payday
  in Settings → You to plan each salary.*, action *Set a payday* (opens `settings/you`), with
  *Back to Home* dropped (back does that). `Nothing()` needs to know which case it is: read
  `useHome()`'s `cycle.basis` or pass it from the payday view.
- Files: `apps/web/src/screens/money/payday.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 15. new-look: the card isn't over the new Home, so you choose a look without seeing it
- Seen: `new-look--minted-*`: a plain screen with Sen's new avatar, *Sen has a new look for this
  quarter*, *Instrument*, the switch, and the buttons. Nothing shows what Home, the figure or the tab
  bar now look like; most of the screen is empty.
- Why it matters: patterns §9 step 3, *the card, over the new Home*. The whole point of the moment
  is to see the new material on your own money before choosing *Keep it* or *Go back*.
- Change (screen): render the card as a bottom card over Home in the new look: Home's content
  behind it (non-interactive, `inert`), the card a `Card` at the bottom of the screen holding, in
  order, the avatar (64 px, not 128), *Sen has a new look for this quarter*, the name, the switch row,
  *Keep it*, *Go back* and the Settings line. If rendering Home behind it is too much for this pass,
  put the look's preview from Settings → Appearance (`screens/settings/look-preview.tsx`) where the
  128 px avatar is now, at the card's width, and leave the overlay to B14 (the reveal slice), noting
  it in that brief.
- Files: `apps/web/src/screens/outside/new-look.tsx`, possibly `apps/web/src/screens/settings/look-preview.tsx`
- Priority: P2
- Shared: B14's reveal builds on this frame
- Builder: Sonnet, M

### 16. new-look: a focus ring on *Keep it* that a finger never asked for
- Seen: `new-look--minted-light` and `-dark`: *Keep it* has a thick grey ring around it on arrival.
- Why it matters: patterns §10, focus rings show for keyboard use only. On a phone the ring reads
  as a stuck or pressed button. §9 wants focus on *Keep it* for TalkBack, which doesn't need the ring.
- Change (screen): keep `keep.current?.focus()`, but call it as
  `keep.current?.focus({ focusVisible: false })` (Chromium honours the option) so `:focus-visible`
  doesn't match; check in the capture that the ring is gone and that TalkBack's focus still starts
  there (the e2e `newLookArrived` check reads focus, not the ring).
- Files: `apps/web/src/screens/outside/new-look.tsx`
- Priority: P2
- Shared: any other screen that moves focus on arrival (sign-in's code field) should do the same
- Builder: Haiku, XS

### 17. cycle: three boxes that don't read as the sum they are
- Seen: `cycle--minted-light`, `-dark`: *Income received +RM5,804.80* and *Spending RM3,873.53*
  side by side, *Left until payday RM1,931.27* below in a tinted box.
- Why it matters: the sheet answers "how is it worked out?". Income − spending = left is the
  answer, but three tiles in a grid don't show an operation; the eye reads three separate numbers.
- Change (screen): show it as a worked sum in one `GroupCard`: three information rows (no tiles),
  label on the left, `Money` on the right, tabular, right-aligned: *Income received* `+RM5,804.80`
  (money in), *Spending* `RM3,873.53`, then a `border-t` and *Left until payday* `RM1,931.27` semibold
  (or *Over by* in `money-warning` with its icon). The words carry the operation; no minus signs on
  spending (§3). The month and before-salary variants keep the same shape with their two rows.
- Files: `apps/web/src/screens/home/cycle-sheet.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S
- Needs the owner: patterns §7's table names `StatTiles` for *the cycle*. This swaps it for rows in a
  `GroupCard` on this sheet only.

### 18. Home pace legend: under the takeaway in five looks, beside it in Line
- Seen: `home--line-*`: *— This cycle — Last* sits to the right of the takeaway on the same line;
  in the other five looks it's on its own line underneath.
- Why it matters: patterns §1, layout never varies between looks. Line's narrower font lets
  `flex-wrap justify-between` fit both on one line.
- Change (screen): make the takeaway and legend a column (`flex-col items-start gap-1`), so the
  legend is always its own line. (If B08 · Charts adds direct labels at the lines' ends, the legend
  can go.)
- Files: `apps/web/src/screens/home/home.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 19. new-look: a hand-made switch row whose line repeats its label
- Seen: `new-look--minted-*`: *Change each quarter* / *A new look every quarter.*, a bare label row,
  not in a card, unlike every other switch in the app.
- Why it matters: patterns §7, an on/off setting is a `SwitchRow` in a `GroupCard`. The line should
  say what the switch changes, not restate it.
- Change (screen): use `SwitchRow` inside a `GroupCard` (no tile: it's this moment's only setting,
  so pass no icon if `SwitchRow` allows it; otherwise `CalendarSyncIcon`). Line when on: *Off keeps
  the look you choose here.* When off, the existing *Stays on {name} or the one you keep.*
- Files: `apps/web/src/screens/outside/new-look.tsx`
- Priority: P3
- Shared: Settings → Appearance has the same switch; use the same lines there
- Builder: Haiku, XS

### 20. cycle: the estimate is to the sen, and wears a destination's tile
- Seen: `cycle--minted-*`: a card with a trend-up `IconTile` and *An estimate: at this pace, about
  RM740.53 left on payday. It assumes you keep spending as you have so far.*
- Why it matters: "about RM740.53" claims a precision no estimate has. The tile says "tap to go
  somewhere", and nothing happens (patterns §7.3, information gets no tile). A prediction must look
  different from a fact (CLAUDE.md, *a prediction never shares a table with a fact*), and here it's
  the same card as everything else.
- Change (screen): drop the `IconTile`. Make the card visibly a forecast: `border-dashed`, no fill
  (`bg-transparent`), first line `text-sm` muted *Estimate at payday*, then *about RM740 left*
  (`text-base`, medium), then the assumption in `text-sm` muted. Round the estimate to whole ringgit
  in code before formatting (to the nearest RM10 above RM1,000).
- Files: `apps/web/src/screens/home/cycle-sheet.tsx`, `packages/core/src/money.ts` (a whole-ringgit format, if none exists)
- Priority: P3
- Shared: other estimates (meal average, a goal's projection) should look the same: one `Estimate` card
  in `blocks/` if a second screen needs it
- Builder: Haiku, S
- Needs the owner: patterns §3, *always two decimals*. Whole ringgit for an estimate only.

### 21. Home Sen's note: cut mid-word, then a link on a line of its own
- Seen: all looks: *…with 12 days to g…* (Minted), *…12 day…* (Firefly), then *More* in the accent on
  a third line. Every other card on Home says it opens with a chevron.
- Why it matters: clipping inside a word looks like a fault; *More* costs a line on a screen that's
  meant to fit, and looks like a link inside a button.
- Change (screen): clamp to 3 lines (`line-clamp-3`), drop the *More* line, and add the same
  `ChevronRightIcon` (`size-5 text-icon`) at the top right as the other cards. The button's accessible
  name stays *Sen's note … Open Sen*. Remove `selectable` from the text: it's inside a button, and
  the whole note is selectable in Sen.
- Files: `apps/web/src/screens/home/home.tsx` (`SenNote`)
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 22. Capture warning: the date breaks across lines, and the band reads as an alarm
- Seen: `home_capture-off--minted-*`: *No payment notifications since Fri, 16 / Oct, 17:40.*,
  broken between *16* and *Oct*. The band is pink with a red title and a dark red *Fix*.
- Why it matters: a date split over two lines is hard to read. *May be off* is a maybe, but it's
  drawn in the reds the app keeps for removing things.
- Change (shared lib): in `lib/dates.ts`, join a date's day, month and year with non-breaking spaces
  (` `) in `dayLabel`, `shortDay` and `longDay`, so *16 Oct* never splits. While there, fix
  `shortDay`'s *Sept*: ICU's `en-MY` writes *30 Sept*, the comment promises *30 Sep*; replace
  `Sept` with `Sep` in the formatted output (it shows in `cycle`'s *30 Sept to 29 Oct*).
- Files: `apps/web/src/lib/dates.ts`
- Priority: P3
- Shared: every date in the app
- Builder: Haiku, XS
- Needs the owner: the band's colour. `warn-bg`/`warn-fg` are red in all six looks (patterns §2's
  warning band). An amber band, in `money-warning`'s hue, would say *check this* rather than *danger*.

### 23. payday: the step's title is as big as the screen's
- Seen: `payday--minted-*`: *Payday* (title, 22 px) in the app bar, then *Step 1 of 4 · Skip*, the
  progress bar, and *Your claims* also at 22 px semibold, 12 px under the bar.
- Why it matters: D129, a heading is bigger than what it heads; two titles at one size stacked make
  the screen read flat. The progress bar is closer to the heading under it than to the line that
  names it.
- Change (screen): the step heading `text-xl` (a sheet's title size), with `pt-5` above it (24 px from
  the bar). The *Your salary of RM5,800.00 landed.* line stays `text-sm` muted.
- Files: `apps/web/src/screens/money/payday.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 24. The figure's currency is hard to read in two looks' dark mode
- Seen: `home--firefly-dark`: *RM* drawn in faint fireflies, barely there next to the bright digits;
  `home--copper-dark`: *RM* in dark copper on the dark surface.
- Why it matters: patterns §8, large text at least 3:1. The currency is part of the amount.
- Change (look drawing, `frontend-design` only): raise the prefix's contrast to at least 3:1 against
  the background in Firefly dark (more, brighter fireflies in the *RM*, or the prefix set in
  `foreground` type) and Copper dark (the prefix in the digits' lighter copper).
- Files: `packages/looks/src/firefly/index.ts`, `packages/looks/src/copper/index.ts` (their `heroFigure`),
  then `docs/ui/directions/` sources per the conventions
- Priority: P3
- Shared: the widgets and Settings → Appearance previews that draw the figure
- Builder: Sonnet, S

### 25. Minted's microprint sits on the balance card's edge like a stray line
- Seen: `home--minted-*`, `home_empty--*`, `home_offline--*`, `home_capture-off--*`: *EVERY SEN
  COUNTED • …* in 4 px type, 4 px above the quiet row's border, closer to that card than to the card
  above.
- Why it matters: it's meant to be security printing; jammed against a border it reads as a rendering
  glitch.
- Change (look drawing, `frontend-design` only): draw the microprint as the quiet card's top edge,
  not above it: inserted inside the card (`afterbegin`), absolutely positioned over the top border
  (`top: -3px; left: 16px; right: 16px`), with the card's background behind the letters so the border
  stops either side of the line, like the line on a cheque.
- Files: `packages/looks/src/minted/index.ts` (`decorate`), `packages/looks/src/minted/look.css` (`.micro`)
- Priority: P3
- Shared: none
- Builder: Sonnet, S

### 26. Line draws a second figure: a double rule under *Total balance*
- Seen: `home--line-light`, `-dark`: *RM29,871.77* has a double underline; the gap beside it doesn't.
- Why it matters: patterns §3, the large figure is the only figure a look draws in its own
  material. The rule also makes the quiet row's two amounts look unequal, and the left one look like
  a link.
- Change (look drawing): remove the double rule from the quiet row's balance in Line (find where
  Line's `decorate` or `look.css` targets `[data-testid="quiet"]`).
- Files: `packages/looks/src/line/index.ts` or `packages/looks/src/line/look.css`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 27. Home error: the way out is small and at the top
- Seen: `home_error--minted-*`: *Couldn't load Home* in a card at the top, *Try again* as a small
  outline button; the rest of the screen empty.
- Why it matters: it's the only thing to do on the screen, so it's this screen's main action
  (patterns §7, one main action at 48, in thumb reach); a small outline button at the top undersells
  it. The words are good.
- Change (block): in `blocks/states.tsx`, the error state's button takes `size="default"` when the
  error replaces the whole screen (a `whole` prop, which `Loaded` in `screens/kit.tsx` passes), and
  stays `sm` inside a card or sheet.
- Files: `apps/web/src/blocks/states.tsx`, `apps/web/src/screens/kit.tsx`
- Priority: P3
- Shared: every screen's load error
- Builder: Haiku, XS

## Not yet seen

Asked for in captures (`own/home/requests.md`): Home with the Payday card, Home counting by month and
before the first salary, the loading skeleton, `cycle` by month, and `payday`'s steps 2 to 4 (the
balance check, the look-back and the plan). Findings 12 and 13 are read from the code for steps 3
and 4; anything those captures show is added here.

## Keep

- **The figure in each look.** Minted's engraved Caslon, Instrument's dot matrix on its black
  card, Firefly's lit digits, Line's ink with raised sen, Mercury's quicksilver, Copper's struck
  coin: each is the same number, read out the same, and each is the best thing on the screen. Don't
  shrink it, box it, or put anything beside it.
- **Each look's strip** under the figure (ticks, dots, the thermometer, the coin row): it says how
  much of the cycle has gone at a glance, and it's the one place a look's motion lives on Home.
- **Home's order and restraint**: the figure, pace, Sen's note, the quiet row, and nothing else. At
  most four figures (spec §9.2). Sen's note giving way when something asks you to act.
- **The words.** *Left until payday*, *12 days to go*, *RM273.53 more than last cycle by this day*,
  *Your first cycle: nothing to compare with yet*, *Couldn't load Home. Check your connection, then
  try again. Nothing you've added is lost.*, the offline banner's *What you add is kept and syncs
  when you're back.*, the payday claims' *Done* status with what happened and how. Plain, calm, true.
- **Spending in the text colour, money in with `+` and green** (the cycle sheet's *+RM5,804.80*):
  nothing alarming without a reason.
- **The capture warning's shape**: what's wrong in words, when it started, and one *Fix*.
- **The payday flow's frame**: *Step 1 of 4*, *Skip* top right, a segmented progress bar, one main
  button in the footer in thumb reach, no tab bar.
- **The cycle sheet's estimate is labelled as one**, with what it assumes.
- **new-look's** *Keep it* as the one main button, *Go back* below it, and the Settings line.

## Needs the owner

1. **The cycle sheet as a worked sum** (finding 17): rows in a `GroupCard` instead of `StatTiles`,
   which patterns §7 names for the cycle.
2. **An estimate in whole ringgit** (finding 20): *about RM740* instead of *about RM740.53*, against
   patterns §3's *always two decimals*.
3. **The health band's colour** (finding 22): `warn-bg` and `warn-fg` are red in all six looks; amber
   would read as *check this*, not *danger*. Patterns §2's warning band.
