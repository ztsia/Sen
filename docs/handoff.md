# Handoff

Rewritten 10 Oct 2026 by a local session on the owner's laptop (setup, no slice). The protocol is in
`CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01 and B02 are merged** (B02: PR #3, 9 Oct). **Next: B03 · Skeleton: the five tabs**, on
  `B03/skeleton-tabs` from `main`. The branch doesn't exist yet.
- **This session's setup is on `ops/local-setup`, in a PR waiting for the owner's merge.** It holds
  the two addresses in `apps/shell/sites.json`, D122, and these docs. Merging it makes the first
  signed release (*Sen 0.2.N* under *Releases*) and redeploys production from `main`.
- **Vercel is linked** (project `sen`: root `apps/web`, Node 22.x, production branch `main`).
  Production is `https://sen-my.vercel.app` and answers 200. The review alias
  `https://sen-review.vercel.app` follows the branch `review`, which exists.
- **The signing key is in the repo's secrets** (`SEN_KEYSTORE_B64`, `SEN_KEYSTORE_PASSWORD`), made on
  the laptop, with a backup the owner holds. `BETTER_AUTH_SECRET` is in Vercel for B05.
- **Not verified yet:** anything on the phone, and the signed release itself until the PR's *Shell*
  run is green. QA records for B02 are in `qa/B02/`.

## Decided, and why

- **D122 (owner, 10 Oct): nothing is deployed by hand.** A merge to `main` is the only step: Vercel
  for the web app and API, migrations with the production deploy (B05 picks the mechanism; Vercel's
  build step recommended), Cloudflare's Git builds for the Worker (B06), a signed release for the
  shell, which the phone takes from *Releases* through Obtainium.
- **The key was made locally, not by the *Shell signing key* workflow**, so a backup exists.
- **Vercel's first deployment of a project is always production.** Pushing `ops/local-setup` was
  that first one, so production briefly serves this branch; its web app is the same as `main`'s.
- D116–D121 stand as in B02: mask every digit outside an amount until B10 classifies; QA's tiers.

## Open with the owner

- **The review alias is behind Vercel's login** (measured: 302 to vercel.com), so the review build
  can't load it. Recommend turning Vercel Authentication off for the project: the repo is public and
  previews hold only made-up data. The other way is teaching the review build to sign in to Vercel.
- Which journeys in `docs/flows.md` are core? Recommend: first run, a payment to Review, and Scan.
- D115 is still *Proposed*: it was to be confirmed on B02's PR, which merged without a comment.
- Copper's overspent green (from B01). Anthropic's data terms against D34 (before B10).
- Run 6's note 15 (a missing `when` stored as the post time) is for B07 to decide.
- From `docs/local.md`: move the key's backup, the `DENYLIST` secret, install and the soak, the
  hidden tests, the ESS capture (laptop only), Neon's terms (before B05).

## What to do first

1. If the `ops/local-setup` PR is still open, don't build on it: B03 starts from `main` either way.
2. B03, on `B03/skeleton-tabs`, from its brief. It needs nothing from the owner.
3. `ShellTest.b_the_bridge_answers_our_own_site` failed once on the emulator (run 38033474926, after adb
   was slow to start) and passed twice on the same commit. If it fails again, look at its wait.

## Don't reopen

D1–D122, unless the owner raises one. In particular remote against bundled (D114), masking every
digit until classify-first (D119, D121) rather than more filter rules, the slice order (D111), no
screen mockups (D84), one brief, one branch; shadcn first, customised in place; deploys by hand.
