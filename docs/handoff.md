# Handoff

Rewritten 11 Oct 2026 by a local session on the owner's laptop (accounts and keys, no slice). The
protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B04 is in progress** on `B04/skeleton-rest`. B01–B03 are merged.
- **Built, reviewed and committed (11 Oct):**
  - every B04 screen on made-up data: splits (with `split-public` in its own `PublicShell`, on its own fake, reading nothing of the person's), Sen's sheet and `agent/*`, accounts, balance check, claims, claim, payday, every Settings section, sign-in, first run (both versions, embedding B02's capture steps through `CaptureStep`) and new-look's frame
  - the dev panel's native stand-ins, the simulator and all 37 journeys (`dev/journeys.ts`)
- **Running:** a Playwright batch for done-when 1 and 2: every journey in six looks, light and dark, and axe on every screen and stand-in.
- **Then:**
  - QA, a full run (the `qa` skill)
  - the PR *B04 · Skeleton: everything else, and your review*
  - the owner's review on the phone, in the debug shell
- **The D125 Haiku trial (B04):** the comparison was Settings' everyday sections on Haiku against Settings' Claims, Sen and Members on Sonnet.
  - Haiku cost $0.08; Sonnet cost $1.07.
  - Haiku needed 2 fixes: its writer refused every key but its own (against the brief's *by its key path*), and it ran `pnpm format` repo-wide.
  - Sonnet needed none of its own.
  - Verdict: keep Haiku for mechanical batches, with the contract spelled out and *format only your files* in the brief.
- **Production** is `https://sen-my.vercel.app`. The review alias `https://sen-review.vercel.app` follows the branch `review`.
- **Keys:** see `docs/local.md`. None has made a call yet.

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

- **If the Playwright batch's work isn't on the branch,** brief it again: extend `e2e/journeys.spec.ts` and
  `screens.spec.ts` for B04's screens and journeys, with the six looks, light and dark, and axe.
- **Open points for B05 onwards, from the batches:**
  - `ScreenSearch` has no `day`, so Sen's *Add a payment for Sat 4 Oct* opens `manual` empty.
  - `ReviewRow` shows 3 answers, but `ask_user` allows 4.
  - Categories and rules can't be added or renamed: there are no commands for it yet (B12).
  - *Changes each quarter* has no flag in the theme store (B14).
  - `db.picks` holds several takers comma-joined (B17 makes it `split_picks`).

## Don't reopen

D1–D126, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6); deploys by hand (D122).
