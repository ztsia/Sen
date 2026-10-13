# B04 · Redesign: calm, card-based screens

Branch `B04/redesign`, from `main` after B04 (D130). The owner's phone review (13 Oct): the main
tabs are fine, but most other screens read as plain lists of text, where information and actions
look alike and nothing says what to look at first. D129 fixed sizes; this fixes **structure**.

**Why it happened:** `patterns.md` §7 told detail pages to be "label and value rows, then actions as
rows", and settings to be "label, value, chevron". The briefs asked for correct data and states, not
for what's primary on each screen. So the fix starts in the patterns, then the screens.

## Rules for every screen

1. **Say what's primary.** Each screen has one thing to look at first (a figure, a status, a
   question) and at most one main action at 48 px. Everything else steps down by D129's levels.
2. **Cards, not hairline lists.** Rows sit in grouped rounded cards (`Item` group inside a `Card`,
   radius `--radius-card`), with a small section label above the card. No full-bleed dividers.
3. **Icons on everything you go to or do.** A destination or action leads with an *icon tile*: a
   lucide icon (16 px) on a 32 px tinted square. Information doesn't get a tile.
4. **Information and actions never look alike.** Facts go in a *fact grid* (label above value, two
   columns). Actions go in an *action bar* (round 40 px icon buttons with a caption under each), or
   one button. Rare and destructive actions go behind a ⋯ menu (`DropdownMenu`), still with *Undo*.
5. **A row says its state.** A destination row shows a short current value: *4 apps · running*,
   *2 to submit*, *Minted*. You shouldn't have to open it to know.
6. **Show visual choices visually.** Looks are previews, modes have icons, categories are icon tiles.
7. **Explain once, briefly.** At most one line of intro per screen. Longer how-tos go in a *steps*
   block or behind *How it works*.
8. **Long things get a screen, not a sheet.** A sheet holds a choice or a short form.
9. **Empty and missing states use `Empty`** with an icon, a title, one line and one button. Never
   bare text plus a button.
10. **Categories have colour.** A category's tile takes its hue from the look's chart palette
    (`patterns.md` §4), so a list can be scanned by colour, with the icon carrying the meaning.

## New building blocks (phase 1, the main session builds these)

All are in `apps/web/src/blocks/`, composed from shadcn parts, and shown in `/dev/gallery` in every look.

| Block | Made of | For |
|---|---|---|
| `IconTile` | a lucide icon on a tinted square; `tone`: neutral, accent, category hue, warn | Leading every destination and action row |
| `GroupCard` | `Card` + `ItemGroup`, an optional label above it | Every list of rows outside the long lists |
| `NavRow` | `IconTile`, title, state on the right, chevron | Settings, More, hubs |
| `FactGrid` | 2 columns; label (caption) above value (body); a cell can be tappable | Detail facts |
| `ActionBar` | 3–4 round icon buttons with captions; the last can be ⋯ | Detail actions |
| `HeaderCard` | a large mark, the title, the figure, one meta line, where it came from | Top of a detail screen |
| `StatTiles` | 2–3 figures with captions, side by side | Usage, the cycle sheet, the year |
| `Steps` | numbered steps in a card, each with an optional `sm` button and a done state | Capture's setup, Gmail setup, the ESS steps |
| `ChoiceCards` | a grid of selectable cards with a preview slot, a ring and a ✓ when chosen | Looks, payday rule |
| `Segmented` | a `ToggleGroup` with an icon and a label per option | Mode, Open/Settled, Categories/Rules |
| `StepPager` | a row of named steps on top, with horizontal scroll-snap cards below, one at a time and no peek | Insights |
| `PersonRow` | an initials avatar, a name, a state badge, an amount | Splits, members |

## Screen by screen

The owner's notes are marked ★. "Fit" means no scroll at 390×844 in all six looks.

| Screen | What's primary | Changes |
|---|---|---|
| ★ `home` | Left until payday | **Fit.** The payday plan becomes a one-line strip (icon, *Payday plan · 2 of 3*, chevron) shown only while active. Tighter hero spacing; `PaceSpark` 64 px tall; Sen's note clamped to 2 lines with *More*. An e2e test asserts no scroll in every look |
| ★ `review` | The next question | Grouped by kind under icon headers (*Categories · 8*, *Splits*, *Checks*, *New wording*). Each item is a card: the amount and payee semibold, one muted line, then `chip`-sized answers in one scrolling row (they're 40 px Toggles today; that's the "button bigger than the title" bug). Sen's pick gets a sparkle icon and an accent outline. *Apply all* becomes a compact banner with an `sm` button |
| ★ `insights` | The card you're on | A `StepPager`: named steps on top (*On track · Budgets · Subscriptions · Goals · Year*), one card per page with a swipe or a tap on a step, and *2 of 5* shown. The cycle picker stays above |
| `more` | Where to go | A `GroupCard` of `NavRow`s with states: Payments *1,151*, Shared *RM24.40 owed to you*, Accounts *5*, Claims *2 to submit* |
| `cycle` (sheet) | Left until payday | `StatTiles` (in, spent, left, with left emphasised); the estimate as a card with an icon |
| `payday` | The step you're on | A segmented progress bar for *Step 1 of 4*; claims in a `GroupCard` with icons; *Undo* as a ghost `sm` button |
| `skipped` | Each notification | One card each: the app's tile and time, the title semibold, the text clamped to 2 lines; *This was a payment* as a chip with an icon |
| `manual` | The amount | The amount large and centred; categories as a 4-column grid of icon tiles, not 18 text chips; *Paid from* and *When* as `NavRow`s in one card; *More details* as a ghost disclosure |
| `scan` | Take a photo | Three tips as icon rows (flat, in the light, the whole receipt); *Take a photo* main, *From gallery* secondary, *Add by hand* a link |
| `confirm`, `receipt`, `crop`, `reading` | The receipt | The image in a card on top; items in a `GroupCard`; totals in a `FactGrid`; one main action. The missing states use `Empty` |
| `payments` | The list | Rows keep D129's sizes; the category mark becomes a hue-tinted `IconTile`; the search field gets a search icon |
| `accounts` | The total | Accounts in a `GroupCard` with bank-initial tiles and a *Checked 1 Oct* / *Not checked* badge; *Elsewhere* in a muted card |
| `account` | The balance | `HeaderCard`; a `FactGrid` (opening balance, fed by, last checked); an `ActionBar` (*Check*, *Payments*, *Ask Sen*); recent payments in a card |
| `balance-check` | Each bank's figure | One card per account: the tile, the name, *Sen has RM…* muted; the input; *Matches* as a chip with ✓; the difference shown live |
| ★ `txn` | The payment | `HeaderCard` (category tile, payee, amount, *Today 19:58 · Ryt Bank*, *From Ryt Bank's notification*). A `FactGrid`: Category (a tappable chip with its icon), Your share, Note. An `ActionBar`: *Receipt*, *Split*, *Ask Sen*, ⋯ (*No receipt*, *Mark as…*, *Delete*). The receipt's state as its own small card |
| `shared` | What's open | A `Segmented` Open/Settled; each bill a card with a stack of avatars, a status badge, and *you owe* / *owed to you* in colour |
| ★ `split` | Who's done | The header and status card stay. People become `PersonRow`s in one card; the QR moves into the *Share* sheet; items go in a `GroupCard` |
| `split-public` | Ticking your items | A header card with the payer's avatar; items as a check list in one card; a sticky *I'm done* as the main action |
| ★ `claims` | What to submit | Each month a summary card (*September · 2 to submit · RM152 of RM200*, with a bar) holding its claims with status icons. *Send to ESS* is the one main action; *Download pack* moves to the app bar. The stand-in text goes |
| `claim` | Its status | A stepper (*Draft → Ready → Sent → Approved → Paid*); evidence as a thumbnail grid; a `FactGrid` (amount, cap, due) |
| `budgets` | At risk | Each budget a card: category tile, bar, status badge. *Add a budget* moves to the app bar |
| `subscriptions` | Committed a month | Each one a compact card (tile, name, per month, next renewal); history collapsed to *4 matched* and expandable |
| `goals`, `goal` | Progress | Goal cards with a progress ring, *RM2,950 of RM6,000*, and *needs RM610 a cycle*; the goal screen has a large ring, a `FactGrid` and contributions in a card |
| `insights/year` | The year | The chart card stays; the savings rate as a stat tile; relief tags in a `GroupCard` |
| `agent/memory` | The notes | One card each with an icon; *Forget* as an icon button with a label for screen readers |
| `agent/research` | The briefs | Cards with status badges and the number of findings |
| `agent/usage` | This month | `StatTiles` (used, estimated cost); what used it as one stacked bar with a legend, not rows |
| ★ `settings` | Where to go | A profile card on top (avatar, name, email); `GroupCard`s of `NavRow`s with states: Appearance shows a thumbnail of the look, Capture *4 apps · running*, Claims *2 schemes*, Sen *RM3.80 this month* |
| ★ `settings/appearance` | The look | Mode as `Segmented` with Monitor, Sun and Moon. *Changes each quarter* as a switch card on top, with the next change date. Looks as `ChoiceCards`, 2 columns, each a live mini preview drawn in that look (its background, hero figure in its font, accent, a tab-bar strip) |
| ★ `settings/categories` | Your categories | `Segmented` Categories / Rules. **Categories:** a grid of hue tiles with names, tapping one opens its sheet. **Rules:** each one a sentence card (*When the payee has "ZUS" → Drinks & desserts*), with where it came from (*from your answer, 3 Oct*). One intro line says what a rule is |
| ★ `settings/claims` | Your schemes | Each scheme a card that reads as one sentence (*Phone bill: up to RM100 a month, submit by the 25th, from spending you tag*) with an edit icon. ESS is one connection card: signed in, payslip steps recorded, the sender address, with *Teach again* and *Forget password* behind ⋯ |
| `settings/capture` | Is capture running | The status card stays; setup becomes a 3-step checklist (`Steps`: Your apps ✓, Access ✗, Keep running ✗); *Captured on this phone* a `NavRow` |
| `capture/apps`, `access`, `running` | The next step | A 1-line intro, with *How it works* as a disclosure; `Steps` cards with `sm` buttons per step; the status card on top |
| `settings/you` | Your names | Payday as `ChoiceCards` (one line each, so *Last working day* doesn't wrap); sharing as a switch row in a card |
| `settings/email` | Your address | The address in a card with an inline copy icon button; Gmail setup as `Steps`, collapsed once confirmed; the code card; *Received* as a `NavRow` |
| `settings/sen` | Sen's settings | `NavRow`s with icon tiles: Calendar (*Not connected*, with a *Connect* `sm` button), Memory *4 notes*, AI credit *RM3.80 this month* |
| `settings/members` | The people | *Invite* in the app bar; seats as a small meter (*2 of 20*); people as `PersonRow`s with status badges |
| ★ member (was a sheet) | Their access | **A pushed screen**: header (avatar, email, status); access switches in one `GroupCard`; phone and usage cards; *Remove* at the foot in `destructive` |
| `settings/data` | Export | An export card with an icon, one line and a button; backups as a `NavRow` with its state |
| `settings/account` | The account | Groups for *About* (version) and *Account* (*Sign out*, *Delete account* in `destructive`) |
| `sign-in`, `first-run` | The one field | Centred, with the look's avatar or wordmark large above; one field; one main action |
| `new-look` | The reveal | Unchanged: it's the look's own (D84) |

## Phases and who does what

1. **Ground (main session, Opus).** Rewrite `patterns.md` §7 to these rules and blocks. Build the
   blocks in the gallery. Rebuild **`txn`** and **`settings`** plus **`settings/appearance`** as
   reference screens. Push, so *Sen review* updates, then the owner checks them on the phone. Keep
   working on phase 2 meanwhile, unless the owner redirects.
2. **Batches** (each owns its files; run in parallel, in the background, with a dev server port each):
   - A, Sonnet: `review`, `home` (fit), `insights` (`StepPager`)
   - B, Sonnet: `split`, `split-public`, `shared`, `claims`, `claim`, `settings/claims`
   - C, Sonnet: `settings/categories`, member screen, `settings/members`, `manual`, `scan`, the receipt screens
   - D, **A/B test**: `budgets`, `subscriptions`, `goals`, `goal`, `insights/year`, `agent/*` (some judgment)
   - E, **A/B test**: `more`, `settings/capture` and its steps, `you`, `email`, `settings/sen`, `data`, `account`, `accounts`, `account`, `balance-check`, `cycle`, `payday`, `skipped` (mostly copying the references)
3. **Sweep (Haiku).** Before and after screenshots of every screen in all six looks, light and dark,
   checked against the rules above; e2e text and selector fixes from a list of failures.
4. **QA**, then the PR *B04 · Redesign*.

### The Haiku A/B test (owner's request, 13 Oct)

Batches D and E each run **twice from the same brief**: once on Sonnet, once on Haiku (low effort),
each in its own worktree (`isolation: "worktree"`) and port, with no e2e runs. Then compare:
- cost and time per agent (`node scripts/usage.mjs`)
- how many fixes the main session's review needed, and whether any were contract slips
- screenshots against the references

Keep the better diff per batch and drop the other. Log the result in `docs/usage.md` and in
CLAUDE.md's *Models and subagents*, as a rule for which batches go to Haiku.

### Briefs stay small

The design is written once, in this file. It's the record the owner and the next session need
anyway, and every agent reads its own rows. An agent's prompt is a pointer, about 15 lines:
- which rows of this file to build
- the reference screens to match (`screens/more/txn.tsx`, `screens/settings/settings.tsx`)
- the files it owns, and which files others are editing at the same time
- its port, and its checks: typecheck, lint, unit tests, screenshots of its screens in Minted
  light, Copper dark and Line light into `qa-artifacts/redesign/<batch>/`
- *don't commit; wait for long runs to end; report in at most 15 lines*

If a prompt would come out longer than the diff it asks for, the main session makes the change itself.
