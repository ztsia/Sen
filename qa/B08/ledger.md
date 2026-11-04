# B08 · QA ledger

## The security review (D144): low note, fixed (tier 1)

- **What:** first run's draft (`sen.firstRun`: balances typed but not saved, the name, the payday) wasn't
  tied to a person and outlived sign-out, so on a shared device the next person would see it.
- **Tier 1:** one source change (`forgetKept`, `keepFor` in `apps/web/src/data/api/backend.ts`) and its
  test; no other behaviour changes; not a Blocker.
- **Red** (`pnpm exec vitest run apps/web/src/data/auth.test.ts`, before the fix):
  `× take first run’s unsaved draft with them`, `× take first run’s draft when someone else signs in`,
  `Tests 2 failed | 20 passed (22)`.
- **Green** (after): `Tests 22 passed (22)`; typecheck and lint clean.

## QA run 1: the metrics flags (each measured, `qa-artifacts/B08_first-run-accounts/diff/index.md` § Metrics)

| Flag | Cause, measured | Verdict |
|---|---|---|
| `screen:receipt`, `screen:sign-in`, `screen:settings/capture/access@capture-off` console 12 / 9 / 2 vs 0 | Opened warm (service worker) and throttled as the metrics run does (`qa/e2e/b08-measure.spec.ts`): the only messages are Chromium's own preload warnings, *A preload … is not used because it is a cross-world service worker resource mismatch* and *preloaded … but not used*. They swing either way between runs: that run had main's sign-in at 18 and head's at 0. Cold, both sides log one *Service Worker registration blocked* warning | Accepted: browser noise, no app error on either side. Follow-up: the metrics' console count could ignore Chromium's preload warnings |
| `step:first-run/18` settle 1601 ms (main: none) | The film shows *Finish* dimmed for ~0.45 s (`setup.finish`, then `invalidateQueries()` refetching every active query), then Home's skeleton until the strip ends. Home's own open is over 1000 ms on main too (standing `screen.settleMs`) | The waiting button's missing words are finding 9; the rest is accepted with Home's standing item (Home becomes real in a later slice) |
| `api:GET /api/me` queries 10 vs 6 | `/me` now reads `setup_done_at` in its own `c.var.db()` transaction: BEGIN, `set_config`, SELECT, COMMIT = +4 round trips. Median app time 13.5 ms | Accepted: read once per session and kept. Follow-up: read it in the access lookup's transaction |
| `api:GET /api/sync/changes` queries 14 vs 10 | Four new SELECTs (categories, accounts, account_names, user_settings) in the existing transaction = +4. Median 14.2 ms | Accepted: one query per table the offline copy carries (D146 (9)) |
| metrics runs: `scan-after` failed on head ×2, `first-run` on main ×3 | head: the journey waits for *Reading receipt…*, a 0.4–0.8 s screen; four warm throttled walks per side show it every time, windows overlapping. main: its own `first-run` journey failed in main's build; not investigated (not this branch's) | Finding 12 (racy assertion) |
