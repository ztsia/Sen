# Handoff

## Where things stand (15 Oct)

*B04 · Redesign* is merged (#13). **D137's QA tooling is built**, branch `B04/qa-tooling`, brief
`docs/briefs/B04-qa-tooling.md`. Its PR *B04 · QA tooling* comes once the six-look e2e run is green.
Then B05.

**Built and reviewed:**
- `apps/web/e2e/catalogue.ts`: 87 entries (every registry screen, its states and the scenario
  variants); `reading` is unexplored (it shows only while the made-up reader works).
- `apps/web/e2e/trees/`: 87 committed accessibility trees (Minted light). Playwright writes `_` as
  `-` in their names, and digits as `\d+`, so a changed amount shows in the pixels, not the tree.
- `scripts/qa-diff.mjs` with `e2e/diff.config.ts`: main's build in a worktree against the branch's,
  every entry in all twelve pairs, about 31 min (5 min with `--looks minted`). Twice against itself:
  nothing changed. Against main: 87 trees new, 0 pixel pairs changed.
- `apps/web/e2e/checks.ts` (+ `checks.spec.ts`, 32 fixtures, `checks.config.ts`): axe, targets,
  clipped, overlap, covered, keyboard, focus, each proven to fire; narrowings commented.
- Journeys once in Minted light; screens.spec's per-look loops moved to Minted, light and dark.
- What the checks found, fixed: charts' hidden focus ring; the Undo toast over Ask Sen (sonner's
  phone rule ignored the right offset); a needless toast over Add expense after Sen's gap ask;
  Copper's coin keeping its fallback face under reduced motion (avatars redraw when fonts load).
- Docs: `qa-reviewer` has `Agent` and spawns its sweep (Haiku) and `qa-eyes` (Opus) from the `qa`
  skill's templates; `qa/escapes.md` (E1, density); `brief` and `qa` say waiting costs.

**claude_skills** (owner asked, 14 Oct): branch `workflow/qa-diff` pushed with the generic `qa`
skill, `qa-reviewer`, `qa-eyes`, CLAUDE.md template rows and `examples/qa/escapes.md`. Still to add:
Sen's tooling files as `examples/qa/` (checks.ts, catalogue.spec.ts, qa-diff.mjs, diff.config.ts),
then the owner opens or asks for its PR.

### What to do next
1. The six-look `pnpm e2e` on f25f5bd: green → log usage, open PR *B04 · QA tooling*.
2. Copy the tooling into claude_skills' `examples/qa/`, push.
3. B05 (`docs/briefs/B05-server.md`), QA'd the new way.

### Known, left on purpose
- `/s/new-look` under `?look=` sits in a view transition about 4 s (`arrive()` waits for a store
  change the override blocks). The checks wait it out; the reveal is B14's.
- One `keyboard` finding on balance-check, Copper light, appeared once and never again: watch it.

### Open with the owner
- Merge *B04 · QA tooling* when its PR is up; open or ask for claude_skills' `workflow/qa-diff` PR.

## Don't argue again
- D129–D137 (owner's calls). D137: trees committed and diffed, behaviour in one look, pixels
  against `main` in all twelve pairs, the eyes pass on Opus, the escape log, the reviewer spawning
  its helpers. E2E_LOOKS (two on a PR, six nightly) now limits only the catalogue.
- Home fits one screen at 390×844; Insights is one card at a time.
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
