# B04 · Redesign: QA ledger

Every fix for QA run 1 (`report.md`, 13 Oct 2026), its tier under the `qa` skill, and its evidence.
Fixed on `B04/redesign`, 13 Oct.

## The batch is tier 3: a fresh full QA run

Finding 7's fix changes `components/ui/progress.tsx`, and finding 6's changes the shared `ReviewRow`
block. Either one makes the batch tier 3, so a new `qa-reviewer` runs every phase again. Home's
layout also changed (finding 3), which the reviewer named as the reason a full run would be needed.

| # | Sev. | Fix | Files | Evidence |
|---|---|---|---|---|
| 1 | Major | E2E pins for the four probes that stayed green: Review's chips at 32 px, the balance difference's direction, Delete's toast with Undo, and the Appearance row's state. Each was run against its probe's exact break and failed, then passed with it undone | `e2e/redesign-pins.spec.ts` | Below |
| 2 | Major | The claim-due Review item carries its claim's id (`claimId`), and opens that claim | `packages/core/src/views.ts`, `data/fake/scenario.ts`, `screens/review/review.tsx`, `data/fake/fake.test.ts` | Red: `expected null to match object { scheme: 'Phone bill' }`; green: 35 of 35 |
| 3 | Minor | When Home has a card to act on (a health bar, the Payday card), Sen's note gives way; Sen's button still opens it. The pace chart is 64 px, as the brief says. The fit test covers all seven scenarios | `screens/home/home.tsx`, `e2e/home-fit.spec.ts` | QA's numbers were the red (63–92 px over); green: 84 of 84 (7 scenarios × 6 looks × 2 modes) |
| 4 | Minor | Empty states have a title. Subscriptions, Goals, Memory and Research add *Ask Sen*, since Sen is how those are set up. Budgets gains its title | `screens/insights/{subscriptions,goals,budgets}.tsx`, `screens/sen/{memory,research}.tsx` | Pinned in `redesign-pins.spec.ts` |
| 5 | Minor | Information rows carry no tile: Last backup, Shell version, Capture connected, No receipt | `screens/settings/{data,member}.tsx`, `screens/more/txn.tsx` | |
| 6 | Minor | The chip row's padding (`py-2`, offset by `-my-1.5`) holds the chips' 48 px tap extension inside the scroller, so it can't scroll vertically and the extension isn't clipped | `blocks/rows.tsx` | Pinned |
| 7 | Minor | `Progress` passed `value` to nothing: it now reaches the Radix root, which sets `aria-valuenow` | `components/ui/progress.tsx` | Pinned |
| 8 | Minor | Each rule says where it came from (`set_by`: *From your answer*, or *Sen's suggestion, confirmed*) and its hawker switch's state in words | `views.ts`, `data/fake/areas/settings.ts`, `screens/settings/categories.tsx` | Pinned |
| 9 | Minor | A year with no spending shows an empty state, not a flat chart and a heaviest month | `screens/insights/year.tsx` | Pinned |
| 10 | Minor | Chart text is 12 px: the axes, the bar labels and the spend calendar's day numbers | `blocks/charts.tsx` | Pinned |

## Left as they are, and why

- **Finding 8, the rule's date.** The brief's *from your answer, 3 Oct* needs a date, and
  `merchant_rules` (spec §15) has no `created_at`. Who set the rule is shown. Adding the column is
  B05's call, with the schema.
- **Finding 8, rules in one card.** The brief says a card each. Rules are a list that grows, and
  D130's own rule is that long lists stay rows in a card. The sentence is the row's title.
- **Finding 8, More's Shared row.** The brief's *RM24.40 owed to you* needs a net figure that the
  shared view doesn't carry, and in the scenario RM24.40 is what you owe. *3 open* is derived and
  true. A net figure can come with B05's API.
- **Finding 4, Skipped.** No button: there's nothing to do, and AC-1s forbids a decoy action.
- **Notes 11–14.** The members' unlabelled AI credit, the first cycle's plan, *Bbq Place*, the
  correction stand-in, Minted's micro-print band and Line's flat cards: cosmetic, scenario data, or
  B14's. None was changed.

## The pins: each test against its break

| Break | Test that failed | First error |
|---|---|---|
| `rows.tsx` chips `size="chip"` → `default` | review: every answer chip in a new-merchant row is drawn at 32 px | `chips not 32 px tall: [{"label":"Meals","h":48},…]` |
| `balance-form.tsx` `less`/`more` swapped | balance check: the difference says more or less than Sen has | `Expected substring: "RM0.10 more than Sen has"` |
| `txn.tsx` delete with `{ quiet: true }` | payments: Delete offers Undo, and Undo brings the payment back | `expect(locator).toBeVisible() failed` at the toast |
| `settings.tsx` Appearance `value="Minted"` | settings: the Appearance row names the look in use | `Expected substring: "Copper"`, got `Appearance Minted` |
| `rows.tsx` chip row back to `py-0.5`, no `overflow-y-hidden` (6) | review: an answer row does not scroll up and down | `answer rows that scroll up and down: [{"scroll":42,"client":36},…]` |
| `progress.tsx` without `value={value}` (7) | progress bars announce their value | `aria-valuenow on the claims bar`, received `null` |
| `subscriptions.tsx` without its title (4) | empty states: each says what is missing and offers Ask Sen | `element(s) not found` |
| `year.tsx` without the no-spending check (9) | the year with no spending shows an empty state | `element(s) not found` for `No year yet` |
| `categories.tsx` `'From you'` (8) | categories: each rule says where it came from | `Expected substring: "From your answer · A hawker"` |
| `charts.tsx` calendar `fontSize={10}` (10) | chart text is at least 12 px | `/insights: svg text under 12 px` |

All ten pass with the code as committed.

# Run 2

Every fix for QA run 2 (`report.md`, 13 Oct 2026). Fixed on `B04/redesign`, 13 Oct.

## The batch is tier 3 again: a fresh full QA run

Finding 3 changes `cn()` in `lib/utils.ts`, which every component passes through; finding 4 changes
`components/ui/input.tsx` and `textarea.tsx`; finding 6 changes the theme store; finding 5 the tab
bar in every look. A new sweep and a new `qa-reviewer` run every phase.

| # | Sev. | Fix | Who | Evidence |
|---|---|---|---|---|
| 1 | Major | The receipt view names who had each item (*You*, *Ali*), from the split's members, instead of the member ids in `picks` | Main session | `fake.test.ts`: red `expected 'f3e4e98f-…' not to match /[0-9a-f]{8}-[0-9a-f]{4}/`; green 36 of 36 |
| 2 | Major | E2E pins for the four behaviours QA broke unseen: Review's one answer per tap, Add expense's refusals, the pager's hidden pages, Skipped's guard; each shown to fail under QA's break | Haiku (`implementer`) | `redesign-pins.spec.ts`; the table below |
| 3 | Minor | `cn()` extends tailwind-merge with the `label` text size, so `text-label` survives beside a text colour | Main session | `lib/utils.test.ts`: red `expected 'text-primary-foreground' to be 'text-label text-primary-foreground'`; green |
| 4 | Minor | Inputs and textareas are `text-[1rem]`, 16 px (the body size is 15) | Main session | Pinned |
| 5 | Minor | Tab labels 0.75rem (12 px); Instrument's own rule was 0.656rem | Main session | Pinned in all six looks |
| 6 | Minor | Whether the look changes each quarter is in the theme store (`sen.lookQuarterly`), read by Appearance and the new-look card | Main session | Pinned (survives a reload) |
| 7 | Minor | Settings' rules are read live from `db.rules`; a rule's hawker flag is kept by id | Main session | `settings.test.ts`: red `expected [ 'WARUNG PAK HAMID', …(3) ] to include 'LIM K H'`; green 14 of 14 |
| 8 | Minor | Payments (empty, no match, error), the empty Categories grid, Sen's empty chat, both Shared tabs and Add expense's loading and error use `EmptyState`, `ErrorState` and `ListSkeleton` in full | Haiku (`implementer`) | Diff reviewed; the next run walks them |
| 9 | Minor | No tile on the refund row, Add expense's When, Received by email and the ESS capability rows | Haiku (`implementer`) | Diff reviewed |
| 10 | Minor | Review's answers wrap (16 px between lines keeps the 48 px targets apart) instead of hiding off the edge | Main session | The existing pins (32 px chips, no vertical scroll) still hold |
| 11 | Minor | A receipt Sen couldn't read opens Add expense as a failed draft, so it shows the photo and says so | Main session | `fake.test.ts`: red `expected null to match object { status: 'failed' }`; green |
| 12 | Minor | The pager scrolls with `auto` under reduced motion | Main session | Pinned |
| 13 | Minor | Subscriptions' disclosures are drawn 40 px with `tap` for the 48 px target, inside 4 px padding | Main session | The sweep's 48 px check |

Also: QA's committed run 2 specs had unused imports that failed `pnpm lint`; they're removed.

## Left as they are

- **Settings → Receipts by email's "No code yet" card** is hand-built; it reads as a status, with no
  action, so it stays until B05 gives it one.
- Run 2's Note 14 items, as run 1 left them.
