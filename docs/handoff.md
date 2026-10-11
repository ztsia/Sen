# Handoff

Rewritten 11 Oct 2026 by a local session on the owner's laptop (accounts and keys, no slice). The
protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01, B02 and B03 are merged** (B03: PR #7, 11 Oct).
- **Next: B04** (`docs/briefs/B04-skeleton-rest.md`) on `B04/skeleton-rest`, from `main`. It builds on
  B03's data layer (`apps/web/src/data/`: one `backend.ts`, a hook per screen, the fake with Wei
  Ming's month) and the screens' house style (`screens/home/`, `screens/review/`).
- **Production** is `https://sen-my.vercel.app`: the tab bar and *Not built yet*, with no server
  behind it. The review alias `https://sen-review.vercel.app` follows the branch `review`.
- **Every account and key the build needs so far exists (11 Oct).** `docs/local.md`'s first item
  lists each with its variable. In Vercel, Production only: R2 for receipts, Gemini (Google Cloud
  project **`sen-my`**, not `sen`), Claude, Firebase for push, Sen's Gmail, with Neon and
  `BETTER_AUTH_SECRET` from before. In `ztsia/sen_ops`: R2 for backups. **No key has made a call
  yet:** B05, B06, B10 and B15 are their first tests. Preview has no keys except Neon's and Better
  Auth's; a slice that needs one in previews says so in `docs/local.md`.
- **ESS was captured on the laptop (10 Oct, D110),** in `private/ess/` there. `spec_v2.md` §13.1
  has the generic answers; Q29 lists what's left.
- **Usage:** `docs/usage.md`. **Not verified yet:** anything on the owner's phone.

## Decided, and why

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

- **D115 is still *Proposed*.** Recommended: confirm it.
- **Copper's overspent green:** keep it as designed (verdigris only on copper, the warning always
  with its icon and words)? The owner said *Ok* without the recommendation in front of them.
- **Search engines:** production sends no `noindex`. Recommended: add the header in B05.
- Anthropic's data terms against D34 (before B10); run 6's note 15 (B07).
- `docs/local.md`'s queue: install and the soak, the signing key's backup, the Firebase key file in
  Downloads, `DENYLIST`, the phone checks, and what the ESS capture missed.

## What to do first

- **A build session:** B04, from `main` (`git checkout -b B04/skeleton-rest origin/main`). Build the
  shared ground yourself, then brief batches (`CLAUDE.md`, *Models and subagents*).

## Don't reopen

D1–D126, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6); deploys by hand (D122).
