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
