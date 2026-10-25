# B06 eyes pass

Branch `B06/jobs-realtime-backups`. There was no diff report: `scripts/qa-diff.mjs` failed on the
Windows laptop before writing one, so there are **no base screenshots to compare against and no
filmstrips**. The entries below are the ones the reviewer listed. Each was opened at full size, one
at a time, in the order given.

Read first: `docs/ui/patterns.md` (§2 Sizes, §3 Money, §7 Calm screens, §8 Motion), `docs/workflow/qa.md`
(its eyes-pass section) and `qa/escapes.md`. That adds E1–E3's **Ask** questions and question 10, the
right motion.

Screenshots are under `qa-artifacts/B06_jobs-realtime-backups/`: the catalogue's in
`sweep/screens/catalogue/`, the flows' in `screens/`.

---

## 1. Settings → Data (`settings/data`), the catalogue, all twelve pairs

Opened: `settings_data--minted-light.png`, then `--minted-dark`, `--instrument-light`, `--instrument-dark`,
`--firefly-light`, `--firefly-dark`, `--line-light`, `--line-dark`, `--mercury-light`, `--mercury-dark`,
`--copper-light`, `--copper-dark`.

1. **First look.** In Minted light, the eye lands first on the *Export* card, its download tile and the
   *Export everything* pill. That's right: exporting is the one thing a person comes here to do. In
   one line, the screen is *get your data out, see that it's backed up, and run two checks*. Three
   groups (*Export*, *Backups*, *Checks*) sit in three cards with room between them, and the bottom
   third of the screen is empty. It's calm.
2. **Reading.** Body text is a comfortable size and nothing wraps badly, apart from Line, where
   *keep.* is left alone on the second line. Words that don't explain themselves:
   - *Schedule a test job* is server jargon. A person doesn't know what a "job" is, when it will run,
     or what they'll see when it does.
   - *Send a test push*: "push" is jargon too, and the row doesn't say where the push goes (this
     phone?).
   - *Storage 1.24 GB of 10 GB* doesn't say whose storage it is: mine, Sen's, the backups'?
   - E1: the group labels (*Export*, *Backups*, *Checks*) are small and grey, smaller than the rows
     they head. That's D130's `GroupLabel`, the same as every settings screen (*You* has the same),
     so it isn't B06's to fix, but it is the shape E1 described.
3. **Tapping.** *Export everything* is clearly a button. *Send a test push* and *Schedule a test job*
   lead with icon tiles like `NavRow`s, but they have no chevron and no state on the right. A person
   can't tell whether a tap opens a screen or does something at once, and it does something at once.
   *Last backup* and *Storage* are facts, with no tile, and rightly don't look tappable. The main
   action, *Export everything*, sits in the top third, out of a thumb's easy reach (§7 *Screens*:
   the main action goes in the bottom third). That's tolerable on a screen this short, but it's the
   rule. The dev-panel handle on the left edge is preview-only.
4. **Broken.**
   - **Line light and dark:** the *Export* block's tile and button are flush with the label's left
     edge (x≈32), but the *Backups* rows and the *Checks* tiles are indented (x≈66). Three groups,
     two left edges. Every other look aligns them all inside the card.
   - **Instrument dark and Mercury dark:** the *Export everything* pill's fill is almost the card's
     colour, so it barely reads as a button. In Mercury dark the *Checks* tiles nearly vanish too.
   - The *Export* card shows the download icon twice, once in the tile and once in the button, a
     hand's width apart. The tile adds nothing beside a button that already carries the same icon.
   - *Last backup* and *Storage* rows are tall (about 56 px each) for two one-line facts, so the card
     looks half empty. That's acceptable under §2 Sizes.
5. **Trust.** *Last backup Yesterday, 03:00* is reassuring and clear. *1.24 GB of 10 GB* looks right
   and consistent in every look (same digits, same units). Nothing here is alarming. What's missing
   is what the checks prove: after I run one, the screen never says whether it worked (see 4 and 5
   below).
6. **E1, calm or crowded:** calm. There's one thing first, room between groups, and facts (no tile,
   value on the right) look different from actions (tile). The exception is the two check rows,
   which look like navigation. **E2, does every button that waits on the server say so:** nothing in
   these stills shows a pending state for *Export everything* or the two checks, and there's no room
   in a row for *Sending…*. That can't be judged without a filmstrip, but it's the first thing to
   check on a slow network. **E3:** not applicable to this screen's pixels.
10. **Motion:** there are no filmstrips, so this couldn't be judged.

Better or worse than `main`: there's no base screenshot. On `main` this screen was a skeleton.

Verdict: **look again**. Fix first: make the two *Checks* rows say what they do and what happened
last (a line under each, such as *Sends a notification to this phone* and *Last ran 16:30 · arrived*),
so they don't read as navigation with nothing behind it. Then fix Line's two left edges, and the
near-invisible pill in Instrument dark and Mercury dark.

---

## 2. Settings → Data against the real server, the admin (`FLOW-4-step-1-admin-data.png`, `FLOW-4b-step-1-new-york.png`)

Opened at 390×844, Minted light: the admin in KL time, then the same admin with the browser in New
York time.

1. **First look.** Same as the catalogue: the *Export* card first. It's a data and backups screen.
2. **Reading.** *Last backup Sat, 24 Oct, 23:30*. The catalogue's fake says *Yesterday, 03:00*, but the
   real one gives a full weekday and date. If this ran on 25 Oct, the real screen should read
   *Yesterday, 23:30* by the same rule. Either the rule differs between the fake and the server's
   shape, or it's only relative for some times. Same jargon as entry 1.
3. **Tapping.** The same as entry 1.
4. **Broken.** Nothing. The values sit right-aligned and on one line.
5. **Trust.** New York shows exactly the same *Sat, 24 Oct, 23:30*, so the time is KL time whatever
   the device says. That's right by the conventions, and it means the owner abroad sees the same
   thing. There's no "KL time" hint, but the owner lives in KL, so I wouldn't add one. *1.50 GB of
   10 GB* is plausible. Whose storage it is still isn't said: for the admin, it's presumably the
   whole server's.
6. **E1:** calm. **E2:** see entry 1. **E3:** not applicable.

Verdict: **look again**. Fix first: say the last backup's day the same way the fake does (*Yesterday,
23:30*), or make the fake match the server. Two phrasings for one fact look like two sources.

---

## 3. Settings → Data, a member (`FLOW-5-step-1-member-data.png`)

1. **First look.** Only the *Export* card, then empty screen down to the tab bar. It's a place to
   export your data.
2. **Reading.** It's easy to read. There's one sentence and one button.
3. **Tapping.** *Export everything* is obvious. It's high on the screen, but there's nothing else to
   reach for.
4. **Broken.** Nothing looks broken. Three quarters of the screen is blank, which is fine for a
   screen with one thing on it.
5. **Trust.** As a friend invited onto Sen, I'd open *Data* and find nothing about backups at all. I'd
   wonder whether my payments are backed up, or only the owner's. Hiding the server's storage figure
   from a member is right, but hiding *that backups exist* reads as "not for you". One fact row, such
   as *Backed up every night*, with no admin numbers, would reassure without revealing anything.
6. **E1:** calm. **E2:** *Export everything*'s pending state isn't visible in stills. **E3:** not
   applicable.

Verdict: **look again**. Fix first: tell a member their data is backed up, in one line, without the
admin's figures.

---

## 4. Send a test push, four taps (`FLOW-6-step-1-push-1.png` … `FLOW-6-step-4-push-4.png`)

1. **First look.** The toast at the bottom: *Push isn't set up here.* Step 1 catches it mid-slide-in,
   with its text still faded. It's the right thing to see after the tap.
2. **Reading.** The toast's words are clear, but *here* is vague: this phone, this browser, this
   account? Step 4's *That's a few tests already. Wait a minute.* is friendly and plain.
3. **Tapping.** The tapped row shows a grey press tint that stops short of the card's right edge
   (at about x=668–698 of 746), with a rounded or hard right end. It's the ripple caught mid-spread,
   and in FLOW-7's later shot it has cleared, so it isn't stuck. In stills, though, it looks like a
   half-drawn selection bar.
4. **Broken.** Nothing is cut off. The toast sits just above the tab bar's ribbon. Mid-slide in step 1,
   it overlaps the ribbon for a frame, which is fine.
5. **Trust.**
   - *Push isn't set up here.* says what happened but not what to do next. §7 *Error* asks for "what
     to do next … with a button that does it". A person is left at a dead end: is it broken, or do
     they need to turn something on?
   - After three taps that each said push isn't set up, the fourth tap is refused as "a few tests
     already". The limit counts tests that never went anywhere, so the message reads as being told
     off for the app's own gap.
6. **E1:** calm. **E2:** no pending wording on the row is visible between tap and toast. Against a
   local server the toast is instant. On a phone over a mobile network, the row has no *Sending…*
   and no spinner, so the tap could look ignored for a second or two. That's exactly E2's shape.
   **E3:** not applicable.

Verdict: **look again**. Fix first: when push isn't set up, say what to do (*Turn on notifications for
Sen in Android's settings*, or *Push works only in the app on your phone*), with a button if one can
do it. Then give the row a pending state while the request is out.

---

## 5. Schedule a test job (`FLOW-7-step-1-scheduled.png`, and `FLOW-7-step-2-ran.png` for context)

1. **First look.** The toast: *Test job set for 16:30. Its push arrives then.* Step 1 catches it
   sliding in over the tab bar's ribbon.
2. **Reading.** The sentence is short and clear. *16:30* is in KL time, presumably, which isn't said
   but is consistent with the rest of the app.
3. **Tapping.** The same press tint as entry 4, mid-spread on *Schedule a test job*, cleared by step 2.
4. **Broken.** Nothing.
5. **Trust.** This is the problem. On this same device, the previous check said *Push isn't set up
   here.*, yet this toast promises *Its push arrives then.* A person would wait for a notification
   that can't come. In step 2 (*ran*), the job has run, the screen is unchanged and the same toast
   is still showing. Nothing on the screen says the job ran or whether its push was sent. The check
   can't tell me anything, because its only proof is a push this device can't get.
6. **E1:** calm. **E2:** no pending state visible, as in entry 4. **E3:** not applicable.

Verdict: **wrong**. A person is misled into waiting for a push that the app already knows won't
arrive. Fix first: don't promise a push where push isn't set up (say *It runs at 16:30; you'll see
the result here*), and show the result on the row once it ran (*Ran at 16:30 · push sent* or *push
not set up*).

---

## 6. The live-updates stamp over a loading screen (`FLOW-2-step-1-stamp.png`)

1. **First look.** *Updated just now* in muted text at the very top, where the app bar should be,
   above four grey skeleton rows. There's **no app bar: no back arrow, no title.** I can't tell what
   screen this is. The *More* tab is lit, so it's somewhere under More.
2. **Reading.** *Updated just now* is readable, but it says the opposite of what's on screen: nothing
   has loaded.
3. **Tapping.** There's nothing to tap but the tab bar. With no back arrow, the only way out is a tab
   or Android's back gesture.
4. **Broken.** The stamp sits where the app bar belongs, at y≈27 px, so it reads like a title. The
   skeleton has replaced the whole screen, app bar included. Review's badge is missing here, though
   it's *12* on every other screen. That's probably just loading, but it's another thing that isn't
   there.
5. **Trust.** A screen that says *Updated just now* while showing nothing is the kind of
   contradiction that makes a person doubt every other "updated" they see. §7 says the stamp shows
   while the live connection is down. It shouldn't show at all before there's content to be fresh
   or stale.
6. **E1:** not crowded, just empty. **E2:** there's a loading skeleton, which is right (§7 *Loading*).
   **E3:** this is the path a phone with Sen already open takes when the connection drops, so it
   matters.

Verdict: **wrong**. A person sees "Updated just now" on a screen with no title and no content. Fix
first: show the stamp only under a rendered app bar and only once the screen has data, and keep the
app bar (back and title) during the loading skeleton.

---

## 7. The stamp on a loaded screen, then gone (`FLOW-2-step-2-fallback.png`, `FLOW-2-step-3-back.png`)

1. **First look.** *You*, with *Updated just now* in muted text under the title, then *Payday*. With
   the connection back (step 3), the stamp is gone and the screen is as normal.
2. **Reading.** The stamp is quiet and readable, and it sits as §7 *Live updates* says, in `muted`.
3. **Tapping.** It's unchanged from the screen without the stamp.
4. **Broken.** **The stamp pushes everything down by about 60 px when it appears, and pulls it back
   up when it goes.** Compare *Last working day* at y≈307 in step 2 with y≈247 in step 3. If the
   connection flaps while I'm reaching for *Not set*, the card moves under my thumb and I could tap
   *A day* instead. A setting would change by accident.
5. **Trust.** *Updated just now* while the live connection is down doesn't hint that live updates are
   paused. As the minutes pass, *Updated 2 min ago* will say so on its own, which is the pattern's
   intent and is calm. That's fine.
6. **E1:** calm. **E2:** not applicable. **E3:** the stamp is how an open screen tells me it may be
   stale, so this is the right idea.

Verdict: **look again**. Fix first: give the stamp a place that doesn't reflow the screen, such as a
reserved line or an overlay in the app bar's own space, so content never jumps when the connection
drops or returns.

---

## 8. The same screen, updated from another device (`FLOW-1-step-1-a-open.png`, `FLOW-1-step-3-a-updated.png`; `FLOW-1-step-2-b-changes.png` for context)

1. **First look.** *You*, with *Payday* chosen as *Not set* (a dark ring and a tick). After device B
   picks *Last working day*, device A shows the ring and tick on *Last working day* by itself. It's
   your profile settings.
2. **Reading.** It's easy. *Sen counts each cycle from it.* reads oddly under *Not set* ("it" is
   nothing), but that line isn't B06's.
3. **Tapping.** The choice cards and the switch are obviously tappable.
4. **Broken.** Nothing. The selected card's ring is the same weight before and after. Step 2 (device
   B) shows its press ripple as a grey disc mid-row, which is transient.
5. **Trust.** The change arrives cleanly: the old choice clears, the new one is ticked and nothing
   else moves. By §7 *Toasts*, no toast is needed, since the change is visible on screen. I'd trust
   it. A person who didn't make the change might wonder who did, but on their own two devices that's
   them.
6. **E1:** calm. **E2:** not applicable. **E3:** yes. This is exactly a phone that already has Sen open
   getting a change without reopening.

Verdict: **fine**. Nothing to fix. A filmstrip of the swap would confirm it doesn't flash.

---

## 9. Reloaded after a change (`FLOW-3-step-1-open.png`, `FLOW-3-step-2-reloaded.png`)

1. **First look.** *You* with *Last working day* chosen. After the reload, *Not set* is chosen.
2. **Reading.** The same as entry 8.
3. **Tapping.** The same as entry 8.
4. **Broken.** Nothing in the layout. No stamp shows in either shot, which is right if the connection
   is up.
5. **Trust.** From the screen alone, my choice flipped back across a reload with nothing saying why. If
   the flow is "another device changed it while this one wasn't listening, and the reload caught up",
   that's correct and fine. If the flow is "I chose, reloaded, and lost it", that's wrong. **The
   reviewer should confirm which the server holds.** The pixels can't tell the two apart, and a person
   couldn't either.
6. **E1:** calm. **E2:** not applicable. **E3:** a reload brings the server's state, as it should.

Verdict: **look again**. Fix first: confirm in the flow that *Not set* is what the server holds after
the reload. If it is, nothing changes on screen.

---

## Filmstrips

There are none for this run: the diff report and its Metrics section weren't produced. Questions
7–10 (*Answered*, *Connected*, *Steady*, *the right motion*) weren't answered for any tap. Here is
what the stills suggest the filmstrips should check first:

- **Send a test push and Schedule a test job:** whether the row shows anything between the tap and
  the toast on a slow network (E2). The stills show only a press tint.
- **The stamp appearing and disappearing:** the 60 px reflow (entry 7) is visible in stills. A
  filmstrip would show whether it snaps or slides.
- **Device A updating by itself:** whether the tick and ring move without a flash.

---

## Verdicts, worst first

| # | Entry | Screenshots | Verdict | Fix first |
|---|---|---|---|---|
| 5 | Schedule a test job | FLOW-7-step-1 (+ step-2) | wrong | Don't promise a push where push isn't set up; show the job's result on the row |
| 6 | Stamp over loading screen | FLOW-2-step-1 | wrong | No *Updated just now* before content; keep the app bar during loading |
| 1 | Settings → Data, catalogue | settings_data, all 12 pairs | look again | The two Checks rows should say what they do and what happened last; Line's two left edges; faint pill in Instrument and Mercury dark |
| 4 | Send a test push ×4 | FLOW-6-step-1…4 | look again | *Push isn't set up here* needs a next step; a pending state on the row |
| 7 | Stamp on a loaded screen | FLOW-2-step-2, step-3 | look again | The stamp reflows the screen by ~60 px when it comes and goes |
| 3 | Settings → Data, member | FLOW-5-step-1 | look again | Tell a member their data is backed up |
| 9 | Reloaded after a change | FLOW-3-step-1, step-2 | look again | Confirm *Not set* is the server's state after the reload |
| 2 | Settings → Data, admin (+ New York) | FLOW-4-step-1, FLOW-4b-step-1 | look again | *Sat, 24 Oct* vs the fake's *Yesterday*: one phrasing |
| 8 | Updated from another device | FLOW-1-step-1, step-3 (+ step-2) | fine | — |

**Count:** wrong 2 · look again 6 · fine 1. No filmstrips.

---

# Run 2 (25 Oct 2026)

From the diff report `qa-artifacts/B06_jobs-realtime-backups/diff/index.md` (head `3c7005a5` with
uncommitted changes, against `origin/main` `662b7d25`). It lists **2 changed entries** (`settings/data`,
tree and pixels in all twelve pairs; `settings/claims`, pixels only in six pairs), none new, and **2
flagged taps** (`refund/2`, `ask/3`). Paths below are relative to `qa-artifacts/B06_jobs-realtime-backups/`.

Read first, as in run 1: `docs/ui/patterns.md` §2, §3, §7, §8; `docs/workflow/qa.md` (default look Minted
light, then Minted dark; question 5 about money; question 10, the right motion); `qa/escapes.md` (E1–E3's
**Ask**).

Filmstrips opened: the two flagged steps; every step of `export`, the journey through the screen this
slice changed; every step of `offline`, where B06's live connection and its stamp would show; and
`refund/1` and `ask/2`, the steps just before the flagged ones, for context. Each strip is 21 frames,
50 ms apart, so frame *n* is at (*n*−1)×50 ms. They're drawn small, so what I say about them is what's
visible at that size.

---

## R2-1. Settings → Data (`settings/data`)

Opened, head first, one at a time: `diff/head/catalogue/settings_data--minted-light.png`, `--minted-dark`,
`--line-light`, `--line-dark`, `--instrument-dark`, `--mercury-dark`, `--instrument-light`, `--firefly-light`,
`--firefly-dark`, `--mercury-light`, `--copper-light` and `--copper-dark`. Then the base images:
`diff/base/catalogue/settings_data--minted-light.png` and `--line-light`.

1. **First look.** The *Export* card, its tile and the *Export everything* pill, the same as run 1.
   That's right. From the screen alone, its purpose is *take your data out, see it's backed up, and test
   two things*. Three cards with even gaps and a calm empty bottom third.
2. **Reading.** Text is easy, but the words are run 1's, unchanged on this screen. *Send a test push* and
   *Schedule a test job* still have no line under them, so "push" and "job" are left unexplained.
   *Storage 1.24 GB of 10 GB* still doesn't say whose storage it is. In Line, *keep.* still wraps alone.
3. **Tapping.** *Export everything* clearly looks like a button. The two *Checks* rows still lead with a
   tile and have no chevron and no state on the right. They look like navigation, but a tap acts at
   once. The facts (*Last backup*, *Storage*) correctly have no tile. The main action is still in the
   top third.
4. **Broken.**
   - **The pill nearly vanishes in Instrument dark, Mercury dark and now Copper dark too:** the
     *Export everything* fill is a shade off the card, so in those three it reads as a label with an
     icon, not a button. In Mercury dark and Copper dark the *Checks* tiles nearly disappear as well.
   - **Line, light and dark: two left edges.** The *Export* tile and pill sit flush at x≈32, while the
     *Backups* rows and the *Checks* tiles sit at x≈66. The base shows the same edge between *Export*
     and *Backups* on `main`, so it isn't B06's to fix. B06 adds a third group on the indented edge,
     though, which makes the mismatch more visible.
   - The download icon still appears twice in the *Export* card.
   - Nothing is cut off, and the cards don't overlap anything in any look.
5. **Trust.** *Yesterday, 03:00* and *1.24 GB of 10 GB* are the same digits and units in all twelve
   pairs, with nothing alarming. No money is shown. The checks still can't show their result on this
   screen, so the screen can't tell me whether a check worked.
6. **E1, calm or crowded:** calm. There's one thing first, room between the three groups, and facts
   look different from actions, except that the two check rows look like `NavRow`s. **E2:** a still
   can't show a pending state. In the export filmstrip below, *Export everything* answers within about
   150 ms, but the check rows aren't in any journey, so their pending state can't be judged.
   **E3:** not applicable to the pixels.

**Against `main`.** `main` had *Export* and one *Backups* row, *Last backup*. The head adds *Storage* and
the *Checks* card. That's better: the screen now looks finished, with the same rhythm and nothing
crowded. Worse: the new card adds two rows that look like navigation and explain nothing. In Line, the
added group repeats the indented edge. Run 1's fix-first for this screen isn't visible in these images.

Verdict: **look again**. Fix first: give each *Checks* row one line saying what it does and how it last
went (such as *Sends a notification to this phone · Last: not set up here*), so it stops reading as
navigation. Then make the pill visible in Instrument, Mercury and Copper dark.

---

## R2-2. Settings → Claims (`settings/claims`)

Opened: `diff/head/catalogue/settings_claims--firefly-light.png`, `--firefly-dark`, then the diff image
`diff/diff/settings_claims--firefly-light.png` and the base `diff/base/catalogue/settings_claims--firefly-light.png`.
Then `--mercury-light`, `--mercury-dark` (with its diff image), `--copper-light` and `--copper-dark` (with
the `--copper-light` diff image). Minted didn't change, so the report has no Minted pair for this entry.

1. **First look.** The two scheme cards, *Phone bill* and *Parking*, each with its limit and deadline.
   Then *ESS*. It's the place to set up claim schemes and Sen's ESS steps. That's right.
2. **Reading.** It's all readable. One thing reads badly and is unchanged from `main`: *ESS email
   address* wraps onto two lines, and its value breaks at the hyphen as *ess-* / *noreply@example.com*,
   pushed against the chevron. An address split at its own hyphen is hard to read.
3. **Tapping.** *Add*, each *Edit* (with Sen's avatar dot) and *Teach Sen* are clearly buttons.
   *Import recipe* is a text button with no fill, which is fine. *Last payslip fetched* is a fact with no
   tile. The ESS email row has a chevron.
4. **Broken.** The diff images light up only the tab bar's labels (*Home*, *Review*, *Scan*, *Insights*,
   *More*) and the badge's *12*. That's text anti-aliasing, a few hundred pixels. Side by side, the head
   and the base look the same, and a person couldn't tell them apart.
5. **Trust.** *Up to RM100.00 a month* is in the app's money format in every look. The *Signed in*,
   *Recorded* and *Not recorded* badges say their state in words. Nothing changed that would affect trust.
6. **E1:** calm enough for a two-card screen, with headings bigger than their rows. **E2, E3:** not
   applicable, since nothing here changed.

**Against `main`.** There's no visible difference. The change is rendering noise in the tab-bar text.

Verdict: **fine**. Nothing to fix in this slice. Outside it: let the ESS address wrap at the `@` or
truncate in the middle, rather than breaking at its hyphen.

---

## Filmstrips

### F1. `step:refund/2` (flagged: settled in 1835 ms, against 1189 on `main`): `metrics/film/refund/2.png`

The tap lands inside the *A refund of which payment?* sheet, which lists *Tan Ah Kow · RM500.00* rows.

7. **Answered.** Frames 1–9 (0–400 ms) are identical. At this size I can't see any press on the tapped
   row, so the sheet sits still for nearly half a second.
8. **Connected.** At 450 ms the sheet's list **changes to different payments**: *Sate Kajang Hj Samuri
   RM64.13*, *Grabfood RM32.50*, *Nando's*. At 500 ms the sheet shrinks to a shorter height. From 550 ms
   it slides down, and by 650 ms it's gone. If I'd just picked a payment, a list of *other* payments
   flashing up reads as if my choice changed the question, not as a result of it.
9. **Steady.** No. There are two jumps on the way out: the list swap, then the change in height. When
   the sheet has gone, Review is back, and at 1 s the *+RM100.00 from Tan Ah Kow* question is still
   there with its *Income · Transfer · Refund of…* chips. Whatever cleared it came after the second
   ended, so for over a second the answer looks like it didn't take (E2's shape).
10. **Motion.** The sheet does fall, as §8 says, but its content must stay as it was while it falls. A
    cleared row should slide out within about 200 ms of the choice, not a second later.

Verdict: **look again**. Fix first: keep the sheet's list exactly as it was while the sheet closes, and
clear the answered Review row as the sheet goes, not more than a second after.

### F2. `step:ask/3` (flagged: settled in 2908 ms, against 455 on `main`): `metrics/film/ask/3.png`

The tap is the *Insights* tab, from Home.

7. **Answered.** Frames 1–7 (0–300 ms) show Home unchanged. The *Insights* tab's press tint first
   shows at frame 8 (350 ms). For a third of a second, the tap looks ignored.
8. **Connected.** The tab bar marks *Insights* in time, but the screen doesn't become Insights. At
   400 ms there's a **see-through frame**: grey skeleton bars over a faded Home, with *1,931.27* and the
   chart showing through. From 450–550 ms there's a generic row skeleton with no app bar and no title.
   Only from 600 ms does *← Insights* appear, over a different, card-shaped skeleton.
9. **Steady.** No. Home is shown through the skeleton, then one skeleton is swapped for another of a
   different shape, and at 1 s the screen is still all grey cards. On `main` this tap settled in under
   half a second. Here a person looks at placeholders for nearly three seconds on a tab they open often.
   (*Insights* also shows a back arrow, though it's a tab root. It's probably the same on `main`, but
   worth checking.)
10. **Motion.** §8 asks for a crossfade with no blank or see-through frame. Two different skeletons in a
    row, the first without its app bar, isn't a skeleton "shaped like the content".

Verdict: **wrong**. A tab that used to open almost at once now flashes Home through grey bars, swaps
skeletons and stays empty for about 3 s, which would put a person off. Fix first: find what B06 makes
Insights wait for and show its cached content at once. Failing that, show one skeleton, the
screen's own, with its app bar, from the first frame.

### F3. `step:refund/1` (context, standing): `metrics/film/refund/1.png`

The tap is the *Refund of…* chip on the *+RM100.00 from Tan Ah Kow* row.

7. **Answered.** Nothing changes for about 600 ms. The chip's press shows only once the scrim starts,
   at about 650 ms. **8. Connected.** The sheet rises from the bottom over a dimming Review, which fits
   the chip. **9. Steady.** It rises smoothly through the rest of the second. **10. Motion.** It's the
   right motion, but it starts far too late.

Verdict: **look again** (it's standing, the same on `main`). Fix first: the press within one frame.

### F4. `step:ask/2` (context, standing): `metrics/film/ask/2.png`

The tap is *How am I doing this cycle?* in Sen's sheet.

7. **Answered.** The chip greys from about 350 ms, and nothing else changes for the whole second. No
   question appears in the chat and no *thinking* state shows. **8. Connected.** Only the press is
   connected. **9. Steady.** It's steady, but static. **10. Motion.** None, though the question should
   appear at once as my own message.

Verdict: **look again** (it's standing). Fix first: post the question into the chat at once, with
Sen's working state, so the tap is plainly taken.

### F5. `export/1`: `metrics/film/export/1.png`

The tap is *Export everything* on the Data screen.

7. **Answered.** The pill's press tint shows at about 150 ms, and the toast starts sliding in at about
   300 ms. **8. Connected.** The toast, *Export isn't ready yet. Nothing was exported.*, is clearly the
   result. It's honest, though it doesn't say when export will work. **9. Steady.** The toast slides up
   cleanly above the tab bar. Late in the second, the test opens the preview-only dev panel, and **the
   toast stays on top of the sheet, across its middle, covering its rows** (see F6). **10. Motion.**
   The toast slides in, as §8 says.

Verdict: **fine** for the tap itself.

### F6. `export/2`: `metrics/film/export/2.png`

The second tap on *Export everything*, then the dev panel opens.

7. **Answered.** The press and a fresh toast come within about 100 ms. **8. Connected.** Yes.
   **9. Steady.** The old toast drops and the new one slides in, which is fine. Then the sheet rises
   *under* the toast: for the rest of the second, *Export isn't ready yet…* sits on the sheet over its
   *Light and dark* and *Text size* rows. This sheet is preview-only, but F11 shows the same with Sen's
   sheet in production. **10. Motion.** Each movement is right on its own, but they're layered wrongly.

Verdict: **look again**. Fix first: when a sheet opens, put the toast behind the scrim or dismiss it,
so it never sits over a sheet's content.

### F7. `export/3`: `metrics/film/export/3.png`

In the dev panel, from the panel to *Native stand-ins* (preview-only).

7. **Answered.** The panel scrolls within about 150 ms. **8. Connected.** The old sheet falls, and about
   half a second of bare screen with no scrim follows before the new sheet rises. At about 300 ms, one
   frame shows two sheet headers at once. **9. Steady.** The stall and the doubled frame are visible,
   and the toast again rides over the new sheet. **10. Motion.** It's a sheet-to-sheet swap that drops
   to nothing in between.

Verdict: **fine**. It's preview-only tooling that a person never sees. The toast layering is counted
under F6.

### F8. `export/4`: `metrics/film/export/4.png`

The tap is the *Your export is ready* stand-in notification (preview-only).

7. **Answered.** The row's press shows at about 150 ms, and the toast changes to *Simulated: the
   download opens* at about 150 ms. **8. Connected.** Yes, the toast changes in place. **9. Steady.**
   Nothing else moves. **10. Motion.** It's right.

Verdict: **fine**.

### F9. `offline/1`: `metrics/film/offline/1.png`

Offline, with the banner *You're offline. What you add is kept and syncs when you're back.* The tap is
the *Review* tab.

7. **Answered.** Home is unchanged for about 400 ms. The tab's press shows at frame 9. **8. Connected.**
   At 450 ms there's a see-through frame of skeleton bars over a faded Home figure, then a generic row
   skeleton with **no app bar and no title** for the rest of the second. The tab bar says *Review*, but
   the screen doesn't, and Review's own questions are local yet haven't appeared after a second. No
   *Updated…* stamp shows over the skeleton, which fixes run 1's entry 6 for this path. The missing app
   bar from that entry is still missing here. **9. Steady.** It's the same see-through crossfade as F2.
   **10. Motion.** The crossfade isn't clean, and the skeleton isn't shaped like Review.

Verdict: **look again**. Fix first: the same as F2. Keep the app bar and the screen's own skeleton from
the first frame, and don't fade through a see-through frame.

### F10. `offline/2`: `metrics/film/offline/2.png`

The tap is *Meals* on *RM9.50 · Roti Bakar 88*.

7. **Answered.** The chip's press shows at about 400 ms. **8. Connected.** Only the press: the row is
   still there at 1 s, and *Needs you · 12* hasn't changed. Step 3's first frame shows the row gone and
   *Needs you · 11*, so the clear came after the second. **9. Steady.** Nothing jumps. It's just slow.
   **10. Motion.** The clear and slide-out happen after the film ends, so it's too slow to judge here. In step 3,
   the toast reads ***ROTI BAKAR 88* is Meals from now on · Undo**, in capitals. §2 says a payee is shown
   in title case (*Roti Bakar 88*), as the row above it shows.

Verdict: **look again**. Fix first: the toast should show the payee as the row does, *Roti Bakar 88*.
Then make the row clear within about 200 ms of the answer.

### F11. `offline/3`: `metrics/film/offline/3.png`

The tap is Sen's button, offline, with the *Roti Bakar 88* toast still showing.

7. **Answered.** For about 400 ms nothing changes, then the scrim and the sheet come. **8. Connected.** The
   sheet rises from the bottom, from where the button is, which is right. **9. Steady.** Around 500 ms one
   frame seems to show the sheet's *Sen* header twice. More importantly, **the toast stays on top of
   Sen's sheet for the rest of the second, floating mid-sheet where the chat goes.** And offline, the
   sheet shows only grey skeleton rows. A full second in, it still doesn't say *Sen needs a
   connection*, as §7 *Offline* asks, so a person waits for something that can't load. **10. Motion.**
   The rise is right. The toast over it isn't.

Verdict: **look again**. Fix first: no toast over an open sheet (as F6). Offline, Sen's sheet should say
*Sen needs a connection* at once instead of loading.

---

## Run 2 verdicts, worst first

| # | Entry or step | Screenshots or film | Verdict | Fix first |
|---|---|---|---|---|
| F2 | `ask/3`, Home → Insights tab (flagged) | `metrics/film/ask/3.png` | wrong | Insights now waits ~3 s behind a see-through frame and two different skeletons; show cached content, or its own skeleton with its app bar, at once |
| R2-1 | Settings → Data | `settings_data`, all 12 head pairs, base minted-light and line-light | look again | Each *Checks* row needs a line saying what it does and how it last went; the pill is near-invisible in Instrument, Mercury and Copper dark |
| F1 | `refund/2`, picking in *A refund of which payment?* (flagged) | `metrics/film/refund/2.png` | look again | The sheet's list swaps to other payments as it closes, and the answered row is still there a second later |
| F11 | `offline/3`, Sen's button offline | `metrics/film/offline/3.png` | look again | A toast floats over Sen's sheet; offline it loads instead of saying *Sen needs a connection* |
| F6 | `export/2`, second export, then a sheet | `metrics/film/export/2.png` | look again | A toast sits over an open sheet's content |
| F9 | `offline/1`, Home → Review tab | `metrics/film/offline/1.png` | look again | A see-through crossfade, then a skeleton with no app bar |
| F10 | `offline/2`, *Meals* on Roti Bakar 88 | `metrics/film/offline/2.png` | look again | The toast shouts *ROTI BAKAR 88*; the row clears more than a second after the answer |
| F3 | `refund/1`, *Refund of…* chip (standing) | `metrics/film/refund/1.png` | look again | ~600 ms with no press before the sheet rises |
| F4 | `ask/2`, a suggested question to Sen (standing) | `metrics/film/ask/2.png` | look again | The question doesn't appear in the chat for a whole second |
| R2-2 | Settings → Claims | `settings_claims`, firefly, mercury and copper pairs, three diffs, base firefly-light | fine | No visible change (tab-label anti-aliasing); outside B06: the ESS address breaks at its hyphen |
| F5 | `export/1`, *Export everything* | `metrics/film/export/1.png` | fine | — |
| F7 | `export/3`, dev panel → stand-ins (preview-only) | `metrics/film/export/3.png` | fine | — |
| F8 | `export/4`, export-ready stand-in (preview-only) | `metrics/film/export/4.png` | fine | — |

**Count:** wrong 1 · look again 8 · fine 4 (2 entries: 1 look again, 1 fine; 11 filmstrip steps: 1
wrong, 7 look again, 3 fine). The two *Checks* rows aren't in any journey, so their taps (run 1's
entries 4 and 5) have no filmstrip and couldn't be rechecked here.

---

# Run 3 (25 Oct 2026)

From the diff report `qa-artifacts/B06/jobs-realtime-backups/diff/index.md` (head `db4e5b91` with
uncommitted changes, against `origin/main` `662b7d25`). Note the folder: this run's artifacts are under
`qa-artifacts/B06/jobs-realtime-backups/`, not run 2's `B06_jobs-realtime-backups/`. Paths below are
relative to it. The report lists **2 changed entries**: `settings/data`, with its tree and all twelve pairs,
and `settings/claims`, with pixels only in six pairs. None is new. It flags **1 tap**, `members…/1`
(settled in 272 ms against 142 on `main`), and drops **2 as noise**, `proposal/4` and `ask/4`.

Read first, as before: `docs/ui/patterns.md` §2, §3, §7 and §8; `docs/workflow/qa.md`; and `qa/escapes.md`
(E1–E3's **Ask**).

Also opened: seven screenshots from run 3's own flows against the real server (`screens/FLOW-R3-*.png`,
Minted light, 390×844).

Filmstrips opened:
- the flagged `members…/1`, and every other step of that journey (2–11), because it ends in *remove with
  an export*, which this slice adds;
- every step of `export` (1–4) and `offline` (1–3), as in run 2;
- run 2's two flagged steps, `ask/3` and `refund/2`, to see whether they changed;
- the two steps dropped as noise, `ask/4` and `proposal/4`.

Each strip is 21 frames, 50 ms apart, drawn small. Several `members` strips start before their own tap,
because the test moves faster than the camera, so I describe what each strip shows.

---

## R3-1. Settings → Data (`settings/data`), the catalogue

Opened, head first, one at a time: `diff/head/catalogue/settings_data--minted-light.png`, `--minted-dark`,
`--line-light`, `--instrument-dark`, `--mercury-dark`, `--copper-dark`, `--line-dark`, `--instrument-light`,
`--firefly-light`, `--firefly-dark`, `--mercury-light` and `--copper-light`. Then the base images:
`diff/base/catalogue/settings_data--minted-light.png` and `--line-light`.

1. **First look.** The *Export* card and its *Export everything* pill. That's right. From the screen
   alone, it's *take your data out, see it's backed up, test two things*. The three cards have even gaps,
   and the bottom third is empty and calm. As far as I can see, the pixels are the same as run 2's.
2. **Reading.** It reads easily, but the words haven't changed. *Send a test push* and *Schedule a test
   job* still have no line under them, so "push" and "job" are never explained. *Storage* still doesn't
   say whose storage it is. In Line, *keep.* still sits alone on its line.
3. **Tapping.** *Export everything* is plainly a button. The two *Checks* rows still lead with a tile and
   have no chevron and no state on the right. They look like navigation, but a tap acts at once. The
   facts have no tile, which is right. The main action is still in the top third.
4. **Broken.**
   - In Instrument dark, Mercury dark and Copper dark, the *Export everything* pill is a shade off the
     card, so it reads as a label. In Mercury dark and Copper dark the *Checks* tiles almost disappear.
   - In Line, light and dark, the *Export* block sits at x≈32, while *Backups* and *Checks* sit at x≈66.
     `main` already has the first mismatch, and B06 adds a group to it.
   - The download icon still appears twice in one card. Nothing is cut off.
5. **Trust.** *Yesterday, 03:00* and *1.24 GB of 10 GB* are the same in all twelve pairs. Nothing is
   alarming, and no money is shown. The screen still can't show me whether a check worked.
6. **E1:** calm, apart from the check rows, which look like `NavRow`s. **E2:** a still can't show a
   pending state, and the check rows aren't in any journey. **E3:** not applicable.

**Against `main`.** It's the same as run 2's comparison. Adding *Storage* and *Checks* makes the screen
look finished, but the check rows explain nothing. Neither of run 2's fix-firsts shows in these images.

Verdict: **look again**. Fix first: give each *Checks* row one line saying what it does and how it last
went. Then make the pill visible in Instrument, Mercury and Copper dark.

---

## R3-2. Settings → Claims (`settings/claims`)

Opened: `diff/head/catalogue/settings_claims--firefly-light.png`, `--firefly-dark`, the diff
`diff/diff/settings_claims--firefly-light.png` and the base `diff/base/catalogue/settings_claims--firefly-light.png`.
Then `--mercury-light`, `--mercury-dark` (with its diff), `--copper-light` and `--copper-dark`. Minted didn't
change.

1. **First look.** The two scheme cards, then *ESS*. It's where claim schemes and Sen's ESS steps are
   set up.
2. **Reading.** Readable. As in run 2, and as on `main`, *ess-* / *noreply@example.com* breaks at its
   hyphen against the chevron.
3. **Tapping.** *Add*, *Edit*, *Teach Sen* and the ESS email row look tappable. The facts don't.
4. **Broken.** Both diffs light up only the tab labels and the badge's *12*, which is anti-aliasing. Head
   and base look identical.
5. **Trust.** *Up to RM100.00 a month* is in the app's format in every look. Nothing changed.
6. **E1:** calm. **E2, E3:** not applicable.

**Against `main`.** There's no visible difference.

Verdict: **fine**. Outside B06: the ESS address shouldn't break at its hyphen.

---

## R3-3. Data with real numbers, the admin (`screens/FLOW-R3-4-step-1-facts.png`)

1. **First look.** The *Export* card, then *Last backup Fri, 23 Oct, 20:01* and *Storage 1.50 GB of 10 GB*.
2. **Reading.** Clear. Since the date is two days back, a weekday and date is the right way to say it.
3. **Tapping.** The same as R3-1.
4. **Broken.** Nothing. The values are right-aligned on one line.
5. **Trust.** The figures look plausible and are in the same units as the catalogue. One question the
   screen can't answer: if backups run nightly, a last backup two days ago means one was missed, yet it
   sits as calmly as yesterday's would. The screen never says how often backups run, so I can't tell
   whether to worry.
6. **E1:** calm. **E2, E3:** not applicable.

Verdict: **fine**. Worth confirming: if a nightly backup is missed, the row should say so.

---

## R3-4. Storage past half (`screens/FLOW-R3-4-step-2-half.png`, `screens/FLOW-R3-4b-step-2-half.png`)

1. **First look.** The amber warning triangle and *5.70 GB of 10 GB* in amber on the *Storage* row. It's
   the only colour on the screen, so it draws the eye before *Export*.
2. **Reading.** The figure is clear, but the warning has **no words**. Nothing says what's wrong (*over
   half full*?), what happens when it's full, or what to do.
3. **Tapping.** The row has no chevron and no button. A warning that looks like it wants something gives
   me nothing to tap.
4. **Broken.** Nothing in the layout: the icon and figure sit on one line. Both shots are the same. *4b*
   says *19:00* where *4* says *19:01*.
5. **Trust.** At 57% the screen raises an alarm with no reason given. §3 says a warning comes with an
   icon **and words**, and §7's health warnings say what's wrong and offer the button that fixes it. The
   owner would wonder whether backups are about to fail.
   - *Last backup Sun, 25 Oct, 19:01*: if this ran today, 25 Oct, the catalogue's own rule would say
     *Today, 19:01*. Run 1's point about one phrasing for this fact still stands. FLOW-R3-1's
     *Sat, 24 Oct, 23:30* would likewise be *Yesterday, 23:30*.
6. **E1:** the warning is the one thing first, and it isn't the thing that matters most. **E2, E3:** not
   applicable.

Verdict: **look again**. Fix first: say the warning in words, such as *Over half full · Sen keeps 30
days*. Say what happens at 10 GB, and what to do if there's anything to do. Otherwise, don't warn until
there is something to do.

---

## R3-5. Data, a member (`screens/FLOW-R3-4c-step-1-member.png`)

1. **First look.** Only the *Export* card, then empty screen down to the tab bar.
2. **Reading.** One sentence and one button. Easy.
3. **Tapping.** *Export everything* is obvious.
4. **Broken.** Nothing.
5. **Trust.** This is unchanged from run 1's entry 3. A friend on Sen sees nothing about backups, so
   they can't tell whether their own payments are kept safe.
6. **E1:** calm. **E2:** not visible. **E3:** not applicable.

Verdict: **look again**. Fix first: one fact row for members, such as *Backed up every night*, without
the admin's storage figure.

---

## R3-6. The fourth test push (`screens/FLOW-R3-5-step-1-fourth.png`)

1. **First look.** The toast: *That's a few tests already. Wait a minute.*
2. **Reading.** Plain and friendly, and *a minute* says how long to wait.
3. **Tapping.** The row looks as before. Nothing on it shows that the tests are paused.
4. **Broken.** Nothing. The toast sits above the tab bar's ribbon, inside the margins.
5. **Trust.** It's fine on its own. Whether the earlier three taps now give a next step can't be seen
   from this shot.
6. **E1:** calm. **E2:** a still can't show a pending state. **E3:** not applicable.

Verdict: **fine**.

---

## R3-7. Schedule a test job (`screens/FLOW-R3-1-step-1-scheduled.png`)

1. **First look.** The toast: *Test job set for 18:58. Push isn't set up here, so it only runs.*
2. **Reading.** Much better than run 1's *Its push arrives then*: it no longer promises a push that can't
   come. But *so it only runs* is awkward. It wraps with *runs.* alone on the second line, and it doesn't
   say how I'd ever know it ran.
3. **Tapping.** The row is unchanged, with no line and no result.
4. **Broken.** Nothing.
5. **Trust.** It's honest now, so I'm no longer misled. It's still a check that can't show me its
   result: after 18:58, nothing on the screen will say it ran.
6. **E1:** calm. **E2:** not visible in a still. **E3:** not applicable.

**Against run 1.** Run 1 called this *wrong* because the toast promised a push that couldn't arrive. That
is fixed.

Verdict: **look again**. Fix first: show the result on the row once it ran (*Ran at 18:58*), and say so
in the toast (*It runs at 18:58; the result shows here*).

---

## R3-8. The live-updates stamp, offline (`screens/FLOW-R3-3-step-1-offline-stamp.png`)

1. **First look.** The offline banner at the top, then *You*. Over the *Payday* label line sits a raised,
   centred pill: *Updated just now*.
2. **Reading.** Readable. Shown together, *You're offline* and *Updated just now* pull two ways for a
   moment, but the stamp will age to *2 min ago*, as §7 intends.
3. **Tapping.** **The stamp is now a raised pill with a shadow, which looks like a chip or button.**
   Nothing says it does anything. §7 asks for *Updated 2 min ago* in `muted`, as plain text.
4. **Broken.** It no longer reflows the screen. Run 1's 60 px jump is gone: the pill floats over the
   gap between *Payday* and the first card, and *Last working day* is where it would be anyway under
   the banner. It doesn't cover text here. As an overlay, though, it would sit over rows once the screen
   scrolls.
5. **Trust.** It doesn't contradict the screen any more, because it shows over loaded content with the
   app bar in place.
6. **E1:** calm. **E2:** not applicable. **E3:** this is a phone with Sen open losing its connection, and
   the stamp now behaves.

**Against run 1.** Better. Run 1's entries 6 and 7 (a stamp without an app bar, and the reflow) are both
fixed here.

Verdict: **look again**. Fix first: draw the stamp flat, as muted text and not a raised pill, so it
doesn't read as tappable.

---

## Run 3 filmstrips

### G1. `members…/1` (flagged: 272 ms median against 142 on `main`): `metrics/film/members_unlimited_at_invite_resend_and_revoke_remove_with_an_export/1.png`

The tap is *+ Invite* on *Members*.

7. **Answered.** Frames 1–5 (0–200 ms) are unchanged. *Invite*'s press and the scrim first show at
   about 250 ms, past §8's 100 ms.
8. **Connected.** The *Invite someone* sheet rises from the bottom over the dimmed list, which is the
   pattern for a sheet.
9. **Steady.** It rises from 250 to 550 ms and settles near the top. At this size I see no jump. The
   sheet is nearly full height (*Their email*, *They will use*, six switches, *Welcome credit*), which is
   long for a sheet (§7: long things get a screen), but that isn't B06's.
10. **Motion.** It's the right motion, but it starts about 150 ms late.

Verdict: **look again**. Fix first: the press within one frame of the tap, and find what this branch adds
to the tap's path before the sheet can start.

### G2. `members…/2`: `…/2.png`

The *Invite someone* sheet is filled in (*free@example.com*) and sent.

7. **Answered.** *Send invitation* darkens when pressed, and the sheet starts to fall within about
   100 ms.
8. **Connected.** Yes. *Free · Invited* appears in the list, and the toast *Invited free@example.com ·
   Undo* slides in. The new row is on screen, but the toast is still worth having for its *Undo*.
9. **Steady.** No. As the sheet falls (frames 11–13), **its header *Invite someone* shows twice**, one
   copy a little under the other, for about two frames.
10. **Motion.** The fall and the toast are right. The doubled header isn't.

Verdict: **look again**. Fix first: one sheet header while it falls (the same doubling as run 2's F7
and F11).

### G3. `members…/3`: `…/3.png`

Its frames show the same send-and-close as G2. The tap of its own isn't distinguishable at this size.

7. **Answered.** Yes. **8. Connected.** Yes. **9. Steady.** No. In frames 9–11 the falling sheet passes
   *under* the *Invited…* toast, and two *Invite someone* headers show at once. **10. Motion.** The
   layering is wrong.

Verdict: **look again**. The fix is the same as G2's.

### G4. `members…/4`: `…/4.png`

The same sequence again. In frames 6–8 the toast sits over the falling sheet, and the header shows twice.

Verdict: **look again**. The fix is the same as G2's.

### G5. `members…/5`: `…/5.png`

The tap is *Farid* in the list, which opens his member page. Then *Resend*.

7. **Answered.** Frames 1–4 are unchanged.
8. **Connected.** No. At about 200 ms there's a **see-through frame**, with the list showing under grey
   bars. Then comes a generic row skeleton with **no app bar** and the old toast still faintly visible,
   until *Member* appears at about 500 ms.
9. **Steady.** The swap is from skeleton to page, not a slide. Later in the strip, *Resend* shows a grey
   press band and *Invitation sent again* appears, which is clear.
10. **Motion.** §8: a screen opened from a row slides in from the right. Here it crossfades through a
    see-through skeleton, the same as run 2's F9.

Verdict: **look again**. Fix first: slide the member page in from the right, keeping its app bar and its
own skeleton from the first frame.

### G6. `members…/6`: `…/6.png`

The tap is *Revoke*, then *Undo*.

7. **Answered.** The press shows, then *Members* comes back with Farid's row gone. The toast reads
   *Withdrew the invitation to farid@example.com · Undo*. **8. Connected.** Yes: his row leaves, and after
   *Undo* it comes back and the toast says *Undone*. **9. Steady.** The back motion shows *Members* and
   *Member* side by side for a frame, which is the slide. Nothing jumps. **10. Motion.** Right.

Verdict: **fine**.

### G7. `members…/7`: `…/7.png`

Back on *Members*, *Undo*, then *Hui Min*.

7. **Answered.** Yes. **8. Connected.** *Hui Min*'s page slides in from the right (frames 19–21), as
   §8 says. **9. Steady.** Yes. **10. Motion.** Right.

Verdict: **fine**.

### G8. `members…/8`: `…/8.png`

The tap is *Remove* on Hui Min's page.

7. **Answered.** *Remove* darkens, and the scrim follows at about 300 ms. **8. Connected.** The *Remove
   Hui Min?* sheet rises from the bottom. **9. Steady.** No. **The *Undone* toast from the earlier step
   stays on top of the rising sheet**, across its first lines. **10. Motion.** The rise is right. The
   layering isn't.

Verdict: **look again**. Fix first: dismiss the toast, or put it behind the scrim, when a sheet opens.
This is run 2's F6 fix, still not made.

### G9. `members…/9`: `…/9.png`

The *Remove Hui Min?* sheet settles: *They can't sign in any more and their data is deleted. This can't
be undone. Send them a copy of their data first?* Then *Export their data first*, *Remove* and *Keep
them*.

7. **Answered.** Yes. **8. Connected.** Yes. **9. Steady.** No. From frame 15 to the end, **the *Undone*
   toast sits across the sheet exactly where *Export their data first* is**. Only the top edge of that
   button shows above the toast, and *Remove*'s top half is covered too. **10. Motion.** It's the same
   layering fault as G8, but here it hides a choice.

Verdict: **wrong**. The dialog asks whether to keep a copy before an irreversible delete, and the button
that keeps the copy is hidden under a toast, while *Remove* stays visible. A person could remove Hui Min
without ever seeing the export option. Fix first: no toast over a sheet. This dialog in particular must
never have anything over its buttons.

### G10. `members…/10`: `…/10.png`

The same sheet, held for the whole second.

7–9. In all 21 frames the *Undone* toast covers *Export their data first* and the top of *Remove*. A toast
lasts 6 s (§7), so a person sees this for up to six seconds, which is how long the decision takes.
10. There's no motion. It's static and wrong.

Verdict: **wrong**. The fix is the same as G9's.

### G11. `members…/11`: `…/11.png`

The tap is *Export their data first*, judging by the result.

7. **Answered.** Yes. The sheet starts to fall within about 150 ms.
8. **Connected.** The sheet falls and *Members* slides back in, now *1 of 20* with Hui Min gone. The toast
   *Removed Hui Min. Their data export goes to huimin@example.com.* arrives at about 500 ms.
9. **Steady.** Mostly. As the sheet falls, the page behind it, which was scrolled down to the allowances,
   jumps to its top (*HM · Hui Min · Active* and her switches) for a few frames before it slides away.
10. **Motion.** A fall, then back, which is right. Apart from that jump, it's clean.

**Trust.** The button said *Export their data first*, which reads as a step before deciding. It removed
her at once. The toast says what happened, but a person who wanted a copy before thinking it over would
be surprised.

Verdict: **look again**. Fix first: name the buttons for what they do, such as *Send a copy, then remove*
and *Remove without a copy*. Keep the page behind still while the sheet falls.

### G12. `export/1`: `metrics/film/export/1.png`

7. **Answered.** The press on *Export everything* shows at about 100 ms, and the toast *Export isn't ready
   yet. Nothing was exported.* slides in from about 200 ms. **8. Connected.** Yes. **9. Steady.** Yes. Later
   in the strip the test opens the preview-only dev panel, and the toast rides over it (see G13).
   **10. Motion.** The toast slides, which is right.

Verdict: **fine**.

### G13. `export/2`: `metrics/film/export/2.png`

7. **Answered.** The press shows within about 100 ms and a fresh toast slides in. **8. Connected.** Yes.
   **9. Steady.** The dev panel's sheet rises *under* the toast, which sits over its rows for the rest of
   the second. This is unchanged from run 2's F6. **10. Motion.** Each part is right, but the layering is
   wrong.

Verdict: **look again**. Fix first: no toast over a sheet (as G8–G10).

### G14. `export/3`: `metrics/film/export/3.png`

The dev panel to *Native stand-ins* (preview-only). The old sheet falls, the screen stands bare for about
half a second, then the new sheet rises, with the toast over it again. This is unchanged from run 2's F7.

Verdict: **fine**. It's preview-only, and the toast is counted under G13.

### G15. `export/4`: `metrics/film/export/4.png`

The *Your export is ready* stand-in. The row's press shows at about 150 ms, and the toast changes in place
to *Simulated: the download opens*. Nothing else moves.

Verdict: **fine**.

### G16. `offline/1`: `metrics/film/offline/1.png`

Offline, the *Review* tab from Home.

7. **Answered.** Frames 1–7 (0–300 ms) are unchanged.
8. **Connected.** At 350 ms there's a see-through frame, with Home's figure faded under skeleton bars.
   From 400 to 850 ms a generic skeleton shows with no app bar and no title.
9. **Steady.** *← Review* with its questions arrives at about 900 ms. That's better than run 2, where it
   hadn't arrived within the second.
10. **Motion.** The crossfade still passes through a see-through frame, and the skeleton isn't Review's
    shape.

Verdict: **look again**. Fix first: keep the app bar and Review's own skeleton from the first frame, with
no see-through frame. Review's questions are local, so they could show at once.

### G17. `offline/2`: `metrics/film/offline/2.png`

The tap is *Meals* on *RM9.50 · Roti Bakar 88*.

7. **Answered.** The chip's press shows at about 150 ms. That's better than run 2's 400.
8. **Connected.** *Needs you · 12* becomes *11* at about 750 ms. Then the row slides out and the cards
   below close up, from 800 to 900 ms. That's better than run 2, where the clear came after the second.
9. **Steady.** For a frame or two, the leaving row's faded copy overlaps the *Splits* header and the next
   card. It settles by about 950 ms.
10. **Motion.** It's the right motion, but it starts about 700 ms after the answer, not within about
    200 ms. In G18's first frame the toast still reads ***ROTI BAKAR 88* is Meals from now on · Undo** in
    capitals, where §2 says *Roti Bakar 88*.

Verdict: **look again**. Fix first: the payee in title case in the toast. Then clear the row sooner.

### G18. `offline/3`: `metrics/film/offline/3.png`

Offline, Sen's button.

7. **Answered.** Frames 1–6 (0–250 ms) are unchanged, and the scrim comes at about 300 ms.
8. **Connected.** The sheet rises from the bottom, which is right. From about 850 ms it shows the cached
   chat, and the composer says *Sen is not answering right now*. That's better than run 2's endless
   skeleton.
9. **Steady.** No. **The *ROTI BAKAR 88 is Meals…* toast floats over Sen's sheet** all through the second,
   over the chat's lower half.
10. **Motion.** The rise is right. The toast over it isn't.

**Trust.** Offline, *Sen is not answering right now* doesn't say why. It sounds as if Sen is broken.
§7 asks for *Sen needs a connection*.

Verdict: **look again**. Fix first: no toast over the sheet. Offline, say *Sen needs a connection*.

### G19. `ask/3` (run 2's flag, not flagged now): `metrics/film/ask/3.png`

The *Insights* tab, from Home.

7. **Answered.** Frames 1–6 (0–250 ms) are unchanged, and the tab's press shows at 300 ms.
8. **Connected.** At 350 ms there's a see-through frame of Home under grey bars. Then a generic skeleton
   with no app bar from 400 to 500 ms, then *← Insights* over a card skeleton from 550 ms to the end.
   The content arrives about 350 ms into G20, so about 1.35 s after the tap.
9. **Steady.** No. One skeleton is swapped for another of a different shape.
10. **Motion.** It isn't a clean crossfade.

To my eyes this is the same as run 2's F2. The report no longer flags it against `main`, so I count it as
standing rather than B06's.

Verdict: **look again** (standing). Fix first: Insights' own skeleton with its app bar from the first
frame, and no see-through frame.

### G20. `ask/4` (dropped as noise): `metrics/film/ask/4.png`

Sen's button on Insights.

7. **Answered.** Late. The Insights skeleton holds until about 300 ms, its content pops in at 350 ms, and
   only at about 450 ms do the scrim and sheet start.
8. **Connected.** The sheet rises from the bottom, which is right.
9. **Steady.** No. Insights' content flashes in just before the scrim covers it. Then the sheet fills
   with a skeleton, then the chat, which jumps once as it scrolls to the latest message (frames 13–15).
10. **Motion.** The rise is right, but it starts late, and the chat shouldn't jump.

Verdict: **look again** (standing). Fix first: open the sheet within one frame of the tap, scrolled to
the latest message.

### G21. `refund/2` (run 2's flag, not flagged now): `metrics/film/refund/2.png`

Picking in *A refund of which payment?*.

7. **Answered.** Frames 1–6 (0–250 ms) show no press. 8. **Connected.** At 300 ms the sheet's list
   **swaps to other payments** (*Sate Kajang Hj Samuri RM64.13*, *Grabfood*, *Nando's*). It shrinks, then
   falls. **9. Steady.** No. At 1 s, *+RM100.00 from Tan Ah Kow* is still in Review with its chips.
   **10. Motion.** The sheet's content changes while it falls.

This is unchanged from run 2's F1.

Verdict: **look again**. Fix first: freeze the sheet's list while it closes, and clear the answered row
as it goes.

### G22. `proposal/4` (dropped as noise): `metrics/film/proposal/4.png`

The tap is *Dismiss* on the *ZUS COFFEE, CHASEE → Drinks & desserts* suggestion, in Sen's sheet.

7. **Answered.** Late. No press shows on *Dismiss*, and *Dismissed* replaces the two buttons only at
   about 800 ms.
8. **Connected.** Yes, it changes in place.
9. **Steady.** No. Between frames 1 and 2 the chat jumps by most of a screen. When *Dismissed* lands, the
   card shrinks and everything under it moves up. The *Undone* toast sits over the chat's suggestion
   chips above the composer the whole time.
10. **Motion.** §8's sheet that eases to its new height isn't visible here. It's a jump.

Verdict: **look again** (standing). Fix first: a press within one frame. And again, no toast over Sen's
sheet.

---

## Run 3 verdicts, worst first

| # | Entry or step | Screenshots or film | Verdict | Fix first |
|---|---|---|---|---|
| G9 | `members…/9`, *Remove Hui Min?* settles | `metrics/film/members…/9.png` | wrong | The *Undone* toast covers *Export their data first* on an irreversible delete; no toast over a sheet |
| G10 | `members…/10`, the same sheet held | `metrics/film/members…/10.png` | wrong | The same: the export choice is hidden for the whole second (and the toast's 6 s) |
| R3-4 | Storage past half | `FLOW-R3-4-step-2-half`, `FLOW-R3-4b-step-2-half` | look again | An amber warning with no words, no reason and nothing to do |
| R3-7 | Schedule a test job | `FLOW-R3-1-step-1-scheduled` | look again | No longer misleading (run 1's *wrong* is fixed), but the row never shows that it ran |
| R3-1 | Settings → Data, catalogue | `settings_data`, all 12 head pairs, base minted-light and line-light | look again | Each *Checks* row needs a line; the pill is faint in Instrument, Mercury and Copper dark |
| R3-5 | Data, a member | `FLOW-R3-4c-step-1-member` | look again | Tell a member their data is backed up |
| R3-8 | Live-updates stamp, offline | `FLOW-R3-3-step-1-offline-stamp` | look again | The reflow is fixed, but the raised pill looks tappable; draw it flat and muted |
| G11 | `members…/11`, *Export their data first* | `metrics/film/members…/11.png` | look again | The button removes at once; name it *Send a copy, then remove*. The page behind jumps to its top |
| G1 | `members…/1`, *+ Invite* (flagged) | `metrics/film/members…/1.png` | look again | ~250 ms with nothing before the press and the sheet |
| G8 | `members…/8`, *Remove* | `metrics/film/members…/8.png` | look again | A toast rides over the rising sheet |
| G18 | `offline/3`, Sen's button offline | `metrics/film/offline/3.png` | look again | A toast over Sen's sheet; *Sen is not answering right now* should be *Sen needs a connection* |
| G13 | `export/2` | `metrics/film/export/2.png` | look again | A toast over a sheet (unchanged from run 2) |
| G5 | `members…/5`, open Farid | `metrics/film/members…/5.png` | look again | A see-through frame and a skeleton with no app bar, not a slide from the right |
| G16 | `offline/1`, Review tab | `metrics/film/offline/1.png` | look again | A see-through frame and a skeleton with no app bar; Review now arrives at ~900 ms |
| G17 | `offline/2`, *Meals* | `metrics/film/offline/2.png` | look again | The toast still says *ROTI BAKAR 88*; the row clears ~700 ms after the answer (better than run 2) |
| G21 | `refund/2` | `metrics/film/refund/2.png` | look again | The list swaps as the sheet closes; the answered row is still there at 1 s (unchanged) |
| G19 | `ask/3`, Insights tab (standing now) | `metrics/film/ask/3.png` | look again | A see-through frame and two skeletons; content at ~1.35 s |
| G2 | `members…/2`, send the invitation | `metrics/film/members…/2.png` | look again | The falling sheet's header shows twice |
| G3 | `members…/3` | `metrics/film/members…/3.png` | look again | The same as G2, and the sheet falls under the toast |
| G4 | `members…/4` | `metrics/film/members…/4.png` | look again | The same as G3 |
| G20 | `ask/4`, Sen on Insights (noise) | `metrics/film/ask/4.png` | look again | ~450 ms before the sheet starts; the chat jumps as it fills |
| G22 | `proposal/4`, *Dismiss* (noise) | `metrics/film/proposal/4.png` | look again | ~800 ms with no press; the chat jumps; a toast over the sheet |
| R3-2 | Settings → Claims | `settings_claims`, firefly, mercury and copper pairs, two diffs, base firefly-light | fine | No visible change (tab-label anti-aliasing) |
| R3-3 | Data with real numbers | `FLOW-R3-4-step-1-facts` | fine | Confirm a missed nightly backup would be said |
| R3-6 | Fourth test push | `FLOW-R3-5-step-1-fourth` | fine | — |
| G6 | `members…/6`, revoke and undo | `metrics/film/members…/6.png` | fine | — |
| G7 | `members…/7`, open Hui Min | `metrics/film/members…/7.png` | fine | — |
| G12 | `export/1` | `metrics/film/export/1.png` | fine | — |
| G14 | `export/3` (preview-only) | `metrics/film/export/3.png` | fine | — |
| G15 | `export/4` (preview-only) | `metrics/film/export/4.png` | fine | — |

**Count:** wrong 2 · look again 20 · fine 8. Of these, 8 are entries (5 look again, 3 fine) and 22 are
filmstrip steps (2 wrong, 15 look again, 5 fine).

**What got better since run 2:**
- *Schedule a test job* no longer promises a push (run 1's *wrong*).
- The stamp no longer reflows, and it no longer shows over an empty skeleton (run 1's *wrong* and *look
  again*).
- `offline/2` clears its row within the second, and `offline/1` reaches Review within it.

**What didn't change:**
- The *Checks* rows and the faint pill.
- Toasts drawn over sheets. That is now the worst problem on the branch, because in the remove dialog it
  hides the export choice.
- The capitalised payee in the toast.
- `refund/2`'s list swap.
- The see-through tab crossfade.
