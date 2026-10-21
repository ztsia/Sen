# B05 · Feel: the eyes pass (run 1)

Done by the QA reviewer itself (Sonnet), because it had no Agent tool to spawn `qa-eyes`. Weaker than
the Opus pass the skill calls for: read it as a limited record.

The diff report lists three changed entries and no new ones; every change is at most 1/255 per
channel (anti-aliasing), so there are no changed screens to look at full size. What I looked at:

| Entry | What I looked at | Verdict |
|---|---|---|
| `txn` (minted, light and dark), `account` (line), `settings` (line) | the base and head pixels, differenced: 1100-10500 pixels, all 0 or 1 per channel | fine: no visible change |
| Mid-push, 90 ms in (`FLOW-2-step-2-mid-push-90ms.png`) | the old Payments screen slid left and dimmed, the new Payment screen (still on its skeleton) coming in from the right, the tab bar and Sen's button in place, the amount `RM64.13` fading as the shared element | look again: the pushed screen is a skeleton while it slides, then content fades in; it reads as intended, but a payment's detail has no content during the push |
| Filmstrip `fix/3` (a category sheet opening) | the sheet rises after about 200 ms at 4x CPU; the tapped fact has no visible response in its first frames | fine for the sheet; the tiny tapped cell's ripple is too small to see in the strip |
| Filmstrip `balance-check/3` (Save, then typing) | the ripple on the Save button is visible in frames 3-6, a faint circle on the dark button, clipped to its pill | fine |
| `FLOW-9-step-3/4` category sheet | the sheet jumps from full height to a short one with no in-between frame | wrong: finding 2 (the height should ease) |
| `FLOW-2-step-3-review-from-pushed.png` | Review tab from a pushed screen crossfades; the Home tab from the same place slides the screen out to the right | wrong: finding 3 (a tab should crossfade) |

I did not look at the motion's smoothness at speed (stills only), and no filmstrip of a push step
was among those I opened.

## Run 2: not run

The run-2 reviewer had no Agent tool, so `qa-eyes` (Opus) was not spawned. The main session should spawn it
with the diff report (`qa-artifacts/B05-feel/diff/index.md`), asking it to look hard at the filmstrips
`fix/4` and `split-stuck/2` (the sheet's creep, QA run 2 finding 1), `email-setup/1` (about 350 ms before the
slide starts), `ask/4`, and the stills `FLOW-R2-9-step-1..6` (a sheet's top edge dropping from y=168 to y=292
over 2.5 s). From a filmstrip (read by the run-2 reviewer, not an eyes pass): `fix/4` shows the short sheet
in place at 250 ms and then drifting for the rest of the second.
