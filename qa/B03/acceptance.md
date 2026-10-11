# B03 · Skeleton: the five tabs: acceptance criteria

Run 1 (full). Written from `spec_v2.md`, `docs/decisions.md`, `docs/flows.md`, `docs/screens.md` and
`docs/ui/patterns.md` **before any B03 source was opened** (phases 1 and 2 use docs only; `qa/B03/uiux.md`
and `docs/handoff.md` were read for scope, and name files but no behaviour).

The slice has screens, a fake in-browser backend and shared types; it has **no SQL, no API route and no RLS**.
Phase 4 is therefore run against the fake backend and the shared zod types only (no database exists to
test), and says so.

Conventions: money is integer sen; "KL" is `Asia/Kuala_Lumpur`. Every criterion is paired with a sad twin
(marked `-s`). Non-negotiables touched by this slice are AC-60 to AC-68.

## A. Frame and navigation (spec §9.1, patterns §6, screens.md *Rules*)

AC-1   The five tabs
       Given any tab screen, at 412x915
       When  the tab bar renders
       Then  it has exactly five tabs labelled `Home, Review, Scan, Insights, More` in that order; the
             active one has `aria-current="page"`
       Spec  §9.1, patterns §1, §6
AC-1s  Task screens hide the bar
       Given `confirm`, `manual`, `scan`
       Then  no tab bar is rendered; and on pushed screens (`payments`, `txn`, `budgets`, `goal`,
             `skipped`) the bar IS rendered
       Spec  screens.md *Rules*, patterns §6

AC-2   Review badge
       Given the made-up scenario with N *Needs you* rows and M *Waiting on others* rows
       Then  the badge reads N (label "N to review"), not N+M
       Spec  D72, patterns §6
AC-2s  With nothing in *Needs you* the badge is absent (or zero is not shown); answering a row lowers
       it by exactly 1 and Undo restores it; a count above 99 shows `99+`
       Spec  D83 item 5

AC-3   Scan tap and long-press
       When  the Scan tab is tapped
       Then  `scan` opens at once (no 300 ms wait for a second tap)
       When  it is held for 500 ms
       Then  `scan-more` opens with `Scan receipt`, `From gallery`, `Add manually`
AC-3s  A press held for ~300 ms is a tap (opens `scan`, not `scan-more`); `Add manually` opens `manual`
       Spec  D69, D83 item 3

AC-4   Sen's button
       Then  the button (label "Ask Sen", 60 px) is on the tab screens (`home, review, insights, more`) and
             opens a sheet headed "Looking at: <screen>"
AC-4s  It is absent on `confirm`, `manual`, `scan`, `txn`, `payments` and every pushed/task screen
       Spec  D68, screens.md *Rules*

AC-5   Back
       Given a sheet open over a screen, When Back (history back) fires, Then the sheet closes and the
             screen stays
       Given Insights (non-Home tab root), When Back fires, Then Home shows
AC-5s  Back on Home does not navigate to a blank page / loop
       Spec  patterns §6, §10, D83 item 2

AC-6   Production guard
       Given a production build, When any of the B03 screens is opened, Then it shows "Not built yet"
AC-6s  The production JS bundle contains no made-up scenario data (e.g. `Wei Ming`, scenario merchants)
       Spec  modules.md rule 6, brief *Done when* 5

## B. Home (screens.md `home`, `cycle`, spec §9.2, D59, D79)

AC-7   Home contents
       Then  wordmark header; large figure labelled "Left until payday" with "N days to go"; pace line
             "Spent RM… this cycle" and "RM… more/less than last cycle by this day"; Sen's latest note;
             quiet row with total balance and the gap with its date. No fifth figure.
       Spec  §9.2, D30, D59
AC-7s  Left figure arithmetic: income received - spending this cycle, exactly, in sen, and the figure the
       `cycle` sheet shows as "result" is identical to Home's
       Spec  §9.2 item 3, §7
AC-8   Over by
       Given spending > income this cycle
       Then  the figure reads "Over by RM<abs>" with a warning icon and `money-warning`, never "-RM…"
AC-8s  Exactly zero reads as RM0.00 left, not "Over by RM0.00"
       Spec  screens.md `home` item 4
AC-9   Before first salary: the figure reads "Spent since you started", with no negative
AC-9s  The same scenario once a salary exists reverts to "Left until payday"
       Spec  screens.md *Varies*
AC-10  The first cycle: pace line says there is no last cycle (no "RM0.00 more than last cycle")
       Spec  screens.md *Varies*
AC-11  Calendar-month mode (no capture)
       Then  no balance row and no gap; the figure is this month's spending against last month; the word
             "cycle" is replaced by "month" on Home, `cycle` sheet and Insights
AC-11s With capture on, the word "month" does not replace "cycle"
       Spec  D79, screens.md `home` *Varies*
AC-12  Offline: a chip says how many rows are not synced; figures include the outbox rows
AC-12s Online, a normal write does not flash "Not synced yet" (only while offline or after 5 s)
       Spec  §5, patterns §7 *Offline*
AC-13  Health warning: a `warn-bg` bar at the top with words and one fixing button
AC-13s Without a warning, nothing is rendered in its place (no empty band)
       Spec  §18, patterns §7
AC-14  Payday card on payday; after the flow, "N of M moves done" until every move is ticked
AC-14s Not on a non-payday scenario
       Spec  §9.7, D60
AC-15  `cycle` sheet
       Then  income received, spending, result; the cycle's dates and expected payday; the estimate at
             payday, **labelled as an estimate**; in month mode, this month vs last month instead
AC-15s The estimate is never styled or summed as a fact (not in the result line)
       Spec  screens.md `cycle`, "A prediction never shares a table with a fact"
AC-16  Links: large figure opens `cycle`; pace opens `payments` filtered to this cycle; Sen's note opens
       Sen; balance row opens `accounts`
AC-16s The `payments` list opened from pace shows only this cycle's rows and the filter chip says so
       Spec  screens.md `home` *Does*

## C. Review (screens.md `review`, `skipped`, spec §6.6, D72)

AC-17  Every *Needs you* row kind in the table that B03 can show is present with its exact buttons: new
       merchant (two guesses + Other…), whose split share (open shares + Not a split), money in to classify
       (Income, Transfer, Refund of…), split share you owe (Open the split, I've paid), receipt waiting
       (opens confirm), receipt unreadable (opens manual), new wording (Yes/No), transfer missing side
       (accounts + Elsewhere), balance check due, claim due, skipped payday step, Sen proposal
       (Apply/Dismiss)
AC-17s A row never has more than three buttons plus Other…; the button Sen suggests is marked
       Spec  §6.6, patterns §7 *Review row*
AC-18  Answering a row clears it with a toast containing *Undo*; Undo brings the row back in the same
       place and the badge returns
AC-18s Answering the same row twice (double tap) applies once
       Spec  §6.7, §6.5
AC-19  *Waiting on others*: splits unpaid (opens `split`), receipts waiting for payment
       (Attach to a payment…, Evidence only, Enter the payment), refunds being watched; not in the badge
AC-19s A receipt confirmed with no matching payment appears here (and only here), not in *Needs you*
       Spec  D72, §6.4
AC-20  *Missing a payment?* opens `manual`; *Skipped notifications* opens `skipped`
AC-21  Empty: "Nothing needs you." with *Waiting on others* absent or empty-stated
AC-22  `skipped`: each has *This was a payment*; tapping it creates a payment with Undo and removes the row
AC-22s An empty skipped list says what will appear, no illustration
AC-23  Sen's suggestions bar: *Apply all* applies every suggestion at once with one Undo that reverts all
AC-23s Dismissing a suggestion doesn't change the row's other buttons
       Spec  screens.md `review` item 1

## D. Scan (screens.md `scan`, `reading`, `confirm`, `manual`, spec §6.4, §6.8)

AC-24  Browser `scan`: a file picker plus the `crop` stand-in; Save goes to `reading`
AC-24s Cancelling the picker returns without creating anything
AC-25  `reading` shows the image placeholder and "Reading receipt…", can be left (the receipt waits in
       Review) and ends on `confirm`
AC-25s A failed read ends on `manual` with the image kept, never a dead end
AC-26  `confirm` arithmetic: the item prices (tax and service included) sum **exactly** to the total in
       sen; the check line says so; a doubtful price is marked in place; fixing it updates the check
AC-26s If items do not sum to the total the screen says by how much (exact sen), and Done is still
       possible but stated
       Spec  D66, D67, §6.4
AC-27  One category row: the category when every item shares it, else "Mixed" with each item's category
       beneath; tapping opens the category sheet (same as Review's Other…)
AC-27s Changing one item to a different category flips the row to Mixed; changing it back restores
AC-28  Headcount stepper: "RM64.13 ÷ 3 = RM21.38 a person" - computed in integer sen with defined
       rounding (6413/3 = 2137.67 -> 2138); never below 1
AC-28s A total that divides evenly shows no fractional artefact; large totals never print e-notation/NaN
       Spec  D66, screens.md `confirm`
AC-29  *Done* with exactly one same-amount payment within +/-3 h: toast "Attached to RM58.30 on Ryt" with
       Undo, no new payment, and the payment now shows a receipt mark
AC-29s Several matches -> a sheet asks which (nothing attached until chosen); none -> "Waiting for its
       payment" and the receipt is under Review *Waiting on others*; a payment at 3 h 01 min does not match
       Spec  §6.4 *Matching*
AC-30  Receipt total different from the payment: attaching adds items/evidence only; payment amount and
       category unchanged
AC-30s When the total equals the payment, the items become the payment's category breakdown and the
       payment reads Mixed (largest category)
AC-31  The same file twice -> "Already added", no second receipt
       Spec  §6.5
AC-32  *Split* -> *Who paid?* (I paid / A friend paid) -> *Share a link* (reaches the `split` stand-in) or
       *Just my part*
AC-32s *Just my part*: unticked items fold into one "Others' items" line; the list still sums to the printed
       total exactly; when a friend paid, "you owe" = sum of your ticked items; when you paid, "Others owes"
       = total - yours, in sen
       Spec  D92, §6.4
AC-33  Without capture, *Done* creates the payment (no waiting)
AC-33s With capture, *Done* with no match never creates a payment
       Spec  §6.4, D52
AC-34  By hand (*No receipt… -> Enter the items*): items typed as text into sen; "RM3.20 not itemised" allowed
       when items < payment; no photo
AC-34s Items summing above the payment's amount -> an error in words, nothing saved; a blank description or
       price is refused with the field message
       Spec  D90
AC-35  `manual`: amount typed as text, kept in sen: `12.5` -> RM12.50, `0.1` then `0.2` typed as separate
       entries never produce 0.30000000000000004 anywhere, `1,284.5` or `1284.50` -> RM1,284.50
AC-35s Empty, `0`, `0.00`, `.`, `1.234`, `-5`, `1e5`, `abc`, 20+ digit strings: refused or truncated with a
       message in words, never NaN/Infinity/RM0.00 saved, no crash
AC-36  *Save* creates one payment, with Undo; defaults account = last used, time = now; More holds
       merchant + note
AC-36s Double-tapping Save creates one payment; a near-duplicate (same amount, close in time) warns but does
       not block
       Spec  §6.8, §6.5
AC-37  Categories on `manual` are ordered most used first

## E. Insights (screens.md `insights`, spec §9.3, D73, patterns §4)

AC-38  Every card in §9.3's table that has data is present as: question, chart, a one-line takeaway, *Ask Sen
       about this*; a card with no data is not rendered at all; *The year* is a row at the foot
AC-38s Empty/new scenario: no card renders an empty chart frame
AC-39  Each chart has a hidden (screen-reader) table with the same figures, and the takeaway states the
       answer in words
AC-40  Chart colours: focus = `chart-accent`, context = `chart-context`; a multi-series chart has a legend
       and at most three series in slot order; `money-in/out/pending` never appear in a chart; only
       `money-warning` on an at-risk budget, with icon and words
AC-40s Axis: one axis only; text never in a series colour
       Spec  patterns §4
AC-41  Takeaways agree with the data they summarise: *Do the small things add up?* count and total equal the
       number and sum of this cycle's payments under RM15 in `payments`; the top merchant card's first
       entry equals the largest per-merchant sum; *Eating out vs cooking* parts add to the whole
AC-41s Boundary: a payment of exactly RM15.00 is **not** "under RM15"
AC-42  *Am I on track?*: cumulative spending this cycle against last, estimate dashed and labelled estimate,
       income as ceiling
AC-42s The estimate is not part of the "spent so far" number; the unit is stated
AC-43  `budgets`: a meter per budget with the cycle's elapsed tick; at >=80% the meter takes the warning
       treatment with an icon and words ("Over by RM…", never colour only)
AC-43s Adding a budget with a blank category, zero, negative or non-numeric amount is refused with a message;
       adding the same category twice does not create a duplicate; a valid add has Undo
AC-44  `subscriptions`: declared subscriptions with expected charge dates, forecast vs actual, "missed"
       state; the monthly commitment is the sum of the active monthly amounts
AC-44s **Forecasts are never in spending**: Home's spent figure, `cycle`, budgets' used amounts, and
       `payments` rows exclude every forecast row
       Spec  §11, CLAUDE.md (a prediction never shares a table with a fact)
AC-45  `goals`: a meter per goal; `goal`: per-cycle amount, feasibility against median surplus **with its
       sample size**, projected finish
AC-45s A goal that is behind never uses the warning colour; with sample size 0/1 feasibility says it can't
       tell, not a number
       Spec  §10, patterns §4 *Bars over time and goal meters*
AC-46  `insights/year`: spending by month, savings rate, relief tags; the months are KL calendar months
AC-47  A category tapped in a chart/ranked bar opens `payments` filtered to it, and the list's rows are only
       that category
AC-48  *Ask Sen about this* opens Sen's placeholder sheet with that card's question as the context

## F. More, payments, txn, receipt (screens.md, spec §6.7, §7)

AC-49  `more`: rows Payments, Shared bills, Accounts (capture only), Claims (claims switch), Settings;
       whole rows are the targets
AC-49s Without capture, Accounts is absent; with Claims off, Claims is absent
       Spec  D52, screens.md `more`
AC-50  `payments`: search (payments, merchants, items, notes), filters (cycle, account, category,
       Shared), day headers in KL with the day's spending, newest first
AC-50s Search with no hit -> an empty state saying so with how to clear; a hostile query (`'; DROP`,
       `%`, `<script>`, 5 000 chars) does not break the screen
AC-51  Day total = sum over that day's rows of the spending contribution (my_share rule, D19); transfers
       and money-in contribute 0; a refund reduces its purchase's cycle
AC-51s A day with only a transfer and income shows no spending total (or RM0.00), not the transfer amount
       Spec  §7 *Spending vs cash flow*
AC-52  Row marks: receipt, split, In Review, *Not synced yet*, *Filled in*; a transfer is **one** row
       "Ryt -> TNG eWallet"; rows >=64 px; amounts never truncated; whole row opens `txn`
AC-52s Long merchant names truncate; the amount never does (also at 1.5x text)
AC-53  Virtualised: the DOM holds a bounded number of rows for the whole list; scrolling to the end shows the
       oldest day and its header; jumping filters resets the scroll
AC-54  `txn`: amount large, merchant, date/time/account, source text ("From Ryt's notification", "Added by
       you", "From a receipt", "Filled in from your transfer rule", "New wording: right?"), category,
       your spending, *Add a note*, receipt or *Scan the receipt*/*No receipt…*, split or *Split*, *Ask Sen about
       this*, *What the bank said*, *Changes*, *Mark as…*, *Delete*
AC-54s Delete is `destructive`, acts at once and shows Undo (no confirm dialog); after Undo the row is back
       with identical fields; a notification's payment deleted is "dismissed", not removed from *What the bank said*
       Spec  §6.7
AC-55  Category change: asks *Just this one / From now on* only when the category came from a rule; the first
       answer for a new merchant creates the rule without asking; *From now on* changes later payments at that
       merchant, not past ones
AC-55s Choosing *Just this one* leaves the rule and the other payments unchanged
       Spec  §6.3, D25, D89
AC-56  Every edit adds a line to *Changes* with who made it (you/system/agent) and Undo reverts it and logs
       the revert
AC-57  *Mark as…*: transfer or refund of…; a payment marked as transfer leaves the spending totals (Home
       figure and day total drop by exactly its amount) and a transfer is never income; marked refund
       lowers the purchase's spending exactly by the refund
AC-57s Marking and Undo returns the figures to the original, to the sen
AC-58  `receipt`: items with tax/service-inclusive prices summing to the total; the note; *View photo*;
       *Keep as evidence only*; for an email-sourced receipt, a sandboxed view, *Other attachments* and
       *Use this one instead*
AC-58s *View photo* with no photo says so, no crash
AC-59  Shared bills (the D19 table), whichever screen shows it: dinner RM120, share RM40 -> spending RM40,
       owed RM80; Ali repays RM40 -> RM40/RM40; Ben repays RM40 -> RM40/RM0 and never negative
AC-59s A friend repaying **more** than owed never makes owed negative and never lowers spending below share;
       a repayment when no share was set lowers spending by exactly the repayment (D19)
AC-59b Largest-remainder: a shared item of RM20.99 among three -> RM7.00 + RM7.00 + RM6.99, sum 2099 sen
       exactly; a shared item that doesn't divide never loses or gains a sen across any party count 1..7

## G. Cross-cutting and non-negotiables

AC-60  **Money is integer sen**: no `parseFloat`, `toFixed`, `Number(` on amounts, nor `/` outside the money
       module, in the diff; shared types use integer zod; user input parsed as text to sen
AC-60s Typing a decimal-looking value with float trap digits (`0.1+0.2` style: `19.99`, `4.35`, `1.005`)
       gives exactly 1999, 435, 101 (or a refusal) - never 1998/434
       Spec  CLAUDE.md, §3
AC-61  **Timezone / KL**: with the browser timezone set to `America/Los_Angeles` and to `Pacific/Kiritimati`,
       every date, day header, relative day ("Yesterday") and month/cycle total is identical to the KL run;
       a payment at 23:30 KL on a month's last day is in that KL day and cycle
AC-61s Dates never render as `30/09` or ISO; a time near midnight UTC/KL doesn't flip a day header
       Spec  D14, CLAUDE.md conventions
AC-62  **Prediction vs fact**: estimates ("estimate at payday", projected goal finish, subscription forecasts,
       cycle-end projection) are labelled, drawn dashed/outlined, and absent from spending/budget/surplus
       numbers
AC-63  **Dedupe**: a double-tap on any write (Save, answer, Done, Apply) applies once; the same receipt file
       twice is a no-op ("Already added"); a replayed Undo does nothing
AC-64  **One navigation, one set of patterns**: every list row is `ListRow`/`ReviewRow`/`SettingsRow`, every
       choice a bottom sheet with grab handle, every state an `EmptyState`/skeleton/`ErrorState`/offline
       banner as in patterns §7; no hamburger, no second tab row
AC-65  **Undo, not confirm**: no confirm dialog on any B03 write
AC-66  **No real data / secrets**: the repo diff and the built bundle contain no real notification text,
       account numbers, API keys or tokens; `pnpm hygiene` passes
AC-67  **Six looks, light and dark**: the same layout, strings and behaviour in every look; axe has no
       violations; touch targets >= 48 px (full-width rows excepted); text at 1.5x has no clipped amount or
       sideways scroll
AC-68  **States**: loading is a shaped skeleton (never a full-screen spinner), empty is one line plus an
       action, error says what happened and has a button that does it and keeps typed input, offline is a
       banner; every screen's *Varies* state is reachable from the dev panel / `?state=`
AC-69  **Web behaviour** (patterns §10): `overscroll-behavior: none` on html/body, no context menu on
       non-text, `user-select: none` on non-text, inputs >= 16 px, no hover-only affordance
AC-70  **Data layer**: reads go through per-screen query hooks and writes through one interface; Undo is a
       backend command; the fake applies a write at once and "syncs" later; offline writes remain
       *Not synced yet* and sync exactly once on reconnect, with no duplicate rows
AC-70s Offline + reload (the fake is in-memory): the page does not crash and says what was lost or kept

---

# Run 2 (full, after run 1's tier-3 fixes)

Written from the docs before any B03 source was opened in this run. The reviewer had read run 1's report
and `qa/B03/ledger.md` first (they name the fixes and where they landed, no code), so the criteria below
re-check each fix from the spec's side, and add angles run 1 did not take. Run 1's criteria AC-1..AC-70
all stand and are re-run by run 1's specs (`qa/e2e/b03-*.spec.ts`), which are judged against the spec, not
against the fixes (run 1's own notes: AC-6 needs a production build served; FLOW-12 and FLOW-17 expectations
changed with findings 12 and 8).

R2-1   Offline is real, not a flag
       Given the browser is truly offline (`context.setOffline(true)`) on Review
       When  a Review row is answered
       Then  the row leaves at once, the badge and the "Needs you" count drop by exactly 1, the toast has
             Undo, and the row reads *Not synced yet* wherever it shows (Payments, txn)
       Spec  spec_v2.md §5, §6.2, patterns §7 *Offline*
R2-1s  When back online, the rows sync once: no duplicate payment, the mark goes, a second offline->online
       cycle does not re-send. Home's figure includes the offline row while offline, and equals the figure
       after sync (to the sen)
R2-2   Offline, a write on any other screen also shows at once: `manual` Save puts a payment on top of
       Payments; txn note appears in Changes; budgets add shows the meter
R2-3   One answer per tap
       When  Review's answer button (and Apply all, Done on confirm, Save on manual, Mark as, Delete,
             Attach, I've paid, This was a payment) is double- or triple-tapped within 100 ms
       Then  one application: one new row/one change in the data, and one Undo returns it fully
R2-3s  Undo double-tapped reverts once and does not error; Undo after the row was answered again does nothing
       harmful; a different row's answer straight after is unaffected
       Spec  §6.5 (every input has a dedupe key), D83
R2-4   Receipt file identity
       Given a file already added as a receipt
       When  the same bytes are chosen again (even under another file name)
       Then  toast/line says "Already added"; receipts count unchanged; nothing in Review changes
R2-4s  A different file (one byte changed) is a new receipt; the same file after the first was Undone can be
       added again; the same file picked twice before the first read ends is one receipt; an empty (0 byte)
       or non-image file is refused in words, not hashed into a receipt
       Spec  §6.5, §6.4
R2-5   Newest first means by instant
       When  a payment is added now (manual Save) or captured with a different UTC offset form
       Then  it is the top row of Payments and Review's suggestions of "the last account used" uses the newest
             by instant; two payments one minute apart sort by time whatever their offsets
R2-5s  A back-dated payment (time edited to yesterday) sorts below today's, in the right KL day header
R2-6   Add expense from a first page
       Given `/s/manual` opened directly (launcher shortcut)
       When  Save
       Then  Home shows with the payment present; no about:blank
R2-6s  From Review's *Missing a payment?* Save returns to Review; from Scan-more *Add manually* returns to
       where it was opened; the system Back on `manual` without saving creates nothing
R2-7   Over budget reads in words
       Given a budget over its cap
       Then  its meter says "Over by RM<exact diff>" with the warning icon; a budget exactly at its cap does
             not say "Over"; one at 80-99% says it is close with icon+words
       Spec  patterns §3/§4, AC-43
R2-8   *Changes* names who: "by you" for a hand edit, "by Sen", or "automatically"; Undo logs a line too
R2-9   Apply all: the line "Sen suggested N answers" marks exactly N buttons and Apply all applies exactly N,
       with one Undo reverting all N
R2-10  *Attach to a payment…* lists the same merchant first, then by closeness of amount; Evidence only and
       Enter the payment are offered
R2-11  Bad route params
       When  `/s/confirm`, `/s/txn/<unknown>`, `/s/receipt/<unknown>`, `/s/goal/<unknown>`,
             `/s/confirm?id=<unknown>` are opened
       Then  each says what is wrong in a sentence and offers a button home or back; never a forever-skeleton,
             blank screen or stack trace; a hostile id (`../`, `' OR 1=1`, 5 000 chars, `<script>`) is the
             same
       Spec  patterns §7 *Error*
R2-12  By-hand items: items that exceed the payment are refused with the exact excess; items equal to the
       payment are accepted with no "not itemised" line; items below show "RM x not itemised"
       Spec  D90
R2-13  Scan-more *From gallery* reaches a picker (the file input) rather than a dead end
R2-14  Made-up data plausibility: no goal contribution dated after "today" counts as saved; no Review item
       names an account the owner does not have (Public Bank is an account, D86); a day header from another
       year carries its year, one from this year does not
       Spec  D11
R2-15  Undo in the sync window: write -> Undo within 1.2 s -> after the fake "syncs" the row stays undone;
       write -> offline -> Undo -> online -> nothing resurrects
R2-16  Text 1.5x and 412x915 AND 390x844: no clipped amount, no sideways scroll on Home, Review, Payments,
       txn, confirm, budgets, goal
R2-17  Insecure context: the app over plain http on a non-localhost host (e.g. a LAN preview) must not break
       Scan because a browser API is missing (SHA-256 hashing of the file); it degrades or says so
       Spec  §9.1 (Scan always opens), patterns §7
R2-18  Regression: run 1's 100 passing criteria still pass; the 11 failures are judged `fixed`,
       `still failing` or `regressed`
R2-19  Non-negotiables, again on the fix diff: money integer sen (the hash/size fields are not money);
       prediction vs fact (budget "Over by" uses facts only); dedupe (R2-3, R2-4); KL time (R2-5 sort uses
       instants, not strings, and display stays KL)
