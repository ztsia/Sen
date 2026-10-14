# Handoff

## Where things stand (14 Oct)

*B04 · Redesign* is merged (#13). **In progress: D137's QA tooling**, branch `B04/qa-tooling`, brief
`docs/briefs/B04-qa-tooling.md` (read it: it's the whole design). Then B05.

**Done and pushed:** the brief; the scripted checks' contract (`apps/web/e2e/checks.ts`, stubbed);
the docs: `qa-reviewer` has `Agent` and spawns its own sweep (Haiku) and eyes pass from the `qa`
skill's templates; `.claude/agents/qa-eyes.md` (Opus); `qa/escapes.md` (E1, the redesign's density);
the `brief` skill's nesting line; `CLAUDE.md`'s QA lines and commands.

**Being built by two subagents (uncommitted until reviewed):**
- the checks (`checks.ts`, `checks.spec.ts`, `checks.config.ts`): axe, targets, clipped, overlap,
  covered, keyboard, focus, each shown firing on a broken fixture; plus a survey of today's screens;
- the catalogue (`catalogue.ts`, `catalogue.spec.ts`, `trees/`), `scripts/qa-diff.mjs` with
  `e2e/diff.config.ts`, journeys in Minted light only, screens.spec's per-look axe loops removed.

### What to do next
1. Review both batches; fix or narrow what the checks find on today's screens (no allowlist).
2. Run `pnpm e2e` in six looks and `qa-diff.mjs --base HEAD` twice (must report nothing changed).
3. Port the QA changes to `ztsia/claude_skills` (owner asked, 14 Oct), generalised as that repo's
   template is, on a new branch there. Its `workflow/brain-and-cards` is already merged (its #3).
4. PR *B04 · QA tooling*; then B05.

### Open with the owner
- Nothing yet.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure; D131, Opus decides and briefs
  completely, Haiku at high by default; D132–D137 (owner's calls).
- D137: trees committed and diffed, behaviour in one look, pixels against `main` in all twelve pairs,
  the eyes pass on Opus, the escape log, the reviewer spawning its helpers.
- E2E_LOOKS on CI (two looks on a PR, six nightly, owner 12 Oct) now limits only the catalogue.
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
