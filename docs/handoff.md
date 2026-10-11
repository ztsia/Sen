# Handoff

Rewritten 11 Oct 2026 by the B03 session, at the slice's end. The protocol is in `CLAUDE.md`,
*Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B03 · Skeleton: the five tabs is done** on `B03/skeleton-tabs`; its PR waits for the owner's
  merge. B01, B02, PR #5 and D123 (PR #6) are merged.
- **Next: B04** (`docs/briefs/B04-skeleton-rest.md`) on `B04/skeleton-rest`, from `main` once B03 is
  merged. It builds on B03's data layer (`apps/web/src/data/`: one `backend.ts`, a hook per screen,
  the fake with Wei Ming's month) and the screens' house style (`screens/home/`, `screens/review/`).
- **QA:** three full runs (`qa/B03/report-run1.md`, `report-run2.md`, `report.md`), every finding
  fixed or recorded with its tier in `qa/B03/ledger.md`. The latest is published at
  https://claude.ai/artifact/WfFSai2Hz3RP9Kbe93w88p. After run 3, the owner chose no fourth run
  (quota): its fixes were checked against QA's own run 3 specs (21 of 21), unit and e2e regressions.
- **Usage:** `docs/usage.md` has B03's row: the main session was 73% of the cost, mostly re-reading
  its long context; implementers cost $1–2 a batch, a full QA run $8–10.

## Decided, and why

- **D125, amended 11 Oct (owner):** subagents by standing request; `implementer` may run on Haiku at
  low effort for mechanical batches, Sonnet for judgment. **B04 measures it:** run its first
  mechanical batch on Haiku and a comparable one on Sonnet, count the fixes each needed, write the
  result here and in `docs/usage.md`.
- **Log usage before every handoff and PR:** `node scripts/usage.mjs --log <slice>`; the transcripts
  go with the VM.
- **QA rounds cost quota (owner, 11 Oct):** fix by the cheapest tier that's honest; a fresh full
  run only when a fix reaches the whole flow, and say what it will cost first.
- **D124:** the core journeys are `first-run`, `pay-new` and `scan-after`.
- **Refunds and income are money in only**, in the UI and in the fake's writes; B05's API refuses
  the same way.
- **`npx shadcn add` once installed an unrelated npm package `cn`:** add components with `--dry-run`
  first and check `package.json` after.

## Open with the owner

- **D115 is still *Proposed*.** I recommended confirming it.
- **Copper's overspent green:** the owner said *Ok* without a recommendation. Mine: keep it as designed
  (verdigris only on copper, the warning always with its icon and words). Confirm.
- The review alias behind Vercel's login; Anthropic's data terms against D34 (before B10); run 6's
  note 15 (B07); `docs/local.md`'s queue (two QA phone checks from run 3 added).

## What to do first

1. If B03's PR is merged: start B04 from `main` (`git checkout -b B04/skeleton-rest origin/main`).
   If not, B04 waits on it: get the PR's CI green and tell the owner it's ready to merge.
2. Build the shared ground yourself, then brief batches (`CLAUDE.md`, *Models and subagents*).

## Don't reopen

D1–D125, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6).
