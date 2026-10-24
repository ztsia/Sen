# UI/UX: what Sen adds to the workflow's `uiux` skill

The plugin's skill holds the method and the general checklist. This file holds Sen's own surface,
blocks and rules, and wins where they differ. The patterns themselves are in `docs/ui/patterns.md`;
the screens and journeys in `docs/screens.md` and `docs/flows.md`.

## This app

- **One surface: a phone.** A web app full-screen inside an Android shell (Capacitor) on a Xiaomi
  15T (D42). A wide desktop window shows the phone layout, centred. Plus one public page: the split
  link friends open with no login, in the same components and theme.
- **Touch is the only input.** Not used: `HoverCard`, `Kbd`, `Menubar`, `NavigationMenu`,
  `Resizable`, `Sidebar`, `Sheet` from the side, `DataTable`, and a `Tooltip` as the only label.
- **The shell owns** Android's back gesture (closes the top overlay first; every overlay registers
  with the back handler), edge-to-edge safe areas with the status bar following the theme, and
  haptics.
- **Nothing in the web app runs while the app is closed** (capture, prompts and sync are Kotlin), so
  no screen may be the only place something happens.
- **The components** are `apps/web/src/components/ui/` (shadcn's, customised in place with a
  `// Sen:` note) and the blocks composed from them in `apps/web/src/blocks/`.
- **The component docs are for Next.js;** Sen is Vite (`apps/web/components.json`, style
  `new-york`). The skill's refresh rule therefore applies on first use: it writes Sen's own copy to
  `docs/workflow/uiux/`.
- **Other skills:** `dataviz` for charts and stat tiles; `frontend-design` only for a look's own
  drawing (D57, D84).

## Building a screen

- **Primary, in one line** (D130), such as *Primary: what's left until payday; main action: none*.
  At most one main action, drawn at 48 px.
- **Each kind of element has one block** (`patterns.md` §7): a fact → `FactGrid`, or the figure in a
  `HeaderCard`; a destination → `NavRow` with an `IconTile`; an action → one button, or an
  `ActionBar`, rare and destructive ones behind ⋯; a visual choice → `ChoiceCards` with a preview,
  `Segmented` with icons, or a grid of tiles; a how-to → `Steps`; a person → `PersonRow`.
- **A new pattern** goes into `docs/ui/patterns.md` first, and works in all six looks before it ships.
- **Look at it before calling it done:** `node apps/web/scripts/shots.mjs` at 390×844 in at least
  Minted light, Copper dark and Line light (Line's cards are rules, not boxes). Hold it against
  `screens/more/txn.tsx` and `screens/settings/settings.tsx`.
- **A look's material where it doesn't belong:** a tinted tile given the `card` class, which the
  current look repaints (Line turns it into a rule). Keep `card` for real cards.

## Sizes (`patterns.md` §2, D129)

- 48 px is the touch target, not the drawn size: a chip is drawn 32, a secondary or icon button 40,
  and `tap` extends each to 48.
- Section headings `text-lg` semibold in the text colour; secondary lines `text-sm` muted; times and
  marks `text-xs`; a row's leading mark a 32 px disc; list amounts in normal weight.
- The main action `size="default"`; every other button `size="sm"`; filters and choices
  `size="chip"`, in one row that scrolls sideways. Heights come from the size prop, never `className`.
- Payees sent in capitals are shown through `readableName`.

## Feedback and motion (`patterns.md` §8, D139, D140)

- Press feedback is the frame's ripple (`src/frame/press.ts`). Never add an `active:` tint; a control
  that draws its own response gets `data-no-press`.
- Haptics come from the parts (`src/lib/haptics.ts`, through the shell's `performHapticFeedback`): a
  change with Undo, Undo, an error after a tap, a long-press, a toggle, a pull past a limit. Never
  on scroll or every tap.
- A request on its way shows a `Spinner` and says what's happening (*Sending the code…*). Assume a
  slow network (escape E2).
- A tap's first visible change lands within 100 ms with the CPU slowed 4×.
- Screens move by themselves: the router starts a view transition for every navigation, and
  `src/frame/motion.ts` picks forward, back or a crossfade. A screen never animates its own entry.
- Lists whose rows clear or arrive use `useChangeMotion`, with `rowMotion(id)` on each row. A payment
  row that opens its detail passes `shareId`, as the detail's `HeaderCard` does.
- Otherwise CSS at 200 ms on `--motion-ease`. **Money never counts up or down in motion.**
- Toasts with *Undo* stay 6 s.

## Money (the main content)

- `RM 12.90`: currency prefix, thousands separators, `tabular-nums`.
- Money in or out shown by sign and icon as well as the money tokens' colour.
- Amounts never truncate: the merchant name does.
- Amount inputs use `inputMode="decimal"`, parsed as text straight into sen.
- Glance surfaces such as Home stay at four figures (`spec_v2.md` §9.2).
- Amounts read out as "RM 12.90", not a string of digits.

## Six looks (D77, D78)

- Every screen works in all six looks, light and dark: Minted, Instrument, Firefly, Line, Mercury and
  Copper. Only materials change; layout, words, icons and meanings don't (`patterns.md` §1).
- Semantic tokens only; a shared component never reads a look's own `extra` variables.
- Icons outside the tab bar are lucide, drawn with the look's `--icon-stroke`, `--icon-cap` and
  `--icon-join`, coloured by where they sit (`patterns.md` §5).
- Charts use `chart-accent` and `chart-context`, or `chart-1` to `chart-3`, never both, and never a
  category colour (`patterns.md` §4).

## Sen's own rules

- One navigation: the bottom tab bar (`spec_v2.md` §9.1).
- Undo instead of confirm for delete, recategorise and mark-as-transfer.
- Dates in Kuala Lumpur time, relative when recent (*Yesterday, 21:02*), never ambiguous (*3 Oct*,
  not *03/10*).
- The sign-in code's input uses `autocomplete="one-time-code"`. Offer what was entered before (the
  last account, the most used categories).
- Never make dragging the only way: a split's ticks, a crop's corners and a stepper have tap
  alternatives. Swiping sideways on content is reserved for the back gesture.
- Nothing loops except a loading indicator and Sen's avatar; both stop for reduced motion.
- Sen's replies stream as they're written; its drafts and estimates are labelled as Sen's, never shown
  as fact (`CLAUDE.md`: models draft, the owner confirms).
- Some of these rules are adapted from
  [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT,
  `THIRD_PARTY_NOTICES.md`).
