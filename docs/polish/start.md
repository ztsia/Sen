# Polish plan: Start and More

Screens: `sign-in` (and `@invited`), `first-run` and its steps (`@code`, `@apps`, `@access`,
`@running`, `@accounts`, `@name`, `@payday`, `@without-capture`), `more`, `agent/memory`,
`agent/research`, `agent/usage` (and `@cap`). Audited from the captures in Minted light and dark, and
the other five looks where they were captured (`first-run` step 1, `more`). The dev panel's handle at
the left edge is dev-only, so it isn't a finding. The captures are full-page, so a sticky footer shows
where the page ends: first run's `Actions` footer is `sticky bottom-0` in code, and *Skip for now*
cut off at the fold in `first-run_running--*--p1.png` is the capture, not a bug (view 5 in
`own/start/requests.md` checks it on a phone-height viewport).

**What this area feels like now.** The bones are good: one thing per step, honest words, a progress
bar, status cards that say *Off* or *Not done* with an icon. What makes it "a bit not so nice" is
mostly at the edges of the blocks: amounts drawn with gaps (*3 , 200 . 50*), app logos cropped, three
filled buttons on one step, four large figures stacked on another, a Back arrow on a tab root, and
long body-size paragraphs where one line would do. Most fixes are in shared parts (`MoneyInput`,
`AppIcon`, `AppBar`, `Switch`, `StatusCard` buttons), so they reach other areas too.

## Findings

### 1. MoneyInput (shared): amounts show with gaps around the comma and the dot
- Seen: `first-run_accounts--minted-light--p1.png` and `--minted-dark--p1.png`: the four balances
  read *RM 85 . 00*, *3 , 200 . 50*, *6 , 400 . 00*, *40 . 00*. The comma and the dot each take a
  full digit's width, so every amount looks spaced out, like a broken font.
- Why it matters: this is the first time a person types their money into Sen, and the figure looks
  wrong. Patterns §3 says one money format everywhere (`RM1,284.50`), and Home's figure doesn't look
  like this. `tabular-nums` is for amounts in a column (§3); a single field gains nothing from it, and
  in this font it makes punctuation tabular too.
- Change: in `MoneyInput`, remove the `num` class from the `<Input>`'s `className`, so the typed
  amount uses proportional figures. Then look at the accounts step and `manual` in all six looks,
  light and dark: *3,200.50* must sit tight. If any look still spaces its punctuation, add
  `[font-variant-numeric:normal]` to the same `className` and look again.
- Files: `apps/web/src/blocks/money-input.tsx` (the `<Input>` inside `MoneyInput`)
- Priority: P1
- Shared: every amount field: `manual`, `confirm`, `balance-check`, `split`, budgets and goals forms,
  Settings' amounts
- Builder: Haiku, XS

### 2. First run · apps (and Settings → Capture → apps): every app's icon is cropped
- Seen: `first-run_apps--minted-light--p1.png`: each letter tile's letter sits low and right of its
  tile's centre (*T*, *R*, *M*, *G*). In the browser that's the letter fallback; on the phone it's the
  bank's real logo.
- Why it matters: `AppIcon` draws its image or its letter at `size-10` (40 px), but `SwitchRow` wraps
  `media` in a `size-8` (32 px) box with `overflow-hidden`, and the image isn't centred, so the right
  and bottom 8 px of every logo are cut off. On the owner's phone, Touch 'n Go's, Ryt's, Public Bank's
  and Grab's logos will look clipped on the screen that asks them to trust Sen with their banks.
- Change: in `AppIcon`, make both branches fill their box: the `<img>` gets `className="size-full
  object-contain"`, and the letter `<span>` gets `size-full` instead of `size-10` (keep its other
  classes). Patterns §2 sets a row's mark at 32, which `SwitchRow`'s wrapper already is. Also give the
  letter fallback a lucide icon instead of a letter when the app's `kind` is known: `LandmarkIcon` for
  a bank, `WalletIcon` for an e-wallet or card wallet, otherwise the letter, drawn at `size-4` in
  `text-icon` on the same `bg-muted`. Two different apps then never share a *G*.
- Files: `apps/web/src/screens/capture/common.tsx` (`AppIcon`); check `CaptureApp`'s `kind` values in
  `apps/web/src/shell/bridge.ts`
- Priority: P1
- Shared: Settings → Capture → apps, and any screen that shows an `AppIcon` (accounts' app marks, if
  they use it)
- Builder: Haiku, S

### 3. First run · notification access: three filled buttons, and the fallback before the path
- Seen: `first-run_access--minted-light--p1.png` and dark: a status card (*Off*), then *If Sen's
  switch is greyed out* with three steps and a filled *Open Sen's app info*, a footnote, a filled
  48 px *Open settings*, a gap, a filled 48 px *Next*, and *Skip for now*.
- Why it matters: patterns §7 rule 1 (one main action at 48) and D130. A person can't tell which of
  three filled buttons to press, and the exception (*if the switch is greyed out*) is read before the
  normal path (*Open settings*). While access is off, *Next* does exactly what *Skip for now* does, so
  *Next* suggests the step is done when it isn't. This is the step where capture is won or lost.
- Change, in two parts.
  1. In `CaptureAccess`, when drawn inside first run (`Bare` is true), put *Open settings* inside the
     `StatusCard` as its child, as `running` does with *Allow*: `<Button size="sm" className="mt-2
     self-start">Open settings</Button>` while off (and no button when on). Outside first run
     (Settings → Capture) keep `BottomAction` as it is. Then put the greyed-out steps behind a
     disclosure, as `apps` does with *How it works*: a `<details>` whose summary reads *Sen's switch
     is greyed out?*, styled exactly like `apps`'s *How it works* summary, holding the `Steps` and the
     footnote. Keep it open by default only outside first run if you like; in first run it starts
     closed.
  2. In first run's `BuiltStep`, for `access` and `running`, read whether the step is done (the same
     bridge calls the screens make: `SenCapture.status()`'s `access`, `SenCapture.keepRunning()`'s
     `ignoringBattery`) and show, while not done, only *Skip for now* (ghost, `size="sm"`); once done,
     only *Next* (default size). `apps` keeps *Next* as now.
- Files: `apps/web/src/screens/capture/access.tsx`, `apps/web/src/screens/capture/common.tsx` (export
  `useBare()` or pass the flag), `apps/web/src/screens/outside/first-run.tsx` (`BuiltStep`)
- Priority: P1
- Shared: Settings → Capture → access keeps its layout; only first run changes
- Builder: Sonnet, M

### 4. First run · keep Sen running: the card's *Allow* is drawn as big as the main action
- Seen: `first-run_running--minted-light--p1.png` and dark: *Allow* inside the *Not done* card is a
  48 px filled pill, larger than the step buttons under it (*Open Autostart*, 40) and as big as
  *Next* at the bottom. With *Open Autostart* filled too, there are three filled buttons.
- Why it matters: D129: a button sits at the level of the text beside it; the rest are `size="sm"`.
  The same goes for *Choose these 4* inside the *Suggested* card on the apps step (view 1 requested).
- Change: give the `StatusCard` action buttons `size="sm"`: *Allow* in `running.tsx`, *Choose these
  N* in `apps.tsx`. With finding 3's footer rule, the step's bottom shows *Skip for now* until the
  battery step is done, then *Next*.
- Files: `apps/web/src/screens/capture/running.tsx`, `apps/web/src/screens/capture/apps.tsx`
- Priority: P2
- Shared: Settings → Capture → running and apps
- Builder: Haiku, XS

### 5. First run · your accounts: four large figures stacked, with weak grouping
- Seen: `first-run_accounts--minted-light--p1.png` and dark: four amount fields at the figure size
  (`text-4xl`), one under another, each with its name above and a hint below the underline. The hint
  (*Main account and pockets together*) sits about as close to the next account's name as to its own
  field.
- Why it matters: patterns §7 rule 1: one thing to look at first. Four figures shout equally, so
  the screen reads as heavy and the eye has nowhere to land; and a hint that floats between two
  fields can be read as the next one's. Each field is also a bare underline on the page, while every
  other list in Sen sits in cards (rule 2).
- Change: put each account in its own card, built from shadcn's `Card` (`px-4 py-3`, `gap-2`), stacked
  `gap-3`. Inside: a header row with the app's `AppIcon` (32, as in `SwitchRow`'s media box) and the
  account name (`text-base font-medium`), with the hint under the name as one `text-sm
  text-muted-foreground` line; then the `MoneyInput` below with its label kept for screen readers
  (`sr-only`, since the header names it). Add a `size` prop to `MoneyInput`, `'figure' | 'row'`,
  default `'figure'` (as now); `'row'` draws the amount at `text-2xl` and the `RM` at `text-base`.
  The accounts step uses `'row'`. The single-amount forms (`manual`, `balance-check`) keep `'figure'`.
- Files: `apps/web/src/screens/outside/first-run.tsx` (`Accounts`), `apps/web/src/blocks/money-input.tsx`
- Priority: P2
- Shared: Settings → accounts' opening balances, if they list several amounts
- Builder: Sonnet, M

### 6. More (and Review, Insights): a Back arrow on a tab root
- Seen: every `more--*-p1.png`, all six looks: ← *More*. The tab bar shows *More* active, yet the bar
  offers Back.
- Why it matters: patterns §6: the tab screens are roots; back on one goes Home and back on Home
  leaves the app, through the system gesture. A Back arrow on a root says "there's somewhere behind
  this", and `goBack` takes it to whatever was in history (a pushed screen from another tab), which
  isn't Home. Review and Insights call `AppBar` the same way, so they show it too.
- Change: add a `root` prop to `AppBar`: no back button, the title at the same size, with the
  header's left padding `px-5` like the `home` branch, so the title lines up with the cards' 16 px
  edge plus the card's own padding as the wordmark does. Pass `root` from `more.tsx`, `review.tsx`
  and `insights.tsx`.
- Files: `apps/web/src/frame/app-bar.tsx`, `apps/web/src/screens/more/more.tsx`,
  `apps/web/src/screens/review/review.tsx`, `apps/web/src/screens/insights/insights.tsx`
- Priority: P2
- Shared: Review and Insights (tell the Home and Review auditors' units, so it's done once)
- Builder: Haiku, S

### 7. First run · expected payday: a plain toggle where patterns asks for choice cards
- Seen: `first-run_payday--minted-light--p1.png` and dark: a four-line paragraph, then a two-part
  outline toggle (*Last working day* · *A day number*) with no icon and nothing under it. Nothing says
  what the choice means in dates.
- Why it matters: patterns §7's table names `ChoiceCards` for *the payday rule*, and Settings → You
  already uses them (`settings/you.tsx`) with the words *Last working day* · *A day*, so the same
  question looks and reads differently in two places. The toggle's height is set by `className`
  (`h-12`), which `docs/workflow/uiux.md` forbids. Rule 7: one line of intro.
- Change: replace the `ToggleGroup` with `ChoiceCards<'last' | 'day'>` with `columns={1}`, options
  *Last working day* and *A day*, the same words as Settings. Give *Last working day* a `description`
  computed by code: *Next: Fri 28 Nov* (from `lastWorkingDay()` in `packages/core/src/cycles.ts` on
  today's KL day, rolled to next month if today is past it, formatted as the app's short date). When
  *A day* is chosen, show the existing *Day of the month* field under the cards, inside a `Card
  className="px-4"` as Settings does. Cut the intro to one line, *When does your salary usually
  arrive?*, and move the rest under the cards as one `text-sm text-muted-foreground` line: *Only for
  estimates, such as days to payday. Your cycle starts when the money lands.*
- Files: `apps/web/src/screens/outside/first-run.tsx` (`PaydayStep`)
- Priority: P2
- Shared: none (Settings already right)
- Builder: Sonnet, S

### 8. Switch (shared): *off* looks heavier than *on*
- Seen: `first-run_apps--minted-light--p1.png`: *Google Wallet*, *A shopping app*, *A coffee app* are
  off, and their thumb is the darkest thing in the row (near-black on a pale track); the on switches
  are a navy track with a white thumb. In dark it inverts (white thumb on a dark track when off).
- Why it matters: on a screen of switches, the eye reads the dark dot as "set", so off and on look
  alike at a glance. The person is deciding which apps Sen may read; the state must read at once.
- Change: in `Switch`, draw the off thumb smaller and recessive, as Android's own switch does: the
  thumb is `size-4 bg-muted-foreground` when unchecked and `size-5 bg-primary-foreground` when
  checked (`data-[state=checked]:size-5`), keeping the translate values so it still travels the
  track. Keep the 48 px target. Check all six looks, light and dark, and the disabled state (it stays
  at `opacity-50`).
- Files: `apps/web/src/components/ui/switch.tsx` (update its `// Sen:` note)
- Priority: P2
- Shared: every `SwitchRow`: Settings, first run's categories, rules
- Builder: Haiku, S

### 9. First run · step 1: *Sign in* said three times, and a Back that goes nowhere
- Seen: `first-run--minted-light--p1.png` (and every look): the bar says *Sign in*, then Sen's avatar,
  then the heading *Sign in to Sen*, then the field. The Back arrow sits on the very first step.
- Why it matters: the heading repeats the title right above it (rule 7, explain once). On a fresh
  install there's nothing behind step 1: `onBack` calls `window.history.back()`, which does nothing in
  the shell, so the arrow looks broken.
- Change: (a) give `SignInFlow` a prop `heading?: boolean` (default `true`); first run passes
  `heading={false}`, which drops the *Sign in to Sen* `<h2>` only (the code step keeps *Type the
  code*). (b) In first run's `Frame`, hide Back on the first step: make `AppBar`'s back button
  optional (`onBack={null}` or a `noBack` prop) and pass it when `i <= first`; keep the title's left
  edge where it is (`pl-3` in place of the button) so it doesn't jump between steps.
- Files: `apps/web/src/screens/outside/sign-in.tsx`, `apps/web/src/screens/outside/first-run.tsx`,
  `apps/web/src/frame/app-bar.tsx` (same change as finding 6 can serve both)
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 10. Sign-in · the code step: two full-width secondary buttons, and the code sits left of centre
- Seen: `first-run_code--minted-light--p1.png` and dark: under *Sign in* (48, filled) come *Send a
  new code* as a full-width outline button and *Use a different email* as a ghost button, stacked.
  The placeholder dashes (and typed digits) sit about 6 px left of the field's centre.
- Why it matters: a full-width outline button reads as a second main action (D129: the rest step
  down). The offset is `tracking-[0.4em]`, which adds space after the last digit too.
- Change: put the two quiet actions in one row, centred, both `variant="ghost" size="sm"`: *Send a
  new code* · *Use a different email* (`flex justify-center gap-2`). Keep the existing rule that turns
  *Send a new code* into `variant="default"` when the code has expired or had too many tries. In the
  code `<Input>`'s `className`, add `indent-[0.4em]` so the digits centre. Shrink the avatar on the
  code step only to `size={72}`, so with the keyboard up *Sign in* stays above it.
- Files: `apps/web/src/screens/outside/sign-in.tsx` (`CodeStep`, `SignInFlow`)
- Priority: P2
- Shared: `sign-in` and first run step 1, which share this flow
- Builder: Haiku, S

### 11. Usage · at the cap: the pause reads as a quiet note
- Seen: `agent_usage_cap--minted-light--p1.png` and dark: a plain card with one muted line, *Sen is
  paused until 1 Nov; everything else works.*, no icon, then the same tiles and chart as normally.
- Why it matters: this is the most important thing on the screen when it shows, and it's drawn in
  the quietest style on it. Patterns §7 status cards: the state in words first, with an icon, then
  what it's waiting for.
- Change: replace the `Alert` with a `StatusCard`: `icon={PauseCircleIcon}`, `state="Paused"`,
  `status="warning"`, `title="Sen is paused until 1 Nov; everything else works."` (the date from
  `shortDay(v.pausedUntil)`), and for a friend (not `v.owner`) `waiting="The free allowance renews on
  1 Nov. If you need more, ask the person who invited you."` reusing the existing words. Keep the
  screen's words as they are otherwise.
- Files: `apps/web/src/screens/sen/usage.tsx`
- Priority: P2
- Shared: `settings/sen@cap`, if it shows the same line (check `screens/settings/sen.tsx`)
- Builder: Haiku, S

### 12. First run · apps: labels that don't match, a name that clashes, and blocked apps mixed in
- Seen: `first-run_apps--minted-light--p1.png` and `--p2.png`: *Banks and e-wallets* and *More* are
  muted group labels; between them *Search every app* is a field label in the text colour at the
  page's edge, so three headings use two styles. *More* is also the name of a tab. Under it, the
  choosable apps and the four that can never be chosen (*Messages*, *WhatsApp*, *Gmail*,
  *Instagram*) share one card, each with a disabled switch.
- Why it matters: patterns §7: a small label above each group, one style. A group called *More* on a
  first-run step reads as the tab. The never-chosen apps are reassurance (D86: Sen can't read your
  messages), but drawn as greyed switches they look like broken controls.
- Change: (a) Rename the second group *Other apps*. (b) Put the search inside that group: its
  `GroupLabel` *Other apps* first, then the search input, then the card; give the input
  `aria-label="Search every app"` and drop the visible `FieldLabel`. (c) Split the blocked apps
  (`a.blocked`) into their own group after it, labelled *Sen never reads these*, as information
  rows: the app's mark, its name, the reason line (`BLOCKED[...]`), and no switch (`NavRow` without
  `onOpen` with the `AppIcon` as its mark, or `SwitchRow` replaced by an `Item` with the same
  layout). Keep them out of the search results' empty state count.
- Files: `apps/web/src/screens/capture/apps.tsx`
- Priority: P2
- Shared: Settings → Capture → apps (the same screen)
- Builder: Sonnet, S

### 13. What Sen remembers: a separate card per note, each with the same brain tile
- Seen: `agent_memory--minted-light--p1.png` and dark: four floating cards, each led by an identical
  brain tile in a tinted square, the note, *Noted 14 Oct*, and a trash button.
- Why it matters: patterns §7 rule 2 (rows sit in one `GroupCard`) and rule 3 (information never
  gets a tile; the tile means "go here" or "do this"). Four identical tiles add noise and make every
  note look like a link. Separate cards also make the page feel heavier than four short sentences
  are.
- Change: draw the notes as rows in one `GroupCard` (no label; the intro line stays above it). Each
  row: the note (`text-base`, selectable as now), *Noted 14 Oct* under it (`text-sm` muted), and the
  trash ghost icon button on the right, as now (it forgets at once with Undo, so it may stay in the
  row). Drop the `IconTile`. Keep `settled()` on the button.
- Files: `apps/web/src/screens/sen/memory.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 14. More: two rows say a bare number
- Seen: every `more--*-p1.png`: *Payments 1,139* and *Accounts 4*, beside *3 open* and *2 to
  submit*.
- Why it matters: patterns §7 rule 5 (a row says its state, as *4 apps · listening*). A bare
  *1,139* next to money could be read as an amount, and a count of every payment ever isn't a state
  anyone needs.
- Change: Payments shows this cycle's count, *142 this cycle* (from the payments the screen already
  reads, filtered to the current cycle with `cycleOf`; if that isn't in the view, show *1,139 in
  all*). Accounts shows *4 accounts* (*1 account* for one).
- Files: `apps/web/src/screens/more/more.tsx` (`MoreRows`)
- Priority: P2
- Shared: none
- Builder: Haiku, XS

### 15. Research: cards that look tappable but open nothing, and the badges' weight upside down
- Seen: `agent_research--minted-light--p1.png` and dark: three floating cards, each a question,
  *3 findings · 18 Oct*, and a badge. *Confirmed* is a filled badge, *Draft* an outline one.
- Why it matters: a card on its own reads as something to tap; these do nothing, so the first tap
  looks ignored. The badge that needs the person (*Draft*: confirm its figures) is the quieter one.
- Change: draw the briefs as rows in one `GroupCard`, as finding 13, so they read as a list of
  facts. Swap the badge weights: *Draft* uses `variant="accent"`, *Confirmed* `variant="muted"`.
- Files: `apps/web/src/screens/sen/research.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS
- Needs the owner: whether a brief should open (into Sen's chat at that draft, where it's confirmed).
  `screens.md` gives research no detail, so this plan keeps them as information.

### 16. First run: body-size paragraphs where patterns allows one line
- Seen: `first-run_payday--*` (four lines), `first-run_name--*` (three lines), the categories step's
  intro (three sentences, in code), all at `text-base` in the text colour; meanwhile
  `agent_memory--*` and `agent_research--*` use `text-sm` muted for their intro.
- Why it matters: rule 7 (one line of intro). Long body paragraphs are what made E1 feel dense, and
  two intro styles make sibling screens differ.
- Change: one intro style for the area: `text-sm text-muted-foreground`, one line or two at most. Name:
  *Banks print your name in capitals. Sen uses it to spot moves between your own accounts.* Accounts:
  keep its line. Categories: *Switch off any you won't use. You can change them later in Settings.*
  (keep *You count by calendar month, and can set a payday later.* as the card's footer line through
  `GroupCard`'s `footer`). Payday: finding 7. Apps: keep, it's already one line.
- Files: `apps/web/src/screens/outside/first-run.tsx`, `apps/web/src/screens/capture/apps.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, S

### 17. Steps (shared): the words of a button to tap aren't set apart
- Seen: `first-run_access--*`: *Tap the menu (⋮) at the top right, then Allow restricted settings,
  and confirm.*; `first-run_running--*`: *Battery saver: choose No restrictions.* The words the
  person must find on Android's screen run on in the sentence.
- Why it matters: a person switching between Sen and Android's settings scans for the label. Setting
  it in medium weight makes it findable.
- Change: let a `Steps` step's `title` be `ReactNode` (key the list on index or a new `id`), and set
  the literal labels in `<span className="font-medium">`: *Allow restricted settings*, *Open
  settings*, *Autostart*, *No restrictions*, *padlock*.
- Files: `apps/web/src/blocks/steps.tsx`, `apps/web/src/screens/capture/access.tsx`,
  `apps/web/src/screens/capture/running.tsx`
- Priority: P3
- Shared: Gmail and ESS setup steps, which use `Steps`
- Builder: Haiku, S

### 18. Keep Sen running: an icon that doesn't read, and a footnote for developers
- Seen: `first-run_running--minted-light--p1.png`: the *Not done* icon (`BatteryWarningIcon` at
  16 px with Minted's butt caps) reads as *[!]·*, not a battery. The footnote says *Sen is tried on a
  Xiaomi first.*
- Why it matters: §5, an icon must say its thing; this one is noise. The footnote's second sentence
  is about the build, not the person.
- Change: use `BatteryLowIcon` for *Not done* (keep `BatteryFullIcon` for *Done*). Footnote:
  *Steps from dontkillmyapp.com.* only, when `brand.tested`; keep the untested sentence as it is.
- Files: `apps/web/src/screens/capture/running.tsx`
- Priority: P3
- Shared: Settings → Capture → running
- Builder: Haiku, XS

### 19. StatTiles and IconTile (shared, for the components plan): the emphasised tile looks pressed, and neutral tiles vanish in some dark looks
- Seen: `agent_usage--minted-light--p1.png`: *Used this month* is a filled, bordered tile beside a
  white card, so it reads as a selected button rather than the main figure. `more--copper-dark`,
  `more--mercury-dark`, `more--instrument-dark`: the neutral `IconTile` squares are barely visible
  against the card, so the icons float.
- Why it matters: emphasis should come from the figure, not a fill that looks like a choice; tiles
  are how D130 marks destinations.
- Change: hand both to the components plan. Suggested: an emphasised `StatTiles` tile keeps the card
  material and gets its emphasis from a larger value (`text-2xl`) instead of `bg-primary/10`; the
  neutral tile's `bg-muted` gets a minimum contrast against `card` in the dark looks (a look token, or
  `bg-foreground/8` in place of `bg-muted`).
- Files: `apps/web/src/blocks/facts.tsx` (`StatTiles`), `apps/web/src/blocks/tile.tsx`
- Priority: P3
- Shared: every screen with `StatTiles` or a neutral `IconTile`
- Builder: Sonnet, S

### 20. Inputs (shared, for the components plan): an auto-focused field always wears a heavy double ring
- Seen: `sign-in--minted-light--p1.png`, `first-run_name--*`, every look's `first-run--*-p1.png`: the
  focused field shows its border plus a wide soft ring, the heaviest thing on the screen before
  anything is typed. In Line it's a bright blue that isn't Line's ink.
- Why it matters: patterns §10: focus rings for keyboard use only (`:focus-visible`). A field focused
  on load (so the keyboard opens) shouldn't look like an alert.
- Change: hand to the components plan: in `input.tsx`, keep the border colour change on `:focus` and
  draw the 3 px ring only on `:focus-visible` when it came from a keyboard (Chromium treats a
  programmatic focus on an input as focus-visible, so key it on a `data-keyboard` flag the frame sets
  on `keydown`), and check Line's `ring` token.
- Files: `apps/web/src/components/ui/input.tsx`, `docs/ui/directions/assets/line/` (if the token moves)
- Priority: P3
- Shared: every form
- Builder: Sonnet, S

## Keep

- **Waiting buttons that say so**: *Sending the code…*, *Signing in…*, *Saving…*, *Finishing…*
  with a spinner (E2). Don't lose them while restyling the code step.
- **An invitation's email filled in** (`sign-in@invited`), the field focused on load, and
  `autocomplete="one-time-code"` on the code.
- **The live name check**: *Sen will look for TAN WEI MING.* under the name field. It shows the
  person exactly what Sen does with what they typed.
- **The step frame**: the title, *Step 4 of 7*, the thin progress bar, no tab bar, the step and its
  draft kept across a reload.
- **Status cards with an icon and a word** (*Off*, *Not done*) in the warning colour, and the
  plain words under them.
- **Honest reasons on apps that can't be chosen** (*Your SMS app can't be chosen: it carries TACs*):
  keep the words when they move to their own group (finding 12).
- **The form sits high on sign-in** with the space below: with the keyboard up, the field and *Send
  the code* stay visible. Don't push the button to the bottom of this screen.
- **More's rows that say their state** (*3 open*, *2 to submit*), its two calm groups, and Settings
  on its own.
- **Usage's honesty**: *About RM3.80*, and *The cost is an estimate from the token counts, not a
  bill, and is never stored.* The stacked bar uses `chart-1` to `chart-3` with a legend that names
  each part, as patterns §4 asks.
- **What Sen remembers' promise**: *It never keeps an amount, and forgetting one takes it away*, and
  forgetting at once with Undo.
- **The avatar on sign-in in every look**: it's the one place a new person meets Sen, and each look's
  mark sits well in its circle.

## Needs the owner

1. **Research briefs** (finding 15): should tapping a brief open Sen's chat at that draft?
   `screens.md` gives research no detail screen, so the plan keeps briefs as information.

Everything else here stays inside `patterns.md` and D75–D151. Finding 3's footer (*Skip for now*
until a step is done, then *Next*) keeps *Skip* on every capture step, as `flows.md` asks.
