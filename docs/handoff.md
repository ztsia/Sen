# Handoff

Rewritten 8 Oct 2026 by the second B01 session, which fixed both QA runs' findings and opened the PR.
The protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01 · Design system and the six looks, on `B01/design-system`: done, with its PR open to `main`.**
  It waits on the owner's merge and the phone checks in the PR's *Try it on your phone*.
- QA ran twice. Run 1 (9 failed criteria) and run 2 (3 failed, 2 Majors about the guards themselves)
  are both fixed. `qa/B01/ledger.md` has each fix, its tier, and its red and green evidence. Run 2's
  report: https://claude.ai/artifact/3tyzFqm3v81jS1GDM4sYSe.
- **Verified:** unit 135/135; the slice's e2e 88/88; QA's specs 76/76; typecheck, lint, format,
  `looks.gen.css` and hygiene clean.
- **Not verified yet:** CI on GitHub (it runs on the PR), the Vercel deploys, the phone.

## Decided in B01's second session, and why

- **Owner: after run 2's fixes, no further QA run.** The implementer reproduces each finding first
  (red), fixes it, shows it green, and re-runs every suite. For B01 only, unless the owner extends it.
- **A build is production unless it says preview** (`SEN_ENV=preview`, or `VERCEL_ENV=preview`), and
  dev-only chunks are imported behind `__SEN_ENV__` compared in place, so production has none.
- **The no-float lint bans routes, not only names**, everywhere amounts flow. Only
  `packages/core/src/money.ts` turns sen into ringgit text and back (`formatSen`, `parseSen`,
  `percent`), and only the looks' drawing code is exempt.
- **The hygiene check reads paths, binary and UTF-16 files, and every commit and message in the range.**
- **Colours keep one meaning** (patterns.md §2): errors and status cards are in the text colours;
  the health bar uses the warn pair through `warning` variants on shadcn's alert and button.
- **A Review row raises its own Undo**: an answer returns what it said and how to undo it.
- `tokens`, `extra` and `fonts` are CSS, not `DIR` fields (patterns.md §1).
- **Buttons are pills unless the look sets `--radius-btn`** (Instrument and Copper: 10 px), as
  `engine.css` draws them. The shadcn files carry that default; a self-referring fallback once made
  four looks square.

## Open with the owner

- **Copper's overspent figure is verdigris green**, as its design intends, against patterns.md §3
  (green means money in). Kept as designed until the owner says otherwise.
- **Link Vercel** and **add the `DENYLIST` secret** (`docs/local.md`), then the PR's phone checks.
- Secret scanning and push protection, any time (`docs/local.md`).
- The laptop ESS capture (D110) is still open; it matters only for B34.

## What to do first

- If the PR has review comments or red CI, fix them on `B01/design-system`.
- Once merged: **B02 · The shell and the listener**, on `B02/shell-listener` from `main`. Its service
  worker should precache all six look chunks (about 70 kB), so a quarter's change works offline (B14).

## Don't reopen

D1–D113, unless the owner raises one. In particular the slice order (D111), no screen mockups (D84),
and from 8 Oct: one brief, one branch; shadcn first, customised in place.
