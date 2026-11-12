# Polish plan: components and frame

The shared level the six screen plans lean on: `apps/web/src/components/ui/` (shadcn's, customised),
`apps/web/src/blocks/`, `apps/web/src/frame/` and the motion between screens, in all six looks.
Audited from the component gallery (Minted light and dark, every block), the top of each tab screen
(`home`, `review`, `scan`, `insights`, `more`, `settings`, `first-run`) in the six looks, light and
dark, the code, and patterns §7–§8, D129, D130, D139, D140.

Screenshots are in
`/tmp/claude-0/-home-user-Sen/ef258ec9-34b0-5a50-902b-5fd480731a8c/scratchpad/polish/slices/`
(`<entry>--<look>-<mode>--p<n>.png`). Motion is judged from the code and from films at 50 ms
steps in `…/scratchpad/polish/own/components/` (`<name>--t<ms>.png`, about 30–50 ms late), with
stills of the toast, the dialog and three sheets (`<name>--still.png`).

**One fix, one place.** Where a screen plan found the same thing, the fix is written here once, at
the component, and the screen plan's finding is named (*review 4* means `review.md` finding 4). A
builder doing a screen unit skips the shared part and takes it from here. Every block change ends
with a look at `/dev/gallery` in Minted light, Copper dark and Line light (uiux's three).

## Findings

### 1. Money: tabular figures space out the comma and the dot (Minted)
- Seen: every amount drawn by `Money` or typed in `MoneyInput` reads `RM1 , 234 . 56`, `RM12 . 90`
  in Minted, with a digit-wide gap round each separator (gallery--minted-light--p2 *Money*, p3 rows,
  p4 the `HeaderCard`'s figure and `StatTiles`; review--minted-light--p1 *RM8 . 00*; home's balance
  card). The same amount in a sentence (*RM140.00 more than last cycle*) is set tight, so one card
  writes money two ways. The other five looks set it tight (review--instrument-light--p1,
  review--copper-dark--p1): Minted's Schibsted Grotesk makes its punctuation tabular under `tnum`.
- Why it matters: money is the main content, and the default look makes every figure look like a
  typo. Found by four screen plans: *review 1*, *records 1*, *insights 1*, *home 2*, *start 1*.
- Change (block), the one version of all five:
  1. `styles/app.css`, utilities: add `.num-sep { font-variant-numeric: normal; }` beside `.num`.
  2. `blocks/money.tsx`, `Money`: split the formatted text on `/([.,])/` and wrap each `.` and `,`
     in `<span className="num-sep">`. The digits stay tabular, so right-aligned columns still line
     up (every amount ends in `.dd`, and every separator now has the same width). Keep the `<wbr />`
     after each comma, the `whole` behaviour and the `sr-only` spoken text.
  3. `blocks/money-input.tsx`: remove `num` from the `<Input>`'s classes (an input can't wrap its
     separators, and digits entering from the right don't need fixed widths).
  4. Check `/dev/gallery` and Payments in all six looks: Minted tight, Payments' decimals still in a
     column, no change in a look whose `tnum` left punctuation alone.
  5. Charts' own value text in `blocks/charts.tsx` stays for B08 · Charts; tell that slice.
- Files: `apps/web/src/blocks/money.tsx`, `apps/web/src/blocks/money-input.tsx`,
  `apps/web/src/styles/app.css`
- Priority: P1
- Shared: every amount: `home`, `payments`, `txn`, `accounts`, `account`, `balance-check`, `review`,
  `confirm`, `manual`, `insights` and its children, `shared`, `split`, `claims`, `payday`, `cycle`,
  first run's accounts step
- Builder: Haiku, S

### 2. Loading: a new screen slides in as a bar-less list skeleton, over data already on screen
- Seen (films `push-back`, `scan-more-manual`; code): the first time a screen opens, its code chunk
  isn't loaded, and `ScreenFor`'s `Suspense` fallback in `router.tsx` is `<Screen bar={null}>
  <ListSkeleton /></Screen>`. Opening *Sate Kajang Hj Samuri* from Payments, the screen that slides
  in is grey circles and bars with no app bar, held from 50 ms to past 300 ms, before the detail
  arrives; the payment's merchant and amount were on the row a moment before, and the shared amount
  (row → figure, patterns §8) can't play because there is no figure to grow into
  (push-back--t50…t300). *Add manually* does the same: a list skeleton for about 250 ms where a form
  will be (scan-more-manual--t50…t200). Going back is right: the list slides back and the amount
  flies into its row (push-back-back--t100). Payments itself keeps its list while a search loads
  (its own `last` ref), but the count line already says *1,139 payments match* over the unfiltered
  list until the new rows land (payments-filter-search--t200). The capture screens read the shell
  through `useBridge`, which keeps nothing, so they open on a skeleton on every visit (code).
- Why it matters: every first tap into a detail, a form or a setting shows a page with no title
  that looks like a different screen, then swaps; it's the "skeleton over data" the last QA eyes
  pass named. Patterns §7: a skeleton is *shaped like the content*; §8, the shared amount.
- Change:
  1. Load screen code before it's needed. In `screens/real.ts` (and `skeleton.ts`), keep each
     screen's `() => import(...)` loader in a map next to its `lazy` component and export
     `preloadScreen(id)`. Call it on `pointerdown` from the places that open screens: `useGo`
     (`screens/kit.tsx`) gets a `preload(id)` it returns alongside, `ListRow` and `NavRow` take an
     optional `preload` callback fired on `onPointerDown`; then, once Home has painted, preload the
     chunks of the screens one tap from each tab (`txn`, `payments`, `manual`, `settings`, the
     More rows) in `requestIdleCallback`. Check `node scripts/qa-diff.mjs --metrics-only`: the
     first screen's bytes must not grow (the preloads come after it).
  2. Make the fallback the screen's shape. `ScreenFor`'s fallback becomes
     `<Screen bar={<AppBar title={screen.title} />}>{fallbackFor(screen)}</Screen>`, where the
     registry gives each screen a `shape: 'list' | 'detail' | 'form' | 'hub'`, and
     `blocks/states.tsx` gains `DetailSkeleton` (a `HeaderCard`-shaped card: a 48 px tile, a title
     bar, a `h-10 w-40` figure bar, a meta bar; then four 44 px circles; then a two-column facts card)
     and `FormSkeleton` (a label bar, a `h-12` field, three times, and a `h-12` button bar at the
     bottom). `hub` uses `ListSkeleton card` (finding 20).
  3. On `txn`, show what the row already knew: `useTxn(id)` gets `placeholderData` from the
     payments query's cached row with that id (merchant, amount, time, category, account), and
     `txn.tsx` renders the `HeaderCard` from it while the rest of the page shows its skeleton. The
     figure is there during the slide, so the shared amount plays on first open too.
  4. `data/hooks.ts`, `useRead`: a fourth argument `keep = true` passes `placeholderData:
     keepPreviousData`, so any screen that changes a query's parameter in place (cycle, insights'
     cycle, budgets, year, matches, near duplicate) keeps its content as Payments does, without its
     own ref; `keep = false` for hooks whose id names another record (`useTxn` aside from step 3,
     `useReceipt`, `useSplit`, `useAccount`, `useClaim`, `useGoal`, `useDraft`, `useSen`).
     `Loaded` (`screens/kit.tsx`) renders children with `aria-busy="true"` and no fade while
     `q.isPlaceholderData`.
  5. Payments' count line: while `query.isPlaceholderData` or `query.isFetching` with a changed
     filter, read *Searching…* in muted text, never a count that belongs to the old list.
  6. `shell/use-bridge.ts`: take a `key` first (`useBridge('capture-status', () =>
     SenCapture.status())`), keep each key's last result in a module-level `Map`, start from it and
     keep it on screen while `reload` runs; update the callers in `screens/capture/`.
- Files: `apps/web/src/router.tsx`, `apps/web/src/screens/real.ts`, `apps/web/src/screens/registry.ts`,
  `apps/web/src/screens/kit.tsx`, `apps/web/src/blocks/states.tsx`, `apps/web/src/blocks/rows.tsx`,
  `apps/web/src/blocks/group.tsx`, `apps/web/src/data/hooks.ts`, `apps/web/src/screens/more/txn.tsx`,
  `apps/web/src/screens/more/payments.tsx`, `apps/web/src/shell/use-bridge.ts`,
  `apps/web/src/screens/capture/*.tsx`
- Priority: P1
- Shared: the first open of every pushed screen (`txn`, `manual`, `account`, `split`, every
  `settings/…`, every More row); `cycle`, `insights`, `budgets`, `insights/year`, `confirm`,
  `manual`; the capture screens
- Builder: Sonnet, L (steps 1–3 one unit; 4–6 a second)

### 3. GroupCard: the rows inside lost their dividers
- Seen: in More, Settings and the gallery's groups (more--minted-light--p1, settings--minted-light--p1,
  gallery--minted-light--p5) rows float with no line between them, so a two-line row (*Receipts by
  email / Forward receipts to your own address*) runs into the next; Line's group is a top rule and
  then loose rows (more--line-light--p1). `ListRow`s in the gallery's *Rows* (p3) do show lines.
- Why it matters: patterns §7, *rows inside are divided*; §8, *a separator is between* rows that
  touch. `GroupCard` asks for `divide-y divide-border`, but each row is an `Item`, whose own
  `border border-transparent` beats the parent's divide colour (Tailwind v4's `divide-*` sits in
  `:where()`, specificity 0). *settings 9*; *records 23* waits on this choice.
- Change (block), one rule everywhere: an inset line that starts where the text starts.
  1. `blocks/group.tsx`, `GroupCard`: drop `divide-y divide-border` from the `Card`, add the class
     `group-rows`.
  2. `styles/app.css`, `@layer components`:
     `.group-rows > * + * { background-image: linear-gradient(var(--border), var(--border));
     background-size: calc(100% - var(--row-inset, 1rem)) 1px; background-position: right top;
     background-repeat: no-repeat; }`.
  3. Mark each row by what leads it, as a data attribute (not an inline style, so a look can
     override it): `NavRow` and `SwitchRow` with a tile or `media` get `data-row-mark="tile"`,
     `PersonRow` `data-row-mark="avatar"`. In `app.css`:
     `.group-rows > [data-row-mark=tile] { --row-inset: 3.75rem; }` (16 padding + 32 tile + 12 gap)
     and `.group-rows > [data-row-mark=avatar] { --row-inset: 4.25rem; }`; rows without a mark keep
     1 rem.
  4. `blocks/steps.tsx`, `Steps`: same class instead of its `divide-y`, so the two cards match.
  5. Line: its card is already a top rule; check no row gains a double line at the top.
  6. *records 23* (split items' hairlines) then follows this rule instead of removing its lines.
- Files: `apps/web/src/blocks/group.tsx`, `apps/web/src/blocks/steps.tsx`,
  `apps/web/src/styles/app.css`
- Priority: P2
- Shared: every `GroupCard`: `more`, `settings` and every `settings/…`, `accounts`, `account`,
  `split`, `claims`, `txn`'s linked rows, first run's steps
- Builder: Haiku, S

### 4. NavRow: the title wraps before the value, and rows that act wear a chevron
- Seen: *Export and backups* breaks after *Export and* while *Backed up Sat, 17 Oct* breaks too,
  two ragged right-aligned blocks (settings--minted-light--p1, settings--mercury-dark--p1); in
  Firefly *0 apps · not listening* wraps (settings--firefly-light--p1); the gallery's *Appearance ·
  Changes each quarter* (p3). Line fits on one line, with its narrower font. And rows that act at
  once (Account's, Scan's long-press sheet) carry the chevron that means *opens a screen*.
- Why it matters: the title is what the row is; the state is a glance. *review 10*, *settings 7*
  (wrapping); *settings 8*, *review 16* (chevron on actions).
- Change (block, `blocks/group.tsx`, `NavRow`):
  1. `ItemContent`: replace `basis-24` with `basis-auto min-w-[min(100%,max-content)]`, so the title
     never wraps unless it alone is wider than the row. The row keeps `flex-wrap`, so at 1.5–2× text
     the value still drops under the title (the lived-in fix stays).
  2. `ItemActions`: drop `max-w-[48%]`, add `min-w-0 flex-1 justify-end`; the value span
     `text-balance` (was `text-pretty`), so a value that must wrap wraps evenly.
  3. Add `kind?: 'open' | 'action'` (default `'open'`). `'action'` keeps the tile, title and ripple
     and draws no chevron. Use it on Account's rows (*settings 8*), Scan's long-press rows
     (*review 16*, finding 15 here), and any `onOpen` that acts rather than navigates.
  4. The screen plans shorten their longest values (*settings 7*: *Sat, 17 Oct*, *Not listening*).
- Files: `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: every `NavRow`: `settings` and its children, `more`, `account`, `claims`, `you`,
  `receipt`, sheets' choices
- Builder: Sonnet, S

### 5. Surfaces in the dark looks: neutral tiles vanish, and the emphasised stat looks pressed
- Seen: in Mercury dark the neutral `IconTile`s are the card's own colour, so More's and Settings'
  rows lose their icons' squares (settings--mercury-dark--p1); weaker in Copper and Instrument dark.
  The emphasised `StatTiles` tile is a grey-blue block in Minted light (gallery p4 *Left*) that reads
  as selected or disabled.
- Why it matters: the tile is what marks a row as a destination (§7.3); the emphasised figure should
  look like the answer, not a pressed button. *review 20*, *settings 24*, *start 19*.
- Change (block):
  1. `blocks/tile.tsx`, `neutral`: `bg-foreground/8 text-icon` (was `bg-muted`), so it shows on any
     card in any look. Check all twelve pairs in `/dev/gallery`: distinct from the card, never a
     bright block. If a look still loses it, that look's `--muted` is the thing to tune, in its
     `theme.css` source (`docs/ui/directions/assets/<look>/`), not here.
  2. `blocks/facts.tsx`, `StatTiles`: the emphasised tile keeps the card material (`card bg-card`)
     and takes its emphasis from the figure: value `text-2xl font-semibold` against `text-lg` on
     the others. Labels move to `text-sm text-muted-foreground` (they are a card's secondary line,
     §2), from `text-xs text-foreground`.
  3. `SwitchRow`'s `media` box and `EmptyState`'s icon square use the same neutral surface.
- Files: `apps/web/src/blocks/tile.tsx`, `apps/web/src/blocks/facts.tsx`,
  `apps/web/src/blocks/group.tsx`, `apps/web/src/blocks/states.tsx`
- Priority: P2
- Shared: every `NavRow`, `SwitchRow`, `EmptyState`; `StatTiles` on `cycle`, `txn` and `usage`
- Builder: Haiku, S

### 6. Switch: off reads heavier than on, and as on in dark
- Seen: the off thumb is a large `bg-foreground` disc; in Minted dark the *on* switch is a pale track
  with a dark thumb, the off one close to it (gallery--minted-dark--p3, p5). In Minted light the
  five off switches on *Your apps* are five dark discs, louder than the one switched on
  (apps-suggested--still, apps-suggested-switch--t400).
- Why it matters: a switch must say on or off at a glance. *settings 1*, *start 8* (one fix).
- Change (component, `components/ui/switch.tsx`, as *settings 1* writes it): off is an outlined
  track (`before:bg-muted before:border-2 before:border-muted-foreground/60`) with a small muted
  thumb (`size-4 bg-muted-foreground`, `-translate-x-3`); on is the filled track with a large thumb
  in the fill's foreground (`data-[state=checked]:size-6 data-[state=checked]:bg-primary-foreground
  data-[state=checked]:translate-x-2.5`), the size and travel animated together
  (`transition-[transform,width,height]`, 200 ms, `--motion-ease`). Disabled stays `opacity-50`;
  the 48 px target stays. Update the `// Sen:` note. Check twelve pairs (Firefly dark's primary is
  lemon; Line's cards are rules).
- Files: `apps/web/src/components/ui/switch.tsx`
- Priority: P2
- Shared: every `SwitchRow`: settings, capture's apps, rules, first run
- Builder: Haiku, S

### 7. Segmented: in dark, the chosen option sits lower than the track
- Seen: in Minted dark the chosen *System* is darker than the track around it (gallery--minted-dark--p5):
  `bg-card` (L 0.223) on `bg-muted` (L 0.252), so the raised one looks sunk and the shadow can't show.
- Why it matters: patterns §7, *the chosen one raised*. *records 19*, *settings 13*.
- Change (component, `components/ui/toggle.tsx`, the segment variant): the on state adds
  `data-[state=on]:font-semibold data-[state=on]:ring-1 data-[state=on]:ring-border`, and in dark
  `dark:data-[state=on]:bg-accent` (Sen's `dark` variant is `[data-mode='dark']`), which is lighter
  than `muted` in the dark looks. Check six dark looks; update the `// Sen:` note.
- Files: `apps/web/src/components/ui/toggle.tsx`
- Priority: P2
- Shared: Appearance's mode, Shared bills' *Open · Settled*, Categories' *Categories · Rules*
- Builder: Haiku, XS

### 8. Sheets: a sheet that leads to another screen cuts out instead of falling
- Seen (films `member-remove`, `sheet`, `scan-more-manual`): a sheet closed on its own falls and its
  scrim fades over about 200 ms, as it should (sheet--t0…t200). But a sheet whose choice also
  navigates vanishes in one frame: Members → *Remove*, the sheet is full at t0 and gone at t100
  while Member slides away (member-remove--t0, t100). The cause is in the code: the choice closes
  the sheet and navigates in the same tick, the router runs a view transition, and the open
  `Drawer` is portalled outside `.screen-region`, so it's in the root snapshot, which `motion.css`
  doesn't animate. The same code path runs in `ScanMoreSheet` (*Add manually*), `SenMenu` and screen
  sheets whose rows `go(...)`.
- Why it matters: patterns §8, *a sheet rises from the bottom and falls back*; one thing moving
  at a time. Named by the last QA eyes pass.
- Change (block):
  1. `blocks/sheet.tsx`: add `onClosed?: () => void` to `SheetProps`, wired to vaul's
     `onAnimationEnd={(open) => { if (!open) onClosed?.() }}` on `Drawer`.
  2. Export `useCloseThen(setOpen)` from the same file: `closeThen(fn)` stores `fn`, calls
     `setOpen(false)`, and the sheet's `onClosed` runs it once; under reduced motion
     (`reducedMotionNow()`) it runs `fn` at once. The caller passes the hook's `onClosed` to its
     `Sheet`.
  3. Use it wherever a sheet's choice navigates: `member.tsx`'s `confirmRemove` becomes
     `closeThen(() => { back(); void write(...).then((r) => r && toastDone(...)) })`, so the sheet
     falls, Members slides back, then *Removed Hui Min* rises over Members (the toast's timing in the
     film, about 400 ms, on Members, is already right and stays). Then `ScanMoreSheet` and `SenMenu`
     in `frame/sheets.tsx`, and each screen sheet that calls `go(...)` or `navigate(...)` from a row
     (grep the importers of `blocks/sheet`). Keep `replace: true` where it is: `useBackClose` has
     popped the sheet's step by then, so the replace lands on the screen's own step. Check back from
     the new screen returns to the screen the sheet was on.
- Files: `apps/web/src/blocks/sheet.tsx`, `apps/web/src/frame/sheets.tsx`,
  `apps/web/src/screens/settings/member.tsx`, the navigating sheets in `apps/web/src/screens/`
- Priority: P2
- Shared: Members, Scan's long-press (every tab screen), Sen's ⋯ menu, category and cycle sheets,
  split sheets
- Builder: Sonnet, M

### 9. Toasts: *Undo* is a 24 px button in sonner's style, and a dialog's toast lands on the dialog
- Seen (stills `toast`, `toast-copper-dark`): *Attached to RM58.30 on Ryt* sits in a plain card
  with 13 px text, and *Undo* is sonner's default action: a small filled block about 24 px tall
  with 12 px text, dark in Minted light and grey in Copper dark, unlike any button in Sen. Code:
  `DestructiveDialog` (`blocks/dialog.tsx`) runs `onConfirm` from the action's click, so a delete's
  toast and list motion start while the dialog is still fading out over them; that's the old QA
  note's *toast over its dialog* (the Members sheet's own toast now arrives on time, finding 8).
- Why it matters: *Undo* is the app's safety net for every change (patterns §7, *undo instead of
  confirm*); it must be easy to hit (§8, 48 px targets) and look like Sen. A toast on a closing
  dialog says *done* over the question that asked.
- Change:
  1. `components/ui/sonner.tsx`: `toastOptions.classNames` adds
     `title: 'text-base'`, and `actionButton:` Sen's chip button classes, written out (sonner's
     action isn't a `Button`): `'relative tap min-h-8! rounded-[var(--radius-btn,999px)]! px-3!
     text-label! font-semibold! bg-transparent! text-primary!'`; dark the same (the text colour is
     the token). The toast keeps `--normal-bg` etc. Update the `// Sen:` note.
  2. `blocks/dialog.tsx`, `DestructiveDialog`: the action's click sets a ref and closes; call
     `onConfirm` from `AlertDialogContent`'s `onCloseAutoFocus` when the ref is set, so the change
     and its toast start on the screen once the dialog is gone.
- Files: `apps/web/src/components/ui/sonner.tsx`, `apps/web/src/blocks/dialog.tsx`
- Priority: P2
- Shared: every toast with *Undo* or *Retry* (Review, txn, splits, rules), the update toast's
  *Update*; every dialog (`account`'s delete, claims)
- Builder: Haiku, S

### 10. StepPager: the last step's name is cut off under *1 of 5*
- Seen: Insights' step row ends *Subscriptions · Goa* against *1 of 5* (insights--minted-light--p1,
  every look; gallery--minted-light--p6). Nothing says the row scrolls.
- Why it matters: the first view of a tab root looks broken, and *Year* is hidden. *insights 3*.
- Change (block, `blocks/steps.tsx`, `StepPager`):
  1. A fade on whichever end has more to scroll, as a mask:
     `[mask-image:linear-gradient(to_right,var(--fade-l,black),black_24px,black_calc(100%-24px),var(--fade-r,black))]`,
     with `--fade-l` / `--fade-r` set to `transparent` from an `onScroll` (and on mount) when there's
     more that way.
  2. Move *1 of 5* off the row, to its own right-aligned line above the track
     (`flex justify-end px-4 text-xs text-muted-foreground`), keeping its `aria-live`.
  3. Keep the chosen chip scrolled to the middle, as now.
- Files: `apps/web/src/blocks/steps.tsx`
- Priority: P2
- Shared: `insights`; any later pager (B08 · Charts)
- Builder: Haiku, S

### 11. ReviewRow: Sen's pick looks focused, *Other…* looks like a word, and its edge is off by 4 px
- Seen: the suggested chip has a border and a 2 px ring, like keyboard focus; *Other…* is a ghost
  chip, bare text at the row's end, and in the gallery it wraps to a line of its own
  (gallery--minted-light--p3; review--minted-light--p1). The card's `p-3` puts the question 12 px in,
  where every `GroupCard` row starts at 16 (review--copper-dark--p1, *A balance check is due* below).
- Why it matters: a ringed chip reads as already answered; the way out when both guesses are wrong
  doesn't look tappable. *review 4*, *review 3* (step 4).
- Change (block, `blocks/rows.tsx`, `ReviewRow`):
  1. Suggested: `border-primary bg-primary/8 text-primary` (drop `ring-2 ring-primary/40`); keep the
     sparkle and the `sr-only` words.
  2. *Other…*: `variant="outline"` like the answers, `text-muted-foreground`, with a trailing
     `ChevronRightIcon` (`size-4`, `aria-hidden`).
  3. Card padding `px-4 py-3` (was `p-3`); the answers strip `-mx-4 px-4`.
- Files: `apps/web/src/blocks/rows.tsx`
- Priority: P2
- Shared: every Review question
- Builder: Haiku, XS

### 12. ListRow: marks drop to a third line, and a row not synced keeps the plain colour
- Seen: per *records 9*, a row with a long secondary line and a mark wraps to three lines, so rows
  jump between two heights in a virtualised list; the gallery's long merchant row shows it
  (gallery--minted-light--p3, *Split · In Review* on its own line). Per *records 28*, an amount not
  synced yet stays in the text colour.
- Why it matters: patterns §7, rows have *a stable height, so long lists virtualise*; §3, *not
  synced yet is `money-pending`*.
- Change (block, `blocks/rows.tsx`, `ListRow`): the description line `flex-nowrap` (was `flex-wrap`,
  and drop `text-balance`); the secondary text `min-w-0 truncate`, `Marks` `shrink-0` and rendered
  `flex-nowrap` inside `ListRow` (other callers keep its wrap). When `marks` includes `'pending'` and
  `kind` is `'out'`, the amount takes `kind="pending"`.
- Files: `apps/web/src/blocks/rows.tsx`
- Priority: P2
- Shared: every `ListRow`: `payments`, `account`, Home's and Review's rows, shared bills
- Builder: Haiku, XS

### 13. First run, *Your apps*: the *Suggested* card vanishes and the list jumps under the finger
- Seen (still `apps-suggested`, films `apps-suggested-switch`, `apps-suggested-choose`): before the
  tap the *Suggested* card sits above *Banks and e-wallets*; by the first frame after flipping
  *Touch 'n Go eWallet*, or after *Choose these 4*, the card is gone and the whole list has moved up
  about 130 px (*Banks and e-wallets* from under the card to just below *How it works*). In
  `screens/capture/apps.tsx` the card renders only while `chosen.size === 0`. The next tap lands on
  a different app.
- Why it matters: a list that moves under a tap is how the wrong thing gets chosen. Patterns §8: a
  row removed slides out and the rows below close the gap. Named by the last QA eyes pass.
- Change: keep the card for the life of the step and change it in place. Remember the suggestion
  when the list first arrives (`const [offer] = useState(...)` set once), and show the card while
  `offer.length`. Once every suggested app is on, its contents become the done state at the same
  height: `status="done"`, `CheckIcon`, state *Chosen*, title *Sen will read these 4. Change them
  below.*, no button. A single switch leaves it as it is. Its button is `size="sm"` (*start 4*).
  Anywhere a card must leave a list, it goes through `useChangeMotion` with `rowMotion(id)` on it and
  on the block below, so the gap closes in 200 ms.
- Files: `apps/web/src/screens/capture/apps.tsx`
- Priority: P2
- Shared: `first-run`'s apps step and `settings/capture/apps` (one screen)
- Builder: Haiku, S

### 14. App bar: a back arrow on tab roots, and the action off the 16 px line
- Seen: Review, Insights and More open with ← (review--minted-light--p1, insights--minted-light--p1,
  more--minted-light--p1, every look), so a tab root looks pushed; ← there goes Home. An action on
  the right ends 8 px from the edge where cards end at 16 (*insights 17*).
- Why it matters: the tab bar already says where you are; an arrow promises a screen behind this
  one. *start 6*, *insights 17*, *home 3* (new-look's ← that keeps).
- Change (frame, `frame/app-bar.tsx`):
  1. A `root` prop: no back button, the title at the same size, header `px-5` as the Home branch,
     so the title lines up with the cards' text. Pass it from `review.tsx`, `insights.tsx`,
     `more.tsx`. The back gesture on those still goes Home (`tab-bar.tsx`, unchanged).
  2. Wrap `action` in `pr-2`, so a visible button ends on the 16 px line; an icon-only action keeps
     its 48 px target.
- Files: `apps/web/src/frame/app-bar.tsx`, `apps/web/src/screens/review/review.tsx`,
  `apps/web/src/screens/insights/insights.tsx`, `apps/web/src/screens/more/more.tsx`
- Priority: P2
- Shared: the three tab roots; every screen with an app-bar action
- Builder: Haiku, XS
- Needs the owner: patterns §7 says *on any other screen, back, the screen's title*; tab roots
  without ← bends that wording (§6's back rule is unchanged).

### 15. Scan's long-press sheet: hand-made rows with round icons, and no main choice
- Seen (still `scan-more-manual`): `ScanMoreSheet` builds its three choices from bare `Item`s with
  a round `ItemMedia`, unlike every other list of choices (`NavRow` with a square `IconTile`), and the
  three are equal though *Scan* is the usual one. Its words differ from the Scan screen's (*Add
  manually* here, *Add by hand* there).
- Why it matters: patterns §7, `NavRow` is *a sheet's choices*; one main action. *review 16*,
  *review 26*.
- Change (frame, `frame/sheets.tsx`): *Scan receipt* as the sheet's one main `Button`
  (`size="default"`, full width, `CameraIcon`); under it a label-less `GroupCard` of two
  `NavRow kind="action"` rows, *From gallery* (`ImageIcon`) and *Add manually* (`PencilLineIcon`);
  delete the hand-made `Item`s. Use the one name *review 26* settles on. *Add manually* goes through
  finding 8's `closeThen`.
- Files: `apps/web/src/frame/sheets.tsx`
- Priority: P2
- Shared: every tab screen (the long-press)
- Builder: Haiku, S

### 16. Inputs and arrival focus: a heavy double ring no finger asked for
- Seen: the sign-in email field opens with a 1 px `ring`-coloured border plus a 3 px halo, in every
  look (first-run--minted-light--p1; muddy olive in Firefly dark, first-run--firefly-dark--p1).
  Chromium counts any focus on a text input as `:focus-visible`, so the auto-focused field always
  wears the keyboard ring. New-look's *Keep it* the same (*home 16*).
- Why it matters: patterns §10, *focus rings show for keyboard use only*; the halo makes a calm
  first screen look like an error state. *start 20*, *home 16*.
- Change:
  1. `components/ui/input.tsx` (and `textarea.tsx`): replace the `focus-visible:` classes with
     `focus:border-ring focus:ring-1 focus:ring-ring` (the edge reads 2 px, no halo), and draw the
     3 px halo only for a keyboard: `in-data-[keyboard]:focus-visible:ring-[3px]
     in-data-[keyboard]:focus-visible:ring-ring/50`. The `aria-invalid` classes stay.
  2. `frame/press.ts`: set `document.documentElement.dataset.keyboard = ''` on `keydown` (Tab or
     arrows) and delete it on `pointerdown`, in the listener it already installs.
  3. Buttons focused on arrival: `focus({ focusVisible: false })` (*home 16*), and the same for
     sign-in's code field.
- Files: `apps/web/src/components/ui/input.tsx`, `apps/web/src/components/ui/textarea.tsx`,
  `apps/web/src/frame/press.ts`, `apps/web/src/screens/outside/new-look.tsx`
- Priority: P2
- Shared: every form: `sign-in`, `manual`, `balance-check`, settings forms, Sen's prompt
- Builder: Sonnet, S

### 17. Steps: a second filled button, and labels to tap not set apart
- Seen: the next step's button is always `default`, so a card of steps with a fallback shows two
  filled buttons (*settings 11*, *settings 12*, *start 3*); a step's title can't mark the words of
  the thing to tap (*start 17*).
- Why it matters: one main action per screen (§7.1).
- Change (block, `blocks/steps.tsx`, `Steps`): add `quiet?: boolean`, which draws every step's
  button `variant="secondary"`; let `title` be `ReactNode` (key on index), so a screen can set
  *Open settings* in `<span className="font-medium">`. The screen plans say where to use each.
- Files: `apps/web/src/blocks/steps.tsx`
- Priority: P3
- Shared: capture's access and running steps (Settings and first run), Gmail, ESS
- Builder: Haiku, XS

### 18. Status card and chart card: the state and the answer are the quietest lines
- Seen: `StatusCard`'s state is `text-sm` above a `font-medium` title (gallery p7 *Still changing*,
  *Final*), so the rule reads louder than the state (*records 6*); `ChartCard`'s takeaway, the
  answer to its question, is `text-sm` muted (gallery p9, *RM140.00 more than last cycle*)
  (*insights 4*).
- Why it matters: patterns §7, a status card *states it in words first*; §4, the takeaway *says
  the answer in words*.
- Change (blocks): `blocks/status.tsx`, `StatusCard`: `state` at `text-base font-semibold`, icon
  `size-5`, status colour unchanged. `blocks/charts.tsx`, `ChartCard`: title `text-lg`, takeaway
  `text-base text-foreground text-pretty`, footer `gap-2` (B08 · Charts keeps these when it moves
  the drawing). The words each card carries are the screen plans' (*records 6* steps 2–3).
- Files: `apps/web/src/blocks/status.tsx`, `apps/web/src/blocks/charts.tsx`
- Priority: P3
- Shared: split, claims, payday plan, first run's suggestion; every Insights card
- Builder: Haiku, XS

### 19. Line: two left edges in one card
- Seen: Line's `.card` drops its inline padding (`packages/looks/src/line/look.css`,
  `padding-inline: 0`), but the `Item` rows inside a card keep their own `px-4`: in Review the
  question sits on the 16 px edge and *A balance check is due* 17 px further in
  (review--line-light--p1); in Settings the rule starts at 16 and the tiles at 33.
- Why it matters: one column, one left edge (§7 *Spacing*); Line is the flattest look, where edges
  are all the structure there is.
- Change (look material, `packages/looks/src/line/look.css`): inside the `.card` rule's block add
  `.card [data-slot=item] { padding-inline: 0; }`, so rows sit on Line's one edge, like its card
  content, and move finding 3's insets 16 px left to match:
  `.card > [data-row-mark=tile] { --row-inset: 2.75rem; }`,
  `.card > [data-row-mark=avatar] { --row-inset: 3.25rem; }`, `.card > * { --row-inset: 0px; }`
  before those two. Check Line light and dark in More, Settings, Review and `txn`.
- Files: `packages/looks/src/line/look.css`, `apps/web/src/styles/app.css`
- Priority: P3
- Shared: every card in Line
- Builder: Sonnet, S

### 20. Empty, loading and error blocks: optional parts, a skeleton the wrong shape
- Seen: `EmptyState` takes `icon` and `title` as optional, and the gallery's empty payments shows
  just a line and a button (gallery--minted-light--p8), against patterns' *icon, title, one line,
  one button*. `ListSkeleton` draws a 40 px circle where rows lead with a 32 px rounded square, full
  bleed, where most lists sit in a card (p8). The whole-screen error's button is `sm` (*home 27*).
- Why it matters: patterns §7, *a skeleton shaped like the content*, so nothing jumps when it fades
  into it; one empty state everywhere.
- Change (block, `blocks/states.tsx`): `EmptyState`'s `icon` and `title` required (fix the callers
  the type check finds, each with the icon of the thing that will appear). `ListSkeleton`: the mark
  `size-8 rounded-[calc(var(--radius-card,16px)*0.6)]`, rows `min-h-14 py-2.5` as `NavRow`, and a
  `card` prop that wraps the rows in a `Card` with `mx-4` for screens whose content is a
  `GroupCard`; pass it from `Loaded` callers that render cards (settings and its children).
  `ErrorState`: a `whole` prop that draws its button `size="default"`, passed by `Loaded`
  (*home 27*). Each screen's own skeleton shape stays the screen plans' (*insights 16*).
- Files: `apps/web/src/blocks/states.tsx`, `apps/web/src/screens/kit.tsx`
- Priority: P3
- Shared: every screen's loading, empty and error state
- Builder: Haiku, S

### 21. Sheet: a heavy grab handle
- Seen (stills `sheet`, `member-remove`, `scan-more-manual`): the handle is shadcn's 100 px pill
  (`drawer.tsx`), a heavy grey bar over every sheet's title, which sits close under it.
- Why it matters: a calm sheet; Android's own handle is 32×4.
- Change (component, `components/ui/drawer.tsx`): the handle `mt-2 h-1 w-9 rounded-full
  bg-muted-foreground/40`; add the `// Sen:` note on line 1. In `blocks/sheet.tsx` the title row
  `pt-2` (was `pt-1`).
- Files: `apps/web/src/components/ui/drawer.tsx`, `apps/web/src/blocks/sheet.tsx`
- Priority: P3
- Shared: every sheet
- Builder: Haiku, XS

### 22. Tab bar: *Scan*'s label sits 14 px below the other four
- Seen: in every look the *Scan* caption is lower than *Home · Review · Insights · More*
  (home--minted-light--p1, home--copper-light--p1, home--instrument-light--p1): the raised scan
  button is 52 px with `margin-top: -12px`, so it takes 40 px of flow where the others' icons take
  26.
- Why it matters: five labels on two baselines look like a mistake in the one bar that's on every
  screen.
- Change (frame, `styles/frame.css`): `.tab-scan .scanbtn.cs { margin-top: -26px; }`, so the button
  takes 26 px of flow like the icons and its label shares their baseline; the disc rises 14 px more
  above the bar's top edge. Check all six looks (Instrument's `scanbtn` isn't `.cs`; leave it), and
  that the Sen button and a toast still clear it.
- Files: `apps/web/src/styles/frame.css`
- Priority: P3
- Shared: every screen with the tab bar
- Builder: Haiku, XS

### 23. Block additions the screen plans ask for (one place each)
- Seen: several screen plans need the same new prop or block; listed here so each is built once.
- Change:
  - `MoneyInput` (`blocks/money-input.tsx`): `align?: 'start' | 'center'` (*review 11*: `manual`)
    and `size?: 'lg' | 'md'` (*records 16*: balance check), as those findings write them.
  - `InitialTile` in `blocks/tile.tsx`: a name's first letter on `IconTile`'s square, tones and
    sizes; the account's mark everywhere, replacing `BankTile` (*records 15*).
  - `PersonAvatar` (`blocks/group.tsx`): an optional `seed` (member id or email) for the tint, so
    a person keeps one colour (*settings 25*).
  - `CategoryGrid` (new `blocks/category-grid.tsx`), from `manual`'s tile grid, used by `manual` and
    `CategorySheet`; `CategorySheet` gets `kind: 'category' | 'plain'` (*review 13*).
  - `AppIcon` (`screens/capture/common.tsx`): fills its box (`size-full object-contain`; the letter
    fallback `size-full text-sm font-semibold`, or a lucide `LandmarkIcon` / `WalletIcon` when the
    app's kind is known) (*settings 5*, *start 2*; one fix).
  - `lib/names.ts`, `readableName`: the cases *review 19* and *records 10* list (one change, one
    test file), so a payee reads the same in chips, rows and headers.
  - `lib/dates.ts`: non-breaking spaces inside a date, and *Sep* for *Sept* (*home 22*,
    *settings 25*).
- Files: as listed
- Priority: P3 (each finding keeps its own priority in its screen plan)
- Shared: as each screen plan says
- Builder: Haiku, S each

### 24. The looks' own drawing on Home (pointer)
- Seen: the screen plan for Home found where a look's material reads worse than the others: cards
  drawn as see-through outlines so Minted's rosette runs through them (*home 1*; home--minted-light--p1),
  the backdrop stopping short under the app bar and above the tab bar in Firefly and Mercury
  (*home 7*; home--firefly-light--p1, home--mercury-light--p1), the figure's *RM* barely visible in
  Firefly dark (*home 24*; home--firefly-dark--p1), Minted's microprint sitting on the balance card's
  edge (*home 25*), Line's double rule (*home 26*).
- Change: as the Home plan writes them; one builder unit for the looks (`packages/looks/src/`),
  since each is a look's own drawing and must be checked in its own look, light and dark.
- Priority: as in `home.md`
- Builder: Sonnet

## Keep

- **The motion system** (`frame/motion.ts`, `styles/motion.css`): one 200 ms push on Material's
  easing for all six looks, direction from the history index, a tab tapped crossfades whichever
  way history goes, only the screen region moves so the tab bar plays its look's `switch` live,
  names set only while a transition runs, the shared amount from row to figure, `useChangeMotion`
  starting when data arrives (never around the write), and `useSheetResize`'s guard against its own
  animation. Going back from a payment, the amount flies into its row as designed
  (push-back-back--t100). Fixes 2, 8 and 9 sit on top of it; nothing in it changes.
- **The ripple** (`frame/press.ts`): on `pointerdown`, from the finger, the pressed thing's own
  colour, cancelled at once by a scroll, a tint under reduced motion; no `active:` tints anywhere.
- **The size levels** (D129) in `app.css` and `button.tsx`: 48 / 40 / 32 drawn sizes with the `tap`
  extension, 14 px labels, 16 px inputs. Every button and chip in the shots sits at its level.
- **`GroupCard` + `NavRow` + `IconTile`** as the shape of every hub (More, Settings): calm, a state
  on each row, icons only on destinations. Fixes 3–5 refine them; the structure stays.
- **The detail page set** (`HeaderCard`, `ActionBar`, `FactGrid`), the gallery's p4: the figure
  first, actions as round captioned buttons, facts as label over value.
- **`ReviewRow`'s guards**: one answer at a time, `settleTap`, the toast raised by the row itself.
- **`Money`'s colour rules**: out in the text colour, in green with a `+`, pending and warning with
  words; the spoken `sr-only` text; never truncated.
- **The toast rules** in `blocks/toast.ts`: one at a time, a fresh id after Undo, the update toast
  apart, and the toaster's offsets that keep Undo clear of Sen's button and the tab bar.
- **Each look's tab bar, figure and avatar**: they make the six looks feel different while
  everything else stays put. Fix 22 only moves the scan button's flow, not its drawing.
- **Sheets' back handling** (`useBackClose`), the drawer's `repositionInputs={false}`, toasts
  tappable over a sheet, and a sheet's own close: it falls with its scrim in about 200 ms (film
  `sheet`).
- **`DestructiveDialog`'s shape** (still `dialog`): a short question, one line of consequence,
  *Delete forever* in `destructive` over *Keep it*, both full width.

## Needs the owner

1. **Tab roots without ←** (finding 14; *start 6*): bends patterns §7's app-bar wording for
   Review, Insights and More.
2. **The warning band's colour** (*home 22*): `warn-bg` / `warn-fg` are red in all six looks, so
   the health bar, the `warning` badge (*Not confirmed*, gallery p5) and the `warn` tile read as
   danger beside the amber `money-warning` (*Rejected*, gallery p7). An amber band in
   `money-warning`'s hue would say *check this*. It changes every look's tokens (patterns §2).
3. **Review's answers wrap onto a second row** (finding 11): patterns §2 and §7 say one row that
   scrolls sideways; the code wraps them, by QA's earlier choice (B04 redesign run 2, 10). Keep the
   wrap (the fixes here make a wrapped *Other…* still look like a chip) or go back to one row.
