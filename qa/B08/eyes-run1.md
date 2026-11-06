# B08 · eyes pass

Report: `qa-artifacts/B08_first-run-accounts/diff/index.md` (head ac6cfa73 + uncommitted, against origin/main e9dc28c1).
Read first: `docs/ui/patterns.md` §2, §3, §7, §8; `docs/workflow/qa.md` (adds Q10, motion); `qa/escapes.md` (E1 calm, E2 waiting buttons, E3 reaching an open phone).
Each entry: head Minted light, then Minted dark, then the base. Other pairs opened where their change differed from Minted's (account: Firefly dark; first-run@accounts: Line light).
On E3: none of these screens touches how an update reaches the phone, and a still can't show it, so it's answered once here, not under every entry.

---

## Entries

### more
Screens: `head/catalogue/more--minted-light.png`, `--minted-dark.png`, `base/catalogue/more--minted-light.png`.
1. **First look:** the white card of four rows. It's the hub for everything that isn't a tab. Right.
2. **Reading:** easy. Payments, Shared bills, Accounts, Claims, then Settings in its own card, each with a short value on the right.
3. **Tapping:** every row has an icon tile and a chevron, so it reads as a destination. Sen's button sits bottom right, clear of the last row.
4. **Broken:** nothing. Dark mode matches light.
5. **Trust:** *Accounts 4* (was 5) is right now that GO+ is folded into TNG eWallet. *Payments 1,139* (was 1,151): twelve payments left the made-up month along with GO+. A person won't see this, but the reviewer should confirm those twelve were GO+-only rows and not lost spending.
6. **E1:** calm: two cards, plenty of room. **E2:** nothing waits.
Better or worse than base: the same, apart from the counts.
Verdict: fine. Have the reviewer confirm the 12 payments that dropped out.

### payments
Screens: `head/catalogue/payments--minted-light.png`, `--minted-dark.png`, `base/...payments--minted-light.png`, `diff/payments--minted-light.png`.
1. **First look:** the search bar, then the day headers and rows. A list of every payment, by day.
2. **Reading:** fine. The diff is just two places: the count (*1,139 payments*) and the second line of *Go+ Daily Earnings*, which now reads *Interest & returns · TNG eWallet*.
3. **Tapping:** filter chips and rows. Rows open their detail.
4. **Broken:** nothing new. Dark matches light.
5. **Trust:** GO+ interest is now booked to TNG eWallet, which agrees with the Accounts screen. *+RM4.80* is green with a plus, as everywhere else. Older, not this slice: *TAN WEI MING → Ryt Bank* stays in capitals (§2 says title case), and a move to your own account shows as green *+RM2,000.00*, which reads like income.
6. **E1:** a long list, as designed. **E2:** n/a.
Verdict: fine. Nothing from this slice to fix.

### accounts
Screens: `head/catalogue/accounts--minted-light.png`, `--minted-dark.png`, `base/catalogue/accounts--minted-light.png`.
1. **First look:** *RM29,871.77 · In 4 accounts*. It's your money across your accounts. Right.
2. **Reading:** clear. The total, one line about the last check, *Check balances*, then the Tracked card with four rows and the Elsewhere card.
3. **Tapping:** *Check balances* is the one 48 px main action. Rows open the account. The Elsewhere card reads as information, correctly.
4. **Broken:** nothing. The card is shorter by one row. Dark matches light.
5. **Trust:** the total is unchanged (14,650.87 + 7,340.00 + 7,815.40 + 65.50 = 29,871.77) and TNG eWallet's RM7,815.40 is the old TNG RM262.30 plus GO+ RM7,553.10. But nothing on the row says GO+ is inside it. A person opening the TNG app sees an eWallet balance in the hundreds and GO+ on a separate card. Next to RM7,815.40 the row looks wrong. The other rows carry an app name on their second line (*MyPB*, *Grab*); TNG eWallet's second line has none.
6. **E1:** calm. **E2:** n/a.
Better: one fewer row, and the structure matches the person's apps. Worse: the TNG figure now needs a word it doesn't have.
Verdict: look again. Say *with GO+* on the TNG eWallet row's second line.

### account
Screens: `head/catalogue/account--minted-light.png`, `--minted-dark.png`, `--firefly-dark.png` (30k px, the outlier), `base/...account--minted-light.png`.
1. **First look:** *RM14,650.87 · Balance now* for Ryt Bank. One account's balance and where it came from.
2. **Reading:** fine. The header card, four round actions, the fact grid, recent payments and checks.
3. **Tapping:** the new **Edit** joins Check, Payments and Ask Sen in the ActionBar: four, the most the pattern allows, evenly spaced and captioned. It reads as an action, and the facts below don't.
4. **Broken:** nothing. Firefly dark's large diff is its animated avatar in *Ask Sen* plus the check line wrapping onto two lines (*1 Oct: bank showed / RM4,812.35*). Both are tidy.
5. **Trust:** the dates contradict each other. *Computed from your notifications since 31 Oct* and *Opening balance RM3,200.00 on 31 Oct*, but *Last checked 1 Oct*, a check card dated 1 Oct, and payments up to 18 Oct. A check from before the opening date, and a balance that went from RM3,200 to RM14,650 in a list of meals, reads as wrong. The date logic was there on the base too, but opening balances are this slice's subject. *RM42.10 less* is in a red pill, where §2 keeps `destructive` off amounts (older).
6. **E1:** calm. **E2:** n/a.
Better: Edit is where you'd look for it. Worse: nothing new.
Verdict: look again. Make the made-up opening date come before the check and the payments, or derive it from them, so the facts agree.

### balance-check
Screens: `head/catalogue/balance-check--minted-light.png`, `--minted-dark.png`, `base/...balance-check--minted-light.png`.
1. **First look:** four cards, each with a large *RM 0.00*. Typing what each bank app shows, to compare.
2. **Reading:** the intro is clear (*A difference is booked as Unaccounted*). The four large grey *0.00* placeholders are the loudest thing on screen and look like values (older).
3. **Tapping:** *Matches* chips per card, *Save* at the bottom in thumb reach.
4. **Broken:** nothing. The GO+ card is gone and the screen is 490 px shorter. Dark matches light.
5. **Trust:** **misleading.** The TNG eWallet card says *Sen has RM7,815.40* under *What the bank app shows*, with no word that GO+ must be added in. First run says *pockets and GO+ included*, but this screen doesn't. A person who types the eWallet number from the TNG app's home (hundreds) will book about RM7,500 as **Unaccounted** spending, the exact thing this screen exists to get right.
6. **E1:** four identical cards. Fine. **E2:** can't be seen in a still; Save wasn't filmed.
Better: one fewer card. Worse: the merged figure lost the explanation the separate GO+ card gave for free.
Verdict: **wrong**. Under TNG eWallet, say *Your eWallet and GO+ together*, as first run does.

### settings/capture/apps
Screens: `head/catalogue/settings_capture_apps--minted-light.png`, `--minted-dark.png`, `base/...`, `diff/settings_capture_apps--minted-light.png`.
1. **First look:** the *Suggested: Sen found 4 banks and e-wallets on this phone · Choose these 4* card. Choosing which apps Sen may read.
2. **Reading:** clear. Disabled rows say why (*Your SMS app can't be chosen: it carries TACs*).
3. **Tapping:** the switches and *Choose these 4*. The only change in pixels is the disabled switches' thumb, now a darker grey. It's still clearly different from the navy *off* thumb, and the muted labels carry the meaning.
4. **Broken:** nothing.
5. **Trust:** for Wei Ming, whose four apps are being read all month, this screen shows **every switch off** and suggests choosing them, so it looks as if capture is off. That was true on the base too, but this slice changed first run to pre-choose the four, so first run and Settings now disagree for the same person.
6. **E1:** calm. **E2:** n/a.
Better or worse: the darker disabled thumb is neutral.
Verdict: look again. Settings' fake should show the chosen apps on and drop the suggestion once they're chosen, as first run now does.

### settings/categories
Screens: `head/catalogue/settings_categories--minted-light.png`, `--minted-dark.png`, `base/...`.
1. **First look:** the grid of category tiles under *Categories | Rules*. Managing categories.
2. **Reading:** fine. Tiles have one tint each and two-line labels wrap cleanly (*Drinks & desserts*, *Interest & returns*).
3. **Tapping:** new: a full-width outlined **+ Add a category** under the income tiles. It's obviously a button and it's secondary, which is right. It sits directly under *Income categories*, so it could read as adding an income category only.
4. **Broken:** nothing. Dark matches light.
5. **Trust:** n/a.
6. **E1:** calm; the button adds one clear action. **E2:** n/a.
Better: there's now a way to add one.
Verdict: fine. Optionally give the button 24 px more air above it, so it reads as belonging to the whole screen.

### payments@offline
Screens: `head/catalogue/payments_offline--minted-light.png`, `--minted-dark.png`, `diff/payments_offline--minted-light.png`.
1. **First look:** the offline banner (*You're offline. What you add is kept and syncs when you're back.*), then the list.
2. **Reading:** same as payments, with *Not synced yet* marks on Kuih and Teh tarik.
3. **Tapping:** as payments.
4. **Broken:** nothing.
5. **Trust:** same change as payments: *1,141 payments*, and GO+ earnings on TNG eWallet. Consistent.
6. **E1/E2:** a banner, not an error. As designed.
Verdict: fine.

### first-run@apps
Screens: `head/catalogue/first-run_apps--minted-light.png`, `--minted-dark.png`, `base/...first-run_apps--minted-light.png`.
1. **First look:** the *Banks and e-wallets* card with four switches already on. Step 2 of 7: choosing the apps Sen reads.
2. **Reading:** clear. The suggestion card is gone, so the screen is simpler.
3. **Tapping:** switches. *Next* sits full-width in thumb reach. In dark mode *on* is a pale track with a dark knob. That's a little unusual, but consistent with the look.
4. **Broken:** nothing.
5. **Trust:** four switches arrive already on, and nothing says Sen turned them on because it found those apps. The base's *Sen found 4 banks and e-wallets on this phone* was the reason. For the one choice that decides what Sen may read (D86), a person should see why these are on. Also, the **journey's filmstrip (steps 3–4) still shows the old Suggested card with every switch off** and a *Choose these 4* tap. Either the catalogue state or the journey is stale. The reviewer should find out which one a person gets.
6. **E1:** calmer than base. **E2:** n/a.
Better: one fewer card and one fewer tap. Worse: the reason for the pre-chosen apps is gone.
Verdict: look again. Keep one line, *Sen found these 4 on this phone*, above the card. Then make the journey and the catalogue agree.

### first-run@accounts
Screens: `head/catalogue/first-run_accounts--minted-light.png`, `--minted-dark.png`, `--line-light.png` (same size, a different diff), `base/...first-run_accounts--minted-light.png`.
1. **First look:** four large figures, RM 85.00, 3,200.50, 6,400.00, 40.00. Step 5: type each app's balance today.
2. **Reading:** the intro is shorter and clearer than base (*Type the balance each app shows today, pockets and GO+ included*). But each field now has a small grey line **under** its underline (*Touch 'n Go eWallet*, *MyPB by Public Bank*, *Grab*). It sits just above the next field's label, so it reads as an orphan or a label for the next field, and *TNG eWallet … Touch 'n Go eWallet* reads as a stutter. Ryt Bank has none, so the rhythm is uneven: 120 px gaps beside 80 px ones.
3. **Tapping:** each figure is an input (number pad). *Next* is the one main action, in thumb reach.
4. **Broken:** nothing clipped. Line light has the same layout in its own type. Dark matches light.
5. **Trust:** the figures match what Home and Accounts show afterwards (sum RM9,725.50, seen in the journey). The GO+ instruction is in the intro, but it belongs on the TNG field, the one place it applies. The base's *Leave one blank to set it later* is gone, and the journey shows a blank now turns every field's label and hint red (*Type today's balance, or 0.*). That's four red errors at once for someone who hasn't got one app's number handy.
6. **E1:** four big figures is a lot, but it's one task. **E2:** *Saving…* shows on Next (journey step 9). Good.
Better: GO+ is no longer a separate thing to know about, and the intro is plainer. Worse: the hint lines and the all-red blank state.
Verdict: look again. Put each app's name above its field (or drop it where it repeats the label), and put *GO+ included* under TNG eWallet.

### first-run@name
Screens: `head/catalogue/first-run_name--minted-light.png`, `base/catalogue/first-run_name--minted-light.png`. Only Minted light was captured, and **the base PNG is identical to the head** (it already shows the new hint), so there's no true before. The tree diff gives the change.
1. **First look:** the field with *tan wei ming* and, under it, *Sen will look for TAN WEI MING.* Step 6: your name as banks print it.
2. **Reading:** the new live line is a real improvement. It shows the person exactly what Sen will match.
3. **Tapping:** the field, then *Next*.
4. **Broken:** nothing.
5. **Trust:** good once typed. Empty (journey steps 9–10): the placeholder *TAN WEI MING* in grey looks like a filled value, and tapping Next puts *Type your name as your bank prints it* in red under it. A person sees their own name in the box being called missing.
6. **E1:** calm. **E2:** n/a.
Verdict: look again. Use a placeholder that can't be mistaken for the person's own name (*e.g. TAN AH KOW*), or prefill it for real.

### accounts@month
Screens: `head/catalogue/accounts_month--minted-light.png`, `--minted-dark.png`, `base/...accounts_month--minted-light.png`.
1. **First look:** the wallet tile and *No accounts yet*. The empty state.
2. **Reading:** new line: *Your accounts appear here once first run has made them, one for each app you chose.* *First run* is our word, not the person's; they never saw a screen with that name. Base said *once Sen is reading your bank apps*, which a person understands.
3. **Tapping:** nothing to tap. §7.9 asks for one button that fills the empty state, and there's none, here or on base.
4. **Broken:** nothing. Dark matches light.
5. **Trust:** n/a.
6. **E1:** calm, maybe too empty. **E2:** n/a.
Better: it now says accounts come one per chosen app. Worse: the jargon.
Verdict: look again. Say *once you've set Sen up* (or name the setup), and add the button that goes there.

### accounts@capture-off
Screens: `head/catalogue/accounts_capture-off--minted-light.png`, `--minted-dark.png`, `base/...accounts_capture-off--minted-light.png`.
1. **First look:** *RM29,871.77 · In 4 accounts*. The same Accounts screen, in the capture-off scenario.
2. **Reading:** the same as accounts.
3. **Tapping:** the same.
4. **Broken:** nothing. GO+ row gone, card shorter. Dark matches light.
5. **Trust:** the same TNG eWallet RM7,815.40 with no *GO+* word, and the total adds up. Nothing on this screen says capture is off, though that's for Home's health bar, not here.
6. **E1:** calm. **E2:** n/a.
Verdict: look again. Same fix as accounts: *with GO+* on the TNG row.

---

## Filmstrips

Each tap's second, a frame every 50 ms, left to right, two rows. Questions 7–10 (10 is the motion of §8).

### first-run/1: *Send the code*
7. Six frames (~300 ms) with the sign-in screen unchanged, and no *Sending the code…* visible (E2), then *Type the code* swaps in.
8. It's a swap, not a slide.
9. Steady once there. Later in the strip, after the expired code, *Send a new code* goes grey and then fills navy, leaving two filled buttons stacked.
10. No forward motion between the two sign-in steps.
Verdict: look again. The pending text should paint on the first frame.

### first-run/2: *Sign in* with an expired code
7. The error *That code has expired.* and the red field arrive by frame 4 (~150 ms). Answered.
8. Caused, in place.
9. *Send a new code* flashes a grey disabled state for two frames before becoming the filled main button. Two filled buttons then compete.
10. n/a.
Verdict: look again. One main button: keep *Sign in* filled, or demote it once the code has expired.

### first-run/3: *Sign in* with 123456
7. *Signing in…* shows at frame 6 (~250 ms). The spinner and the words are good (E2).
8. Then four frames of a blank page titled *Welcome*, then *Choose your apps* fading in as a skeleton for ~0.5 s.
9. A flash of an empty *Welcome* page, and the title changes twice. It ends on the old *Suggested · Choose these 4* card with every switch off (see first-run@apps).
10. A crossfade through a blank page, not a forward slide.
Verdict: look again. Go straight from *Signing in…* to step 2, with no empty *Welcome* frame.

### first-run/4: *Choose these 4*
7. ~300 ms of nothing, then the change.
8. The switches flip, which is caused. But the card the finger was on vanishes and the whole list jumps up ~60 px under the thumb.
9. The switches pass through a pale disabled look for two frames before turning on.
10. Removing the card should close the gap with motion, as a removed row does.
Verdict: look again. Animate the card out, or (as the catalogue now shows) don't show it at all.

### first-run/5: *Next* on apps
7. Ripple on Next, then the title changes at frame 4.
8. A swap to a skeleton of *Notification access*, then content after ~4 frames.
9. Steady.
10. No forward slide between steps. A task with an end might reasonably crossfade, but §8 says forward slides in.
Verdict: look again. Settle which motion steps of first run use, and use it.

### first-run/6: *Skip for now* on access
7. Press box on *Skip for now* at frame 3.
8. *Keep Sen running* skeleton, then content.
9. Steady.
10. Same swap as step 5.
Verdict: fine.

### first-run/7: *Next* on Keep Sen running, then *Next* on blank balances
7. *Your accounts* appears as a skeleton for 8 frames (~400 ms) before the form, which needs only the chosen apps.
8. On the second Next, all four labels and hints turn red with *Type today's balance, or 0.*
9. The hint lines vanish under the errors, so the fields lose the app name exactly when the person needs it.
10. n/a.
Verdict: look again. Start with *0.00* as a value, or allow a blank as the base did, so a missing number isn't four errors at once.

### first-run/8: typing 12.34 into Ryt Bank
7. The ripple, then the digits enter from the right.
8. Ryt's error clears as it's typed.
9. Steady.
10. n/a.
Verdict: fine.

### first-run/9: *Next* with four balances
7. *Saving…* on the button at frame 3 (~100 ms). E2 is answered.
8. *Your name* fades in.
9. The greyed Next carries into the new step for a frame. Then the empty-name error (next tap).
10. A fade, as other steps.
Verdict: fine.

### first-run/10: *Next* with an empty name, then typing
7. Error at frame 3.
8. The red error sits under a box that shows *TAN WEI MING* in grey: it looks filled.
9. Typing replaces it with *tan wei ming* and *Sen will look for TAN WEI MING*. Good.
10. n/a.
Verdict: look again. Use a placeholder that doesn't look like the person's name.

### first-run/11: *Next* on name
7. *Expected payday* at frame 5 (~200 ms).
8. A swap.
9. Steady. The end of the strip taps *A day number* and the field appears.
10. Same swap as other steps.
Verdict: fine.

### first-run/12: *A day number*, then *Finish* with nothing typed
7. Ripple at frame 6.
8. The *Day of the month* field appears **before** the selection moves, then both segments flash grey for a frame, then *A day number* turns navy.
9. A flash. Then *Finish* puts *Type a day from 1 to 31.* in red under a field showing *25* (a placeholder that reads as a value).
10. §8 says the segment should move. It blinks.
Verdict: look again. A person is told to type a day while one already appears to be there.

### first-run/13: typing 28, *Finish* again
7. Same *25* error, then *28* typed; the error clears.
8. Caused.
9. Steady.
10. n/a.
Verdict: look again (same placeholder issue as step 12).

### first-run/14: *Back* from payday, then from name
7. The back arrow's ripple. The previous step shows at frame 4.
8. No slide back. Going back to *Your accounts* shows a **skeleton for ~250 ms** before the typed balances return.
9. The skeleton flash makes it look, for a moment, as if the typed balances were lost.
10. Back should reverse the forward motion (§8).
Verdict: look again. Keep the step's data so back is instant.

### first-run/15: back and forward again
7. Skeleton then balances, as in step 14. Then *Your name*.
8. Swaps.
9. The same skeleton flash.
10. As step 14.
Verdict: look again (same fix as step 14).

### first-run/16: *Next* on accounts the second time
7. *Your name* appears at frame 4, with values kept. Nothing was saved again, so no *Saving…* is needed.
8. A swap.
9. Steady.
10. As other steps.
Verdict: fine.

### first-run/17: *Finish*
7. ~450 ms with only the button slightly dimmed: no *Finishing…*, no spinner.
8. Then the tab bar slides up **over the still-visible payday form** before the form fades.
9. A doubled frame: payday's form and Home's tab bar together.
10. Neither a clean crossfade nor a slide.
Verdict: look again (the same tap is flagged as step 18).

### first-run/18: *Finish* (flagged: settle 1601 ms)
7. Frames 1–9 (~450 ms): *Finish* only dims. The label stays *Finish*: this is **E2's escape exactly** (*the button only greyed out*). *Saving…* exists on the accounts step but not here.
8. At frame 10 the tab bar and Sen's button appear on top of the payday form, which then fades to a Home skeleton.
9. The Home skeleton holds for the whole second row (~500 ms+). The person's first sight of Sen after setup is a pending button, an overlap, then grey bars.
10. No clean handover from the task to Home.
Verdict: **wrong**. *Finish* must say *Finishing…* with a spinner from the first frame, and Home should replace the form in one crossfade.

### first-run/19: Home, then the *More* tab
7. Home shows *Spent since you started RM 0.00*, *Total balance RM9,725.50* (85 + 3,200.50 + 6,400 + 40, correct). The More tab answers at frame 9.
8. Crossfade to a skeleton, then More.
9. More's right-hand values (*0*, *All settled*, *4*, *Nothing to submit*) pop in after the rows, so the right column reflows.
10. A tab crossfade, as §8 says.
Verdict: look again. Render More's rows with their values together.

### first-run/20: *Accounts* in More
7. ~11 frames (~550 ms) with More unchanged, and no visible press on the row, then the slide.
8. Accounts slides in from the right over More, which shifts and dims, as §8 asks.
9. Steady once in.
10. Right motion.
End state: *In 4 accounts RM9,725.50*, and **every account (TNG eWallet, Ryt Bank, Public Bank, GrabPay Wallet) carries a red *Not checked* badge**, a minute after the person typed each balance in by hand. To a new person this says Sen doesn't trust what they just told it.
Verdict: **wrong**. A balance typed at first run should count as that account's first check (*Checked today*), not *Not checked* in red.

### hawker/1: *Other…* on a Review row
7. ~350 ms of nothing, then the scrim.
8. The sheet rises from the bottom, under the finger's row.
9. Steady. The sheet's title is *SITI AMINAH BT YUSOF: which category?* in capitals, while the row above says *Siti Aminah Bt Yusof* (§2: title case).
10. The sheet rises, as it should.
Verdict: look again. Title-case the payee in the sheet's title.

### refund/2: choosing the payment a refund belongs to
7. Nine frames (~450 ms) unchanged.
8. Then the sheet's list **swaps to a different list** (Sate Kajang, Grabfood, Nando's…) as the sheet drops, then closes.
9. A flash of unrelated content while closing.
10. The sheet falls back, but with the wrong content in it.
Verdict: look again. Freeze the sheet's content while it closes.

### budget/1: the *Budgets* chip in Insights
7. Answered by frame 6.
8. The card pager slides sideways to Budgets. Connected.
9. The chips go blank for 2–3 frames as the row scrolls. Minor.
10. Right.
Verdict: fine.

### budget/3: tapping the Shopping budget
7. Scrim at frame 7 (~300 ms).
8. The sheet rises with *RM 300.00*, select-all, then 400.00 typed.
9. Steady.
10. Right.
Verdict: fine.

### budget/4: *Save* in the budget sheet
7. ~350 ms unchanged.
8. Then the sheet becomes an **empty *Add a budget* sheet** while it falls.
9. A flash of the wrong sheet. The list updates (*RM320.30 of RM400.00*, *At risk*) and *Shopping: RM400.00 a cycle · Undo* comes ~0.5 s later.
10. The sheet falls, but resets first.
Verdict: look again. Don't reset the sheet's state until it has closed.

### subscription/1: the *Subscriptions* chip
7. ~400 ms with nothing visible.
8. The pager travels through Budgets to Subscriptions. Connected.
9. Steady at the end.
10. Right.
Verdict: look again. The delay before anything moves is long.

### invited/3: *Send the code* for an invited person
7. *Type the code* at frame 4 (~150 ms).
8. A swap.
9. Steady.
10. As sign-in.
Verdict: fine.

### split-mine/4: *Just my part*
7. Ten frames (~500 ms) unchanged.
8. The sheet **jumps up** a few px, then falls.
9. A bounce. *Done* and *Split* show greyed for two frames, then enabled.
10. The sheet should only fall.
Verdict: look again. Remove the upward jump.

### split-theirs/3: dev panel step
7. The dev panel opens with one blank frame, then its content.
8. It closes onto the shared bill.
9. Dev-only; nobody sees it in production.
10. A sheet rise and fall.
Verdict: fine.

### split-stuck/3: *Add* in *Who had this?*
7. ~250 ms unchanged.
8. The sheet's copy changes (*Telur dadar is theirs* → *This item is theirs*) and the field empties **before** it closes.
9. A flash of an empty form. Then *Zul · Done · RM6.20* joins the list. Good.
10. The sheet falls, but resets first.
Verdict: look again. Keep the sheet as typed until it's gone.

### proposal/4: in Sen's sheet
7. No frame differs that I can see in the whole second.
8. n/a.
9. n/a.
10. n/a.
Verdict: look again. Either the change is too small to see or the tap went unanswered. The reviewer should check what this step taps.

### ask/2: *How am I doing this cycle?*
7. The chip only greys at ~500 ms. No *Sen is thinking* or pending bubble within the second (settle 3.7 s, standing).
8. The press is on the chip, nothing else.
9. Nothing moves.
10. n/a.
Verdict: look again. Show the question as sent, and a working avatar, at once.

### gap/2: *Yes, I did*
7. The chip gains a ring around frame 9.
8. Nothing opens within the second. The promised new payment for 4 Oct doesn't appear.
9. Still.
10. n/a.
Verdict: look again. Open the new payment within the second, or show that it's on its way.

### export/3: dev panel, then the export toast
7. The panel opens with a blank first frame.
8. The toast *Export isn't ready yet. Nothing was exported.* is plain and honest.
9. The toast briefly overlays the dev panel's content. Dev-only.
10. Fine.
Verdict: fine.

### members/1: *+ Invite*
7. ~400 ms unchanged.
8. The sheet rises past its resting place and then drops back.
9. An overshoot.
10. A sheet should rise and stop.
Verdict: look again. Remove the overshoot.

### members/9: Hui Min's row, then *Remove*
7. The member page slides in from the right at frame 7. Right.
8. Then the page is down at its actions, and *Remove* opens its dialog.
9. **The *Undone* toast from an earlier step sits on top of the *Remove* button** for most of the strip.
10. The slide is right.
Verdict: look again. A toast must never cover the action under it, so dismiss it on navigation.

### members/11: *Remove* in the dialog
7. The press shows, with the stale *Undone* toast still overlapping the dialog.
8. The member page jumps to its top under the closing dialog. Then *Members* slides back in from the left, without Hui Min, *1 of 20*.
9. One jump. The final toast is clear: *Removed Hui Min. Their data export goes to huimin@example.com.*
10. Back motion is right.
Verdict: look again. Same stale-toast fix as members/9.

---

## Every entry and filmstrip, worst first

| Item | Kind | Verdict | Fix first |
|---|---|---|---|
| balance-check | screen | wrong | Say *eWallet and GO+ together* under TNG eWallet, or the GO+ money books as Unaccounted |
| first-run/18 | filmstrip | wrong | *Finish* says *Finishing…* with a spinner (E2), and Home replaces the form in one crossfade |
| first-run/20 | filmstrip | wrong | Balances typed at first run count as checked, not red *Not checked* ×4 |
| accounts | screen | look again | *with GO+* on the TNG eWallet row |
| accounts@capture-off | screen | look again | Same as accounts |
| account | screen | look again | Opening date after the check and payments it precedes |
| first-run@accounts | screen | look again | App name above each field; *GO+ included* under TNG |
| first-run@apps | screen | look again | Say why four apps are on; reconcile with the journey, which still shows the suggestion |
| settings/capture/apps | screen | look again | Fake shows chosen apps on, as first run now does |
| first-run@name | screen | look again | Placeholder that isn't the person's own name; base PNG equals head |
| accounts@month | screen | look again | No *first run* jargon; add the empty state's button |
| first-run/1 | filmstrip | look again | *Sending the code…* on the first frame |
| first-run/2 | filmstrip | look again | One filled button after the expired code |
| first-run/3 | filmstrip | look again | No blank *Welcome* page between sign-in and step 2 |
| first-run/4 | filmstrip | look again | The card leaves with motion; no 60 px jump |
| first-run/5 | filmstrip | look again | One chosen motion between steps |
| first-run/7 | filmstrip | look again | Blank balances aren't four red errors |
| first-run/10 | filmstrip | look again | Placeholder doesn't look like a typed name |
| first-run/12 | filmstrip | look again | Segment moves without a grey flash; no *25* that's not a value |
| first-run/13 | filmstrip | look again | Same placeholder issue |
| first-run/14 | filmstrip | look again | Back keeps the step's data; no skeleton |
| first-run/15 | filmstrip | look again | Same as step 14 |
| first-run/17 | filmstrip | look again | No tab bar over the payday form |
| first-run/19 | filmstrip | look again | More's values render with their rows |
| hawker/1 | filmstrip | look again | Title-case the payee in the sheet's title |
| refund/2 | filmstrip | look again | Sheet content frozen while it closes |
| budget/4 | filmstrip | look again | No empty *Add a budget* flash on close |
| subscription/1 | filmstrip | look again | Less delay before the pager moves |
| split-mine/4 | filmstrip | look again | No upward jump before the sheet falls |
| split-stuck/3 | filmstrip | look again | Sheet not reset before it closes |
| proposal/4 | filmstrip | look again | No visible answer in a second |
| ask/2 | filmstrip | look again | Show the sent question and a working Sen at once |
| gap/2 | filmstrip | look again | *Yes, I did* opens the payment within the second |
| members/1 | filmstrip | look again | Invite sheet doesn't overshoot |
| members/9 | filmstrip | look again | Stale *Undone* toast covers *Remove* |
| members/11 | filmstrip | look again | Same stale toast; no jump to the top |
| more | screen | fine | Reviewer: confirm the 12 payments that left with GO+ |
| payments | screen | fine | — |
| payments@offline | screen | fine | — |
| settings/categories | screen | fine | Optional: more air above *Add a category* |
| first-run/6 | filmstrip | fine | — |
| first-run/8 | filmstrip | fine | — |
| first-run/9 | filmstrip | fine | — |
| first-run/11 | filmstrip | fine | — |
| first-run/16 | filmstrip | fine | — |
| budget/1 | filmstrip | fine | — |
| budget/3 | filmstrip | fine | — |
| invited/3 | filmstrip | fine | — |
| split-theirs/3 | filmstrip | fine | — |
| export/3 | filmstrip | fine | — |

**Counts:** 13 screens: 1 wrong, 8 look again, 4 fine. 37 filmstrips: 2 wrong, 25 look again, 10 fine. **All together: 3 wrong, 33 look again, 14 fine.**

Not judged as a screen: `reading` (unexplored in the report: no state holds it still).
