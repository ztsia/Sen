# B07 · QA ledger

## Run 1 → fixes (3–4 Nov)

**Tier 2, scoped.** The fixes stay in one area: capture's health, from the heartbeat to the
watchdog's push and Home's warning (spec §6.2 *Health*), plus the paging of *Captured on this
phone*. They add no migration and no RLS change, and touch none of the shared UI, money, auth or
dedupe code. `CaptureHealthView` (packages/core) gains a field and an enum value, read only by Home's
warnings. The run 1 reviewer is resumed on that area.

| Finding | Fix | Guard (red before the fix) |
|---|---|---|
| 1 Major | `captureHealth` reads what the heartbeat says. Access off → `no-access`, a push at once. The 24 h counts from the listener's own last heartbeat (connected, with access), so a daily sync saying it's off isn't one. Home's warning in a browser says *Capture is off* / *listener off since …*. The push has its own words | `sync.test.ts` › *pushes at once when the phone says notification access is off*, *counts a day from the listener's own last heartbeat*. QA probe `access revoked`, which failed in run 1, now passes. Mutant `b07-access-off-ignored` |
| 2 Major | The watchdog's tests set the state outright (one heartbeat, at most one event), so each rule is tested alone: 25 h quiet with an event an hour ago pushes; 23 h stays quiet; 47 h vs 49 h for events | Mutant `b07-heartbeat-window` (survived in run 1): killed |
| 3 Minor | `/captured` pages on `(posted_at, id)`, and the cursor is `<instant>_<uuid>` | *pages through events that share a posted time* (51 of 51). QA probe `paging through 51` now passes. Mutant `b07-captured-paging-ties` |
| 4 Minor | An event counts at `least(posted_at, created_at)`, and the heartbeat's own `lastBankEventAt` (the phone's clock) isn't counted | *isn't silenced by a phone clock running ahead*. QA probe `phone clock` now passes. Mutant `b07-phone-clock-trusted` |
| 5 Minor | The once-a-day test ticks twice in one KL day at different instants, then the next day | Mutant `b07-watchdog-key-per-instant` (survived in run 1): killed |
| 6 Minor | Twelve B07 breakage checks in `qa/mutants.ts` | `node scripts/mutants.mjs --only b07-…`: 12/12 killed |
| eyes `capture-off/3` wrong | The dev panel's push stand-in uses the server's words | n/a (dev copy) |
| eyes `captured` look again | The intro says *kept for you only. Every number but the amounts is hidden.* `patterns.md` §7 now says the raw row lasts until B10, as the brief says | tree `settings-capture-captured` |

All 19 of QA's API probes pass (16/19 in run 1). `pnpm test:db`: pgTAP 340, API 173 passed. Unit
472, typecheck and lint clean; lint now includes QA's probe files, whose three problems are fixed.

**Left, with reasons:**
- **7 (Note):** `app_user` could clear its own tombstone, or back-date a heartbeat, by direct SQL.
  The API never does, and only it holds `app_user`. A trigger that refuses clearing `deleted_at`, and
  column grants on heartbeats, would need a new migration and a full run. Named for B08, which
  touches these tables' neighbours.
- **8 (Note):** the global `sync_version` shows how many changes others made, by its gaps. It's a
  count, never content (D52 holds). A per-person counter is the follow-up if it matters.
- **9 (Note):** a notification over 8,000 characters (16,000 expanded) is refused and stays on the
  phone, marked. None of the four apps' formats comes near it (`docs/notifications.md`).
- **10 (Note):** gitleaks in a cloud session: a row in `docs/cloud.md`.
- **11 (Note):** the two metrics flags are noise, standing on main too (the reviewer's re-measure).
- **Eyes `proposal/3` wrong** (the slow Undo in Sen's sheet) is the same on main: a follow-up in the
  handoff, not B07's. The other eyes look-agains are dev-panel timing or main's, and wait for their
  slices.
