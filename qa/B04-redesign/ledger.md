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

## Finding 1's pins: each test against its break

| Break | Test that failed | First error |
|---|---|---|
| `rows.tsx` chips `size="chip"` → `default` | review: every answer chip in a new-merchant row is drawn at 32 px | `chips not 32 px tall: [{"label":"Meals","h":48},…]` |
| `balance-form.tsx` `less`/`more` swapped | balance check: the difference says more or less than Sen has | `Expected substring: "RM0.10 more than Sen has"` |
| `txn.tsx` delete with `{ quiet: true }` | payments: Delete offers Undo, and Undo brings the payment back | `expect(locator).toBeVisible() failed` at the toast |
| `settings.tsx` Appearance `value="Minted"` | settings: the Appearance row names the look in use | `Expected substring: "Copper"`, got `Appearance Minted` |
