# Flows

The journeys through Sen, step by step, with what happens when each goes wrong. Written by `S2`,
with the screens in `screens.md` and the shared patterns in `ui/patterns.md`. The wireframe
(`ui/wireframe.html`, published at https://claude.ai/artifact/GV9cJbkjjFSExMgpbWY9Sc) walks most of
these as guided journeys; the owner approved them on 6 Oct.

**How to read a journey:** *Starts* names the trigger. The steps name screens by their id in
`screens.md`, such as `home` or `confirm`. *When it goes wrong* lists the sad paths, each with what the
person sees. *Done* is the state that ends it.

The behaviour is in `spec_v2.md`; this file cites it. Made-up names and amounts throughout (D11);
`TAN WEI MING`, *Wei Ming* on a split link, stands in for the owner.

**Contents**
- Setting up: first run (`first-run`), an invited friend (`invited`)
- Everyday capture: a known merchant (`pay-known`), a new merchant (`pay-new`), a hawker (`hawker`),
  money in (`money-in`), your own accounts (`own-transfer`), a refund (`refund`)
- Receipts: after paying (`scan-after`), before the payment (`receipt-first`), forwarded email
  (`email-setup`)
- Shared bills: a bill you paid (`split-mine`), getting paid back (`paid-back`), a bill a friend
  paid (`split-theirs`), a stuck split (`split-stuck`), lending (`lend`)
- Fixing things: manual entry (`manual`), new wording (`new-wording`), editing and undo (`fix`)
- The cycle: the daily glance (`daily`), payday (`payday`), balance checks (`balance-check`),
  Insights (`insights`), budgets (`budget`), goals (`goal`), subscriptions (`subscription`), claims
  (`claims`)
- Sen: asking (`ask`), a proposal (`proposal`), research (`research`), closing the gap (`gap`)
- When things break: capture off (`capture-off`), offline (`offline`), a lost phone (`lost-phone`)
- Admin and data: inviting a friend (`invite`), the calendar (`calendar`), exporting (`export`)

---

## Setting up

### First run (`first-run`)

**Starts:** the owner opens the shell for the first time, installed from a GitHub Actions build (§3).

1. `sign-in`: email, then the 6-digit code.
2. **Choose your apps (D86).** Installed banks and e-wallets from the curated list are suggested
   and ticked (the owner's: TNG, Ryt, Public Bank, Grab); *More* searches every other app.
3. **Notification access.** *Open settings* goes to Android's page; switch Sen on and come back.
   Capture starts now; anything it sees waits in the outbox (§9.5). There are no templates yet:
   each new wording is drafted the first time it arrives and books at once, for a *Right?* in
   Review later (D87).
4. **Keep Sen running:** the battery step every phone needs, then the brand's own steps; on the
   Xiaomi, Autostart, battery saver *No restrictions*, and the app locked in recents (D86).
5. **Accounts:** one per chosen app, plus GO+ and any stored credit, each with today's balance (§7).
6. **Your name as the banks print it**, such as `TAN WEI MING` (D17).
7. **Expected payday:** the last working day (the default), or a day number (D14).
8. `home`. The large figure reads *Spent since you started* until the first salary lands.

**When it goes wrong**
- **The switch is greyed out** (§6.2): Sen opens its own app-info page, where ⋮ → *Allow restricted
  settings* unlocks it.
- **Access refused:** *Skip for now*; `home` shows *Capture is off* with *Fix* until it's granted.
- **Closed mid-setup:** it reopens at the same step. **Wrong or expired code:** *Send a new code*.
- **Anything that breaks later** is a warning on `home`; the steps never come back (D26).

### An invited friend's first day (`invited`)

**Starts:** an invitation email (D52).

1. The link opens `sign-in` in the browser, email filled in; then the code.
2. The short first run: the categories, any of which can be switched off. No payday question: they count by
   calendar month, and can set a payday later in Settings → *You* (D79).
3. `home`: this month's spending, no balances. In a browser, Sen offers *Add to Home screen*.
4. Their first receipt creates its payment, since no notification is coming (§6.4).

**When it goes wrong:** an expired invitation: *Ask for a new invitation*. An email that wasn't invited:
*Sen is invitation-only*.

---

## Everyday capture

### Paying at a known merchant (`pay-known`)

**Starts:** a payment at a merchant with a rule, such as NASI KANDAR ABC.

1. In native code the listener stores the raw text, a template reads it, and the rule sets the
   category. Done, with no review (D24).
2. **If the quiet scan prompt is on** (§6.3): *RM58.30 · NASI KANDAR ABC · Meals*, with *Scan
   receipt*. It clears itself after 10 minutes. Tapping it is `scan-after`.

**When it goes wrong:** offline, sync waits for the network. The same notification twice is a no-op
(§6.5). A Grab charge with no restaurant waits up to 10 minutes for its context (§6.2). A card hold at
a pump is ignored (§6.3).

### Paying at a new merchant (`pay-new`)

**Starts:** a payment at a merchant Sen hasn't seen, such as ROTI BAKAR 88.

1. The category prompt: *RM9.50 · ROTI BAKAR 88*, the two best guesses and *Scan receipt*.
2. **A category:** the payment takes it, and a rule is made.
3. **Or *Scan receipt*:** `scan-after`; the payment takes its items' categories, and the rule takes the
   largest.

**When it goes wrong:** swiped away, it waits in Review (D22). A second new merchant replaces the
first prompt in the shade; the first waits in Review (D24). The wrong button: fix it in `txn`.

### Paying a hawker (`hawker`)

**Starts:** RM8.00 by DuitNow at a stall whose name is the owner's own, SITI AMINAH BT YUSOF.

1. It's a merchant like any other (D70): the category prompt asks once, and a rule is made.
2. Next time it files itself silently.

The only payee that asks again is a name Sen has matched to someone on a split (`split-theirs`).

### Money in from someone (`money-in`)

**Starts:** money arrives from a name that isn't yours.

1. **It matches an open split share** (`paid-back`): the share ticks itself.
2. **A name Sen hasn't seen, and it could be a share:** Review asks *Whose split share is it?* with
   the open shares it fits, and *Not a split* (D64). The answer teaches Sen that name, for you alone.
3. **Otherwise:** Review asks *Income*, *Transfer* or *Refund of…*.

### Moving money between your own accounts (`own-transfer`)

**Starts:** you send RM2,000 from Public Bank to Ryt.

1. Ryt notifies money from `TAN WEI MING`: your own name makes it a transfer, never income (D17).
2. Public Bank doesn't notify money out (§21 Q16), so the first time Review asks where it came from.
3. Next time the missing side is filled in by itself, marked *Filled in* in `payments`; a real side
   replaces it if it arrives (§7).

### A refund (`refund`)

**Starts:** money in from a merchant. Review offers *Refund of…*, listing recent payments to that
merchant. The refund lowers that purchase's spending, in its cycle; it's never income (D21).

---

## Receipts

### Scanning a receipt after paying (`scan-after`)

**Starts:** the quiet scan prompt, the category prompt's third button, a widget, the launcher shortcut,
or a tap on the Scan tab (D69).

1. `scan`: the scanner finds the edges; adjust the crop while the receipt is in your hand; save.
2. `reading`, then `confirm`: one screen, and the list is the receipt (D67). Each item's price
   already includes its tax and service, adding up to the total. Fix any marked price.
3. **How many people ate?** Three of you, and you paid for everyone: tap + twice. The whole bill is
   your spending; your meal average counts *RM19.44 a person* (D66).
4. *Done*. Matching finds the payment within 3 hours: *Attached to RM58.30 on Ryt*, with *Undo*
   (§6.4).

**When it goes wrong**
- **Several payments match:** a sheet asks which.
- **No payment yet:** `receipt-first`.
- **Reading fails:** `manual`, with the image; the image is never lost.
- **Offline:** it uploads later, and waits in Review.
- **The same file twice:** *Already added* (§6.5).
- **The total differs from the payment** (a tip, rounding): attach it by hand; it adds items and
  evidence, never changing the amount or category (§6.4).
- **Others will pay their part:** *Split* instead of *Done* (`split-mine`).

### A receipt before its payment (`receipt-first`)

**Starts:** a receipt confirmed with no payment to match.

1. *Waiting for its payment*. It sits in Review under *Waiting on others* (D72).
2. **The notification arrives:** matching attaches it, and it leaves the list.
3. **It never does:** *Attach to a payment…* (likely payments: same merchant, close amounts),
   *Evidence only* (for a claim, such as the My50 receipt), or *Enter the payment*.

**Without capture** (D52): confirming creates the payment; nothing waits.

### Setting up forwarded receipts (`email-setup`)

**Starts:** More → Settings → *Receipts by email* (D56).

1. Copy your forwarding address, such as `sen.inbox+k7q2xm@example.com`.
2. In Gmail: add it as a forwarding address. Gmail emails it a code, which Sen shows on this screen;
   type it into Gmail.
3. A filter forwards the senders you choose. Each email becomes a receipt, read and matched like a
   scan.

**When it goes wrong:** mail to an unknown `+code` is dropped; a newsletter that slips through is
ignored; the same email twice is a no-op.

---

## Shared bills

### Splitting a bill you paid (`split-mine`)

**Starts:** KEDAI MEE ABC, RM64.13, which you paid; Ali and Mei will pay you back their part.

1. `confirm` → *Split* → *Who paid?* *I paid*. `split` opens, *Still changing*, with a QR for the
   table.
2. **Everyone ticks what they had** (D71). An item one person ticks is theirs; one several people tick
   is split evenly between them. You tick your mee goreng, the fried chicken and the teh ais, then
   *I've ticked everything I had*.
3. Ali scans the QR: `split-public` greets him (or asks his name the first time, then remembers his
   browser, D64). He ticks his and taps *Done*.
4. Mei ticks her kuey teow first, the one item nobody had. **Every item has someone, but nothing
   locks: Mei isn't done.** Her share shows *so far*, and the QR waits.
5. She ticks the fried chicken and teh ais (now ÷3 each), then *Done*.
6. **Everyone is done and every item is claimed, so the split locks.** Mei sees her final RM22.14 and
   your DuitNow QR. Shared items divide by largest remainder: the fried chicken is RM7.00, RM7.00 and
   RM6.99.
7. On your phone it's final too: your share is your spending (D19), and the tick list of who has
   paid you back is yours (D65).

**When it goes wrong:** `split-stuck`. A tick after the lock: only you, the payer, can change it.

### Getting paid back (`paid-back`)

**Starts:** a locked split you paid.

1. RM20.99 arrives from `ALI BIN ABU BAKA`, a name Sen hasn't seen. It fits Ali's share, so Review
   asks once: *Whose split share is it?* → Ali. His share ticks, and Sen remembers that name for Ali.
2. Mei pays cash: tick her yourself on `split`.
3. When the last share is ticked, the link closes a day later, so a wrong tick can still be undone
   (D47).

**When it goes wrong:** nobody pays: share the link again as a reminder, or write their part off,
which adds it to your spending (D19).

### A bill a friend paid (`split-theirs`)

**Starts:** Mei paid for BBQ PLACE and split it; you ticked your Set C on her link.

1. After the lock, you owe Mei RM24.40. It's in Review (D72), and on `split`, where Mei's tick list is
   read-only to you (D65).
2. An hour after the split, if you haven't paid, Sen reminds you once (D65).
3. You send Mei RM25.00 from TNG. Her name is matched to the split, so the prompt offers *Paying back:
   BBQ PLACE* first, even offline (D70).
4. Within RM5 and 30 days it matches: your share ticks itself, and the payment counts as Meals, with
   the receipt (§7).

**When it goes wrong:** you paid from Public Bank, which doesn't notify: *I've paid* ticks it by hand.

### A stuck split (`split-stuck`)

1. **An item nobody ticked**, such as the teh ais: the split stays *still changing*. As the payer you
   settle it: *Everyone*, or *Someone else…*.
2. **Someone left without tapping Done:** once every item is claimed, *Lock without waiting for Ali*.
3. **A friend without a phone:** add their name and tick for them; they count as done.

### Lending (`lend`)

From a payment's `txn`: *Split*, then give the friend the whole amount. Their repayment ticks it like
any share (D70).

---

## Fixing things

### Entering a payment Sen missed (`manual`)

**Starts:** Review's *Missing a payment?*, the *Add expense* shortcut, or a long-press on Scan.

1. Type the amount; pick a category. The account and time are already set.
2. *Save*, with *Undo*. A near-duplicate gets a warning that doesn't block (§6.5).

### A notification no template reads (`new-wording`)

1. The event is stored, `unparsed` (§6.2). If it has an amount and a payment word, the API drafts a
   template and code checks it (D15).
2. Review: *New TNG wording: paid RM6.50 to KEDAI MAJU. Right?* *Yes* saves it, creates the payment
   (with its prompt, if the merchant is new) and re-reads other unread events. *No* offers *Enter it by
   hand*.

**When it goes wrong:** no payment word: it goes to `skipped`. Offline or at the day's cap: *Waiting to
read this new wording*.

### Fixing a payment (`fix`)

In `txn`: change the category (*Just this one* or *From now on*, D25); correct the amount, time or
account beside the raw notification (§6.7); *Mark as…* a transfer or refund; *Delete* (a
notification's payment is dismissed for good). Every change shows *Undo* and lands in *Changes*.

---

## The cycle

### The daily glance (`daily`)

1. **Morning:** the widget shows what's left and the spent-against-elapsed meter (D74).
2. **Opening Sen:** `home` answers what's left; Review's badge says what needs you.
3. **9pm:** Sen's note, only on days worth a word (D35). It also shows on `home`.

### Payday (`payday`)

**Starts:** a salary credit lands; a new cycle starts (D14), and `home` shows the *Payday* card.

1. **Claims** (only when submitted): the payslip, fetched by itself minutes after the salary (D104),
   has already split it when its net pay and claim lines match: shown done, with *Undo*. Otherwise:
   did the salary include them? *Yes* splits it (D45).
2. **Balance check** (D18).
3. **Last cycle:** Sen's three reasons and one experiment; *Track it*.
4. **This cycle's plan:** due, set aside, left to spend; *Use this plan*. Each move ticks off as its
   notification arrives, and `home` shows the progress.

**When it goes wrong:** a skipped step waits in Review. An early salary starts the cycle when it lands;
a bonus within 15 days doesn't (§7). A new employer's first salary is marked once. With the agent off
or at its cap, steps 3 and 4 aren't there.

### Checking balances (`balance-check`)

Weekly for four weeks, then each payday (D18), from Review, `payday` or `accounts`: type what each
bank app shows, or *Matches*. *Save* books each difference as *Unaccounted*; the gap shows on `home`.

### Insights (`insights`)

1. Each card asks a question and answers it with a chart and one line (D73).
2. *Ask Sen about this* opens `sen` with the question ready; every figure in the answer comes from a
   tool (§12.2).
3. A category opens `payments`, filtered.

### Budgets (`budget`), goals (`goal`), subscriptions (`subscription`)

- **Budgets** (D29): add from their card, a category and an amount per cycle. Warnings at 80% and over
  ride in Sen's one push a day (D31).
- **Goals and buckets** (§10): per-cycle amount, feasibility against median surplus with its sample
  size, projected finish. Sen proposes buckets; their set-asides join the payday plan.
- **Subscriptions** (§11): declared; each expected charge is a forecast, matched or *missed*. Sen or
  a forwarded invoice can propose a new one.

### The month's claims (`claims`)

1. The 1st: each scheme's claim drafts itself (§13), in More → Claims.
2. Missing evidence (*My50 receipt not added*): share it to Sen and keep it as evidence.
3. Reminders by code: Review from 7 days before, pushes 3 days before and on the day, the calendar.
4. `claim`: review, then *Send to ESS* in the shell (§13.1), or copy each value into ESS, attach each
   file and tap *Submitted*. The payslip on payday marks it paid (D104).

---

## Sen

### Asking (`ask`)

The Sen button on any tab opens `sen` over that screen, which Sen knows (D68). Suggested questions fit
the screen. Every figure in an answer comes from a tool (§12.2).

### A proposal (`proposal`)

A card in `sen`, also in Review: a budget, a rule, a subscription, a goal or bucket, a promise to
watch, or answers for the Review backlog (§12.1). *Apply* changes it, recorded as Sen's, with *Undo*.

### Research (`research`)

Sen researches (D39); a draft arrives with each source and date, unconfirmed. You confirm the figures
you trust; code compares them; Sen reports, and re-checks monthly.

### Closing the gap (`gap`)

The gap grows; Sen asks about days with nothing captured. *Yes, add it* opens `manual` with the day
filled in (§12.1).

---

## When things break

### Capture switched off (`capture-off`)

1. HyperOS kills the listener. Within a day the watchdog pushes *Capture may be off* (§6.2).
2. Every widget goes dark with *Fix*, and `home` shows *Capture is off*.
3. *Fix* opens the setting; the listener re-reads what's still showing.
4. Payments cleared meanwhile turn up as a gap at the next balance check.

### Offline (`offline`)

Capture, prompts, manual entry, Review and scanning still work, marked *Not synced yet* (§5). Sen,
reading receipts, starting a split and signing in need a connection, and say so. In a browser,
offline is read-only.

### A lost phone (`lost-phone`)

From any browser: `sign-in`, then Settings → Account → *Sign out everywhere* (§17).

---

## Admin and data

### Inviting a friend (`invite`)

Settings → *Members* → *Invite*: their email, switches and monthly AI cap (D52). They get `invited`.
*Members* shows the invitation and their AI usage, never their money.

### Connecting Google Calendar (`calendar`)

Settings → *Sen* → *Connect*: Google's sign-in opens in the phone's browser (§12.7); the first time,
Google warns the app isn't verified. Back in Sen: *Connected*. If refused, Review and pushes still
remind you.

### Exporting everything (`export`)

Settings → *Data* → *Export everything*. A push says when the link is ready; it works for 24 hours
(D49).

---

## Not yet designed

- **The lunch pool** (D23) is deferred and built last, if the pool still runs.
