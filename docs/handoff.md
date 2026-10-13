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

**In progress: QA (the `qa` skill), step 2.** A Haiku sweep agent (high effort) is running the
typecheck, lint, unit tests and the full e2e with `E2E_SHOTS`, writing raw results to
`qa-artifacts/B04-redesign/sweep/` (`index.md` when done, about an hour). Its report arrives as a
notification; if the session lost it, read `sweep/index.md`, or re-run the sweep.

### What to do next (this session continues after a compact)
1. When the sweep reports: read `qa-artifacts/B04-redesign/sweep/index.md`. Fix any failure that is
   the product's yourself; a test's old wording, brief a Haiku agent with the exact change.
2. Spawn `qa-reviewer` per the `qa` skill, thin prompt only: branch `B04/redesign`, label
   *B04 · Redesign*, brief `docs/briefs/B04-redesign.md`, the sweep's folder, and its record goes in
   `qa/B04-redesign/`. Nothing about how it was built. Run it in the background.
3. Commit its record at once, publish the report (`node scripts/qa-report.mjs qa-artifacts/<dir>`,
   then the Artifact tool), fix findings by the skill's tiers, then
   `cd /home/user && node Sen/scripts/usage.mjs --log B04-redesign` (this session's transcripts
   are under `/home/user`'s project folder; move the row it writes into `Sen/docs/usage.md` if it
   lands elsewhere), and open the PR *B04 · Redesign*.
4. A dev server may still be up on port 5180 (started from `apps/web`); stop it with
   `kill $(pgrep -f "vite.*5180")` in its own command, never inside a longer one (`pkill -f` once
   matched its own shell).

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
  implementer on Haiku at high) is pushed; the owner opens or asks for its PR.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure; D131, Opus decides and briefs
  completely, Haiku at high by default (owner's calls).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
