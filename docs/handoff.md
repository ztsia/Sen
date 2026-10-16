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

**Next: two slices before B06 (D139, the owner's call, 16 Oct), each from `main`:**
1. **B05 · QA tooling**, `docs/briefs/B05-qa-tooling.md`, branch `B05/qa-tooling`, once ztsia/Sen#16
   is merged. QA measures time, data, CPU and memory in the runs it already does, judges them
   against human limits and `main`, and the reviewer explains every flag. No check names a cause.
   It also adds lived-in journeys, a filmstrip for feel, the route sweep and the breakage script,
   and the learning loop: each escape changes a tool, and each slice's lessons go to the owner's
   `claude_skills` repo.
2. **B05 · Feel**, `docs/briefs/B05-feel.md`, branch `B05/feel`: transitions, press feedback, motion
   and haptics (a new APK). It starts with a motion demo the owner picks from on the phone.
3. Then B06 (`docs/briefs/B06-jobs-realtime-backups.md`).

The owner asked to compact before starting, so nothing of either slice is built yet.

### Open with the owner
- docs/local.md *Now*: `SEN_OWNER_EMAIL` in Vercel Production (if it wasn't set before the merge,
  add it and redeploy); first sign-in; Q14 (inbox or spam, Gmail and one other); sign out
  everywhere across two browsers.
- Email stays on Sen's Gmail (D54). Resend only if Q14 shows spam, and it needs a domain first.
- The owner wants both emails premium HTML, the invitation especially (a privilege to be invited):
  B38's brief, with inline styles, no remote images and a plain-text part.

## Don't argue again
- D129–D138 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
