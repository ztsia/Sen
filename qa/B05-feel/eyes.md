# B05 · Feel: the eyes pass (run 2, `qa-eyes`, Opus)

Diff report: `qa-artifacts/B05-feel/diff/index.md` (base `origin/main` 9408d96d, head `B05/feel` 6217144c +
uncommitted). It lists three changed entries and no new ones, all with pixel changes of 1–8 pixels, so the stills
barely moved. This slice is about motion, so most of what matters is in the filmstrips (`metrics/film/…`, 21 frames,
one every 50 ms, from the tap). I opened every flagged strip, the ones the run-1 note named (`fix/4`, `split-stuck/2`,
`email-setup/1`), and the neighbouring steps of the same journeys (pushes, sheets, a tab switch, Undo).

A caveat for every strip: each frame is about 130 px wide. If a ripple is faint I may not see it, so when I say
"nothing changes" I mean nothing a person would notice at a glance. The reviewer can check those frames at full size.

Asks from `qa/escapes.md`: **E1** (calm or crowded) on every screen; **E2** (does a button that waits on the server
say so, and could a slow network make a tap look ignored) on every screen and strip; **E3** (does the change reach a
phone with Sen already open) can't be judged from pixels or strips. I say so once here and don't repeat it below.

---

## Screens

### `txn` (Payment detail)

Opened: `head/catalogue/txn--minted-light.png`, `txn--minted-dark.png`; then `base/…txn--minted-light.png`,
`base/…txn--minted-dark.png` and `diff/txn--minted-dark.png`.

1. **First look.** The amount, *RM58.30*, under *Nasi Kandar Abc* in the header card. That's right: the screen is
   for *one payment: what it was, what's attached, what to do with it*.
2. **Reading.** Easy. There's a clear step from the title to the figure to the meta line to the facts. One oddity: in
   Minted the money font puts wide gaps around the dot (*RM58 . 30* in the figure and in *Your spending*), while the
   same amount in the bank's text and the split line reads *RM58.30* / *RM0.00 of RM28.93*. So one screen shows two
   spellings of the same amount. This isn't new in this slice.
3. **Tapping.** The ActionBar's four round buttons, Category and Note (with chevrons), the Receipt and Split rows,
   and *Correct amount, time or account* all clearly look like actions. The facts with no chevron (*Your spending*)
   read as information. Nothing here is the 48 px main action, which suits a detail page.
4. **Broken.** Nothing. The dev panel's handle sits at the left edge mid-screen, but that's preview only.
5. **Trust.** Yes. *From Ryt Bank's notification* and the bank's own words under *What the bank said* are what make
   it trustworthy. *Split · Still changing, 0 of 2 paid you back · RM0.00 of RM28.93* matches *Your spending RM58.30*,
   since nobody has paid back yet. Out has no sign; nothing is alarming.
6. **E1:** calm. One thing to look at first, room between groups, facts and actions look different. **E2:** nothing
   on this still waits on the server.

Base vs head: identical to the eye in both modes. The diff image shows no visible mark (1–2 pixels of
anti-aliasing).

Verdict: fine. The one thing to fix first, low priority and not from this slice: Minted's spaced dot in amounts
(*RM58 . 30*) next to unspaced amounts in body text.

### `account` (an account's page)

Opened: `head/…account--minted-light.png` (the default look, for context), `head/…account--line-light.png`,
`head/…account--line-dark.png`; then `base/…account--line-light.png`, `base/…account--line-dark.png` and
`diff/account--line-dark.png`.

1. **First look.** *RM14,650.87, Balance now* for Ryt Bank. That's right: the screen is for *this account's balance
   and what moved it*.
2. **Reading.** Easy in Line, a calm hairline look. *Computed from your notifications since 31 Oct. Not the bank's own
   figure.* is a helpful line, but see Trust.
3. **Tapping.** *Check · Payments · Ask Sen* are clearly buttons; the payment rows look like rows. The *Checks* row,
   *1 Oct: bank showed RM4,812.35* with a red pill *RM42.10 less*, looks like information, and the pill looks a bit
   like a button or a tag with nothing to tap.
4. **Broken.** Nothing cut off or misaligned in either mode.
5. **Trust.** The dates don't hang together. The balance is *computed since 31 Oct* and the *Opening balance* is *on
   31 Oct*, but *Last checked* is *1 Oct* and the payments are from 16–17 Oct, so the "since" date is in the future
   of everything else on the screen. That's the made-up scenario, but a person would stop and doubt every figure. The
   red *RM42.10 less* is alarming without saying why: less than what, Sen's figure or the bank's? It's red with no
   icon, where patterns §2 and §3 keep `destructive` off amounts and give a warning an icon and words. Money in
   (*+RM48.80*, green) and money out (no sign) are as everywhere else.
6. **E1:** calm. **E2:** nothing waits.

Base vs head: identical to the eye. The diff marks a few pixels on Kedai Maju's *In Review* inbox icon
(anti-aliasing).

Verdict: look again. Fix first: the *RM42.10 less* pill. Say what it's less than, in words, in the warning style with
an icon, not `destructive` red. Also make the scenario's dates agree (*since 31 Oct* vs *last checked 1 Oct*). Both
were there before this slice.

### `settings`

Opened: `head/…settings--minted-light.png` (the default look, for context), `head/…settings--line-light.png`,
`head/…settings--line-dark.png`; then `base/…settings--line-light.png` and `base/…settings--line-dark.png`.

1. **First look.** The account card (*weiming · Admin*). It's a settings hub, so there's rightly no single figure.
   The screen is for *getting to each setting, with its current state*.
2. **Reading.** Easy. Each NavRow says its state (*0 apps · not listening*, *4 rules*, *2 of 20*). In Minted, *Export
   and backups* and *Backed up Sat, 17 Oct* both wrap to two lines, which looks cramped next to the single-line rows.
   Line fits them on one line.
3. **Tapping.** Every row has a chevron, which reads well. On *Appearance*, a small pill with a dark and a light dot
   (the mode) looks exactly like a switch inside a row that opens a screen. A thumb will try to flip it.
4. **Broken.** Nothing misaligned. The pill is the only thing out of place.
5. **Trust.** *~RM3.80 this month* for Sen says *about* with a tilde, which is honest for an estimate. *0 apps · not
   listening* is said calmly; Home's health bar is where it should alarm.
6. **E1:** calm, with labelled groups and room between them. **E2:** nothing waits.

Base vs head: identical to the eye in both Line modes.

Verdict: look again. Fix first: the mode indicator on *Appearance* looks like a switch. Draw it as an icon (sun or
moon, per patterns §7.6 *modes have icons*), not a toggle. This wasn't changed by this slice.

---

## Filmstrips

What runs through almost every strip:
- **A still first third of a second.** After most taps nothing visible happens for 300–450 ms at 4× CPU, and then
  the press ripple and the main change arrive together.
- **Sheets that creep.** A sheet rises fast and then creeps the last few pixels for half a second.
- **Sheets that show the wrong step while they change.** A sheet whose step changes or closes shows stale content,
  and its height snaps instead of easing.
- **Undo that lands late.** The toast leaves, and the undone value appears about 700 ms later.
- **Pushes and tab switches that carry empty skeletons** instead of content.
- **Toasts drawn on top of sheets**, covering their buttons.

### `hawker/1`: *Other…* on a Review row opens the category sheet (flagged: first change 312 ms vs 176)
7. **Answered.** No. Frames 1–7 (0–300 ms) are unchanged, then the scrim starts at about 350 ms.
8. **Connected.** The sheet comes from the bottom, not from the chip, which is fine for a sheet.
9. **Steady.** It rises quickly from 400 to 550 ms, then creeps up a few pixels for the rest of the second. The
   sheet's title shouts *SITI AMINAH BT YUSOF: which category?* while the row behind it reads *Siti Aminah Bt Yusof*
   (patterns §2: names in title case).

Verdict: look again. Fix first: show the press within a frame. The 300 ms of nothing is what makes the tap feel
ignored. Also put the sheet's title in title case.

### `hawker/2`: picking *Groceries* in that sheet
7. **Answered.** Late. The ripple on *Groceries* shows only at about 300–350 ms.
8. **Connected.** No. At about 300 ms the sheet's content swaps to a different, generic sheet titled *Category*, so
   the list jumps under the finger before closing.
9. **Steady.** No. The title flips to *Category* while the sheet closes (a flash of other content), and when it's
   gone the *Siti Aminah Bt Yusof · RM8.00* question is **still in Review**, unanswered, for the rest of the second.
   No row slides out and no toast appears.

Verdict: wrong. Fix first: answering from the sheet must clear the row (slide out, with Undo), and the sheet must keep
its own content while it closes. The reviewer should confirm whether the row clears after the second ends; within
it, a person sees their answer ignored.

### `own-transfer/1`: *Public Bank* on *+RM2,000.00 into Ryt Bank from your own name*
7. **Answered.** Nothing changes in the whole second that I can see: no ripple, no row leaving, no toast. The row's
   clearing and the toast *A transfer from Public Bank. Sen will remember · Undo* appear only in the first frames of
   step 2.
8. **Connected.** Can't tell: nothing moved within the second.
9. **Steady.** Still, so steady.

Verdict: wrong. Fix first: the row must answer within 100 ms. Over a second of nothing reads as a missed tap (E2's
question). The reviewer should check the frames at full size for a faint ripple.

### `own-transfer/2`: the *More* tab from Review (flagged: settle 709 ms vs 442)
7. **Answered.** The tail of step 1 (the toast sliding in) fills the first frames. The More tab's indicator shows
   at about 450 ms.
8. **Connected.** No. At about 200 ms the Review list **jumps to its top** (*Needs you · 11*), losing the place where
   the finger was, before anything about More happens.
9. **Steady.** No. There's the jump to the top, then a crossfade that passes through an **empty skeleton screen**
   (row 2, frames 2–3) before More arrives at about 750 ms. The toast stays solid throughout, which is right.

Verdict: look again. Fix first: crossfade straight from Review as it was to More. Don't scroll the old screen to the
top, and don't fade through a skeleton.

### `own-transfer/3`: *Payments* on More
7. **Answered.** No. 0–500 ms is unchanged. The push starts at about 550 ms.
8. **Connected.** Yes, once it starts: More shifts left and dims, and the new screen comes in from the right.
9. **Steady.** The pushed screen is a skeleton from about 550 to 900 ms, and Payments appears at about 950 ms. The
   toast fades with the old screen and reappears on the new one: a small blink.

Verdict: look again. Fix first: the half-second before the push starts.

### `payday/5`: *Matches* on Ryt Bank's balance check (flagged: settle 735 ms vs 394)
7. **Answered.** Yes. At about 150 ms the field fills with *RM 20,450.87* and *No difference* appears.
8. **Connected.** Yes. The chip sits just under the field it fills.
9. **Steady.** The amount appears whole, not counted up, which is right. The ripple on *Matches* shows after the value
   (frames 5–8) and lingers, which is what makes the settle long. The toast *Salary kept whole · Undo* sits snugly
   above *Save*.

Verdict: fine. The order is slightly backwards (ripple after the change), but it reads as one answer.

### `proposal/3`: *Undo* on *Applied. 14 past payments stay as they are* in Sen's sheet (flagged: settle 1228 ms, over 1000)
7. **Answered.** The toast starts leaving at about 150 ms.
8. **Connected.** No. The toast fades out *in place*, its text overlapping the suggestion chips (*What needs me
   most?*) for about 150 ms, so for a moment the text is doubled. Then the card still says *✓ Applied* until about
   850 ms.
9. **Steady.** No. At about 850 ms *Apply · Dismiss* return and the whole conversation jumps up a row.

Verdict: look again. Fix first: Undo's effect must show when the toast goes, not 700 ms later. Then the toast's exit
and the card's change read as one thing.

### `ask/1`: Sen's button on Home
7. **Answered.** No. 0–400 ms is unchanged. The scrim and the sheet start at about 450 ms.
8. **Connected.** The sheet rises from the bottom, not from the button at bottom right. That's acceptable for Sen's
   sheet.
9. **Steady.** It rises fast and then creeps up for the last 500 ms. The conversation is a skeleton for the whole
   second.

Verdict: look again. Fix first: the 450 ms before anything shows.

### `ask/2`: the chip *How am I doing this cycle?* (flagged: first change 208 ms vs 88)
7. **Answered.** At about 200 ms the chips go and the question appears as my bubble. That reads as landed.
8. **Connected.** Yes: the words I tapped become my message.
9. **Steady.** Yes, but for the rest of the second **nothing says Sen is working**. No typing dots or *Sen is
   thinking* that I can see (the header avatar may animate, but it's too small to see in the strip).

Verdict: look again. Fix first (E2): after the question posts, show that Sen is answering, in words or with a
visible working state.

### `ask/3`: the *Insights* tab from Home (flagged: settle 2246 ms vs main's 212)
7. **Answered.** A ripple on the Insights tab from about 150 ms, then the crossfade starts at about 500 ms.
8. **Connected.** The tab bar's dot travels across the tabs to Insights, the look's own switch, and that's nicely
   tied to the tap.
9. **Steady.** No. Home fades to **a blank skeleton**, and Insights stays a skeleton to the end of the second. It only
   fills about 100 ms into `ask/4`, roughly 1.1 s after the tap. On `main` this switch settled in 212 ms.

Verdict: wrong. Fix first: a tab switch must not be ten times slower than before or pass through a blank screen.
Crossfade to the real content, or keep the crossfade's timing off the content's loading.

### `ask/4`: opening Sen from Insights (flagged: first change 336 ms vs 112)
7. **Answered.** No visible change until about 500 ms (and the tap landed while Insights was still a skeleton).
8. **Connected.** The sheet rises from the bottom.
9. **Steady.** No. The sheet first stops at **a short height**, header and skeleton only, for about 150 ms, then
   **snaps** to full height in one frame and creeps the rest of the way. That's exactly the *A sheet whose content
   changes eases to its new height* moment, and it doesn't ease.

Verdict: look again. Fix first: open Sen's sheet at its full height straight away, or ease the height.

### `capture-off/4`: opening the dev panel on Home (flagged: first change 328 ms vs 184)
7. **Answered.** No. About 350 ms of nothing.
8. **Connected.** The sheet rises from the bottom.
9. **Steady.** It rises, then creeps, then jumps to a later section (*Xiaomi · Play the reveal*) at about 850 ms. The
   toast *Simulated: the "capture-off" scenario* sits **on top of the sheet**, over its *Reduced motion* switch and
   the scenario chips.

Verdict: look again (dev-only screen, but the sheet and toast are shared). Fix first: toasts must sit under an open
sheet or move above it, never over its controls. See `members/10`.

### `export/2`: opening the dev panel on Data (flagged: settle 230 ms vs 116)
7. **Answered.** No. About 400 ms before the scrim.
8. **Connected.** Same as above.
9. **Steady.** Rise and creep. The toast *Export isn't ready yet. Nothing was exported.* again sits **over** the
   sheet's text-size and scenario rows. That toast is honest (it says nothing was exported), which is good for E2.

Verdict: look again. Fix first: the toast over the sheet.

### `members…/10`: *Remove* on Hui Min's page
7. **Answered.** Yes. The ripple on *Remove* and the scrim come together at about 200 ms.
8. **Connected.** The confirm sheet rises from the bottom.
9. **Steady.** The sheet settles by about 500 ms. **But the earlier *Undone* toast sits on top of the sheet, covering
   *Export their data first* and the top of *Remove*.** This is a destructive, can't-be-undone choice, and the safe
   option is hidden.

Verdict: wrong. Fix first: a toast must never cover an open sheet's buttons, least of all on a destructive confirm.
Dismiss it when a sheet opens, or draw it above the sheet.

### `members…/11`: *Remove* in that sheet (flagged: settle 532 ms vs 254)
7. **Answered.** Yes. The sheet starts falling at about 150 ms.
8. **Connected.** Yes. The sheet falls, then the page goes back (slides right) to Members, without Hui Min, with
   *Removed Hui Min. Their data export goes to huimin@example.com*.
9. **Steady.** Mostly. While the sheet falls (200–300 ms) the Member page behind it **jumps to its top** before
   sliding away. The toast says an export is being sent, although I tapped *Remove* rather than *Export their data
   first*. A person may wonder which one they chose.

Verdict: look again. Fix first: don't scroll the page behind back to its top before going back.

### `fix/2`: opening a payment from Payments (search *NASI KANDAR ABC*)
7. **Answered.** The search field loses focus at about 200 ms. The push starts at about 400 ms.
8. **Connected.** Not as patterns §8 asks. There's **no shared amount** growing into the figure: the detail slides in
   as a skeleton and is **still a skeleton at 1 s**. Separately, while *NASI KANDAR ABC* is in the search box, the
   list still shows *Sate Kajang, Grabfood, Nando's…* (124 payments), so the search doesn't look like it filtered.
9. **Steady.** The slide is smooth. What it carries is empty.

Verdict: look again. Fix first: the pushed detail should arrive with its content (and the shared amount), not an
empty skeleton. The reviewer should check the search list on its own.

### `fix/3`: *Meals* (Category) on the payment
7. **Answered.** No. About 350 ms of nothing, then the scrim.
8. **Connected.** The sheet rises from the bottom, which is fine.
9. **Steady.** It rises and then creeps a few pixels for 500 ms. The title *Nasi Kandar Abc: which category?* is in
   title case here, unlike `hawker/1`.

Verdict: look again. Fix first: the still first 350 ms.

### `fix/4`: *Drinks & desserts* in the category sheet (run-1 finding 2)
7. **Answered.** Yes. At about 150 ms the content changes to *Drinks & desserts: just this one?*
8. **Connected.** Partly. The question appears where the list was.
9. **Steady.** No. For one frame the new short content sits in the **old full-height sheet**, a tall white void
   under two buttons. Then the height **snaps** down in one frame, then creeps a couple of pixels for the rest of the
   second. Nothing eases. The body says *NASI KANDAR ABC is filed by a rule* in capitals.

Verdict: wrong. Fix first: ease the sheet's height when its step changes (patterns §8). The run-1 finding still
stands.

### `fix/5`: *From now on*
7. **Answered.** No visible change until about 350 ms.
8. **Connected.** No. As the sheet closes it shows **the previous step**, *Nasi Kandar Abc: which category?* with
   *Meals ✓*, so for 200 ms it looks like the choice went back to Meals.
9. **Steady.** No. After the sheet goes, the page still says *Meals* until about 850 ms. Then the Category becomes
   *Drinks & desserts* (wrapping to two lines, pushing the cards below down) and a toast slides in, *NASI KANDAR ABC
   is Drinks & desserts from now on · Undo*, again in capitals.

Verdict: wrong. Fix first: a closing sheet must keep its last content (here, *just this one?*), and the category
should change as the sheet closes, not half a second after.

### `fix/6`: *Undo* on that toast
7. **Answered.** The toast starts leaving at about 150 ms.
8. **Connected.** No. The toast's text fades in place over *What the bank said* (doubled text for about 150 ms), and
   then the page still says *Drinks & desserts* until about 850 ms. Only then does it flip back to *Meals* and an
   *Undone* toast slides in.
9. **Steady.** Apart from the overlap and the late flip, yes.

Verdict: look again. Fix first: Undo's effect when the toast goes (the same as `proposal/3`).

### `split-stuck/2`: *Add* with no name in *Who had this?*
7. **Answered.** Yes. At about 150 ms the field turns red and *Type your friend's name.* appears, with the ripple on
   *Add*.
8. **Connected.** Yes. The message is right under the field.
9. **Steady.** The sheet grows smoothly for the message and shrinks back once *Zul* is typed. The shrink then creeps
   by 2–4 px over the rest of the second (the run-2 "creep"). The message is in red, where patterns §2 says an error
   is said in words in the text colour and `destructive` is for removing things.

Verdict: look again. Fix first: the error text's colour. The creep is small here.

### `email-setup/1`: *Settings* on More (run-1 note: about 350 ms before the slide)
7. **Answered.** No. 0–300 ms is unchanged.
8. **Connected.** Yes, once it moves: More shifts left and dims, and Settings comes in from the right.
9. **Steady.** It slides in as a skeleton, the title arrives at about 550 ms, and the content fades in by about
   650 ms. Sen's button fades out on the way, which is correct because Settings isn't a tab screen.

Verdict: look again. Fix first: the 350 ms before the push.

### `daily/1`: the figure on Home opens *This cycle*
7. **Answered.** No. 0–350 ms is unchanged. Then the ripple (a big grey circle on the figure) and the scrim arrive
   together at about 400 ms.
8. **Connected.** Yes. The ripple spreads from the figure that was tapped, which is a nice touch.
9. **Steady.** The sheet rises and creeps for about 300 ms. The figures add up: *+RM5,804.80* in, *RM3,873.53*
   spent, *RM1,931.27* left, the same as the big figure behind.

Verdict: look again. Fix first: the press shows 400 ms late. A ripple that starts with the result isn't feedback.

---

## Summary, worst first

| Entry | Kind | Verdict | Fix first |
|---|---|---|---|
| `hawker/2` | strip | wrong | Answering from the sheet leaves the question in Review; the sheet's title flips to *Category* as it closes |
| `own-transfer/1` | strip | wrong | No visible response in the whole second after *Public Bank* |
| `ask/3` | strip | wrong | Tab switch fades through a blank skeleton; ~1.1 s to content vs 212 ms on main |
| `members…/10` | strip | wrong | The *Undone* toast covers *Export their data first* on a destructive confirm |
| `fix/4` | strip | wrong | Sheet height snaps (with a white void) instead of easing |
| `fix/5` | strip | wrong | Closing sheet flashes the previous step; category changes 500 ms after |
| `own-transfer/2` | strip | look again | Review jumps to its top, then crossfades through a skeleton |
| `own-transfer/3` | strip | look again | 550 ms before the push starts |
| `proposal/3` | strip | look again | Undo lands 700 ms after the toast leaves; conversation jumps |
| `fix/6` | strip | look again | Undo lands 700 ms after the toast leaves |
| `ask/4` | strip | look again | Sen's sheet opens short, then snaps to full height |
| `ask/2` | strip | look again | Nothing says Sen is working after the question posts (E2) |
| `fix/2` | strip | look again | Push carries an empty skeleton, no shared amount; search list looks unfiltered |
| `ask/1` | strip | look again | 450 ms before anything shows |
| `hawker/1` | strip | look again | 300 ms still before the sheet; title in capitals |
| `fix/3` | strip | look again | 350 ms still before the sheet; creep |
| `daily/1` | strip | look again | Ripple and result arrive together, 400 ms after the tap |
| `email-setup/1` | strip | look again | 350 ms before the push |
| `members…/11` | strip | look again | Page behind jumps to its top before going back |
| `capture-off/4` | strip | look again | Toast over the dev panel's controls; 350 ms still |
| `export/2` | strip | look again | Toast over the dev panel's controls |
| `split-stuck/2` | strip | look again | Error text in `destructive` red; small creep |
| `account` | screen | look again | *RM42.10 less* in red with no icon or meaning; scenario dates contradict (not from this slice) |
| `settings` | screen | look again | *Appearance*'s mode pill looks like a switch (not from this slice) |
| `payday/5` | strip | fine | (Ripple shows after the value) |
| `txn` | screen | fine | (Minted's spaced dot in amounts, not from this slice) |

Count: **wrong 6 · look again 18 · fine 2** (26 entries: 3 screens, 23 filmstrips).
