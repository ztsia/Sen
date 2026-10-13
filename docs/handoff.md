# Handoff

## Where things stand (13 Oct)

**B04 and its review fixes are merged** (ztsia/Sen#11, ztsia/Sen#12, D129's size hierarchy).
On the phone the owner found the main tabs fine, but most other screens plain lists of text, where
facts and actions look alike. **D130 decides the redesign:** calm, card-based screens.
Its brief is `docs/briefs/B04-redesign.md`, branch `B04/redesign`, PR *B04 · Redesign*.
**B05** (`docs/briefs/B05-server.md`) waits until it's merged.

**Phases 1 and 2 are done and pushed** (13 Oct). D130's blocks, `patterns.md` §7, and every screen
rebuilt in batches A–E; `SettingsRow` and `DetailPage` are gone; `apps/web/scripts/shots.mjs` takes
screenshots. The e2e tests follow the redesign, and the product bugs the run found are fixed (avatar
contrast, unnamed progress bars, the pager's focus, stat tiles truncating, two disclosures whose
48 px extension covered Back, Subscriptions' 40 px toggle). Last run, Minted and Copper: 308 of 312,
the 4 being that toggle, since fixed.

**In progress: QA (the `qa` skill), step 3.** The Haiku sweep passed: typecheck, lint, 301 unit
tests, and 720 of 720 e2e in all six looks (`qa-artifacts/B04-redesign/sweep/`). A fresh
`qa-reviewer` (Sonnet) is running in the background, writing to `qa/B04-redesign/`. If the session
lost it, spawn a new one with the same thin prompt (the `qa` skill, step 4).

### What to do next (this session continues after a compact)
1. When the reviewer reports: commit its record at once, publish the report
   (`node scripts/qa-report.mjs qa-artifacts/B04-redesign`, then the Artifact tool), fix findings
   by the skill's tiers.
2. `cd /home/user && node Sen/scripts/usage.mjs --log B04-redesign` (this session's transcripts are
   under `/home/user`'s project folder; move the row into `Sen/docs/usage.md` if it lands
   elsewhere), then open the PR *B04 · Redesign*.
3. Stop stray dev servers with `kill` on a pid from `pgrep -f vite` in a separate command: a
   `kill $(pgrep -f ...)` matches its own shell.

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
- `claude_skills` branch `workflow/brain-and-cards` (D130's uiux rules, D131's model principle, the
  implementer on Haiku at high, the `brief` skill) is pushed; the owner opens or asks for its PR.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure; D131, Opus decides and briefs
  completely, Haiku at high by default (owner's calls).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
