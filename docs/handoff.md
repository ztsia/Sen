# Handoff

## Where things stand (14 Oct)

**The B04 redesign (D130) is done; its PR *B04 · Redesign* waits for the owner's merge.** Branch
`B04/redesign`. Calm, card-based screens throughout, plus the owner's list from QA run 3: bank-style
amounts (D132), a goal's money in its own account (D133), subscriptions and goals added by hand
(D134), buttons that open Sen start the message and show its avatar (D135), group labels as captions
(D136); the Scan tab opens the camera, its long-press the menu.

**QA:** four full runs and a scoped re-check. Run 4 (fresh, tier 3) said *fix first* (1 Major, 6
Minor); its fixes went back to the same reviewer, scoped (tier 2), which said **ship**; its five
small findings were fixed by the main session (tier 1). Record: `qa/B04-redesign/` (`report.md` is
run 4 and its re-check; `ledger.md` has every tier decision and its evidence), published at
https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa. Last checks on d6023d2: typecheck, lint, unit
tests, full e2e 833 passed. Usage logged (`docs/usage.md`; `scripts/usage.mjs --from /home/user`
when the session started outside the repo).

**Device checks for the owner** are queued in `docs/local.md` (QA runs 3 and 4): Select all in a
money field, the number pad, the Scan tab's camera, TalkBack's focus after a sheet.

### What to do next
1. **When the PR is merged: D137's QA tooling, before B05**, on its own branch with a brief:
   - diff-driven QA: each screen's accessibility tree (`toMatchAriaSnapshot`) on the golden scenario,
     behaviour in one look, pixels against `main` in all twelve look-and-mode pairs, and the reviewer
     gets only the screens that changed, with each diff;
   - its quality half: a human-eyes pass on Opus over each changed screen at full size, answering
     fixed questions in writing; `qa/escapes.md` (the owner's hand-found bugs, each a pin and a
     question; the redesign's density is the first entry); scripted visual checks (clipped text,
     overlaps, a button under a toast or keyboard, invisible focus, contrast);
   - the reviewer spawns its own helpers (add `Agent` to `qa-reviewer`'s tools; subagents may nest to
     three levels), from templates in the `qa` skill that fix each helper's model and prompt.
   Update the `qa` skill and `CLAUDE.md`'s QA lines to match.
2. Then **B05** (`docs/briefs/B05-server.md`).

### Left on purpose (in the ledger)
- The hand tick for a payday move and the plan's moves into a goal's account are B30's (its brief
  has them, D133). The Add sheets don't hand focus back on close (queued for TalkBack). Four
  paragraphs run 3–4 lines; the D137 eyes pass will judge them.

### Open with the owner
- Merge *B04 · Redesign*.
- `claude_skills` branch `workflow/brain-and-cards` (D130's uiux rules, D131's model principle, the
  implementer on Haiku at high, the `brief` skill) is pushed; the owner opens or asks for its PR.
  D137 will change its `qa` skill too.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure; D131, Opus decides and briefs
  completely, Haiku at high by default; D132–D137 (owner's calls).
- Home fits one screen at 390×844; Insights is one card at a time; the new-look reveal's animation is
  B14's.
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
