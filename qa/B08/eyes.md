# B08 eyes pass

Report: `qa-artifacts/B08_first-run-accounts/diff/index.md` (head 932cc2ce plus uncommitted changes, against origin/main e9dc28c1).
Read first: `docs/ui/patterns.md` §2, §3, §7 and §8, `docs/workflow/qa.md` (Minted light first, then dark; question 5 is money; question 10 is motion), and `qa/escapes.md` (Asks E1, E2 and E3).
Thirteen entries and 32 filmstrips. Every entry's head was judged in Minted light, then Minted dark, before its base was opened. Other looks were opened where their change differed from Minted's (`accounts` Instrument light, `account` Firefly dark, `first-run@accounts` Line light and dark).
Filmstrips opened: every flagged step, plus every step of the journeys this slice changed: `first-run` 1–20, `balance-check` 1–5, the D148 journey 1–4 and the taken-category journey 1–2. `members…/9` was opened because it's flagged.

The Asks from `qa/escapes.md`, answered on every screen:
- **E1:** calm or crowded? One thing first, room between groups, headings bigger than what they head, facts and actions looking different?
- **E2:** does every button that waits on the server say so?
- **E3:** does the change still reach a phone that already has Sen open? No screenshot shows E3. Nothing in this slice looks different on that front, so it's answered once here and not repeated.

---

## Entries

### more
Head `more--minted-light.png`, `more--minted-dark.png`; base `more--minted-light.png`.

1. **First look:** the card of four destinations, then Settings. That's right for a hub. It's where you go for payments, bills, accounts and claims.
2. **Reading:** clear. The right-hand values (*1,139*, *3 open*, *4*, *2 to submit*) are short and say each row's state.
3. **Tapping:** every row has a tile and a chevron, so all of them look tappable, and nothing else does.
4. **Broken:** nothing.
5. **Trust:** *Accounts 4* matches the four tracked accounts on Accounts. *Payments* went from 1,151 to 1,139. Twelve fewer payments isn't explained on this screen, but merging GO+ into TNG eWallet would make moves between those two pockets internal. Nothing alarming.
6. **E1:** calm. **E2:** no server buttons.

Base: only the two counts differ.
Verdict: fine. Nothing to fix.

### payments
Head `payments--minted-light.png`, `payments--minted-dark.png`; base `payments--minted-light.png`. The PNG is 780×8000, so Read showed it shrunk to a quarter. I judged it at that size: the rows, amounts and secondary lines could be read, but not finely.

1. **First look:** the search box and filter chips, then the first day header, *Sun, 18 Oct, Spent RM197.63*. It's the list of every payment.
2. **Reading:** each row is merchant, category · account, amount. The changed row now reads *Go+ Daily Earnings · Interest & returns · TNG eWallet*.
3. **Tapping:** whole rows and chips, as before.
4. **Broken:** nothing visible at this scale.
5. **Trust:** money in is green with a `+` (*+RM4.80*), as everywhere else. The count is now *1,139 payments*, matching More. GO+ earnings booked to *TNG eWallet* fits Accounts' *eWallet and GO+ together*.
6. **E1:** a long list, as patterns intend. **E2:** n/a.

Base: *· GO+* became *· TNG eWallet*, and 1,151 became 1,139.
Verdict: fine. Nothing to fix.

### accounts
Head `accounts--minted-light.png`, `accounts--minted-dark.png`, `accounts--instrument-light.png`; base `accounts--minted-light.png`.

1. **First look:** the figure *RM29,871.77* under *In 4 accounts*, then *Check balances*. That's right: it's what you have, and the way to check it.
2. **Reading:** each tracked row now stacks three things under the name: a badge (*Checked 31 Oct*), then *From <app>*, then for two of them what the balance covers. Ryt Bank's row wraps to three lines: *From Ryt Bank · / Main account and / pockets together*. *From Ryt Bank* under the title *Ryt Bank* says the name twice. Row heights now go 4, 3, 4, 3 lines, so the card reads uneven. *From MyPB* is clear only if you know MyPB is the app.
3. **Tapping:** rows open the account, and *Check balances* is the one main action. Maybank's *No balance* row looks like information, which is right.
4. **Broken:** nothing clipped. The tall Ryt row is the only awkward one.
5. **Trust:** the sums are right: 14,650.87 + 7,340.00 + 7,815.40 + 65.50 = 29,871.77, and TNG's 7,815.40 is exactly main's TNG 262.30 plus GO+ 7,553.10. But three rows say *Checked 31 Oct*, which reads as if a check was done that day and found nothing, while the line above says *The last check found RM42.10…*. That RM42.10 was Ryt's check on 1 Oct, so which check is "the last" is unclear. A balance typed at first run isn't the same as a check against the bank, and the badge makes it look like one. 31 Oct is also later than every payment in the scenario (the latest is 18 Oct).
6. **E1:** calmer than main: the four red *Not checked* badges are gone. **E2:** n/a.

Base: five rows with red *Not checked* badges became four grey *Checked* badges with source lines. Calmer, but wordier.
Verdict: look again. First fix: don't call a first-run balance *Checked*. Say what it is (e.g. *Since 31 Oct*), so it doesn't argue with *The last check found RM42.10*. Second: drop *From <name>* when the app's name repeats the account's name, so Ryt's row fits two lines.

### account
Head `account--minted-light.png`, `account--minted-dark.png`, `account--firefly-dark.png` and its diff; base `account--minted-light.png`.

1. **First look:** the header card with *RM14,650.87, Balance now*. Right. It's one account's balance and where it came from.
2. **Reading:** clear. *Computed from your notifications since 31 Oct. Not the bank's own figure.* is honest and plain.
3. **Tapping:** the ActionBar now has four round buttons, *Check · Payments · Edit · Ask Sen*, evenly spaced, captions under each. *Edit* doesn't say what it edits (the opening balance? the name?). That's fine in an ActionBar, but it's the new thing here.
4. **Broken:** nothing. Firefly dark's 30k-pixel diff is the avatar's own animation plus the buttons moving over to fit four.
5. **Trust:** the dates don't line up. *Opening balance RM3,200.00 on 31 Oct* and *since 31 Oct*, but *Last checked 1 Oct*, a check row *1 Oct: bank showed RM4,812.35*, and *Recent payments* from 17–18 Oct. An opening balance dated after the payments listed under it, and after its own check, makes you wonder which payments the balance counts. This is the same on main, but *Edit* now sits beside it, and editing is presumably how you'd fix it. *RM42.10 less* is in the warning tint, with words.
6. **E1:** calm, one figure. **E2:** n/a.

Base: three actions became four; nothing else.
Verdict: look again. First fix: the scenario's dates (opening balance 31 Oct, check 1 Oct, payments 18 Oct) should read in order, or the payments before the opening balance shouldn't show as counted. Then *Edit* would make sense where it is.

### balance-check
Head `balance-check--minted-light.png`, `balance-check--minted-dark.png`.

1. **First look:** the intro line, then Ryt Bank's card. It's for typing each app's balance or tapping *Matches*.
2. **Reading:** good. The new lines *Main account and pockets together* and *eWallet and GO+ together* sit right under *Sen has…*, which is exactly where you need to know which number to type.
3. **Tapping:** *Matches* chips and one *Save* at the bottom, in thumb reach.
4. **Broken:** nothing.
5. **Trust:** each *Sen has* matches Accounts (14,650.87 / 7,340.00 / 7,815.40 / 65.50). The big grey *RM 0.00* in each empty field could read as "the bank shows 0", but that's the standing amount field.
6. **E1:** four cards, now one fewer. Calm enough. **E2:** *Saving…* shows in the filmstrip.

Base: five cards became four. Better.
Verdict: fine. Nothing to fix.

### settings/capture/apps
Head `settings_capture_apps--minted-light.png`, `--minted-dark.png`; base `--minted-light.png` and the diff.

1. **First look:** the *Suggested: Sen found 4 banks and e-wallets on this phone · Choose these 4* card. For Wei Ming, who already has four accounts fed by these apps, it shouldn't be the first thing.
2. **Reading:** clear. Each disabled row says why (*Your SMS app can't be chosen: it carries TACs*).
3. **Tapping:** switches and the whole rows. The disabled ones look disabled.
4. **Broken:** nothing.
5. **Trust:** every switch is off, including Touch 'n Go, Ryt, MyPB and Grab, while Accounts says *From Ryt Bank*, *From MyPB*, *From Grab*. Someone with four accounts fed by these apps would read this as Sen not listening to anything. Main is the same, but this slice ties each account to its app, so the contradiction now shows on two screens.
6. **E1:** fine. **E2:** n/a.

Base: only the disabled rows' knobs and lines are a shade darker.
Verdict: look again. First fix: for an established person, show the apps that feed accounts as on, without the *Suggested* card (the scenario or catalogue state, if that's where it comes from).

### settings/categories
Head `settings_categories--minted-light.png`, `--minted-dark.png`.

1. **First look:** the *Categories · Rules* segmented control, then the new *+ Add a category* outline button, then the grid. You see and change your categories here.
2. **Reading:** fine. Tiles with icon and name, and both section labels.
3. **Tapping:** the add button is outlined and full width, so it reads as secondary. It's at the top, out of thumb reach, but it's a rare action.
4. **Broken:** nothing.
5. **Trust:** n/a (no money).
6. **E1:** calm. A full-width bar above a grid of tiles is a bit heavy. A *+* tile at the end of the grid would follow "show visual choices visually", but the bar is clear. **E2:** n/a.

Verdict: fine. Nothing to fix.

### payments@offline
Head `payments_offline--minted-light.png`, `--minted-dark.png` (shrunk to a quarter, like `payments`).

1. **First look:** the offline banner, then the list. Right.
2. **Reading:** *Not synced yet* marks on Kuih and Teh tarik. The GO+ row now reads *TNG eWallet*.
3. **Tapping:** as `payments`.
4. **Broken:** nothing at this scale.
5. **Trust:** *1,141 payments*: 1,139 plus the two unsynced. Consistent.
6. **E1:** fine. **E2:** n/a.

Verdict: fine. Nothing to fix.

### first-run@apps
Head `first-run_apps--minted-light.png`, `--minted-dark.png`; base `--minted-light.png`.

1. **First look:** the four switched-on rows under *Banks and e-wallets*. Step 2 of 7: choose which apps Sen reads.
2. **Reading:** clear.
3. **Tapping:** switches, rows and *Next* at the bottom. All obvious.
4. **Broken:** nothing in the still. But the filmstrips (`first-run/3`, `/4`) show the *Suggested* card on this screen, flashing in and then vanishing as the list jumps up. The catalogue still and the journey disagree.
5. **Trust:** the line says *Sen reads notifications only from the apps you choose here*, but four apps are already chosen, and nothing says Sen did it or why. For a screen about privacy, that line matters.
6. **E1:** calm. **E2:** n/a.

Base: the pixels already showed four on (the base screenshot seems to have been taken after *Choose these 4*). Only the disabled knobs changed.
Verdict: look again. First fix: one line saying these four were turned on because Sen found them on this phone, and drop the *Suggested* card that flashes before they switch on.

### first-run@accounts
Head `first-run_accounts--minted-light.png`, `--minted-dark.png`, `--line-light.png`, `--line-dark.png`; base `--minted-light.png`.

1. **First look:** four large typed amounts, TNG eWallet's *RM 85.00* first. Step 5: type each app's balance today. With four figure-sized amounts, no single one leads, but they're inputs, so that's acceptable.
2. **Reading:** the intro is shorter and better (*Type the balance each app shows today. Sen counts from here.*). The hints under each field help: *From Touch 'n Go eWallet · eWallet and GO+ together*. But Ryt's hint is only *Main account and pockets together*, with no *From Ryt Bank*, unlike the other three. The labels (*TNG eWallet*) are no bigger than the hints.
3. **Tapping:** fields and *Next*, in thumb reach.
4. **Broken:** nothing. Line fits the intro on one line, with the same layout.
5. **Trust:** *Leave one blank to set it later* is gone. The filmstrip shows that a blank field is now an error: *Type today's balance, or 0.* A person who doesn't know their Public Bank balance offhand is pushed to type 0. Sen would then count from a balance that isn't true, and the first balance check would book the whole gap as Unaccounted. The filmstrip also shows typed amounts drawn in red while the error stands (*RM 12.34* in red). Patterns §2 says red is never for an amount.
6. **E1:** better than main: one field fewer, and GO+ folded in. **E2:** *Saving…* on Next (filmstrip `first-run/9`).

Base: five fields became four, with hints, and the escape line went.
Verdict: look again. First fix: give a way to leave one for later (or say what 0 will mean) instead of *or 0*. Then keep the typed amount in the text colour while the error shows.

### first-run@name
Head `first-run_name--minted-light.png`; base `--minted-light.png`. Only Minted light was captured. The pixels are identical; only the tree's filled-in state differs.

1. **First look:** the name field. Step 6: your name as banks print it.
2. **Reading:** *Sen will look for TAN WEI MING.* echoes what was typed, in capitals, which is reassuring.
3. **Tapping:** field and *Next*.
4. **Broken:** nothing.
5. **Trust:** good. You see exactly what Sen will match.
6. **E1:** calm. **E2:** n/a.

Verdict: fine. Nothing to fix.

### accounts@month
Head `accounts_month--minted-light.png`, `--minted-dark.png`; base `--minted-light.png`.

1. **First look:** the wallet tile and *No accounts here*. It explains why Accounts is empty.
2. **Reading:** *Accounts come with Sen reading your bank notifications, which isn't switched on for you.* *For you* reads as if someone else switched it off, or as a restriction. It doesn't say whether you can turn it on.
3. **Tapping:** nothing to tap. Patterns' EmptyState has one button. If capture can be set up, there's no way to get there from here. If it can't, the line should say why.
4. **Broken:** nothing.
5. **Trust:** no figures. The wording is a little cold.
6. **E1:** calm. **E2:** n/a.

Base: *No accounts yet · …once Sen is reading your bank apps.* The new line is more honest, but it reads as a dead end.
Verdict: look again. First fix: say it as the person's situation, with the one action (set up capture, or why it isn't offered).

### accounts@capture-off
Head `accounts_capture-off--minted-light.png`, `--minted-dark.png`.

1. **First look:** the warning bar *Capture may be off. No payment notifications since Fri, 16 Oct, 17:40.* with *Fix*. That's right when capture is down: it comes before the total.
2. **Reading:** clear and specific, with a date and time.
3. **Tapping:** *Fix* is a filled pill in the warning colour, plainly the thing to tap. *Check balances* is still the main action.
4. **Broken:** nothing.
5. **Trust:** same rows and sums as `accounts`, with the same *Checked 31 Oct* versus *the last check found RM42.10* problem. Here it also sits under *no notifications since 16 Oct*, which makes three accounts "checked" two weeks after capture stopped look more odd.
6. **E1:** the bar adds weight, but it earns it. **E2:** n/a.

Verdict: look again. First fix: as `accounts` (the *Checked* badge for first-run balances).

---

## Filmstrips

Questions 7–9, plus 10 (the right motion) from `docs/workflow/qa.md`. Frames are 50 ms apart. "Frame n" counts from the tap.

### first-run/1: Send the code
7. Nothing visible for about 4 frames, then *Type the code* at about 200 ms. No *Sending the code…* was seen, because the reply came first.
8. The screen swaps in place within the step pager, which is fine for a step.
9. Steady. At the end, the test's expired code turns the field red.
10. A step change, no slide expected.
Verdict: fine. Nothing to fix.

### first-run/2: Sign in with an expired code
7. *That code has expired* appears at frame 3 (about 150 ms).
8. The ripple on *Sign in* only spreads in frames 4–7, after the error is already there, so the press looks like it trails the answer.
9. *Send a new code* then turns into a second filled dark button under *Sign in*, giving two main actions. (This is the same on main.)
10. n/a.
Verdict: look again. First fix: only one filled button after the error. (Not this slice.)

### first-run/3: Sign in → Choose your apps
7. *Signing in…* with a spinner at frame 1. Good (E2).
8. Frame 3 is blank white, then a skeleton holds about 450 ms.
9. The content arrives with the *Suggested · Choose these 4* card and every switch off. About 150 ms later the card vanishes and the whole list jumps up about 60 px as the switches start turning on. A blank frame, a skeleton, then a card that shows and leaves.
10. The blank frame breaks "no blank frame".
Verdict: look again. First fix: open *Choose your apps* already in its final state (four on, no card). No flash, no jump.

### first-run/4: Choose these 4 (or its replay)
7. About 100 ms still, then the card is gone at frame 3.
8. The switches turning on (frames 3–8) look caused by the tap, but the list also jumps up under the finger at the same moment.
9. Jumps once, about 60 px. Then *Next* leads to a *Notification access* skeleton.
10. A removed block should close the gap with motion, not jump.
Verdict: look again. First fix: as `/3`. If the card stays, let the list close up over 200 ms.

### first-run/5: Next → Notification access
7. The skeleton comes at frame 2.
8. The press ripple shows on the new screen's *Next* (frames 5–8), which is a button the finger never touched.
9. The skeleton holds about 350 ms, then the content swaps in.
10. A step change.
Verdict: look again. First fix: the ripple should stay on the old button and not carry onto the next screen's. (Not this slice.)

### first-run/6: Next → Keep Sen running
7. The skeleton comes at frame 3.
8. Same ripple carry-over, this time on the new *Skip for now*.
9. The skeleton holds about 250 ms.
10. A step change.
Verdict: look again. Same fix as `/5`.

### first-run/7: Next → Your accounts, then Next with empty fields
7. The skeleton comes at frame 2, and the fields at frame 7, empty, just *RM*, with no placeholder.
8. The second tap on *Next* turns all four labels, fields and lines red at once.
9. Four red errors at once is a wall of red. When *12.34* is typed into Ryt, the digits are red until the field validates.
10. n/a.
Verdict: look again. First fix: typed amounts in the text colour, never red (patterns §2–3). Also, one line at *Next* would do instead of four red fields.

### first-run/8: typing balances
7. The error states are already showing. Typing answers each key within a frame.
8. Digits enter from the right (*12.34*, then *85.00*) as patterns ask.
9. The amount stays red until the field validates, then flips dark.
10. No counting, which is right.
Verdict: look again. Same fix as `/7`.

### first-run/9: Next with balances → Your name
7. *Saving…* with a spinner at frame 2. Good (E2).
8. *Your name* swaps in at frame 3.
9. Steady. The later empty-name error is red with words.
10. A step change.
Verdict: fine. Nothing to fix.

### first-run/10: Next with an empty name
7. The error comes at frame 1.
8. The ripple follows at frames 2–5.
9. Steady. Typing shows *Sen will look for TAN WEI MING.*
10. n/a.
Verdict: fine. Nothing to fix.

### first-run/11: Next → Expected payday, then A day number
7. Payday comes at frame 2.
8. Tapping *A day number* brings the *Day of the month* field at once.
9. For about 100 ms (frames 14–15), both segments are washed out, as if disabled, before the choice settles. (This is the same on main.)
10. A Segmented control should just move its raised option.
Verdict: look again. First fix: the Segmented control shouldn't flash both options faded. (Not this slice.)

### first-run/12: A day number, then Finish empty
7. Same washed-out flash at frames 4–5. The *Type a day from 1 to 31* error is quick.
8. It's caused by the tap.
9. The flash, as `/11`.
10. As `/11`.
Verdict: look again. Same fix as `/11`.

### first-run/13: typing 28
7. Instant.
8. The error clears as you type.
9. Steady.
10. n/a.
Verdict: fine. Nothing to fix.

### first-run/14: Back, then Back again → Your accounts
7. *Your name* comes at frame 1.
8. Back to *Your accounts* shows a skeleton for about 200 ms before the typed balances return. They are kept, which is good.
9. The skeleton flash is for data that was just typed.
10. No reverse slide. It's a step pager, but back should feel like back.
Verdict: look again. First fix: no skeleton when going back to a step whose values are already in memory.

### first-run/15: Back → Your accounts, Next → Your name
7. Answered at frame 2, by a skeleton.
8. The same skeleton flash as `/14`, then *Next* to *Your name* swaps at once.
9. The skeleton flash.
10. As `/14`.
Verdict: look again. Same fix as `/14`.

### first-run/16: Next → Payday, Finish
7. Instant step change, then *Finishing…* on *Finish*. Good (E2).
8. Caused by the tap.
9. Steady.
10. n/a.
Verdict: fine. Nothing to fix.

### first-run/17: Finish (with a pause before)
7. *Finishing…* holds about 400 ms.
8. Then the tab bar appears under the payday screen at frame 18, before the screen itself changes.
9. As `/18`: the tab bar pops in first.
10. As `/18`.
Verdict: look again. Same fix as `/18`.

### first-run/18: Finish → Home (flagged, settle 1,382 ms)
7. The pressed state shows at frame 1 and *Finishing…* with a spinner at frame 2. It's clearly answered.
8. After about 450 ms of *Finishing…*, the tab bar pops in under the still-visible payday screen (frame 10). Then payday crossfades out over a see-through mix (frames 12–16).
9. It lands on Home's skeleton (frames 17–20), not on Home. The tab bar arriving before the screen is a jump.
10. Leaving a task should be one clean change. This is a tab bar pop, then a fade into a skeleton. No figure is seen within the second.
Verdict: look again. First fix: bring in Home and its tab bar together as one change. Better still, with Home's data ready, since first run just wrote it.

### first-run/19: More tab from Home
7. The tab's highlight shows at once.
8. Home crossfades into More. That's the right motion for a tab. Home shows *Total balance RM9,725.50* (= 85.00 + 3,200.50 + 6,400.00 + 40.00, right).
9. More passes through a skeleton for about 250 ms.
10. Right motion: a crossfade.
Verdict: fine. Nothing to fix.

### first-run/20: Accounts row on More (flagged, settle 1,314 ms)
7. Nothing visible for about 400 ms (frames 0–7). At this size I couldn't see a ripple on the row.
8. Then the screen slides in from the right, which is the right motion.
9. A skeleton holds about 550 ms, then the content pops in. *RM9,725.50 · In 4 accounts* matches Home.
10. Right direction, but most of the second is skeleton.
Verdict: look again. First fix: Accounts' data is already known (More shows *4*), so open on content, or at least show the row's press at once.

### balance-check/1: Accounts row on More (flagged, settle 1,101 ms)
7. About 400 ms with nothing visible.
8. It slides in from the right.
9. A skeleton holds about 350 ms, then Accounts appears.
10. Right motion.
Verdict: look again. Same fix as `first-run/20`.

### balance-check/2: Check balances
7. The button's press shows faintly at frame 5. Before that, the screen sits still for about 250 ms.
8. It slides in from the right.
9. A skeleton holds about 400 ms, then the cards appear.
10. Right motion.
Verdict: look again. First fix: open *Balance check* on content. Every *Sen has* figure is already on the Accounts screen behind it.

### balance-check/3: Save with nothing typed, then typing 14,600.87
7. *Type what a bank app shows, or tap Matches, for at least one account.* appears above *Save* at frame 1.
8. Caused by the tap. Typing shows *RM50.00 less than Sen has*, which is right (14,650.87 − 14,600.87).
9. Steady.
10. n/a.
Verdict: fine. Nothing to fix.

### balance-check/4: Matches on TNG eWallet
7. The page jumps to TNG's card at frame 1. That's probably the test scrolling the chip into view.
8. *7,815.40* and *No difference* fill in, caused by the tap. The chip's ripple comes after the value.
9. Steady once there.
10. n/a.
Verdict: fine. Nothing to fix.

### balance-check/5: Save (flagged, first change 208 ms, settle 1,080 ms)
7. Nothing visible for about 150 ms, then *Saving…* with a spinner. Answered, just late.
8. After about 350 ms, the form jumps back to its top and *Save* looks ready again for about 100 ms (frames 9–11). For a moment it looks like the save didn't happen. Then Accounts slides back in from the left.
9. Accounts shows the new figures (*RM29,821.77*, Ryt *RM14,600.87*, *The last check found RM50.00*, all right), then reflows once more at the end (frame 20). A toast flashes at the bottom, and I couldn't confirm it stays.
10. Back motion, right direction.
Verdict: look again. First fix: leave straight from *Saving…*, with no scroll-to-top and no re-enabled *Save* frame on the way out.

### D148/1: + Add on *Not added yet · A coffee app* (flagged, first change 192 ms)
7. Nothing visible for about 200 ms, then the scrim.
8. The sheet rises from the bottom over frames 5–10. That's the right motion, and it reads as opened by *+ Add*.
9. Steady. The sheet settles a few pixels at the end.
10. A sheet rising is right.
Verdict: look again. First fix: show the press on *+ Add* at once.

### D148/2: Add account empty, then typing 42.50
7. *Type today's balance, or 0.* appears at frame 2, and the sheet eases taller, as patterns ask.
8. Caused by the tap.
9. The typed digits *0.04 → 0.42* are red until valid, then dark *42.50*.
10. The height ease is right.
Verdict: look again. Same fix as `first-run/7` (no red amounts). Also *or 0* again.

### D148/3: typing and Add account
7. *Saving…* comes at about 150 ms. Good (E2).
8. The sheet vanishes in one frame instead of falling. The new row *A coffee app · Checked 31 Oct · RM42.50 · From A coffee app* is just there, and *Not added yet* has gone.
9. A hard cut, then the toast *A coffee app added · Undo* slides in.
10. A sheet should fall back, and an added row should slide in (patterns §8). Neither happens.
Verdict: look again. First fix: let the sheet fall and the new row ease into the list.

### D148/4: Add account (flagged, first change 152 ms)
7. *Saving…* comes at about 150 ms.
8. As `/3`: the sheet cuts out, and the row appears with no motion.
9. The toast slides in. Steady after that.
10. As `/3`.
Verdict: look again. Same fix as `/3`.

### a taken category name…/1: Groceries tile
7. About 400 ms with nothing visible. The tile's ripple only shows at frames 10–13, after the sheet has started up.
8. The sheet rises from the bottom, but in two stages: to a short height, a pause of about 200 ms, then it grows taller (frames 14–15).
9. The second rise is a visible reflow.
10. A sheet should rise once, to its height.
Verdict: look again. First fix: press feedback on `pointerdown`, and one rise to the sheet's final height.

### a taken category name…/2: Save with *meals* (flagged, first change 112 ms)
7. *You already have a category with that name.* appears under *Name* at frame 2.
8. Caused by the tap, and where it's needed rather than in a toast.
9. *Save* moves down about 8 px as the error appears, an ease and not a jump.
10. Fine.
Verdict: fine. Nothing to fix.

### members…/9: Hui Min → Member → Remove (flagged, first change 208 ms; not this slice's journey)
7. About 300 ms still, then *Member* slides in from the right.
8. The slide is right. But an *Undone* toast from an earlier action stays on screen the whole time, first over the *Remove* button (frames 11–14), then drawn on top of the *Remove Hui Min?* dialog, over its explanation and its *Export their data first* button (frames 16–20).
9. Layering is broken: the toast is above the sheet.
10. The dialog rises correctly, under the toast.
Verdict: wrong. A confirmation that can't be undone has *Undone* written across it, which can mislead about what just happened, and it covers the dialog's words. First fix: a toast never draws over a sheet or dialog. Dismiss it, or keep it under the scrim.

---

## Verdicts, worst first

| Entry or filmstrip | Verdict | First fix |
|---|---|---|
| film `members…/9` | wrong | *Undone* toast drawn over the *Remove Hui Min?* dialog |
| `first-run@accounts` | look again | blank now forces *or 0*, a made-up balance; typed amounts go red |
| `accounts` | look again | *Checked 31 Oct* for first-run balances argues with *the last check found RM42.10* |
| `accounts@capture-off` | look again | same *Checked* badge problem, under *no notifications since 16 Oct* |
| `account` | look again | opening balance dated after its own check and listed payments |
| `settings/capture/apps` | look again | established person sees every app off and *Choose these 4* |
| `first-run@apps` | look again | four apps pre-chosen with no word why; *Suggested* card flashes in the journey |
| `accounts@month` | look again | dead-end empty state, *isn't switched on for you*, no action |
| film `first-run/3` | look again | blank frame, then *Suggested* card shows and vanishes, list jumps |
| film `first-run/4` | look again | list jumps up under the finger as the card goes |
| film `first-run/18` | look again | tab bar pops in first, crossfade into a skeleton |
| film `first-run/17` | look again | as `/18` |
| film `balance-check/5` | look again | form jumps to top and *Save* looks ready again before leaving |
| film `first-run/7` | look again | four red errors at once; amount drawn red |
| film `first-run/8` | look again | amount drawn red while typing |
| film `D148/2` | look again | amount drawn red; *or 0* |
| film `D148/3` | look again | sheet cuts out, new row appears without motion |
| film `D148/4` | look again | as `/3` |
| film `a taken category…/1` | look again | 400 ms still, sheet rises in two stages |
| film `first-run/20` | look again | 400 ms still, then a 550 ms skeleton for known data |
| film `balance-check/1` | look again | as `first-run/20` |
| film `balance-check/2` | look again | skeleton for figures already on screen |
| film `D148/1` | look again | no press visible for about 200 ms |
| film `first-run/14` | look again | skeleton on going back to typed values |
| film `first-run/15` | look again | as `/14` |
| film `first-run/5` | look again | ripple lands on the next screen's button (not this slice) |
| film `first-run/6` | look again | as `/5` (not this slice) |
| film `first-run/11` | look again | Segmented control flashes both options faded (not this slice) |
| film `first-run/12` | look again | as `/11` (not this slice) |
| film `first-run/2` | look again | two filled buttons after the error (not this slice) |
| `more` | fine | none |
| `payments` | fine | none (judged shrunk to 195 px wide) |
| `balance-check` | fine | none |
| `settings/categories` | fine | none |
| `payments@offline` | fine | none (judged shrunk) |
| `first-run@name` | fine | none |
| film `first-run/1` | fine | none |
| film `first-run/9` | fine | none |
| film `first-run/10` | fine | none |
| film `first-run/13` | fine | none |
| film `first-run/16` | fine | none |
| film `first-run/19` | fine | none |
| film `balance-check/3` | fine | none |
| film `balance-check/4` | fine | none |
| film `a taken category…/2` | fine | none |

**Count:** wrong 1 (a filmstrip), look again 29 (7 entries, 22 filmstrips), fine 15 (6 entries, 9 filmstrips). That's 45 in all: 13 entries and 32 filmstrips.
