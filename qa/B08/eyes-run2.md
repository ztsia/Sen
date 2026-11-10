# Eyes: B08 first-run accounts

Report: `qa-artifacts/B08/first-run-accounts/diff/index.md` (head afdf5db2 + uncommitted, against origin/main e9dc28c1).
Read first: `docs/ui/patterns.md` §2, §3, §7, §8; `docs/workflow/qa.md` (Minted light, then dark; question 10 on motion); `qa/escapes.md` E1–E3.

Questions 1–5 are the eyes questions. **E1**, **E2** and **E3** are the Asks from `qa/escapes.md`. For filmstrips, 7–9 plus 10 (motion, from `docs/workflow/qa.md`).

---

## Screens

### balance-check (`/s/balance-check`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** Four tall cards, each led by a large grey "RM 0.00". The eye goes to the placeholders before the account names. Purpose from the screen: "type what each app shows, or tap Matches". That comes through.
2. **Reading.** Fine for size. The words are the problem. Every card says *What the bank app shows*, including TNG eWallet and GrabPay Wallet, which are wallets. The TNG card says *Sen has RM7,815.40*. That figure is eWallet **and** GO+ together (RM262.30 + RM7,553.10 in base). Nothing on this card says so. The two new screens in this slice do say it: first-run's *eWallet and GO+ together* and the Accounts row. Ryt's card has the same gap (*Main account and pockets together* appears on Accounts but not here).
3. **Tapping.** *Matches* chips and the amount fields are clearly tappable. *Save* sits at the bottom in thumb reach.
4. **Broken.** Nothing cut off. The card is shorter now that GO+ is gone.
5. **Trust.** This is where the slice can mislead. Someone opening the TNG app sees the eWallet balance first and types it, say RM262.30. Sen then books about RM7,553 as *Unaccounted*. The headline on Accounts and the Unaccounted category would then be wrong by thousands, from a screen that looks routine. Base showed each figure on its own card, matching one number in the app.
- **E1.** Calm, one card per account. The four grey 0.00 placeholders, drawn as large as typed amounts, compete with the names.
- **E2.** See filmstrip balance-check/5: *Save* only greys out while it waits.
- **E3.** Nothing here depends on a reload. Can't be judged from a still.

Better than base: one card fewer. Worse: the merged figure lost its explanation on the one screen where the person has to type a matching number.

Verdict: **wrong**. Fix first: under the TNG eWallet (and Ryt) card's name, show the same *eWallet and GO+ together* / *Main account and pockets together* line the other screens show, so the person adds both balances before comparing.

### first-run@accounts (`/s/first-run?scenario=new`, step 5)

Opened: head minted-light, head minted-dark, head line-light (Line changed by pixels, not size), base minted-light.

1. **First look.** Four big typed amounts. The eye lands on RM 3,200.50 and RM 6,400.00. Purpose: "type each app's balance today". Clear from the one-line intro.
2. **Reading.** The intro is shorter and plainer than base. The helper lines under the fields read well but don't follow one rule. TNG says *From Touch 'n Go eWallet · eWallet and GO+ together*. Public Bank and GrabPay say *From MyPB by Public Bank* and *From Grab*. Ryt says only *Main account and pockets together*, with no *From*. Each account name (15 px regular) is much lighter than its amount. Each helper sits closer to its own field than to the next label, so the groups hold.
3. **Tapping.** The fields and *Next* (bottom, full width, thumb reach) are obvious.
4. **Broken.** Nothing in the still. In the filmstrips (first-run/7, /8), tapping *Next* with blanks turns all four labels red and **replaces each helper line** with a red *Type today's balance, or 0.* That removes the *eWallet and GO+ together* hint exactly when it's needed. A just-typed amount also shows briefly in red.
5. **Trust.** Order now follows the apps chosen in step 2, and GO+ is folded into TNG: good. Base said *Leave one blank to set it later*. That's gone, and the error now says *or 0*. Someone who doesn't know their GrabPay balance is told to type 0. Sen then counts from a balance that was never true, and the first real check books the difference as Unaccounted.
- **E1.** Calm overall. Four large figures stacked is heavy, but it's the form pattern (*the amount shows large as it's typed*).
- **E2.** *Next* says *Saving…* with a spinner within about 150 ms (first-run/9). Good.
- **E3.** N/A from a still.

Better: shorter intro, GO+ folded in, helper lines say where each figure comes from. Worse: the way to skip an unknown balance is gone, and the error state wipes the hints.

Verdict: **look again**. Fix first: keep each helper line visible in the error state, and either let a blank mean "set it later" again or say what 0 does. Don't push people to type 0 for a balance they don't know.

### accounts (`/s/accounts`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** The total RM29,871.77, then *Check balances*. Purpose: "what I have, across accounts". Clear.
2. **Reading.** Ryt's row is cut off: *Main account and pocke…*. That line explains what the figure covers, so losing half of it matters. Rows put their extra text in two different places. *MyPB* and *Grab* sit inline after the badge. Ryt's and TNG's line drops to a third line. Rows end up three heights, and the extra text means two different things (where it comes from, or what's included) in the same slot.
3. **Tapping.** Rows open details. The grey *Checked …* pills look like chips you could tap (pre-existing).
4. **Broken.** The truncation above. Otherwise aligned.
5. **Trust.** The sum checks: 14,650.87 + 7,340.00 + 7,815.40 + 65.50 = 29,871.77. *In 4 accounts* matches More's *Accounts 4*. GO+ folded into TNG adds up (262.30 + 7,553.10 = 7,815.40). The red *Not checked* badges are gone, which is much calmer. But Ryt says *Checked 1 Oct* while the other three say *Checked 31 Oct*. Ryt's own detail shows an opening balance typed on 31 Oct, so an opening balance counts as a check for three accounts but not for Ryt. Either Ryt should say 31 Oct, or the fixture's dates disagree. Worth checking which.
- **E1.** Calmer than base (no red badges), one figure first. The uneven rows add noise.
- **E2.** N/A (see balance-check/1 film).
- **E3.** N/A.

Better: no alarming red, one account fewer, totals unchanged. Worse: the truncated line and uneven rows.

Verdict: **look again**. Fix first: let the row's explanatory line wrap (or shorten it, e.g. *With pockets*) so it never truncates, and put the extra text in one place on every row.

### accounts@capture-off (`/s/accounts?scenario=capture-off`)

Opened: head minted-light, head minted-dark, base minted-light.

1–5. Pixel for pixel the same content as `accounts`, and the same answers. The total matches the rows. Ryt's line is truncated to *pocke…*. Ryt says *Checked 1 Oct* while the others say *31 Oct*. The red *Not checked* badges are gone. Nothing on this screen says capture is off. That's pre-existing and probably Home's job, but a person here would not know these balances have stopped updating.
- **E1/E2/E3.** As `accounts`.

Verdict: **look again**. Fix first: same as `accounts` (the truncated, misplaced second line).

### accounts@month (`/s/accounts?scenario=month`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** The wallet tile and *No accounts yet*. Purpose: an empty Accounts screen.
2. **Reading.** The new line, *Each app you choose for Sen to read gets an account here, with the balance you type for it.*, explains the model better than base's.
3. **Tapping.** Nothing to tap. Patterns §7.9 says an empty state has one button. The line tells me to choose apps and type a balance, but there's no way to do it from here (pre-existing).
4. **Broken.** Nothing.
5. **Trust.** Nothing alarming. In this scenario Review shows 4 items while there are no accounts. That's the fixture's oddity, not the screen's.
- **E1.** Calm. **E2/E3.** N/A.

Better: clearer words. Unchanged: no action.

Verdict: **look again**. Fix first: give the empty state its one button (*Choose your apps*), since the new line points there.

### first-run@apps (`/s/first-run?scenario=new`, step 2)

Opened: head minted-light, head minted-dark, base minted-light, and the diff image (to see what changed in pixels).

1. **First look.** Title, then the four switched-on banks. Purpose: "pick which apps Sen reads". Clear.
2. **Reading.** The pixel change is the disabled rows. Their second line (*Your SMS app can't be chosen: it carries TACs* and others) and their switch knobs are darker now, so the reasons read more easily.
3. **Tapping.** The switches are obvious. Disabled switches are mid-grey against the near-black knob of an off-but-allowed switch. They stay distinguishable, though less so than before.
4. **Broken.** Nothing.
5. **Trust.** The tree diff says the four banks are on and the *Suggested · Choose these 4* card is gone. If a person arrived to find them already on, that would sit badly with *Sen reads notifications only from the apps you choose here*. The filmstrip (first-run/3, /4) shows the head still arrives with the card and every switch off, and the person taps *Choose these 4*. So the screenshot and tree seem to record the moment after that tap. I judged what a person sees: an explicit choice. Worth the reviewer confirming the tree change is only the recorded moment.
- **E1.** Calm, grouped in cards. **E2/E3.** N/A.

Verdict: **fine**. One thing: confirm the catalogue state is "after *Choose these 4*" and not a silent pre-selection.

### settings/capture/apps (`/s/settings/capture/apps`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** The *Suggested* card with *Choose these 4*. Purpose: "which apps Sen reads". Clear.
2. **Reading.** Same change as first-run@apps: the disabled rows' reasons are darker and easier to read.
3. **Tapping.** *Choose these 4* is the one filled button. Switches are clear.
4. **Broken.** Nothing.
5. **Trust.** Nothing alarming. Nothing is on until chosen.
- **E1.** Calm. **E2/E3.** N/A.

Verdict: **fine**.

### account (`/s/account?id=…`, Ryt Bank)

Opened: head minted-light, head minted-dark, base minted-light, head firefly-dark and its diff (its 30k pixels differ from the default's).

1. **First look.** RM14,650.87, *Balance now*, Ryt Bank. Purpose: one account's balance and history. Clear.
2. **Reading.** Fine. *Computed from your notifications since 31 Oct. Not the bank's own figure.* is honest and plain.
3. **Tapping.** The new *Edit* joins *Check · Payments · Ask Sen* as a fourth round action with a caption, within the ActionBar's four. It's obviously tappable. What it edits (name? opening balance?) isn't said, but the label is plain.
4. **Broken.** Nothing. Firefly dark's extra pixels are the four actions moving over and the Ask Sen avatar's frame, not a fault.
5. **Trust.** The dates read oddly (pre-existing fixture): opening balance *on 31 Oct*, but *Last checked 1 Oct* and a check row *1 Oct: bank showed RM4,812.35*, a month before Sen started counting. Same root as the Accounts row's *Checked 1 Oct*.
- **E1.** Calm. Facts (FactGrid) and actions (ActionBar) look different. **E2/E3.** N/A.

Verdict: **fine**. Note for the reviewer: a check dated before the opening balance; decide whether an opening balance should be the "last checked" date.

### more (`/more`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** The card of four destinations. Purpose: the rest of the app. Clear.
2. **Reading.** Fine.
3. **Tapping.** Rows with chevrons. Obvious.
4. **Broken.** Nothing.
5. **Trust.** *Accounts 4* matches the Accounts screen. *Payments* went from **1,151 to 1,139**. Twelve fewer payments, which the tree diff didn't show. Probably eWallet ↔ GO+ moves that are now inside one account. If so, right, but the reviewer should confirm none of the twelve were real spending.
- **E1.** Calm. **E2/E3.** N/A.

Verdict: **fine**. Reviewer: explain the 12 payments that left.

### payments (`/s/payments`)

Opened: head minted-light, head minted-dark, base minted-light, and the diff. These are 780×8000 shots, which `Read` shows at quarter scale. I could read the rows, not fine type.

1. **First look.** Search, filters, then day groups. Purpose: every payment. Clear.
2. **Reading.** The diff shows two changes. The count line (*1,139 payments*). And *Go+ Daily Earnings · Interest & returns* now reads *TNG eWallet* instead of *GO+*, consistent with the merged account.
3. **Tapping.** Rows and chips as before.
4. **Broken.** Nothing visible at this scale.
5. **Trust.** Day totals I could read are unchanged from base (e.g. Sun 18 Oct RM197.63, Thu 15 Oct RM83.50). Money in is still green with a +. Same open question on the 12 fewer payments.
- **E1/E2/E3.** Unchanged / N/A.

Verdict: **fine**.

### payments@offline (`/s/payments?state=offline`)

Opened: head minted-light, head minted-dark, and the diff.

1–5. Same two changes as `payments`. *1,141 payments* (the two *Not synced yet* rows plus 1,139) agrees with the online count. The offline banner and *Not synced yet* marks are unchanged. Nothing broken at quarter scale.

Verdict: **fine**.

### settings/categories (`/s/settings/categories`)

Opened: head minted-light, head minted-dark, base minted-light.

1. **First look.** The grid of category tiles. Purpose: manage categories and rules.
2. **Reading.** Fine.
3. **Tapping.** New *+ Add a category*: an outlined full-width button under *Income categories*. Clearly a button and drawn quieter than a main action, which suits a rare action. It doesn't say whether it adds a spending or an income category. Its place, under Income, hints at income only.
4. **Broken.** Nothing.
5. **Trust.** No figures.
- **E1.** Calm. **E2/E3.** N/A.

Verdict: **fine**.

### first-run@name (`/s/first-run?scenario=new`, step 6)

Opened: head minted-light and base minted-light (the only pair; the report lists no pixel change).

1–5. Head and base are the same pixels: *tan wei ming* typed, *Sen will look for TAN WEI MING.* under it, *Next* at the bottom. The tree diff is only the moment recorded (typed vs empty). In the empty state (first-run/9) the hint still says *You can add other spellings later in Settings.* Clear, nothing broken, nothing alarming.

Verdict: **fine**.

---

## Filmstrips

The film strips are two rows of about 21 frames, 50 ms apart, read left to right then the next row. **Question 10** is motion (patterns §8).

One thing runs through the whole first-run journey: **every step change shows a list skeleton** (round marks and two-line rows) for 300–800 ms. These screens are cards, fields and buttons, so the skeleton matches none of them (patterns §7: *a skeleton shaped like the content*). Most steps show content that's already on the phone.

### first-run/1: *Send the code*
7. About 150 ms of nothing, then the code screen. No *Sending the code…* seen, but it was quick.
8. Swaps in place. Fine within a task.
9. Steady.
10. No motion needed.
Verdict: **fine**.

### first-run/2: *Sign in* with an expired code
7. Ripple and red *That code has expired.* by about frame 4.
8. Yes, the error sits on the field.
9. Steady. Afterwards *Send a new code* becomes a second filled button under *Sign in*, so two equal main actions.
10. N/A.
Verdict: **look again**. Fix first: once the code has expired, step *Sign in* down so *Send a new code* is the one main action.

### first-run/3: *Sign in*
7. *Signing in…* with a spinner at about 200 ms. Answered.
8. Yes.
9. One frame of an app bar saying **Welcome** over a blank body, then *Choose your apps* fading in as a skeleton for about 700 ms, then the card and switches.
10. The blank *Welcome* frame is a flash.
Verdict: **look again**. Fix first: remove the blank *Welcome* frame between sign-in and step 2.

### first-run/4: *Choose these 4*
7. Answered by frame 3: the switches flip on.
8. Partly. The *Suggested* card vanishes at once and the whole list **jumps up** about 60 px under the finger, so the switches turn on somewhere other than where they were.
9. The jump is the one unsteady moment.
10. Patterns: a removed block should close up with motion, not snap.
Verdict: **look again**. Fix first: let the card collapse (200 ms) instead of disappearing, or keep it in place showing "Chosen".

### first-run/5: *Next* to *Notification access*
7. Answered: ripple and the new title within a frame or two.
8. Swaps.
9. About 300 ms of list skeleton, then the cards.
10. OK.
Verdict: **fine** (the shared skeleton note applies).

### first-run/6: to *Keep Sen running*
7. Answered.
8. Swaps. *Skip for now* shows a grey pressed state while the new screen is still a skeleton, as if it had been tapped.
9. About 450 ms of list skeleton.
10. OK.
Verdict: **look again**. Fix first: the skeleton wait for a screen of fixed text.

### first-run/7: to *Your accounts* (flagged, settle 230 ms vs 81 ms)
7. The title changes at once.
8. Swaps.
9. About **800 ms** of list skeleton for a form whose four fields are the apps chosen two steps earlier. Then the form arrives already red, from the journey's next tap on *Next*, which lands as the form appears.
10. OK.
Verdict: **look again**. Fix first: render the four fields straight away from what step 2 chose.

### first-run/8: *Next* with blanks
7. Ripple and errors together.
8. Yes.
9. All four fields go red at once, and every helper line (*eWallet and GO+ together*, *Main account and pockets together*) is **replaced** by *Type today's balance, or 0.* As digits are typed, the amount shows red for a frame, then turns dark. A red money figure reads as a warning.
10. N/A.
Verdict: **look again**. Fix first: keep the helper line and add the error under it, and never draw a typed amount in red.

### first-run/9: *Next* (*Saving…*) to *Your name*
7. *Saving…* with a spinner in about 150 ms. E2 is met.
8. Yes.
9. Skeleton, then a blank frame, then *Your name* fading in. A small flicker.
10. OK.
Verdict: **fine**.

### first-run/10: *Next* with an empty name, then typing
7. Ripple, then a red *Type your name as your bank prints it.*
8. Yes, at the field.
9. Steady. *Sen will look for TAN WEI MING.* updates as the name is typed. Nice.
10. N/A.
Verdict: **fine**.

### first-run/11: *Next* on *Your name*
7. The ripple shows at once. Then the screen sits for about **850 ms** with no *Saving…*. Compare *Your accounts*, whose *Next* says *Saving…*.
8. Swaps to *Expected payday*.
9. Steady, but the wait is unexplained.
10. OK.
Verdict: **look again**. Fix first (E2): give this *Next* the same *Saving…* spinner.

### first-run/12: *A day number*
7. The segment highlights within about 4 frames.
8. Yes, under the finger.
9. Steady.
10. OK.
Verdict: **fine**.

### first-run/13: *Finish* with no day, then typing 28, then back
7. The error *Type a day from 1 to 31.* appears quickly.
8. Yes.
9. Steady. Back returns to *Your name* with the name kept.
10. Back swaps without the slide back (within a task).
Verdict: **fine**.

### first-run/14: back to *Your accounts*
7. Answered.
8. Swaps.
9. About **400 ms** of list skeleton before the four typed amounts come back. They do come back, which is good.
10. A back move could reverse the forward motion. Here it swaps.
Verdict: **look again**. Fix first: show the kept values at once on back.

### first-run/15: back and forward again
7. Answered.
8. Swaps.
9. The same 400 ms skeleton, then the values. Forward to *Your name* is quick.
10. Same as 14.
Verdict: **look again**. Same fix as 14.

### first-run/16: forward to *Expected payday*, *Finish*
7. *Finishing…* with a spinner within a frame.
8. Yes.
9. Steady.
10. OK.
Verdict: **fine**.

### first-run/17: *Next* to payday, *Finish*
7. The swap at about 150 ms. *Finishing…* follows.
8. Yes.
9. Steady. *Finishing…* holds, then the button fades lighter, as if disabled.
10. OK.
Verdict: **fine**.

### first-run/18: *Finish* to Home (flagged, settle 1,243 ms)
7. *Finishing…* at once. Answered.
8. Yes.
9. About 1 s of *Finishing…*, with the button fading paler halfway. Then Home crossfades in **through see-through frames**: payday's text and Home's skeleton overlap for 2–3 frames. Then skeleton.
10. Patterns ask for no see-through frame.
Verdict: **look again**. Fix first: the overlap frames between the last step and Home.

### first-run/19: the More tab from Home
7. The tab answers at once.
8. Crossfade, as a tab should.
9. Home's figure (*RM0.00*, *Total balance RM9,725.50*) ghosts under a list skeleton, then about **500 ms** of skeleton for a static menu, then More. The figures are right: 85.00 + 3,200.50 + 6,400.00 + 40.00 = 9,725.50, and *Accounts 4*.
10. The crossfade shows see-through frames.
Verdict: **look again**. Fix first: More's menu shouldn't wait behind a skeleton.

### first-run/20: *Accounts* row (flagged, settle 1,217 ms)
7. Answered: More starts sliding left.
8. Yes, the forward slide from the right.
9. The incoming screen is a skeleton for about **650 ms**, then Accounts. Its figures match what was typed: RM9,725.50, TNG RM85.00 *eWallet and GO+ together*, Ryt RM3,200.50, Public Bank RM6,400.00, GrabPay RM40.00. Ryt's line truncates here too (*Main account and pocke…*).
10. The slide is right. It slides in a skeleton.
Verdict: **look again**. Fix first: the skeleton wait, which is most of the 1.2 s.

### balance-check/1: More to *Accounts* (flagged, settle 1,052 ms)
7. For about **400 ms** I couldn't see a press on the *Accounts* row at film size. Then the slide.
8. The slide is from the right.
9. About 300 ms of skeleton, then Accounts.
10. OK.
Verdict: **look again**. Fix first: the first 400 ms look ignored. Check the row's ripple starts on pointerdown.

### balance-check/2: *Check balances*
7. Answered.
8. Slides in. Skeleton briefly, then the cards fade in.
9. Steady.
10. OK.
Verdict: **fine**.

### balance-check/3: *Save* with nothing, then typing Ryt and TNG
7. Ripple, then the line above *Save*: *Type what a bank app shows, or tap Matches, for at least one account.*
8. Yes.
9. Steady. *RM50.00 less than Sen has* appears beside Ryt as typed. TNG's 7,815.40 gives *No difference*. That's only because the test typed the combined figure (see the balance-check screen).
10. OK.
Verdict: **fine**.

### balance-check/4: *Matches* on TNG
7. Pressed state and *No difference* within a few frames.
8. Yes.
9. Steady.
10. OK.
Verdict: **fine**.

### balance-check/5: *Save* (flagged, first change 136 ms)
7. Nothing for about 3 frames, then *Save* **only greys out**: no spinner, no *Saving…*. This is E2's exact failure.
8. Then the form **scrolls to the top** before leaving, and Accounts slides back in. RM29,821.77 (29,871.77 − 50.00, right). The toast *Balances saved. RM50.00 booked as Unaccounted. Undo* is clear and honest.
9. The scroll-to-top jump just before leaving.
10. The back slide is right.
Verdict: **wrong**. Fix first (E2): *Save* must say *Saving…* with a spinner while it waits. On a phone network a greyed button looks like a dead tap, as the owner already found on sign-in.

---

## Verdicts, worst first

| Entry | Verdict | Fix first |
|---|---|---|
| balance-check | wrong | TNG (and Ryt) card doesn't say the figure is eWallet + GO+ together; typing the eWallet alone books thousands as Unaccounted |
| film balance-check/5 | wrong | *Save* only greys out while it waits; needs *Saving…* (E2) |
| first-run@accounts | look again | Error state replaces the helper lines; *or 0* pushes unknown balances to a false RM0.00 |
| accounts | look again | Ryt's *Main account and pocke…* truncates; second line sits in two places; Ryt *Checked 1 Oct* vs others' 31 Oct |
| accounts@capture-off | look again | Same as accounts |
| accounts@month | look again | Empty state has no button though its new line points to choosing apps |
| film first-run/7 | look again | About 800 ms list skeleton before a form whose fields are already known |
| film first-run/8 | look again | All fields red, hints replaced, typed amount flashes red |
| film first-run/11 | look again | *Next* on name waits about 850 ms with no *Saving…* (E2) |
| film first-run/18 | look again | See-through overlap from payday into Home |
| film first-run/19 | look again | Ghosted crossfade, then about 500 ms skeleton for the static More menu |
| film first-run/20 | look again | About 650 ms skeleton inside the slide to Accounts |
| film balance-check/1 | look again | About 400 ms with no visible press on the Accounts row |
| film first-run/3 | look again | Blank *Welcome* frame between sign-in and step 2 |
| film first-run/4 | look again | *Suggested* card snaps away; list jumps under the finger |
| film first-run/6 | look again | About 450 ms skeleton for fixed text; *Skip for now* looks pressed |
| film first-run/14 | look again | About 400 ms skeleton on back before kept values return |
| film first-run/15 | look again | Same as 14 |
| film first-run/2 | look again | Two filled buttons after the code expires |
| first-run@apps | fine | Confirm the tree's pre-checked state is only the moment after *Choose these 4* |
| account | fine | Note: a check dated 1 Oct before the 31 Oct opening balance |
| more | fine | Reviewer: explain the 12 payments that left (1,151 → 1,139) |
| payments | fine | |
| payments@offline | fine | |
| settings/capture/apps | fine | |
| settings/categories | fine | |
| first-run@name | fine | |
| film first-run/1 | fine | |
| film first-run/5 | fine | |
| film first-run/9 | fine | |
| film first-run/10 | fine | |
| film first-run/12 | fine | |
| film first-run/13 | fine | |
| film first-run/16 | fine | |
| film first-run/17 | fine | |
| film balance-check/2 | fine | |
| film balance-check/3 | fine | |
| film balance-check/4 | fine | |

**Screens (13):** wrong 1, look again 4, fine 8. **Filmstrips (25):** wrong 1, look again 13, fine 11. **Total (38):** wrong 2, look again 17, fine 19.
