# Settings: polish plan

Area: `settings` and every `settings/…` (catalogue ids in `apps/web/e2e/catalogue.ts`). Audited from
the 390×844 captures in every look for the hub and Minted light and dark for each sub-screen, plus
the Rules tab, the category sheet and the invite sheet (`own/settings/`), against
`docs/ui/patterns.md`, `docs/workflow/uiux.md`, the uiux phone checklist and `qa/escapes.md`.

Reading the plan: findings are in priority order. *Shared* says which other screens the same fix
reaches; fixes at the block level (`blocks/group.tsx`, `blocks/tile.tsx`) also belong to
`components.md`, so the main session should merge duplicates there.

## Findings

### 1. Switch: an off switch reads as on in dark, and heavy in light
- Seen: `settings_capture_apps--minted-dark--p1.png`, `--p2.png`: every app's switch is off, and
  each shows a bright white thumb on a dark track. On `settings_appearance--minted-dark--p1.png` the
  one switch that is on (*Change each quarter*) shows a light track with a dark thumb. So in dark,
  off looks lit and on looks dark. In light (`settings_capture_apps--minted-light--p1.png`) every off
  switch has a big navy thumb, ten heavy dots down the list, which reads as "all set".
- Why it matters: Your apps decides which bank apps Sen reads (D86). A person scanning the list
  can't tell at a glance which are on, and in dark will believe the opposite. That's a trust
  failure on a privacy setting, and a state carried by colour alone is weak in any case (patterns §8).
- Change: in `components/ui/switch.tsx`, follow Android's own switch: off is an outlined track with
  a small, muted thumb; on is a filled track with a large thumb in the fill's foreground.
  - Thumb, off: `size-4 bg-muted-foreground` (was `size-5 bg-foreground`), translate `-translate-x-3`.
  - Thumb, on: `data-[state=checked]:size-6 data-[state=checked]:bg-primary-foreground`,
    `data-[state=checked]:translate-x-2.5` (thumb size animates with the translate, `transition-[transform,width,height]` at 200 ms on `--motion-ease`).
  - Track, off: keep `before:bg-muted`, make its border `before:border-2 before:border-muted-foreground/60` so
    the off track is an outline that shows on every card; on: unchanged (`before:bg-primary before:border-primary`).
  - Disabled stays `opacity-50`.
  Check in all twelve look-and-mode pairs (Line's cards are rules, Firefly dark's primary is lemon).
- Files: `apps/web/src/components/ui/switch.tsx` (update its `// Sen:` note)
- Priority: P1
- Shared: every `SwitchRow` (Your apps, Appearance, Categories, Claims, Sen, Members, Member,
  first run's apps step, the reveal's *Change each quarter*)
- Builder: Sonnet, S

### 2. Members: an amount with no label next to each friend
- Seen: `settings_members--minted-light--p1.png`, dark: *Hui Min … RM3.40*, *Farid … RM5.00*, no
  word for what it is. Every row also has an *Active* or *Invited* badge, and *Hui Min*'s line
  breaks as *huimin@example.com* / *· Android shell*, the second line starting with a dot. The hub
  says *Members · 2 of 20* while the list shows three people (2 is the shell seats).
- Why it matters: D52 promises the admin never sees anyone's money; an unlabelled RM figure beside
  a friend's name looks exactly like their money (it's their AI credit). That's the trust question
  for a finance app. A badge on every row is noise; a status matters when it isn't the normal one.
- Change (`screens/settings/members.tsx`, `screens/settings/settings.tsx`):
  - Trailing: `RM3.40 credit` (or *Unlimited*), in `text-sm text-muted-foreground`.
  - Second line: *Android shell* or *Browser* only; the email moves to the member's own screen
    (it's in its header). No wrap, no leading dot.
  - Badge only when not active: *Invited* (`outline`), *Suspended* (`warning`). Same on the member
    header card.
  - Hub row *Members*: value `${members.length} people` (*3 people*); the seats stay on Members'
    own card.
- Files: `apps/web/src/screens/settings/members.tsx`, `apps/web/src/screens/settings/member.tsx`,
  `apps/web/src/screens/settings/settings.tsx`
- Priority: P1
- Shared: none
- Builder: Haiku, S

### 3. Member: three giant amounts and a big red *Remove* make the screen loud
- Seen: `settings_member--minted-light--p2.png`, `--p3.png`, dark. Under *Credit settings*, one card
  holds *Grant or refund* (*RM 0.00* at figure size, then *Grant* and *Refund*), *Monthly
  allowance* (*RM 2.00* at figure size, then *Save allowance*), *Daily ceiling* (*RM 1.00*, then
  *Save ceiling*): three 40 px amounts and four buttons in one card. Then *Suspend* (full width)
  and *Remove*, a full-width filled red button at 48 px: the loudest thing on the screen. In dark it's
  a salmon slab. The header card's name *Hui Min* is body size under a 56 px avatar
  (`--p1.png`), smaller than the switch titles' weight suggests.
- Why it matters: the first thing the eye lands on when you scroll is a red *Remove* (D130 rule 1:
  one thing primary, rare and destructive actions behind ⋯, rule 4). Three large amounts read as
  three balances, not three settings, which is a money-trust problem: *RM 0.00* looks like her balance.
- Change (`screens/settings/member.tsx`):
  - *Credit settings* becomes rows that say their state (§7.5), each opening a sheet with one
    `MoneyInput` and one button (a short form, §7.8):
    *Unlimited* (`SwitchRow`, as now); *Monthly allowance* `NavRow` value *RM2.00* → sheet with the
    `AmountEditor` and *Save*; *Daily ceiling* `NavRow` value *RM1.00* → sheet with *Save*; *Grant
    or refund* `NavRow` (no value) → sheet with the amount, *Grant* (main) and *Refund* (secondary).
    Hide the allowance and ceiling rows while *Unlimited* is on.
  - *Suspend* / *Let them back in* and *Remove* (or *Resend* / *Revoke* for an invite) move into an
    app-bar ⋯ `DropdownMenu` (`AppBar action`), *Remove* and *Revoke* as `variant="destructive"`
    items. *Remove* keeps its confirm sheet. Nothing destructive at the bottom of the page.
  - `HeaderCard` (`blocks/facts.tsx`): when there's no `figure`, the title is the primary element:
    `text-xl font-semibold` instead of `text-base font-medium`.
  - App bar title: the person's name instead of *Member*, and the header card keeps it too (as txn
    keeps the merchant in both).
- Files: `apps/web/src/screens/settings/member.tsx`, `apps/web/src/blocks/facts.tsx`,
  `apps/web/src/screens/settings/parts.tsx` (`AmountEditor` reused inside the sheets)
- Priority: P1
- Shared: `HeaderCard` without a figure elsewhere (accounts, goals: check with `records.md`,
  `insights.md`)
- Builder: Sonnet, M

### 4. Claims: the ESS card is five row shapes, with dividers that come and go
- Seen: `settings_claims--minted-light--p1.png`, dark. In one card: *Signed in to ESS* (tile, then a
  *Signed in* badge saying the same words again, then ⋯); *Fetch payslip* (no tile, text at the
  card's edge, a badge); *Submit claims* (no tile, a badge, then *Teach Sen* and *Import recipe*
  indented 60 px, under nothing); *Last payslip fetched* (a fact); *ESS email address* (tile, value
  broken as *ess-* / *noreply@example.com*). A hairline shows under *Fetch payslip* and *Submit
  claims* but not under the others. Above it, each scheme row carries its own *Edit* button, which
  squeezes the scheme's line into three short lines.
- Why it matters: this is where a person connects their employer's portal; it looks like a form
  half-assembled, the opposite of the trust it needs. A row with a button inside breaks *a row is
  one control* (patterns §7, Rows), and a broken email address is the "cut off" the eyes pass flags.
- Change (`screens/settings/claims.tsx`):
  - Schemes: each scheme is a `NavRow` whose `onOpen` is `askSen(editScheme(c.name))`, with
    `trailing={<SenMark />}` and no chevron (`kind="action"`, #9). Drop the *Edit* button. The row
    keeps its D135 avatar, the description gets the full width.
  - ESS row 1: title *ESS*, badge *Signed in* (or *Not signed in* with its *Sign in to ESS* button as
    now), then ⋯. No repeated words.
  - Each capability (*Fetch payslip*, *Submit claims*): use `ActionRow` from `settings/parts.tsx`
    (title, line, its buttons in `ItemFooter` aligned with the title, no indent). Widen
    `ActionRow`'s `value` to `ReactNode` so the *Recorded* / *Not recorded* badge sits in it.
    Remove the wrapping `<div>` and the `pl-15` button row.
  - *ESS email address*: the address goes in the row's `description` with `wrap-anywhere`, value
    omitted, chevron kept; *Not set* when empty.
  - Move the three `Sheet`s and the `DestructiveDialog` out of the `GroupCard`'s children (render
    them after it), so nothing but rows sits in the card.
- Files: `apps/web/src/screens/settings/claims.tsx`, `apps/web/src/screens/settings/parts.tsx`
- Priority: P1
- Shared: the divider half is #10
- Builder: Sonnet, M

### 5. Your apps: app icons are clipped and their initials sit off-centre
- Seen: `settings_capture_apps--minted-light--p1.png` and dark: each app's initial (*T*, *R*, *M*,
  *G*) sits low and right in its tile, as if the tile were cropped. In the shell, with real icons,
  the same crop cuts the outer ring off every bank's logo.
- Why it matters: logos are how people recognise their bank (TNG's blue, Public Bank's red). A
  cropped logo looks broken and makes the one list that governs capture look careless.
- Change: `AppIcon` draws `size-10` (40 px), but `SwitchRow`'s `media` slot is a 32 px box with
  `overflow-hidden`. Make `AppIcon` fill its box: the `<img>` `className="size-full object-contain"`,
  the fallback `<span>` `size-full` with `text-sm font-semibold` (13 px reads better in 32 px).
  Wherever else `AppIcon` is used outside `SwitchRow`, wrap it in a `size-10` box at that call site.
- Files: `apps/web/src/screens/capture/common.tsx` (`AppIcon`); check `grep -rn AppIcon apps/web/src`
- Priority: P1
- Shared: first run's *Your apps* step, *Captured on this phone* if it shows app icons
- Builder: Haiku, S

### 6. Settings hub: the look swatch reads as a switch that's off
- Seen: `settings--*--p1.png`, every look, light and dark. On the *Appearance* row, after *Minted*,
  a 40×28 rounded box with a tall dot and a short grey dot: the exact shape of an off toggle. In
  Copper it's a copper bar and a grey dot, which reads as a switch half on.
- Why it matters: a person reads "Appearance is off" and taps the pill expecting it to flip. A
  trailing control that isn't one breaks *information and actions never look alike* (patterns §7.4)
  and the uiux *Tapping* question.
- Change: in `LookSwatch` (`screens/settings/look-preview.tsx`), draw a 20 px circle instead of the
  pill: `size-5 rounded-full border border-border` whose fill is the look's `bg-primary` with an
  inner 8 px dot of `bg-background` (or a half-and-half `bg-[linear-gradient(135deg,var(--primary)_50%,var(--background)_50%)]`
  made from tokens), keeping `data-look`/`data-mode` so it paints in its own look. No pill shape,
  no two-dot layout. Keep `aria-hidden`.
- Files: `apps/web/src/screens/settings/look-preview.tsx`
- Priority: P1
- Shared: none (only the hub uses `LookSwatch`)
- Builder: Haiku, S

### 7. Sheet: scrolled content runs over the description line
- Seen: `own/settings/invite-sheet-scrolled-end--viewport.png`: scrolled up, the switches' text draws
  over *They get an email with a link… never their money.*, two lines of text on top of each other.
  `own/settings/category-sheet-scrolled-end--viewport.png`: the content slides up under *A spending
  category* with no edge, so *Name* sits glued to it. Minted light.
- Why it matters: overlapping text looks broken, in the sheet where you hand a friend access.
- Change: in `blocks/sheet.tsx`, the description belongs to the fixed header: move `DrawerDescription`
  inside the header `div`, under the title (wrap title and description in a `flex min-w-0 flex-1
  flex-col gap-0.5` column; the close button stays at the right of the title line), so the
  `border-b` sits under both. The scroll area then starts below the border and clips
  (`overflow-y-auto`, check `.scroll-area` sets it). With no description, nothing changes.
- Files: `apps/web/src/blocks/sheet.tsx`
- Priority: P1
- Shared: every sheet with a description (txn, review, categories, members, claims, Sen settings).
  Belongs with `components.md`.
- Builder: Sonnet, S

### 8. NavRow: the title wraps to two lines before its value does
- Seen: `settings--minted-light--p1.png` (and Minted dark, Copper, Mercury, Firefly, Instrument):
  *Export and backups* breaks into two lines beside *Backed up Sat, / 17 Oct*, which also breaks.
  Firefly (`settings--firefly-*--p1.png`): *0 apps · not / listening* breaks while *Capture* has room
  to spare. Line, with a narrower font, keeps both on one line, so the same row is a different
  height in different looks.
- Why it matters: two ragged two-line columns in one row is the "cramped" the owner feels. The
  name is what a person scans for; it should stay whole. Layout must not vary by look (patterns §1).
- Change, in `NavRow` (`blocks/group.tsx`):
  - `ItemContent`: replace `basis-24` with `basis-auto min-w-[min(100%,max-content)]`, so the title
    never wraps unless it alone is wider than the row; the row already `flex-wrap`s, so at 200 %
    text the value drops under the title instead (keeps the lived-in fix).
  - `ItemActions`: drop `max-w-[48%]`, add `min-w-0 flex-1 justify-end`, and the value span
    `text-balance` (was `text-pretty`), so a value that must wrap wraps evenly.
  - Then shorten the hub's longest values so they fit one line at 390 px: *Export and backups* →
    value `dayLabel(...)` alone (*Sat, 17 Oct*) with no "Backed up" (the row title says what it is),
    and *Capture* → `${n} apps` when listening, *Not listening* otherwise (the count matters less
    than the problem).
- Files: `apps/web/src/blocks/group.tsx`, `apps/web/src/screens/settings/settings.tsx`
- Priority: P2
- Shared: every `NavRow`: More, the hubs, Accounts, Account, Claims, Members, txn's linked rows.
  Coordinate with `components.md`. Re-run `e2e:lived` (200 %, 360×640) after.
- Builder: Sonnet, M

### 9. NavRow: a chevron on rows that act at once, so a tap does something unexpected
- Seen: `settings_account--minted-light--p1.png`: *Sign out*, *Sign out everywhere* and *Delete
  account* each end in a chevron, the same chevron as rows that open a screen. *Sign out* signs you
  out on the spot.
- Why it matters: a chevron promises "this opens something" (patterns §7: *a chevron when it opens
  something*). A person taps *Sign out* to see what it says and is signed out. Actions and
  destinations then look alike (§7.4).
- Change: add `kind?: 'open' | 'action'` to `NavRow` (default `'open'`). `'action'` keeps the tile,
  title and press ripple, and draws no chevron. Use `kind="action"` on Account's three rows, and on
  any other row whose `onOpen` acts rather than navigates (search for `onOpen={() =>` calls that
  don't call `go(`/`navigate(`/open a sheet in the settings screens and fix each).
- Files: `apps/web/src/blocks/group.tsx`, `apps/web/src/screens/account.tsx`, and the rows found
- Priority: P2
- Shared: any action row in Settings and More
- Builder: Sonnet, S

### 10. GroupCard: row dividers are invisible except where a row is wrapped
- Seen: every Settings card. The hub's rows (`settings--minted-light--p1.png`) have no dividers; the
  Claims ESS card has dividers under only the rows wrapped in a `<div>`; `settings/capture/captured`'s
  raw rows (built differently) have full-width dividers.
- Why it matters: the same card looks different on different screens. `GroupCard` says "rows inside
  are divided" and patterns §8 says a separator sits between full-width rows; today that holds only
  by accident. Cause: shadcn's `Item` sets `border border-transparent`, which beats `divide-border`'s
  zero-specificity colour, so an `Item` placed directly in the card draws a transparent divider.
- Change: make the divider `GroupCard`'s job and visible everywhere. In `components/ui/item.tsx`,
  move `border-transparent` so it doesn't override a parent's divide colour (for instance apply it
  only with `data-[variant=default]:not-in-data-[slot=card]`, or drop the base border and give the
  `outline` variant its own), then in `GroupCard` draw the separator as a 1 px `border` line
  **inset to where the text starts** (16 px from the card's left edge for rows without a tile, 60 px
  for rows with one: `[&>[data-slot=item]:has(>[aria-hidden]:first-child)]` or a simpler inset of
  16 px on all; pick one and use it everywhere). Check Line, whose cards are rules: its rows must
  not gain double lines.
- Files: `apps/web/src/components/ui/item.tsx`, `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: every `GroupCard` in the app (More, Accounts, Members, txn's linked rows). Belongs with
  `components.md`; merge there.
- Builder: Sonnet, M
- Needs the owner: only if he prefers no dividers at all (the hub reads calm without them); then
  patterns §8's "a separator is between them" changes instead, and the Claims and captured screens
  lose theirs.

### 11. Capture: three red tiles say "broken", and the status has no way to fix it
- Seen: `settings_capture--minted-light--p1.png`, dark: the card says *Not listening* in amber, then
  every setup row has a red-pink tile (`warn` tone): the same tile Account uses for *Sign out
  everywhere* and *Delete account*. The tile flips to the accent when a step is done, so colour is
  carrying the state. Nothing in the status card does anything; the fix is three rows down.
- Why it matters: red tiles on a list read as "danger" or "remove"; with all three red a first-time
  person thinks something's wrong rather than "three steps to do". Tiles are for scanning, not status
  (patterns §7.3, §7.10). And a status without its fix breaks *what happened and what to do next,
  with a button that does it* (§7, Error; spec §18's health bar has one button).
- Change, on the Capture screen:
  - `StepRow`: tone `neutral` always. Done: keep the trailing ✓ and the value (*4 chosen*, *On*,
    *Done*). Not done: value *Not set up* in `text-foreground` (not muted) and no ✓.
  - The `StatusCard` gets one button, `size="default"`, for the first step not done: *Choose your
    apps* → `settings/capture/apps`, *Allow notification access* → `settings/capture/access`, *Keep
    Sen running* → `settings/capture/running`. None when listening.
  - Rename the *Battery step done* value to *Done*.
  - The group label *On this phone* repeats the row's own title (*Captured on this phone*): drop the
    label, keep the row in its own `GroupCard`.
- Files: `apps/web/src/screens/capture/capture.tsx`
- Priority: P2
- Shared: none; the `warn` tile on Account's destructive rows goes with #15 (Account)
- Builder: Sonnet, S

### 12. Notification access: two filled buttons compete, and the fallback reads as the main path
- Seen: `settings_capture_access--minted-light--p1.png` (and dark, and `@capture-off`): the screen's
  main action *Open settings* is a full-width filled button at the bottom, and in the middle the
  greyed-out how-to's *Open Sen's app info* is a second filled primary. In dark both are pale filled
  pills. Step 1's title and its button say the same words.
- Why it matters: one main action per screen (D130 rule 1). Most people never see a greyed-out
  switch; the screen tells them to start with the exception.
- Change:
  - `Steps` (`blocks/steps.tsx`): add `quiet?: boolean`; when set, every step's button is
    `variant="secondary"`, never `default`. Use `quiet` here.
  - Step 1's title → *On Sen's app info page…* and its button *Open app info*, so the two
    don't repeat. Step 3 → *Come back and tap Open settings.*
  - Move the footnote (*Android asks this…*) into the section, as the `Steps`' last line, or drop
    *It changes nothing else.* to keep one line (§7.7).
- Files: `apps/web/src/blocks/steps.tsx`, `apps/web/src/screens/capture/access.tsx`
- Priority: P2
- Shared: `Keep Sen running` if it shows `Steps` under its own main action (it does: #13)
- Builder: Haiku, S

### 13. Keep Sen running: two filled buttons, as on Notification access
- Seen: `settings_capture_running--minted-light--p1.png`, dark: *Allow* (filled, 48 px) in the
  status card and *Open Autostart* (filled, the next step's) in the Xiaomi steps.
- Why it matters: one main action (D130 rule 1). *Allow* is the step every phone needs.
- Change: use #12's `<Steps quiet>` here. Also: the group label *Every phone* above the status
  card adds nothing (drop it, keep *Your Xiaomi*), and the footnote *Sen is tried on a Xiaomi
  first.* → *Sen is tested on Xiaomi first.*
- Files: `apps/web/src/screens/capture/running.tsx`
- Priority: P2
- Shared: #12
- Builder: Haiku, S

### 14. Segmented: in dark, the chosen option barely shows
- Seen: `settings_appearance--minted-dark--p1.png`: *Dark* is chosen, drawn as a pill a shade
  darker than the track; *System* and *Light* look the same weight. In light it's a clear white pill.
- Why it matters: the mode is the first choice on Appearance; a person can't see which is on.
- Change: in the `segment` variant (`components/ui/toggle.tsx`): on state adds
  `data-[state=on]:ring-1 data-[state=on]:ring-border data-[state=on]:font-semibold` and the icon in
  `data-[state=on]:[&_svg]:text-primary`; off options keep `text-muted-foreground`. Check all twelve
  pairs (Firefly dark's primary is lemon on a dark card: fine as an icon colour).
- Files: `apps/web/src/components/ui/toggle.tsx`
- Priority: P2
- Shared: every `Segmented`: Categories and rules, Open and Settled, the payday rule if it uses one
- Builder: Haiku, S

### 15. Account: actions with chevrons, a tiled fact, and the email buried second
- Seen: `settings_account--minted-light--p1.png`, dark. *About · Version* comes first, with an info
  tile though it opens nothing (in a browser it shows *simulated · sim* in previews). *Email* is a
  fact without a tile, so its label starts 88 px left of the rows under it. *Sign out*, *Sign out
  everywhere* and *Delete account* have chevrons (#9). Both lower rows are red, and *Delete account*
  only toasts *Deleting an account arrives with accounts. Nothing was deleted.*
- Why it matters: Account is where you check who you're signed in as; that should lead. A red row
  that does nothing is a dead end and makes the screen feel unfinished (and *Delete account* isn't
  in screens.md's Account: *Your email, Sign out, Sign out everywhere*).
- Change (`screens/account.tsx`):
  - Order: the identity first, the same card as the hub's top card (avatar, name, email, *Admin*;
    #16) without a chevron, as information. Then the actions `GroupCard` (no label): *Sign out*,
    *Sign out everywhere*, `kind="action"` (#9). Then *About* last: *Version* without a tile
    (`icon` removed; the long-press stays on the row).
  - *Sign out everywhere* is not `destructive` (it removes nothing; patterns §2, D150): neutral tile,
    text colour. The confirm dialog stays.
  - Hide *Delete account* until it works (`DEV_TOOLS` only), or remove it.
- Files: `apps/web/src/screens/account.tsx`; reuse the hub's account card by moving it into
  `settings/parts.tsx` as `AccountCard({ v, onOpen? })`
- Priority: P2
- Shared: the hub (#16)
- Builder: Sonnet, S

### 16. Settings hub: the profile card shows an email handle as a name
- Seen: `settings--*--p1.png`, every look: the top card says **weiming** in lower case, semibold,
  then *weiming@example.com* under it. The first word anyone reads on Settings is a
  machine-made handle; for a friend whose address is `tan.ml88@…` it would say *tan.ml88*.
- Why it matters: it's the screen's primary element (D130 rule 1), and it reads unfinished. It also
  repeats itself: the name is the email's first half.
- Change: title the card with the person's name when Sen has one, else with the email alone:
  `v.you.bankNames[0]` through `readableName` (*WEI MING TAN* → *Wei Ming Tan*); when the list is
  empty, put the email in the title line (`text-lg font-semibold`, `wrap-anywhere`, no truncate) and
  drop the second line. The avatar's initials follow the same name (email's first letter otherwise).
  Keep the *Admin* badge after the title.
- Files: `apps/web/src/screens/settings/settings.tsx` (`Body`, the account `Card`)
- Priority: P2
- Shared: the Account screen's header (#15)
- Builder: Haiku, S
- Needs the owner: only if he'd rather have a display name of its own; there's no field for one
  in `SettingsView` today, and this plan doesn't add one.

### 17. Receipts by email: the code that arrived sits below four steps, and copy is two styles
- Seen: `settings_email--minted-light--p1.png`, dark. A code has arrived (*428913*), which is the
  one thing to do now, but it's under *Confirmation*, below a four-step how-to whose step 3 says
  "it shows below". The address copies with a bare icon button; the code copies with a labelled
  *Copy code*. The last card is *Received* · *Received by email 3*, the same word twice. Groups
  are 20 px apart here, 24 everywhere else.
- Why it matters: one thing primary (D130 rule 1); a person returning from Gmail wants the code,
  and shouldn't scan past steps they've done. Two copy styles on one screen is pattern drift.
- Change (`screens/settings/email.tsx`):
  - When `code` is set: steps 1 and 2 are `done` (the code proves the forward was added), step 3's
    `detail` holds the code (the `num text-4xl` figure) and *Copy code* (`variant="default"`,
    `size="sm"`, the step's own action), step 4 stays. Drop the separate *Confirmation* section.
    Step 3's title becomes *Type Gmail's code into Gmail to confirm.* With no code yet, step 3 keeps
    its words and the muted *No code yet…* line as its `detail`.
  - The address card: replace the icon button with a labelled `Button variant="secondary"
    size="sm"` *Copy* (icon + word), as the code's.
  - Last card: `NavRow title="Receipts received" value="3"`, no group label.
  - Container `gap-6`.
  - Hub row value when a code is waiting: *Code arrived* instead of *Not confirmed*.
- Files: `apps/web/src/screens/settings/email.tsx`, `apps/web/src/screens/settings/settings.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 18. Data: the same backup is *Sat, 17 Oct* on the hub and *Yesterday, 03:00* inside
- Seen: `settings--minted-light--p1.png` (*Backed up Sat, 17 Oct*) against
  `settings_data--minted-light--p1.png` (*Last backup · Yesterday, 03:00*). The hub's row is
  called *Export and backups*; the screen it opens is titled *Data*.
- Why it matters: two different-looking answers to "when was my data last backed up" make a person
  double-check. The tapped name should be the title that greets you.
- Change: the hub uses `momentLabel`'s day part, the same relative wording (*Yesterday*, *Today*,
  else *Sat, 17 Oct*); with #8 the value is that date alone. Title the screen *Export and backups*
  (`AppBar title`), matching the row; the registry's name too.
- Files: `apps/web/src/screens/settings/settings.tsx`, `apps/web/src/screens/settings/data.tsx`,
  `apps/web/src/screens/registry.ts`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 19. Sen: an optional connection is the loudest button, and *@cap* shows nothing
- Seen: `settings_sen--minted-light--p1.png`, dark: *Google Calendar* is a row with a filled
  primary *Connect* inside it, which squeezes its line into three short lines; it's the strongest
  thing on the screen though the line says you don't need it. The hub writes the estimate
  *~RM3.80 this month*; this screen writes *About RM3.80*. `settings_sen_cap--*` (the credit cap
  scenario) is pixel-identical to the normal screen.
- Why it matters: a filled primary inside a row breaks *a row is one control* and points the
  person at an optional extra. The tilde is easy to miss on an estimate, which must read as one
  (CLAUDE.md: models draft; estimates labelled). A paused Sen that Settings doesn't mention leaves
  the owner guessing why Sen stopped.
- Change:
  - Calendar: an `ActionRow` (`settings/parts.tsx`) with title *Google Calendar*, value *Not
    connected* / *Connected*, its line full width, and *Connect* as `variant="secondary" size="sm"`
    in the footer (*Disconnect*: `variant="ghost"`). Give the card the group label *Calendar*, as
    its siblings have labels.
  - Hub: *About RM3.80 this month* (no tilde).
  - Cap: in `Credit`'s owner branch, show the *Sen is paused* row when `u.pausedUntil` is set, as
    the member branch does. If the owner can never be paused, change the catalogue entry
    `settings/sen@cap` to a member's view instead. Either way, the paused row is information: no
    tile, `value` *until 1 Nov* with a `TriangleAlertIcon` in `text-money-warning` and words (§3).
- Files: `apps/web/src/screens/settings/sen.tsx`, `apps/web/src/screens/settings/settings.tsx`,
  `apps/web/e2e/catalogue.ts` (if the entry changes)
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 20. You: three big empty choice cards for the payday rule
- Seen: `settings_you--minted-light--p1.png`, dark: *Last working day*, *A day*, *Not set* as three
  full-width 56 px cards with nothing but their name; the chosen one ringed. The names textarea
  shows a desktop resize grip in its corner.
- Why it matters: `ChoiceCards` are for showing a choice visually (§7.6); three bare word-cards are
  the heaviest possible way to pick one of three words. What a person wants to know is "so when is
  my next payday?"
- Change (`screens/settings/you.tsx`):
  - Each card gets a `description` computed by code from `cycles.ts`: *Last working day* →
    *Next: Fri, 28 Nov*; *A day* → *Next: 25 Nov* once a day is set, else *The same date each
    month*; *Not set* → *Sen counts by calendar month*. Keep `ChoiceCards columns={1}`.
  - The footnote *Sen counts each cycle from it.* then goes (the descriptions say it).
  - Textarea: `resize-none` (the field already grows; check `components/ui/textarea.tsx` has
    `field-sizing-content`, else add it there with a `// Sen:` note).
- Files: `apps/web/src/screens/settings/you.tsx`, `packages/core/src/cycles.ts` (read only, for the
  next payday), possibly `apps/web/src/components/ui/textarea.tsx`
- Priority: P2
- Shared: first run's payday step if it uses the same cards
- Builder: Sonnet, S

### 21. Members as a non-admin: *Invite* is still offered
- Seen: `settings_members_month--minted-light--p1.png`, dark: *Admin only — Only the admin sees
  Members.*, and top right, *+ Invite*, which opens the invite sheet.
- Why it matters: an action the person can't use, on the screen that just said they can't. A dead
  end (uiux: no dead ends).
- Change: render the app bar's *Invite* only when `s.admin`. The bar is built before the data
  loads, so move the action inside: pass `action` from `Loaded`'s result, or read `useSettings()`'s
  data in `Members` and show the button when `q.data?.admin`.
- Files: `apps/web/src/screens/settings/members.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 22. Rules: the switch looks like it turns the rule off
- Seen: `own/settings/rules-tab--viewport.png`, `rules-tab-dark--viewport.png`: each row reads *When
  the payee has "Dapur Bibi Delivery" → Meals*, with a switch beside it. The switch actually means
  *is a hawker*, said only at the end of the grey line (*Sen's suggestion, confirmed · Not a hawker*).
  Titles wrap to two lines and the source wraps oddly (*Sen's suggestion, / confirmed · …*).
- Why it matters: anyone would read the switch as "rule on/off" and flip it to stop a rule. Words
  and switch must agree (patterns §7: a row says its state; a `SwitchRow`'s title is what it turns on).
- Change (`RuleList` in `screens/settings/categories.tsx`):
  - Title: the merchant, through `readableName` (*Dapur Bibi Delivery*).
  - Line: *→ Meals · From your answer* (or *· Sen's suggestion*); drop *A hawker / Not a hawker*
    from the line (the switch says it).
  - Give `SwitchRow` an optional `switchLabel?: string`, drawn as a `text-xs text-muted-foreground`
    caption beside the switch (left of it, `ItemActions` gap 2); use `switchLabel="Hawker"` here.
    Keep `name` for the accessible label.
  - The intro line stays; group label *Merchant rules* stays.
- Files: `apps/web/src/screens/settings/categories.tsx`, `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 23. Category sheet: a big *Save* splits the sheet, and the flags card is inset twice
- Seen: `own/settings/category-sheet--viewport.png`, `--scrolled-end--viewport.png`: *Name*, then a
  full-width filled *Save*, then *Counts as* whose card sits 16 px narrower on each side than the
  field above it (the card's own `px-4` inside the sheet's). The flags save at once; the name waits
  for *Save*. The rules are two loose lines of text (*When the payee has "Warung Pak Hamid"*).
- Why it matters: two save models in one sheet, and a main button in the middle of a settings sheet
  that isn't its point. Edges that don't line up read as unfinished.
- Change (`CategoryDetail` in `screens/settings/categories.tsx`):
  - The name saves like You's names: on blur and on Enter (`enterKeyHint="done"`), with the toast's
    *Undo*; errors stay under the field. Remove the *Save* button.
  - *Counts as*: `GroupCard className="-mx-4"` (as the invite sheet does), so its card lines up with
    the field. Better, give `GroupCard` an `inset={false}` prop that drops its `px-4`, and use it in
    both sheets.
  - Rules: a `GroupCard label="Rules"` of information rows (`NavRow` without `onOpen`, title the
    merchant through `readableName`), or the existing muted line when there are none.
- Files: `apps/web/src/screens/settings/categories.tsx`, `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: the invite sheet (#24) for the `GroupCard` inset
- Builder: Sonnet, S

### 24. Invite sheet: two screens of form in a sheet
- Seen: `own/settings/invite-sheet--viewport.png`, `--scrolled-end--viewport.png`: email, *They will
  use*, five switches, *Welcome credit* at figure size, *Unlimited*, *Monthly allowance* at figure size,
  then *Send invitation*: about two phone-heights inside an 85 % sheet.
- Why it matters: patterns §7.8, a sheet holds a choice or a short form; long things get a screen.
  Every one of those settings is already on the member's own screen, where they can be changed the
  moment the invite exists.
- Change (`InviteSheet` in `screens/settings/members.tsx`): keep *Their email*, *They will use* and
  *Send invitation*; the switches and credit go out of the sheet and take `DEFAULTS`, `WELCOME` and
  `ALLOWANCE`. Say so in one line under *They will use*: *They start with RM10.00 credit and RM2.00 a
  month; change it on their page.* (computed with `formatSen` from the constants). After sending,
  open the new member's screen (`go('settings/member', { id })`) so the admin can adjust at once.
- Files: `apps/web/src/screens/settings/members.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, S
### 25. Categories and rules: the grid tiles are a one-off card, and the add button leads
- Seen: `settings_categories--minted-light--p1.png`, `--p2.png`, dark. The category tiles are
  `bg-card` with no border, unlike every other card on Settings (which have one); in Minted light
  they float as pale blobs. *Spending categories* sits 8 px left of where every other group label
  sits (it's a bare `<h2>`, not `GroupLabel`). *Add a category* is a full-width 48 px outline button
  at the top, drawn at main-action size.
- Why it matters: cards of one kind should look one way (D130 rule 2), and labels should line up
  down a screen and between siblings.
- Change (`screens/settings/categories.tsx`):
  - Tile button: add the shared card material: `card border` (the `card` class lets Line turn it
    into its rule; check Line), keep `rounded-[var(--radius-card,16px)]`.
  - Group headings: `GroupLabel` (it carries the `px-1` inset).
  - *Add a category*: `size="sm"` `variant="outline"`, not full width: put it as the `action` of
    the *Spending categories* label row (`GroupLabel action`), or keep it above both groups but at
    `size="sm"` `self-start`. It's not the screen's main action.
- Files: `apps/web/src/screens/settings/categories.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 26. Capture: the hub's Capture row hides the problem behind a count
- Seen: `settings--*--p1.png`: *Capture · 0 apps · not listening* in muted secondary, the same
  weight as *4 rules*. When capture is broken, it's the most important line on Settings.
- Change: in `CaptureRow` (`screens/settings/settings.tsx`), when the listener isn't listening, the
  value is a `Badge variant="warning"` reading the state (*Not listening*, *Waiting for Android*);
  when listening, the plain value *4 apps*. (Pairs with #8's shorter value.)
- Files: `apps/web/src/screens/settings/settings.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 27. Your apps: a search heading in another style, and *More* says nothing
- Seen: `settings_capture_apps--minted-light--p1.png`: *Search every app* is a field label in the
  text colour at the screen's edge, between two group labels in muted secondary 8 px further in.
  The second group is labelled *More*.
- Change (`screens/capture/apps.tsx`): group label *Other apps on this phone* (`GroupLabel`), with
  the search input directly under it and above that card; the search's `FieldLabel` becomes
  `sr-only` (the placeholder already says what to type, and the label stays for screen readers).
- Files: `apps/web/src/screens/capture/apps.tsx`
- Priority: P3
- Shared: first run's apps step
- Builder: Haiku, S

### 28. Neutral icon tiles all but vanish in dark
- Seen: `settings--minted-dark--p1.png`, `settings--copper-dark--p1.png`,
  `settings--mercury-dark--p1.png`: the 32 px tiles behind *Capture*, *You*, *Claims* are `bg-muted`
  on a card of nearly the same lightness, so only the glyph shows and the rows lose their left
  edge rhythm. In light they read well.
- Change: in `blocks/tile.tsx`, `neutral` becomes `bg-muted text-icon dark:bg-foreground/8` (or a
  token the looks already set for raised surfaces, if one exists in `looks.gen.css`); check the
  tile is distinct from its card in all six dark looks without becoming a bright block.
- Files: `apps/web/src/blocks/tile.tsx`
- Priority: P3
- Shared: every `IconTile` with the neutral tone (More, Accounts, every hub)
- Builder: Haiku, S

### 29. One person, two avatar colours; and *Sept* among three-letter months
- Seen: Hui Min's avatar is gold on her Settings hub (`settings_month--minted-light--p1.png`, from
  the handle *huimin*) and lavender on Members (`settings_members--…`, from *Hui Min*). The avatar's
  tint hashes whatever string it's given. Claims shows *Wed, 30 Sept* while every other date says
  *17 Oct*: `en-MY` formats September as *Sept*.
- Change: #16 gives the hub the person's name, which fixes the first where a name exists; also have
  `PersonAvatar` take an optional `seed` (the member id or email) so the tint follows the person, not
  the spelling, and pass the email in both places. In `lib/dates.ts`, after formatting, replace
  `Sept` with `Sep` (one helper used by every formatter there).
- Files: `apps/web/src/blocks/group.tsx`, `apps/web/src/screens/settings/settings.tsx`,
  `apps/web/src/screens/settings/members.tsx`, `apps/web/src/lib/dates.ts`
- Priority: P3
- Shared: every date in the app; every `PersonAvatar`
- Builder: Haiku, S

## Keep

What's already right, and must survive the polish:

- **The hub's shape**: who you are on top, then *Appearance* alone, then *Setup*, *Features*, *Data*,
  every row a `NavRow` with a tile and its state on the right (*4 rules*, *2 schemes*, *Not
  confirmed*). It reads calm in all six looks and both modes; Line's rules-not-boxes version works.
- **Rows say their state** across Settings, and sections show only to who can use them (D52).
- **Appearance**: the mode as a `Segmented` with icons, *Change each quarter* with the date the look
  changes, and the six looks as mini Homes drawn in their own material. The best screen in the area.
- **Status cards that lead with the state in words and an icon** (*Not listening*, *Off*, *Not
  done*), in `money-warning` only for a real warning, never red.
- **Your apps' wording**: the suggestion card (*Sen found 4 banks… Choose these 4*), and every
  blocked app saying why in plain words (*Your SMS app can't be chosen: it carries TACs*), its line
  left readable while the row dims.
- **Steps for how-tos** (Gmail, restricted settings, Xiaomi), numbered, with the next one marked.
- **Copy and confirmation details**: the Gmail code large in the number font with *Copy code*; the
  sign-out-everywhere and forget-password confirmations worded as what happens.
- **The D135 avatar on buttons that open Sen** (*Add*, *Teach Sen*): keep it; #4 only cuts how many
  there are.
- **Money**: AI credit as a `FactGrid` (*Balance*, *Allowance left this month · RM1.10 of RM2.00*),
  amounts parsed as text into sen, estimates worded as estimates on the Sen screen (*About RM3.80*,
  *An estimate from the tokens used*).
- **Disabled switches explain themselves** in the line under the label.
- **Check rows on Data** that act without a chevron and say *Sending…* with a spinner while they
  wait: the model for #9's `kind="action"`.

## Needs the owner

1. **#10 Row dividers.** Patterns §8 says full-width rows have a separator between them, but today
   almost none show (an `Item` styling bug), and the hub reads calm without them. Make them show,
   inset, everywhere (this plan's default), or drop them everywhere and change §8?
2. **#16 / #15 Who you are.** The profile card and the Account header use the first of *your names as
   banks print them* (*Tan Wei Ming*), else the email alone. Fine, or does he want a display name of
   its own (a new field)?
3. **#15 Delete account.** It isn't in screens.md's Account and does nothing yet: hide it until it
   works (this plan), or keep it visible with its *not yet* toast?
