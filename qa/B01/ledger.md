# B01 · QA ledger

Every fix for QA B01 (`report.md`, 8 Oct 2026), its tier under the `qa` skill, and its evidence.
Fixed on `B01/design-system`, 8 Oct, by the session that took over from the builder.

## The batch is tier 3: a fresh full QA run

Fixes 1, 2, 3, 4, 7, 9 and 12 change shared code: navigation (the router, the tab bar), a
`components/ui/` file (`toggle-group.tsx`), the theme store, and the no-float rule, which guards
CLAUDE.md non-negotiable 1. Any one of these makes the batch tier 3, so a new `qa-reviewer` runs
every phase again. The red and green output below is kept anyway, as evidence for each fix.

| # | Sev. | Fix | Files | Tier, and why |
|---|---|---|---|---|
| 1 | Major | An unknown `/s/<id>` redirects Home in `beforeLoad`, replacing itself. A path that matches nothing, or a screen that throws, shows the shared `ErrorState` inside the frame (`screens/lost.tsx`), with the tab bar and *Go to Home* | `router.tsx`, `frame/app-shell.tsx`, `screens/lost.tsx` | 3: navigation |
| 2 | Major | A long-press swallows the one click its release makes, wherever it lands (captured on the window, given up 400 ms after the lift) | `lib/long-press.ts` | 3: a pattern (patterns.md §6, the long-press) |
| 3 | Major | `Number()`, unary `+` and `parseInt` are banned in all app, API, worker and core source, not only `money*` files. Only `packages/looks` (SVG geometry) is exempt. The dev panel's one unary `+` became a lookup | `eslint.config.js`, `dev/dev-panel.tsx`, `scripts/no-float.test.mjs` | 3: a non-negotiable |
| 4 | Minor | The store keeps the look asked for apart from the look shown, and switches `data-look` only once the look's code has arrived. If it can't (offline), the look on show stays and the dev panel goes back to it | `theme/store.ts`, `theme/look.tsx`, `dev/dev-panel.tsx` | 3: the theme, a shared store |
| 5 | Minor | While a toast is up, a change replaces it in place; once it's going (Undo, swipe, timeout), the next change takes a fresh id | `blocks/toast.ts` | 2 alone (the slice's own block); rides the tier-3 run |
| 6 | Minor | Review's count sits in a polite live region that's always there, so a change is announced | `frame/tab-bar.tsx` | 3: navigation (the tab bar) |
| 7 | Minor | The Home tab goes back to Home's own history step when it's behind, and otherwise replaces the step: it never stacks a second Home | `frame/tab-bar.tsx` | 3: navigation |
| 8 | Minor | The hygiene check reads file paths (the string masked in the output) and, given a range, every commit in it. CI passes the PR's or the push's range, with full history | `scripts/hygiene.mjs`, `scripts/hygiene.test.mjs`, `.github/workflows/ci.yml` | 2 alone; rides the tier-3 run |
| 9 | Minor | The gallery's and dev panel's dynamic imports compare `__SEN_ENV__` in place, so a production build has no such chunks. A build is production unless `SEN_ENV=preview` or `VERCEL_ENV=preview` says otherwise | `router.tsx`, `frame/app-shell.tsx`, `lib/env.ts`, `sen-env.d.ts`, `vite.config.ts`, `playwright.config.ts` | 3: navigation, and how the slice builds |
| 11 | Note | The frame shows the offline banner while the connection is down (AC-49) | `lib/online.ts`, `frame/app-shell.tsx` | 3: the frame |
| 12 | Note | A toggle-group item is never narrower than 48 px (shadcn's `min-w-0` let *0* and *5* shrink to 35 px) | `components/ui/toggle-group.tsx` | 3: `components/ui/` |
| 13 | Note | The gallery's money form toasts the formatted amount (`formatSen`), not the raw text | `dev/gallery.tsx` | 1 |
| 15 | Note | The slice's long-press test now uses real touch events too (`e2e/edges.spec.ts`) | tests | — |
| 10 | Note | **Not a code change.** `tokens`, `extra` and `fonts` aren't `DIR` fields, by design: they're CSS generated from `theme.css` (one source, and colours never wait on a look's code). Recorded in `patterns.md` §1 and the brief, so the next reader doesn't hit the same mismatch | docs | — |
| 14 | Note | **For the owner:** Copper's overspent figure in verdigris green. Left as designed; in the handoff | — | — |

Also found while re-running QA's FLOW-3: a reload keeps the history's sheet steps, and React's ids repeat
from one load to the next, so after a reload, back could land on a stale step that passed for the open
sheet. Each sheet step now carries the page load's own token (`lib/back-close.ts`). Tier 3 (a pattern).

The large figure's live drawing (Mercury, Copper, Firefly, Line) now skips canvases off screen, as the
avatars do (`packages/looks/src/engine.ts`: `watchOnScreen`, `offScreen`). It's the app's runtime loop,
not the design: no SVG changes, `port.test.ts` unchanged and green.

## Evidence

**3, red then green** (`npx vitest run scripts/no-float.test.mjs`):

```
× fails on a planted Number() where amounts flow
× fails on a planted a unary + where amounts flow
× fails on a planted parseInt where amounts flow
Tests  3 failed | 8 passed (11)
---
Tests  11 passed (11)
```

**8, red then green** (`npx vitest run scripts/hygiene.test.mjs`):

```
× fails on a denylist string in a file path, and never prints it
× fails on a denylist string or private/ file in an earlier commit of the PR's range, since deleted
Tests  2 failed | 5 passed (7)
---
Tests  7 passed (7)
```

**2, red then green.** `e2e/edges.spec.ts` *a finger's long-press on Scan…* against the old
`long-press.ts`: `Expected pattern: /\/(\?.*)?$/  Received string: "http://localhost:4173/s/crop"`. With
the fix: passes.

**5:** QA's FLOW-7, `--repeat-each 5`: 5 passed.

**After every fix:** unit 119/119; the slice's e2e 68/68 (new: `e2e/edges.spec.ts`, and a toast test in
`blocks.spec.ts`); QA's own specs 48/48 (were 39/48); typecheck, lint, format clean; `looks.gen.css`
up to date; hygiene passes over the branch's 18 commits.
