# B05 · Feel: motion, feedback and haptics

Branch `B05/feel`, from `main` once *B05 · QA tooling* is merged (D139). Before B06.

**Why:** since the B04 redesign the screens look right, but using Sen feels dry and flat: "like a
blank piece of paper that changes", or a phone in battery saving mode (owner, 16 Oct).
- Screens swap with no transition, and a tap gives no sign it landed.
- `patterns.md` already asks for 150–250 ms UI motion that explains each change (*Motion*), but B04
  built only the new-look crossfade.
- Haptics exist only on Scan's long-press, on paper.

This slice makes every interaction felt, judged by *QA tooling*'s feel capture and metrics.

## Start with the owner (one short conversation)

Before building, show a **motion demo page in the dev gallery** (`/dev/gallery/motion`). The owner
tries its variants on the phone, in the review app, and picks one of each:
- **Screen change:** an Android-style push (forward slides in from the right with a slight fade,
  back reverses), a shared-axis fade-through, or a plain fade.
- **Speed:** 150, 200 or 250 ms.
- **Press feedback:** a slight scale, a tint, or a ripple.
- **Motion per look:** one motion for all six looks, or each look tuning the shared motion's easing
  and duration in its own character (the recommendation: one motion, each look's own moments kept
  as they are).

Batch the questions with a recommendation each (CLAUDE.md, *The owner*). Record the answers as a
decision and in `patterns.md`'s motion section before the build.

## What it builds

1. **Screen transitions** through the View Transitions API, which Android's WebView supports:
   - **Direction-aware:** forward pushes; back pops, the Android back gesture included; a tab
     switch crossfades, and each look keeps its own `switch` motion on the tab bar.
   - **Sheets** rise and fall (vaul already animates; check each look).
   - **One shared element:** a payment row opening into its detail, the amount staying in place.
     More only if it reads well.
2. **Press feedback within one frame** on everything tappable: buttons, list rows (`NavRow`,
   `Item`), chips, the tab bar and Sen's button. It is done in each shadcn part and block, in place
   (CLAUDE.md, *shadcn first*), never at a call site.
3. **Motion that explains a change:**
   - a Review row clearing and the next sliding into its place
   - a row added or removed
   - toasts in and out
   - a skeleton fading into its content
   - a sheet's content resizing

   Money never counts up or down: an in-between amount is a number nobody had.
4. **Haptics** through `@capacitor/haptics` in the shell, on a few moments only:
   - confirm
   - Undo
   - an error
   - a long-press
   - a toggle
   - a pull past a limit

   The bridge gains one method; the web app checks the shell's version before calling (spec §5.1,
   methods only ever added). A browser has no haptics. A new APK is released, with the update step
   in `docs/local.md`.
5. **Reduced motion and the system's settings:**
   - `prefers-reduced-motion` settles every transition to a short fade, or none
   - Android's *Remove animations* reaches the WebView as reduced motion
   - haptics follow the system's touch-feedback setting
6. **Smoothness:** every transition holds 60 fps with the CPU slowed 4×, in every look
   (`frame-times.mjs` extended to transitions, through *QA tooling*'s metrics). No transition delays
   a tap's first visible change past 100 ms.
7. **Docs:**
   - `patterns.md`'s motion section becomes the contract: which change gets which motion, its
     duration and easing, and reduced motion
   - the `uiux` checklist gains the feel items
   - `qa-eyes`'s feel questions cover transitions

## Done when

- **The owner signs it off on the phone**, in the review app with the new APK.
- **The feel capture and metrics flag nothing:**
  - every tap answers within 100 ms
  - 60 fps through transitions under the slowed CPU
  - no layout shift from motion
- **The tests stay reliable:**
  - functional e2e runs with reduced motion, so motion can't make them flaky
  - the feel pass runs with motion on
  - the trees are unchanged except where a screen gains an element
- **Reduced motion is proven** by a journey in it, and haptics by an emulator test of the bridge
  call.
- **The code checks are clean:** typecheck, lint, format, unit tests, `pnpm e2e` in six looks, and
  the emulator job.

## How to build it

Opus decides the motion system (one module in `src/frame/`, the router's integration and the
direction rule) and the haptics bridge. Implementers apply press feedback across the parts and
blocks, and the change motions across screens, each batch owning its files (the `brief` skill).
