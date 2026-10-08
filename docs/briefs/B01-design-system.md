# B01 · Design system and the six looks

**Stage 1 · Frame** · after: publishing (`ztsia/Sen` exists) ·
next: B02

## Goal

The app's frame exists and is the same everywhere:
- the workspace, CI and deploys
- the money module
- the six looks as code
- every building block in `docs/ui/patterns.md`, shown in a gallery in all six looks, light and
  dark

Every later screen is assembled from what this slice builds, so nothing here may be a stand-in.

## Read first

- `CLAUDE.md`, all of it, especially *Non-negotiables* and *Conventions*.
- `spec_v2.md`: §4 principles 1–2, §5.1 (the stack, including *The foundations slice confirms the
  router*), §9.1, §9.4 and §17 (*The shell trusts only our own site*, and *Repo hygiene*).
- `docs/ui/patterns.md`, all of it. It is this slice's contract.
- `docs/ui/README.md`, `docs/ui/directions/assets/README.md`, and each look's
  `directions/assets/<look>/README.md`.
- `docs/ui/directions/src/`: `engine.js`, `charts.js` and the six `<look>.js` and `<look>.css` files.
- `docs/screens.md`, *Rules every screen follows*.
- Decisions: D42–D44, D57, D58, D75–D84.
- Skills: `uiux`, `dataviz` and `frontend-design`. Use `frontend-design` only for porting a look's
  own drawing, never for a building block.

## Builds

### The workspace
- A pnpm workspace, TypeScript strict, lint and format, Vitest, and Playwright pinned to the
  session's preinstalled Chromium. Never run `playwright install`. Record the versions in
  `docs/cloud.md` §5.
- Lay out the folders for:
  - the web app (Vite, React, TanStack Router)
  - shared pure TypeScript: the money module now; cycles and the template engine later
  - the API (from B05), the Android shell (from B02) and the Cloudflare Worker (from B06)

  Write the layout into `CLAUDE.md`.
- **Confirm the router.** If TanStack Router doesn't fit, record a decision before changing it.
- CI on GitHub Actions runs typecheck, lint, unit tests and Playwright on every PR. No
  `pull_request_target`, and no secrets in the public repo's workflows (§17).
- **The repo hygiene check:** a PR job that fails on any tracked path under `private/`, and on any
  string from the `DENYLIST` Actions secret.
- Vercel: production from `main`, a preview per branch. Add `CLAUDE.md` § Commands (install, dev,
  test, e2e, build). `scripts/session-start.sh` already installs packages once a lockfile exists;
  check it does.
- Add the stack's skills with `npx skills add`: shadcn/ui, `vercel-labs/agent-skills` and
  `capawesome-team/skills` (`CLAUDE.md` § Skills).

### Money
- The money module, for integer sen only:
  - parses typed text into sen: `12`, `12.5`, `12.50` and `1,284.50` are accepted; three decimals,
    signs inside the text and anything else are rejected
  - formats as `RM1,284.50`, with tabular numbers and a screen-reader form
  - apportions by largest remainder
- There must be no path through a float. Add a lint rule or test that fails on `parseFloat`,
  `Number(…)` or `toFixed` near money, and property tests: format, then parse, gives the same
  value; apportioned parts always add up to the total.

### Theme and looks
- Tailwind v4 and shadcn/ui (`components.json`).
- Each look's tokens come from `directions/assets/<look>/theme.css`: shadcn's variables, money,
  chart and icon tokens, in light and dark. They switch by a `data-look` attribute and dark mode.
- Fonts are self-hosted from `directions/assets/fonts/`; no font CDN (§17's content security
  policy).
- **Port the six looks as `DIR` objects** (`patterns.md` §1): `id`, `name`, `tokens`, `extra`,
  `radius`, `fonts`, `icons`, `icon`, `wordmark`, `heroFigure`, `strip`, `avatar.draw` in all eight
  states, and `tabs`. Leave `reveal` empty, for B14.
  - Port from `src/<look>.js` and `engine.js`, and use the saved assets, not the pages.
  - Keep each look's drawing in its own module, loaded lazily.
  - Mercury and Copper use WebGL. Give each a still fallback where WebGL is missing, and settle to
    a final frame under reduced motion.
- The chart palette comes from `charts.js` (`patterns.md` §4). No new hues.
- lucide icons, with each look's stroke, line-end and corner tokens, and the dot fix (`patterns.md`
  §5).

### The frame and the building blocks
- The tab bar, drawn by each look on the shared outlines (`tab-outlines.json`). Active is marked
  three ways: the look's icon, its indicator and `aria-current`.
- Review's badge, up to *99+*, read as *5 to review*.
- Scan: a tap goes to a stand-in for now. A long-press after 500 ms gives a light haptic where
  possible and opens a stand-in `scan-more` sheet.
- Sen's floating button: the avatar at 60 px, labelled *Ask Sen*, on tab screens only, with bottom
  padding so it never covers a row.
- The app bar, and back behaviour in a browser (§6, §10): a sheet adds a history step.
- Every building block in `patterns.md` §7:
  - screen frame and app bar
  - list row, day header, Review row and settings row
  - detail page
  - `Field` and the money input: a number pad, typed as text and parsed into sen
  - sheet (shadcn Drawer) and dialog (destructive only)
  - toast with *Undo* (Sonner, 6 s)
  - status card and health warning bar
  - empty, loading skeleton, error and offline banner, and *Updated 2 min ago*
- The chart base on shadcn charts: focus and context, separate series (at most three plus
  *Other*), the sequential ramp, legend, and tap tooltips (`patterns.md` §4, the `dataviz` skill).
- Web behaviour (`patterns.md` §10): overscroll, callouts, `user-select`, tap highlight, the
  viewport and `dvh`, safe-area variables, `:focus-visible`, and an `openInBrowser(url)` helper
  (the shell implements it in B02).
- A strict content security policy, with no third-party scripts.

### Dev panel and gallery
- **The dev panel** appears only in development and previews, never in production. It holds:
  - the look switcher (all six) and *System / Light / Dark*
  - toggles for reduced motion and text scale (1×, 1.5×)
  - a state switcher, used by B03 and B04
  - an avatar state player
- **`/dev/gallery`:** every building block in every state, in the current look.
- **The screen registry:** each screen id from `screens.md` is marked `skeleton` or `real`. In
  production a `skeleton` screen shows *Not built yet* and no data. For now every screen is a
  placeholder. Until B14, production shows one pinned look, chosen in B04's review; until then, the
  first in the pool.

## Leaves for later

- Screens: B03 and B04. The shell: B02. The API: B05.
- The reveal and rotation: B14. Icon switching: B02 tests it, B14 builds it.

## Done when

1. The gallery shows every building block in every state, in all six looks, light and dark.
2. An axe scan passes contrast and labels in all twelve combinations, and a test checks every
   interactive element is at least 48 px.
3. The tab bar renders in each look with the shared outlines; `aria-current` is right; the badge
   reads *99+* past 99; a long-press at 500 ms opens the stand-in sheet and a tap doesn't.
4. The avatar plays all eight states in each look, and holds a still frame under reduced motion.
5. At text scale 1.5×, nothing in the gallery clips, and amounts wrap rather than truncate.
6. The money module's tests pass, including the property tests, and the no-float check fails on a
   planted `parseFloat`.
7. The hygiene check fails on a planted `private/` file, and on a planted denylist string in a
   fixture run.
8. CI is green, the preview deploys, and `main` deploys to production showing *Not built yet*.
9. Mercury's and Copper's frame times are measured in Chromium at 390×844 with CPU throttling, and
   recorded in the PR.

## On your phone

- [ ] Open the preview link. Switch the six looks, and light and dark, in the dev panel.
- [ ] Scroll the gallery. Does anything feel slow, especially Mercury and Copper?

## Needs from you first

- `ztsia/Sen` published (`docs/local.md`, *Publish Sen*).
- A Vercel project linked to `ztsia/Sen`, with production from `main` and previews on.
- The `DENYLIST` Actions secret on `ztsia/Sen`: one string per line, such as the employer's name and
  ESS's host. Never written anywhere else.

## Notes

- `docs/cloud.md` §5: also record whether `/dev/kvm` exists.
- Keep `docs/ui/directions/` as it is: it's the source of the looks. The app's copies are ports, and
  if a port needs a change to a look, change the source and rebuild with `build.mjs`.
