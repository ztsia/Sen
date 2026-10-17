# Handoff

## Where things stand (17 Oct)

**B05 · QA tooling is done; its PR is open from `B05/qa-tooling`**, waiting for the owner's merge.
Ledger with the retro: `qa/B05-qa-tooling/ledger.md`. What it adds (D139: measure, never guess
causes):
- `qa/limits.ts` judges every number against a human limit and `main`. A crossing counts only as a
  real step worse than `main`; timings need 50%, bytes and counts 25%. Flags never fail CI.
- The API sends `Server-Timing` on every answer; its tests record it per route (`QA_METRICS`).
  Bodies over 256 KB get a 413.
- The route sweep (`routes.table.ts`, `sweep.test.ts`) and 13 breakage checks
  (`node scripts/mutants.mjs`), all killed.
- The lived-in journeys (`e2e:lived`, in CI) and an ended session in `e2e:server` (port 4179).
- `live-metrics` on every preview: it flagged the region probe (1.3–2.2 s server time against
  18–23 ms).
- Metrics in `qa-diff.mjs`: screens opened from the service worker's cache, taps with filmstrips, the
  API and the build, measured once, then three times for what flags. About 12–13 minutes. Identical
  code still confirms 1–2 timing flags per run, so the reviewer re-measures each flag once
  (done-when not quite met; the ledger says why).
- The `qa` skill, `qa-reviewer`, `qa-eyes`, `brief`, `uiux`, CLAUDE.md and `qa/escapes.md` describe
  the new run.
- The general lessons are in [ztsia/claude_skills#4](https://github.com/ztsia/claude_skills/pull/4).
- Fixed what the tools found: 200% text overlaps, the ended-session message, a resource-upsert race,
  a 413 missing no-store.

**No full QA run** (owner, 17 Oct: not enough quota). Each change has its own test. The diff against
`main` shows 0 trees and 0 pixels changed in all twelve pairs.

**Next: B05 · Feel** (`docs/briefs/B05-feel.md`, branch `B05/feel` from `main` once this PR merges).
It starts with the motion demo the owner picks from on the phone. Then B06.

### Known
- The `scan-after` journey fails now and then under the metrics' throttling: it waits for
  *Reading receipt…*, which shows for a moment. Its steps are then missing on that side.
- Agents resumed after a usage limit ran on Opus (`brief` skill: check, and brief a fresh agent if so).

### Open with the owner
- docs/local.md *Now*: delete the branch `B05/qa-tooling-iad1-probe`; `SEN_OWNER_EMAIL` in Vercel
  Production; first sign-in; Q14 (inbox or spam); sign out everywhere.
- Merge [ztsia/claude_skills#4](https://github.com/ztsia/claude_skills/pull/4).
- Email stays on Gmail (D54); Resend only if Q14 shows spam. Premium HTML emails are in B38's brief.

## Don't argue again
- D129–D139 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
