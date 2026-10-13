# Handoff

## Where things stand (13 Oct)

**B04 and its review fixes are merged** (ztsia/Sen#11, ztsia/Sen#12, D129's size hierarchy).
On the phone the owner found the main tabs fine, but most other screens plain lists of text, where
facts and actions look alike. **D130 decides the redesign:** calm, card-based screens.
Its brief is `docs/briefs/B04-redesign.md`, branch `B04/redesign`, PR *B04 · Redesign*.
**B05** (`docs/briefs/B05-server.md`) waits until it's merged.

So far on `B04/redesign`: the brief, D130, and this handoff. **No code yet.**

### What to do first (a fresh session)
1. Read `docs/briefs/B04-redesign.md` in full. It holds the rules, the new blocks, every screen's
   changes, the phases, and the Haiku A/B test the owner asked for.
2. **Phase 1, yourself:**
   - Rewrite `patterns.md` §7 to D130.
   - Build the blocks in `blocks/` and the gallery.
   - Rebuild `txn`, `settings` and `settings/appearance` as reference screens.
   - Push, and move `review` to the branch, so the owner can check them on *Sen review*.
3. Then start batches A–C on Sonnet, and D–E twice (Sonnet and Haiku, each in a worktree), from
   short pointer briefs (*Briefs stay small* in the brief). Don't wait for the owner's phone check,
   unless they redirect.
4. Run the Haiku sweep, then e2e, then QA, then the PR.

### Decided with the owner (13 Oct; all recommended options taken)
- **Home fits one screen** at 390×844 by compressing: the payday plan becomes a one-line strip, the
  chart gets shorter, and Sen's note is clamped. A test asserts no scroll.
- **Insights is one card at a time:** sideways swipe with named steps on top.
- **Order:** phase 1 reference screens checked on the phone, then the batches.
- **This redesign comes before B05,** on its own branch.
- **48 px stays the touch target**, invisible; what's drawn follows D129's levels. Review's answer
  chips are still 40 px Toggles: make them `chip` size.
- **The owner asked for the screens they didn't mention too:** all are in the brief's table.

### Open with the owner
- The A/B result goes in CLAUDE.md's *Models and subagents* once measured.
- ztsia/claude_skills#2 (the shared `uiux` update) waits for the owner's merge. Add D130's rules
  there after this slice.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure (owner's calls).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
