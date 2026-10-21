# Handoff

## Where things stand (21 Oct)

**B05 · Feel is built on `B05/feel`** (`docs/briefs/B05-feel.md`), in QA before its PR. The owner
said (21 Oct): once it's done and CI is green, merge the PR and go on to B06 in the same session.
That merge skips the brief's phone sign-off; the owner tries it in the review app afterwards.

Built and verified in Chromium at a phone viewport:
- **Screens** (`src/frame/motion.ts`, `src/styles/motion.css`): the router's `defaultViewTransition`
  with a `types` callback. Forward pushes, back pops (the back gesture too), a tab crossfades (also a
  tab tapped from a pushed screen), a sheet's own history step moves nothing, reduced motion turns
  it all off. Only the region `screen` moves; the tab bar (`tabbar`) and Sen's button (`fab`) stay
  above it, live.
- **The shared amount:** `shareId` on `ListRow` (Payments, Account) and `HeaderCard` (txn).
- **Ripple** (`src/frame/press.ts`): one pointerdown listener on everything tappable; switches,
  checkboxes and `[data-no-press]` excluded; about 40 `active:` tints removed.
- **Change motion:** `useChangeMotion(data)` + `rowMotion(id)`, on Review. It moves when the data
  arrives, never around the write, so a network round trip never freezes the screen. Rows partly
  out of view change in place. Skeletons fade into content (`Loaded`); sheets ease to a new height.
- **Haptics:** `SenShell.haptic({kind})`, bridge 2, through `performHapticFeedback`; the web app's
  `lib/haptics.ts` checks the bridge first. Moments: confirm (`toastUndo`), Undo, reject
  (`FieldError` after a tap), long-press, toggles (`Switch`). `threshold` exists but nothing uses it:
  Sen has no pull past a limit yet.
- **Tests:** functional e2e runs with motion reduced; `e2e/motion.spec.ts` checks the motion with it
  on; a unit test pins the direction rule; `ShellTest` calls `haptic` on the emulator.
- **Measured** (`FRAME_TIMES=transitions node scripts/frame-times.mjs`, preview build, CPU 4×):
  push and back hold 60 fps once moving (median 16.7 ms, 3–6% of frames over 33 ms). Each starts
  with a pause of about 170–300 ms throttled (the new screen's render plus the capture). Tab
  crossfades drop more (11–25% over 33 ms, against 7% for the same switches with motion off):
  the tab screens are heavy to draw, and this machine composites in software. If the phone feels it,
  the lever is to make tabs switch at once.
- The motion demo is gone.

## Next
1. QA (the `qa` skill), fixes by tier, the retro, PR *B05 · Feel*, CI green, merge (owner's go).
2. Then B06 from its brief, on `B06/…` from `main`.

## Open with the owner
- Sign-off on the phone, after the new APK (`docs/local.md`, *Update Sen and Sen review*).
- `docs/local.md` *Now*: delete `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`; `SEN_OWNER_EMAIL`;
  first sign-in; Q14; sign out everywhere.
- Merge [ztsia/claude_skills#5](https://github.com/ztsia/claude_skills/pull/5).

## Don't argue again
- D129–D140 (the owner's calls). Deploys happen only by merge (D122); the review build follows
  `review` (D115).
- Money never counts up or down in motion.
- iOS back is an edge swipe in B39, for iOS standalone only, and never on Android (owner, 21 Oct).
- Haptics go through `performHapticFeedback`, not `@capacitor/haptics`' vibrator, so the phone's
  touch-feedback setting governs them.
