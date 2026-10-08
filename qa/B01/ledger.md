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

## Run 2 (8 Oct): fixed and verified by the implementer, no further QA run

The owner, 8 Oct: *after fixing, no need to run QA again; verify and try to reproduce yourself.* So each
finding below was reproduced first (a red test, or QA's own repro), fixed, and shown green, and then
every suite was run again. Run 2's report: https://claude.ai/artifact/3tyzFqm3v81jS1GDM4sYSe.

| # | Sev. | Fix | Red first | Green |
|---|---|---|---|---|
| 1 | Major | `frame.spec.ts` measures every target on a tab screen, Sen's sheet, Scan's sheet and the dev panel, in all six looks (`smallTargets` in `e2e/helpers.ts`, shared with the gallery's test) | QA's probe (tabs 40 px tall): 6 of 6 red, `tab heights 40, 40, 40, 40, 40` | 6 of 6 pass with the real CSS |
| 2 | Major | `hygiene.mjs` also searches binary files as bytes and UTF-16 either way round (`git cat-file --batch`, each blob once), and every commit message in the range | `hygiene.test.mjs`: 3 failed, 7 passed. QA's repro: *Hygiene check passed*, exit 0 | 10/10. QA's repro: 3 problems (UTF-16, binary, a message), exit 1. The real repo: passes, 24 commits, 1.7 s |
| 3 | Minor | `production.spec.ts` parses the CSP: `script-src` and `default-src` are exactly `'self'`, and no directive names any host | QA's probe (`cdn.jsdelivr.net` in `script-src`): red | Pass with the real `vercel.json` |
| 4 | Minor | The lint bans routes too: any `.parseInt`/`.parseFloat`, `globalThis.Number()`, `new Number()`, `valueAsNumber`; outside the money module, `/ 100`, `Math.round(… * 100)`, `Intl.NumberFormat`, `toLocaleString`. The chart's percentages use a new `percent` in `money.ts` | `no-float.test.mjs`: 12 failed, 11 passed | 23/23; lint clean |
| 5 | Minor | `ErrorState` is drawn in the text colour; patterns.md §2 says an error is never `destructive` | `blocks.spec.ts`: red | Pass; screenshot below |
| 6 | Minor | `ReviewRow` raises the Undo toast itself: each answer returns what it said and how to undo it, so no answer can skip it | `blocks.spec.ts`, Drinks & desserts and Groceries: 2 red | Pass |
| 7 | Minor | patterns.md §8: full-width rows that touch are the exception, each whole row the target. A switch row's label now stretches over the row. The gallery's section links are 8 px apart | — (spec and spacing) | QA's AC-64 spec passes |
| 8 | Minor | Status cards: *done* and *waiting* in the text colours; only a warning takes `money-warning`. In patterns.md §2 | `blocks.spec.ts`: red | Pass; screenshot below |
| 10 | Note | Hygiene says how many terms were under 3 characters and ignored, never that the secret is unset | In finding 2's red run | In its green run |
| 11 | Note | A sheet's id under `/s/` goes to its tab's screen, or Home | `edges.spec.ts`, sen, scan-more, cycle: 3 red | Pass |
| 12 | Note | The gallery's charts and their tables read the same rows | `blocks.spec.ts`: red | Pass |
| 13 | Note | A `warning` variant on shadcn's alert and button (with `// Sen:` notes); the health bar uses them, with no colour at the call site | — (source) | Screenshot below |
| 14 | Note | Measured again on this VM: Copper 10 fps, Mercury 12. Both runs are in `docs/cloud.md` §5, which now says the numbers vary by VM | — | — |
| 15 | Note | The dev panel's handle is a 16 px strip in the side gutter; the 48 px test excludes it by name (previews only) | — | Screenshot below |
| 16 | Note | Production builds ship no source maps; previews keep them | — | 0 `.map` files in a production build |
| 9 | Note | Copper's green overspent figure: still the owner's call | — | — |

Left as it is: the lint can't see `JSON.parse` of a number or a string coerced by `* 1` (finding 4).
Banning those would ban ordinary code; review and the types cover them.

**After every fix:** unit 135/135; the slice's e2e 82/82; QA's specs 76/76 (were 74/76); typecheck, lint
and format clean.

`evidence/run2-fixes.png`, at 390×844: the lost page, status cards and the health bar (Minted light),
Groceries' Undo toast, and the same cards in Copper dark.
