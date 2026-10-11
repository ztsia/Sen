# Handoff

Rewritten 11 Oct 2026 by a local session on the owner's laptop (accounts, no slice). The protocol is in `CLAUDE.md`, *Session rotation*: read this first, and rewrite it before
you end.

## Where things stand

- **B01, B02 and B03 are merged** (B03: PR #7, 11 Oct), with PR #5 and D123 (PR #6).
- **Next: B04** (`docs/briefs/B04-skeleton-rest.md`) on `B04/skeleton-rest`, from `main`. It builds on
  B03's data layer (`apps/web/src/data/`: one `backend.ts`, a hook per screen, the fake with Wei
  Ming's month) and the screens' house style (`screens/home/`, `screens/review/`).
- **Production** is `https://sen-my.vercel.app`; the newest signed release is under *Releases*. The
  review alias `https://sen-review.vercel.app` follows the branch `review`.
- **ESS was captured on the laptop (10 Oct, D110).** It's in `private/ess/` there, never in the repo:
  the requests, `notes.md` and `recipe.draft.json`. `spec_v2.md` §13.1 has the generic answers; Q29
  now lists only what's left.
- **B03's QA:** three full runs (`qa/B03/`), every finding fixed or in `ledger.md`. **Usage:**
  `docs/usage.md`.
- **Neon is ready for B05:** `sen` (Production only) and `sen-preview` (Preview and Development),
  with `BETTER_AUTH_SECRET`, all in Vercel. The database variables are the owner role's.
- **Cloudflare and Google Cloud are set up as far as a session may (11 Oct):** R2 subscribed, the
  buckets `sen-receipts` and `sen-backups`, and usage alerts at half of each free allowance; the
  Google Cloud project **`sen-my`** (not `sen`: Google wants 4 letters), billing linked, the Vertex
  AI API on, and `sen-ai` with *Agent Platform user*. **No key exists yet**, and Vercel has no new
  variable. `docs/local.md`'s first item has what's done and what's left for each.
- **Not verified yet:** anything on the owner's phone.

## Decided, and why

- **D122 (owner):** nothing is deployed by hand; a merge to `main` is the only step.
- **D125 (owner), amended 11 Oct:** subagents by standing request; `implementer` on Haiku at low
  effort for mechanical batches, Sonnet for judgment. **B04 measures it:** its first mechanical batch
  on Haiku and a comparable one on Sonnet, the fixes each needed, written here and in `docs/usage.md`.
- **Log usage before every handoff and PR:** `node scripts/usage.mjs --log <slice>`.
- **QA rounds cost quota (owner, 11 Oct):** fix by the cheapest tier that's honest; a fresh full run
  only when a fix reaches the whole flow, and say what it will cost first.
- **D126 (owner):** R2 never leaves its free allowance. Cloudflare only alerts, so Sen's own gates
  are the stop: a size cap and ceilings on upload links (B15), a fixed number of backups and usage
  in Settings → *Data* (B06). The mechanism and numbers are *Proposed*; those slices confirm them.
- **A session can't create a credential, set a rule that deletes, or write a Vercel variable:** the
  laptop's auto mode refused all three on 11 Oct, though the clipboard route worked on 10 Oct. The
  owner pastes each key into Vercel's dashboard, or allows the command first.
- **D124:** the core journeys are `first-run`, `pay-new` and `scan-after`.
- **Refunds and income are money in only**, in the UI and the fake's writes; B05's API refuses the same.
- **`npx shadcn add` once installed an unrelated package `cn`:** use `--dry-run` first, and check
  `package.json` after.
- **ESS is a JSON API with its own sign-in**, so B34's recipe can be all `http` steps. The capture
  recorded sign-in values as lengths only, so no session has seen the password.

## Open with the owner

- **D115 is still *Proposed*.** Recommended: confirm it.
- **Copper's overspent green:** keep it as designed (verdigris only on copper, the warning always
  with its icon and words)? The owner said *Ok* without the recommendation in front of them.
- Anthropic's data terms against D34 (before B10); run 6's note 15 (B07).
- How long backups are kept: a lifecycle rule on `sen-backups`, recommended 30 days (`docs/local.md`).
- `docs/local.md`'s queue: install and the soak, the key's backup, `DENYLIST`, Sen's Gmail (before
  B05), the phone checks, and what the ESS capture missed.

## What to do first

- **The owner, at the laptop:** the keys in `docs/local.md`'s first item, each pasted into Vercel as
  *Sensitive*, *Production* only. None blocks B04; Gmail's is needed before B05, the rest by B06,
  B10 and B15. A session never types or reads a key.
- **A build session:** B04, from `main` (`git checkout -b B04/skeleton-rest origin/main`). Build the
  shared ground yourself, then brief batches (`CLAUDE.md`, *Models and subagents*).

## Don't reopen

D1–D125, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6); deploys by hand (D122).
