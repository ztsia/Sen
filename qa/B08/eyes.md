# B08 · eyes pass

Report: `qa-artifacts/B08_first-run-accounts/diff/index.md` (head 2aada0f1 plus uncommitted changes, against origin/main e9dc28c1).
Read first: `docs/ui/patterns.md` (§2 sizes, §3 money, §7 calm screens, §8 motion), `docs/workflow/qa.md`, `qa/escapes.md` (Asks E1–E3).
Each entry: head in Minted light, then Minted dark, then any other look whose change differs, then base. Each filmstrip: 21 frames, 50 ms apart, left to right and then the second row.

The escapes' Asks, used below:
- **E1:** is it calm or crowded?
- **E2:** does every button that waits on the server say so?
- **E3:** does the change still reach a phone that already has Sen open? (No screenshot can show this. Where a screen is data and words only, I say so.)

---

## Entries

### more

Screenshots: `head/catalogue/more--minted-light.png`, `more--minted-dark.png`, `base/catalogue/more--minted-light.png`. The other pairs change about 300 px each, the same digit.

1. **First look:** the four-row card: Payments, Shared bills, Accounts, Claims. The screen is the way into everything outside the tabs. That's right.
2. **Reading:** easy. The counts on the right are secondary and muted. *Accounts 4* reads cleanly.
3. **Tapping:** every row has a tile and a chevron, so each is obviously a door. Settings sits apart in its own card.
4. **Broken:** nothing. Dark mode is the same.
5. **Trust:** *Accounts 5 → 4* matches the Accounts screen. *Payments* went from 1,151 to 1,139. That fits GO+ folding into TNG eWallet, if the moves between the two stopped being payments. On a real phone nobody sees a before and after, so it's not alarming.
6. **E1:** calm, with one card of four rows and room around it. **E2:** none of these rows waits on the server. **E3:** words only.

Against base: only the two counts changed.
Verdict: **fine**. Nothing to fix.

### payments

Screenshots: `payments--minted-light.png`, `payments--minted-dark.png` (head and base). The images are 780×8000, shown scaled down.

1. **First look:** the search box, then the day groups with their *Spent* totals. It's the list of everything spent and received. That's right.
2. **Reading:** each row is title, then category · account, then amount. *Go+ Daily Earnings · Interest & returns · TNG eWallet* now names the merged account.
3. **Tapping:** rows and the three filter chips, all looking tappable as before.
4. **Broken:** nothing new. Dark mode is the same.
5. **Trust:** the only changes are the count (1,151 → 1,139) and GO+ interest booked to *TNG eWallet*. That agrees with *eWallet and GO+ together* elsewhere. One thing was already on main: *TAN WEI MING → Ryt Bank · Transfer* shows **+RM2,000.00 in green**. A move between my own accounts reads as money in.
6. **E1:** a long list, as patterns allows. **E2:** n/a. **E3:** data only.

Against base: GO+ → TNG eWallet on one row, and the count. Neither better nor worse.
Verdict: **fine**. (Pre-existing: an own-account transfer shown as green +money.)

### payments@offline

Screenshots: `payments_offline--minted-light.png`, `--minted-dark.png` (head). Base was compared through `payments` base; the change is the same.

1. **First look:** the offline banner (*You're offline. What you add is kept and syncs when you're back.*), then the list. Right for this state.
2. **Reading:** *Not synced yet* marks on the two top rows are readable. 1,141 payments.
3. **Tapping:** as on `payments`.
4. **Broken:** nothing.
5. **Trust:** the same GO+ → TNG eWallet row and a count lower by 12. It's consistent with `payments`.
6. **E1:** calm. **E2:** the offline banner says so. **E3:** data only.

Verdict: **fine**. Nothing to fix.

### accounts

Screenshots: `accounts--minted-light.png`, `--minted-dark.png`, `accounts--line-light.png` (the heights change differently per look), `base/accounts--minted-light.png`.

1. **First look:** the big **RM29,871.77** *In 4 accounts*, then *Check balances*. It's what I have and where. That's right.
2. **Reading:** the figure and amounts read well. The rows don't share one shape, though:
   - Ryt Bank: badge, then *Main account and pockets together* below it, wrapped onto two lines.
   - Public Bank: badge, then *MyPB* beside it.
   - TNG eWallet: badge, then *eWallet and GO+ together* below it.
   - GrabPay: badge, then *Grab* beside it.

   The second piece is sometimes the app it comes from and sometimes what the balance includes. The two kinds look identical, and TNG drops its app name to make room. Four rows, three layouts.
3. **Tapping:** *Check balances* is the one 48 px main action, rows open details, and the badges look like labels, not buttons. Good. The main action sits at the top, not in thumb reach. That was already so on main.
4. **Broken:** nothing clipped. The Ryt line wraps because the amount column is wide. In Line the rows fit on one line each.
5. **Trust:** the sums are right: 14,650.87 + 7,340.00 + 7,815.40 + 65.50 = 29,871.77, and TNG's 7,815.40 = base 262.30 + 7,553.10. The red *Not checked* badges became grey **Checked 31 Oct**. That's calmer, but:
   - 31 Oct is after every payment on Payments (the latest is 18 Oct).
   - It sits beside Ryt's *Checked 1 Oct*.
   - The sentence *The last check found RM42.10…* now reads as if the 31 Oct checks found it. The RM42.10 came from the 1 Oct Ryt check.

   An opening balance being called a *check* also needs a second look.
6. **E1:** calm overall, but the rows are busier than before. **E2:** n/a. **E3:** data and words only.

Against base: better, with one row fewer, no red alarm badges, and GO+ no longer a separate account. Worse in that the rows lost their single shape.
Verdict: **look again**. Give every row the same second line. Put what's included and where it comes from in one consistent place, for example *From MyPB* and *From Touch 'n Go · eWallet and GO+ together*. Also check whether an opening balance should read *Checked 31 Oct* next to *The last check found RM42.10*.

### accounts@capture-off

Screenshots: `accounts_capture-off--minted-light.png`, `--minted-dark.png` (head); base compared through `accounts` base.

1. **First look:** the same big total as `accounts`. Nothing tells me capture is off.
2. **Reading:** as `accounts`, with the same mixed second lines.
3. **Tapping:** as `accounts`.
4. **Broken:** nothing.
5. **Trust:** capture is off, yet the screen shows the balances, *Checked 31 Oct* and *Tracked*, exactly as if Sen were reading my notifications. These balances stop moving while capture is off, and nothing here says so. That was already so on main. This slice adds fresh *Checked* dates, which make the figures look more current.
6. **E1:** calm. **E2:** n/a. **E3:** data only.

Verdict: **look again**. Say on this screen that the balances aren't updating while capture is off. Otherwise the same row fix as `accounts`.

### accounts@month

Screenshots: `accounts_month--minted-light.png`, `--minted-dark.png`, base Minted light.

1. **First look:** the empty state: wallet tile, *No accounts here*, one line. It shows that I have no accounts. Right.
2. **Reading:** *Accounts come with Sen reading your bank notifications, which isn't switched on for you.* *For you* sounds as if someone else switched it off or decided for me. It doesn't say whether I can turn it on.
3. **Tapping:** nothing. Patterns §7.9 gives an empty state one button, and this one has none, so it's a dead end. That was already so on main.
4. **Broken:** nothing. Dark mode is fine.
5. **Trust:** more honest than base's *No accounts yet … once Sen is reading your bank apps*, which promised something that wasn't coming.
6. **E1:** calm. **E2:** n/a. **E3:** words only.

Against base: the words are truer, and the screen is still a dead end.
Verdict: **look again**. Say who controls this and give the one button: *Turn on reading notifications*, or, if it's not mine to switch, who to ask.

### account

Screenshots: `account--minted-light.png`, `--minted-dark.png`, `account--firefly-dark.png` (30k px; the diff is only the action bar moving over), base Minted light.

1. **First look:** **RM14,650.87**, *Balance now*, Ryt Bank. One account's balance and where it came from. Right.
2. **Reading:** the action bar now reads Check · Payments · **Edit** · Ask Sen. *Edit* doesn't say what it edits: the name, the opening balance, or what's included. In context it's guessable, and it's the usual word.
3. **Tapping:** the four round actions are evenly spaced and the captions fit. The facts below have no chevrons, so they don't look tappable. Good.
4. **Broken:** nothing. In Firefly dark the *Ask Sen* icon is a faint dot, which was already so on main.
5. **Trust:** these were all on main, unchanged by this slice. They're on the screen I'd be looking at:
   - *Opening balance RM3,200.00 on 31 Oct* and *Computed from your notifications since 31 Oct*.
   - *Last checked 1 Oct*, and the check *1 Oct: bank showed RM4,812.35*.
   - Recent payments from before 31 Oct.

   The timeline is impossible. A check happens a month before the opening balance, and the balance rises RM11k from the opening with no payments after it. The *RM42.10 less* badge is red, on an amount.
6. **E1:** calm, one card per kind. **E2:** n/a. **E3:** words only.

Against base: *Edit* is a clean addition.
Verdict: **look again**. The added button is fine. Fix the fixture's dates first: an opening balance after the check and the payments makes the whole card unbelievable.

### balance-check

Screenshots: `balance-check--minted-light.png`, `--minted-dark.png`, base Minted light.

1. **First look:** the first card: Ryt Bank, *Sen has RM14,650.87*, *Main account and pockets together*. It's where I type what each app shows. Right.
2. **Reading:** the new lines under *Sen has* explain what to compare. Good. For TNG, *eWallet and GO+ together* means I have to open the TNG app and add two balances in my head, then type the sum. The screen gives no other help.
3. **Tapping:** each card has a field, a *Matches* chip and *Save* at the bottom, in thumb reach. Clear.
4. **Broken:** nothing. The big grey **0.00** placeholder looks like a typed RM0.00, especially in dark, where it's almost as bright as typed text. That was already so on main.
5. **Trust:** the figures match Accounts. If I add wrong, the difference is booked as Unaccounted spending. That's real money in my reports from a mental-arithmetic slip.
6. **E1:** calmer than base, with four cards instead of five. **E2:** see the filmstrips: *Saving…* shows. **E3:** n/a.

Against base: better, with one card fewer and an explanation under the two combined accounts.
Verdict: **look again**. Help with the TNG sum, for example two fields that add up, or a line saying *Add your eWallet and GO+ balances*, so a slip doesn't book a fake Unaccounted.

### settings/capture/apps

Screenshots: `settings_capture_apps--minted-light.png`, `--minted-dark.png`, base Minted light, diff Minted light.

1. **First look:** the *Suggested* card, *Sen found 4 banks and e-wallets on this phone*, then *Choose these 4*. It's where I pick which apps Sen reads. Right.
2. **Reading:** the only change is the disabled rows (Messages, WhatsApp, Gmail, Instagram). Their *why* line is darker now and easier to read. In dark, the disabled titles are almost as bright as the enabled ones, so only the grey knob marks them.
3. **Tapping:** the enabled switches have a dark knob. The disabled ones' grey knob is still distinct from that.
4. **Broken:** nothing.
5. **Trust:** fine. The reasons (*it carries TACs*) are stated plainly.
6. **E1:** calm. **E2:** n/a. **E3:** words and shades only.

Against base: slightly better, since the reason lines read more easily.
Verdict: **fine**. Nothing to fix.

### settings/categories

Screenshots: `settings_categories--minted-light.png`, `--minted-dark.png`, base Minted light.

1. **First look:** the Categories and Rules switch, then the grid of tinted category tiles. Right.
2. **Reading:** easy. Two-line labels (*Drinks & desserts*, *Interest & returns*) wrap cleanly.
3. **Tapping:** the new full-width outline **+ Add a category** sits directly under *Income categories*. It reads as adding an income category, and nothing says whether it can add a spending one. It's at the bottom of a long scroll, which is fine for a rare action.
4. **Broken:** nothing. In dark the chosen segment (*Categories*) is barely raised, which was already so on main.
5. **Trust:** n/a.
6. **E1:** calm. **E2:** n/a. **E3:** n/a.

Against base: one useful action added.
Verdict: **look again**. Set *Add a category* clearly apart from the income group, or let it ask spending or income, so it doesn't read as adding to Income only.

### first-run@apps

Screenshots: `first-run_apps--minted-light.png`, `--minted-dark.png`, base Minted light. The base screenshot already shows the four switches on, though its tree had the suggestion card.

1. **First look:** the four bank switches, already **on**. It's step 2 of 7, where I choose the apps Sen reads.
2. **Reading:** the *Suggested · Sen found 4 banks and e-wallets on this phone · Choose these 4* card is gone. Nothing now says why these four are on. Sen has switched on reading four apps' notifications on my behalf, without a word.
3. **Tapping:** the switches and *Next*, which is in thumb reach. Clear.
4. **Broken:** nothing in the still. In the filmstrip (first-run/3 and 4) the four switches appear off and then flip on by themselves, 100–250 ms after the list shows.
5. **Trust:** reading notifications is the most sensitive permission Sen asks for. Pre-choosing is kind, but doing it silently, and visibly flipping switches after load, feels like the app deciding for me.
6. **E1:** calmer than before, with one card fewer. **E2:** n/a. **E3:** n/a.

Against base: calmer and one tap fewer. It lost the explanation.
Verdict: **look again**. Add one line saying why they're on, for example *On: the 4 banks and e-wallets Sen found on this phone*, and draw them on from the first frame instead of flipping them.

### first-run@accounts

Screenshots: `first-run_accounts--minted-light.png`, `--minted-dark.png`, `first-run_accounts--line-light.png` (Line's own change), base Minted light.

1. **First look:** **RM85.00** under *TNG eWallet*, the first of four large amounts. It's step 5 of 7, where I type today's balance in each app. Right.
2. **Reading:** *Type the balance each app shows today. Sen counts from here.* That's plain and shorter than before. The help lines are mostly consistent:
   - TNG: *From Touch 'n Go eWallet · eWallet and GO+ together*
   - Ryt: *Main account and pockets together*, with no *From*
   - Public Bank: *From MyPB by Public Bank*
   - Grab: *From Grab*

   *Leave one blank to set it later* is gone. The filmstrip (first-run/7) shows blank now gets **Type today's balance, or 0.** on every field.
3. **Tapping:** four amount fields and *Next* in thumb reach. Clear.
4. **Broken:** nothing clipped. Each help line sits about as close to the next label as to its own field, so with no cards the four blocks don't separate clearly. In the filmstrips the help line is replaced by the red error, so the explanation vanishes exactly when it's needed.
5. **Trust:** the order now matches the apps step (TNG first), and GO+ no longer needs its own guess. Good. But *or 0* invites me to type 0 for a balance I don't know. Sen then counts from a false start, and the first balance check books the whole real balance as Unaccounted.
6. **E1:** calm enough, four big numbers and nothing else. **E2:** *Next* shows *Saving…* (first-run/9). **E3:** n/a.

Against base: better, with one field fewer, apps-order and explained combinations. Worse in that blank is no longer allowed and nothing offers *later*.
Verdict: **look again**. Don't push people towards a made-up 0. Bring back *leave it blank to set it later*, or say what 0 means. Keep the help line visible under the error.

### first-run@name

Screenshot: `head/catalogue/first-run_name--minted-light.png`. Only this one exists: the report lists a tree change and no pixel pairs, so there's no dark shot or base to open.

1. **First look:** the field holding *tan wei ming*, and under it **Sen will look for TAN WEI MING.** It's step 6 of 7, which tells Sen my name as banks print it.
2. **Reading:** the intro explains why in one sentence. The live preview in capitals is exactly the reassurance needed.
3. **Tapping:** the field and *Next* at the bottom.
4. **Broken:** nothing.
5. **Trust:** good. I can see what Sen will match before I commit. *You can add other spellings later in Settings* is gone, which is a small loss.
6. **E1:** calm. **E2:** see first-run/11: the move to payday is instant. **E3:** n/a.

Verdict: **fine**. Nothing to fix.

---

## Filmstrips

Questions 7–10 (10: the right motion, about 200 ms, no blank or see-through frame, money never counting).

### first-run/1: *Send the code*
7. The code screen is there by frame 2 (100 ms).
8. A swap within the same step, no motion. Acceptable for a step change.
9. Steady. The code fills at frame 15, typed by the test.
10. No motion to judge, and no blank frame.
Verdict: **fine**.

### first-run/2: *Sign in* with an expired code
7. *That code has expired.* and the red field appear at frame 2.
8. The ripple spreads from the button, so it's clearly caused by the tap.
9. *Send a new code* turns into a filled navy button and flashes grey at frame 6. After that, *Sign in* and *Send a new code* are two equal filled buttons, one above the other.
10. Fine.
Verdict: **look again**. Make one of the two buttons secondary after the error.

### first-run/3: *Sign in* with the right code
7. Frame 2: *Welcome* with an empty page, then frame 3 entirely blank.
8. A swap.
9. Blank for 100 ms, then a list skeleton for about 650 ms, then the apps list appears with the four bank switches **off** and flips them **on** over frames 17–19.
10. A blank frame, and switches animating with nobody touching them.
Verdict: **look again**. No blank frame, and the pre-chosen switches should be on from the first frame.

### first-run/4: on *Choose your apps*
7. Frames 0–1 skeleton, frame 2 the list, frames 3–6 the four switches sliding on by themselves. Nothing that answers a tap of mine is visible.
8. The changes aren't caused by me: they're the load finishing.
9. Switches flip. The screen then sits still until frame 20 (*Notification access* skeleton).
10. A switch moving on its own reads as the app acting for me.
Verdict: **look again**. The same fix as first-run/3.

### first-run/5: *Next* on apps
7. *Notification access* skeleton at frame 2 (100 ms), with the ripple on *Next*.
8. A swap, no slide. It's a step within a task, so acceptable.
9. Skeleton for about 300 ms, then content at frame 8. Steady. *Open settings* and *Next* are both filled navy, which was already so on main.
10. Fine.
Verdict: **fine**.

### first-run/6: *Skip for now* on notification access
7. *Keep Sen running* skeleton at frame 2, and *Skip for now* shows its press.
8. A swap.
9. Content at frame 7 (350 ms). Steady.
10. Fine.
Verdict: **fine**.

### first-run/7: *Skip for now* → *Your accounts* (flagged: settle 187 ms vs 69 ms on main)
7. Skeleton at frame 1.
8. A swap.
9. Skeleton for about 350 ms before the fields appear. On main the step was immediate. Then the test taps *Next* with the fields blank: **all four labels and fields go red at once** with *Type today's balance, or 0.*, replacing every help line. The first typed amount (12.34) shows in red for one frame.
10. No motion problem. The red wall is the problem.
Verdict: **look again**. One calm message for the empty fields, help lines kept, no skeleton for a screen with no server data in it.

### first-run/8: typing the balances
7. The errors show again at frame 1.
8. Clearly caused.
9. Each amount (85.00, 6,400.00) **appears in red** while it's typed, and only turns dark a few frames later. Money shown red while I'm typing it reads like an error or a debt.
10. Money doesn't count. The colour flashes.
Verdict: **look again**. Clear a field's error on the first keystroke so typed amounts never show red.

### first-run/9: *Next* with the four balances
7. **Saving…** with a spinner at frame 2 (E2 satisfied).
8. The press spreads from the button.
9. About 200 ms of *Saving…*, then *Your name*. Steady.
10. Fine.
Verdict: **fine**.

### first-run/10: *Next* on an empty name
7. *Type your name as your bank prints it.* at frame 1.
8. Caused.
9. Steady. Typing shows *Sen will look for TAN WEI MING.* live.
10. Fine.
Verdict: **fine**.

### first-run/11: *Next* with a name
7. *Expected payday* at frame 2.
8. A swap.
9. Steady. The *A day number* segment crossfades over 3 frames.
10. Fine.
Verdict: **fine**.

### first-run/12: *A day number*
7. The segment changes at frame 2.
8. From the tapped segment.
9. *Day of the month* appears below without pushing anything. Steady.
10. Fine.
Verdict: **fine**.

### first-run/13: *Finish* with no day
7. The error appears at frame 3 (150 ms), a little slow.
8. Caused.
9. *28* shows in red for one frame as it's typed. Otherwise steady.
10. Fine.
Verdict: **fine** (the same red-typing flash as first-run/8, smaller).

### first-run/14: back from payday, back from name
7. *Your name* at frame 1, then *Your accounts*.
8. Swaps, no slide back.
9. Going back to accounts shows a **skeleton for about 300 ms** before the amounts I typed reappear. The draft is kept, which is good.
10. Back should reverse the forward motion. Here it's a swap plus a skeleton flash.
Verdict: **look again**. No skeleton on returning to a step whose values are already on the phone.

### first-run/15: back to accounts
7. Skeleton at frame 2.
8. A swap.
9. Skeleton for about 150 ms, then the typed amounts. The same flash as first-run/14.
10. As above.
Verdict: **look again**. The same fix.

### first-run/16: *Next* from accounts
7. *Your name* at frame 2.
8. A swap.
9. Steady, and *28* is kept on payday.
10. Fine.
Verdict: **fine**.

### first-run/17: *Next* from name, then *Finish*
7. *Finishing…* with a spinner shows at once on *Finish*.
8. Caused.
9. The tab bar and Sen's button **appear under the payday screen** before it leaves. Then a frame where payday and Home's skeleton show **through each other**.
10. A see-through frame.
Verdict: **look again**. Swap to Home cleanly, then bring the tab bar in.

### first-run/18: *Finish* → Home (flagged: settle 1354 ms)
7. *Finishing…* at frame 2.
8. Caused.
9. In order:
   - the see-through crossfade (frames 6–7)
   - a **list-shaped skeleton** for about 650 ms
   - a **card-shaped Home skeleton** for about 300 ms
   - one **blank Home** with only the wordmark
   - the content at about 1.4 s
   - the wordmark's font visibly changing in the last frame

   Home itself shows *Spent since you started RM0.00* and *Total balance RM9,725.50* (85 + 3,200.50 + 6,400 + 40, correct).
10. Two skeletons, a blank frame and a font swap.
Verdict: **look again**. One skeleton shaped like Home, no blank frame between it and the content.

### first-run/19: the *More* tab
7. The tab indicator moves, and the screen crossfades from frame 7 (350 ms).
8. The crossfade is the right motion for a tab.
9. A generic list skeleton for more than 700 ms, not shaped like More.
10. The crossfade is right. The wait is long.
Verdict: **look again**. A More-shaped skeleton, or none: its four counts are already known.

### first-run/20: *Accounts* row on More (flagged: settle 1308 ms)
7. Nothing visible for about 300 ms, then the forward slide (More shifts left).
8. The slide is the right motion.
9. A generic list skeleton for about 600 ms. Accounts arrives at about 1.1 s: TNG eWallet first, *Checked 18 Oct* on all four, *In 4 accounts RM9,725.50* (consistent with what I typed).
10. The right motion, late.
Verdict: **look again**. Answer the tap within 100 ms, and shape the skeleton like Accounts (figure, button, card).

### balance-check/1: *Accounts* on More (flagged: settle 1141 ms)
7. Frames 1–6 identical. No press is visible at this scale for about 300 ms.
8. Then the forward slide.
9. A generic skeleton to the end of the second.
10. The right motion, but the first 300 ms look ignored.
Verdict: **look again**. The same fix as first-run/20.

### balance-check/2: *Check balances*
7. The tab bar disappears at frame 4, and the slide starts at frame 5.
8. The slide is right.
9. A skeleton, then **three frames with only the title and intro** (blank below), then the cards at about 850 ms. *Save* draws grey for one frame, then navy.
10. A blank stretch between the skeleton and the content.
Verdict: **look again**. No blank between the skeleton and the cards.

### balance-check/3: typing Ryt, *Matches* on TNG
7. Typed digits show at once, and *RM50.00 less than Sen has* appears beside them.
8. Caused.
9. The page **jumps** in one frame to the TNG card, where *No difference* appears. The footer line *Type what a bank app shows, or tap Matches, for at least one account.* stays above *Save* even after two accounts are filled. It reads like an unmet requirement. The difference badge is red, on an amount.
10. A scroll jump, no easing.
Verdict: **look again**. Remove the footer requirement once one account is filled.

### balance-check/4: *Matches* on TNG
7. *Matches* darkens at frame 2.
8. Caused.
9. Steady.
10. Fine.
Verdict: **fine**.

### balance-check/5: *Save* (flagged: first change 112 ms)
7. **Saving…** with a spinner at frame 3 (150 ms), just past the 100 ms limit.
8. Caused.
9. While saving, the page **jumps back to the top** (frame 10). The tab bar appears under Balance check before it leaves. Then the slide back to Accounts with an *Undo* toast. In the last frame, the total and Ryt's balance still look like **RM29,871.77 / RM14,650.87**, the figures from before the RM50 difference was booked. At this scale I can't be sure. If true, the save looks as if it changed nothing.
10. The back slide is right. The jump and the early tab bar aren't.
Verdict: **look again**. Check that Accounts shows the new balance as it arrives. Then remove the jump to the top and the early tab bar.

### split-mine/9: *I've ticked everything I had* (flagged: settle 389 ms vs 174 ms)
7. The ripple at frames 1–4. The button becomes *You're done ✓ · Still ticking* at frame 5 (250 ms).
8. Caused, in place.
9. The toast **repeats** *You're done* (already visible on screen) and **covers the line under it** (*This link is open…*).
10. In-place change, fine. The toast is unnecessary (patterns: a toast only when the change isn't visible).
Verdict: **look again**. Drop the toast here, or keep it clear of the explanation line.

---

## Summary

| Item | Verdict | First fix |
|---|---|---|
| first-run@accounts | look again | Blank is refused with *or 0*: bring back *set it later*, keep help lines under errors |
| first-run@apps | look again | Say why four apps are already on; draw them on from the first frame |
| accounts | look again | One consistent second line per row; *Checked 31 Oct* beside *the last check found RM42.10* |
| accounts@capture-off | look again | Say the balances aren't updating while capture is off |
| accounts@month | look again | Empty state has no button and *isn't switched on for you* names no one |
| account | look again | Fixture timeline: opening 31 Oct after the 1 Oct check and the payments (pre-existing) |
| balance-check | look again | TNG asks me to add eWallet + GO+ in my head |
| settings/categories | look again | *Add a category* reads as income-only |
| more | fine | |
| payments | fine | (pre-existing: own transfer shown as green +RM2,000.00) |
| payments@offline | fine | |
| settings/capture/apps | fine | |
| first-run@name | fine | |
| film first-run/7 (flagged) | look again | All four fields and labels go red at once; skeleton where main had none |
| film first-run/8 | look again | Typed amounts show red |
| film first-run/18 (flagged) | look again | Two skeletons, a blank frame and a font swap before Home |
| film first-run/20 (flagged) | look again | 300 ms still, generic skeleton, Accounts at about 1.1 s |
| film balance-check/1 (flagged) | look again | 300 ms still before the slide |
| film balance-check/5 (flagged) | look again | Accounts may still show the old balance; jump to top while saving |
| film split-mine/9 (flagged) | look again | Toast repeats *You're done* and covers a line |
| film first-run/3 | look again | Blank frame; switches flip on by themselves |
| film first-run/4 | look again | Switches flip on by themselves |
| film first-run/17 | look again | See-through frame; tab bar arrives early |
| film first-run/19 | look again | Generic skeleton for more than 700 ms on More |
| film balance-check/2 | look again | Blank between skeleton and cards |
| film balance-check/3 | look again | *For at least one account* stays after filling |
| film first-run/14 | look again | Skeleton when going back to a filled step |
| film first-run/15 | look again | The same |
| film first-run/2 | look again | Two equal filled buttons after the error |
| film first-run/1 | fine | |
| film first-run/5 | fine | |
| film first-run/6 | fine | |
| film first-run/9 | fine | |
| film first-run/10 | fine | |
| film first-run/11 | fine | |
| film first-run/12 | fine | |
| film first-run/13 | fine | |
| film first-run/16 | fine | |
| film balance-check/4 | fine | |

Count: **wrong 0 · look again 23 · fine 16** (13 entries: 8 look again, 5 fine; 26 filmstrips: 15 look again, 11 fine).
