# B14 · The reveal and the rotation

**After daily use starts** · after: B13 · next: B15

## Goal

Sen's look changes once a quarter, never silently: the first open of a new quarter plays the new
look's arrival, then offers *Keep it* or *Go back*. The roster follows D78. Placed here to land
before 1 Jan 2027. **Until it ships, rotation is off, and production stays on the look the owner
chose in B04's review.** If it lands after 1 Jan, the first change simply comes at the next quarter.

## Read first

- `spec_v2.md`: §9.4, all of it.
- `docs/ui/patterns.md`: §1 (`reveal` in what a look supplies) and §9, all of it.
- `docs/screens.md`: `new-look`, and Settings → *Appearance*.
- Decisions: D57, D76, D77, D78, D80, D84, D113.
- Each look's page in `docs/ui/directions/`, for its material and motion, and
  `docs/ui/directions/backlog.md`.
- B02's launcher-icon test result.
- Skill: `frontend-design`. Its narrowed use covers exactly this: each look's arrival.

## Builds

### The roster (pure TypeScript, deterministic)
- **D78's rules:**
  - on 1 Jan, the two looks that rested last year open the year, in a random order
  - the other two places are drawn from the four that played, and close the year
  - looks that haven't played count as resting, so the first year is a plain draw
  - no look plays twice in a row
- **One roster for everyone (D113),** computed from the year as a seed, so it needs no table, and
  everyone changes to the same look on the same day (`spec_v2.md` §15: *No global tables*).
- **A 30-year simulation test:**
  - no look away for more than eight quarters
  - none twice in a row
  - none resting two years running

### When the reveal shows (`patterns.md` §9)
- **The first open on or after** 1 Jan, 1 Apr, 1 Jul or 1 Oct, Kuala Lumpur time, unless a look is
  pinned.
- **Never on a first install or a new device.**
- **After more than a quarter away,** one reveal goes from the last look seen to today's.
- **Each person's state lives in `user_settings`** and syncs like any setting: rotate or pinned, the
  pinned look, the last look seen, and a kept *Go back* for this quarter. It works offline.

### The frame, and each look's arrival
- **The order:**
  1. the old look's Home, still
  2. the arrival, at most 2.5 s; a tap skips to its last frame
  3. the card: the look's name, Sen's avatar resting, *Keep it*, *Go back*, and the *Change each
     quarter* switch, with its line about Settings
- **The choices:**
  - *Keep it*, or back, keeps the new look
  - *Go back* keeps the old one for this quarter
  - with the switch off, the chosen look is pinned
  - either way you land on Home
- **Each look's arrival is built in code, as `DIR.reveal`,** in its own material and motion (D80):
  - Minted engraves
  - Instrument lights a display window
  - Firefly flies
  - Line writes in wet ink
  - Mercury fills with quicksilver
  - Copper strikes
- **Reduced motion:** a 250 ms crossfade instead.
- **TalkBack** announces *Sen has a new look: Copper*, and focus starts on *Keep it*.
- ***Play the reveal* in the dev panel,** from any look to any look, in light and dark.

### Settings → *Appearance*
- ***Changes each quarter*** (the default), or one of the six pinned.
- **Today's look,** and the date of the next change. *System / Light / Dark* stays.

### What follows the look on Android
- **The launcher icon,** through one activity-alias per look, switched when the choice is made, but
  only if B02's test showed the launcher keeps it in place. Otherwise the icon stays fixed. Record
  the result.
- **Notifications' small icon and accent** follow the look. Widgets, built in B23, will too.
- **Until the choice is made,** the icon and notifications keep the old look.

## Done when

1. The roster tests and the 30-year simulation pass.
2. The reveal logic passes fake-clock tests: quarter boundaries in Kuala Lumpur time, pinned, a first
   install, a long absence, *Go back*, and the switch off.
3. All 30 arrivals (every look to every other look) play in light and dark, within 2.5 s, skip on a
   tap, and crossfade under reduced motion. Screenshots of each card are in the PR.
4. **On the Xiaomi,** each arrival runs smoothly in the shell (no dropped frames you can see), and
   the launcher icon switches if allowed.
5. Rotation is on in production from this slice's release.

## On your phone

- [ ] In the dev build, *Play the reveal* for a few pairs. Does each arrival feel like its look?
- [ ] Pin a look in Settings, then unpin it.
