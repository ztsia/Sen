# Handoff

Rewritten 8 Oct 2026 by the session that built B01. The protocol is in `CLAUDE.md`, *Session
rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01 · Design system and the six looks is built on `B01/design-system`, but QA says fix first**
  (76 criteria: 67 pass, 9 fail). The session ran out of quota, so nothing from QA is fixed yet and
  **no PR is open**. Fix the Majors below on the same branch, re-run QA, then open the PR.
- Built: the pnpm workspace (`apps/web`, `packages/core`, `packages/looks`), CI and the hygiene check;
  the money module; Tailwind v4 and shadcn on the six looks' tokens, fonts self-hosted; the six looks
  ported as lazy `DIR` modules; the frame (tab bar, Sen's button, app bar, large figure); every
  building block in `patterns.md` §7 and the chart base; the dev panel, `/dev/gallery` and the screen
  registry. Commands and layout are in `CLAUDE.md`.
- **Verified:** 114 unit tests and the slice's 58 Playwright tests pass; typecheck, lint, format
  clean. QA's own 48 specs are in `qa/e2e/` (9 fail: the findings below). Its criteria and flows are
  in `qa/B01/`. Its full report is `qa/B01/report.md`, with `qa/B01/results.json`.
- **Not verified yet:** CI on GitHub (it runs on the PR), the Vercel deploys, the phone.

## QA findings to fix first (QA B01, 8 Oct)

1. **Major:** `/s/<unknown id>` and unknown paths show TanStack's default error page, with no way
   back. `AnyScreen` throws `redirect()` during render; the root route has no `errorComponent` or
   `notFoundComponent`. Use the shared `ErrorState`, keep the tab bar, and redirect in `beforeLoad`.
2. **Major:** a real touch long-press on Scan opens *Add a payment*, then the finger's lift clicks the
   row now under it (`/s/crop`). Swallow the click that follows a long-press's touchend (or open the
   sheet on release). Test with touch events, not the mouse. `docs/local.md` has the phone check.
3. **Major:** the no-float lint bans `Number()`, unary `+` and `parseInt` only in `money*` files;
   planted in `blocks/rows.tsx` it passes. Widen the money rules to everywhere amounts flow (the
   blocks, frame and screens), and add a planted case to `scripts/no-float.test.mjs`.
4. Minor: while a look's chunk loads, `data-look` is already switched, so the tab bar shows unstyled
   (and stays so offline: `loadLook` has no `catch`). Switch the attribute after the chunk arrives.
5. Minor: every toast reuses the id `sen-toast`, so a change right after Undo gets no toast.
6. Minor: the badge's count isn't announced (no `aria-live`; patterns.md §6).
7. Minor: Home → Review → Home, then back, lands on Review instead of leaving.
8. Minor: the hygiene check misses a denylisted string in a file *path* or in an earlier commit of
   the PR. Check paths and every commit in the PR's range.
9. Minor: the gallery and dev panel chunks ship in production builds (unused); and any build
   without `VERCEL_ENV`/`SEN_ENV=production` gets dev tools. Keep them out of production builds.
10. Notes worth acting on: three dev-panel toggles are 35–41 px wide; the gallery's form toasts the
    raw text (*RM1284.5*), not `formatSen`; the slice's long-press test uses the mouse only.
11. **For the owner:** Copper draws an overspent figure in verdigris green, as its design intends,
    which sits against patterns.md §3 (green means money in). Keep or change?

Also, from the owner's questions about the looks' architecture (one app, one small chunk per look):
the large figure's live drawing doesn't pause off screen as avatars do (add the same check), and
B02's service worker should precache all six look chunks (about 70 kB) so a quarter's change works
offline (B14).

## Decided in B01, and why

- **One brief, one branch** (owner, 8 Oct): each slice on `B<NN>/<brief>`, continued if it exists.
  In `CLAUDE.md`.
- **shadcn first, customised in place** (owner, 8 Oct): every building block starts from shadcn;
  its own files in `apps/web/src/components/ui/` are edited for the phone (48 px targets, the look's
  radius, no clipping), each with a `// Sen:` note on line 1. Never a parallel component.
  `className` at a call site is for layout only. In `CLAUDE.md` and the `uiux` skill.
- **TanStack Router, code-based**: it fits; the spec says so.
- **The looks live in `packages/looks`**, ported by hand to TypeScript. `port.test.ts` runs the
  original `docs/ui/directions/src/*.js` and checks each port draws the same SVG. To change a look,
  change the source, rebuild with `build.mjs`, then the port.
- **Review's badge takes text**, so *99+* fits: each look's badge widens, and Instrument's dot face
  gained a `+`. Changed in the design source too, and rebuilt.
- `noUncheckedIndexedAccess` is off workspace-wide: the ported drawing code indexes fixed grids.
- **The CSP allows inline styles, never inline scripts:** Sonner, Vaul and the looks' SVG need
  `style-src 'unsafe-inline'`; `script-src` is `'self'` only.

## Open with the owner

- **Link Vercel** and **add the `DENYLIST` secret**, before the PR is reviewed: `docs/local.md` has
  the steps. Then open the preview on the phone (the PR's *Try it on your phone*).
- Secret scanning and push protection, any time (`docs/local.md`).
- The laptop ESS capture (D110) is still open; it matters only for B34.

## What to do first

- Continue B01 on `B01/design-system`: fix QA findings 1–3 (Majors), then the Minors you judge
  worth it, sorting each fix into the `qa` skill's tiers in `qa/B01/ledger.md`. Majors 1 and 3 touch
  shared code, so re-run QA in full afterwards. Then open the PR, titled *B01 · Design system and
  the six looks*, with the frame times from `docs/cloud.md` §5 and a *Try it on your phone* list.
- Once merged: **B02 · The shell and the listener**, on `B02/shell-listener` from `main`.

## Don't reopen

D1–D113, unless the owner raises one. In particular the slice order (D111), no screen mockups (D84),
and the two rules above from 8 Oct: one brief, one branch; shadcn first, customised in place.
