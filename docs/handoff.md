# Handoff

Rewritten 11 Oct 2026 by a local session on the owner's laptop (accounts and keys, no slice). The
protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B04 is in progress** on `B04/skeleton-rest` (started 11 Oct). B01–B03 are merged.
- **Done and pushed:** the shared ground.
  - `views.ts` and `commands.ts` have *B04* sections.
  - Backend methods and hooks exist for splits, accounts, claims, Sen, Settings and payday.
  - The fake's per-area modules are in `data/fake/areas/` (splits, sen, money, settings, admin), wired into `Db`, the seeds and the write dispatch.
  - A stub screen exists for every B04 id, registered in `screens/skeleton.ts`.
- **Running (11 Oct), seven `implementer` batches, each owning its files:**
  - splits, with `split-public` on its own fake (`data/public.ts`, `fake/public-split.ts`)
  - Sen (the sheet's conversation and `agent/*`)
  - accounts, claims and payday (`screens/money/`)
  - Settings' everyday sections, on **Haiku** (the D125 trial)
  - Settings' Claims, Sen and Members, on Sonnet (the comparison)
  - outside the tabs (`screens/outside/`)
  - native stand-ins, the simulator and the journeys (`dev/`)
- **Then:**
  - review each diff and commit
  - Playwright walks every `flows.md` journey from `dev/journeys.ts` in six looks, light and dark, with axe
  - QA
  - the owner's review on the phone
- **Production** is `https://sen-my.vercel.app`. The review alias `https://sen-review.vercel.app` follows the branch `review`.
- **Keys:** see `docs/local.md`. No key has made a call yet; B05, B06, B10 and B15 are their first tests.

## Decided, and why

- **D127 (owner, 11 Oct):** D115 confirmed; Copper's verdigris stays as designed; production sends
  `noindex` from B05; B10 checks Anthropic's data terms against D34 before naming Claude.
- **D126 (owner, 11 Oct):** R2 never leaves its free allowance. Cloudflare has no hard stop, only
  the alerts set at half of each allowance, so Sen's own gates are the stop: a size cap and
  ceilings on upload links (B15), and usage in Settings → *Data* (B06). Backups are deleted after
  30 days by the bucket's own rule. Receipts are never deleted automatically. The mechanism and
  numbers are *Proposed*; B06 and B15 confirm them.
- **The repo stays public (owner, 11 Oct).** No key is in it; private would cost the free Actions
  minutes (about 340 in three days), secret scanning, and updates on the phone without a token.
- **Keys on the laptop:** the session clicks *Create* without looking at the result, the owner
  clicks *Copy*, and a watcher takes the clipboard by its shape and sends it on unseen. Auto mode
  refuses creating a credential, writing a Vercel variable and a rule that deletes, so the owner
  switches to manual mode and approves each.
- **D122 (owner):** nothing is deployed by hand; a merge to `main` is the only step.
- **D125 (owner), amended 11 Oct:** subagents by standing request; `implementer` on Haiku at low
  effort for mechanical batches, Sonnet for judgment. **B04 measures it:** its first mechanical
  batch on Haiku and a comparable one on Sonnet, the fixes each needed, here and in `docs/usage.md`.
- **Log usage before every handoff and PR:** `node scripts/usage.mjs --log <slice>`.
- **QA rounds cost quota (owner, 11 Oct):** fix by the cheapest tier that's honest; a fresh full run
  only when a fix reaches the whole flow, and say what it will cost first.
- **D124:** the core journeys are `first-run`, `pay-new` and `scan-after`.
- **Refunds and income are money in only**, in the UI and the fake's writes; B05's API refuses the same.
- **`npx shadcn add` once installed an unrelated package `cn`:** use `--dry-run` first, and check
  `package.json` after.

## Open with the owner

- Run 6's note 15 (B07).
- `docs/local.md`'s queue: install and the soak, the signing key's backup, the Firebase key file in
  Downloads, `DENYLIST`, the phone checks, and what the ESS capture missed.

## What to do first

- **If the batches' work isn't on the branch:** the VM was reclaimed mid-batch. Rerun the batch briefs per
  area, against the stubs and the `TODO(B04 …)` marks in `data/fake/areas/`.

## Don't reopen

D1–D126, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6); deploys by hand (D122).
