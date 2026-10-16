# Handoff

## Where things stand (16 Oct)

**B05 · QA tooling is being built on `B05/qa-tooling`** (brief `docs/briefs/B05-qa-tooling.md`, D139:
measure, never guess causes). Built and committed:
- `qa/limits.ts`: every metric judged against a human limit and against `main`; a limit `main` breaks
  too is *standing*, not a flag; flags never fail CI.
- The API sends `Server-Timing` (server ms, db ms, queries, rows) on every answer; with `QA_METRICS`
  its tests record them per route. Bodies over 256 KB get a 413.
- The route sweep (`apps/api/src/routes.table.ts`, `apps/api/test/sweep.test.ts`): the same bad
  requests at every route; an unlisted route fails it.
- Breakage checks (`qa/mutants.ts`, `node scripts/mutants.mjs`): 13, all killed.
- Lived-in journeys (`pnpm --filter @sen/web e2e:lived`, in CI): across a deploy, resume, offline,
  slow network, back mid-sheet, 200% text, 360×640, a year of data (`?scenario=year`); an ended
  session in `e2e:server` (now on port 4179).
- `scripts/live-metrics.mjs` and the `live-metrics` workflow: every preview's server timings in its
  job summary. Running on this branch's previews: `/api/me` 18 ms server, 6 queries.
- Metrics in `qa-diff.mjs` (screens, journey taps with filmstrips, API, build): built, **being
  reworked** to open screens as a phone does (service worker cache) and confirm only flags, so the
  pass takes under 15 minutes instead of 70.
- Docs: the `qa` skill, `qa-reviewer`, `qa-eyes` (filmstrips, feel questions), `brief`, `uiux`,
  CLAUDE.md commands, `qa/escapes.md`'s two new columns. Ledger: `qa/B05-qa-tooling/ledger.md`.
- What the tools found and the slice fixed: 200% text overlaps (More, Insights, Review), no message
  after an ended session, a resource-upsert race no test held, a 413 missing no-store.

**In flight:** the metrics rework (noise check `--base HEAD` twice, then against main); the
`claude_skills` PR (branch `workflow/measure-dont-guess` in `ztsia/claude_skills`, being written);
the iad1 probe (throwaway branch `B05/qa-tooling-iad1-probe`: its preview's live metrics must flag;
delete the branch after).

**Then:** a full QA run with the new pipeline (`qa` skill), the retro in the ledger, `docs/usage.md`
row, PR *B05 · QA tooling*.

**Next slices:** *B05 · Feel* (`docs/briefs/B05-feel.md`, starts with the motion demo), then B06.

### Open with the owner
- docs/local.md *Now*: `SEN_OWNER_EMAIL` in Vercel Production; first sign-in; Q14 (inbox or spam);
  sign out everywhere across two browsers.
- Email stays on Gmail (D54); Resend only if Q14 shows spam. Premium HTML emails are in B38's brief.

## Don't argue again
- D129–D139 (owner's calls). Deploys only by merge (D122); the review build follows `review` (D115).
