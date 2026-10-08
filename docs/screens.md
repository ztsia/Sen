# Screens

Every screen in Sen: the one question it answers, what's on it, and how you get there and back.
Written by `S2`, with the journeys in `flows.md` and the shared patterns in `ui/patterns.md`. Together
they're the UX contract: a build slice builds the screens named here, and a screen that isn't here
gets added here first.

**The wireframe is the picture of this file:** a clickable greyscale prototype of every screen, with
guided journeys and a simulator for notifications, payday and capture failures. The owner reviewed
and approved it on 6 Oct. Its source is `ui/wireframe.html` (open it in any browser), and it's
published, private to the owner, at https://claude.ai/artifact/GV9cJbkjjFSExMgpbWY9Sc. It shows
structure, not the look; the theme comes next (D57). Where the wireframe and this file disagree,
the decisions win, then this file.

The behaviour behind each screen is in `spec_v2.md`; this file cites it rather than repeating it.

**Each screen gives:**
- **Answers:** the one question it's for. Anything on it that doesn't help answer that question goes.
- **Shows** and **Does:** its content, top to bottom, and its actions.
- **From** and **To:** how you arrive and where it leads. Back always returns to where you came from.
- **Varies:** who sees what (D52), and its empty, offline and first-use states.

Screen ids, such as `home` or `confirm`, are how `flows.md`, the wireframe and the build slices refer
to them.

## The map

```
Tabs (D68) ───────────────────────────────────────────────────────────────
Home ───── home ── cycle (sheet) · payday · payments (this cycle)
Review ─── review ── skipped · manual
Scan ───── scan ── reading ── confirm ── split
           (long-press: scan-more · Scan, From gallery, Add manually)
Insights ─ insights ── budgets · subscriptions · goals ── goal · insights/year
More ───── more ── payments ── txn ── receipt
                   shared ── split
                   accounts ── account · balance-check
                   claims ── claim
                   settings ── settings/*

Sen, floating on the tab screens ── sen (sheet) ── agent/memory · agent/research · agent/usage

Outside the tabs ─────────────────────────────────────────────────────────
sign-in · first-run · new-look · split-public (a friend's browser, no login)

Native (Android, outside the web app) ────────────────────────────────────
category prompt · paying-back prompt · quiet scan prompt · owe reminder · health alerts
Sen's push · claim reminders · widgets S/M/L · launcher shortcuts · share target
```

## Rules every screen follows

The details are in `ui/patterns.md`; these shape the map.

- **The tab bar** shows on the five tabs and on screens pushed from them. It hides during a task with
  an end: `first-run`, `payday`, `confirm`, `manual`, `balance-check`, `scan` and `split-public`.
  Each look draws its five icons in its own material, on outlines every look shares (D80).
- **Review's badge** counts *Needs you* only (D72).
- **Sen's button** floats bottom right on the five tab screens, above the tab bar, and nowhere else
  (D68). It opens `sen` over the screen it was tapped on, and Sen knows which screen that was.
  Screens with the button keep enough space at the bottom that it never covers their last row.
- **Android's back gesture** closes Sen's sheet or the top sheet first, then goes back one screen.
- **A person sees only what they can use** (D52). Without capture there's no `accounts`,
  `balance-check`, gap or capture setting. With a feature switched off, its screens, menu entries and
  cards aren't there. With the agent off, there's no Sen button.
- **Health warnings** (§18) sit at the top of `home` until fixed, each with a button that fixes it.
- **Rows still in the outbox** show beside synced ones, marked *Not synced yet* (§5).
- **Every change happens at once, with *Undo* in a toast** (§6.7). Only a destructive action that
  can't be undone asks first.
- **There's no list of people** (D64). Who owes what lives on a split and its payment.

---

## Home

### `home`

**Answers:** what's left until payday, and am I on track?

**Shows** (D59, D68), top to bottom:
1. **Header:** the Sen wordmark.
2. **Health warnings**, if any (§18), each with its fix.
3. **The Payday card**, on payday (D60), until the flow is done or dismissed. After it, the payday
   plan's progress (*2 of 3 moves done*) until every move is ticked or hidden.
4. **Left until payday**, large, with *12 days to go*. Below zero it reads *Over by RM…* in the warning
   colour.
5. **Pace:** *Spent RM2,915.50 this cycle* and *RM140.00 more than last cycle by this day*, with a small
   line of this cycle against last.
6. **Sen's latest note**, such as the 9pm one (§12.1).
7. **A quiet row:** total balance, and the gap the last balance check found, with its date.

**Does:** the large figure opens `cycle`; pace opens `payments`, filtered to this cycle; Sen's note
opens `sen`; the balance row opens `accounts`.

**From:** the Home tab; opening the app; a widget; most notifications.

**Varies:**
- **Without capture** (§9.6, D79): no balance row and no gap. The large figure is this month's spending,
  against last month, and *cycle* reads *month* on every screen. With a payday set in Settings → *You*, they
  count by pay cycle instead, and *Left until payday* appears once they enter the cycle's income.
- **Before the first salary:** the large figure reads *Spent since you started*, not a misleading
  negative.
- **The first cycle** has no last cycle; the pace line says so.
- **Offline:** the figures include outbox rows (§5), and a chip says how many aren't synced.

### `cycle`

A sheet from the large figure. **Answers:** how is *left until payday* worked out, and where will it
end? **Shows:** income received, spending, and the result; the cycle's dates and expected payday; and
the estimate at payday from `project_cycle_end` (§12.3), labelled as one. Counting by month (D79), it shows
the month's spending against last month instead.

---

## Review

### `review`

**Answers:** what needs me, and what am I waiting for? (D72)

**Shows:**
1. **Sen's suggestions:** when Sen has suggested answers (§12.1), a bar offers *Apply all*; each
   suggested button is marked. Each applied answer can still be undone.
2. **Needs you**, counted in the badge. Each row is the question and its buttons:

   | Item | Its row |
   |---|---|
   | A new merchant (§6.3), a hawker included (D70) | The two best guesses and *Other…* |
   | Money in from a name Sen hasn't seen, which could be a split share (D64) | *Whose split share is it?*, with each open share it could be, and *Not a split* |
   | Money in to classify | *Income*, *Transfer*, *Refund of…* (D21) |
   | A split share you owe, unpaid an hour after the split (D65) | *Open the split*, *I've paid* |
   | A receipt read and waiting, without capture | Opens `confirm`; confirming creates the payment (§6.4) |
   | A receipt that couldn't be read | Opens `manual`, with the image |
   | New notification wording | What Sen read, such as *Paid RM6.50 to KEDAI MAJU. Right?*, with *Yes* and *No* (D15) |
   | A transfer missing its other side | *Where did it come from?*, with your accounts and *Elsewhere* (D17) |
   | A balance check that's due | Opens `balance-check` |
   | A claim due within 7 days | Opens `claim` |
   | A skipped payday step | Continues `payday` |
   | A proposal from Sen | *Apply* and *Dismiss* (§12.1) |

3. **Waiting on others**, not counted: splits not yet paid back (opens `split`), receipts waiting for
   their payment (*Attach to a payment…*, *Evidence only*, *Enter the payment*), and refunds Sen is
   watching for.
4. **Missing a payment?** opens `manual`. **Skipped notifications** opens `skipped`.

**Varies:** with nothing to do: *Nothing needs you.* Offline, it still works from the outbox (D22).

### `skipped`

**Answers:** did Sen throw a payment away by mistake? **Shows:** notifications no template read and
that showed no sign of a payment (§6.2), each with *This was a payment*.

---

## Scan

### `scan` (D69)

A tap on the middle tab opens it straight away.

- **In the shell:** Google's ML Kit scanner (§6.4), full screen, with its own gallery import. It finds
  the edges and crops; you adjust the crop before saving. Saving goes to `reading`.
- **In a browser** (D52): the camera through the file picker, then **`crop`**, with four draggable
  corners.

### `scan-more`

A long-press on the middle tab: *Scan receipt* (the largest), *From gallery*, *Add manually*.

### `reading`

**Answers:** is my receipt being read? **Shows:** the image and *Reading receipt…*; you can leave, and
it waits in Review once read. **To:** `confirm`. If reading fails, `manual` with the image beside it;
the image is kept. Offline: it waits in Review, and uploads later.

### `confirm`

**Answers:** did Sen read this receipt right? (D67)

**Shows**, one screen:
- Merchant and date, and *View photo*, which opens the image, zoomable. It's rarely needed: the list is
  the receipt.
- **One category row** (D89): the category when every item shares it, or *Mixed*, with each item's
  category on its second line. Tapping either opens the category sheet.
- **Every item with its price, tax and service already included** (D66), adding up exactly to the
  total. A doubtful price is marked in place, to fix there.
- The receipt's service and tax, the total, and the check that the items add up to it.
- **How many people ate?** A − / + stepper, for the meal average: *RM64.13 ÷ 3 = RM21.38 a person*.
  Without a split you paid for the whole bill, so all of it is your spending (D66).
- A muted *Add a note* row (D90).
- **Done** and **Split**. Quieter: *Not a payment? Keep it as evidence* (for a claim, §6.4).
- **By hand** (D90), opened from *No receipt… → Enter the items*: the same list, typed in, checked
  against the payment's amount (*RM3.20 not itemised* is allowed), with no photo.

**After *Done*:** a toast says what happened (§6.4): *Attached to RM58.30 on Ryt*, with *Undo*; or a
sheet asks which payment when several match; or *Waiting for its payment*, which moves it to Review's
*Waiting on others*; or, without capture, the payment is created.

**After *Split*:** *Who paid?* *I paid* or *A friend paid*, then *Share a link* (`split`) or ***Just my
part*** (D92): tick your items, and the rest folds into *Others' items*. If a friend paid, you owe
your part; if you paid, *Others* owes the rest, and a status card on the payment shows how much is
back, with *Write off*.

**Leaving early** keeps it in Review.

### `manual`

**Answers:** what did I pay that Sen didn't see? **Shows:** the amount, large, with a number pad
(typed as text, kept in sen); the categories, most used first; the account (the last used) and the
time (now); *More* for merchant and note. **Does:** *Save*, with *Undo*. A near-duplicate of a
captured payment gets a warning that doesn't block (§6.5). **From:** `scan-more`, Review's *Missing a
payment?*, the *Add expense* launcher shortcut, a Sen question about a quiet day (the day filled in),
a receipt Sen couldn't read.

---

## Shared bills

### `split`

**Answers:** who had what, and who has paid? (D64, D65, D71)

**Shows:**
1. The bill (merchant, total) and *Paid by You* or *Paid by Mei*.
2. **The status:**
   - *Still changing*: who is done (*✓ Wei Ming ✓ Ali … Mei*), and what it's waiting for: who isn't
     done, and any item nobody has ticked.
   - *Final*: everyone is done and every item is claimed, so the shares are locked.
3. **A QR for the table** and *Share the link*, while it's still changing and you paid.
4. **The items**, each with its price and who ticked it: one name (theirs), or *Shared ÷3: You, Ali,
   Mei · your part RM7.00*. You tick your own. An item nobody ticked is marked, and if you paid it
   offers *Everyone* and *Someone else…* (for a friend without a phone).
5. **I've ticked everything I had**, until the lock. After it: *You're done ✓*, with *Still ticking* to
   undo. If every item is claimed and someone left, the payer gets *Lock without waiting for Ali*.
6. **After the lock, if you paid: who has paid you back.** A tick per friend, their share, and how it
   was ticked: *matched: Ryt, today 11:58*, or *ticked by you* for cash.
7. **After the lock, if a friend paid:** *You owe Mei RM24.40*, paid or not, and *I've paid* for a
   payment Sen can't see (Public Bank, D65). Then the payer's tick list, read-only.
8. **Your share, your spending.**
9. The link's state: open, or closing a day after the last payment is ticked (D47).

**From:** `confirm` after *Split*; `shared`; Review; `txn`; the owe reminder.

### `split-public`

A friend's browser, no login (D47, D64, D71). Same components and theme as the app.

**Answers:** what did I have, and what do I pay?

**Shows:** the bill and who paid; *Hi Mei. Sen remembers this browser.* (or a name box, the first
time); the status, as on `split`; the items to tick, each with who else ticked it and their part of a
shared one; *Your share so far*; *I've ticked everything I had*; and, only once it's final, the
payer's DuitNow QR and *Pay RM22.14*.

**Varies:** after the lock, ticks are read-only: *To change a tick, ask Wei Ming.* A closed link
shows *This split is closed*, and nothing else.

### `shared`

From More. **Answers:** which bills have I split, and what's still open? **Shows:** every split,
newest first: *You paid · 1 of 2 paid you back*, or *Mei paid · you owe RM24.40*. **To:** `split`.

---

## Insights

### `insights`

**Answers:** where is my money going, and am I on track? (D62, D73)

**Shows:** the cycle picker, then question cards. Each card is a question, a chart, a one-line
takeaway computed by code, and *Ask Sen about this*, which opens `sen` with that question ready. The
cards and their charts are in spec §9.3. A card with no data isn't shown; *The year* is a row at the
foot.

**To:** `budgets`, `subscriptions` and `goals` from their cards, where they're also edited;
`insights/year`; `payments`, filtered, from a category.

### `budgets`, `subscriptions`, `goals`, `goal`, `insights/year`

Each card's full screen: the budget meters with the cycle's elapsed tick (D29, D31); the declared
subscriptions with forecasts against actual charges (§11); goals and buckets, and a goal's per-cycle
amount, feasibility against median surplus with its sample size, and projected finish (§10); the
year by month.

---

## Sen

### `sen`

A full-height sheet over the tab screen it was opened from (D68).

**Answers:** what should I know or do about my money?

**Shows:** a header with *Looking at: Insights* (the screen it was opened from), ⋯ and ×; the one
conversation (§12.5): Sen's notes, its answers, proposals (*Apply*, *Dismiss*), and research drafts with
each source and date, unconfirmed until you confirm the figures (§12.2 rule 6). If Google's terms
require them (§21 Q24), search suggestions sit at the foot of a research draft. Then the composer,
with a clip button for a photo, screenshot or PDF (D109), and suggested questions that fit the screen. A
figure Sen couldn't trace shows marked *not checked* (D108).

**Header menu:** *What Sen remembers* (`agent/memory`), *Research* (`agent/research`), *Usage*
(`agent/usage`, the AI cap, D52).

**Varies:** streaming while Sen answers; offline: *Sen needs a connection*; at the cap: *Sen is paused
until 1 Nov; everything else works* (§9.6).

---

## More

### `more`

A list: **Payments** (every transaction, searchable), **Shared bills**, **Accounts** (capture only),
**Claims** (claims switch), **Settings**.

### `payments`

The old Activity. **Answers:** what exactly happened, and when? **Shows:** search (payments, merchants
and items); filters for the cycle, account, category and *Shared*; then every transaction, newest
first, grouped by day with the day's spending. A row is the merchant, category and account, and the
amount, with marks for: a receipt, a split, in Review, *Not synced yet*, *Filled in* (§7). A
transfer is one row, *Ryt → TNG eWallet*. **From:** More, and Home's pace line (this cycle).

### `txn`

**Answers:** what was this, and is it right? **Shows:** the amount, large, the merchant, date, time and
account, and where it came from (*From Ryt's notification*, *Added by you*, *From a receipt*, *Filled
in from your transfer rule*, *New wording: right?* while its template is provisional, D87); category
(changing a rule's category asks *Just this one* or *From now on*, D25, D89); your spending; a muted
*Add a note* row (D90); the receipt, or *Scan the receipt* and *No receipt…* (*Enter the items* or
*Just a note*, D90); its split, or *Split* (share it, *Just my part*, or lend it all to one friend,
D70, D92); *These were two payments* on a merged one (D88); *Ask Sen about this* (D94); *What the bank said*, with *Correct amount, time or account* (§6.7); *Changes*.
**Does:** *Mark as…* (transfer, refund of…), *Delete*. Each with *Undo*.

### `receipt`

The digitised receipt: items with their prices, tax and service included, and on a split who had
each; its note (D90); *View photo*, or the email in a sandboxed view for a body-only email, with
*Other attachments* and *Use this one instead* (D91); *Keep as evidence only*.

### `accounts`, `account`, `balance-check`

Capture only. `accounts`: the total; each tracked account with its balance and when it was last
checked; *Elsewhere* accounts, without balances (§7); *Check balances*. `account`: its balance,
opening balance, the app that feeds it, its recent payments and its checks. `balance-check`: each
account's balance beside a box for the bank's figure, with *Matches* (D18); *Save* books each
difference as *Unaccounted* (§7). It's also step 2 of `payday`.

### `claims`, `claim`

Claims switch only. `claims`: this period's claim per scheme, with its amount, status, deadline and
evidence (§13), *Download claim pack* (one PDF to print, D97), and in the shell *Send to ESS*
(D96). `claim`, the submission kit: each value in ESS's order with *Copy*, each file with *Open* and
*Share*, missing evidence with how to add it, then *Submitted*; once ESS answers, *Approved* and the
approved amount.

### Settings

| Section | Holds | Who sees it |
|---|---|---|
| Appearance | *System*, *Light*, *Dark* (D44); the look: *Changes each quarter* (the default) or one of the six pinned, with today's look and the date of the next change (D77, D78) | Everyone |
| Capture | Listener status, notification access, **your apps** (the picker, D86), *Keep Sen running* for your phone's brand, the quiet *Scan receipt* switch (§6.3), the *Just paid* island switch (D101), learned wordings (provisional, active, ignored), pair and channel rules, skipped notifications | Shell, capture on |
| You | Your names as banks print them (D17), expected payday (D14; optional without capture, D79), your DuitNow QR (D47) | Everyone (names: capture only) |
| Categories and rules | Categories, and merchant rules, hawkers included (D70) | Everyone |
| Receipts by email | Your forwarding address with *Copy*, how to set the Gmail filter, Gmail's confirmation code once it arrives (D56) | Everyone |
| Claims | Schemes (§13), each with *Describe it to Sen* (D95); the ESS sender address (D96); in the shell, **ESS**: sign in once (a native screen; *Forget ESS password*, D103), what the adapter can do (*Fetch payslip*, *Submit claims*), each with *Teach Sen* to record it or *Import recipe* (D105, D106), and the last payslip fetched (D104) | Claims switch |
| Sen | Google Calendar (D41), what Sen remembers, your AI credit: balance and this month's free allowance (D98) | Agent switch |
| Members | *Invite*; each person's switches, credit (*Grant*, *Refund*, allowance, *Unlimited*, daily ceiling), shell version and *Capture connected*; shell seats; *Suspend* and *Remove* (D52, D98) | Admin only |
| Data | *Export everything* (D49), the last backup | Everyone; backups: admin |
| Account | Your email, *Sign out*, *Sign out everywhere* (§17) | Everyone |

---

## Outside the tabs

### `sign-in`

Your email, then the 6-digit code (D13). An invitation's link lands here with the email filled in
(D52). States: wrong or expired code; *Sen is invitation-only* for an unknown email.

### `first-run`

Full screen, one step per screen (D26, D86): sign in, choose your apps, notification access (with
*Allow restricted settings* when the switch is greyed out, §6.2), *Keep Sen running* for your phone's
brand, accounts with today's balances (one per chosen app, plus pots and stored credit), your name as
banks print it, expected payday. Without capture: sign in and categories (§9.6, D79).

### `payday`

Full screen, up to four steps (D60, §9.7): the claims, already answered by the payslip with *Undo*
when it matched, or asked (D104); the balance check, last cycle's
look-back with one experiment, and this cycle's plan, with *Use this plan*. Each step has *Skip*; a
skipped step waits in Review.

### `new-look`

Full screen, once a quarter (D77): the first time the app opens on or after 1 Jan, 1 Apr, 1 Jul or
1 Oct, unless a look is pinned. The old look gives way to the new one in that look's own motion
(the rosette weaving, the dots lighting up), then its name, Sen's new avatar, *Keep it* or
*Go back*, and a *Change each quarter* switch (D84). *Go back* keeps the old look for this quarter;
turning the switch off pins the look chosen. Either way you land on Home; the choice can be changed
later in Settings → *Appearance*. The shared frame is `ui/patterns.md` §9; each look's arrival is
built in code (D84).

---

## Native surfaces

Android draws these, outside the web app. The browser shows a stand-in in the dev simulator panel
(D42).

| Surface | What it shows | Tapping it |
|---|---|---|
| **Category prompt** (a new merchant, §6.3) | *RM9.50 · ROTI BAKAR 88*, the two best guesses and *Scan receipt*. A hawker's personal DuitNow name gets the same prompt (D70) | A button answers it; the body opens Review |
| **Paying-back prompt** (a payee matched to a split, D70) | *RM25.00 to MEI LING TAN*, with *Paying back: BBQ PLACE* first, even offline, and *Other…* | Ticks your share (D65) |
| **Quiet scan prompt** (a known merchant, §6.3) | *RM58.30 · NASI KANDAR ABC · Meals*, one button, *Scan receipt*. Clears itself after 10 minutes; off in Settings → Capture | Opens `scan` for that payment |
| **Owe reminder** (D65) | An hour after a split you owe, if unpaid: *You owe Mei RM24.40*, with *I've paid* and *Open the split*. Once, written by code | Opens `split` |
| **Health alerts** (§18) | *Capture may be off*, *Daily jobs have stopped* | Opens `home`, with the fix |
| **Sen's push** (§12.4) | At most one a day: the 9pm note, budget warnings, payday | Opens `sen` or `home` |
| **Claim reminders** (§13) | 3 days before, and on the day | Opens `claim` |
| **Export ready** (D49) | The link, ready for 24 hours | Opens the download |
| **Widgets** (D32, D74) | Small: *left until payday*, a spent-against-elapsed meter, *Scan*. Medium adds the pace line and *Review N*. Large adds the top categories, the budget most at risk, and Sen's note. Every size goes dark with *Capture is off* and *Fix* | Buttons open `scan` or `review`; the rest opens `home` |
| **Launcher shortcuts** | *Scan receipt*, *Add expense* | `scan`, `manual` |
| **Share target** | *Sen* in Android's share sheet, for PDFs and images | Uploads it as a receipt, then `reading` |

---

## Defaults to confirm

`S2` chose these without asking. The owner can change any; the walking skeleton will show them (D84).

1. **The Sen button's label is *Sen*.**
2. **Payday plan progress stays on Home** after the payday flow, until every move is ticked or hidden.
3. **Before the first salary**, the large figure is *Spent since you started*.
4. **The large figure opens a sheet with an estimate** of what's left at payday, labelled as one.
5. **A receipt answers a new merchant's prompt:** the payment takes its items' categories, and the
   merchant's rule takes the receipt's largest category.
6. **Gmail's forwarding confirmation code** arrives in Sen's inbox, so Settings shows it.
7. **To remind friends who owe you, share the split link again.** There's no message composer.
