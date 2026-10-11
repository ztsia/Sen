# B03 · The `uiux` checklist

The phone checklist from `.claude/skills/uiux/SKILL.md`, held against every screen B03 builds:
`home` and `cycle`, `review` and `skipped`, `scan`, `crop`, `reading`, `confirm` and `manual`,
`insights`, `budgets`, `subscriptions`, `goals`, `goal` and `insights/year`, and `more`,
`payments`, `txn` and `receipt`. Done when 4 of the brief: no screen invents a pattern.

| Check | How it's held | Evidence |
|---|---|---|
| Patterns, not inventions | Every list is `ListRow`/`DayHeader`/`ReviewRow`/`SettingsRow`; a payment is `DetailPage`; every choice is a bottom `Sheet`; every state is `EmptyState`, `ListSkeleton`/skeletons, `ErrorState` or `OfflineBanner` through `screens/kit.tsx`'s `Loaded`. Two shared sheets were added as compositions, `CategorySheet` and `NoteSheet` (patterns.md §7 already names both). New chart blocks (`ColumnBars`, `Sparkline`, `RankedBars`, `GoalMeter`, `MiniPace`) are in `blocks/charts.tsx`, with their line in patterns.md §4 | review of each screen's imports |
| shadcn first | `Textarea` added with the CLI and customised in place (`// Sen:` note); everything else was already there | `components/ui/` |
| Reach | Main actions in the bottom third: Save, Done/Split, Use this, Take a photo, Add a budget sit at the foot | screenshots in the journeys' attachments |
| Touch targets | 48 px everywhere, checked by `smallTargets` on every screen in all twelve looks | `e2e/screens.spec.ts` |
| One navigation | No screen adds its own; task screens (`scan`, `confirm`, `manual`) hide the tab bar | `registry.ts` kinds |
| Back | Every sheet registers with `useBackClose` through `Sheet` | `blocks/sheet.tsx` |
| Undo, not confirm | Every write goes through `useWrite`/`runCommand`, which toast *Undo*; Delete acts at once | `e2e/journeys.spec.ts` (`pay-new`, `fix`) |
| Loading, empty, error, offline | Reachable from the dev panel's *Screen state*, or `?state=`; each says what it is in words | `e2e/screens.spec.ts` states |
| Money | `<Money>` only: `RM1,284.50`, tabular, in with `+` and its colour, never truncated, read as money; typed amounts through `MoneyInput`/`checkAmount` into sen; no float anywhere (lint) | `pnpm lint`; text-scale test |
| Glance at four figures | Home: the figure, pace, balance and the gap; Review's count is the badge | `home.tsx` |
| Forms | `Field` with labels; amount `inputMode="decimal"`; search `inputMode="search"`; first field focused | `manual.tsx`, `budgets.tsx` |
| Six looks | Tokens only; checked in all six, light and dark, by axe and the journeys | `e2e/screens.spec.ts`, `e2e/journeys.spec.ts` |
| Charts | Focus and context, or series, never mixed; a hidden table for each; the takeaway in words | `blocks/charts.tsx` |
| Long lists | `payments` is virtualised with TanStack Virtual, about 20 rows in the DOM of ~1,150 | `more/payments.tsx` |
| Text at 1.5× | No amount cut off, no sideways scroll, on every screen | `e2e/screens.spec.ts` |
| Dates | Kuala Lumpur, relative when recent (*Yesterday, 21:00*), never `30/09` | `lib/dates.ts` |

## Known gaps, left on purpose

- `scan` in a browser has no edge finding, and `crop`'s corners don't move: B15 builds both.
- The receipt's photo is a placeholder box: the fake keeps no image.
- *Correct amount, time or account* on `txn` says it arrives with B13.
- Goals can't be edited yet: no command writes a goal (B21).
- The experiment card's *Limit* label sits over a tall bar when a week is over the limit.
