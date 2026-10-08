# Handoff

Rewritten 8 Oct 2026 by the session that built B01. The protocol is in `CLAUDE.md`, *Session
rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01 · Design system and the six looks is built on `B01/design-system`**, through QA, with its PR
  open to `main`. **The next slice, B02, waits for the owner's merge.**
- Built: the pnpm workspace (`apps/web`, `packages/core`, `packages/looks`), CI and the hygiene check;
  the money module; Tailwind v4 and shadcn on the six looks' tokens, fonts self-hosted; the six looks
  ported as lazy `DIR` modules; the frame (tab bar, Sen's button, app bar, large figure); every
  building block in `patterns.md` §7 and the chart base; the dev panel, `/dev/gallery` and the screen
  registry. The commands and layout are in `CLAUDE.md`.
- **Verified in the session:** 114 unit tests (money with property tests, each look's port against
  its design source, the hygiene and no-float checks planted), and 58 Playwright tests at 390×844
  (the gallery in all twelve look and mode pairs with axe, 48 px targets, 1.5× text; the tab bar,
  badge and long-press; the avatar's eight states and reduced motion; the WebGL fallbacks; a
  production build with *Not built yet* under the real CSP). Frame times are in `docs/cloud.md` §5.
- **Not verified yet:** CI on GitHub (it runs on the PR), the Vercel deploys, and the phone.

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

- If the PR has review comments or CI is red: fix them on `B01/design-system`.
- Otherwise, once merged: **B02 · The shell and the listener**, on a new `B02/shell-listener` from
  `main`. Its brief now names the bridge the web app calls (`SenShell.haptic`, `openInBrowser`).

## Don't reopen

D1–D113, unless the owner raises one. In particular the slice order (D111), no screen mockups (D84),
and the two rules above from 8 Oct: one brief, one branch; shadcn first, customised in place.
