# Sen web app: overlay inventory

Shot on `pnpm --filter @sen/web exec vite --port 5199` (the made-up scenario), 390x844 at 2x, light, Minted (default look), JPEG q80. Images are in `shots/`, the Playwright script in `script/` (`lib.js`, `cases.js`, `run.js`). `heightPct` is the overlay element's own height as a percent of 844; `fields` counts inputs/textareas/toggle groups; `rows` counts list items/menu items (or buttons for a button-only sheet).

## Grep reconciliation (apps/web/src, excluding dev/ and components/ui/)

- `<Sheet` call sites: **32**, each mapped below: sheets.tsx x2, category-sheet, note-sheet, parts.tsx (NameSheet), split.tsx (share), accounts.tsx, account.tsx, review.tsx (PaymentPicker), filter-sheet, receipt.tsx, txn.tsx x2 (no-receipt, MarkAs), members.tsx, sen.tsx, categories.tsx x2, member.tsx, claims.tsx x2, cycle-sheet, screens/account.tsx (Tests), running.tsx, captured.tsx, split-sheets.tsx x2 (Match, Split), confirm.tsx (photo), item-sheet, insights.tsx, goals.tsx, subscriptions.tsx, budgets.tsx. 31 of the 32 have at least one shot; the 32nd (MatchSheet) is `not captured`.
- Wrapper use sites (each is a separate overlay instance in the table): CategorySheet x4 (review, txn, confirm, manual), NoteSheet x3 (txn, receipt, confirm), FilterSheet x3 (payments), PaymentPicker x2 (review), NameSheet x1, ItemSheet/MatchSheet/SplitSheet x1 each (confirm), CycleSheet x1, AddSheet(accounts) x1, EditSheet x1, MarkAsSheet x1, InviteSheet x1, BudgetSheet x1 (two modes). `frame/receipt-picker.tsx` renders no overlay (file pickers only).
- Dialogs: `AlertDialog` is rendered at one place (`blocks/dialog.tsx:37`, DestructiveDialog), used at **2** sites (claims.tsx:292, screens/account.tsx:71). `components/ui/dialog.tsx` is imported nowhere outside `components/ui/`.
- `DropdownMenu`: **3** sites (frame/sheets.tsx:38, blocks/facts.tsx:146 via ActionBar `more`, screens/settings/claims.tsx:155). ActionBar is used at txn.tsx:185 (with a menu) and account.tsx:82 (no menu).
- Not covered by the brief but present: `apps/web/src/dev/` (dev panel, gallery, native simulator) renders its own overlays; excluded as instructed.
- Total: 32 + 2 + 3 = 37 call sites -> 51 inventory rows (49 captured, 2 not captured) because wrappers, multi-step sheets and modes are counted once per distinct instance/step.

Polish ids are `<file>#<n>` from `docs/polish/<file>.md` (e.g. `review#13`). `components#8` (sheets cut out instead of falling) and `components#21` (heavy grab handle) name the Sheet block itself and apply to every sheet; they are listed per row only where those findings name that sheet.

## Table

| screen | id | kind | title | holds | fields | rows | height % | scrolls | opened from | call site | polish |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Any tab | scan-more | sheet | Add a payment | choice-list | 0 | 3 | 32.7 | no | Tab bar: long-press Scan | `frame/sheets.tsx:117` | components#15, review#16, review#26, components#8, components#21, components#4 |
| Any tab | sen-chat | full-sheet | Sen | chat | 1 | 0 | 94.8 | no | Any tab: Ask Sen button (also Ask Sen on Payment) | `frame/sheets.tsx:67` | - |
| Any tab | sen-menu | menu | (none: a menu) | actions-menu | 0 | 3 | 18.2 | no | Sen sheet header: ⋯ (More about Sen) | `frame/sheets.tsx:38` | - |
| Home | home-cycle | sheet | This cycle | read-only-detail | 0 | 0 | 45.4 | no | Home: tap the hero figure | `screens/home/cycle-sheet.tsx:22` | home#17, home#18, home#21 |
| Review | review-attach-picker | sheet | Attach to which payment? | choice-list | 0 | 30 | 80 | yes | Review: Attach to a payment… on a waiting receipt | `screens/review/review.tsx:514 (used at :220)` | - |
| Review | review-category | sheet | SITI AMINAH BT YUSOF: which category? | choice-list | 0 | 17 | 80 | yes | Review: Other… on a payment question | `blocks/category-sheet.tsx:50 (used at screens/review/review.tsx:192)` | review#13, review#4, components#23 |
| Review | review-refund-picker | sheet | A refund of which payment? | choice-list | 0 | 30 | 80 | yes | Review: Refund of… on a money-in question | `screens/review/review.tsx:514 (used at :204)` | - |
| Add expense | manual-paid-from | sheet | Paid from | choice-list | 0 | 4 | 39 | no | Add expense: Paid from row | `blocks/category-sheet.tsx:50 (used at screens/scan/manual.tsx:233)` | review#13, components#23 |
| Confirm | confirm-category | sheet | Category for the whole receipt | choice-list | 0 | 17 | 80 | yes | Confirm: Category row | `blocks/category-sheet.tsx:50 (used at screens/scan/confirm.tsx:409)` | review#13, components#23 |
| Confirm | confirm-item | sheet | Fix this item | short-form | 2 | 0 | 53 | no | Confirm: tap an item row | `screens/scan/item-sheet.tsx:25 (used at screens/scan/confirm.tsx:423)` | review#30 |
| Confirm | confirm-match (not captured) | sheet | Which payment is this? | choice-list | 0 | - | - | - | Confirm: Done, when two or more unlinked payments match the receipt total within 3 hours | `screens/scan/split-sheets.tsx:24 (MatchSheet; used at screens/scan/confirm.tsx:433)` | - |
| Confirm | confirm-note | sheet | Add a note | short-form | 1 | 0 | 39.3 | no | Confirm: Add a note row | `blocks/note-sheet.tsx:25 (used at screens/scan/confirm.tsx:417)` | - |
| Confirm | confirm-photo | sheet | Receipt photo | read-only-detail | 0 | 0 | 58.5 | no | Confirm: View photo | `screens/scan/confirm.tsx:400` | review#6 |
| Confirm | confirm-split-how | sheet | How do you split it? | choice-list | 0 | 2 | 32 | no | Confirm: Split, then I paid | `screens/scan/split-sheets.tsx:61 (step how)` | review#17 |
| Confirm | confirm-split-mine | sheet | Tick what you had | multi-step | 0 | 6 | 56.9 | no | Confirm: Split, I paid, then Just my part | `screens/scan/split-sheets.tsx:61 (step mine)` | review#17 |
| Confirm | confirm-split-who | sheet | Who paid? | choice-list | 0 | 2 | 23.9 | no | Confirm: Split button | `screens/scan/split-sheets.tsx:61 (step who)` | review#17 |
| Split | split-name | sheet | Who had this? | short-form | 1 | 0 | 34.8 | no | Split: Someone else… on an item | `screens/shared/parts.tsx:243 (NameSheet; used at screens/shared/split.tsx:340)` | - |
| Split | split-share | sheet | Share this bill | read-only-detail | 0 | 1 | 49.8 | no | Split: Share (app bar) | `screens/shared/split.tsx:326` | - |
| Payments | payments-filter-account | sheet | Which account? | choice-list | 0 | 5 | 45.7 | no | Payments: Any account chip | `screens/more/filter-sheet.tsx:30 (used at screens/more/payments.tsx:174)` | - |
| Payments | payments-filter-category | sheet | Which category? | choice-list | 0 | 21 | 80 | yes | Payments: Any category chip | `screens/more/filter-sheet.tsx:30 (used at screens/more/payments.tsx:183)` | - |
| Payments | payments-filter-cycle | sheet | Which cycle? | choice-list | 0 | 13 | 80 | yes | Payments: All cycles chip | `screens/more/filter-sheet.tsx:30 (used at screens/more/payments.tsx:165)` | - |
| Payment | txn-category | sheet | Sate Kajang Hj Samuri: which category? | choice-list | 0 | 17 | 80 | yes | Payment: Category fact (Meals) | `blocks/category-sheet.tsx:50 (used at screens/more/txn.tsx:250)` | review#13, components#23 |
| Payment | txn-category-scope | sheet | Car: just this one? | confirm | 0 | 2 | 33.7 | no | Payment: Category, then a different category (payment filed by a rule) | `blocks/category-sheet.tsx:50 (picked step)` | review#13, components#23 |
| Payment | txn-mark-kind | sheet | Mark this as… | choice-list | 0 | 1 | 18.7 | no | Payment: More, then Mark as… | `screens/more/txn.tsx:312 (kind step; money-out payment)` | - |
| Payment | txn-mark-kind-money-in | sheet | Mark this as… | choice-list | 0 | 3 | 32 | no | Payment (money in): More, then Mark as… | `screens/more/txn.tsx:312 (kind step; money-in payment)` | - |
| Payment | txn-mark-refund | sheet | A refund of which payment? | multi-step | 0 | 30 | 80 | yes | Payment (money in): Mark as…, then Refund of… | `screens/more/txn.tsx:312 (refund step)` | - |
| Payment | txn-more-menu | menu | (none: a menu) | actions-menu | 0 | 3 | 19.3 | no | Payment: More (⋯) in the action bar | `blocks/facts.tsx:146 (ActionBar more; used at screens/more/txn.tsx:185)` | - |
| Payment | txn-no-receipt | sheet | No receipt? | choice-list | 0 | 2 | 25.4 | no | Payment: More, then No receipt… | `screens/more/txn.tsx:266` | - |
| Payment | txn-note | sheet | Add a note | short-form | 1 | 0 | 39.3 | no | Payment: Note fact (Add a note) | `blocks/note-sheet.tsx:25 (used at screens/more/txn.tsx:260)` | - |
| Receipt | receipt-note | sheet | Edit the note | short-form | 1 | 0 | 39.3 | no | Receipt: Note row | `blocks/note-sheet.tsx:25 (used at screens/more/receipt.tsx:144)` | - |
| Receipt | receipt-photo | sheet | The receipt's photo | read-only-detail | 0 | 0 | 68.6 | no | Receipt: View photo | `screens/more/receipt.tsx:150` | review#9 |
| Accounts | accounts-add | sheet | Add A shopping app | short-form | 1 | 0 | 39.6 | no | Accounts: Add on an app chosen with no account yet (Not added yet) | `screens/money/accounts.tsx:253` | records#2 |
| Account | account-edit | sheet | Edit this account | short-form | 2 | 0 | 56.3 | no | Account: Edit | `screens/money/account.tsx:189` | - |
| Insights | insights-cycle-picker | sheet | Look at | choice-list | 0 | 12 | 80 | yes | Insights: the cycle row (October (this cycle)) | `screens/insights/insights.tsx:100` | insights#18, insights#17 |
| Budgets | budgets-add | sheet | Add a budget | short-form | 1 | 0 | 43.1 | no | Budgets: Add | `screens/insights/budgets.tsx:127 (BudgetSheet, new)` | insights#1, insights#7 |
| Budgets | budgets-edit | sheet | Meals | short-form | 1 | 0 | 35.6 | no | Budgets: tap a budget row | `screens/insights/budgets.tsx:127 (BudgetSheet, existing)` | insights#1, insights#7 |
| Goals | goals-add | sheet | Add a goal | long-form | 4 | 0 | 80 | yes | Goals: Add | `screens/insights/goals.tsx:59` | - |
| Subscriptions | subscriptions-add | sheet | Add a subscription | long-form | 4 | 0 | 79.1 | no | Subscriptions: Add | `screens/insights/subscriptions.tsx:60` | - |
| Settings / Account | account-tests | sheet | Tests | choice-list | 0 | 3 | 49 | no | Account: long-press Version (shell or dev only) | `screens/account.tsx:80` | - |
| Settings / Account | settings-account-signout-everywhere (not captured) | dialog | Sign out everywhere? | confirm | 0 | - | - | - | Account: Sign out everywhere | `blocks/dialog.tsx:37 (DestructiveDialog; used at screens/account.tsx:71)` | settings#15 |
| Settings / Capture / Captured | captured-heartbeat | sheet | Heartbeat | read-only-detail | 0 | 1 | 24.5 | no | Captured on this phone: heartbeat icon (app bar) | `screens/capture/captured.tsx:239` | - |
| Settings / Capture / Keep Sen running | capture-running-guide | sheet | The full guide for Xiaomi | read-only-detail | 0 | 1 | 44 | no | Keep Sen running: The full guide | `screens/capture/running.tsx:67` | - |
| Settings / Categories | categories-add | sheet | Add a category | short-form | 2 | 0 | 41 | no | Categories: Add a category | `screens/settings/categories.tsx:305` | - |
| Settings / Categories | categories-detail | sheet | Meals | long-form | 1 | 3 | 80 | yes | Categories: tap a category tile | `screens/settings/categories.tsx:106` | settings#23 |
| Settings / Claims | claims-ess-menu | menu | (none: a menu) | actions-menu | 0 | 2 | 13.6 | no | Claims: ESS card ⋯ (More about ESS) | `screens/settings/claims.tsx:155` | settings#4 |
| Settings / Claims | claims-forget-dialog | dialog | Forget your ESS password? | confirm | 0 | 2 | 30 | no | Claims: ESS ⋯, then Forget password | `blocks/dialog.tsx:37 (DestructiveDialog; used at screens/settings/claims.tsx:292)` | components#9 |
| Settings / Claims | claims-sender | sheet | ESS email address | short-form | 1 | 0 | 37.9 | no | Claims: ESS email address row | `screens/settings/claims.tsx:242` | settings#4 |
| Settings / Claims | claims-signin | sheet | Sign in to ESS | short-form | 0 | 1 | 23.5 | no | Claims: Sign in to ESS (when signed out) | `screens/settings/claims.tsx:275` | settings#4 |
| Settings / Member | member-remove | sheet | Remove Hui Min? | confirm | 0 | 3 | 35.8 | no | Member: Remove | `screens/settings/member.tsx:208` | components#8, components#21, settings#3 |
| Settings / Members | members-invite | sheet | Invite someone | long-form | 4 | 6 | 80 | yes | Members: Invite | `screens/settings/members.tsx:159` | settings#7, settings#24, settings#21 |
| Settings / Sen | settings-sen-calendar | sheet | Connect Google Calendar | short-form | 0 | 1 | 25.7 | no | Settings > Sen: Connect (Google Calendar) | `screens/settings/sen.tsx:90` | - |

## Not captured

- `confirm-match` (sheet, screens/scan/split-sheets.tsx:24 (MatchSheet; used at screens/scan/confirm.tsx:433)): Opens only when 2+ unlinked payments equal the receipt total within 3 hours (data/fake/apply.ts matchesFor); the made-up month has none and the made-up reader's total matches none, so Done commits instead.
- `settings-account-signout-everywhere` (dialog, blocks/dialog.tsx:37 (DestructiveDialog; used at screens/account.tsx:71)): Account opens it only when __SEN_BACKEND__ === 'api'; on the fake backend the row shows a toast instead (account.tsx:~58). Needs the API, which was out of scope.

## Counts (51 rows: 49 captured + 2 not captured)

By kind: dialog 2, full-sheet 1, menu 3, sheet 45

By holds: actions-menu 3, chat 1, choice-list 18, confirm 4, long-form 4, multi-step 2, read-only-detail 6, short-form 13
