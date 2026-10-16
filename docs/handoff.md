# Handoff

## Where things stand (16 Oct)

**B05 · Server, database and sign-in is merged** (ztsia/Sen#15) and live at `sen-my.vercel.app`:
`/api/health` answers, noindex holds, and production refuses previews' made-up account. READMEs in
`packages/db` and `apps/api`; QA ledger `qa/B05/ledger.md`.

**A small fix PR is open from `B05/speed-and-updates`**, for two bugs the owner found on the phone
(qa/escapes.md E2, E3):
- Sign-in took seconds: the API ran in Vercel's default region, Washington, beside a Singapore
  database. `vercel-output.mjs` now pins it to `sin1`. The sign-in buttons say *Sending the code…* /
  *Signing in…* with a spinner (patterns.md, *Waiting on the server*).
- A deploy reached the phone only after several closes and reopens. D138 (owner's call): Sen checks
  for a new version on open, on return and every minute; one ready just after opening, untouched and
  with no form or sheet, takes over at once, otherwise a toast offers *Update*. An update downloads
  only changed files (it used to re-download all 3.7 MB). Checked in Chromium across two builds.

**Next slice: B06** (`docs/briefs/B06-jobs-realtime-backups.md`), from `main` once the fix PR is merged.

### What to do first in B06
Build the backend QA tools the owner agreed to, before B06's routes, so they apply to every route
from then on (B05's QA took four runs finding input edge cases one at a time):
1. **A route sweep**: every API route, each declaring what it allows, hit with the same bad requests
   (signed out, another person's id, foreign or missing Origin, not JSON, NUL, deep nesting,
   oversized, wrong method), plus a **query count per request** (catches N+1 and extra round trips).
2. **Breakage checks as a script**: a fixed list of dangerous edits (drop `FOR UPDATE`, weaken a
   `WITH CHECK`, a fixed code in production), each applied, the suite expected red, then restored.
   Never with `git checkout`.
3. **A bundle-size budget** on the build. Speed checks by timing were dropped (the owner's call:
   flaky, and the region is now one line of code). EXPLAIN on the main queries comes with the first
   money table at real volume.
A captured-mail check comes with B38's HTML emails.

### Open with the owner
- docs/local.md *Now*: `SEN_OWNER_EMAIL` in Vercel Production (if it wasn't set before the merge,
  add it and redeploy); first sign-in; Q14 (inbox or spam, Gmail and one other); sign out
  everywhere across two browsers.
- Email stays on Sen's Gmail (D54). Resend only if Q14 shows spam, and it needs a domain first.
- The owner wants both emails premium HTML, the invitation especially (a privilege to be invited):
  B38's brief, with inline styles, no remote images and a plain-text part.

## Don't argue again
- D129–D138 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
