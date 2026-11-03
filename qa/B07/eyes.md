# B07 eyes pass

Report: `qa-artifacts/B07_sync/diff/index.md` (head `a3d3ea64` with uncommitted changes, against `origin/main` `baa4b0eb`).
Read first: `docs/ui/patterns.md` §2, §3, §7, §8; `docs/workflow/qa.md`; `qa/escapes.md` (Asks E1, E2, E3).
Two entries (1 changed, 1 new), each opened in Minted light and Minted dark at full size, then other looks
where their pixel counts differed, then the base. Filmstrips: every step of `capture-off` (the slice's
journey), plus the six the report links (all six were dropped as noise; none is flagged).

---

## settings/capture/captured (changed)

Opened: `head/catalogue/settings_capture_captured--minted-light.png`, `--minted-dark.png`, `--firefly-dark.png`,
`--line-light.png`; then `base/catalogue/settings_capture_captured--minted-light.png`.

1. **First look.** The title *Captured on this phone*, then one card of four notifications. That's right. This
   screen is for seeing exactly what Sen read from my chosen apps.
2. **Reading.** Easy. For each notification the app name and time sit in muted secondary text, the title is semibold
   and the body is 15 px, with good room inside each row. In Firefly, the wider type wraps the TnG body to three
   lines, which is still comfortable. The intro reads *4 notifications, newest first, numbers hidden.*, but every
   number on screen is visible: *RM5*, *RM6.50*. Those are amounts, which D121 keeps, and the fixture has no other
   digits. So the one line of explanation says something the screen visibly contradicts.
3. **Tapping.** Only back and the heartbeat icon, top right. The rows have no chevron and no press look, so they read
   as information, which is right. There's no main action, and with content showing that's correct.
4. **Broken.** Nothing. The card fits and the dividers line up. Line draws it as hairlines, which is that look's own
   material. Both modes are clean.
5. **Trust.** Two doubts. (a) The base's *They stay on this phone.* is gone. If notifications now sync (B07), dropping
   it is honest, but nothing replaces it: the title still says *on this phone*, and the screen never says whether
   this raw text leaves the phone. A careful person wants that answered, here. (b) *Payment successful, You paid
   RM6.50 to KEDAI MAJU* sits beside two promotions and a statement notice, and nothing tells me whether Sen booked it
   as a payment. `patterns.md` §7 says B07 replaces this B02 row, but it's unchanged. The figures and signs are
   consistent: RM with two decimals, and dates in the same *Fri, 16 Oct, 20:31* form Home now uses.
6. **E1 (calm or crowded).** Calm. There's one card, the title is bigger than everything under it, and nothing on
   screen is an action. **E2 (waiting buttons).** There are no server buttons. **E3 (reaches an open phone).** I can't
   tell from the screen. Nothing here suggests otherwise.

**Base against head.** Better. The catalogue now shows the screen with real rows instead of the empty state, and it's
calm. Worse: the intro lost its privacy sentence, and the *numbers hidden* claim is now visibly untrue next to RM
amounts.

Verdict: look again. Make the intro say what's actually hidden and where these notifications go (for example,
*numbers other than amounts hidden*, plus one honest line on whether they stay on the phone or sync).

---

## home@capture-off (new tree; base also rendered, about 2,300 px differ)

Opened: `head/catalogue/home_capture-off--minted-light.png`, `--minted-dark.png`, `--firefly-light.png`, `--line-dark.png`;
then `base/catalogue/home_capture-off--minted-light.png` and `diff/home_capture-off--minted-light.png`.

1. **First look.** The pink *Capture may be off* band at the top, then the large *RM 1,931.27*. That's the right
   order: if capture is off, the figure below is suspect. From the screen alone: Home, with a warning that Sen may be
   missing payments.
2. **Reading.** The title and one line read easily, but the timestamp breaks across lines in every look, each in a
   different place: *Fri, 16 / Oct, 17:40.* (Minted), *Fri, / 16 Oct, 17:40.* (Firefly), *16 Oct, / 17:40.* (Line). A
   date split mid-phrase takes a second read. *Payment notifications* is clearer than the base's *notification from
   your apps*.
3. **Tapping.** *Fix* is an obvious filled pill. It sits top right, out of thumb reach, but §7 puts health warnings at
   the top, so that's accepted. The Payday plan row, the Spent card and the balance card keep their chevrons. Nothing
   looks tappable that isn't.
4. **Broken.** Nothing. The band is opaque over Minted's rosette, and the dark band reads well.
5. **Trust.** The band doesn't say what it means for the figures: *Left until payday RM1,931.27* and *Spent
   RM3,873.53* may be missing everything since Friday, and nothing near them hints at that. Across surfaces the same
   fact is worded three ways. The banner says *Capture may be off · No payment notifications since Fri, 16 Oct,
   17:40*. The push stand-in (filmstrip `capture-off/3`) still says *No notification from your apps since Thursday,
   9:12 am*. The widget (filmstrip `capture-off/5`, `/6`) says *Capture is off*. Two different times, and *may be*
   against *is*: a person comparing the push and the banner would wonder which is true. Separately, and unchanged from
   main: the band and its dark-red *Fix* read as an error or a destructive button rather than a warning. *Payment
   notifications* is narrower than *any notification*, and *may be* hedges it, but an honest quiet weekend could
   still raise it; the hedge helps.
6. **E1.** Calm: one alert, then the figure, then cards. **E2.** *Fix* navigates, so there's no server wait to show.
   **E3.** Not visible from a still.

**Base against head.** Better: the time is now in the same *Fri, 16 Oct, 17:40* form as the rest of the app (it was
*Thursday, 9:12 am*), and it names payment notifications. Worse: the longer date now wraps mid-date.

Verdict: look again. Make the banner, the push and the widget say the same thing with the same time, and keep the
date on one line (or put it on its own line whole).

---

## Filmstrips

Frames are 50 ms apart, 11 to a row; I estimated times by frame index at thumbnail scale. Question 10 is
`docs/workflow/qa.md`'s *right motion*.

### capture-off/1: open the dev panel from Home

Opened `metrics/film/capture-off/1.png`.

7. **Answered.** No. About 8 frames (around 400 ms) of a completely still Home before the scrim dims. No press shows
   on the handle at this scale.
8. **Connected.** The sheet rises from the bottom, as a sheet should.
9. **Steady.** The rise is smooth over about 5 frames and settles by roughly 650 ms.
10. **Motion.** The right motion, but its start is late.

Verdict: look again. The handle needs a press within the first frame (dev-only, so low priority).

### capture-off/2: *Surfaces* in the dev panel

Opened `metrics/film/capture-off/2.png`.

7. **Answered.** The panel starts falling at about 300 ms.
8. **Connected.** It doesn't read as going deeper: the panel falls away, bare Home sits for about 8 frames (around
   400 ms), then a second sheet, *Native stand-ins*, rises. It looks like *closed*, then a separate *opened*.
9. **Steady.** No jump, but the gap in the middle is dead time.
10. **Motion.** A sheet replacing a sheet would read better as one sheet changing its content and easing to its new
    height (§8).

Verdict: look again. Go from panel to stand-ins without the bare-Home gap.

### capture-off/3: tap the *Capture may be off* push stand-in

Opened `metrics/film/capture-off/3.png`.

7. **Answered.** The ripple on the stand-in shows at about frame 8 (around 350 ms), then the sheet falls.
8. **Connected.** Yes. The push leads to Home, as its caption says.
9. **Steady.** Home is replaced by its loading skeleton for the rest of the second (more than 600 ms), even though it
   was already on screen. Coming from a real push into a cold app that's fair; in-app it looks like a reload.
10. **Motion.** The sheet falls correctly. The skeleton is the right loading state.

The stand-in's own text is *No notification from your apps since Thursday, 9:12 am*, the base's old wording. It lands
on a banner saying *No payment notifications since Fri, 16 Oct, 17:40*. Two times for one fact.

Verdict: wrong. The push and the banner must give the same words and the same time. If the stand-in is only stale dev
copy, check the Kotlin push text too.

### capture-off/4: open the dev panel again, over the capture-off Home

Opened `metrics/film/capture-off/4.png`.

7. **Answered.** No. About 6 frames (around 300 ms) of stillness before the scrim.
8. **Connected.** The sheet rises from the bottom.
9. **Steady.** The toast *Simulated: the "capture-off" scenario* stays drawn on top of the rising panel and ends up
   over its *Made-up scenario* chips, covering a row of them.
10. **Motion.** The right motion, but the toast should sit behind the sheet or move clear of it.

Verdict: look again. Keep the toast from covering the sheet's content.

### capture-off/5: *Widgets* in the dev panel

Opened `metrics/film/capture-off/5.png`.

7. **Answered.** The *Widgets* chip shows its press at about frame 6. The panel then falls.
8. **Connected.** Same as /2: the panel falls, Home sits bare for about 7 frames, then the *Widgets* sheet rises.
9. **Steady.** The toast again rides over both sheets.
10. **Motion.** Same note as /2.

Verdict: look again. Same as /2.

### capture-off/6: *Fix* on the *Capture is off* widget stand-in

Opened `metrics/film/capture-off/6.png`.

7. **Answered.** The sheet starts falling at about frame 5 (around 200 ms).
8. **Connected.** Then Home with its banner sits still for about 13 frames (around 650 ms). The pushed screen (a
   skeleton) only starts sliding in from the right in the last frame, about 1 s after the tap. For most of that second,
   the *Fix* I tapped looks like it just closed the panel.
9. **Steady.** No jump, but a long stall between closing and opening.
10. **Motion.** The slide from the right is the right motion for a pushed screen, but it starts far too late. The
    widget's wording, *Capture is off*, doesn't match the banner's *Capture may be off*.

Verdict: look again. The fix screen should start sliding in right after the tap, and the widget and banner should
share wording.

### refund/1: *Refund of…* on a Review row (linked; dropped as noise, 368 ms against main's 272 ms)

Opened `metrics/film/refund/1.png`.

7. **Answered.** Not well. About 10 still frames at this scale before the scrim and sheet appear (the metric says
   368 ms). No chip press is visible.
8. **Connected.** The sheet *A refund of which payment?* rises from the bottom, which follows from the chip.
9. **Steady.** The sheet rises, pauses, then rises again by about 50 px near the end as its list grows. It's a
   two-step arrival.
10. **Motion.** A sheet rising is right. The second step should be one eased height change, not a second rise.

Verdict: look again. Show the chip's press at once, and size the sheet before it rises.

### budget/1: *Budgets* tab in Insights' pager (linked; dropped as noise)

Opened `metrics/film/budget/1.png`.

7. **Answered.** The chip fills at about frame 4 (around 150–200 ms).
8. **Connected.** The card slides sideways from *On track* to *Which budgets are at risk?*, in the direction of the
   chip.
9. **Steady.** It settles by about 400 ms with no reflow. The last frame begins a skeleton overlay. I take that to be
   the journey's next tap; if it isn't, it's a stray reload.
10. **Motion.** The pager's slide is the right motion, and no number counts.

Verdict: fine. The chip's press could come a little sooner.

### paid-back/1: *Koh Hoe · BBQ PLACE* on a split question (linked; dropped as noise)

Opened `metrics/film/paid-back/1.png`.

7. **Answered.** The chip darkens at about frame 4.
8. **Connected.** Then the row stays as it was for about 700 ms. *Needs you · 12* only becomes *11*, and the row only
   starts to clear, near the end of the second.
9. **Steady.** In the last frame the cleared row's ghost (*+RM48.80 from Lim K H*) overlaps the *You owe Mei
   RM24.40* card and *A balance check is due* as they close up. That's a see-through frame of stacked text.
10. **Motion.** Slide-out-and-close-up is the right motion, but it starts late and passes through an overlapped frame.

Verdict: look again. Clear the row right after the press, and close the gap without overlapping text.

### balance-check/2: *Check balances* on Accounts (linked; dropped as noise)

Opened `metrics/film/balance-check/2.png`.

7. **Answered.** The button lightens at about frame 5 (around 200 ms).
8. **Connected.** *Balance check* slides in from the right over Accounts, and the tab bar goes, as a task with an end
   should.
9. **Steady.** A skeleton for about 450 ms, then the cards fade in. *Save* finishes darkening a few frames after the
   rest, which is a slight lag but not a flash.
10. **Motion.** The forward push is correct, and no amount animates.

Verdict: fine.

### proposal/3: *Undo* on *Applied. 14 past payments stay as they are* in Sen's sheet (linked; dropped as noise)

Opened `metrics/film/proposal/3.png`, with `proposal/2.png` and `proposal/4.png` for context.

7. **Answered.** The toast fades at about frame 6 (around 250 ms). During the fade its text ghosts over the
   suggestion chips.
8. **Connected.** No. With the toast gone, the suggestion card still says *✓ Applied* for the whole remaining second.
   Only the next filmstrip (`proposal/4`) opens with *Apply · Dismiss* back and an *Undone* toast. For over a second
   after Undo, the screen says the opposite of what I just did. (`proposal/2`, the *Apply* tap, likewise shows no
   change within its second.)
9. **Steady.** It stalls in the wrong state, and the fading toast leaves a see-through frame. In `/4`, the *Undone*
   toast is drawn over the chip row (*What needs me most?*).
10. **Motion.** There's no motion tying Undo to the card.

E2's Ask applies directly: the change waits on something, and nothing says so, so the tap looks ignored. This is the
same on main (1,061 ms), so it isn't B07's regression.

Verdict: wrong. Flip the card to *Apply · Dismiss*, or a pending state, at once on Undo, and do the same for Apply.

### ask/3: *Insights* tab from Home (linked; dropped as noise)

Opened `metrics/film/ask/3.png`.

7. **Answered.** The tab's ripple shows at about frame 6 (around 300 ms).
8. **Connected.** Home crossfades away and the tab bar's indicator moves to Insights, which fits a tab.
9. **Steady.** Two different skeletons in a row. First comes a list-shaped one (round marks and lines, without the
   Insights title), then at about 650 ms the *Insights* app bar and a card-shaped skeleton replace it. It's still a
   skeleton at 1 s.
10. **Motion.** A crossfade is the right one for a tab, but its end state changes shape halfway.

Verdict: look again. Go straight to Insights' own card-shaped skeleton.

---

## Summary

| Entry or filmstrip | Verdict | Fix first |
|---|---|---|
| film `proposal/3` (Undo) | wrong | Card still says *Applied* for more than 1 s after Undo; flip it at once (on main too) |
| film `capture-off/3` (push) | wrong | Push says *since Thursday, 9:12 am*, banner says *since Fri, 16 Oct, 17:40*; make them agree |
| `home@capture-off` | look again | Same fact worded three ways (banner, push, widget); date wraps mid-date |
| `settings/capture/captured` | look again | Intro says *numbers hidden* beside visible RM amounts, and dropped where they're kept |
| film `capture-off/6` (widget Fix) | look again | About 650 ms of still Home before the fix screen starts; widget says *is off* |
| film `paid-back/1` | look again | Row stays about 700 ms after the press, then an overlapped frame |
| film `refund/1` | look again | About 400 ms with no press; sheet rises in two steps |
| film `ask/3` | look again | Two differently shaped skeletons in a row |
| film `capture-off/2` (Surfaces) | look again | Bare Home between two sheets |
| film `capture-off/4` (dev panel) | look again | Toast covers the sheet's chips; slow start |
| film `capture-off/5` (Widgets) | look again | Same as /2 |
| film `capture-off/1` (dev panel) | look again | About 400 ms still before the sheet |
| film `budget/1` | fine | n/a |
| film `balance-check/2` | fine | n/a |

**wrong 2 · look again 10 · fine 2** (2 entries, 12 filmstrips).
