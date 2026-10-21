# Handoff

## Where things stand (21 Oct)

**B05 · Feel is in progress on `B05/feel`** (`docs/briefs/B05-feel.md`). The owner has paused it to
save quota and will say when to build. B05 · QA tooling is merged (PR 17).

Done:
- **The motion demo** (`apps/web/src/dev/motion.tsx`, `/dev/gallery/motion`, from the dev panel's
  *Try the motion demo*). Previews and development only, and none of it is the app's motion. Keep it
  until sign-off.
- **The owner's picks, D140:** push, 200 ms, ripple, one motion for all six looks. Written into
  `patterns.md` §8, which is now the motion contract.
- **Measured cost** on a preview build with the CPU slowed 4×, motion on against off:
  - the ripple costs nothing
  - a push adds one pause of 35–65 ms at its start (the capture)
- `review` points at `B05/feel`.

**Next: build**, from the brief's *What it builds*. Nothing of the build is written yet.

### The build plan (this session's calls; follow them)
- **Screens:** set `defaultViewTransition` on the router (it runs on popstate too, so the back gesture
  is covered). In `router.subscribe('onBeforeNavigate')`, set `html[data-nav]`:
  - `tab` when both paths are tabs
  - `forward` or `back` by `__TSR_index` in each location's state
  - none on first load, and none when the href is unchanged. `useBackClose` pushes a sheet's step
    at the same href, and that must not slide the screen.
  - none on a same-path replace (a filter change)
  - none under reduced motion: return `types: false` from the callback, with CSS as the fallback

  Clear `data-nav` on `onResolved`.
- **Where the transition applies:** wrap `<Outlet />` in `app-shell.tsx` in one
  `flex min-h-0 flex-1 flex-col` div named `screen`. That changes no trees or pixels. Set
  `::view-transition-*(root)` to `animation: none`, so the tab bar's own `switch` plays live, and
  give `::view-transition-group(screen)` `overflow: clip`.
- **The shared amount:** add an optional `shareId` prop to `ListRow` (on its amount) and to
  `HeaderCard` (on its figure), and have the payment detail pass the payment id. The motion module
  remembers the id on tap. During that navigation only, one `<style>` gives
  `[data-share="<id>"] [data-sen]` the name `amount`, going forward and back. A duplicate name only
  costs that one animation.
- **Ripple:** one delegated `pointerdown` listener in `src/frame/press.ts`. It works on
  `[data-slot=button|item|toggle-group-item|toggle]`, the tab bar's `[data-k]` and Sen's button.
  - It inserts a clip span (`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none`)
    with a circle that scales from the finger, in `currentColor` at about 12%.
  - The host's `position: relative` goes in `@layer base`, so Tailwind's `.absolute` still wins
    (HeaderCard's Copy button).
  - Under reduced motion it shows as a tint, with no spread.
  - Remove the parts' `active:bg-*` tints (about 40 of them) so they don't double up.
- **Haptics:** one `SenShell.haptic({ kind })` method using `View.performHapticFeedback`. It follows
  the system's touch-feedback setting by itself, which `@capacitor/haptics`' vibrator doesn't. This
  departs from the brief's wording on purpose.
  - The constants: CONFIRM, REJECT, LONG_PRESS, TOGGLE_ON/OFF (with fallbacks below API 30 and 34)
    and SEGMENT_TICK.
  - The web app checks the shell's version before calling it.
- **Change motion** (Review clearing, rows in and out): use a document view transition with names
  set on the rows only while it runs, as in the demo. Query-cache updates notify asynchronously, so
  make the update callback async (await a macrotask) rather than relying on `flushSync`. Reuse
  `settleTap` on Review.
- Then: functional e2e under reduced motion, the feel pass with motion on, `frame-times.mjs` over
  transitions, an emulator test of `haptic`, docs (`uiux` checklist, `qa-eyes` questions), a new
  APK, and the owner's sign-off on the phone.

### Known
- The `scan-after` journey fails now and then under the metrics' throttling.
- Agents resumed after a usage limit ran on Opus (`brief` skill).

### Open with the owner
- When to start the build (the owner will say).
- docs/local.md *Now*:
  - delete the branches `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`
  - `SEN_OWNER_EMAIL` in Vercel Production
  - first sign-in
  - Q14 (inbox or spam)
  - sign out everywhere
- Merge [ztsia/claude_skills#5](https://github.com/ztsia/claude_skills/pull/5), the motion lessons in
  `uiux`. #4 is merged.
- iOS back (asked 21 Oct): an installed iOS PWA has no back gesture, though every pushed screen has a
  back button. Recommended: a left-edge swipe for iOS standalone only, driving B05's back transition,
  built in B39 (PWA), not B05. Android needs nothing, since the system gesture already works. Waiting
  on the owner's yes, then one line in B39's brief.

## Don't argue again
- D129–D140 (the owner's calls).
- Deploys happen only by merge (D122). The review build follows `review` (D115).
- Money never counts up or down in motion.
