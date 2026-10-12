# B04 · Skeleton: everything else: acceptance criteria

Run 1 (full). Written from `spec_v2.md`, `docs/decisions.md`, `docs/flows.md`, `docs/screens.md`,
`docs/ui/patterns.md` and `docs/briefs/B04-skeleton-rest.md` **before any B04 source was opened**.
`docs/handoff.md` and `git diff --stat` were read for scope (they name files, not behaviour). The sweep's
index (`qa-artifacts/B04-skeleton-rest/sweep/index.md`) was read for suite results only.

The slice is screens on an in-browser fake plus shared zod types (`views.ts`, `commands.ts`) and the dev
panel's native stand-ins. It has **no SQL, no API route and no RLS**: phase 4 runs against the fake and the
shared types only, and says so. Screens are walked at 412x915 (QA rules); the brief's 390x844 is checked once.

Conventions: money is integer sen; "KL" is `Asia/Kuala_Lumpur`. Each criterion has a sad twin (`-s`).
Non-negotiables this slice touches are section I.

## A. Shared bills (screens.md `split`, `split-public`, `shared`; spec §7; D47, D64, D65, D71, D92)

AC-1   `shared` lists every split, newest first
       Given the scenario's splits
       Then  each row reads `You paid · N of M paid you back` or `<Name> paid · you owe RM<x>`; a row opens `split`
       Spec  screens.md `shared`
AC-1s  With no splits the screen shows one empty line saying what will appear and how to start one (no illustration)
       Spec  patterns §7 Empty

AC-2   `split` as payer, *Still changing*
       Then  header shows the merchant and total and `Paid by You`; status in words with an icon naming who is done and
             what it waits for; a QR (stand-in) and `Share the link`; items show who ticked; an item several people ticked
             reads `Shared ÷N: ... · your part RM<x>`; `I've ticked everything I had`
       Spec  screens.md `split` 1-5
AC-2s  An item nobody ticked is marked, and the payer is offered `Everyone` and `Someone else…`; as a non-payer these are absent
       Spec  D71, screens.md `split` 4

AC-3   Largest-remainder shares
       Given a shared item of RM21.00 ticked by three (the flows.md fried chicken) or any odd-sen item
       Then  the shares are integers in sen, differ by at most 1 sen and sum to the item exactly (RM7.00 + RM7.00 + RM6.99)
       And   each person's shares across all items sum to their displayed total; the totals sum to the bill
       Spec  spec §7, D71, flows.md `split-mine` 6
AC-3s  A bill whose items don't divide evenly (RM0.01 shared by 3, RM64.13 total) never shows a share of
       fractional sen, `NaN`, `0.0000...` or a total off by a sen
       Spec  CLAUDE.md money

AC-4   Lock rule
       Then  the split is *Final* only when every person is done AND every item is claimed. Ticking an item nobody had
             while someone isn't done leaves it *Still changing*; no QR/pay button until the lock
       Spec  D71, flows.md `split-mine` 4
AC-4s  Every item claimed but one person not done: still changing, and the payer is offered `Lock without waiting for <Name>`;
       using it locks. An item still unclaimed: that button is absent
       Spec  flows.md `split-stuck`

AC-5   After the lock, payer's view
       Then  `You're done ✓` with `Still ticking`? no longer applies; the payer sees a tick per friend with the share and how it
             was ticked (`matched: Ryt, today 11:58` or `ticked by you`); ticking cash marks `ticked by you`
       Spec  screens.md `split` 6, D65
AC-5s  A non-payer cannot tick another person's payment (read-only list)
       Spec  D65

AC-6   After the lock, as one who owes
       Then  `You owe Mei RM24.40` whether or not paid; `I've paid` ticks it by hand; the payer's tick list is read-only
       Spec  screens.md `split` 7
AC-6s  Once paid, `I've paid` no longer offered (or undoable) and the amount owed doesn't change

AC-7   `split-public` shows only that bill, no chrome
       Then  no tab bar, no Sen button, no app header links, no navigation to any app route; first visit asks for a name, then
             `Hi <Name>. Sen remembers this browser.`; a reload keeps the name
       Spec  screens.md `split-public`, brief Notes
AC-7s  A closed link shows `This split is closed` and nothing else (no merchant, no items, no amounts, no QR)
       Spec  screens.md `split-public` Varies
AC-7t  After the lock, ticks are read-only with `To change a tick, ask Wei Ming.`; the DuitNow QR and `Pay RM22.14`
       appear only when final, never while *Still changing*
       Spec  screens.md `split-public`, D71
AC-7u  `split-public` leaks nothing of the person's data: with the app's own scenario seeded, nothing of it (balances, other
       payments, names of other splits) is in the DOM or in storage read by this route
       Spec  brief Notes, spec §7 "page shows only that bill"

## B. Sen and agent/* (screens.md `sen`; spec §12.2, §12.3, §12.5; D68, D94, D108, D109)

AC-8   Sen's button on the five tab screens only
       Then  visible bottom-right, labelled `Ask Sen`, not covering the last row; absent on pushed and task screens
             and on split-public; with the agent switch off it's absent everywhere
       Spec  D68, patterns §6, screens.md rules
AC-8s  Opening Sen on Insights shows `Looking at: Insights`; on Home `Looking at: Home`; Back closes the sheet first, then the screen
       Spec  screens.md `sen`, patterns §6

AC-9   Message kinds render
       Then  a check-in note, an answer, a proposal card (`Apply`, `Dismiss`), a research draft with numbered markers and
             a numbered source list each with title, site, `checked <date>` and an external-link icon, `ask_user` buttons
             styled like a Review row (2-4 options, recommended first and marked), a composer with a clip button,
             suggested questions fitting the screen
       Spec  spec §12.3 table, §12.2 rule 6
AC-9s  `ask_user` with 4 options shows 4 (not clipped to 3); an `ask_user` answer is only an offered option
       Spec  §12.3 (handoff open point says ReviewRow shows 3: this checks it)

AC-10  Traceability marks
       Then  a figure Sen couldn't trace is marked `not checked`; one from an attached file is marked `from your file`;
             a traced figure carries no mark
       Spec  D108, D109, §12.2 rule 1
AC-10s Every RM figure in Sen's messages is either traceable (shows a tool/source) or marked; none is unmarked and
       unsourced. Sen writes no URLs outside the numbered sources, and every source link opens externally (`target`/rel or the
       shell's openInBrowser), never in-app
       Spec  §12.2 rules 1, 6; §17

AC-11  Apply / Dismiss
       When  `Apply` is tapped
       Then  the card shows it applied with an `Undo`; a second tap within 500 ms does nothing more; `Dismiss` removes it
       Spec  §12.1, patterns tap-guard
AC-11s Apply twice (double-tap) changes state once

AC-12  Sen states: streaming, offline, paused
       Then  offline: `Sen needs a connection` and the composer can't send; at the cap: `Sen is paused until 1 Nov; everything else
             works`; streaming shows a working state in words
       Spec  screens.md `sen` Varies, §9.6

AC-13  Research drafts are unconfirmed
       Then  a draft's figures are labelled drafts/unconfirmed until confirmed; no figure of the user's own money appears
             inside a search query shown
       Spec  §12.2 rule 6

AC-14  `agent/memory`, `agent/research`, `agent/usage`
       Then  memory lists what Sen remembers with a way to forget; research lists briefs with sources; usage shows credit
             balance and this month's free allowance in RM with two decimals, no 'cap' wording (D98)
       Spec  D98, screens.md `sen` menu
AC-14s Empty memory/research/usage each show one line (not a blank page)

## C. Accounts and balance-check (screens.md; spec §7; D18)

AC-15  `accounts`
       Then  a total; each tracked account with balance and when last checked; *Elsewhere* accounts WITHOUT balances; `Check balances`
       And   the total equals the sum of the tracked balances shown, to the sen
       Spec  spec §7, screens.md
AC-15s Without capture (a friend's browser) there's no `accounts` entry in More and `/accounts` shows nothing of balances
       Spec  D52, screens.md rules

AC-16  `account`
       Then  balance, opening balance, the feeding app, recent payments, its checks
AC-16s An unknown account id shows an error/empty state with a way back, not a blank or a crash

AC-17  `balance-check`
       Given computed balance X shown beside a box
       When  `Matches` is tapped for it
       Then  the box takes exactly X and that account's difference is 0
       And   typed `1,284.50` / `1284.5` / `1284` parse as text into sen (128450 / 128450 / 128400), no float
       When  `Save`
       Then  each difference is shown as `Unaccounted` (money out unseen adds; money arrived unseen takes it down, can be
             negative) and the gap on Home is the last check's gap
       Spec  D18, spec §7
AC-17s Hostile input: `abc`, `1e3`, `-5`, `1.234`, `99999999999999999999`, empty, `0.1+0.2` -> a field message in words,
       the Save button stays enabled and says what's missing, nothing is booked
       Spec  patterns §7 Forms
AC-17t The tab bar is hidden on `balance-check`; its draft survives Back/forward

## D. Claims (screens.md; spec §13; D45, D95-D97)

AC-18  `claims`
       Then  one claim per scheme with amount, status, deadline, evidence; `Download claim pack`; in the shell `Send to ESS`
             (absent in a browser)
AC-18s Without the claims switch there's no Claims entry in More and no route content

AC-19  `claim` submission kit
       Then  values in ESS's order each with `Copy` (copies text equal to the shown amount), files with `Open` and `Share`,
             missing evidence with how to add it, `Submitted` moves status; `Approved` shows approved amount
       Spec  §13
AC-19s `Send to ESS` is disabled with a reason while evidence is incomplete; in a browser it isn't offered and the kit +
       `Submitted` is the path
       Spec  §13.1 "only submits a claim whose evidence is complete"

AC-20  Status card wording
       Then  a claim's status is said in words with an icon first (e.g. `Waiting for…`), colour only supports
       Spec  patterns §7 Status cards

AC-21  No real claim values anywhere
       Then  scheme names/caps/employer/ESS address in the UI and source are plainly made up; no string looks like a real ESS
             host or real handbook figure
       Spec  CLAUDE.md non-negotiable, §13, D95

## E. Settings (screens.md table; D52)

AC-22  Settings lists exactly the sections allowed for the role
       Given owner/admin in shell with capture: Appearance, Capture, You, Categories and rules, Receipts by email, Claims, Sen,
             Members, Data, Account
       Given a friend in a browser without capture/claims/agent: no Capture, no Claims, no Sen, no Members
       Spec  screens.md Settings table, §9.6
AC-22s Members is never visible to a non-admin, and its URL for a non-admin shows nothing of members

AC-23  Appearance
       Then  `System / Light / Dark` switches theme and persists across reload; the look: `Changes each quarter` default or
             one of six pinned, with today's look and next-change date (1 Jan/Apr/Jul/Oct KL)
       Spec  D44, D77, D78
AC-23s Pinning a look then reloading keeps it; turning pinning off returns to the roster look

AC-24  You
       Then  names as banks print them (capture only), expected payday ("last working day" or day number), DuitNow QR
AC-24s Day number 0, 32, `abc`, empty -> message; no save of an invalid value

AC-25  Claims section (shell only parts)
       Then  ESS: sign in once, `Forget ESS password`, `Fetch payslip`, `Submit claims`, `Teach Sen`, `Import recipe`, last
             payslip; a PASSWORD IS NEVER shown or round-tripped to JS: the field (if any) is a native-screen stand-in
       Spec  D103

AC-26  Members (admin)
       Then  Invite (email, browser/shell, switches, welcome credit, allowance or Unlimited), Resend/Revoke, per-member
             switches and credit (Grant, Refund, allowance, Unlimited, daily ceiling), shell version, `Capture connected`,
             seats vs 20-device limit, Suspend, Remove (offers export; Remove asks first)
       And   Members never shows any member's spending, balances or chosen apps
       Spec  §9.6, D52, D98, §17
AC-26s Inviting an invalid email (`a@`, 300 chars, `<script>`) -> field message; nothing added. Remove cannot happen
       without the confirm. Granting a negative or non-numeric credit is refused. Credit amounts shown in RM from integer sen

AC-27  Data / Account
       Then  `Export everything` (link works 24 hours), last backup (admin only), `Sign out`, `Sign out everywhere`
AC-27s `Sign out everywhere` is destructive-styled and asks before acting or has Undo; it lands on sign-in

AC-28  Capture's steps `settings/capture/*`
       Then  apps, access (with `Allow restricted settings`), running, captured exist and are the same components first run embeds

## F. Outside the tabs (screens.md; spec §9.5, §9.7; D26, D60, D79, D104)

AC-29  `sign-in` states
       Then  email step, code step (6 digits), wrong code -> message and `Send a new code`, expired code, unknown email ->
             `Sen is invitation-only`, an invitation link opens with the email prefilled, expired invitation ->
             `Ask for a new invitation`
       Spec  flows.md `first-run` sad paths, `invited`
AC-29s Code of 5 digits, 7 digits, letters, pasted `123 456`: handled in words (spaces stripped or error), never a crash.
       An email of 500 chars or with `<img onerror>` is rejected or inert (no script execution)

AC-30  `first-run` (shell, 7 steps)
       Then  order: sign in, choose apps, notification access, Keep Sen running, accounts with balances, your name, payday;
             apps preticked TNG/Ryt/Public Bank/Grab; `Skip for now` on access; closing mid-way reopens at the same step;
             tab bar hidden; Finish lands on Home reading `Spent since you started`
       Spec  flows.md `first-run`, §9.5
AC-30s Access refused -> Home shows `Capture is off` with `Fix`. Blank name or invalid payday blocks step with a message, in words

AC-31  `first-run` short (no capture)
       Then  sign in and categories only, no payday question, no balances; categories switch off individually
       Spec  D26/D79, `invited`

AC-32  `payday`
       Then  up to four steps, one per screen; step 1 shown both as already done by payslip (`Undo`) and as asked (`Did this
             salary include them?`, Yes preselected); `Skip` on each step; a skipped step is in Review; step 4 `Use this plan`
             and each move ticks off; tab bar hidden
       Spec  §9.7, D60, D104
AC-32s Without the claims switch there's no step 1; without capture no balance check/plan; with the agent off no steps 3, 4

AC-33  `new-look`
       Then  a 250 ms crossfade (no look-specific arrival), the look's name, Sen's avatar resting, `Keep it` (focused), `Go back`,
             `Change each quarter` switch on, line `You can change this any time in Settings → Appearance`
       And   `Keep it` keeps the new look; `Go back` restores the old for this quarter; switch off pins the chosen one
             (Keep it pins new, Go back pins old); either lands on Home
       Spec  patterns §9, D77, D84
AC-33s Reduced motion: no animation beyond the crossfade; TalkBack text `Sen has a new look: <Name>`; back gesture = Keep it

## G. Native stand-ins and the simulator (screens.md Native surfaces; brief)

AC-34  Prompts
       Then  category prompt `RM9.50 · ROTI BAKAR 88` with two guesses + `Scan receipt`; paying-back `RM25.00 to MEI LING TAN`
             with `Paying back: BBQ PLACE` first + `Other…`; quiet scan `RM58.30 · NASI KANDAR ABC · Meals` + `Scan receipt`
             (clears after 10 min); owe reminder `You owe Mei RM24.40` with `I've paid`, `Open the split`
AC-34s A second new merchant replaces the first prompt in the shade and the first waits in Review; a swiped-away prompt
       leaves its item in Review (D22, D24)

AC-35  Pushes and shortcuts
       Then  health alerts (`Capture may be off`, `Daily jobs have stopped`), Sen's push (at most one a day), claim reminders
             (3 days before, on the day), export ready (24 h link); launcher shortcuts `Scan receipt`, `Add expense`; share
             target `Sen`; island moments (just paid, reading a receipt, split at the table, paying a friend, payday moves, ESS filing, Sen working)
       And   each tap goes where screens.md says (`home`, `sen`, `claim`, `scan`, `manual`, download, `reading`)

AC-36  Widgets S/M/L
       Then  each in six looks, light and dark, and dark with `Capture is off` + `Fix`; Small: left until payday, meter, Scan;
             Medium adds pace and `Review N`; Large adds top categories, most at-risk budget, Sen's note; at most four figures on glance surfaces
       Spec  §9.1, §9.2, D74
AC-36s The widget's figure equals Home's large figure for the same scenario (same sen, same format)

AC-37  Simulator
       Then  `A notification arrives` shows the prompt stand-in then the item in Review; `Payday` shows the Home card; `Capture off`
             shows the warning on Home and dark widgets; `Offline` shows the banner and `Not synced yet` marks after 5 s only
       Spec  brief, patterns §7 Offline
AC-37s Turning each simulator state off restores the previous state exactly; the simulator is absent from a production build

AC-38  Dev tooling absent from production
       Then  a production build has no dev panel, no `/dev/gallery`, no simulator, no `?scenario=`/`?state=` effect, and no fake
             data presented as real (modules.md rule 6: nothing made up in production)
       Spec  CLAUDE.md `pnpm build`, modules.md rule 6

## H. Journeys and done-when

AC-39  The dev panel's guided list contains every flows.md journey id (37 in the handoff; the count reconciled with flows.md's
       contents) and each walks its screens in order to its stated end
       Spec  brief "Every journey, clickable"
AC-39s A journey whose precondition screen is unavailable (capture-only journey in a no-capture scenario) says so rather than
       navigating to a broken screen

AC-40  The core journeys `first-run`, `pay-new`, `scan-after` (D124) complete in the real app flow, not only in the guided list
AC-41  Every journey completes in all six looks, light and dark
AC-42  axe: no serious/critical violation on every screen and stand-in, six looks, light and dark
AC-43  Touch targets are at least 48 px (list rows excepted), text contrast 4.5:1, icon-only buttons have aria-labels (patterns §8)

## I. Non-negotiables this slice touches

AC-60  Money is integer sen
       Then  `parseFloat`, `toFixed`, `Number(` on amount strings, `/` or `*` in money paths in the B04 diff are absent or shown safe;
             every typed amount goes through the money parser
       Spec  CLAUDE.md
AC-60s Typed `0.1`+`0.2` style inputs, `1,5`, `RM 12.90`, `12.999`, 20-digit values: parsed exactly or refused in words; never `NaN`/`Infinity`/`e+`
AC-61  A prediction never shares a table with a fact
       Then  the cycle sheet's estimate at payday, Sen's projection, the payday plan, a subscription's forecast are labelled as
             estimates/plans and are not included in `Spent`/surplus/`Left until payday`; `types` for forecast rows are separate from transactions
       Spec  CLAUDE.md, §11, flows.md
AC-62  Secrets never ship in the app
       Then  grep of `apps/web/dist` (production build) for key/token shapes (`sk-`, `AIza`, `ghp_`, `-----BEGIN`, `postgres://`, `Bearer `,
             `service_account`) finds none; no real ESS host
AC-63  Real financial data never in the repo
       Then  fixtures and fake data are anonymised (made-up names, `example.com`), `pnpm hygiene` passes
AC-64  The shell loads only our own site: no request leaves the origin in any journey (no third-party scripts/fonts/CDN)
       and the CSP raises no violation
AC-65  KL time
       Given the browser timezone Pacific/Auckland (or America/Los_Angeles) and a payment at 23:30 KL on the last day of a month
       Then  dates, day headers, month totals and `days to go` don't move compared with Asia/Kuala_Lumpur; claim periods use the KL calendar month
AC-66  Patterns: every new screen's list row (>=64 px stable height, amount not truncated), form (Field, label above, message
       below, inputMode/enterKeyHint), sheet (grab handle), and empty/loading/error/offline state match `patterns.md` §7
AC-66s A screen that has no data shows its one-line empty state; loading is a skeleton, not a spinner
AC-67  Money display: `RM1,284.50` format, `+` and money-in colour for money in only, money out plain, `Not synced yet` in money-pending
AC-68  Refunds and income are money in only, in the UI and the fake's writes
AC-69  Dedupe/idempotency in the fake: double-tapping any write (Apply, Mark paid, Tick, Submitted, Save check) changes state once
AC-70  The offline flow: while offline (simulator or `context.setOffline`) a write is marked `Not synced yet` and after reload and
       reconnect appears once, not twice
       Spec  §5, §18
AC-71  Only what the person can use: switches (capture/claims/agent/splits/email/calendar) hide screens, menu entries and cards
       (and a direct URL shows no data) -- hiding is not only a menu hide
       Spec  D52, §9.6
AC-72  OTP/TAC: a simulated notification containing a one-time code, or from a non-allowlisted/messaging app, never reaches
       Review or any list in the web app (the simulator's stand-in respects the filter, or says it doesn't)
       Spec  CLAUDE.md, §6.2, D86
