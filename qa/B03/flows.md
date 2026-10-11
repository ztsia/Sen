# B03 · flows

Run 1 (full). Docs only (screens.md, flows.md, spec). Entry points in a preview build at 412x915, with
the made-up scenario. Core journeys (D124) are at the end.

FLOW-1  Tab tour                                                     (happy)
        Entry  `/` preview, Home
        Steps  1. tap each of Review, Scan (tap), Insights, More, Home  2. on each tab screen look for
               Sen's button  3. press Back on Insights
        Ends   five labelled tabs, the right screen each time; Sen button on tab screens only; Back on
               a non-Home tab lands on Home
        Covers AC-1, AC-1s, AC-4, AC-4s, AC-5

FLOW-2  Scan long-press                                              (happy + sad)
        Entry  Scan tab
        Steps  1. hold 600 ms -> scan-more sheet with three entries  2. close  3. hold ~250 ms -> tap
               behaviour  4. choose Add manually -> manual
        Ends   scan-more only after 500 ms; Add manually reaches manual (tab bar hidden)
        Covers AC-3, AC-3s

FLOW-3  Home states                                                  (happy + sad)
        Entry  dev panel scenario switch / `?scenario=`: normal, before first salary, first cycle,
               calendar month, offline, empty, cap reached
        Steps  1. for each: read the large figure label, pace line, quiet row  2. open cycle sheet from
               the figure  3. tap pace -> payments filtered  4. back  5. tap Sen's note -> Sen sheet
        Ends   per-scenario text matches AC-7..AC-16; cycle result == Home figure
        Covers AC-7..AC-16

FLOW-4  Review: answer, Undo, double tap                             (happy + sad)
        Entry  Review tab
        Steps  1. note badge N  2. answer the new-merchant row with a guess  3. row gone, badge N-1,
               toast with Undo  4. tap Undo -> row back, badge N  5. answer by double-tapping fast
        Ends   exactly one application; every row kind present with its buttons
        Covers AC-2, AC-17, AC-18, AC-18s

FLOW-5  Review: Waiting on others and footers                        (happy)
        Entry  Review
        Steps  1. read Waiting on others (not in the badge)  2. tap Missing a payment? -> manual
               3. back  4. Skipped notifications -> skipped  5. tap This was a payment
        Ends   payment created with Undo, skipped row removed
        Covers AC-19, AC-20, AC-22

FLOW-6  Review: empty and suggestions                                (sad)
        Entry  `?state=empty` or scenario empty; scenario with suggestions
        Steps  1. empty line "Nothing needs you."  2. with suggestions tap Apply all  3. Undo
        Ends   all suggestions applied in one step and reverted in one step
        Covers AC-21, AC-23

FLOW-7  Manual entry                                                 (happy)
        Entry  Review > Missing a payment?
        Steps  1. type 12.5 with the pad/keyboard  2. pick a category  3. Save  4. open Payments
        Ends   one new payment RM12.50 at the top, account = last used, today; Undo removes it
        Covers AC-35, AC-36, AC-37

FLOW-8  Manual entry: hostile amounts                                (sad)
        Entry  manual
        Steps  type each of: empty, 0, 0.00, ., 1.234, -5, 1e5, abc, 99999999999999999999, 19.99,
               4.35, 1.005; try Save; double-tap Save on a valid one
        Ends   invalid ones refused with a message; valid ones exact in sen; one payment from a double-tap
        Covers AC-35s, AC-36s, AC-60s, AC-63

FLOW-9  Near-duplicate warning                                       (sad)
        Entry  manual
        Steps  enter the same amount as a payment captured minutes ago; Save
        Ends   a warning that does not block; payment is saved
        Covers AC-36s

FLOW-10 Scan after paying (browser)                                  (happy)  [CORE scan-after]
        Entry  Scan tab or a payment's Scan the receipt
        Steps  1. file picker (set a file)  2. crop stand-in, Save  3. reading  4. confirm: items,
               category row, total check  5. set headcount to 3  6. Done
        Ends   toast "Attached to RM… on <account>" with Undo; payment shows the receipt mark in
               Payments; no second payment exists
        Covers AC-24..AC-29, AC-31

FLOW-11 Confirm: arithmetic and edits                                (happy + sad)
        Entry  confirm
        Steps  1. read items vs total  2. fix a marked price  3. change one item's category  4. headcount
               to 1 and up to 9  5. View photo
        Ends   check line always true to the sen; Mixed toggles; stepper never below 1
        Covers AC-26, AC-26s, AC-27, AC-27s, AC-28, AC-28s

FLOW-12 Receipt first                                                (happy)
        Entry  scan -> confirm for a receipt that matches no payment
        Steps  Done -> toast "Waiting for its payment" -> Review shows it under Waiting on others ->
               Attach to a payment… -> choose one
        Ends   attached, left the list, payment gains the mark
        Covers AC-19s, AC-29s, AC-30

FLOW-13 Several matches / amount mismatch                            (sad)
        Entry  confirm with a total that matches two payments; then one that differs
        Steps  Done -> sheet asks which; pick; second receipt Done -> items only
        Ends   nothing attached until picked; mismatched total leaves payment amount and category alone
        Covers AC-29s, AC-30

FLOW-14 Same file twice                                              (sad)
        Entry  scan
        Steps  choose the same file twice
        Ends   "Already added", one receipt
        Covers AC-31

FLOW-15 Reading fails                                                (sad)
        Entry  reading with the failing fixture/state
        Steps  reading -> error -> manual with image
        Ends   manual shown with image; image not lost
        Covers AC-25s

FLOW-16 Split from confirm                                           (happy)
        Entry  confirm
        Steps  Split -> Who paid? I paid -> Just my part -> tick items -> Done; repeat with A friend paid;
               repeat with Share a link
        Ends   Others' items line keeps the total exact; owe/owed in sen; Share a link reaches split stub
        Covers AC-32, AC-32s, AC-59b

FLOW-17 No receipt, enter items by hand                              (happy + sad)
        Entry  txn > No receipt… > Enter the items
        Steps  type items summing below the payment (RM3.20 not itemised); then above it; then blank
        Ends   below: saved with note of unitemised; above/blank: refused with a message
        Covers AC-34, AC-34s

FLOW-18 Without capture                                              (happy)
        Entry  scenario "without capture"
        Steps  Home (month words, no balance row); More (no Accounts); confirm Done
        Ends   payment created by Done; no balance/gap anywhere
        Covers AC-11, AC-33, AC-49s

FLOW-19 Insights tour                                                (happy)
        Entry  Insights
        Steps  scroll every card; for each: question, chart, takeaway, Ask Sen about this; open Ask Sen
               on one; tap a category -> payments filtered; The year
        Ends   all cards per §9.3; takeaways agree with data (small things == Payments < RM15)
        Covers AC-38..AC-42, AC-47, AC-48, AC-41

FLOW-20 Budgets                                                      (happy + sad)
        Entry  Insights > budgets
        Steps  see meters/tick; Add a budget (valid); invalid (blank, 0, -1, abc); duplicate category;
               Undo
        Ends   at-risk budgets show icon + words; invalid refused; duplicate not created
        Covers AC-43, AC-43s

FLOW-21 Subscriptions                                                (happy + sad)
        Entry  Insights > subscriptions
        Steps  read forecasts/actual/missed; then compare Home's spent figure and Payments for forecast rows
        Ends   no forecast row anywhere in spending
        Covers AC-44, AC-44s, AC-62

FLOW-22 Goals                                                        (happy + sad)
        Entry  Insights > goals > a goal
        Steps  meters; goal detail: per-cycle amount, feasibility + sample size, projected finish
        Ends   behind goal not in warning colour; small sample says so
        Covers AC-45, AC-45s

FLOW-23 Year                                                         (happy)
        Entry  Insights > The year
        Ends   months in KL calendar; savings rate; relief tags
        Covers AC-46

FLOW-24 Payments: search, filters, virtual list                      (happy + sad)
        Entry  More > Payments
        Steps  scroll to the bottom; search "grab", an item name, a note, hostile strings; filter by
               account, category, Shared, cycle; clear
        Ends   header sums right; DOM rows bounded; no hit state; no crash
        Covers AC-50..AC-53

FLOW-25 txn: read and fix                                            (happy)
        Entry  Payments > a rule-categorised payment
        Steps  change category -> asked Just this one / From now on; choose From now on; check another
               payment at that merchant; add a note; Changes; Undo
        Ends   rule updated, past payments unchanged; Changes has lines with "you"
        Covers AC-54..AC-56

FLOW-26 txn: Mark as…, Delete, Undo                                  (happy + sad)
        Entry  txn
        Steps  Mark as transfer -> Home figure drops by exact amount; Undo -> restored; refund-of; Delete
               -> Undo
        Ends   figures return to the sen
        Covers AC-54s, AC-57, AC-57s

FLOW-27 Receipt screen                                               (happy + sad)
        Entry  txn > receipt; an email-sourced receipt; a receipt with no photo
        Ends   items sum; sandboxed email view; View photo handled
        Covers AC-58, AC-58s

FLOW-28 Shared bills (D19)                                           (happy)
        Entry  a split in the scenario via txn / Review / More > Shared bills
        Ends   figures match the D19 table at each repayment
        Covers AC-59, AC-59s, AC-51

FLOW-29 Timezone                                                     (sad)
        Entry  browser timezone America/Los_Angeles and Pacific/Kiritimati
        Steps  Payments day headers, relative days, Home figures, Insights year, a late-night payment
        Ends   identical to the KL run
        Covers AC-61, AC-61s

FLOW-30 Offline                                                      (sad)
        Entry  context.setOffline(true)
        Steps  Review answer + manual Save offline; "Not synced yet" marks; reconnect; wait
        Ends   rows sync once, marks go, no duplicates; reload offline behaves as stated
        Covers AC-12, AC-12s, AC-58..., AC-70, AC-70s

FLOW-31 States                                                       (sad)
        Entry  `?state=loading|empty|error|offline` on each screen
        Ends   skeleton / one-line empty / error with button / banner
        Covers AC-68, AC-64

FLOW-32 Looks, dark, text scale                                      (sad)
        Entry  each look, light and dark; 1.5x text
        Ends   axe clean; targets >= 48 px; no clipped amounts
        Covers AC-67

FLOW-33 Production guard                                             (sad)
        Entry  production build
        Ends   "Not built yet"; no made-up data in bundle; no secrets
        Covers AC-6, AC-6s, AC-66

## Core journeys (docs/flows.md, D124)

FLOW-C1 first-run (core)                                             (happy)
        Entry  first launch: sign-in, apps, access, running, accounts, name, payday, home
        Note   Those screens are B04/B08 (modules.md B03 "Leaves for later"). In B03 the only reachable part
               is Home before the first salary ("Spent since you started"). The rest is **not reachable**.
        Ends   Home reads "Spent since you started" with no negative
        Covers AC-9, AC-9s

FLOW-C2 pay-new (core)                                               (happy)
        Entry  dev panel simulates a payment at ROTI BAKAR 88 (B02's simulator) / Review's new-merchant row
        Steps  1. the prompt/row: "RM9.50 . ROTI BAKAR 88" with two guesses  2. tap a category  3. a
               rule is made; a second payment at that merchant asks nothing
        Ends   first payment categorised; second silent; one rule
        Covers AC-17, AC-18

FLOW-C3 scan-after (core)                                            (happy)
        = FLOW-10.

---

# Run 2 (full)

Docs only. Entry at 412x915 on a preview build with the dev server. Every run-1 flow (FLOW-1..33, C1..C3)
is re-walked by run 1's specs. New or changed flows:

FLOW-34 Offline for real                                             (sad)
        Entry  Review, `context.setOffline(true)`
        Steps  1. answer ROTI BAKAR 88 -> row leaves, toast, badge -1  2. Payments -> the new rows say Not
               synced yet  3. manual Save offline -> top of Payments  4. Home figure includes both
               5. go online, wait 3 s  6. marks go; counts equal what was written; go offline/online again
        Ends   one row per write, figure unchanged by the sync
        Covers R2-1, R2-1s, R2-2

FLOW-35 Double, triple taps                                          (sad)
        Entry  every write button (list in R2-3)
        Steps  tap 2-3 times in 50 ms; count rows/changes; Undo once
        Ends   one application, one Undo reverts all
        Covers R2-3, R2-3s

FLOW-36 Same receipt, three ways                                     (sad)
        Entry  Scan
        Steps  1. file A  2. file A renamed  3. file A with a byte flipped  4. Undo the first then A again
               5. 0-byte file  6. a text file
        Ends   2 -> Already added; 3 -> new; 4 -> allowed; 5,6 -> refused in words
        Covers R2-4, R2-4s

FLOW-37 Newest first                                                 (happy + sad)
        Entry  manual, Payments, Review
        Steps  Save RM1,234.56 now; open Payments; edit its time to yesterday; reopen
        Ends   top, then in yesterday's header
        Covers R2-5, R2-5s

FLOW-38 Launcher shortcut                                            (happy)
        Entry  /s/manual as first page
        Steps  type 5, Save
        Ends   Home with the payment; Payments has it
        Covers R2-6, R2-6s

FLOW-39 Budgets over                                                 (happy + sad)
        Entry  Insights > budgets
        Ends   Over by RM exact diff; at-cap not over
        Covers R2-7

FLOW-40 Review suggestions and attach                                (happy)
        Entry  Review
        Steps  Apply all (count equals marks); Undo; MR DIY receipt -> Attach to a payment…
        Ends   N marks == N applied; attach list ordered same merchant, then closeness
        Covers R2-9, R2-10

FLOW-41 Bad addresses                                                (sad)
        Entry  /s/confirm, /s/txn/x, /s/receipt/x, /s/goal/x, hostile ids
        Ends   a sentence and a button on each
        Covers R2-11

FLOW-42 Undo timing                                                  (sad)
        Entry  Review
        Steps  answer, Undo inside 1.2 s, wait 3 s; answer, go offline, Undo, online, wait
        Ends   stays undone
        Covers R2-15

FLOW-43 Text size and viewport                                       (sad)
        Entry  Home, Review, Payments, txn, confirm, budgets, goal at 1.5x, 390 and 412 wide
        Ends   no clipped amounts, no sideways scroll
        Covers R2-16

FLOW-44 Plain-http host                                              (sad)
        Entry  the preview served on a non-localhost host over http
        Steps  Scan -> choose a file -> Save
        Ends   reading continues or says what is wrong
        Covers R2-17

FLOW-45 Scroll between screens (added in phase 5)                     (sad)
        Entry  Review scrolled 900 px, then Insights tab; More > Payments a second time
        Ends   each screen is at scrollTop 0
        Covers R2-20

FLOW-46 Fast taps on the other write buttons (added in phase 5)       (sad)
        Entry  Apply all; Skipped > This was a payment; txn > Delete; ten taps on Review's answer
        Ends   one application, one Undo returns it, one step back
        Covers R2-22
