# Handoff

## Where things stand (12 Oct)

**B04 is merged** (ztsia/Sen#11). The owner's phone review of it is being answered on
`B04/skeleton-rest`, restarted from `main` (a fast-forward of the merged branch). Its PR, when done,
is *B04 · Review fixes*. **B05** (`docs/briefs/B05-server.md`, branch `B05/server`) starts after.

### Done and pushed on `B04/skeleton-rest`
- **D129, one size hierarchy** (`docs/ui/patterns.md` §2 *Sizes*). The owner found every screen dense
  and overwhelming. Five levels each set text, drawn height, icons and spacing together: title 22,
  section 17 semibold, body 15, secondary 13, caption 12, through Tailwind's `--text-*` (`app.css`).
  **48 px is the touch target, not the drawn size:** Button sizes `default` 48 (one main action per
  screen), `sm` 40, `chip` 32, `icon` 40, each extended to 48 by the `tap` utility (`::after`).
  `e2e/helpers.ts`'s `smallTargets` reads that box. Rows are 56 px with 32 px marks; payees in capitals
  show through `readableName` (`lib/names.ts`). Filters scroll in one row.
- Both sweeps applied it to every screen (Sonnet, reviewed); typecheck, lint and unit tests pass.
- Home: the Spent card is chart-first (`PaceSpark` in `blocks/charts.tsx`); `Item`'s corners are the
  look's `--radius-card`, so the balance strip isn't square.
- Sheets: vaul's `repositionInputs` is off (`blocks/sheet.tsx`): it pinned Sen's sheet at half height
  when the input blurred before the keyboard closed. A test in `e2e/edges.spec.ts` covers it.
- The app bar mounts the wordmark through `LookMarkup`, so Mercury's and Line's canvases paint.
- `uiux` skill updated (hierarchy and density checklist); the general form is ztsia/claude_skills#2.

### What to do first
- The full e2e run (all six looks) passed after the test fixes: 630 + 82 re-run; the only failures were
  tests matching payees in capitals, and a toggle group's box counted as a target. The branch is on
  `review` for the owner's phone check, and its PR *B04 · Review fixes* is open.
- Act on what the owner reports from the phone, on this branch; then B05 from `main` once merged.

### Open with the owner
- ToggleGroup choices (manual's category, Appearance, payday) still wrap rather than scroll; judged
  fine for long choice lists. Raise it if they look heavy on the phone.
- Next time a sweep has a mechanical half, split it: decisions listed by Sonnet or the main session,
  the edits by Haiku.

## Don't argue again
- D129's levels and the 48 px target rule (owner's call, 12 Oct).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
