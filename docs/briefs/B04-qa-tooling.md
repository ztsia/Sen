# B04 · QA tooling: diff-driven QA, and its quality half

Branch `B04/qa-tooling`, from `main` after *B04 · Redesign* (D137). Before B05.

**Why:** QA's sweep re-checked the same behaviour in all twelve look-and-mode pairs (about 470
journey runs, an hour), and the reviewer read hundreds of unchanged screenshots. From B05 on most
slices change few screens. And the owner still found by hand what QA never asked about, such as the
redesign's density (D129). So QA records what each screen *is*, diffs it against `main`, looks hard
at only what changed, and measures by script what a person shouldn't have to spot.

## What it adds

1. **The catalogue** (`apps/web/e2e/catalogue.ts`): every screen in `screens/registry.ts`, opened
   on the golden scenario (Wei Ming's month, `fake/scenario.ts`) at the scenario's `NOW`, by a path
   or, for a sheet, a path plus the taps that open it. Plus the states `screens.spec.ts` reaches
   (empty, error, offline). An entry's id is the registry id, or `<id>@<state>`. A registry screen
   without an entry fails a test unless it's in `UNEXPLORED` with its reason; the diff report lists
   them (*a screen with no recorded tree is unexplored*, D137).
2. **Trees** (`apps/web/e2e/trees/<entry>.aria.yml`, committed): each entry's accessibility tree,
   `toMatchAriaSnapshot` on `body`, recorded in Minted, light. CI fails when a tree changes and the
   commit didn't update it, so every PR's diff shows which screens changed and how. Update with
   `pnpm --filter @sen/web e2e:trees`.
3. **Pixels against `main`** (`node scripts/qa-diff.mjs`): builds `main`'s preview in a worktree
   and the branch's, shoots every entry in all twelve pairs from both, whole screen (the viewport
   grown to the screen's scroll height, capped at 4000 px), and compares them with `pixelmatch`.
   Writes `qa-artifacts/<branch>/diff/`: `index.md` and `index.json` (per entry: tree unchanged,
   changed with its diff, new or removed; per pair: pixels changed, with base, head and diff images),
   the unexplored screens, and every scripted check's finding. Comparing `main` with itself must
   report nothing changed.
4. **Scripted checks** (`apps/web/e2e/checks.ts`), on every entry in every pair, every run: axe
   (WCAG 2.1 AA, so text contrast), 48 px targets, clipped text, overlapping text or targets, a
   target under something fixed (a toast, the tab bar, a sheet's footer) that scrolling can't free,
   a field or the form's main button hidden by the keyboard (the viewport shrunk to 508 px, as
   Android resizes it), and a focus ring that can't be seen. The journeys run the cover check at
   every screenshot, so a toast over a button is caught where toasts happen.
5. **Behaviour in one look.** The journeys and pins run in Minted, light; the looks are covered by
   the catalogue's pixels and checks. `E2E_LOOKS` now limits only the catalogue (two looks on a PR,
   all six nightly and in QA, owner 12 Oct).
6. **The quality half** (docs only):
   - the **eyes pass**, `.claude/agents/qa-eyes.md` on Opus: each changed screen at full size, one
     at a time, answering fixed questions in writing (D137), plus one per kind in `qa/escapes.md`;
   - **`qa/escapes.md`**: every bug the owner finds by hand, why QA missed it, its pin, and its
     question. The redesign's density is the first;
   - **the reviewer spawns its helpers** (`Agent` in `qa-reviewer`'s tools): the sweep on Haiku and
     the eyes pass on Opus, from templates in the `qa` skill that fix each one's model and prompt.

## Done when

- `pnpm --filter @sen/web e2e` passes on the branch, with the catalogue and trees, in two looks and
  in six; the run is shorter than B04's hour.
- `node scripts/qa-diff.mjs --base main` on the branch reports only what the branch changed, and with
  `--base HEAD` (the branch against itself) reports no tree and no pixel changed, twice in a row.
- Each scripted check is shown to fire on a page built to break it (`checks.spec.ts`), and to stay
  quiet on the same page fixed.
- Whatever the checks find on today's screens is fixed, or the check is narrowed with a reason in
  its comment. No allowlist of known failures.
- The `qa` skill, `qa-reviewer`, `qa-eyes`, the `brief` skill's line on nesting and `CLAUDE.md`'s
  QA lines describe the new run; typecheck, lint, format and unit tests are clean.
