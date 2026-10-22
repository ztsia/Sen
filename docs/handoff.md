# Handoff

## Where things stand (22 Oct)

**B05 · Feel is done on `B05/feel`**, and its PR (*B05 · Feel*) waits only on green CI. The owner said
(21 Oct): once CI is green, merge it and go on to B06 in the same session. That merge skips the
brief's phone sign-off; the owner tries it in the review app afterwards (`review` points at
`B05/feel`).

What it built is in `patterns.md` §8 ("Built in") and `docs/decisions.md` D140. QA took three full
runs and a scoped re-check: `qa/B05-feel/ledger.md` holds every fix and its tier, the retro, and the
[published report](https://claude.ai/artifact/GpVyhAnBmTSZJ9E9amaDuq).

Accepted, and left to the owner's phone (ledger, runs 1–3):
- At 4× CPU, a push or a sheet appears 60–150 ms later than `main`. The ripple still answers within
  a frame (22 ms measured).
- Tab crossfades drop 11–25% of frames at 4× CPU. If tabs feel slow, the lever is to switch them at
  once: drop `tab` from `routerTransition`.
- In the feel pass (motion on, 4× CPU), `scan-after` and `subscription` fail 2 of 42 runs, where the
  made-up reader moves on before the test sees it.

Pre-existing, left for their own slices (QA run 3's eyes pass):
- A toast can sit over an open sheet, worst on the Remove confirm.
- A sheet's title flips to *Category* as it closes.
- Account's red *RM42.10 less* has no icon.
- A browser's long-press still calls `navigator.vibrate`.

## Next
1. CI green on the PR, then merge it (owner's go, 21 Oct).
2. **B06 · Jobs, realtime, push and backups** (`docs/briefs/B06-jobs-realtime-backups.md`), on
   `B06/jobs-realtime-backups` from `main`. It needs owner accounts (Cloudflare Worker, Firebase
   for FCM, R2 for dumps, cron-job.org). Write the steps into `docs/local.md` first, and build
   everything that doesn't wait on them.

## Open with the owner
- Sign-off on the phone, after the new APK (`docs/local.md`, *Update Sen and Sen review*).
- `docs/local.md` *Now*:
  - delete `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`
  - `SEN_OWNER_EMAIL`
  - first sign-in
  - Q14
  - sign out everywhere
- Merge [ztsia/claude_skills#5](https://github.com/ztsia/claude_skills/pull/5), which now holds B05's
  lessons too.

## Don't argue again
- D129–D140 (the owner's calls). Deploys happen only by merge (D122). The review build follows
  `review` (D115).
- Money never counts up or down in motion.
- iOS back is an edge swipe in B39, for iOS standalone only, and never on Android (owner, 21 Oct).
- Haptics go through `performHapticFeedback` (bridge 2), not `@capacitor/haptics`' vibrator.
- In cloud sessions, subagents can't start subagents. The QA reviewer runs its sweep, and the main
  session spawns `qa-eyes` (the `qa` skill).
