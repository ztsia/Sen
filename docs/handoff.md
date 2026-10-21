# Handoff

## Where things stand (21 Oct)

**B05 · QA tooling is merged** (PR 17). **B05 · Feel is in progress on `B05/feel`**
(`docs/briefs/B05-feel.md`).

Done so far:
- **The motion demo**, `apps/web/src/dev/motion.tsx`, at `/dev/gallery/motion`, reached from the
  dev panel (*Try the motion demo*). Previews and development only. It's self-contained: none of
  it is the app's motion yet. It shows:
  - the screen change: push, fade-through or fade
  - speed: 150, 200 or 250 ms
  - press feedback: scale, tint or ripple
  - one motion, or tuned per look
  - a payment opening with its amount morphing in place (the one shared element)
  - a Review row clearing with the rest sliding up, plus Undo
- **`review` points at `B05/feel`**, so the review app and `sen-review.vercel.app` show the demo.

**Next: the owner's picks** (the brief's one conversation), asked on 21 Oct. Then:
1. Record them as D140, and in `patterns.md` §8.
2. Then build.

### How the build will go (decided by this session)
- **Screen transitions** use TanStack Router's own `defaultViewTransition`. It also runs on
  popstate, so the back gesture is covered.
- **Direction** comes from `__TSR_index` in the history state: higher is forward, lower is back. A
  tab switch is told apart by both screens being tabs.
- **Types** go through the `types` callback where `:active-view-transition-type()` is supported,
  with a `data-` attribute on `<html>` as the fallback.
- **The shared element** works as in the demo: `view-transition-name` is set only while a
  transition runs.
- **Press feedback** is one delegated `pointerdown` listener in `src/frame/`, marking
  `[data-pressed]` within the first frame. CSS in the shadcn parts and the blocks draws it.
  Don't rely on `:active` alone: Chrome on Android can be late to apply it.
- **A view transition blocks taps while it runs**, so keep it under 250 ms.

### Known
- The `scan-after` journey fails now and then under the metrics' throttling (it waits for *Reading
  receipt…*, which shows only for a moment).
- Agents resumed after a usage limit ran on Opus (`brief` skill: check, and brief a fresh agent if
  so).

### Open with the owner
- The motion picks (above).
- docs/local.md *Now*:
  - delete the branches `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`
  - `SEN_OWNER_EMAIL` in Vercel Production
  - first sign-in
  - Q14 (inbox or spam)
  - sign out everywhere
- Merge [ztsia/claude_skills#4](https://github.com/ztsia/claude_skills/pull/4).

## Don't argue again
- D129–D139 (the owner's calls).
- Deploys happen only by merge (D122).
- The review build follows `review` (D115).
- Money never counts up or down in motion (the brief).
