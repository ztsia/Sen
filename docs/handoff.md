# Handoff

## Where things stand (13 Oct)

**B04 and its review fixes are merged** (ztsia/Sen#11, ztsia/Sen#12, D129's size hierarchy).
On the phone the owner found the main tabs fine, but most other screens plain lists of text, where
facts and actions look alike. **D130 decides the redesign:** calm, card-based screens.
Its brief is `docs/briefs/B04-redesign.md`, branch `B04/redesign`, PR *B04 · Redesign*.
**B05** (`docs/briefs/B05-server.md`) waits until it's merged.

**Phase 1 is done and pushed** (13 Oct), and `review` points at it for the owner's phone check:
D130's blocks in `apps/web/src/blocks/` (`tile`, `group`, `facts`, `choice`, `steps`) and the gallery,
`patterns.md` §7 rewritten, and `txn`, `settings` and `settings/appearance` rebuilt as the references.
`apps/web/scripts/shots.mjs` takes screenshots for any batch.

**Phase 2 is running:** batches A, B and C on Sonnet in the main tree; D and E twice each (Sonnet and
Haiku), each in its own worktree, for the A/B test. If this session ends before they report, re-run a
batch from its rows in the brief: nothing of theirs is committed until reviewed.

### What to do next
1. Review each report and diff, fix what's off, and commit. For D and E, compare the two runs (cost
   from `node scripts/usage.mjs`, review fixes needed, screenshots), keep the better, and log the result.
2. Remove `DetailPage` and `SettingsRow` once no screen uses them.
3. Haiku sweep of screenshots in all six looks, then e2e fixes, then QA, then the PR *B04 · Redesign*.

### Decided with the owner (13 Oct; all recommended options taken)
- **Home fits one screen** at 390×844 by compressing: the payday plan becomes a one-line strip, the
  chart gets shorter, and Sen's note is clamped. A test asserts no scroll.
- **Insights is one card at a time:** sideways swipe with named steps on top.
- **Order:** phase 1 reference screens checked on the phone, then the batches.
- **This redesign comes before B05,** on its own branch.
- **48 px stays the touch target**, invisible; what's drawn follows D129's levels. Review's answer
  chips are still 40 px Toggles: make them `chip` size.
- **The owner asked for the screens they didn't mention too:** all are in the brief's table.
- **The new-look reveal's animation is B14's** (`patterns.md` §9). Here only its card follows D130;
  the skeleton keeps a still placeholder.

### Open with the owner
- The A/B result goes in CLAUDE.md's *Models and subagents* once measured.
- ztsia/claude_skills#2 (the shared `uiux` update) waits for the owner's merge. Add D130's rules
  there after this slice.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure (owner's calls).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
