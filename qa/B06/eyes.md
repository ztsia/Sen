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
