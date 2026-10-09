# UI patterns

The shared patterns every screen in Sen is built from, written for six looks. Written by `S2`, with
the screens in `../screens.md` and the journeys in `../flows.md`. The `uiux` skill reads this file
first. **A screen uses these patterns; it doesn't invent its own.** If a screen genuinely needs a new
pattern, it's added here first, and works in all six looks before it ships.

The rule behind the whole file is D77's *only materials change*: a look changes what things are made
of, never what they are, where they sit or what they mean. Six looks rotate, four a year, one a
quarter (D78), so anything a person learns in one look must still be true in the next.

## 1. What a look supplies, and what never varies

### What a look supplies

A look is one object, `DIR`, in `directions/src/<look>.js`, and the app will load one of six. The
pages in `directions/` are the working contract; the app ports it. Everything in it is about material.

| Part | What it is |
|---|---|
| `id`, `name` | `minted`, `instrument`, `firefly`, `line`, `mercury`, `copper` |
| `tokens.light`, `tokens.dark` | shadcn/ui's variables, and Sen's money, chart and icon tokens (§2) |
| `extra.light`, `extra.dark` | The look's own variables for its material, such as Minted's `engrave` or Copper's `patina`. Only the look's own drawing code reads them |
| `radius`, `fonts` | Corner radius, and the font families. Fonts are self-hosted from `directions/assets/fonts/` in the app (spec §17) |
| `icons` | The shared icon set's weight and line ends (§5) |
| `icon` | The launcher icon: `background`, `foreground` and `monochrome` layers on Android's 108 dp canvas, and the 24 dp notification silhouette (`small`) |
| `wordmark(mode)` | The Sen wordmark in the app bar |
| `heroFigure(sen, mode, state)` | How the one large figure is drawn: set in type, in dots, in fireflies, in ink, in quicksilver or struck. Always the same number, read out the same way (§3) |
| `strip(day, days, mode, state)` | The cycle strip under the large figure: how much of the cycle has gone |
| `avatar.draw(ctx, size, t, state, mode)` | Sen's avatar, in all eight states (D76): resting, a new note, listening, working, with helpers, answering, paused, done |
| `tabs` | The tab bar's material (D80): `icon(key, on, mode, uid)` draws each tab idle and active on the shared outlines, plus `scan`, `badge`, `bar`, `ind` (the active-tab indicator) and `switch` (extra motion when the tab changes) |
| `reveal` | How it arrives in `new-look`, inside the shared frame (§9). Built in code, in its own slice (D84) |

Everything a look draws is also saved as files in `directions/assets/<look>/` (theme, tokens, icons,
tab bar, marks, data), so the app uses the files, not the pages.

In the app (B01), `tokens`, `extra` and `fonts` aren't fields of the ported `DIR`: they're CSS, generated
from each look's saved `theme.css` into `looks.gen.css` by `pnpm looks` and switched by `data-look`, so
there's one source and a look's colours never wait on its drawing code. Every other part is a field.

### What never varies

| Thing | Same in every look |
|---|---|
| Layout | Every screen in `screens.md`: its parts, their order and their size. One column |
| Navigation | The five tabs, *Home · Review · Scan · Insights · More*, in that order, with those labels; the outline of each tab icon (`directions/assets/tab-outlines.json`); Sen's button bottom right (D68) |
| The badge | Counts *Needs you* only (D72), as a number, up to *99+* |
| Scan | A tap opens the scanner; a long-press opens *Scan · From gallery · Add manually* (D69) |
| Money | The format, and what each money colour means (§3) |
| Charts | Each category hue, its slot order, and what the accent and the grey mean (§4) |
| Icons | Outside the tab bar, one shared set, lucide, with the same icon for the same thing (§5) |
| Words | Every label, message and button. A look never renames anything |
| Behaviour | Undo, sheets, the back gesture, empty, loading, error and offline states (§6, §7) |
| UI motion | 150–250 ms transitions for the interface itself. A look's own motion lives in its own moments: its figure, its tab switch, its avatar and its reveal |
| Accessibility | Contrast, touch targets, labels and reduced motion (§8), checked in every look in light and dark |

## 2. Tokens

Components use semantic tokens only, never a raw colour. Each look sets every token in light and
dark, saved as `theme.css` (OKLCH) and `tokens.json` (hex) in `directions/assets/<look>/`.

| Group | Tokens | Means |
|---|---|---|
| shadcn | `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring` and their `-foreground` pairs | As in shadcn/ui |
| Money | `money-in`, `money-out`, `money-pending`, `money-warning` | §3 |
| Charts | `chart-1` to `chart-3`, `chart-accent`, `chart-context`, `chart-seq-1` to `chart-seq-5` | §4 |
| Icons | `icon`, plus `--icon-stroke`, `--icon-cap`, `--icon-join` | §5 |
| Warning band | `warn-bg`, `warn-fg` | The health bar (§7) and its fix button, through the alert's and button's `warning` variant |

`destructive` is for actions that remove something, never for an amount or an error: an error is
said in words, in the text colour. The money tokens keep their one meaning (§3), so a status card's
*Final* or *Waiting* is in the text colours, and only a warning takes `money-warning`. A look's
`extra` variables are never used by a shared component.

## 3. Money

- **Integer sen in, text out.** `RM1,284.50`: the currency, thousands separators, always two
  decimals, `tabular-nums` where amounts line up in a column.
- **Money in** carries a `+` and `money-in`. **Money out** has no sign and is `money-out`, the plain
  text colour: spending is normal, not alarming. **Not synced yet** is `money-pending`, with those
  words. **A warning** (over budget, *Over by RM215.40*) is `money-warning` with an icon and words.
  Colour is never the only signal.
- **The money colours mean the same in every look.** Each look tunes their lightness to its surfaces,
  never their hue. Green means money in, everywhere.
- **Amounts are never truncated.** A merchant name truncates first.
- **Read out** as "RM 1,284.50", not a string of digits.
- **The large figure** is the only figure a look draws in its own material. Underneath, it's always
  text the screen reader can read, the same digits.
- **Glance surfaces stay at four figures** (spec §9.2).

## 4. Charts

Charts follow the `dataviz` skill. Each card in Insights is a question, a chart, a one-line takeaway
computed by code and *Ask Sen about this* (D73).

### The two ways a chart uses colour

1. **Focus and context.** Most of Sen's charts: *this cycle* against *last cycle*, a bar above its
   typical level, a budget's meter. The thing in focus is `chart-accent`, the look's own ink. Context
   is `chart-context`, a grey. This is the default.
2. **Separate series.** Only when a chart shows parts that are different things, such as *fixed
   costs · spent · left*, or *eating out · groceries*. The parts take `chart-1`, `chart-2`, and so
   on, **in the chart's own fixed order**, never by size, so a part keeps its colour when the numbers
   change.

A chart never mixes the two. **Ordered steps** (the calendar's days shaded by discretionary
spending) use the sequential ramp, `chart-seq-1` (least) to `chart-seq-5` (most).

### The palette

Three hues, the same in every look, in this order: **1 blue, 2 orchid, 3 gold**. Each look tunes
only their lightness: each slot is solved to the same contrast against that look's card, so it
carries the same weight on every surface. `directions/palette.mjs` holds the hues, writes each look's
values into its tokens (`directions/src/charts.js`) and prints the checks; each look's page shows
them in its *Charts* section.

- **Checked with the `dataviz` skill's validator** (vendored as `directions/validate_palette.js`),
  every look, light and dark, **every pair**, not just neighbours, so the slots hold in any order and
  in any legend. The worst pair across all twelve is ΔE 14.4 for colour-blind readers (target 8) and
  22.5 for everyone else (floor 15). Every slot is at least 3:1 on its card.
- **Clear of colours that already mean something.** Money in (green) stays at least ΔE 15 from every
  slot, because nothing but colour says it on a chart. The warning (amber), `destructive` (red) and
  Copper's verdigris stay at least 12 away: the warning and `destructive` always come with an icon and
  words, and the verdigris never appears in a chart. Teal, green, orange and red were left out for
  this reason, and a fourth hue couldn't be found that passed every pair in every look.
- **At most three series.** A fourth thing folds into *Other*, in `chart-context`. That covers every
  chart in spec §9.3: the most it needs is *fixed costs · spent · left*.
- **Categories have no colour of their own.** A chart names categories in words; a chart of
  categories is one series, in the accent and the grey (*Where did it go?*). A category's colour would
  have to come from three hues across eighteen categories, so two would always share.
- **The accent and the grey are the look's own**, its ink: Minted's navy, Instrument's
  black, Firefly's indigo (a lemon in dark), Line's ink, Mercury's umber, Copper's mahogany. Each is at least 3:1 on its card and at least ΔE 15 from the warning colour, so
  *above typical* never reads as *over budget*. That moved two accents: Copper's became a deep
  mahogany in light and a muted copper in dark, and Firefly's dark-mode lemon moved slightly greener.
- **The sequential ramp** runs on the accent's hue, from 2:1 against the card to the accent's full
  strength, in five steps that step evenly in lightness. Days with nothing in them are `muted`, and
  days still to come are an outline.
- **The money colours stay out of charts**, except `money-warning` on a budget at risk, always with
  its icon and words.

### Marks

- Lines 2 px; bars with a 4 px rounded data end, anchored to the baseline; a 2 px gap of the card's
  colour between neighbouring fills; markers at least 8 px with a 2 px ring of the card's colour. A
  tick or marker over a bar (*typical*, *the cycle so far*) is `foreground` with a ring of the card's
  colour, so it shows on any bar.
- Grid lines and axes in `border` and `muted-foreground`, recessive. One axis, never two.
- Two or more series always have a legend, and direct labels where there's room. Text is never in a
  series colour: it stays in `foreground` or `muted-foreground`.
- **Touch, not hover:** a tap or drag on a chart shows its values in a tooltip; the takeaway line
  under it says the answer in words, so the chart is never the only way to get it.
- The context grey sits below 3:1 against the card on purpose. It's recessive, so it never carries
  meaning alone: the legend or a direct label names it.

## 5. Icons

- **The tab bar is the look's** (D80): each look draws the five icons in its own material, idle and
  active, on outlines every look shares, plus its scan button and badge.
- **Every other icon is one shared set, lucide** (D81). The same thing always has the same icon. A
  look tunes only three things, all tokens:

  | Look | Weight (at 24 px) | Line ends | Corners | Why |
  |---|---|---|---|---|
  | Minted | 1.5 | butt | miter | An engraved cut stops square, with sharp corners |
  | Instrument | 1.8 | square | miter | A display segment: heavier, squared off |
  | Firefly | 1.6 | round | round | A light trail: soft ends |
  | Line | 1.5 | round | round | A pen nib's round ends, in ink |
  | Mercury | 1.6 | round | round | An etched channel, liquid ends |
  | Copper | 1.8 | butt | round | Carved: a chisel stops square, the turns stay round |

- **Dots keep their ink.** Lucide draws a dot (the calculator's keys, the warning's *!*) as a
  zero-length line, which butt ends would hide, so in Minted and Copper dots take square ends
  (`--icon-dot-cap`).
- **Colour comes from where the icon sits:** on a surface, `icon` (the look's idle tab colour, at
  least 3:1 against the background); on a filled button, the button's foreground; in a status (a
  warning, *Not synced yet*), the status colour, always beside its words.
- **Icon-only buttons** have an `aria-label`, and a 48 px touch target whatever the icon's size.
- **Not this set:** the launcher icon and the notification silhouette are the look's (`DIR.icon`),
  and Android draws its own system icons.

## 6. Navigation

- **The tab bar** shows on the five tab screens and the screens pushed from them, and hides during a
  task with an end: `first-run`, `payday`, `confirm`, `manual`, `balance-check`, `scan` and
  `split-public` (`screens.md`). The active tab is marked by more than colour: the look's active
  icon, its indicator, and `aria-current="page"`.
- **Review's badge** counts *Needs you* only, and its label reads the count: *5 to review*. It
  updates live, announced politely, never stealing focus.
- **Scan** is the middle tab. A tap opens the scanner at once; a long-press (500 ms, a light haptic)
  opens `scan-more`. Nothing waits for a double tap.
- **Sen's button** floats bottom right on the five tab screens, above the tab bar, and nowhere else.
  It's Sen's avatar in its current state, 60 px, labelled *Ask Sen*. A screen with it keeps room at
  the bottom so it never covers the last row.
- **Android's back gesture** closes Sen's sheet or the top sheet first, then goes back one screen.
  The tab screens are the roots: back on a tab screen other than Home goes to Home, and back on Home
  leaves the app.
- **One navigation.** No sidebar, no second tab row, no hamburger menu. *More* holds the rest.

## 7. Building blocks

### Screens

- **App bar:** the wordmark on Home; on any other screen, back, the screen's title, and at most one
  action on the right. A screen's main action sits in the bottom third, in reach of a thumb.
- **A pushed screen** slides in from the right; a task with an end (`confirm`, `payday`) is full
  screen, with its own *Close* or *Skip*.
- **Health warnings** (spec §18) sit at the top of `home` until fixed: a `warn-bg` bar with what's wrong,
  in words, and one button that fixes it.

### Rows

- **List row** (payments, accounts, shared bills): a leading mark (category or account), the title
  (merchant) and a secondary line (category · account), and the amount on the right, never truncated.
  Marks after the secondary line, as small icons with labels: a receipt, a split, in Review, *Not
  synced yet*, *Filled in*. The whole row opens its detail; there are no buttons inside it. 64 px or
  more, a stable height, so long lists virtualise.
- **Day header:** the date in Kuala Lumpur time, and the day's spending, sticky while its rows
  scroll.
- **Review row:** the question on one line (*RM9.50 · ROTI BAKAR 88*), what Sen knows on the next,
  then its buttons, at most three plus *Other…*. Answering clears it with *Undo*. A suggestion from
  Sen is marked on the button it suggests.
- **Settings row:** a label, its current value or a switch on the right, and a chevron when it opens
  a screen. A row that opens nothing is information, not a control (the heartbeat's checks); a
  version row may hold a long-press (B02's hidden tests). A switch row may lead with an app's icon and
  carry a line under its label, which, on a disabled switch, says why it can't be turned on.
- **Raw notification row** (B02's *Captured on this phone* only, until B07 replaces it): the app and
  the time on one line, then the title and the text as the app wrote them, selectable, line breaks
  kept, with every digit outside an amount masked as stored (D121); the screen's intro says so once. One that might hold
  a one-time code has a muted line under it: *Maybe a one-time code, so its numbers are hidden* (D116).
  When sharing, a checkbox leads and the whole row ticks it.

### Detail page

The amount large at the top, then the facts as label and value rows, then actions as rows at the
foot: *Mark as…*, *Delete*. *Delete* is in `destructive` and still has *Undo*. Where the data came
from is always said: *From Ryt's notification*, *Added by you*.

### Forms

- A `Field` around every input, with its label above and its message below. The first field to fill
  is focused. `inputMode` and `enterKeyHint` match the input.
- **Amounts** are typed as text into a number pad (`inputMode="decimal"`) and parsed straight into
  sen, never through a float. The amount shows large as it's typed.
- Validate on blur and on submit; the submit button stays enabled and says what's missing.
- Never lose what was typed: a form kept open by a sheet or the back gesture keeps its draft.

### Sheets and dialogs

- **Bottom sheets** for choices and short forms, with a grab handle; they close by swipe, scrim tap,
  *Close* or back. **Sen's sheet** is full height, over the screen it was opened from, headed by its
  avatar and *Looking at: Home*.
- **Dialogs** only for something destructive that can't be undone. Everything else acts at once and
  offers *Undo*.

### Toasts and undo

Every change happens at once, with *Undo* in a toast (spec §6.7): recategorising, deleting, marking as a
transfer, linking a repayment. The toast says what happened, in words (*Attached to RM58.30 on
Ryt*), sits above the tab bar, stays 6 seconds or until the next change, and never covers Sen's
button. A toast appears only when the change isn't visible on screen.

### Status cards

A card whose state matters (a split's *Still changing* and *Final*, a claim's status, the payday
plan's *2 of 3 moves done*) states it in words first, with an icon, then what it's waiting for:
*Waiting for Mei and the satay nobody has ticked*. Colour only supports the words.

### Empty, loading, error, offline

- **Empty:** one line saying what will appear here, and the action that fills it. No illustrations.
  A card in Insights with no data isn't shown at all.
- **Loading:** a skeleton shaped like the content, in `muted`, never a spinner over the whole screen.
  There's no pull to refresh: screens update by themselves (spec §5.1, D100).
- **Live updates (D100):** your own actions show at once. What the server decides (matching, a
  split's lock, a receipt being read, Sen) shows its status in words until it arrives. While the
  live connection is down, the screen shows *Updated 2 min ago* in `muted`.
- **Error:** what happened and what to do next, in plain words, with a button that does it. What was
  typed is kept.
- **Offline:** a banner, not an error. What works offline still works, and its rows are marked *Not
  synced yet* (spec §5), only while offline or after 5 seconds, so a normal sync never flickers. What needs the network (Sen, research) says so in place: *Sen needs a
  connection*.

## 8. Motion and accessibility

- **UI motion** explains a change and never decorates: 150–250 ms, easing out on entry. A look's own
  motion stays in its own moments: the figure, the tab switch, the avatar, the reveal.
- **Reduced motion** (`prefers-reduced-motion`): every look's motion settles to its final frame, the
  avatar holds one still frame per state, and nothing loops.
- **Contrast:** text 4.5:1 (large text 3:1), icons and chart marks 3:1, in every look, light and dark.
  The theme section of each look's page measures its tokens.
- **Touch targets** at least 48 px, 8 px apart. Full-width rows that touch (list rows, settings rows,
  a detail page's action rows, §7) are the exception: each whole row is the target, and a
  separator is between them. Nothing depends on hover.
- **Text scales** with the system font size to at least 1.5× without clipping; amounts wrap before
  they truncate.
- **TalkBack** reads every icon-only button by its label, amounts as money, and the large figure as
  its label and amount (*Left until payday, RM1,284.50, 12 days to go*).

## 9. The reveal

`new-look` (D77, D84) is the one full screen a look owns. The frame below is the same in every look;
only the arrival in step 2 is the look's own (`DIR.reveal`).

**When.** The first time the app opens on or after 1 Jan, 1 Apr, 1 Jul or 1 Oct, Kuala Lumpur time,
unless a look is pinned. Never on a first install or on a new device, where there's no old look to
leave. After more than a quarter away, one reveal goes straight from the last look seen to today's.

**The order of events.**
1. **The old look's Home**, as it was left, still and not yet interactive.
2. **The arrival.** The old look gives way in the new look's own motion: the rosette weaving, the
   dots lighting up. Two and a half seconds at most. A tap skips to its last frame.
3. **The card**, over the new Home: the look's name, Sen's new avatar resting, *Keep it* (the main
   button), *Go back*, and a switch, **Change each quarter**, on. Under it, one line: *You can
   change this any time in Settings → Appearance*.

**The choice.** *Keep it* or the back gesture keeps the new look; *Go back* restores the old one for
this quarter. With the switch turned off, the look chosen is pinned: *Keep it* pins the new one,
*Go back* the old one, just as pinning it in Settings → *Appearance* would. Either way the app lands
on Home, and the icon, notifications and widgets follow the choice then, not before.

**Accessibility.** Reduced motion replaces step 2 with a 250 ms crossfade. TalkBack announces *Sen
has a new look: Copper*, and focus starts on *Keep it*. The reveal works offline; the choice syncs
later, like any setting.

**Building and checking it.** Each look's arrival is built in code with its other drawing (§1), in a
slice of its own, before the first quarter change the app lives through. The dev panel has *Play the
reveal*, from any look to any look, in light and dark.

## 10. Web behaviour (D100)

Sen is a web app, but it must never feel like a website, in the shell or in a browser.

- **No browser pull-to-refresh or bounce.** `html, body { overscroll-behavior: none }`; the page
  stays fixed and each screen scrolls inside it (`overscroll-behavior-y: contain`), so lists keep
  Android's stretch.
- **No long-press menus or link previews.** `-webkit-touch-callout: none`, and `contextmenu` is
  cancelled everywhere except text. Scan's own long-press (§6) stays.
- **Text is selectable only where it's text:** fields, Sen's messages, notes, notification text and
  sources (`user-select: text`); everything else is `user-select: none`. Amounts get a *Copy* button
  instead.
- **No tap highlight, no double-tap zoom:** `-webkit-tap-highlight-color: transparent`,
  `touch-action: manipulation`; images aren't draggable.
- **Zoom:** none in the shell. Browsers keep pinch zoom, for accessibility. Inputs are at least
  16 px, so iOS doesn't zoom when you tap one. The receipt photo has its own pinch and pan.
- **The viewport:** `width=device-width, initial-scale=1, viewport-fit=cover,
  interactive-widget=resizes-content`, `dvh` units, and the shell's safe-area insets
  (`--safe-area-inset-*`) under Android 16's edge-to-edge drawing. The keyboard never covers the
  number pad.
- **Focus rings** show for keyboard use only (`:focus-visible`).
- **Back:** in the shell, §6's rules. In a browser, each sheet adds a history step, so back closes
  it.
- **Nothing reloads under you.** A new deploy applies only at a safe moment: on Home, with no draft
  and no sheet open. Drafts are kept, so a WebView Android killed in the background reopens where it
  was.
- **External links** open in the phone's default browser, never inside the app (spec §17).

## Confirmed defaults

`S2` chose these while writing this file, and the owner confirmed all six on 7 Oct (D83).

1. **Three chart hues, and categories without colours of their own** (§4). A chart colours its
   series by slot, in the chart's fixed order; each slot's hue is the same in every look.
2. **Back on a tab other than Home goes to Home**; back on Home leaves the app.
3. **Scan's long-press opens after 500 ms**, with a light haptic.
4. **A toast stays 6 seconds**, or until the next change.
5. **The badge stops at *99+*.**
6. **A list row is at least 64 px tall.**
