# Polish plan: components and frame

The shared level the six screen plans lean on: `apps/web/src/components/ui/` (shadcn's, customised),
`apps/web/src/blocks/` and `apps/web/src/frame/`, in all six looks, plus the motion between screens.
Audited from the component gallery (Minted light and dark, every block), the top of each tab screen
(`home`, `review`, `scan`, `insights`, `more`, `settings`, `first-run`) in all twelve look-and-mode
pairs, the code, and patterns.md §7–§8, D129, D130, D139, D140.

Screenshots are in
`/tmp/claude-0/-home-user-Sen/ef258ec9-34b0-5a50-902b-5fd480731a8c/scratchpad/polish/slices/`
(`<entry>--<look>-<mode>--p<n>.png`).

*(In progress: findings are added as the audit goes.)*

## Findings

### 1. Money: tabular figures space out the comma and the dot
- Seen: in Minted every amount drawn by `Money` reads `RM1 , 234 . 56`, `RM12 . 90`, `RM9 . 50`,
  with a digit-wide gap around each comma and dot (gallery--minted-light--p2 *Money*, p3 every list
  row, p4 the `HeaderCard`'s `RM12 . 90` and the `StatTiles`, p9 the chart labels). The same amount
  written inside a sentence (*RM140.00 more than last cycle*, p9) is set tight, so the app shows two
  ways of writing money on one card.
- Why it matters: money is the main content. Spaced punctuation reads like code or a typo, and it
  makes the largest amount on a detail (the `HeaderCard` figure) look unfinished. `tabular-nums` in
  Schibsted Grotesk also makes its punctuation tabular. Patterns §3 asks for tabular figures only
  *where amounts line up in a column*.
- Change: in `blocks/money.tsx`, stop adding `num` by default. Add a prop `column?: boolean`
  (default `false`): only `column` amounts get `num`. Pass `column` from the places where amounts
  stack in a column: `ListRow`'s amount (`blocks/rows.tsx`), `PersonRow`'s amount, `DayHeader`'s
  total, and the chart value labels in `blocks/charts.tsx` (bar labels, legend values). Everywhere
  else (the `HeaderCard` figure, `StatTiles`, `FactGrid` values, Review's *RM9.50 · Roti Bakar 88*,
  money in sentences) is set proportionally. Then check each look for tight punctuation in the
  column cases: where a look's `--font-ui` also spaces its punctuation under `tnum` (Minted:
  Schibsted Grotesk), the column case adds `font-feature-settings: "tnum" 1` on the digits only, by
  wrapping each run of digits in `formatSen`'s output in a `<span class="num">` inside `Money`, so
  the `,` and `.` stay proportional. Hold Minted light against Instrument light afterwards: the
  rows' amounts must still right-align.
- Files: `apps/web/src/blocks/money.tsx`, `apps/web/src/blocks/rows.tsx`,
  `apps/web/src/blocks/facts.tsx`, `apps/web/src/blocks/charts.tsx`, `apps/web/src/styles/app.css`
  (`.num`)
- Priority: P1
- Shared: every screen with an amount: `home`, `payments`, `txn`, `accounts`, `account`, `review`,
  `insights` and its children, `shared`, `split`, `claims`, `payday`, `cycle`
- Builder: Sonnet, M

### 2. Loading: a skeleton replaces a list already on screen when its query's key changes
- Seen (code; capture requested): `usePayments(filters)` reads under `['payments', filters]`, so
  every filter chip and every letter typed in Payments' search starts a new query with no data.
  `payments.tsx` then gets `rows === null` and swaps the whole list for `ListSkeleton rows={8}`,
  then fades the new list in. The same happens wherever a hook takes a parameter and the screen
  changes it in place: `useCycle(id)`, `useInsights(cycle)`, `useBudgets(cycle)`, `useYear(year)`,
  `useMatches(total, at)`, `useNearDuplicate(amount, at)`. `Loaded` (`screens/kit.tsx`) does the
  same for every screen built on it, since it shows the skeleton on `q.isPending`. The capture
  screens (`capture.tsx`, `apps.tsx`, `running.tsx`, `access.tsx`) re-read the shell on every visit
  through `useBridge`, which holds no cache, so they open on a skeleton every time, even straight
  after the person was there.
- Why it matters: the person's own payments flash away and back on every tap, which reads as data
  lost or a reload, and moves the list under the finger. Patterns §7: a skeleton is for content that
  isn't there yet; §8: a skeleton fades into its content, never the other way round.
- Change: three parts, all shared.
  1. `data/hooks.ts`, `useRead`: add `placeholderData: keepPreviousData` (from
     `@tanstack/react-query`) to the `useQuery` options, so a new key keeps showing the last data
     until the new data arrives. Ids that name a different record (`useTxn`, `useReceipt`,
     `useSplit`, `useAccount`, `useClaim`, `useGoal`, `useDraft`) must not show the previous
     record: give `useRead` a fourth argument `keep = true` and pass `false` from those seven.
  2. `screens/kit.tsx`, `Loaded`: unchanged for `isPending`, but while `q.isPlaceholderData` is
     true render the children with `aria-busy="true"` on the wrapper and no fade (`fade-in-kids`
     only after a real skeleton). In `payments.tsx`, show the skeleton only when
     `rows === null && !query.isPlaceholderData`; with placeholder rows, keep the list and dim
     nothing (the count line above it says *Searching…* in muted text until the data lands).
  3. `shell/use-bridge.ts`: keep the last result per loader in a module-level `Map` keyed by a
     `key` argument (`useBridge('capture-status', () => SenCapture.status())`), start `data` from
     it, and keep showing it while `reload` runs; `loading` stays true for callers that want it.
     The capture screens then show a skeleton only on the very first visit of a session.
- Files: `apps/web/src/data/hooks.ts`, `apps/web/src/screens/kit.tsx`,
  `apps/web/src/screens/more/payments.tsx`, `apps/web/src/shell/use-bridge.ts` and its callers in
  `apps/web/src/screens/capture/`
- Priority: P1
- Shared: `payments`, `cycle`, `insights`, `budgets`, `insights/year`, `confirm` (matches), `manual`
  (near duplicate), `settings/capture` and its steps, first run's capture steps
- Builder: Sonnet, M

### 3. Sheets: a sheet that leads to another screen cuts out instead of falling
- Seen (code; capture requested): a choice in a sheet that opens a screen closes the sheet and
  navigates in the same tick: `ScanMoreSheet` (*Add manually*) and `SenMenu` in
  `frame/sheets.tsx`, and the screens' sheets that `go(...)` from a row (filter, category, cycle,
  split sheets). The router starts a view transition for the navigation. The open `Drawer` is
  portalled outside `.screen-region`, so it belongs to the root snapshot, and `motion.css` gives
  the root `animation: none`: the sheet and its scrim vanish in one frame while the screen behind
  crossfades.
- Why it matters: patterns §8, *a sheet rises from the bottom and falls back*. A sheet that blinks
  out looks like a glitch, and the crossfade behind it has nothing to explain it.
- Change: at the block, so every caller gets it.
  1. `blocks/sheet.tsx`: add `onClosed?: () => void` to `SheetProps`, wired to vaul's
     `onAnimationEnd={(open) => { if (!open) onClosed?.() }}` on `Drawer`.
  2. Export a hook from `blocks/sheet.tsx`, `useCloseThen(setOpen)`, returning
     `closeThen(fn)`: it stores `fn`, calls `setOpen(false)`, and the sheet's `onClosed` runs the
     stored `fn` once. Under reduced motion (`reducedMotionNow()`), run `fn` at once.
  3. Use it everywhere a sheet's choice navigates: `ScanMoreSheet`'s *Add manually* and `SenMenu`'s
     three items in `frame/sheets.tsx`, then every screen sheet whose row calls `go(...)` or
     `navigate(...)` (grep `blocks/sheet` importers for a navigate inside an `onClick` that also
     closes the sheet). Keep `replace: true` where it is: the sheet's history step is popped by
     `useBackClose` first, so the replace now lands on the screen's own step. Check back from the
     new screen still returns to the screen the sheet was on.
  4. The navigation's crossfade then runs on a screen with no sheet over it, so nothing else in
     `motion.css` changes.
- Files: `apps/web/src/blocks/sheet.tsx`, `apps/web/src/frame/sheets.tsx`, the sheets under
  `apps/web/src/screens/` that navigate
- Priority: P2
- Shared: Scan's long-press sheet (every tab screen), Sen's ⋯ menu, `filter` (payments), category
  and cycle sheets, split sheets, Members
- Builder: Sonnet, M

### 4. Members → Remove: the toast lands on the closing sheet, and the screen pops under it
- Seen (code; capture requested): `confirmRemove` in `screens/settings/member.tsx` calls
  `setRemove(false)`, then `goBack(router)`, then writes and raises *Removed Mei Ling* the moment
  the write resolves. The sheet's own `useBackClose` takes its history step back in the same tick
  as `goBack`, so two pops race; the fake backend answers within a frame, so Sonner's toast (its own
  z-index, above everything) appears over the sheet while it is still falling and the screen is
  still sliding back.
- Why it matters: three things move at once, and the toast's words sit on a sheet that is
  disappearing. Patterns §7: a toast says what happened once the change is done; §8, one motion at
  a time explains it.
- Change: with finding 3's `closeThen`: `confirmRemove` becomes `closeThen(() => { back();
  void write(...).then(r => r && toastDone(...)) })`, so the order is: the sheet falls, the screen
  slides back to Members, then the toast rises over Members, where the row is already gone. Also
  in `blocks/toast.ts`, `show()`: defer the `toast(...)` call by one `requestAnimationFrame` when a
  `[data-vaul-drawer][data-state=open]` or `[role=alertdialog]` is in the document and is being
  closed (`data-state=closed`), so any other caller that toasts from a closing overlay waits until
  it has gone. Same for `DestructiveDialog`'s `onConfirm`: call it from AlertDialog's
  `onCloseAutoFocus`-time (after the close animation), not from the action's click.
- Files: `apps/web/src/screens/settings/member.tsx`, `apps/web/src/blocks/toast.ts`,
  `apps/web/src/blocks/dialog.tsx`
- Priority: P2
- Shared: every destructive action from a sheet or dialog that toasts: delete a payment (`txn`),
  remove a category or rule, leave a split
- Builder: Sonnet, S

### 5. First run, *Your apps*: the *Suggested* card vanishes and the list jumps under the finger
- Seen (code): in `screens/capture/apps.tsx` the `StatusCard` *Sen found 4 banks and e-wallets on
  this phone* renders only while `chosen.size === 0`. The first switch the person flips, or
  *Choose these 4*, removes about 150 px above the list in one frame, so the row they just
  touched jumps up and the next tap lands on a different app.
- Why it matters: a list that moves under a tap is how wrong things get chosen (the same reason as
  patterns §7's *one change per double tap*). Patterns §8: a row added or removed slides out and
  the rows below close the gap.
- Change: keep the card while the person is on the step, and change it in place. In
  `apps.tsx`, remember the suggestion in state when the list first arrives
  (`const [offer] = useState(...)`), and show the card while `offer.length` is non-zero for the life
  of the screen. After *Choose these 4* (or once every suggested app is on), its contents become
  the done state at the same height: `status="done"`, icon `CheckIcon`, state *Chosen*, title
  *Sen will read these 4. Change them below.*, and no button. Flipping a single switch leaves the
  card as it is. If a builder must remove a card from a list anywhere, it goes through
  `useChangeMotion` with `rowMotion('suggested')` on the card and `rowMotion('apps')` on the
  `GroupCard` below, so the gap closes in 200 ms.
- Files: `apps/web/src/screens/capture/apps.tsx`
- Priority: P2
- Shared: `first-run`'s capture step and `settings/capture` → *Your apps* (the same screen)
- Builder: Haiku, S

### 6. StepPager: the last step's name is cut off under *1 of 5*
- Seen: Insights' step row reads *On track · Budgets · Subscriptions · Goa* and stops dead against
  *1 of 5* (insights--minted-light--p1, every look and mode; gallery--minted-light--p6). Nothing
  says the row scrolls, so *Goa* reads as a broken word.
- Why it matters: the first view of a tab root looks broken, and the fifth step (*Year*) is hidden
  with no hint it exists.
- Change: in `blocks/steps.tsx`, `StepPager`:
  1. Give the names row a fade on whichever edge has more to scroll, as a mask, not an overlay:
     add `[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-24px),transparent)]`
     and toggle each end with two data attributes set from an `onScroll` handler
     (`data-more-left`, `data-more-right`), so an end with nothing beyond it is not faded.
  2. Move *1 of 5* out of the row: put it on the card's own line, right-aligned above the track
     (`flex justify-end px-4 text-xs text-muted-foreground`), or drop it, since the chosen chip and
     the fade already say where you are. Keep the `aria-live` text either way (`sr-only` if
     dropped).
  3. The chosen chip is already scrolled into the middle (`useLayoutEffect`); keep that.
- Files: `apps/web/src/blocks/steps.tsx`
- Priority: P2
- Shared: `insights`, and any later pager (B08 · Charts' cards)
- Builder: Haiku, S

### 7. GroupCard: the rows inside lost their dividers
- Seen: in More, Settings and the gallery's groups (more--minted-light--p1, settings--minted-light--p1,
  gallery--minted-light--p5) the rows in a card float with no line between them, so a two-line row
  (*Receipts by email / Forward receipts to your own address*) runs into the next. The `ListRow`s
  in the gallery's *Rows* (p3) do show lines. In Line, whose card is only a top rule
  (more--line-light--p1), a group is a rule and then loose rows.
- Why it matters: patterns §7, *Rows inside are divided*, and §8, *a separator is between* rows that
  touch. `GroupCard` asks for `divide-y divide-border`, but each row is an `Item`, whose own
  `border border-transparent` wins over the parent's divide colour (Tailwind v4's `divide-*` sits
  in `:where()`, specificity 0), so the line is drawn transparent.
- Change: in `blocks/group.tsx`, drop `divide-y divide-border` from `GroupCard`'s `Card` and draw
  an inset separator on every row after the first instead, so the line starts where the text
  starts (as Android and iOS settings do): add to `app.css` under `@layer components`
  `.group-rows > * + * { background-image: linear-gradient(var(--border), var(--border));
  background-size: calc(100% - var(--row-inset, 1rem)) 1px; background-position: right top;
  background-repeat: no-repeat; }`, give the `Card` the class `group-rows`, and set
  `--row-inset: 3.75rem` (16 px padding + 32 px tile + 12 px gap) on `NavRow` and `SwitchRow`
  when they have a tile or media, and on `PersonRow` (`4.25rem` for its 40 px avatar).
  An information row without a tile keeps the default 1 rem. Same fix in `Steps` (its `li` rows
  do show lines today; switch them to the same class so the two cards match).
- Files: `apps/web/src/blocks/group.tsx`, `apps/web/src/blocks/steps.tsx`,
  `apps/web/src/styles/app.css`
- Priority: P2
- Shared: every `GroupCard`: `more`, `settings` and every `settings/…`, `accounts`, `account`,
  `split`, `claims`, `txn`'s linked rows, first run's steps, sheets' choices
- Builder: Haiku, S

### 8. NavRow: a long state squeezes the title onto two lines
- Seen: *Export and backups* breaks after *Export and* while its state *Backed up Sat, 17 Oct*
  breaks too, both right-aligned, one under the other (settings--minted-light--p1);
  the gallery's *Appearance · Changes each quarter* (p3) the same. In Line the same row fits
  on one line, because its font is narrower (settings--line-light--p1).
- Why it matters: the title is what the row is; the state is a glance. Two ragged two-line columns
  side by side read as cramped, and the eye can't find the row's name.
- Change: in `blocks/group.tsx`, `NavRow`: give the title room first. `ItemContent` becomes
  `min-w-0 flex-1 basis-32` (8 rem before the value is allowed to sit beside it); `ItemActions`
  drops `max-w-[48%]` for `max-w-[45%]`, and the value span becomes `min-w-0 truncate` on one
  line (`text-pretty` goes), with the full value in a `title` attribute and read in full by the
  row's name. Where the value is too long to be useful truncated, the row should carry it as its
  `description` instead (the line under the title): add a prop `valueBelow?: boolean` that renders
  `value` as the `ItemDescription` and leaves the right side to the chevron. At 1.5× text the
  existing `flex-wrap` still drops the value under the title, as now. Then tell the settings plan
  to move *Backed up Sat, 17 Oct* to `valueBelow`.
- Files: `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: every `NavRow`: `settings` and its children, `more`, `account`, `claims`, `you`,
  `appearance`
- Builder: Sonnet, S
