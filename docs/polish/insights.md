# Polish plan: Insights

Screens: `insights` (with `@empty`, `@error`), `budgets`, `subscriptions`, `goals`, `goal`,
`insights/year`. Audited from every capture in `slices/` (Minted light and dark for each screen, all
six looks for `insights`), against `docs/ui/patterns.md`, `docs/workflow/uiux.md`, the uiux skill's
phone checklist, `qa/escapes.md`, D73 and `screens.md`, and the source in
`apps/web/src/screens/insights/` and the blocks it uses.

What each screen is for, as the plan reads it:
- `insights`: *am I on track this cycle?* The first card's answer is primary. Main action: none.
- `budgets`: which budget is at risk. Main action: *Add* (app bar).
- `subscriptions`: what I'm committed to each month, and what renews next. Main action: *Add*.
- `goals`: will my goals make it. `goal`: what this goal needs each cycle, and whether it fits.
- `insights/year`: how the year went, month by month.

The area is sound in structure: question cards, honest takeaways in words, accent against grey in
every look, warnings with icons and words. What makes it "not so nice" is a handful of things
repeated on every screen: amounts in Minted set with gaps (*RM1 , 200 . 00*), the answer to each
question whispered in small grey text under its chart, the step row cut off mid-word, rows whose
lines wrap in different places, and a few figures that repeat or contradict each other.

Not findings: the tab on the left edge with a sliders icon is the preview build's dev panel, absent in
production.

## Findings

### 1. Every amount in Minted: set with gaps, *RM1 , 200 . 00*
- Seen: in Minted (the default look), every amount drawn by `Money` or a `.num` span has a full
  figure-width gap around its comma and full stop: *RM932 . 93 of RM1 , 200 . 00* (`budgets`), the
  chart labels *RM1 , 200 . 00* (`insights` p1), *RM2 , 950 . 00* (`goal`), *RM141 . 90*
  (`subscriptions`), *RM1 , 237 . 95* inline in a sentence (`goals`). The same amount written as
  plain text in the same card is tight: the takeaway's *RM3,873.53*, the fact *RM1,237.95 over 6
  cycles*. So one card shows two typesettings of money. The other five looks are tight
  (`insights--copper-*`, `--instrument-*`, `--mercury-*`). The budget sheet's amount field shows it
  too, at its largest: *RM 1 , 200 . 00* (`own/insights/budgets-sheet--viewport.png`). Line shows a
  milder version, a gap before the comma in *RM1 ,237.95* (`own/insights/goal-line--viewport.png`),
  so check Line's UI font (Alegreya Sans) after the fix as well.
- Why it matters: amounts are the main content. Spaced punctuation reads like code, or like a
  broken font, and mixing two settings of the same figure on one card undermines trust in the
  figures (patterns §3: one format everywhere). It's the single biggest "not nice" in the area,
  because it's on every screen in the look people see first.
- Change (shared, the `Money` block and the `.num` rule): the cause is `font-variant-numeric:
  tabular-nums` (`.num` in `styles/app.css`) on Minted's UI font, Schibsted Grotesk, whose tabular
  set widens `,` and `.` to a figure's width as well. **Check this first**: in a preview at
  `/s/goal?…&look=minted`, set `font-variant-numeric: normal` on the figure's span and see the gaps
  close. Then:
  1. In `blocks/money.tsx`, render each separator in its own span: split the formatted text into
     runs of digits and runs of `,` `.`, and wrap each separator run in `<span className="num-sep">`.
     The existing `<wbr />` after each comma stays.
  2. In `styles/app.css`, next to `.num`, add `.num .num-sep { font-variant-numeric: normal; }`.
     Digits stay tabular, so right-aligned amounts still line up: every amount has the same
     separators in the same places relative to its right edge.
  3. Amounts drawn as `formatSen(...)` text inside a `num` span should be `Money` instead, so they
     get the fix. In this area: `BudgetMeter` and `GoalMeter` (`blocks/charts.tsx`), the goal row's
     second line (`screens/insights/goals.tsx`), the subscription amount (`formatMinor` in
     `subscriptions.tsx`: give it the same separator spans, since it isn't ringgit), and the
     history's amounts.
  4. Chart value labels in SVG (`CategoryBars`'s `<text className="num">`): drop `className="num"`.
     Those labels follow each bar's end, so they never line up in a column and don't need tabular
     figures. (If B08 · Charts has already replaced the drawing, apply the same rule to its labels.)
- Files: `apps/web/src/blocks/money.tsx`, `apps/web/src/styles/app.css`,
  `apps/web/src/blocks/charts.tsx`, `apps/web/src/screens/insights/goals.tsx`,
  `apps/web/src/screens/insights/subscriptions.tsx`
- Priority: P1
- Shared: every screen that shows money (Home, Review, payments, accounts, splits, claims), and
  `MoneyInput` (`blocks/money-input.tsx`: give its digits the same separator spans). Likely also
  raised in `components.md`: build it once.
- Builder: Sonnet, M (the check comes first, then a small block change and a sweep of `num` spans)

### 2. `goal`: says *Within reach* beside a finish date two months late
- Seen: `goal--minted-light--p1.png`. Facts: *Done by 15 Mar*, *At this pace About Sun, 16 May 2027*.
  The status card below says *Within reach: your median surplus is RM1,237.95 over 6 cycles, which
  covers it.* A person reads "on track" and "two months late" on one screen. *15 Mar* also has no
  year while the projection does, so it isn't clear the target is 2027 at all.
- Why it matters: this is the screen's whole question (will it make it?), and the answers disagree.
  Both are right, measured against different things: feasibility compares what the goal *needs* with
  the median surplus, and the pace comes from what's actually been put in. Neither says so. This is
  trust (qa-eyes *Trust*; patterns §7 *Status cards*: state it in words first, then what it waits on).
- Change (screen, words worked out by code from the view's numbers):
  1. Status card (`goal.tsx`, the `Card` with `data-testid="feasible"`): two lines. Line 1, `text-base
     font-medium`, the state and its condition: *Within reach at RM610.00 a cycle* or *A stretch at
     RM610.00 a cycle*. Line 2, `text-sm text-muted-foreground`, the reason, then the pace only when
     it misses the date: *Your median surplus, RM1,237.95 over 6 cycles, covers it. At the pace so far
     you'd finish about May 2027, after 15 Mar 2027.* (Use `falls short of it` for a stretch. Leave
     out the second sentence when the projection is on or before the target date, or there's no
     target date.) The amounts are `Money` with `whole`, so a sentence never breaks inside one.
  2. *At this pace*: show the month and year, not a weekday and day (*About May 2027*). A projection
     to the day is false precision, and the weekday is noise.
  3. Dates in a year other than the current KL year carry their year: *15 Mar 2027*. Do this in
     `shortDay` (`lib/dates.ts`): add the year when the day's KL year differs from today's. Check its
     other callers still read well (cycle ranges like *30 Sept – 29 Oct* stay as they are within one
     year).
- Files: `apps/web/src/screens/insights/goal.tsx`, `apps/web/src/lib/dates.ts`
- Priority: P1
- Shared: `shortDay`'s year reaches `goals` (*to be done by 15 Mar* → *15 Mar 2027*), subscriptions'
  renewals in January, and any screen showing a next-year date.
- Builder: Sonnet, S

### 3. `insights`: the step row is cut mid-word against *1 of 5*
- Seen: every look. The last visible step name is cut flush against the counter: *Goa 1 of 5*
  (Minted, Instrument), *Goal: 1 of 5* (Copper, Mercury), *G 1 of 5* (Firefly), *Y 1 of 5* (Line).
  `insights--*--p1.png`.
- Why it matters: it reads as broken text, at the top of a tab screen, and hides that more steps
  exist (the row scrolls, but nothing says so). qa-eyes *Broken*.
- Change (block, `StepPager` in `blocks/steps.tsx`):
  1. Fade the names row's trailing edge so a cut name reads as "more this way": on the `role=tablist`
     div add `[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]`, and remove
     the mask once the row is scrolled to its end (track `scrollLeft + clientWidth >= scrollWidth - 1`
     in the row's `onScroll`, and set a `data-end` attribute the class keys on). Fade the leading
     edge the same way once it's scrolled away from the start.
  2. Give the counter its own room: `pl-2` on the `1 of 5` span, so a fade never runs into it.
  3. With finding 6's shorter list of steps, check at 390 px in all six looks that the fade, not a
     hard cut, is what shows.
- Files: `apps/web/src/blocks/steps.tsx`
- Priority: P1
- Shared: any `StepPager` (patterns names it for Insights; check `/dev/gallery`).
- Builder: Haiku, S

### 4. `insights`: shorter steps scroll into a blank screen before *The year*
- Seen: `own/insights/insights-step3--viewport-bottom.png`, `-step4-…`, `-step5-…` (Minted light).
  On *Subscriptions* (two cards) and *Goals* (one card), scrolling down past the cards shows a
  whole phone-height of empty background, then *The year* row on its own. On *Year*, the same after
  the top-merchants card. Step 2 (`-step2-…-bottom`) is nearly as tall as step 1, so it leaves only
  a small gap.
- Why it matters: it looks broken. A person scrolls into nothing and wonders whether something failed
  to load, and *The year* is pushed out of reach on the shortest steps. The cause is the pager: the
  pages sit side by side in one flex row (`StepPager`'s track), so the row is as tall as its tallest
  page, the *On track* step with four cards.
- Change (block, `StepPager` in `blocks/steps.tsx`): make the track as tall as the page being shown.
  1. Give each panel `self-start` (so a panel is its own height, not the row's).
  2. Measure the shown panel with a `ResizeObserver` on that panel (never on the track, which would
     feed itself: the uiux skill's *a ResizeObserver that animates the element it observes*), and
     set the track's `style.height` to the panel's height, with `overflow-y: clip` on the track.
  3. When `at` changes, set the new height at once under reduced motion; otherwise transition
     `height` 200 ms on `--motion-ease` (patterns §8). The neighbour page is clipped to the current
     height while a swipe is in progress, and grows when it settles: that's fine.
  4. Check every step at 390×844: *The year* sits 12 px under the last card on each.
- Files: `apps/web/src/blocks/steps.tsx`
- Priority: P1
- Shared: any `StepPager`
- Builder: Sonnet, M

### 5. Every question card: the answer is the quietest thing on it
- Seen: `insights--minted-light--p1/p2.png`, `insights_year--*`. Each card's heading (*Am I on
  track?*) is 15 px, the same size as body text. The takeaway, the actual answer (*You've spent
  RM3,873.53 so far, RM273.53 more than last cycle by this day…*), is 13 px muted grey under the chart.
  The loudest line in each card's foot is *Ask Sen about this* in full-colour medium text with the
  avatar, repeated on every card down the page. Scrolling, the eye meets four *Ask Sen about this*
  before it meets an answer.
- Why it matters: D73 makes every card a question with an answer. A card's own heading is the Section
  level (`text-lg`, patterns §2, D129). The answer is body text, not secondary: it's the one line a
  person reads instead of decoding the chart (patterns §4: *the takeaway line under it says the
  answer in words*). The upside-down hierarchy is E1's kind ("every heading bigger than what it
  heads; one thing to look at first").
- Change (block, `ChartCard` in `blocks/charts.tsx`):
  1. `CardTitle className="text-base leading-snug"` → `"text-lg leading-snug"`.
  2. Takeaway `<p className="text-sm text-muted-foreground">` → `<p className="text-base
     text-foreground text-pretty">`.
  3. Keep *Ask Sen about this* as it is (ghost, `size="sm"`): once the answer is body text in the
     text colour, the button falls back to second place by itself.
  4. `CardFooter` gap: `gap-1` → `gap-2`, so the answer and the button don't touch.
  5. The *Open budgets*, *Open subscriptions* and *Open goals* buttons
     (`own/insights/insights-step2--viewport.png`, `-step3-`, `-step4-`) sit inside the chart area, so
     each card has a button, then its answer, then a second button. Give `ChartCard` an optional
     `open?: { label: string; onOpen: () => void }`, drawn in the footer under the takeaway, in one
     row with *Ask Sen about this* (`flex flex-wrap gap-2`; *Open …* `variant="outline" size="sm"`
     with its chevron, first). Move the three cards' buttons into it (`budgetsCard`, `renewsCard`,
     `goalsCard` in `insights.tsx`).
  6. Leave the order (question, chart, answer, Ask Sen) as D73 and patterns §4 have it. Putting the
     answer straight under the question is better again on a phone; see *Needs the owner*.
- Files: `apps/web/src/blocks/charts.tsx`
- Priority: P2 (first among them)
- Shared: every card on `insights` (all five steps) and `insights/year`; Home's pace card if it uses
  `ChartCard` (check).
- Builder: Haiku, S

### 6. `insights`: the steps aren't D73's groups, and two of them have the wrong names
- Seen: the steps read *On track · Budgets · Subscriptions · Goals · Year* (`insights--line-light`
  shows all five). In the code (`insights.tsx`, `groups`), *Budgets* also holds the three food cards
  (meal, experiment, eating out), and *Year* holds *Am I saving more*, *Can I trust these numbers*
  and *Where do I spend most often*, none of which is the year, while *The year* is a separate row
  under the pager. *Budgets*, *Subscriptions* and *Goals* are also the names of the full screens, so a
  step looks like a link to them but isn't.
- Why it matters: a person picking *Year* expects the year, and picking *Budgets* doesn't expect food.
  D73 names the groups: *This cycle* (on track, budgets at risk, where it went, the leak, small
  things), *Food* (meal, experiment, eating out), *Commitments* (spoken for, renewals), *Over time*
  (left at each payday, goals, the unaccounted gap, top merchants, the year).
- Change (screen, `insights.tsx` `groups`):
  ```
  ['This cycle', [onTrackCard(v), budgetsCard(v, go), whereWentCard(v, go), leakCard(v), smallCard…]],
  ['Food',       [mealCard(v), experimentCard(v), eatOutCard(v)]],
  ['Commitments',[spokenCard(v), renewsCard(v, go)]],
  ['Over time',  [savingCard(v), goalsCard(v, go), trustCard(v), merchantsCard(v)]],
  ```
  *The year* stays a `NavRow` at the foot (screens.md). Four steps instead of five also shortens the
  row in finding 3. Update `e2e/trees/` for `insights` (the tab names change).
- Files: `apps/web/src/screens/insights/insights.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 7. `budgets`: rows break in different places, repeat their group, and don't look tappable
- Seen: `budgets--minted-light--p1.png`. *Meals* and *Shopping* put the amount on the name's line;
  *Drinks & desserts* is too long, so its *RM73.50 of RM150.00* drops to a line of its own and the
  row is a line taller than its neighbours. Each row under *On track* says *On track* again. Rows
  open a sheet, but nothing on them says so (no chevron), so the intro has to say *Tap a budget to
  change it*, and the intro runs to two lines with a third sentence explaining the tick.
- Why it matters: rows of one kind should share one shape (patterns §7 *Rows*); a state line that
  repeats its group label carries nothing; a row that opens something shows a chevron (NavRow,
  patterns §7.5); one line of intro at most (§7.7).
- Change:
  1. Block, `BudgetMeter` (`blocks/charts.tsx`). Three lines, always:
     - Line 1: the label (`text-base`, wraps) and, on the right, what's spent, short: `<Money
       sen={sen} />` (`text-base`, normal weight, never truncates).
     - Line 2: the meter, as now.
     - Line 3, `text-sm`: at risk, the warning icon and *At risk: 78% of RM1,200.00 spent, 63% of the
       cycle gone*; over, the icon and *Over by RM20.30 on RM300.00*; otherwise
       `text-muted-foreground` *RM76.50 left of RM150.00*. All amounts `Money` with `whole`.
     The cap moves into the sentence, so line 1 is always short and never wraps the amount away.
  2. Screen, `budgets.tsx` rows: add a trailing `<ChevronRightIcon className="size-5 shrink-0
     text-icon" aria-hidden="true" />` after the meter, as `NavRow` draws it.
  3. Intro: one line, `{cycle.label} · {start} – {end}` (*October · 30 Sept – 29 Oct*). The tick's
     meaning goes in the last `GroupCard`'s `footer`: *The mark on each bar is today.*
- Files: `apps/web/src/blocks/charts.tsx`, `apps/web/src/screens/insights/budgets.tsx`
- Priority: P2
- Shared: the *Which budgets are at risk?* card on `insights` uses `BudgetMeter` too (its own *The
  line on each bar…* note can then go). In Line (`own/insights/budgets-line--viewport.png`) every row
  happens to fit on one line, since Line's type is narrower: the uneven rows are a Minted (and large
  text) problem, but the fix is for all looks.
- Builder: Sonnet, M

### 8. *When does the money leak?*: days numbered from the cycle's start, with no weekdays
- Seen: `insights--minted-light--p2.png`. The calendar numbers its squares 1–30, but the cycle runs
  30 Sept – 29 Oct, so square *4* is 3 October. There's no weekday row, so the takeaway, *Most of
  your treats and extras land on Saturdays*, can't be checked on the chart. The grid stops at 276 px,
  leaving a strip of empty card on its right.
- Why it matters: a calendar whose *4* isn't the 4th misleads, and a person will read it as dates. A
  takeaway the chart can't show breaks patterns §4 (*the chart is never the only way*, and the reverse:
  the chart should show what the words say).
- Change (`SpendCalendar` in `blocks/charts.tsx`, hand-drawn by design; `leakCard` in
  `insights.tsx`):
  1. Pass the cycle's start day (`v.cycle.start`) in. Label each square with its day of the month
     (30, 1, 2 … 29), and give the 1st of a month its short month as well (*1 Oct*) so the change of
     month is visible.
  2. Lay the grid out by weekday: a header row of single letters *M T W T F S S* (`text-xs
     text-muted-foreground`, `aria-hidden`), and start the first square in its weekday's column, so
     each column is one weekday and *Saturdays* is a column a person can see.
  3. Let the grid fill the card's width: drop `max-w-[276px]`; keep the cells square.
  4. The hidden table's rows give the date (`shortDay`) rather than *Day 4*.
- Files: `apps/web/src/blocks/charts.tsx`, `apps/web/src/screens/insights/insights.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, M

### 9. *Where did it go?*: names wrap, bars are squeezed, and the chip row is unexplained
- Seen: `insights--minted-light--p1/p2.png`. *Phone & internet* wraps to two lines in a 34 px row
  (Minted, Instrument, Firefly, Mercury, Copper), so it crowds the row above. The name column and the
  amount column take two thirds of the width, leaving the bars about 110 px, so the differences
  between categories are hard to see. Under the chart, a row of outline chips (*Home & bills, Meals,
  Family, Shoppi…*) with no label: nothing says they open the payments, and the row is cut hard at
  the card's padding.
- Why it matters: every other meter in Insights (budgets, goals, top merchants) has the name and
  figure on a line above a full-width bar; this one alone has side labels, and it's the one that
  wraps. Chips look like filters (patterns §2), and here they're destinations with no words.
- Change:
  1. For B08 · Charts (it moves this chart onto shadcn's Chart): draw categories the way
     `BudgetMeter` and `RankedBars` are drawn, one category per row, the name left and the amount
     right on a line above a full-width bar, the bar in the accent when above typical and the grey
     otherwise, with the typical tick on the bar. One shape for every meter in the area, and names
     never wrap into the next row. Add this to the B08 brief's notes if it isn't built yet.
  2. Now (screen, `whereWentCard`): above the chip row, one line `text-sm text-muted-foreground`
     *See the payments in*, and let the row run to the card's edges (`-mx-4 px-4` on the scrolling
     div) so a chip scrolls out under the card's edge instead of being cut at its padding.
- Files: `apps/web/src/blocks/charts.tsx` (B08), `apps/web/src/screens/insights/insights.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S for 2; part 1 goes with B08 · Charts

### 10. `subscriptions`: the screen's figure is small, in a tile that looks like a field
- Seen: `subscriptions--minted-light--p1.png`. *Committed each month RM141.90* sits alone in a
  full-width tinted, bordered tile, the figure at 17 px. It reads like a filled-in input, and the
  screen's primary number is barely bigger than the names below it.
- Why it matters: `StatTiles` is *two or three figures side by side, one emphasised* (patterns §7);
  alone it's a tinted box. The screen's first look should land on the commitment, then on what
  renews next.
- Change (screen, `subscriptions.tsx` `Body`): give `StatTiles` its second tile, so the emphasised one
  has its pair: `[{ label: 'Committed each month', value: <Money …/>, emphasis: true }, { label:
  `Renews next: ${first.name}`, value: shortDay(first.next) }]`, where `first` is the row with the
  earliest `next` (the rows already come in that order). Move *Yearly ones count a twelfth…* to sit
  under the tiles at `px-4` (it's at `px-5` now, 4 px off the cards' edge), and reword it: *Yearly
  ones count as a twelfth. Foreign ones are converted at the rate shown.*
- Files: `apps/web/src/screens/insights/subscriptions.tsx`
- Priority: P2
- Shared: none (if `components.md` raises the size of `StatTiles`' figure, this tile gets it too)
- Builder: Haiku, S

### 11. `subscriptions`: each card has a lopsided foot, and its second line is as loud as its name
- Seen: `subscriptions--minted-light--p1.png`, dark too. Under each *3 matched · 1 expected* row
  there's about 16 px of empty card, against 4 px above it, so every card looks unfinished at the
  bottom. *Next renewal 20 Oct* is in the full text colour, so name and date compete. The cards are
  8 px apart. *Declared* is a hand-written heading, not `GroupLabel`.
- Why it matters: rhythm and finish; a row's second line is secondary, muted (patterns §2); a detail's
  cards are 16 px apart (§7 *Spacing*); one label component (§7.2).
- Change (screen, `subscriptions.tsx`):
  1. Each `Card`: `className="gap-2 py-3"` → `"gap-2 pt-3 pb-1"`. `HistoryList`'s root: `py-1` →
     `pt-1`. The tally row stays `min-h-10` with `tap`, so its 48 px target holds.
  2. `<p className="text-sm">Next renewal …</p>` → add `text-muted-foreground`.
  3. The section: `gap-2` → `gap-3`, and replace the `<h2 …>Declared</h2>` with `<GroupLabel>Your
     subscriptions</GroupLabel>` (*Declared* is the spec's word, not the person's).
- Files: `apps/web/src/screens/insights/subscriptions.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 12. `goals`: each row is three wrapping lines of grey
- Seen: `goals--minted-light--p1.png`. *RM2,950.00 of RM6,000.00 · in / Ryt Bank* breaks mid-phrase;
  *Needs RM610.00 a cycle to be done / by 15 Mar* wraps again; each row is four or five lines of
  13 px muted text with a single amount picked out. Nothing says whether a goal will make it, which is
  the card's question (*Will my goals make it?*), and only the detail screen answers it.
- Why it matters: a row's second line is one line (patterns §7 *Rows*); the destination says its state
  (§7.5). The account is already on the detail screen.
- Change (screen, `goals.tsx` `Body`):
  1. Line 2: `<Money sen={g.saved} /> of <Money sen={g.target} />` only (drop *· in Ryt Bank*).
  2. Line 3: *RM610.00 a cycle · by 15 Mar 2027* (or *RM833.33 a cycle* with no date).
  3. On the right, before the chevron, a `Badge` with the state in words: *Within reach*
     (`variant="muted"`) or *A stretch* (`variant="outline"`), never the warning colour (a goal behind
     isn't an alarm, patterns §4). This needs `feasible: boolean` on `GoalSummary`
     (`packages/core/src/views.ts`), computed where `GoalView.feasible` is, for each goal, and filled
     in the fake (`data/fake/`) and the API's goals view.
- Files: `apps/web/src/screens/insights/goals.tsx`, `packages/core/src/views.ts`, the goals view in
  `apps/api/` and `apps/web/src/data/fake/`
- Priority: P2
- Shared: none
- Builder: Sonnet, M (1 and 2 alone are Haiku, S)

### 13. `goal`: says the same things twice, and pads the header with *A goal*
- Seen: `goal--minted-light--p1.png`. *49%* in the ring and again in *of RM6,000.00 · 49% saved*;
  *RM6,000.00* in the header and again as the *Target* fact; the header's source line reads *A
  goal*. The fact grid has five facts, so *Kept in* and *Median surplus* each sit alone on a row with
  a hole beside them. *Median surplus* is a plain string (*RM1,237.95 over 6 cycles*) while the other
  amounts are `Money`.
- Why it matters: a detail page is a header, facts, then what's linked (patterns §7 *Detail page*,
  `txn.tsx` the reference). Repeats make it longer without telling more; the source line is where the
  data comes from or where it sits.
- Change (screen, `goal.tsx`):
  1. `HeaderCard` `meta`: *of RM6,000.00* (the ring already says 49%). `source`: *Kept in Ryt Bank*
     (or *Not kept in an account yet*), in place of *A goal* / *A bucket*.
  2. `FactGrid`: four facts, two rows: *Needs a cycle* | *Done by*; *At this pace* | *Median
     surplus*. Drop *Target* and *Kept in* (now in the header). *Median surplus*'s value: `<><Money
     sen={v.medianSurplus} /> <span className="text-muted-foreground">over 6 cycles</span></>`.
  3. App bar title: *Bucket* for a bucket, *Goal* for a goal.
  4. *Put in so far*: each row's title is the day without the time (*30 Sept*, with its year when
     it's not this year): contributions are dated moves, and every one shows *10:20*.
- Files: `apps/web/src/screens/insights/goal.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 14. `insights/year`: October is half a month drawn like a whole one, and *Jan* is said twice
- Seen: `insights_year--minted-light--p1.png`. Ten bars, October the accent and visibly lower than
  most, but October isn't over (today is in the cycle), so it reads as a good month. No median line
  to judge the months against. The tile *Heaviest month: Jan* repeats the takeaway right above it
  (*Jan was the heaviest month at RM6,452.90*). *Relief tags: Lifestyle RM90.00*: the amount is grey,
  unlike every other amount.
- Why it matters: a partial period drawn like a full one is the classic misleading chart (trust);
  `ColumnBars` has a dashed median for exactly this (patterns §4 *Bars over time*); two tiles should
  say two things; money out is the text colour (§3).
- Change (screen, `year.tsx`):
  1. The month still running (when the year is the current one): *Oct so far* is too wide for the
     axis, so say it in words. The takeaway gets a second sentence: *October so far: RM3,873.53.* Pass `ColumnBars` a `reference` with the median of the *complete* months (`Median
     RM…`), computed by code with `medianSen`. For B08 · Charts: draw the month still running as an
     outline bar in the accent (as the calendar draws days still to come), with its label.
  2. Tiles: *Savings rate* (as now) and *Spent this year*, the sum of `v.months[].spent` as `Money`.
  3. Relief rows: `value={<Money sen={r.sen} />}` instead of `formatSen(r.sen)`.
- Files: `apps/web/src/screens/insights/year.tsx` (and `blocks/charts.tsx` with B08)
- Priority: P2
- Shared: none
- Builder: Haiku, S (the outline bar goes with B08)

### 15. Bars over time: the *Median* and *Limit* labels sit on the bars, crossed by their own line
- Seen: `own/insights/insights-step5--viewport.png`: *Median RM1,237.95* is written over the April
  bar with the dashed line running through the words; *Median RM41.00* the same in *Can I trust
  these numbers?*. `-step2--viewport-bottom.png`: *Limit 3 a week* over the Week 1 bar, struck
  through. (In that capture a tooltip, *Week 1 · Times 5*, was left open by the capture's tap: not a
  finding.)
- Why it matters: the label is the only thing naming the line (patterns §4: text is never the only
  reading, but the line's name must be readable), and words with a line through them read as
  crossed out: *Median RM1,237.95* looks cancelled.
- Change (block, `ColumnBars` in `blocks/charts.tsx`): drop the `label` from the `ReferenceLine`.
  Under the chart, draw a one-line key: a 16 px dashed line in `muted-foreground` (an inline SVG,
  `strokeDasharray="4 4"`, 2 px) and the reference's label, `text-xs text-muted-foreground`, in a
  `flex items-center gap-1.5`, `aria-hidden` (the hidden table already gives the numbers). Change
  the chart's top margin from 20 to 8, since nothing is drawn above the bars now. B08 · Charts keeps
  the key when it moves the chart.
- Files: `apps/web/src/blocks/charts.tsx`
- Priority: P2
- Shared: *Am I keeping my experiment?*, *Am I saving more than before?*, *Can I trust these
  numbers?*, and `insights/year` once finding 14 adds its median
- Builder: Haiku, S

### 16. *Can I trust these numbers?*: says *this cycle* under a bar labelled *Sep*
- Seen: `own/insights/insights-step5--viewport.png`. The last bar, in the accent, is labelled *Sep*;
  the takeaway says *RM53.40 this cycle couldn't be matched to a payment; the middle cycle is…*.
  The cycle running now is October (30 Sept – 29 Oct), which the cycle row says right above. *Am I
  saving more* gets it right (*September left RM1,379.20*), because it names the cycle.
- Why it matters: a figure tied to the wrong period is a trust problem; *the middle cycle* is jargon
  for the median, which the line on the chart calls *Median*.
- Change (screen, `trustCard` in `insights.tsx`): name the cycle the figure belongs to, from
  `last.label`, as `savingCard` does: *In September's cycle, RM53.40 couldn't be matched to a payment;
  the median is RM41.00.* Every payment matched: *Every payment in September's cycle is accounted
  for.* Check the bar labels and takeaways on both cards say the same cycle name, and that it's the
  cycle's own name (the one the cycle sheet lists), not the month it began in.
- Files: `apps/web/src/screens/insights/insights.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 17. `insights@empty`: no way forward, and a picker with nothing to pick
- Seen: `insights_empty--*`. *No insights yet / Your first insights show once you've a few payments.*
  No button. Above it the cycle row still offers a chevron, though there's one cycle.
- Why it matters: an empty state has an icon, a title, one line and the action that fills it
  (patterns §7.9, §7 *Empty*); a control with one option is a dead end.
- Change (screen, `insights.tsx`): give the `EmptyState` `action={{ label: 'Add a payment', onSelect:
  () => go('manual') }}` (manual entry fills it at once; capture fills it by itself). Show the cycle
  `NavRow` only when `v.cycles.length > 1`; otherwise show the cycle as one muted line, `px-4
  text-sm`: *October · 18 Oct – 29 Oct*.
- Files: `apps/web/src/screens/insights/insights.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 18. `insights`: the cycle row's title wraps, and carries its state in brackets
- Seen: `insights--firefly-light--p1.png` and dark: *October (this / cycle)* wraps to two lines
  beside *30 Sept – 29 Oct*. In the other looks it just fits.
- Why it matters: a `NavRow` says its state on the right (patterns §7.5); a bracketed aside in a title
  is what wraps first.
- Change (screen, `insights.tsx` picker `NavRow`): `title={v.cycle.label}` (*October*),
  `description={`${shortDay(start)} – ${shortDay(end)}`}`, `value={v.cycle.current ? (basis === 'pay'
  ? 'This cycle' : 'This month') : undefined}`. The row stays one line high in every look.
  The sheet it opens (`own/insights/insights-cycle-sheet--viewport.png`) is titled *Look at*, which
  reads as half a sentence: title it *Cycle*, keep its line *Pick the cycle the cards below are
  about.*, and in each row say *This cycle* (or *This month*) in place of the trailing *· now*.
- Files: `apps/web/src/screens/insights/insights.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 19. `insights`: the loading skeleton isn't the screen's shape
- Seen: source (`InsightsSkeleton`): a 56 px bar, then two blocks. The screen has the cycle row, the
  step row of chips, then cards; the chip row appears from nowhere when the data lands.
- Why it matters: a skeleton is shaped like the content, so nothing jumps (patterns §7 *Loading*).
- Change: between the first `Skeleton` and the cards, a row of four `Skeleton className="h-8 w-24
  rounded-full"` in a `flex gap-1`, and the first card's `Skeleton` at `h-80` (the pace card's height).
- Files: `apps/web/src/screens/insights/insights.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 20. App bar: *Add* sits 8 px from the edge, the cards 16
- Seen: `budgets`, `subscriptions`, `goals` (Minted, both modes): the outlined *Add* pill's right edge
  is 8 px from the screen's edge; every card below is 16 px in. The back arrow is fine (its icon sits
  at the gutter).
- Why it matters: alignment (patterns §7 *Spacing*: blocks are 16 px from the edges).
- Change (frame, `AppBar`): `px-2` on the header stays for the back button; wrap `action` in a
  `pr-2` so a visible button ends on the 16 px line. An icon-only action keeps its 48 px target.
- Files: `apps/web/src/frame/app-bar.tsx`
- Priority: P3
- Shared: every screen with an app-bar action. Likely also in `components.md`: build once.
- Builder: Haiku, S

### 21. Insights cards: a merchant in capitals, and a converted amount shown as exact
- Seen: `own/insights/insights-step5--viewport-bottom.png`: *GRABFOOD: 9 times, RM244.80 in all.*
  `own/insights/insights-step3--viewport.png`, *What renews soon?*: *Claude Pro · 20 Oct RM85.10*,
  though Claude Pro is charged in US dollars and `subscriptions` says *≈ RM85.10*.
- Why it matters: names sent in capitals are shown in title case (patterns §2, *Names as people read
  them*); an amount converted at a rate is an estimate and is marked as one everywhere it shows (the
  same subscription is *≈* on its own screen).
- Change (screen, `insights.tsx`): in `merchantsCard`, pass each label through `readableName` (the
  helper `screens` already use for payees), in the takeaway and in `RankedBars`' rows. In
  `renewsCard`, prefix `≈ ` to a renewal's amount when it isn't in ringgit: this needs the renewal's
  currency on `InsightsView['renews'].next[]` (`packages/core/src/views.ts`, the fake and the API's
  view) if it isn't there yet.
- Files: `apps/web/src/screens/insights/insights.tsx`, `packages/core/src/views.ts`, its fake and API view
- Priority: P3
- Shared: none
- Builder: Haiku, S for the name; Sonnet, S for the currency

## What the extra captures showed

Captured at my request, in `scratchpad/polish/own/insights/`:
- **Pager steps 2–5** (`insights-step2…5--viewport` and `--viewport-bottom`): the blank screen above
  *The year* on short steps (finding 4); median and limit labels crossed by their lines (15); a
  cycle name mismatch on the trust card (16); a merchant in capitals and an unmarked conversion (21);
  the *Open …* buttons sitting inside the chart area (finding 5, item 5). The budgets, goals,
  food and commitments cards otherwise follow the patterns: meters in the accent, parts in
  `chart-1`–`chart-3` in a fixed order with a legend, warnings with icons and words.
- **The cycle sheet**: a clean list of cycles with a tick on the chosen one; only its title and the
  *· now* need words (finding 18).
- **A subscription's history, opened**: tidy. A status icon and word, the date, *RM85.10 of RM85.10*.
  Nothing to change beyond finding 11.
- **The budget sheet**: right shape (title, one line, the amount large, *Save*); its amount shows
  Minted's gaps at their largest (finding 1).
- **`budgets` and `goal` in Line light**: Line's rules in place of cards work; every budget row fits
  on one line in Line's narrower type; the goal's status card loses its box and still reads. Line
  shows a milder form of finding 1 (*RM1 ,237.95*).

## Keep

- **Chart colour discipline.** Focus in the accent, context in the grey, in every look: the pace line,
  the above-typical bars, the latest month. The warning colour appears only on a budget at risk, and
  always with its triangle and words. It's identical in all twelve look-and-mode pairs.
- **Takeaways in plain words with the real numbers**, worked out by code (*22 payments under RM15.00,
  about RM8.05 each*). Keep the wording style when the type changes.
- **`budgets` orders by risk:** *At risk* first, then *On track*, and the cycle tick has a ring of the
  card's colour, so it shows on any fill, amber included.
- **The error state** (`insights@error`): what happened, what to do, *Nothing you've added is lost*,
  and one *Try again*. The tone to copy elsewhere.
- **`goal`'s structure:** header, facts, status card, then what's been put in: the `txn` detail shape.
- **Foreign subscriptions are honest:** *US$20.00 a month*, then *≈ RM85.10 · rate 4.2550, from the
  last charge*. Subscriptions come in renewal order.
- **The calendar's states:** days still to come as outlines, empty days in `muted`, a five-step ramp
  with *Less · More*.
- **The *Do the small things add up?* card:** one figure, one line. The simplest card, and the clearest.
- **Every chart has its hidden table** (`ChartTable`) for TalkBack.
- **Layout holds across the six looks:** only materials change (Line's cards become rules, and the
  screen still reads).

## Needs the owner

1. **Answer first on each question card** (D73, patterns §4 list *a question, a chart, a one-line
   takeaway*). Putting the takeaway straight under the question, then the chart, then *Ask Sen*, lets
   a person read every answer by scrolling, with charts as the proof. Finding 5 works without it.
2. **A back arrow on the Insights tab** (patterns §7 *App bar*: back on every screen but Home). On a
   tab root it makes Insights look like a pushed screen. Android's own apps show no back arrow on a
   root tab; the back gesture already goes Home (§6). This reaches every tab root, so it's a frame
   question (`components.md`).
3. **The goal ring isn't in the patterns.** Patterns §4 name `GoalMeter` (a bar) as a goal's meter,
   and the Insights goals card uses it; `goals` and `goal` draw a ring (`GoalRing`). Either add the
   ring to patterns §7 as a goal's mark (my pick: it makes a good 48 px row mark and header mark), or
   draw the bar on those screens too.
4. **Scope, not polish:** nothing changes or removes a goal or a subscription (only `goal.add`,
   `subscription.add` and `budget.set` exist), though D62 says they're edited from their screens. Worth
   a line in the slice map.
