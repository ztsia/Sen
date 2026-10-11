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

Added during phase 5 of run 2, after the code and the screens were open (written after the fact: weaker
evidence, kept because each came from a spec citation the first pass missed):

R2-20  A screen opens at its top
       Given a tall screen (Review) scrolled down 900 px
       When  another tall screen (Insights, or Payments) is opened that was opened before in the session
       Then  it is at scrollTop 0, the search and filters (Payments) or the first card (Insights) visible
       Spec  patterns §10 (each screen scrolls inside the page), screens.md `payments` (newest first)
R2-21  A refusal is seen
       When  *Done* is refused (by-hand items above the payment)
       Then  the words are on the screen the person is looking at (in view, or a toast), never only below the fold
       Spec  patterns §7 *Error* ("says what happened")
R2-22  Every write button is idempotent under a fast double tap, not only Review's rows: Apply all, *This was
       a payment* (Skipped), *Delete* (txn: goes back once), *Mark as…* choice
       Spec  §6.5, CLAUDE.md (every input has a dedupe key), AC-63
R2-23  Text at 1.5x: an amount is not split across lines at the comma ("RM3," / "873.53")
       Spec  patterns §8 (amounts wrap before they truncate; a number stays whole)

---

# Run 3 (full, fresh reviewer)

Written from the docs **before any B03 source, earlier report or earlier acceptance run was opened** (only
the slice's brief, `docs/screens.md`, `docs/flows.md`, `docs/ui/patterns.md` and the spec sections the
brief cites). Ids are `R3-n` so they do not clash with runs 1 and 2; the earlier criteria are folded in
after, in *Carried from runs 1 and 2* below. Every criterion has a sad twin (`-s`).

R3-1  Money text
      Given amounts of 0, 1, 128450, and 99999999999 sen, and a negative "left until payday"
      When  they render on Home, payments, txn and the confirm screen
      Then  they read `RM0.00`, `RM0.01`, `RM1,284.50`, `RM999,999,999.99`; a negative left-until-payday reads
            `Over by RM…` with an icon and words, never `-RM`; no amount is truncated by an ellipsis
      Spec  patterns §3, screens.md `home`
R3-1s Merchant name of 300 characters next to an amount: the merchant truncates, the amount stays whole.

R3-2  Number pad parses text into sen
      Given the `manual` screen
      When  `12.5`, `0.30`, `.5`, `1,234.56` are typed
      Then  the large figure reads RM12.50, RM0.30, RM0.50, RM1,234.56 and the saved row holds 1250, 30, 50,
            123456 sen
      Spec  spec §6.8, patterns §7 Forms, CLAUDE.md money
R3-2s `12.345`, `abc`, `-5`, `1e3`, `0`, empty, `9999999999999999` : no third decimal accepted, no NaN, no scientific
      notation, zero cannot save and the button says what is missing, an amount past 2^53 sen is refused
      and never silently rounded.

R3-3  Receipt items add up exactly (D66)
      Given a read receipt with tax and service spread over its items
      When  `confirm` shows it
      Then  the item prices (tax and service included) sum to the total to the sen, shown with a visible
            "items add up" check; headcount 3 on RM64.13 reads `RM21.38 a person`
      Spec  spec §6.4, screens.md `confirm`
R3-3s A receipt whose items do NOT add up is marked doubtful in place, not silently fixed; the stepper cannot go below 1.

R3-4  Just my part (D92)
      Given a bill, ticking some items
      When  *Just my part* is confirmed
      Then  my part + `Others' items` = the printed total to the sen
R3-4s Ticking nothing and ticking everything both give a coherent result (my part RM0.00 / Others RM0.00), no negative.

R3-5  Shared-bill rule (D19)
      Given RM120 dinner on Ryt, share RM40
      Then  spending RM40 and owed RM80; after Ali repays RM40: RM40 / RM40; after Ben: RM40 / RM0; never below zero
R3-5s A repayment larger than what is owed leaves owed at RM0.00, not negative; *Write off* grows the share by exactly the unpaid amount.

R3-6  Refund (D21)
      Given a refund linked to a purchase in cycle N
      Then  cycle N's spending falls by exactly the refund; income does not rise; the balance rises on the day
R3-6s Undo returns the exact prior figures; a refund is never listed as income.

R3-7  Own transfer (D17)
      Then  Home spending and income unchanged; the two balances move; `payments` shows ONE row `Ryt → TNG eWallet`
R3-7s A transfer with a missing side asks "Where did it come from?"; choosing Elsewhere leaves total balance moved
      on one side only, with no spending.

R3-8  A prediction never shares a table with a fact (CLAUDE.md)
      Given subscription forecasts and the cycle-end estimate
      Then  forecasts appear in no spending total, no payments list, no budget meter and no "left until payday";
            the estimate on `cycle` is labelled as an estimate; the meal average is labelled an estimate
R3-8s Marking a forecast as matched/missed changes no spending figure.

R3-9  Home reconciles with the other screens
      Then  Spent this cycle on Home = sum of this cycle's day headers in `payments` filtered to this cycle
            = the `cycle` sheet's spending line; Left until payday = income received - spending; pace delta =
            this cycle's spend by today minus last cycle's by the same day
R3-9s The first cycle says there is no last cycle (no `NaN`, no RM0 delta); before the first salary the figure reads
      `Spent since you started`.

R3-10 Timezone (D14, CLAUDE.md)
      Given a payment at 23:30 KL on the last day of a month
      When  the browser timezone is America/Los_Angeles, UTC and Pacific/Kiritimati
      Then  its day header, month, cycle membership and every total are identical to the KL run
R3-10s A payment at 00:30 KL on the 1st is in the new month in all three zones.

R3-11 Payments list
      Then  newest first, grouped by KL day with the day's spending, header sticky; rows >= 64 px; the whole row is the
            link and holds no button; marks: receipt, split, in Review, Not synced yet, Filled in
R3-11s 60+ rows are virtualised (DOM row count < total) yet the last row is reachable; a search for `'; DROP TABLE`, `.*`,
       `(` , `\` and a 500-char string does not throw and shows the empty state (one line + the action).

R3-12 Review: the badge is Needs you only (D72)
      Then  badge number = count of Needs you rows; Waiting on others and Skipped never add to it; label reads "N to review";
            caps at 99+; answering a row lowers it by exactly one and Undo restores it
R3-12s Nothing needs you: badge absent, `Nothing needs you.` shown; Waiting on others still listed.

R3-13 Every Needs you kind exists with its buttons (screens.md table): new merchant (two guesses + Other…), money in unseen name
      (Whose split share is it? + Not a split), money in to classify (Income, Transfer, Refund of…), split share owed
      (Open the split, I've paid), receipt waiting (opens confirm), unreadable receipt (opens manual with the image),
      new wording (Yes / No), transfer missing side (accounts + Elsewhere), balance check due, claim due,
      skipped payday step, proposal (Apply / Dismiss). At most three buttons plus Other…
R3-13s *No* on new wording undoes its payment and offers Enter it by hand.

R3-14 One change per tap (patterns §7)
      When  a Review answer is tapped twice within half a second, at the same spot
      Then  exactly one row is answered; the next row that slid up is untouched
R3-14s A third tap after 600 ms is a normal tap.

R3-15 Undo restores exactly
      When  any write is made and Undo tapped inside 6 s
      Then  rows, order, badge count and every figure are as before; toast stays 6 s above the tab bar and not over Sen's button;
            a toast is not shown when the change is visible on screen
R3-15s Undo after the toast has gone does not exist; a second Undo tap does nothing.

R3-16 Scan routing (D69)
      Then  tap on the middle tab opens `scan` at once; a 500 ms press opens `scan-more` with Scan receipt, From gallery, Add manually;
            a 200 ms press does not; the tab bar is hidden on scan, confirm and manual only
R3-16s A long-press does not also navigate to scan; releasing outside the tab does nothing.

R3-17 Scan in a browser
      Then  a photo from the file picker goes to a crop with four draggable corners, then `reading`, then `confirm`
R3-17s A .txt / 0-byte / 50 MB file is refused with words; the same file twice is `Already added`, not a second receipt (§6.5);
       cancelling the picker returns to where you were.

R3-18 Reading (D67)
      Then  shows the image and `Reading receipt…`; leaving it leaves the receipt waiting in Review once read
R3-18s Reading failure goes to `manual` with the image beside it; the image is kept.

R3-19 After Done (§6.4)
      Then  one match: toast `Attached to RM58.30 on Ryt` with Undo; several: a sheet asks which; none: `Waiting for its payment`
            and the receipt is under Waiting on others; without capture the payment is created
R3-19s Total differing from the payment attaches items and evidence only; the payment's amount, share and category do not change.

R3-20 Waiting receipt (receipt-first)
      Then  Review offers Attach to a payment… (likely payments first), Evidence only, Enter the payment
R3-20s No likely payment: the list says so in one line; it does not offer an empty sheet.

R3-21 Manual
      Then  amount large, categories most used first, last account, time now, merchant and note behind More; Save + Undo creates one row;
            a near-duplicate shows a warning that does not block
R3-21s Back or a sheet in the middle keeps the typed draft; Save with nothing typed says what is missing; double-tap Save makes one row.

R3-22 By hand receipt (D90)
      Then  items typed as text into sen; checked against the payment amount; `RM3.20 not itemised` allowed
R3-22s Items summing to MORE than the payment are flagged; a price `1.999` is refused.

R3-23 txn
      Then  amount large, merchant, date/time/account, source line, category (rule-backed change asks Just this one / From now on),
            your spending, note row, receipt or Scan the receipt / No receipt…, split, What the bank said, Changes,
            Mark as…, Delete (destructive colour, still Undo)
R3-23s Correcting an amount: `12.345`, `abc` refused; the correction is kept in Changes; Delete then Undo restores the row and its marks.

R3-24 Insights cards (spec §9.3)
      Then  every card with data shows a question, a chart, a one-line takeaway computed from the same data, and Ask Sen about this;
            Ask Sen opens `sen` headed `Looking at: Insights`; a card with no data is not shown; The year is a row at the foot
R3-24s The takeaway numbers equal what the payments list says (e.g. payments under RM15: count and total).

R3-25 Chart rules (patterns §4)
      Then  at most three series, legend when two or more, text never in a series colour, no raw colours, money-in green absent from
            charts, a goal meter never in warning colour, an over-budget meter in warning WITH icon and words
R3-25s A chart is never the only way to get its answer: the takeaway is present when the chart is empty-ish.

R3-26 Budgets / goals / subscriptions
      Then  budgets show a tick for the cycle's elapsed fraction; a goal shows feasibility with its sample size and projected finish;
            subscriptions show forecast vs actual, `missed` marked
R3-26s Goal with sample size 0 or 1 does not claim feasibility.

R3-27 Production (modules rule 6, brief Done-when 5)
      Then  a production build shows `Not built yet` on these screens; its JS holds no made-up names (Wei Ming, NASI KANDAR…), no dev panel,
            no `?scenario=` effect, and no secret/key/token
R3-27s `?scenario=` and `?state=` in production are ignored.

R3-28 Dev state switcher reaches every Varies state (empty, loading skeleton, error with a button, offline banner, without capture,
      before first salary, first cycle, counting by month, cap reached) and each looks like patterns §7 (no spinner over a whole screen,
      error says what happened and what to do)
R3-28s Error state keeps what was typed.

R3-29 Offline (D22, §5)
      When  context is offline, a change is made, and the app goes online again
      Then  while offline the row carries `Not synced yet` (money-pending); after reconnect it clears and the change was applied exactly once
R3-29s Offline reads still work for screens already opened; no `Not synced yet` flicker for a normal online write (only offline or after 5 s).

R3-30 Navigation (patterns §6, §10)
      Then  tab bar order/labels; `aria-current`; back on a non-Home tab goes to Home; each sheet is a history step so back closes it;
            Sen's button on the five tab screens and nowhere else, 60 px, labelled `Ask Sen`, never over the last row
R3-30s Back with two sheets open closes only the top one.

R3-31 Six looks, one app (patterns §1)
      Then  the same labels and layout in all six looks light and dark; the large figure is the same number as its accessible text
            (`Left until payday, RM1,284.50, 12 days to go`)
R3-31s Reduced motion: the figure and strips settle at once; WebGL unavailable: the app still renders.

R3-32 Accessibility
      Then  axe has no violations on any screen in any look/mode; touch targets >= 48 px (full-width rows exempt); text at 1.5x does not clip;
            focus rings only for keyboard
R3-32s Icon-only buttons have aria-labels (checked by axe and by name).

R3-33 Web behaviour (patterns §10)
      Then  no overscroll bounce, no contextmenu outside text, user-select none except text, inputs >= 16px, viewport meta right
R3-33s An amount has a Copy button; long-press on a non-text element does nothing.

R3-34 Hostile text
      Given merchant/note text `<img src=x onerror=alert(1)>`, `../../etc/passwd`, a 5000-char string, RTL and emoji
      Then  it is rendered as text everywhere (Review, payments, txn, receipt, Sen sheet); no script runs; layout holds; no uncaught error
R3-34s Notes with newlines and leading/trailing spaces are kept as typed, not collapsed into the amount.

R3-35 No floating-point money anywhere in the diff (CLAUDE.md)
      Then  no `parseFloat`, `toFixed` on amounts, `Number(` on amount strings, or money division outside the money module (lint rule green)
R3-35s The no-float lint rule actually fails when one is introduced (probe).

R3-36 The data layer (brief)
      Then  every screen reads through a query hook and writes through the one write interface; views parse with the shared zod schemas
R3-36s A malformed view from the backend lands in the error state, not a blank screen.

R3-37 No real data (CLAUDE.md)
      Then  the scenario and fixtures are made up (D11); `pnpm hygiene` passes
