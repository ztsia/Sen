---
name: uiux
description: How to build any screen in this app, a phone-first web app shown inside an Android shell, with shadcn/ui. Use when choosing components and layout for a screen, building one, or checking one before it's done. Read the shared patterns, then the component index and only the docs it shortlists; name what's primary and sort every element into a fact, destination, action, choice or how-to, each with its own card-based block (D130); keep every screen inside the app's shared patterns; and hold it to a phone checklist covering thumb reach, touch targets, sheets, undo, the back gesture, offline, accessibility, how money is shown, and working in all six looks.
---

# UI/UX: shadcn/ui, phone first, one set of patterns

You are a senior product designer who ships shadcn/ui. You have two jobs: pick the right components
for a screen, and keep every screen inside the app's shared patterns. **The second job matters
more.** The owner's previous project had screens that each worked well and an app that didn't hang
together.

The component docs come from GCO_events (D43). Its look doesn't: this app has its
own design.

## Sources, in this order

1. **`docs/ui/patterns.md`**, written by `S2`: what each of the six looks supplies and what never
   varies, the tokens, money, charts, icons, navigation, and the building blocks (rows, detail page,
   form, sheets, toast with *Undo*, status cards, empty, loading, error and offline). **A screen uses
   these; it doesn't invent its own.** If a screen genuinely needs a new pattern, add it to that file
   first.
2. **`docs/screens.md`** and **`docs/flows.md`**: what each screen contains, and where it leads.
3. **The components in the repo** (`apps/web/src/components/ui/`, shadcn's, customised in place, and
   the patterns composed from them in `apps/web/src/blocks/`). Read a
   component's source before recommending it: the source is the documentation, and its props are the
   real ones.
4. **`.claude/skills/uiux/docs/components-index.md`**, read in full, then only the `<component>.md`
   docs you shortlist. Never open a doc speculatively.
5. **`.claude/skills/uiux/docs/instructions/`** for theming, dark mode and `components.json`.
6. **Other skills:** `dataviz` for charts and stat tiles, and the official `shadcn/ui` skill once the
   foundations slice installs it, for current APIs.

## This app

- **One surface: a phone.** A web app shown full-screen inside an Android shell (Capacitor) on a
  Xiaomi 15T (D42). It also runs in a desktop browser, but nothing is designed for the desktop: a wide
  window shows the phone layout, centred.
- **Plus one public page:** the split link that friends open, with no login. It uses the same
  components and theme.
- **Touch is the only input.** Nothing may depend on hover or a keyboard shortcut. These components
  don't belong here: `HoverCard`, `Kbd`, `Menubar`, `NavigationMenu`, `Resizable`, `Sidebar`, and a
  `Tooltip` used as the only label. `DataTable` is for desktop consoles; lists here are list rows.
- **The shell, not the page, owns some behaviour:**
  - **Android's back gesture** closes the top sheet or dialog first, then goes back a screen. Every
    overlay registers with the back handler.
  - **Safe areas:** content respects `env(safe-area-inset-*)` with edge-to-edge system bars, and the
    status bar's style follows the theme.
  - **Haptics** come from the shell's plugin: a light tick on commit, never on scroll.
  - **The keyboard** must never cover the focused input.
- **Nothing in the web app runs while the app is closed.** Capture, prompts and sync live in Kotlin
  (`CLAUDE.md`), so no screen may be the only place something happens.
- **Money is the main content.** Its rules are in the checklist.

## Building a screen

1. List every UI element the screen needs or implies. `docs/screens.md` gives its contents, and
   `docs/flows.md` what happens around it, including when things go wrong.
2. **Say what's primary before you build** (D130): one line, *Primary: what's left until payday;
   main action: none*. One thing to look at first, at most one main action drawn at 48 px. If you
   can't name it, the screen isn't designed yet.
3. **Sort every element into what it is**, because each kind has one block (`patterns.md` §7):
   - a **fact** → `FactGrid` (label above value), or the figure in a `HeaderCard`
   - a **destination** → `NavRow` with an `IconTile`, showing its state on the right
   - an **action** → one button, or an `ActionBar`; rare and destructive ones behind ⋯
   - a **visual choice** (a look, a mode, a category) → shown as itself: `ChoiceCards` with a
     preview, `Segmented` with icons, a grid of tiles
   - a **how-to** → `Steps`, never paragraphs
   - a **person** → `PersonRow`
   Facts and actions must never look alike: a screen where they do reads as a list of text.
4. Map each element to components. Read
   `components-index.md` in full and shortlist with its *When to use* column and disambiguation
   notes, then read each shortlisted doc in full: variants, props, examples and sub-components.
5. Compose existing components before building anything custom. A need that no pattern covers goes
   into `docs/ui/patterns.md` first, as a composition of shadcn primitives, and works in all six looks
   before it ships.
6. Build it, then hold every element to the phone checklist and the rules below. Where there's room,
   push past correct towards polished, but never outside the shared patterns.
7. **Look at it before calling it done:** `node apps/web/scripts/shots.mjs` at 390×844 in at least
   Minted light, Copper dark and Line light (Line's cards are rules, not boxes, so anything that
   leans on a card's fill shows up there). `screens/more/txn.tsx` and `screens/settings/settings.tsx`
   are the references to hold it against.

## What drift looks like

Check every element of a screen, new or existing, for these, and fix them before calling it done:
- **Pattern drift:** it solves an already-solved problem differently from `docs/ui/patterns.md`.
  Fix it even when it looks fine; this is how the owner's previous app stopped hanging together.
- **Hand-rolled** where a component or pattern already exists.
- **Wrong component**, or a component used against its docs.
- **Correct, but a prop, variant or composition would lift it.** Use it.
- **Flat or upside-down hierarchy:** a heading the same size as, or smaller than, what it heads;
  every element at one size; every button drawn as big as the main action. The screen then reads as
  dense and overwhelming even with a few lines on it (the owner's review of B04, D129).
- **A list of text** (the owner's review of B04, D130): label-and-value rows with no icons, no
  grouping and nothing primary, so the screen looks like a form from 2005 whatever its data. Signs:
  facts drawn as rows with chevrons, actions drawn as rows under them, a destination that doesn't say
  its state, a visual choice (a look, a mode) offered as words, paragraphs explaining a setup, a long
  record squeezed into a sheet.
- **A look's material where it doesn't belong:** a preview of one look inside another, or a tinted
  tile, given the `card` class, which the current look repaints (Line turns it into a rule). Keep
  `card` for real cards.

## Phone checklist

**Reach and layout**
- The primary action sits in the bottom third of the screen, reachable one-handed. Nothing critical
  goes in a top corner.
- Touch targets are at least 48 px, with 8 px between them. **48 px is the target, not the drawn
  size:** a chip is drawn 32, a secondary or icon button 40, and `tap` extends each to 48 for the
  finger, as Android does.
- One column.

**Hierarchy and density** (`docs/ui/patterns.md` §2, *Sizes*, D129)
- Every element sits at one level (title, section, body, secondary, caption), and the level sets its
  text, the height it's drawn, its icons and the space around it together. A button belongs to the
  level of the text beside it, not a level of its own.
- A heading is always bigger than what it heads: section headings `text-lg` semibold in the text
  colour, never small grey labels above bigger text.
- One main action per screen is drawn at 48 (`size="default"`); every other button `size="sm"`,
  filters and choices `size="chip"`, in one row that scrolls sideways. Heights come from the size
  prop, never from `className`.
- Secondary lines `text-sm` muted, times and marks `text-xs`; a row's leading mark a 32 px disc;
  amounts in a list in normal weight. Payees sent in capitals are shown through `readableName`.
- Check by screenshot at 390×844: where does the eye land first, second, third? If everything
  competes, step something down a level before adding space.

**Navigation**
- One navigation (`spec_v2.md` §9.1): the bottom tab bar. No sidebar, and no second navigation.
- The back gesture does what's expected on every screen, closing overlays first.
- No dead ends: every screen in `docs/screens.md` is reachable and has a way out. Each screen answers
  one question or supports one decision.

**Overlays and confirmation**
- Bottom sheets (`Drawer`) for choices and short forms. `AlertDialog` only for destructive,
  irreversible actions. Nothing important behind a `Popover`, which is fiddly on touch.
- **Undo instead of confirm:** act at once, then offer *Undo* in a `Sonner` toast. This applies to
  delete, recategorise and mark-as-transfer.

**Feedback**
- **Every action gets a response:** an optimistic update, a light haptic on commit, and a toast only
  when the result isn't visible on screen.
- **Loading:** `Skeleton` shaped like the content, never a full-screen spinner. Pull-to-refresh
  wherever data syncs.
- **Waiting on the server:** a button whose request is on its way shows a `Spinner` and says what's
  happening (*Sending the code…*), at once, never only greyed out. Assume a slow network: a local
  request is instant, a phone's isn't (escape E2).
- **Felt within 100 ms:** a tap's first visible change (a press, a pending state, the change itself)
  lands within 100 ms, under the CPU 4× slower; what changes looks caused by the tap, and nothing
  jumps or stalls on the way. QA measures the first change and films the second after each tap
  (D139); *B05 · Feel* sets the motion.
- **Empty:** one line saying what will appear here, plus the action that fills it (`Empty`). No
  illustrations.
- **Errors:** what happened and what to do next, in plain words. Never lose the user's input. Being
  offline is a banner, not an error.

**Money** (the app's main content)
- **Format:** `RM 12.90`, with a currency prefix, thousands separators, and `tabular-nums` so columns
  line up.
- **Money in vs money out** is shown by sign and icon as well as colour (the money tokens), never
  colour alone.
- **Amounts are never truncated.** Truncate the merchant name instead.
- **Amount inputs** use `inputMode="decimal"` and are parsed as text straight into sen, never through
  a float.
- **Glance surfaces such as Home** stay at four figures (`spec_v2.md` §9.2).

**Forms**
- `Field` around every input, with the right `inputMode` and `enterKeyHint`. The first field the user
  must fill is focused automatically.
- Validate on blur and on submit, show the message under the field, and keep the submit button
  enabled.

**Motion**
- CSS transitions at 150–250 ms, easing out on entry; Motion only where a gesture needs it. Motion
  explains a change; it never decorates.
- Respect `prefers-reduced-motion`.

**Accessibility**
- Every icon-only button has an `aria-label` that TalkBack reads out.
- Amounts read as "RM 12.90", not as a string of digits.
- Text scales with the system font size to at least 1.5× without clipping.
- Contrast meets WCAG AA in both the light and dark themes.

**Theme: six looks** (D77, D78)
- Semantic tokens only (`bg-background`, `text-muted-foreground`, the money, chart and icon tokens),
  never raw colours or hex values. A shared component never reads a look's own `extra` variables.
- **A screen works in all six looks**, light and dark: Minted, Instrument, Firefly, Line, Mercury,
  Copper. Only materials change; layout, words, icons and meanings don't (`patterns.md` §1). Check
  it in at least the lightest and the darkest look.
- Icons outside the tab bar are lucide, drawn with the look's `--icon-stroke`, `--icon-cap` and
  `--icon-join`, coloured by where they sit (`patterns.md` §5).
- Charts use `chart-accent` and `chart-context` for focus and context, or `chart-1` to `chart-3` for
  separate things, never both, and never a category colour (`patterns.md` §4).
- Light and dark follow the phone from the first screen (`.claude/skills/uiux/docs/instructions/darkmode.md`).

**Performance**
- Long lists are virtualised (TanStack Virtual), with stable row heights.
- Images lazy-load inside a fixed aspect ratio (`AspectRatio`), so nothing jumps.

## Rules carried over from ui-ux-pro-max

The useful rules from `nextlevelbuilder/ui-ux-pro-max-skill` (its `data/ux-guidelines.csv` and
`data/stacks/shadcn.csv`), cut to what this app can use (D57). Web-only rules (skip links,
breadcrumbs, hover states, sidebars, desktop tables) are left out; where one conflicts with the
checklist above, the checklist wins.

**Interaction**
- Every control has a pressed state, and a visible focus ring (2 px, 3:1 against its surroundings)
  for TalkBack and switch access.
- A button that starts slow work shows it's working and ignores a second tap until it's done.
- A disabled control looks disabled and says why nearby; prefer an enabled button that explains.
- Never make dragging the only way to do something: a split's ticks, a crop's corners and a
  stepper all have tap alternatives.
- Swiping sideways on main content is reserved for Android's back gesture. No carousels that
  auto-advance.

**Layout**
- Full-screen layouts use `dvh`, not `vh`, and every fixed element (tab bar, Sen's button, toasts,
  banners) accounts for the safe areas and the others, so none covers another or the focused field.
- A z-index scale, not ad-hoc values: content, sticky headers, tab bar, Sen's button, sheets, toasts.
- Reserve the space for anything that loads, so nothing jumps: skeletons the size of the content,
  images in an `AspectRatio`, fonts with a matching fallback.
- Long merchant names and references wrap with `overflow-wrap: anywhere`, or truncate with a path
  to the full text (the detail page). Never clip an amount, a status or a date.
- A row of chips wraps, or shows *+3* that opens the rest. Never a clipped single row.

**Motion**
- One or two things animate per change at most; animate `transform` and `opacity` only.
- Decelerate on arrival, accelerate on exit, linear only for steady progress.
- Required state never waits on `animationend`: set the final state directly, and let a new change
  cancel the old motion.
- Nothing loops except a loading indicator and Sen's avatar, and both stop for reduced motion.

**Feedback**
- Toasts auto-dismiss (6 s here, for *Undo*), never pile up, and are announced politely.
- A badge's change is announced once, as words: *5 to review*, not a bare number.
- Errors sit next to what caused them, linked with `aria-describedby`; a failed submit moves focus
  to the first problem.
- Sen's replies stream as they're written; its drafts and estimates are labelled as Sen's, never
  presented as fact (`CLAUDE.md`: models draft, the owner confirms).

**Forms**
- A visible label on every input; a placeholder is an example, never the label.
- The right `inputMode` and `autocomplete` (`one-time-code` on the sign-in code, which also allows
  paste).
- Offer what was entered before instead of asking again: the last account, the most used
  categories.

**Content**
- Dates in Kuala Lumpur time, relative when recent (*Yesterday, 21:02*), never ambiguous
  (*3 Oct*, not *03/10*).
- Body text at least 16 px, line height 1.4–1.6; secondary text never below 12 px.
- Status words are text, not colour: a pill that's only a status isn't a button.

**shadcn/ui**
- **Every building block starts from a shadcn component.** Add it with the CLI (`npx shadcn@latest
  add`, `--dry-run` before overwriting a customised one) and import it from `@/components/ui`.
- **Customise the shadcn file itself** (`apps/web/src/components/ui/<component>.tsx`) when its
  defaults don't fit the phone: 48 px touch targets drawn at their level (§2, *Sizes*), the look's
  tokens and radii, no clipping at 1.5×.
  Never write a second, hand-rolled version of something shadcn has. A pattern from `patterns.md`
  is a composition of these components (in `apps/web/src/blocks/`), not a replacement for them.
- Semantic colour pairs (`primary` with `primary-foreground`), defined in full for `:root` and
  `.dark`, as each look's `theme.css` does.
- Compose compound components (`Card` with `CardHeader` and `CardContent`), and keep their ARIA:
  don't override it, and let them manage focus.
- Forms: `Field`, `FieldLabel` and `FieldError` with the form library's field state, and a schema
  validator.
- `Sonner`'s `<Toaster />` once, in the app's layout. `Skeleton` sized like the content.
- Charts: the `Chart` wrapper with a `chartConfig` that names token colours, and `ChartTooltip`
  with `ChartTooltipContent`; no inline colours, no raw Recharts tooltip.
- `Drawer` (a bottom sheet) for choices and short forms, `AlertDialog` only to confirm what can't be
  undone, each with a title. `Sheet` from the side isn't used: there's no side navigation.

## Universal rules

- **Read the pattern, the index and the full doc (or the component's source)** before recommending
  anything.
- **Compose existing components** before building a custom one.
- **Be specific:** component, sub-component, prop and variant names exactly as they appear in the
  docs.
- **Push past correct toward polished**, but never outside the shared patterns.
