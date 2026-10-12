# B04 · QA report, run 3 (scoped re-check and D128's new pieces)

**VERDICT: fix first (small)**

102 criteria, **83 pass**, 9 fail, 10 not reachable (run 2: 70 pass of 90).

Branch `B04/skeleton-rest` at dad3688. Run 2 is `report-run2.md` and `results-run2.json`; run 1 is `report-run1.md`. Servers on ports of my own (5190 dev, 5191 preview, 5192 production), nothing in parallel; the full 707-test e2e was not re-run.

## Re-check

| # | Finding | Status |
|---|---|---|
| 12 | Members: invite and member sheets lack what §9.6 lists | **email fixed, odd dots and lengths left** |
| 15 | *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard | **fixed** |
| 20 | Fixed schemas leave gaps, and the UI takes what they now refuse | **fixed** |
| 21 | Payday scenario: an Approved claim still says its evidence is missing, and Send to ESS stays | **half fixed** |
| 22 | Small leftovers from the friend and closed-link fixes | **fixed** |


### 12 · Members: invite and member sheets lack what §9.6 lists

Email check: `a..b@x.co`, `a@-b.co`, `a@b-.co`, `a@x.co.`, `a@b.c`, `<script>@x.co`, a 312-char address all refused, and the field stops at 254. Still accepted: `.a@x.co`, `a.@x.co`, a 129-character local part, a 70-character domain label (leftover, Note). The rest of 12 (Unlimited at invite, Resend/Revoke, export on Remove) was built in D128: see the new-area checks, all pass.

### 15 · *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard

Send to ESS: shown on /s/claims with a "A stand-in here: in the app, Sen sends it from your phone." note in the preview; absent from the payday scenario where nothing is left to submit; production builds show Not built yet (no shell, no dev tools). Copy still puts 88.00 on the clipboard (four claims). No way to see it in a real browser outside previews.

### 20 · Fixed schemas leave gaps, and the UI takes what they now refuse

Schema probes now all rejected: a 50,000-key setting record, 100k-char sen.answer answer and askId, proposal.answer id, memory.forget id, research.confirm id, 100k sen.send id and file name, a 300-char email. The composer stops at 4000 (fill 5000 -> 4000; pasting 4500 -> 4000). Invite sheet refuses `a..b@x.co`, `a@-b.co`, 312-char addresses. Note: `txn.note` (B03) still takes 100k characters.

### 21 · Payday scenario: an Approved claim still says its evidence is missing, and Send to ESS stays

Half fixed. Payday scenario: Parking is Approved with nothing missing and no Send to ESS; Home reads Left until payday RM5,648.00 and the cycle sheet Income +RM5,648.00 while the card is up; the plan reads Left to spend RM2,839.00 (was 2,991). But when the card ends (Use this plan, or skipping every step) Home and the sheet return to RM5,800.00: see finding 23.

### 22 · Small leftovers from the friend and closed-link fixes

Friend Account row: huimin@example.com. Friend /s/claims: "Claims are off for you. Whoever invited you to Sen can switch them on." Closed and unknown link: `at: null`. A "Already added" toast no longer follows onto the next screen (see 27). member.* refused for non-admins at command level (5 of 5).

## New area (D128): happy and sad paths

| Piece | Result |
|---|---|
| Write off | Works: spending RM48.80 -> RM97.60, Home Spent +RM48.80, Undo restores, double tap one toast. Refused for non-payer, still changing, nothing owed, second write-off. List wording wrong (24) |
| Gap: Yes, I did | Opens `manual?day=2026-10-04` on `4 Oct`; saves at 12:00 KL that day. Impossible dates crash the screen (25) |
| Pay with TNG / Other app… / Save QR; Pay with an app / Save QR | Work as stand-ins, copy the amount (24.40, 22.14), hidden when paid, changing or for the payer |
| Expired invitation | Works; production ignores the flag |
| Members: Unlimited, Resend, Revoke + Undo, export on Remove | All work; member.* refused for non-admins (5 of 5) |

## New findings

### 23 · Minor · Payday: the RM152 claims part re-enters income when the payday card ends

`claimsInSalary` applies only while `db.payday.stage === 'card'`. Home and the cycle sheet leave the claims out while the card is up (RM5,648.00), then jump to RM5,800.00 on *Use this plan* or after skipping every step, although the claims were split out of that salary and nothing undid it.

**Repro:** /?scenario=payday; Payday -> Use this plan (or Skip x4); read Home.

```
card up: hero Left until payday RM 5,648.00 ... cycle sheet Income received +RM5,648.00
after skipping all four: hero Left until payday RM 5,800.00 ... Income received +RM5,800.00
HOME after Use this plan: Left until payday | RM | 5,800.00
```

### 24 · Minor · After a write-off the Shared bills list says the share was paid back

BBQ PLACE reads `1 of 2 paid you back` before and `2 of 2 paid you back` after *Write off*, but Kah Hoe never paid; the split view itself says `written off`. The list counts written-off shares as paid.

**Repro:** More -> Shared bills -> BBQ PLACE -> Write off -> Back.

```
SHARED before: ... BBQ PLACE | 10 Oct · You paid · 1 of 2 paid you back
SHARED after write-off: ... Settled | BBQ PLACE | 10 Oct · You paid · 2 of 2 paid you back
```

### 25 · Minor · `manual?day=` checks the shape of the date, not that it is a date

The router accepts any `dddd-dd-dd`. `2026-13-45` and `0000-00-00` throw inside `new Date(...).toISOString()` and show "Something went wrong / This screen didn't open" (the error boundary catches it, no blank page). `2027-01-01`, `1999-01-01` and `9999-12-31` open the form on a future or ancient day, and a payment can be saved there. Reachable only by a typed or old link; Sen's own buttons carry a valid day.

**Repro:** /s/manual?day=2026-13-45

```
day "2026-13-45"   NO FORM | Something went wrong | This screen didn't open
day "0000-00-00"   NO FORM
day "9999-12-31"   form
```

### 26 · Note · A no-op answer still offers Undo

Inviting an address already invited says `They are already invited` with an Undo that undoes nothing (the double-tap guard only covers a repeat within 500 ms). Same for the other `Already …` answers.

**Repro:** Invite dup@example.com twice, 1 s apart.

```
toasts: ["They are already invited\nUndo"]
```

### 27 · Note · Choosing the next file takes down the previous Undo toast

The fix for the stale `Already added` toast calls `dismissToast()` for whatever toast is up, so `Attached to RM64.13 on Ryt Bank` + Undo disappears when the next receipt's file is picked, a few seconds into its six.

**Repro:** Scan -> Done -> Scan tab -> pick a different file.

```
after Done toasts: ["Attached to RM64.13 on Ryt Bank\nUndo"]
on scan page, toasts: ["Attached to RM64.13 on Ryt Bank\nUndo"]
after picking a new file, toasts: []
```

## Probes

| Broke | Caught | Note |
|---|---|---|
| Run 3: write-off not added to my share | yes | splits.test.ts "writes off what is still owed" failed (expected 4880 to be 9760) |
| Run 3: write-off allowed for a non-payer | yes | same test failed (expected [Function] to throw) |
| Run 3: write-off allowed with nothing owed / still changing | yes | same test failed |
| Run 3: member.* guard for non-admins dropped | yes | admin.test.ts "resends and revokes…only for the admin" failed |
| Run 3: revoke allowed on a signed-in member | yes | admin.test.ts failed |
| Run 3: invite email double-dot check dropped | yes | admin.test.ts "invites with Unlimited, and rejects emails…" failed (a..b@x.co) |
| Run 3: Unlimited ignored at invite | yes | same test failed (expected false to be true) |
| Run 3: manual saves "now" instead of the gap day | **no / unproven** | the suite asserts the URL day and the "4 Oct" label only; I could not read the saved time reliably after the probe (my db() read returned another row), so this one is unproven. Before the probe, my run showed the payment saved at 2026-10-04T04:00:00Z (12:00 KL). |

## What I couldn't test, and why

- **Findings 4, 7, 8, 13 (rest), 14 (now built), 16, 18**: left to the owner or later slices; not re-checked except 13 and 14, whose D128 pieces are in the new-area checks
- **The 707-test e2e suite**: ran in the main session; I ran only my own specs
- **Saved day of a gap payment under a probe**: my db() read returned another row after the probe; unproven
- **The paying island and the real hand-offs to TNG**: stand-ins only; device (docs/local.md)

The `qa/e2e/b04-*.spec.ts` ports are back at 5180/5181/5182. Specs for this run: `b04-r3-*.spec.ts`.
