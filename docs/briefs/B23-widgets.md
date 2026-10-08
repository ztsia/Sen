# B23 · Widgets

**Stage 5 · Insights and plans** · after: B22 · next: B24

## Goal

Home-screen widgets in three sizes answer more as they grow, drawn in each look, refreshing by
themselves. They turn dark with *Capture is off* when the listener stops, because the home screen is
where it would be noticed.

## Read first

- `spec_v2.md`:
  - §9.1: *Widgets*
  - §9.4: *On Android, everything follows the look*
  - §18: the listener row
  - §5: the native shell's jobs
- Decisions: D32, D42, D74, D77 (widgets keep the old look until the choice), D100 (FCM refreshes),
  D101 (each look draws them, with system fonts).
- `docs/screens.md`: the widgets row of *Native surfaces*, and B04's widget stand-ins, which are the
  approved design.
- `docs/ui/patterns.md` §1, and each look's assets in `docs/ui/directions/assets/`.

## Builds

### The widgets
- **Small:** *left until payday*, a meter of spending against how much of the cycle has gone, and
  *Scan*.
- **Medium** adds the pace line, this cycle against last, and *Review* with its count.
- **Large** adds the top categories, the budget most at risk, and Sen's latest note, which is hidden
  until B29.
- **Each look draws them:**
  - colours, shapes, icons, the large figure and the layout, in light and dark
  - fonts are the system's, or text drawn as an image
  - they follow the look only once the reveal's choice is made (B14)
- **Every size goes dark with *Capture is off* and *Fix*** when the listener stops or the heartbeat
  goes stale.
- **Taps:** *Scan* opens `scan`, *Review* opens `review`, and the rest opens `home`.

### Data and refresh
- **A small widget payload,** computed by the same views as Home and kept on the phone.
- **It's refreshed** after each sync, by an FCM data message while the app is closed (D100), and on
  a periodic schedule as a fallback.

## Done when

1. On the emulator, each size renders in each look, light and dark, with real-shaped data. The
   screenshots are in the PR.
2. Killing the listener turns each size dark with *Fix*.
3. **On the Xiaomi:** all three sizes sit on the home screen and update by themselves after a payment
   with the app closed.

## On your phone

- [ ] Add the three sizes. Pay for something with Sen closed: do they update?
