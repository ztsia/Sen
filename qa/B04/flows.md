# B04 · flows

Run 1 (full). Docs only (screens.md, flows.md, spec, brief). Entry points are the preview build at 412x915 with
the made-up scenario unless stated; capture-only flows run with the shell stand-in on, friend flows with it off.
Core journeys (D124) are at the end.

FLOW-1  Split a bill you paid, to the lock                          (happy)
        Entry  Shared bills (More -> Shared bills), the open split KEDAI MEE ABC (or confirm -> Split -> I paid)
        Steps  1. read the status: Still changing, who's done  2. tick your 3 items, tap "I've ticked everything I had"
               3. open the friend link as Ali (split-public in a fresh context), enter a name, tick his, Done
               4. as Mei: tick the kuey teow only, Done, see "so far" and no QR  5. Mei ticks the fried chicken and teh ais, Done
        Ends   the split is Final; shares sum to the bill to the sen (fried chicken 7.00/7.00/6.99); Mei sees RM22.14 and the
               payer QR + Pay button; the payer's tick list appears
        Covers AC-2, AC-3, AC-4, AC-5, AC-7, AC-7t   Spec  §7, flows.md `split-mine`

FLOW-2  Split sad paths: stuck, early lock, closed, read-only        (sad)
        Entry  split with an unticked item; a split with everything claimed but one not Done; a closed split link
        Steps  1. as payer, the unticked item offers Everyone / Someone else…  2. use Everyone  3. an item claimed, someone not done:
               "Lock without waiting for Ali"  4. open a closed link  5. try to tick on a locked public link
        Ends   stuck item settled; lock works; closed link shows only "This split is closed"; locked ticks read-only with
               "To change a tick, ask Wei Ming."
        Covers AC-2s, AC-4s, AC-7s, AC-7t, AC-5s   Spec  §7, `split-stuck`

FLOW-3  A bill a friend paid, I owe                                  (happy + sad)
        Entry  Shared bills -> BBQ PLACE (Mei paid)
        Steps  1. read "You owe Mei RM24.40"  2. tap "I've paid"  3. verify Mei's tick list is read-only  4. Undo
        Ends   share ticks once; Undo restores owing; double tap = one change
        Covers AC-6, AC-6s, AC-69   Spec  §7, `split-theirs`

FLOW-4  Public split page isolation                                  (sad)
        Entry  /s/<token> style route in a fresh context with the app's scenario seeded in another tab
        Steps  1. open split-public  2. inspect for tab bar, Sen, links  3. grep DOM and storage for scenario names/balances
        Ends   only the bill and its people; no app chrome; nothing else of the person
        Covers AC-7, AC-7u   Spec  brief Notes

FLOW-5  Ask Sen: answers, proposal, research, ask_user               (happy)
        Entry  Insights tab -> Sen button; also Home
        Steps  1. header says Looking at: Insights, suggested questions fit  2. read an answer with a "not checked" figure and a
               "from your file" figure  3. Apply a proposal, Undo  4. Dismiss another  5. answer an ask_user  6. open ⋯ ->
               memory, research, usage
        Ends   marks as spec; Apply once; menu screens render; Back closes the sheet then the screen
        Covers AC-8..AC-14   Spec  §12.2, §12.3

FLOW-6  Sen sad states                                               (sad)
        Entry  dev panel: state=offline, state=paused/cap, streaming
        Steps  1. open Sen offline  2. at the cap  3. streaming
        Ends   "Sen needs a connection"; "Sen is paused until 1 Nov; everything else works"; composer can't send
        Covers AC-12   Spec  §9.6

FLOW-7  Balance check                                                (happy + sad)
        Entry  More -> Accounts -> Check balances
        Steps  1. Matches on one account, type the figure on another  2. Save  3. read Unaccounted on Home  4. repeat with
               hostile input ("abc", "1e3", "1.234", "99999999999999999999")
        Ends   differences booked; invalid input blocked with words; accounts total = sum of balances
        Covers AC-15, AC-16, AC-17, AC-17s, AC-17t   Spec  §7, D18

FLOW-8  Claims: monthly submission kit                               (happy + sad)
        Entry  More -> Claims
        Steps  1. read each scheme's status/deadline/evidence  2. open claim, Copy an amount  3. missing evidence row's how-to
               4. in a browser, Send to ESS is not offered; tap Submitted  5. a claim with complete evidence in the shell: Send to ESS
               6. Download claim pack
        Ends   status moves to submitted once; Send to ESS disabled with a reason while evidence missing; copied text equals the
               shown amount
        Covers AC-18, AC-19, AC-19s, AC-20, AC-21   Spec  §13

FLOW-9  Settings tour, owner vs friend                               (happy + sad)
        Entry  More -> Settings, as owner/admin in the shell; then as a friend in a browser without capture/claims/agent
        Steps  1. list sections in each role  2. open every section  3. in Appearance switch Dark and pin Copper, reload
               4. in You enter payday 0, 32, 15  5. Members: invite a@, then a valid email; Grant credit; Remove
               6. Data: Export everything  7. Account: Sign out everywhere
        Ends   sections per role exactly as screens.md; pinned look and dark persist; invalid values refused; Members is admin-only
               including by URL; Remove asks first
        Covers AC-22..AC-28, AC-71   Spec  §9.6, screens.md

FLOW-10 Sign-in states                                               (happy + sad)
        Entry  /sign-in, and an invitation link with the email prefilled
        Steps  1. enter email  2. wrong code  3. "Send a new code"  4. expired code  5. unknown email -> invitation-only
               6. expired invitation 7. hostile email and code strings
        Ends   each state says its words; code field takes 6 digits only
        Covers AC-29, AC-29s   Spec  flows.md `first-run`, `invited`

FLOW-11 Invited friend's first day                                   (happy)
        Entry  an invitation link, browser without capture
        Steps  1. sign-in with email filled  2. short first run: categories, switch one off  3. Home
        Ends   Home shows this month's spending, no balances, no payday question, no accounts entry in More
        Covers AC-31, AC-15s   Spec  `invited`, D79

FLOW-12 Payday flow                                                  (happy + sad)
        Entry  dev simulator -> Payday; the Payday card on Home
        Steps  1. step 1 as done by payslip (Undo)  2. rerun with step 1 asked, Yes  3. balance check  4. look-back  5. plan, Use this plan
               6. skip a step -> Review
        Ends   skipped step waits in Review; the plan's moves tick off; Home shows progress
        Covers AC-32, AC-32s, AC-61   Spec  §9.7

FLOW-13 New look reveal                                              (happy + sad)
        Entry  dev panel -> Play the reveal (any look to any look, light and dark)
        Steps  1. crossfade  2. card: name, avatar, Keep it focused  3. Go back  4. switch off, Keep it -> pinned  5. reduced motion
        Ends   look as chosen; lands on Home; pinned in Settings -> Appearance
        Covers AC-33, AC-33s, AC-23   Spec  patterns §9

FLOW-14 Native prompts and pushes                                    (happy + sad)
        Entry  dev panel stand-ins
        Steps  1. category prompt: tap a guess -> rule made  2. second new merchant replaces first in shade  3. paying-back prompt ->
               share ticked  4. quiet scan prompt -> scan  5. owe reminder  6. each push opens its screen
        Ends   each tap routes per screens.md; replaced prompt waits in Review
        Covers AC-34, AC-34s, AC-35   Spec  screens.md Native surfaces

FLOW-15 Widgets and capture off                                      (happy)
        Entry  dev panel widgets; simulator Capture off
        Steps  1. S, M, L light and dark  2. capture off: all dark with "Capture is off" + Fix  3. Fix  4. widget figure vs Home figure
        Ends   widgets match Home to the sen; Fix returns state
        Covers AC-36, AC-36s, AC-37   Spec  §9.1

FLOW-16 Simulator: offline and sync exactly once                     (happy + sad)
        Entry  Playwright context.setOffline(true), and dev simulator Offline
        Steps  1. offline, record a manual payment  2. reload  3. back online
        Ends   the payment appears once (not twice), "Not synced yet" only offline/after 5 s, then clears
        Covers AC-70, AC-37, AC-69   Spec  §5, §18

FLOW-17 Notification arrives (simulator)                             (happy + sad)
        Entry  dev simulator -> A notification arrives (new merchant); then one containing "OTP 482913", one from a messaging app
        Steps  1. prompt stand-in  2. Review row  3. OTP and messaging variants
        Ends   OTP / non-allowlisted items never appear in Review or anywhere
        Covers AC-72, AC-37   Spec  §6.2

FLOW-18 Journeys list                                                (happy)
        Entry  dev panel -> Journeys
        Steps  1. count entries against flows.md's contents  2. walk each
        Ends   every flows.md journey id present; each reaches its stated end
        Covers AC-39, AC-39s, AC-41

FLOW-19 Production build is clean                                    (sad)
        Entry  production build on :4176
        Steps  1. no dev panel / gallery / simulator / ?scenario  2. no fake data  3. grep bundle for secrets  4. network: no third party
        Ends   clean
        Covers AC-38, AC-62, AC-64   Spec  CLAUDE.md, modules.md rule 6

FLOW-20 Timezone                                                     (sad)
        Entry  browser timezone Pacific/Auckland vs Asia/Kuala_Lumpur
        Steps  1. Home, payments, claims period, splits' times  2. compare
        Ends   identical
        Covers AC-65   Spec  D14

## Core journeys (docs/flows.md, D124)

FLOW-C1 first-run                                                    (core, happy + sad)
        Entry  /first-run in the shell stand-in
        Steps  1. sign-in 2. apps (TNG/Ryt/Public/Grab preticked) 3. access (Skip for now variant) 4. Keep Sen running (brand steps)
               5. accounts with balances 6. your name TAN WEI MING 7. payday 8. Home
        Ends   Home reads "Spent since you started"; with Skip, Capture is off + Fix; closed mid-way reopens at the same step
        Covers AC-30, AC-30s

FLOW-C2 pay-new                                                      (core, happy)
        Entry  dev simulator: a payment RM9.50 at ROTI BAKAR 88
        Steps  1. prompt with two guesses + Scan receipt  2. tap a category  3. second payment at the same merchant
        Ends   first takes the category; rule created; the second asks nothing
        Covers AC-34, AC-34s

FLOW-C3 scan-after                                                   (core, happy + sad)
        Entry  Scan tab or quiet scan prompt
        Steps  1. scan 2. reading 3. confirm (people stepper, Done) 4. toast "Attached to RM58.30 on Ryt" + Undo; sad: scan twice
        Ends   one attached receipt; second scan "Already added"
        Covers AC-40
