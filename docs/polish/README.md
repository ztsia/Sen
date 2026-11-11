# The polish pass (D151)

The owner finds the UI "a bit not so nice". This pass makes it nice without redesigning it: the
design stays (`spec_v2.md`, `docs/flows.md`, `docs/screens.md`, `docs/ui/patterns.md`, the six
looks, D75–D150), and the polish happens inside it.

1. **Audit (this folder).** Fable auditors at `xhigh`, one per area (seven), look at every screen and the
   components it's built from, and each writes a polish plan, `docs/polish/<area>.md`. They never
   edit code.
2. **Units.** The main session reads the plans, settles anything marked *needs the owner*, and turns
   the plans into builder units (Haiku or Sonnet) in `docs/plans/polish.md`: shared fixes (a
   component, a block, the frame) first, then screens.
3. **Build and QA** as any slice: a branch, the builders, QA's full run.

Sen's chat (`sen`) isn't audited here: it's reworked on AI Elements against the owner's references.
Charts are audited for what they show and how they sit on the screen, not their drawing code, since
B08 · Charts moves them onto shadcn's Chart.

## Areas

| Area | File | Screens (catalogue ids, with their `@` states) |
|---|---|---|
| Home | `home.md` | `home`, `cycle`, `payday`, `new-look` |
| Review and capture | `review.md` | `review`, `skipped`, `manual`, `scan`, `scan-more`, `crop`, `confirm`, `receipt` |
| Insights | `insights.md` | `insights`, `budgets`, `subscriptions`, `goals`, `goal`, `insights/year` |
| Money records | `records.md` | `payments`, `txn`, `accounts`, `account`, `balance-check`, `shared`, `split`, `split-public`, `claims`, `claim` |
| Settings | `settings.md` | `settings` and every `settings/…` |
| Start and More | `start.md` | `sign-in`, `first-run`, `more`, `agent/memory`, `agent/research`, `agent/usage` |
| Components and frame | `components.md` | `apps/web/src/components/ui/`, `src/blocks/`, `src/frame/`, across all screens, plus the transitions |

## What a plan holds

Each finding, in priority order:

```
### <n>. <screen or component>: <what's wrong, in a few words>
- Seen: <what a person sees, the screenshot file(s), the look and mode>
- Why it matters: <the person's experience; the rule it breaks, if any (patterns §, D#, uiux)>
- Change: <exactly what to change, to what, at which level: component, block, frame or screen>
- Files: <where the change lives>
- Priority: P1 (hurts trust or use) · P2 (clearly off) · P3 (finish)
- Shared: <other screens the same fix reaches>
- Builder: Haiku (the change can be written down exactly) or Sonnet (needs judgment), and a size
- Needs the owner: <only if the fix bends a decision or a pattern; say which and why>
```

A plan ends with what's already good and must be kept, so builders don't polish it away.
