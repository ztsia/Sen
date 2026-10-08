# B04 · Skeleton: everything else, and your review

**Stage 1 · Frame** · after: B03 · next: B05

## Goal

The rest of Sen's screens and every native surface exist with made-up data, every journey in
`flows.md` can be clicked through, and **the owner reviews the whole skeleton on the phone** (D84).
What the owner changes lands here, in the docs first, so every later slice builds the approved
design.

## Read first

- `docs/screens.md`:
  - *Shared bills*: `split`, `split-public` and `shared`
  - *Sen*: `sen`
  - *More*: `accounts`, `account`, `balance-check`, `claims`, `claim` and Settings
  - *Outside the tabs*: `sign-in`, `first-run`, `payday` and `new-look`
  - *Native surfaces*
  - *Defaults to confirm*
- `docs/flows.md`: every journey not covered by B03.
- `docs/ui/patterns.md`, especially §7 (status cards) and §9 (the reveal's frame).
- `spec_v2.md`:
  - §7 (splits)
  - §9.1 (widgets and the island), §9.5, §9.6, §9.7
  - §12.2 rule 6 and §12.3 (how UI tools show)
  - §12.5 (files in the chat)
  - §13 (the submission kit)
- Decisions: D47, D52, D60, D64–D66, D71, D72, D76, D77, D84, D92, D94, D98, D101, D103–D109.

## Builds

### Screens, with made-up data

- **Shared bills:**
  - `split`, in its *Still changing* and *Final* states, as payer and as one who owes: the QR for
    the table (a stand-in image), items with who ticked them, *I've ticked everything I had*,
    *Lock without waiting for…*, the payer's tick list, and *You owe…*
  - `split-public`: no app chrome, the same components and look. A name box the first time, then
    *Sen remembers this browser*; read-only after the lock; and *This split is closed*
  - `shared`
- **Sen:**
  - `sen`: *Looking at: …*, a check-in note, an answer, a proposal card (*Apply*, *Dismiss*), a
    research draft with numbered sources, `ask_user` buttons, a figure marked *not checked*, one
    marked *from your file*, the composer with its clip button, suggested questions, and the
    streaming, offline and paused states
  - `agent/memory`, `agent/research` and `agent/usage`
- **Accounts:** `accounts`, `account` and `balance-check`.
- **Claims:** `claims` and `claim`, the submission kit, with made-up schemes only (`CLAUDE.md`).
- **Settings, every section in `screens.md`'s table,** including *Members* and *Claims → ESS*. Each
  section shows only to those who can use it.
- **Outside the tabs:**
  - `sign-in`, with all its states
  - `first-run`, both versions: the shell's seven steps, and the short one without capture
  - `payday`, with its four steps, *Skip*, and step 1 both done and asked
  - `new-look`: the shared frame (`patterns.md` §9) with a 250 ms crossfade only, since each
    look's arrival is B14's; *Play the reveal* in the dev panel

### Native surfaces, as stand-ins in the dev panel
- Every row of `screens.md`'s *Native surfaces*:
  - the prompts: category, paying-back, quiet scan
  - the owe reminder
  - pushes: health alerts, Sen's push, claim reminders, export ready
  - widgets S, M and L in each look, light and dark, and dark with *Capture is off*
  - launcher shortcuts, the share target, and each island moment
- **The simulator**, which drives the skeleton:
  - *A notification arrives*: the prompt stand-in, then Review
  - *Payday*: the card
  - *Capture off*: the warning and dark widgets
  - *Offline*

### Every journey, clickable
- A guided list of every `flows.md` journey in the dev panel, like the wireframe's, each walking
  its screens in order.

## The review

The owner opens the preview inside the **debug shell** from B02, on the phone.

- [ ] **The seven *Defaults to confirm*** (`screens.md`): keep, or change each one.
- [ ] **Mercury and Copper:** does their WebGL feel right in the real WebView? If not, simplify the
      motion or set a frame budget.
- [ ] **Production's look until B14:** rotation stays off until the reveal ships, so production
      shows one look, which the owner picks here.
- [ ] **Anything you'd change.** Every change goes into `screens.md`, `flows.md` or `patterns.md`
      first (and `decisions.md` if it's a decision), then the code.

## Leaves for later

- Each look's own arrival: B14. Everything real: B05 onwards.

## Done when

1. Every journey in `flows.md` clicks through in Playwright at 390×844, in all six looks, light and
   dark, with a screenshot per step.
2. An axe scan passes on every screen and native stand-in.
3. **The owner signs the skeleton off.** Their answers to the defaults, the WebGL verdict and the
   production look are recorded: decisions in `docs/decisions.md`, and `screens.md` updated.
4. The changes the owner asked for are made.

## On your phone

- [ ] Install the debug shell (B02) and walk every journey from the dev panel's list.
- [ ] Answer the review list above.

## Notes

- `split-public` must not share code paths that could ever show app data. It renders only what its
  data hook returns, which from B18 is only that split.
