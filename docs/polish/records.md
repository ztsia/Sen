# Polish plan: Money records

Screens: `payments`, `txn`, `accounts`, `account`, `balance-check`, `shared`, `split`, `split-public`,
`claims`, `claim`, with their `@` states. Audited from the captures at 390×844 in Minted light and
dark (no other look was captured for this area), and the source of each screen and the blocks it
uses. In the README's format, highest priority first.

**What a person feels on these screens.** The parts are right: the detail page, the cards, the
marks, the words. What makes it "not so nice" is a handful of things repeated everywhere. Every
amount is set with gappy, typewriter-like punctuation (`RM58 . 30`). Rows that should be calm grow
third and fourth lines (Accounts, the payment marks, claims). On the split screens the thing you came
for (what you owe, what to pay) sits at the bottom. And a few screens build their own version of a
block (Shared's cards, Accounts' rows, *Elsewhere*, the name box), so they don't match their
siblings. Fix those and the area reads as one calm, trustworthy app.

Count: 5 P1, 15 P2, 11 P3.

---

### 1. Every amount: gappy, monospaced punctuation, worst on the large figures
- Seen: every amount reads as `RM58 . 30`, with the dot and comma each a full digit wide. Worst on the
  large figures: the payment's `RM58.30` (`txn--minted-light--p1.png`), the Accounts total
  `RM29 , 871 . 77` (`accounts--minted-light--p1.png`), the bill's `RM64.13`
  (`split-public--minted-light--p1.png`). Also in every list (`payments--minted-light--p1.png`, the day
  headers' *Spent*), in sentences (*Sen has RM14 , 650 . 87*, `balance-check--minted-light--p1.png`),
  and in dark the same.
- Why it matters: amounts are what this app is for. The wide separators make them slower to read
  and look like a font fallback, not a finished app. The rule (patterns §3) is `tabular-nums` *where
  amounts line up in a column*. `Money` puts it on every amount, through `.num`, and Schibsted
  Grotesk's `tnum` swaps in tabular `.` and `,` too.
- Change, in two parts, both at the block level:
  1. `Money` (`blocks/money.tsx`) gets `figures?: 'tabular' | 'proportional'`, `'tabular'` by
     default. `'proportional'` drops the `num` class. Use `'proportional'` wherever the amount stands
     alone or sits in a sentence: `HeaderCard`'s figure (pass it from `txn.tsx`, `account.tsx`,
     `shared/parts.tsx` `BillHeader`), the Accounts total, and every `Money` with `whole` (a
     sentence). Simplest: `whole` implies proportional unless `figures` says otherwise.
  2. Where it stays tabular (lists, fact grids), narrow the separators. Render each `,` and `.` in
     `<span className="num-sep">` and add this to `app.css`'s utilities:
     `.num-sep { font-variant-numeric: normal; font-feature-settings: "tnum" 0; }`. The digits stay
     tabular, so right-aligned columns still line up (every amount ends in `.dd`). Keep the `<wbr>`
     after the comma.
  Check all six looks in the gallery (`/dev/gallery`): a look whose `tnum` already leaves punctuation
  alone must show no change.
- Files: `apps/web/src/blocks/money.tsx`, `apps/web/src/styles/app.css`, `apps/web/src/blocks/facts.tsx`
  (if `HeaderCard` sets the figure's props), `apps/web/src/screens/money/accounts.tsx`
- Priority: P1
- Shared: every amount in the app: Home's figure, Review, Insights, receipts, confirm, Settings
- Builder: Sonnet, S

### 2. Balance check: an empty box reads as "the bank shows RM0.00"
- Seen: each account's box shows a large, semibold, grey `RM 0.00` before anything is typed
  (`balance-check--minted-light--p1.png`, `p2`, `balance-check--minted-dark--p1.png`). At 36 px and
  semibold the placeholder looks typed: four accounts all "showing" RM0.00 beside Sen's RM14,650.87.
- Why it matters: trust. This is the one screen where a person compares two real figures, and a fake
  zero beside a real balance is alarming. `MoneyInput` already takes `placeholder=""` for exactly this
  (its own comment cites QA B08 run 3, 4), and Accounts' *Add* sheet passes it. The balance form
  doesn't.
- Change: in `balance-form.tsx`, pass `placeholder=""` to each `MoneyInput`, and
  `hint="Leave it empty to skip this account"`. In `MoneyInput` (block), make any placeholder recede:
  add `placeholder:font-normal placeholder:text-muted-foreground/60` to the input's classes, so a
  `0.00` placeholder elsewhere can't pass for a typed amount either.
- Files: `apps/web/src/screens/money/balance-form.tsx`, `apps/web/src/blocks/money-input.tsx`
- Priority: P1
- Shared: the placeholder change reaches every `MoneyInput`: manual, confirm, payday's step 2,
  first run's balances, Settings' claim schemes
- Builder: Haiku, XS

### 3. Accounts: each account row is a stack of four mismatched lines
- Seen: a tracked account is its name, then a grey pill *Checked 1 Oct* on a line of its own, then
  *From Ryt Bank · Main account and pockets together* wrapped over three lines, with the balance
  floating in the middle (`accounts--minted-light--p1.png`, `accounts--minted-dark--p1.png`). Rows run
  90 to 170 px and no two match. *From Ryt Bank* under *Ryt Bank*, and *From TNG eWallet* under *TNG
  eWallet*, just repeat the name.
- Why it matters: this is where a person reads their balances, and it's the most cramped list in
  the area. It doesn't look like the payment rows beside it (patterns §7 *Rows*: a mark, the title,
  one secondary line, the amount, then marks as small icons with words). A pill in the middle of a
  row reads as a button.
- Change: build the row from `ListRow` (`blocks/rows.tsx`), not a hand-rolled `Item`. Give
  `ListRow` an optional `mark?: ReactNode`, which replaces the icon tile when present (see 15 for
  the mark). The row's parts:
  - title: the account name.
  - secondary: what its one figure holds (`HOLDS[a.package]`, kept by D147 (3)). Add *From {app}* only
    when the app's name differs from the account's, as `accountLine` and `outside/logic.ts`'s
    `accountHint` already decide (*From MyPB*, *From Grab*). It wraps rather than cuts (D147).
  - marks: two new `RowMark`s in `MARKS`: `'checked'` (`CalendarCheckIcon`, text *Checked 1 Oct*;
    `Marks` needs to take a label override, or the row passes the text) and `'unchecked'`
    (`CircleAlertIcon`, *Not checked*, in `text-money-warning`).
  - Drop the `Badge`.
  Each row then comes out 56 to 76 px.
- Files: `apps/web/src/screens/money/accounts.tsx`, `apps/web/src/blocks/rows.tsx`
- Priority: P1
- Shared: `ListRow`'s `mark` slot is reused by 15. The new marks are available to any list
- Builder: Sonnet, M

### 4. Split, a friend paid: what you owe is buried under the whole bill
- Seen: on a split Mei paid, the first screen is the bill, *Final*, the shares and the start of
  the items (`split_friend-paid--minted-light--p1.png`). *You owe RM24.40 to Mei*, the QR and the
  pay buttons only come after every item, a full screen down (`p2`). Then the QR floats outside any
  card, and the pay buttons (*Pay with TNG*, *Other app…*, *Save QR*, chips) are smaller than *I've
  paid* (a full-width 48 px secondary) above them.
- Why it matters: once the split is final, the question this screen answers for someone who didn't
  pay is "what do I owe, and how do I pay?" (screens.md `split` item 7). Patterns §7: "Say what's
  primary." Here the answer is hidden, and the buttons say the wrong one matters most.
- Change, in `split.tsx`, when `final && v.owe`:
  - Move the *You owe* block straight under the status card, above the shares and items.
  - Put the QR and `PayActions` inside that card (the `StatusCard`'s children), under the title
    line.
  - Make the most likely way to pay the main button: the first of `PayActions` (*Pay with TNG* in
    the shell) at `size="default"`, full width. The rest stay `size="chip"` in one row. Make *I've
    paid* `variant="ghost" size="sm"`, under the explanation line.
  - When `v.owe.paid`, the card shrinks to its *Paid* state and stays in the same place.
- Files: `apps/web/src/screens/shared/split.tsx`, `apps/web/src/screens/shared/parts.tsx` (`PayActions`
  takes a `primary` flag for its first action)
- Priority: P1
- Shared: 5 uses the same order on the friend's page
- Builder: Sonnet, M

### 5. Split link, final: *Pay RM22.14* is the last thing on the friend's page
- Seen: on the page a friend opens from the link, once the split is final, the items come first,
  then *Everyone*, then *Your share RM22.14*, then *Pay RM22.14* and the QR at the very bottom
  (`split-public_final--minted-light--p1.png`, `p2`). *Pay with an app* and *Save QR* are chips, with
  no main button, and *Your share* repeats the same figure just above *Pay*.
- Why it matters: this page answers "what did I have, and what do I pay?" (screens.md
  `split-public`). A friend who opens a link after dinner should see the amount and the QR first,
  in a browser, often on mobile data. It is also the only screen of Sen a friend ever sees.
- Change, in `split-public.tsx`, when `final && v.pay`:
  - Move the `Pay` section directly under the status card and wrap it in a `Card`: *Pay RM22.14*
    (`text-2xl font-semibold`, proportional figures as in 1), the QR, its caption, then *Pay with an
    app* as the main button (`size="default"`, full width) and *Save QR* as `variant="secondary"
    size="sm"`.
  - Drop the *Your share* `FactGrid` when final: the pay card says it.
  - Items and *Everyone* follow, unchanged.
- Files: `apps/web/src/screens/shared/split-public.tsx`, `apps/web/src/screens/shared/parts.tsx`
- Priority: P1
- Shared: none
- Builder: Sonnet, S

### 6. Split status card: the general rule is bold, what it's waiting for is small and grey
- Seen: *Still changing* is a 13 px grey label. Under it, the biggest text in the card is the
  general rule, *Shares move until everyone is done and every item is claimed.*, in semibold. The
  one line that's about this bill, *Waiting for You, Kah Hoe · 1 item nobody has ticked*, is the
  smallest and greyest (`split--minted-light--p1.png`, `split-public--minted-light--p1.png`,
  `split-public_new--minted-light--p1.png`). *Final* has the same shape.
- Why it matters: the hierarchy is upside down (patterns §7 *Status cards*: the state in words
  first, with an icon, then what it's waiting for). Someone reads the rule every time and has to
  hunt for who they're waiting on. *Waiting for You* with a capital *You*, mid-sentence, reads as a
  name.
- Change:
  1. `StatusCard` (block): draw `state` at body level, `text-base font-semibold`, with an icon of
     `size-5`. The status colour stays.
  2. In `split.tsx` and `split-public.tsx`, swap what goes where. While still changing, `title` is
     what it's waiting for, as a sentence: *Waiting for you and Kah Hoe, and 1 item nobody has ticked*.
     Join names with commas and a final *and*, write *you* in lower case, and say *Nobody is
     left to tick* when the list is empty. `waiting` becomes the rule, shortened to *Shares can move
     until everyone is done.* When final, `title` stays *Everyone is done and every item is claimed.*
  3. Put the join in one helper beside `linkLine`, `waitingSentence(names, unclaimed)`, used by both
     screens.
- Files: `apps/web/src/blocks/status.tsx`, `apps/web/src/screens/shared/split.tsx`,
  `apps/web/src/screens/shared/split-public.tsx`
- Priority: P2
- Shared: every `StatusCard`: claims' status, payday's plan, the *You owe* card
- Builder: Sonnet, S

### 7. Shared bills: hand-made cards, a green status line, and *Open* on every open bill
- Seen: each bill is its own card: overlapping initials discs (*Y*, or *Y* and *M*), the merchant in
  semibold, the total in semibold, a status line, and an *Open* badge (`shared--minted-light--p1.png`,
  `shared--minted-dark--p1.png`). *You paid · still changing* and *You paid · 1 of 2 paid you back*
  are in money-in green. Every card on the *Open* tab says *Open*. *Mei paid · you owe RM24.40*
  writes its amount as plain text.
- Why it matters: patterns §7 *Rows* names shared bills as a list row, in a `GroupCard`. A list of
  cards reads heavier than Payments, its sibling one tap away. Green means money in (§3), and a
  status phrase with no money in it is never green; the colour should follow what's owed. The *Y*
  disc says nothing, since it's on almost every bill. The *Open* badge repeats the tab.
- Change: rebuild `Bill` as a `ListRow` inside one `GroupCard`:
  - mark: the bill's category tile (`categoryIcon`/`categoryTone`, as on Payments). If
    `SharedView` rows carry no category, add it to the view (`packages/core` `views.ts`, fake and API).
    Until then, use `SplitIcon`, `tone="accent"`.
  - title: the merchant (`readableName`).
  - secondary: *16 Oct · You paid · 1 of 2 paid you back*, in the muted secondary colour.
  - amount: what moves for you, not the bill's total. *You owe RM24.40* is `Money kind="out"`.
    Owed to you is `Money kind="in"` (the `+` and green carry it), from the open shares. A settled
    bill shows its total, muted. If the view doesn't carry these sums, keep the total for now and
    note it for the view.
  - Drop the `Badge` and the `PersonAvatar` stack.
- Files: `apps/web/src/screens/shared/shared.tsx`; the view: `packages/core/src/views.ts`,
  `apps/web/src/data/fake/views.ts`, the API's shared route
- Priority: P2
- Shared: none
- Builder: Sonnet, M (S if the view already has what's needed)

### 8. Payment: *Receipt* and *Split* appear twice, as actions and as linked rows
- Seen: the action bar has *Receipt* and *Split*, and two cards down the linked card has *Receipt ·
  4 items* and *Split · Still changing* (`txn--minted-light--p1.png`). Two ways to the same place,
  one above the other.
- Why it matters: patterns §7 *Detail page*: actions in the `ActionBar`, then what's linked to it
  as `NavRow`s. Once a receipt or a split exists it's linked, not an action, and showing both makes
  the screen look busier than it is. `txn.tsx` is the reference detail page (patterns §7), so other
  screens copy what it does.
- Change, in `txn.tsx`'s `actions`:
  - Push *Scan receipt* only when there's no receipt (`!v.receipt && spend && !t.noReceipt`), and
    *Split* only when there's no split (`spend && !v.split`).
  - The linked card keeps the destinations.
  - With both linked, the bar is *Ask Sen* and *More*. That's fine: `ActionBar` already spreads
    its columns to fit.
- Files: `apps/web/src/screens/more/txn.tsx`
- Priority: P2
- Shared: none (the reference screen, so later details copy it)
- Builder: Haiku, XS

### 9. Payment rows: marks drop to a third line, so rows jump between two heights
- Seen: *Siti Aminah Bt Yusof · No category yet · TNG eWallet* pushes *In Review* to a third line,
  while *Lim K H · Money in · Ryt Bank · In Review* fits on two (`payments--minted-light--p1.png`,
  `p2` *TAN WEI MING → Ryt Bank*, `p3` *Tan Ah Kow*). The list's rhythm breaks every few rows. The
  virtualiser guesses 58 px a row, and a 74 px row reflows the rows under it as you scroll.
- Why it matters: patterns §7 *Rows*: "56 px or more, a stable height, so long lists virtualise", and
  the marks sit after the secondary line. A merchant or a category truncates before anything that
  says the row's state.
- Change, in `ListRow` (block): make the description line not wrap (`flex-nowrap` instead of
  `flex-wrap`). The secondary text takes `min-w-0 truncate` and shrinks. `Marks` stays
  `shrink-0`, and inside `ListRow` it renders `flex-nowrap` (one or two marks always fit; three
  never occur on one row today). Then *No category yet · TNG eWa… · In Review* is cut at the
  account, never at the mark. Remove `text-balance` from the description. Keep `Marks`' own
  `flex-wrap` for other callers.
- Files: `apps/web/src/blocks/rows.tsx`
- Priority: P2
- Shared: every `ListRow`: account's recent payments, *Mark as… → Refund of*, Home's and Review's
  lists if they use it
- Builder: Haiku, XS

### 10. Payees: *Atm Withdrawal*, *Bbq Place*, and a transfer left in capitals
- Seen: *ATM WITHDRAWAL* shows as *Atm Withdrawal* and *BBQ PLACE* as *Bbq Place*
  (`payments--minted-light--p2.png`, `p3`; `shared--minted-light--p1.png`;
  `split_final--minted-light--p1.png`). Meanwhile *TAN WEI MING → Ryt Bank* stays in capitals
  (`payments--minted-light--p2.png`, dark too), because the account half has lower case, so
  `readableName` leaves the whole title alone.
- Why it matters: patterns §2 *Names as people read them*. Title case that mangles an acronym looks
  careless, and one row shouting in capitals among calm ones draws the eye for no reason.
- Change, in `lib/names.ts`:
  1. Treat ` → ` as a separator: split on it, run `readableName` on each side, and join with
     ` → `.
  2. Keep known acronyms in capitals inside a title-cased name: a `KEEP_CAPS` set (`ATM`, `BBQ`, `KFC`,
     `TNG`, `ZUS`, `PB`, `GO+`, `DuitNow` as written). Leave `HJ` → *Hj* and `BT` → *Bt* as they are
     (Malay name parts, not acronyms).
  3. Add cases to `names.test.ts` for each.
- Files: `apps/web/src/lib/names.ts`, `apps/web/src/lib/names.test.ts`
- Priority: P2
- Shared: every payee in the app (Home, Review, receipts, Insights' merchant lists)
- Builder: Haiku, S

### 11. Split: a bill's mark is a person, and *Y* means you
- Seen: the bill's header card leads with a 56 px disc of the payer's initials: *Y* when you paid,
  *M* for Mei, *WM* on the friend's page (`split--minted-light--p1.png`,
  `split_friend-paid--minted-light--p1.png`, `split-public--minted-light--p1.png`). The rows below use
  40 px discs beside 32 px tiles everywhere else.
- Why it matters: the header's mark says what the thing *is* (patterns §7 *Detail page*: "the
  mark"). For a bill that's its category, as on the payment it came from. *Paid by You* is already
  in the meta line. A *Y* disc reads like an avatar with no name. Person discs larger than every
  other leading mark make the people rows heavier than the items under them.
- Change:
  - `BillHeader` (`parts.tsx`): the mark is the category's `IconTile size="lg"`
    (`categoryIcon`/`categoryTone`) when the view has the category. Otherwise it's
    `IconTile icon={SplitIcon} tone="accent"`, never `PersonAvatar`. The meta line keeps *Paid by…*.
  - `PersonAvatar`'s default `size` in rows becomes `default` (32 px, a row's mark, patterns §2),
    and `lg` stays for anywhere a person is the subject.
  - Check that `Avatar`'s `default` is 32 px in `components/ui/avatar.tsx`.
- Files: `apps/web/src/screens/shared/parts.tsx`, `apps/web/src/blocks/group.tsx`
- Priority: P2
- Shared: every `PersonRow` (members in Settings, if any)
- Builder: Haiku, S

### 12. Claims: the month's meter is amber because a receipt is missing
- Seen: the September card's bar is amber in light and bright orange in dark
  (`claims--minted-light--p1.png`, `claims--minted-dark--p1.png`). It shows *RM152.00 of RM200.00*
  claimed against the caps, and it turns warning-coloured because one claim lacks a receipt. The
  caption *RM152.00 of RM200.00* doesn't say what the RM200 is.
- Why it matters: patterns §7: `Progress` is in the chart accent, and the warning colour is for a
  budget at risk. Being RM48 under the caps isn't a risk, so the bar looks like an alarm about the
  amount, while the real problem (a missing receipt) is already said in words on its row.
- Change, in `claims.tsx`'s `PeriodCard`:
  - The `Progress` is always `tone="accent"`.
  - The caption reads *2 to submit · RM152.00 claimed of RM200.00 allowed*.
  - Remove the `missing` variable.
- Files: `apps/web/src/screens/money/claims.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, XS

### 13. Claim: no amount in the header, the status said three times, four loud *Copy* buttons
- Seen: the header card has a dashed-circle tile, *Phone bill · September 2026*, *Submit by 25 Oct*
  and a status pill, but no amount (`claim--minted-light--p1.png`). The amount is a fact in the grid
  below. The status shows as the pill, again as the stepper's current step, and *Submit by* is in
  the header and the grid. *Copy into ESS* has four 40 px filled *Copy* buttons, the heaviest
  things on the screen.
- Why it matters: patterns §7 *Detail page*: the `HeaderCard` holds "the amount large". A claim is
  money owed back, and the amount is what to look at first. Saying the same thing three times is
  noise (patterns §7.7). The *Copy* buttons compete with *Send to ESS*, the one main action.
- Change, in `claim.tsx`:
  - `HeaderCard`: `figure={<Money sen={c.amount} />}` and `copy={c.amount}`. `meta` is the scheme and
    period, *Submit by 25 Oct* moves to `source`, and drop the status `badge` (the stepper says it).
  - `FactGrid`: drop *Amount* and *Submit by*, and keep *Capped at* and *Evidence*.
  - Each *Copy*: `variant="ghost" size="sm"`, keeping the icon and the word.
- Files: `apps/web/src/screens/money/claim.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, S

### 14. Claim, evidence missing: *Still missing* says how but offers no button, and *Send* is greyed out
- Seen: *Receipt for 21 Sep not added yet. Scan the receipt, or share its photo to Sen and keep it
  as evidence only.* sits in a card with a warning tile and nothing to tap
  (`claim_evidence-missing--minted-light--p1.png`). At the bottom, *Send to ESS* is a disabled grey
  slab, with two lines of explanation under it (`p2`). On the list, *Send to ESS* is the same when
  nothing is ready.
- Why it matters: screens.md `claim`: "missing evidence with how to add it". The way to add it should
  be one tap away. Patterns §7 *Forms*: "the submit button stays enabled and says what's missing". A
  greyed main button looks broken.
- Change:
  - Each missing row gets an action: `NavRow` with `onOpen` that opens the scanner for this claim
    (`navigate({ to: '/scan', search: { claim: c.id } })`, or the scan path the scan screen
    takes; if scanning for a claim doesn't exist yet, `toastDone('Scanning for a claim arrives
    with B25')` as the other stand-ins do). Title *Receipt for 21 Sep*, description *Scan it, or
    share its photo to Sen*, a chevron.
  - *Send to ESS* (claim and claims) loses `disabled`, uses `aria-disabled` while sending, and when
    tapped with evidence missing scrolls to *Still missing* and toasts *Add the receipt for 21 Sep
    first*.
- Files: `apps/web/src/screens/money/claim.tsx`, `apps/web/src/screens/money/claims.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 15. Accounts, account, balance check: an account has three different marks
- Seen: the list draws a letter on a blue-grey square (*R*, *P*, *T*, *G*,
  `accounts--minted-light--p1.png`). The account's own page draws a wallet icon
  (`account--minted-light--p1.png`), and the balance check draws the wallet again on every card
  (`balance-check--minted-light--p1.png`). `BankTile` is hand-rolled with `bg-primary/12`, outside
  `IconTile`'s tones.
- Why it matters: the same thing always looks the same (patterns §5). The letter tile, outside
  `IconTile`, will weigh differently in each look.
- Change: add `InitialTile` to `blocks/tile.tsx`: the first letter of a name, `text-sm font-semibold`
  (`text-lg` at `lg`), on `IconTile`'s square, radius and tones (`size` `default` 32 or `lg` 48,
  `tone` default `accent`), `aria-hidden`. Use it as the account's mark everywhere: Accounts' rows
  (through `ListRow`'s `mark`, 3), *Not added yet*, the `account` header (`size="lg"`) and each
  balance-check card. Delete `BankTile`.
- Files: `apps/web/src/blocks/tile.tsx`, `apps/web/src/screens/money/accounts.tsx`,
  `apps/web/src/screens/money/account.tsx`, `apps/web/src/screens/money/balance-form.tsx`
- Priority: P2
- Shared: first run's accounts step if it shows a mark (`outside/first-run.tsx`); payday's step 2
- Builder: Haiku, S

### 16. Balance check: four cards take two screens for four numbers
- Seen: each account card is about 250 px tall: a header, a label, a 36 px amount on an underline,
  then *Matches* alone on its own row (`balance-check--minted-light--p1.png`, `p2`). Four accounts take
  two full scrolls before *Save*.
- Why it matters: patterns §7 *Forms*: "the amount shows large as it's typed". That fits a form with
  one amount (manual, confirm). With four, the size turns a quick monthly check into a long form.
- Change:
  - Add `size?: 'lg' | 'md'` to `MoneyInput` (block), `lg` by default as now. `md` sets the amount
    at `text-2xl` and the prefix at `text-base`.
  - In `balance-form.tsx`, use `size="md"` and put *Matches* on the field's row: the field `flex-1`,
    *Matches* (`variant="secondary" size="chip"`) at its right, aligned to the input's baseline.
  - The difference badge keeps the line below, shown only once something is typed.
  Aim for about 150 px a card, so four fit above *Save*.
- Files: `apps/web/src/blocks/money-input.tsx`, `apps/web/src/screens/money/balance-form.tsx`
- Priority: P2
- Shared: payday's step 2 (the same form, `payday.tsx`)
- Builder: Sonnet, S

### 17. Accounts: *Check balances* sits at the top, out of thumb reach, and competes with the total
- Seen: a full-width 48 px navy pill straight under the total (`accounts--minted-light--p1.png`). The
  eye goes total, button, list. In dark it's a pale slab, the brightest thing on the screen
  (`accounts--minted-dark--p1.png`).
- Why it matters: patterns §7 *Screens*: "A screen's main action sits in the bottom third, in reach
  of a thumb." The total is what this screen is for, and checking is a monthly task.
- Change: move the button below the last group (after *Elsewhere*, *Not added yet* and *Archived*),
  still `size="default"` and full width, with 24 px above it.
- Files: `apps/web/src/screens/money/accounts.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, XS

### 18. Split, you paid: *Write off* floats on its own, and whose RM48.80 it is isn't said
- Seen: under *Who has paid you back* sits a lone secondary pill, *Write off*, then *Stop waiting
  for RM48.80. It counts as your spending.* (`split_final--minted-light--p2.png`). It's Kah Hoe's
  share, but the screen doesn't say so.
- Why it matters: writing off what a friend owes is rare and changes your spending. Patterns §7.4:
  rare actions go behind ⋯ and still offer *Undo*. A loose button between cards looks unfinished.
- Change:
  - Put *Write off what's still owed* in a `DropdownMenu` (⋯) in the app bar's one action slot,
    which is free once the split is final. When the share icon still shows, put it in the menu
    beside *Share the link*.
  - Name it in words: *Write off RM48.80 from Kah Hoe*, or with two or more unpaid, *Write off
    RM97.60 still owed*.
  - It acts at once, with `toastUndo` saying *Wrote off RM48.80. It counts as your spending*.
  - Remove the loose button and its line.
- Files: `apps/web/src/screens/shared/split.tsx`
- Priority: P2
- Shared: none
- Builder: Sonnet, S

### 19. Segmented, in dark: the chosen option barely shows
- Seen: on Shared bills in dark, *Open · 3* (chosen) and *Settled · 0* differ only by a shade, with
  `card` on `muted` nearly the same (`shared--minted-dark--p1.png`). In light it reads
  (`shared--minted-light--p1.png`).
- Why it matters: patterns §7 *Segmented*: "the chosen one raised". Which tab you're on must never
  rest on a faint shade (patterns §8, contrast).
- Change: `components/ui/toggle.tsx`, the `segment` variant: add
  `data-[state=on]:font-semibold data-[state=on]:ring-1 data-[state=on]:ring-border` to the on state,
  so it's raised by an edge and weight, not only fill.
- Files: `apps/web/src/components/ui/toggle.tsx` (update its `// Sen:` note)
- Priority: P2
- Shared: every `Segmented`: Settings' mode, Categories and Rules, Review's kinds
- Builder: Haiku, XS

### 20. Payments, empty: no way forward, and filters for nothing
- Seen: *No payments yet / Payments show here as Sen captures them.* with no button, under a
  search box, three filter chips and *0 payments* (`payments_empty--minted-light--p1.png`).
- Why it matters: patterns §7.9 *Empty*: an icon, a title, one line, and the action that fills it.
  Filters over an empty list are controls that can't do anything.
- Change, in `payments.tsx`: when there are no rows and no filter is active, hide the search, chips
  and count (render `controls` only when `rows.length || active`). Give the empty state
  `action={{ label: 'Add one by hand', onSelect: () => go('manual') }}` (with `canOpen('manual')`).
- Files: `apps/web/src/screens/more/payments.tsx`
- Priority: P2
- Shared: none
- Builder: Haiku, XS

### 21. Shared preview data: the account page contradicts itself on dates
- Seen: Ryt Bank's page says *Opening balance RM3,200.00 on 31 Oct*, *Computed from your
  notifications since 31 Oct*, and *Last checked 1 Oct*, with a check on 1 Oct, all over payments
  dated 18 Oct (`account--minted-light--p1.png`, `p2`). Accounts lists Ryt *Checked 1 Oct* and the
  rest *Checked 31 Oct* (`accounts--minted-light--p1.png`).
- Why it matters: previews are where the owner judges every screen, and a check before its
  opening balance looks like a bug in Sen's arithmetic, not in the made-up data.
- Change: in the fake scenario, keep the dates in order: each account's `openingAt` on the
  scenario's first day (before its first payment), its checks after the opening and before the
  scenario's today, and `checkedAt` equal to the latest check. Nothing in the screens changes.
- Files: `apps/web/src/data/fake/scenario.ts` (accounts and checks), `apps/web/src/data/fake/views.ts`
  if it derives `openingAt`
- Priority: P2
- Shared: Home's balance and payday's step 2 in previews
- Builder: Haiku, S

### 22. Accounts: *Elsewhere* is a grey, disabled-looking box built by hand
- Seen: *Elsewhere* is a `Card` filled `bg-muted/60`, with its explanation inside and *Maybank* /
  *No balance* as bare text (`accounts--minted-light--p1.png`,
  `accounts_capture-off--minted-light--p2.png`). It looks disabled, and unlike *Tracked* above it.
- Why it matters: patterns §7.2: rows sit in a `GroupCard` with a label above and an optional footer
  line. A hand-made section drifts in other looks (Line draws cards as rules).
- Change: `GroupCard label="Elsewhere" footer="Kept elsewhere, so Sen shows no balance for them."`,
  with one 56 px row per account: `InitialTile tone="neutral"`, the name at body size, and *No
  balance* on the right in `text-sm text-muted-foreground`. No chevron, since it opens nothing.
- Files: `apps/web/src/screens/money/accounts.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 23. Split items: hairlines between items, where no other card has them
- Seen: the *Items* card draws a full-width line between every item (`split--minted-light--p1.png`,
  `split-public--minted-light--p1.png`), while *Who's done* above it and every other card in the area
  have none.
- Why it matters: one look for one block (patterns §7.2, "no full-bleed dividers"). The lines come
  by accident: `GroupCard`'s `divide-y` reaches the `<div>` that `ItemRows` wraps around each item,
  while an `Item` child cancels it with its own transparent border.
- Change: in `ItemRows` (`parts.tsx`), give each wrapping `<div>` the class `border-transparent`, so
  items match every other card. The `Everyone` / `Someone else…` chips stay inside that wrapper,
  under their item.
- Files: `apps/web/src/screens/shared/parts.tsx`
- Priority: P3
- Shared: none (if the components plan settles on inset separators for every `GroupCard`, follow
  that instead)
- Builder: Haiku, XS

### 24. Split: *Your share* and *Your spending* show the same figure side by side
- Seen: *Your share so far RM23.17 · Your spending so far RM23.17* (`split--minted-light--p2.png`), and
  again on every final split (`split_final--minted-light--p2.png`, `split_friend-paid--minted-light--p3.png`).
- Why it matters: two labels and one number make a person look for the difference, and there is
  none. `txn.tsx` already shows one fact, labelled by which it is.
- Change, in `split.tsx`'s `facts`: when `v.mySpending === v.myShare`, show one fact, *Your share*
  (or *Your share so far*). Show both only when they differ (after a write-off, or when a friend's
  part is lent).
- Files: `apps/web/src/screens/shared/split.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 25. Account checks: a difference shown as a red pill with no icon
- Seen: *1 Oct: bank showed RM4,812.35* with a pink pill, *RM42.10 less*, red in dark
  (`account--minted-light--p2.png`, `account--minted-dark--p2.png`). The pill has no icon, and the
  figure in the sentence isn't a `Money`.
- Why it matters: patterns §3: a warning is `money-warning` with an icon and words, and never by
  colour alone. A difference already booked as *Unaccounted* is information, not an alarm.
- Change, in `account.tsx`'s *Checks*:
  - Title: *1 Oct · bank showed* followed by `<Money sen={c.balance} whole />`.
  - Trailing: `<Badge variant="muted">` holding `<Money sen={…} whole /> less` (or *more*), and for
    the match keep `variant="accent"` with `CheckIcon`.
  - When the difference is over RM50 (or whatever the spec's gap threshold is, if it names one),
    use `variant="warning"` with `TriangleAlertIcon`.
- Files: `apps/web/src/screens/money/account.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 26. Payment: small words that read unfinished
- Seen:
  - *Changes* reads *Fri, 16 Oct, 19:32 · Captured, automatically* (`txn--minted-light--p2.png`).
  - The split row's line breaks as *0 of 2 paid you back ·* / *RM0.00 of RM28.93*, leaving a dot at
    the end of a line (`txn--minted-light--p1.png`).
- Why it matters: small, but they're the difference between finished and nearly.
- Change:
  - In `txn.tsx`'s change list, drop the comma for the system: `{c.what} automatically`, `{c.what},
    by you`, `{c.what}, by Sen` read better as `{c.what} by you`, `{c.what} by Sen`, `{c.what}
    automatically`.
  - In the split `NavRow`, render `v.split.detail` with each `·` part in its own
    `<span className="whitespace-nowrap">`, so a break falls between parts and never leaves a dot.
- Files: `apps/web/src/screens/more/txn.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 27. Split link, first visit: the name box is a hand-made box
- Seen: *What's your name?* sits in a bordered box with no card fill: grey in light, darker than
  the cards in dark (`split-public_new--minted-light--p1.png`, `split-public_new--minted-dark--p1.png`).
  It uses `rounded-xl` rather than the card radius.
- Why it matters: the friend's page should look like the app (screens.md `split-public`: "same
  components and theme"). Every other block on the page is a `Card`.
- Change, in `split-public.tsx`'s `NameBox`: wrap the form in `Card` (`CardContent`, `gap-3`), with
  the label through `Field`/`FieldLabel` and the hint through `FieldDescription`. Focus the input on
  load (`autoFocus`), with `autoComplete="given-name"` and `enterKeyHint="go"`.
- Files: `apps/web/src/screens/shared/split-public.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 28. Payments, offline: a row not synced yet keeps the plain amount colour
- Seen: *Kuih* and *Teh tarik* carry *Not synced yet* with its icon, but their amounts are in the
  ordinary text colour (`payments_offline--minted-light--p1.png`).
- Why it matters: patterns §3: "Not synced yet is `money-pending`, with those words". The words are
  there, but the amount doesn't follow.
- Change, in `ListRow` (block): when `marks` includes `'pending'` and `kind` is `'out'`, draw the
  amount with `kind="pending"`. Money in keeps `'in'`, since its sign carries it.
- Files: `apps/web/src/blocks/rows.tsx`
- Priority: P3
- Shared: every `ListRow` with a pending mark (Home's recent rows)
- Builder: Haiku, XS

### 29. Claims: a claim row runs to four lines, and a deadline two days away looks like any other
- Seen: *Parking* reads *To submit · evidence missing / Submit by 20 Oct / Receipt for 21 Sep / not
  added yet*, the last two lines in the text colour (`claims--minted-light--p1.png`). The scenario's
  today is 18 Oct, so 20 Oct is in two days, and nothing says so.
- Why it matters: rows say their state briefly (patterns §7.5), and a near deadline is the one thing
  worth flagging on this screen.
- Change, in `claims.tsx`'s `PeriodCard` rows:
  - Description line 1: the state (as now).
  - Line 2: the deadline, and when it's within 7 days, *Submit by Tue, 20 Oct · in 2 days*, with a
    `ClockAlertIcon` (`size-3.5`) in `text-money-warning`.
  - Drop the missing-evidence line from the list row: the state already says *evidence missing*,
    and the claim's page lists what.
  - Put the relative-days helper in `claim-status.ts` (`claimDue`).
- Files: `apps/web/src/screens/money/claims.tsx`, `apps/web/src/screens/money/claim-status.ts`
- Priority: P3
- Shared: the claim's header (13) uses `claimDue` too
- Builder: Haiku, S

### 30. Split link, closed: *Closed / This split is closed*
- Seen: the title and the line say the same thing, the line without a full stop
  (`split-public_closed--minted-light--p1.png`).
- Why it matters: the empty state's line says what happens next (patterns §7.9). A friend who
  arrives late wants to know whether they still owe anything.
- Change: title *This split is closed*. Line *Ask {payer} if something's not right.* when the closed
  view knows the payer's name, otherwise *It closed a day after the last payment was ticked.*
- Files: `apps/web/src/screens/shared/split-public.tsx` (`Closed`)
- Priority: P3
- Shared: none
- Builder: Haiku, XS

### 31. Split: one group, four names
- Seen: the people in a split are headed *Who's done* while it changes, *Shares* once final in the
  app (`split_final--minted-light--p1.png`), *Everyone* once final on the friend's page
  (`split-public_final--minted-light--p2.png`), and *Mei's tick list* when Mei paid
  (`split_friend-paid--minted-light--p2.png`).
- Why it matters: words never vary for the same thing (patterns §1, *Words*). The same group should
  keep one name, so a person learns it once.
- Change: *Who's done* while it changes. *Shares* once final, in the app and on the friend's page.
  When a friend paid, *Who has paid {payer}* (it's that list: *Not paid yet*, *Paid the bill*),
  matching *Who has paid you back* when you paid.
- Files: `apps/web/src/screens/shared/split.tsx`, `apps/web/src/screens/shared/split-public.tsx`
- Priority: P3
- Shared: none
- Builder: Haiku, XS

---

## Keep

These are right and must survive the polish:

- **The payment's detail page** (`txn`) as the reference: a header card with the source line (*From
  Ryt Bank's notification*), an action bar with ⋯, a fact grid with tappable values (*Meals ›*,
  *Add a note ›*), linked rows that say their state (*4 items*, *Still changing*), and *What the bank
  said* in the bank's own words, selectable. Only 8 and 26 touch it.
- **The payments list's bones:** sticky day headers with the day's spending, one row per payment with
  category tile, *Category · Account* and the amount, marks as small icon-and-word labels, search with
  a local example (*char kuey teow*), and filters as one sideways row of chips. Money in with `+` and
  green, spending plain (§3).
- **The offline banner** at the top in words, and *Not synced yet* rows mixed into the list where
  they belong.
- **Words that explain once and then step back:** *Computed from your notifications since … Not the
  bank's own figure.*, *A difference is booked as Unaccounted.*, *The link is open. It closes a day
  after the last payment is ticked.*, *Sen sees your payment if you send it from an app it reads.*
- **Status cards in words with an icon** (*Still changing* with an hourglass, *Final* with a lock).
  Only their order inside changes (6).
- **The split's tick rows:** a checkbox leads and the whole row ticks it. *Shared ÷3: You, Ali, Kah
  Hoe · your part RM4.67*, *Nobody has ticked this* with its icon, and *Everyone* / *Someone else…*
  right under the unclaimed item.
- **Main actions at the bottom** where they are already: *I've ticked everything I had* (sticky on the
  friend's page), *Save* on the balance check, the tab bar hidden there.
- **The claim's stepper** (*Draft · Ready · Sent · Approved · Paid*), *Copy into ESS* in ESS's order,
  and files as tiles with *Share*.
- **Empty and gone states** with an icon tile, a title, one line and a way back (*Not here any more
  · See shared bills*).
- **Accounts' capture warning** where the balances are read, and *Not added yet* with *Add* (D148).
- **The friend's page** carries Sen's wordmark and the same components as the app, with no login and no
  sign-in prompt.

## Needs the owner

- **Nothing here bends a decision or a pattern.** Two calls are close to one, and are the owner's to
  overrule:
  - 1 sets amounts in proportional figures wherever they stand alone or sit in a sentence, and
    keeps `tabular-nums` only in columns. Patterns §3 already says "where amounts line up in a
    column", but the code applies it everywhere, so the owner may have seen and liked the current
    look.
  - 7 changes the amount on Shared bills from the bill's total to what moves for you (*you owe*,
    *owed to you*). screens.md `shared` describes the lines, not the amount, so the owner should
    confirm which figure the row leads with.
- **Outside this area, seen in passing:** Minted's warning pair (`--warn-bg`, `--warn-fg`) is red, so
  the capture warning on Accounts (`accounts_capture-off--minted-light--p1.png`) and every `warning`
  badge read as errors. Patterns §2 keeps red (`destructive`) for removals and wrong fields. A
  look's tokens are the look's own (D77), so this is for the owner and the components plan, not a
  builder.
