# B04 · Redesign: acceptance criteria

Run 1 (full). Written from `docs/briefs/B04-redesign.md`, `docs/decisions.md` (D129, D130),
`docs/ui/patterns.md` (§2 Sizes, §3 Money, §5 Icons, §6 Navigation, §7 Building blocks, §8),
`docs/screens.md` and `docs/flows.md` **before any B04 redesign source was opened**. The sweep index
(`qa-artifacts/B04-redesign/sweep/index.md`) was read for suite results only. No source was read before
this file and `flows.md` were written.

The slice is a restructure of the web app's screens on the in-browser fake. It has **no SQL, no API route and
no RLS**: phase 4 does not apply. Screens are walked at 390x844 (the brief's viewport; also the "Home fits"
viewport) and at 412x915 (QA default). "Looks" = minted, instrument, firefly, line, mercury, copper.
Each criterion has a sad twin (`s`). Money is integer sen; "KL" is `Asia/Kuala_Lumpur`.

## A. The ten rules (brief "Rules for every screen"; patterns §7)

AC-1   One primary thing per screen, at most one main action at 48 px
       Given any redesigned screen (spot set: txn, settings, review, claims, split, scan, manual, balance-check)
       Then  at most one button is drawn 48 px high in the screen body; all other buttons are 40 (`sm`/icon) or 32 (chip)
       Spec  brief rule 1; patterns §2 Sizes
AC-1s  A screen with no valid main action (e.g. Review with nothing to answer, Claims with nothing to submit)
       shows no 48 px button at all rather than a disabled decoy
       Spec  brief rule 1, rule 9

AC-2   Cards, not hairline lists
       Given a settings, hub or detail screen
       Then  its rows sit inside a rounded card (`--radius-card`) with a secondary-size label above it;
             no full-bleed divider line runs edge to edge
       Spec  brief rule 2; patterns §7.2
AC-2s  The long lists (Payments, a day's rows) remain rows with day headers, not cards (they virtualise); the
       rows keep D129's 56 px height
       Spec  patterns §7.2, §7 Rows

AC-3   Icon tiles on everything you go to or do; none on information
       Then  every NavRow/action leads with a 32 px tile holding a 16 px lucide icon; a FactGrid cell, a stat, and
             an information-only row (the heartbeat's checks) has no tile
       Spec  brief rule 3; patterns §7.3, Settings row
AC-3s  A row that opens nothing is not given a chevron or tile
       Spec  patterns §7 Settings row

AC-4   Facts and actions don't look alike
       Then  a detail's facts are a two-column label-above-value grid; its actions are round icon buttons with a
             caption under each; rare/destructive ones are behind a ⋯ DropdownMenu
       Spec  brief rule 4; patterns §7.4
AC-4s  Choosing a destructive item from ⋯ (Delete, Forget, Remove) acts and offers Undo (or, where it cannot be
       undone, a dialog first); it is never a silent permanent delete
       Spec  patterns "Toasts and undo", "Sheets and dialogs"

AC-5   A destination row says its state
       Then  More: Payments shows the count, Shared "owed", Accounts a count, Claims "N to submit"; Settings:
             Appearance shows the current look, Capture "N apps ...", Claims "N schemes", Sen a cost
       Spec  brief rule 5; brief screen table (`more`, `settings`)
AC-5s  Each state is derived, not hard-coded: change the data (log a payment; pick another look; add a scheme)
       and the state on the row changes
       Spec  brief rule 5

AC-6   Visual choices are visual
       Then  Appearance: six looks as ChoiceCards each with a live mini preview in that look's own background and
             font, a ring and a check on the chosen one; Mode has Monitor/Sun/Moon icons; categories are tiles
       Spec  brief rule 6; `settings/appearance` row
AC-6s  Choosing a look changes the app to that look at once and the previous card loses its ring (exactly one chosen)
       Spec  patterns §7.6

AC-7   Explain once, briefly
       Then  at most one intro line per screen; how-tos are numbered Steps or behind "How it works"
       Spec  brief rule 7
AC-7s  A screen in an error/empty state does not stack an intro line, an Empty and a second paragraph

AC-8   Long things get a screen, not a sheet
       Then  a member's access opens a pushed screen with Back (not a sheet)
       Spec  brief rule 8; `settings/members`
AC-8s  Back from the pushed screen returns to Members at the same scroll position and the changes are kept
       Spec  screens.md "Back always returns to where you came from"

AC-9   Empty/missing states use EmptyState: icon tile, title, one line, one button
       Given empty variants (`?state=empty`) of lists and receipt screens
       Then  each shows exactly an icon, a title, one line and one button; never bare text plus a button
       Spec  brief rule 9; patterns §7 Empty
AC-9s  An empty state's button does the thing named (opens the add flow) and the empty state disappears once an
       item exists

AC-10  Categories have tint
       Then  a category tile takes one of three chart hues by its position, adjacent tiles differ; the name is
             always present beside/below the tile (colour is never the only signal)
       Spec  brief rule 10; patterns §7.10

## B. Screen-specific outcomes (brief screen table)

AC-11  Home fits one screen
       Given Home in every look, light and dark, at 390x844, default scenario
       Then  document scroll height <= viewport height (no scroll)
       Spec  brief `home`; D130
AC-11s Home with the payday plan active, a health warning, and Sen's note long: still no scroll, OR the extra element
       is the explicitly allowed overflow; Sen's note is clamped to 2 lines with "More"; the "More" reveals the rest
       Spec  brief `home`

AC-12  Payday plan is a one-line strip, only while active
       Then  "Payday plan · 2 of 3" with an icon and chevron when the plan is active; absent when not active
       Spec  brief `home`
AC-12s With the plan not started or finished there is no strip and no empty gap

AC-13  Review grouped by kind
       Then  headers with icons and counts (Categories · N, Splits, Checks, New wording); each item is a card; amount
             and payee semibold; answers are `chip`-sized (32 drawn) in one row that scrolls sideways; Sen's pick has
             a sparkle and accent outline; Apply all is a compact banner with an `sm` button
       Spec  brief `review`; patterns §7 Rows "Review row"
AC-13s Answering one item clears it with Undo; a double tap within 500 ms answers only once; Undo restores the item
       and the count; the tab badge count equals the sum of "Needs you" items
       Spec  patterns "One change per double tap"; D72

AC-14  Insights is a StepPager
       Then  named steps on top (On track, Budgets, Subscriptions, Goals, Year), "N of 5" shown, one full-width card at
             a time that snaps, tapping a step jumps to it and the active step is marked by more than colour
       Spec  brief `insights`
AC-14s A step with no data is not shown at all (patterns §4); the count reads "N of M" for the steps present;
       keyboard focus can reach the pager and move steps

AC-15  Cycle sheet StatTiles: in, spent, left with left emphasised; the estimate is a labelled card
       Spec  brief `cycle`
AC-15s The estimate is never styled or worded as a fact (no "RM" figure in the facts row labelled estimate); it is
       labelled as an estimate/forecast
       Spec  CLAUDE.md "A prediction never shares ... a fact"; patterns §3

AC-16  Payday: segmented progress "Step N of 4"; claims in a GroupCard; Undo is a ghost `sm` button
       Spec  brief `payday`
AC-16s Undo of the claims split restores the pre-split state and the step stays correct

AC-17  Skipped: one card per notification (app tile, time, semibold title, text clamped to 2 lines), "This was a
       payment" as an icon chip
       Spec  brief `skipped`
AC-17s Raw notification text shown in Skipped is the anonymised fixture text only (no real names/accounts); a
       one-time-code message is masked
       Spec  patterns "Raw notification row"; D116

AC-18  Manual: amount large and centred; categories a 4-column grid of icon tiles; Paid from / When as NavRows in one
       card; More details a ghost disclosure
       Spec  brief `manual`
AC-18s Typing "0.1" then "0.2" never yields a float artefact; "12.345", "abc", "" and a 20-digit amount are rejected or
       clamped with a message in words, no NaN, and Save says what's missing
       Spec  CLAUDE.md money; patterns Forms

AC-19  Scan: three tip rows with icons; Take a photo main (48), From gallery secondary, Add by hand a link
       Spec  brief `scan`
AC-19s The tab bar is hidden on scan, confirm, manual, balance-check, payday, split-public, first-run
       Spec  patterns §6

AC-20  Confirm/receipt/crop/reading: image card on top; items in a GroupCard; totals in a FactGrid; one main action;
       missing states use Empty. Item prices add up to the total, in integer sen
       Spec  brief row; flows `scan-after`
AC-20s A missing/failed read shows an Empty with the image kept and a way to `manual`; "The same file twice" still
       says "Already added"

AC-21  Payments: category mark is a hue-tinted IconTile; search field has a search icon; rows 56 px
       Spec  brief `payments`
AC-21s Searching for text with no match shows an Empty; clearing search restores the list

AC-22  Accounts: GroupCard with bank-initial tiles and "Checked 1 Oct"/"Not checked" badge; Elsewhere in a muted card
       Account: HeaderCard; FactGrid (opening balance, fed by, last checked); ActionBar (Check, Payments, Ask Sen)
       Spec  brief `accounts`, `account`
AC-22s Balances are formatted from integer sen (RM1,284.50) and "Not checked" is shown for an account never checked,
       never a made-up date

AC-23  Balance-check: one card per account with "Sen has RM..." muted, the input, "Matches" chip with check, live
       difference
       Spec  brief `balance-check`; flows `balance-check`
AC-23s Typing a figure that differs shows the difference in sen-exact RM (no float artefact, e.g. 100.10 vs 100.00 ->
       RM0.10); an empty input is not treated as 0; Matches and typing are mutually consistent

AC-24  Txn: HeaderCard (tile, payee, amount, "Today 19:58 · Ryt Bank", "From Ryt Bank's notification"); FactGrid:
       Category (tappable chip), Your share, Note; ActionBar: Receipt, Split, Ask Sen, ⋯ (No receipt, Mark as…, Delete)
       Spec  brief `txn`; patterns Detail page
AC-24s Delete from ⋯ removes the payment with Undo; Undo restores the same payment; Category change offers
       "Just this one"/"From now on"; the amount cannot be edited into a float/NaN
       Spec  flows `fix`; D25

AC-25  Shared: Segmented Open/Settled; each bill a card with stacked avatars, status badge, "you owe"/"owed to you"
       in words
       Spec  brief `shared`
AC-25s Money direction is also said in words/sign, not colour alone

AC-26  Split: header + status card stay; people are PersonRows in one card; QR in the Share sheet; items in a GroupCard
       Spec  brief `split`
AC-26s Largest remainder: RM21.00 shared by three shows RM7.00/RM7.00/RM6.99; shares sum to the item and totals to the
       bill; "Final" only when every person done AND every item claimed
       Spec  D71, flows `split-mine`

AC-27  Split-public: header card with the payer's avatar; items as check list; sticky "I'm done" is the main action
       Spec  brief `split-public`
AC-27s A friend's browser shows no tab bar, no navigation into the owner's app, and no money of the owner's other
       data; "I'm done" with nothing ticked says what is missing or is allowed explicitly
       Spec  D64; patterns §6

AC-28  Claims: each month a summary card ("2 to submit · RM152 of RM200" with a bar) holding its claims with status
       icons; "Send to ESS" is the one main action; "Download pack" in the app bar; no stand-in text
       Spec  brief `claims`; flows `claims`
AC-28s With nothing to submit "Send to ESS" is absent or disabled with a reason; the bar never exceeds 100% (a claim
       over its cap shows the cap, in words)

AC-29  Claim: stepper Draft -> Ready -> Sent -> Approved -> Paid; evidence thumbnail grid; FactGrid (amount, cap, due)
       Spec  brief `claim`
AC-29s A claim with missing evidence says which is missing in words and offers the way to add it

AC-30  Budgets: card per budget (tile, bar, status badge), "Add a budget" in the app bar
       Subscriptions: compact cards, history collapsed to "N matched"
       Goals/goal: progress rings, "RM2,950 of RM6,000", "needs RM610 a cycle"; goal has FactGrid and contributions card
       Spec  brief rows
AC-30s An over-budget bar is the warning colour with words ("Over by RM..."), never colour alone, and never exceeds
       the track; a goal at 0 and at 100% both render without NaN/Infinity

AC-31  Year: chart card stays; savings rate a stat tile; relief tags in a GroupCard
       Spec  brief `insights/year`
AC-31s The savings rate is labelled as computed, not a model's number; with no income it shows a dash/explanation, not
       NaN% or Infinity%

AC-32  Agent memory/research/usage: memory notes one card each with a Forget icon button labelled for screen readers;
       research briefs with status badges and finding counts; usage StatTiles and one stacked bar with legend
       Spec  brief `agent/*`
AC-32s Forget removes the note with Undo; usage cost is shown as the typed/tool-returned figure, labelled estimated
       where it is an estimate
       Spec  CLAUDE.md "Models draft, owner confirms, code computes"

AC-33  Settings: profile card on top; GroupCards of NavRows with states; Appearance shows a thumbnail
       Spec  brief `settings`

AC-34  Categories: Segmented Categories/Rules. Categories = grid of hue tiles, tap opens its sheet. Rules = each a
       sentence card ("When the payee has "ZUS" -> Drinks & desserts") with where it came from; one intro line
       Spec  brief `settings/categories`
AC-34s A rule that came from the user's answer says so with a date; deleting/editing a rule offers Undo

AC-35  Settings/claims: each scheme a one-sentence card with an edit icon; ESS one connection card with "Teach again"
       and "Forget password" behind ⋯
       Spec  brief `settings/claims`
AC-35s **No real claim values** anywhere: scheme names/caps/dates in fixtures and screens are made-up. "Forget password"
       confirms (destructive) and then ESS shows not connected
       Spec  CLAUDE.md handbook rule; D95, D110

AC-36  Capture: status card stays; setup a 3-step Steps checklist (Your apps check, Access cross, Keep running cross);
       "Captured on this phone" a NavRow. capture/apps|access|running: 1-line intro, "How it works" disclosure, Steps
       with `sm` buttons
       Spec  brief `settings/capture`, `capture/*`
AC-36s Messaging, SMS, email and social apps can never be chosen (not in the list or not selectable); OTP/TAC text is
       never shown unmasked
       Spec  D86; CLAUDE.md listener rule

AC-37  Settings/you: payday as ChoiceCards on one line each ("Last working day" doesn't wrap); sharing a switch row
       Spec  brief `settings/you`
AC-37s Choosing a day number outside 1-31 is rejected in words; the choice persists after reload

AC-38  Settings/email: the address in a card with a copy icon button; Gmail setup as Steps (collapsed once confirmed);
       the code card; Received a NavRow
       Spec  brief `settings/email`
AC-38s Copy gives feedback in words; the copy button has an accessible name

AC-39  Settings/sen: NavRows with tiles: Calendar ("Not connected" + Connect sm button), Memory "N notes", AI credit
       "RM3.80 this month"
       Spec  brief `settings/sen`

AC-40  Members: Invite in the app bar; seats meter ("2 of 20"); PersonRows with status badges. Member screen: header
       (avatar, email, status), access switches in one GroupCard, phone and usage cards, Remove at the foot in
       destructive
       Spec  brief `settings/members`; D52
AC-40s **The admin never sees a member's money**: the member screen and Members show AI usage and access only, no
       balance, payment, category or amount of money other than the AI cost. Remove asks/offers Undo
       Spec  CLAUDE.md; D52; flows `invite`

AC-41  Data: export card (icon, one line, button); backups NavRow with state. Account: About (version) and Account
       (Sign out, Delete account in destructive)
       Spec  brief `settings/data`, `settings/account`
AC-41s Delete account is behind a confirm dialog (cannot be undone); Sign out returns to sign-in

AC-42  Sign-in/first-run: centred, the look's avatar/wordmark large, one field, one main action
       Spec  brief `sign-in`, `first-run`
AC-42s A malformed email and a wrong 6-digit code each say what's wrong in words and keep what was typed; "Send a new
       code" works
       Spec  flows `first-run`

AC-43  New-look: card follows D130; animation not required (B14)
       Spec  brief `new-look`

## C. Cross-cutting

AC-44  Touch targets: every interactive control has a hit area >= 48x48 (the `tap` extension), >= 8 px apart, except
       full-width rows whose whole row is the target
       Spec  patterns §8; D129
AC-44s Icon-only buttons all carry an accessible name (no unnamed button/link on any redesigned screen)

AC-45  Sizes hierarchy: a heading is bigger than what it heads (title 22 > section 17 > body 15 > secondary 13 >
       caption 12); a card's own heading is section size
       Spec  patterns §2 Sizes
AC-45s No text smaller than 12 px; no button label other than 14 px

AC-46  Six looks, light and dark: no text clipped, no horizontal page overflow, contrast of text >= 4.5:1 (axe), every
       look supplies the new blocks (IconTile tints, ChoiceCards ring)
       Spec  patterns §8; brief "shown in /dev/gallery in every look"
AC-46s Text scaled to 1.5x does not clip amounts (they wrap, never truncate); a long merchant name truncates before the
       amount

AC-47  Money is integer sen everywhere; formatting `RM1,284.50`; money out has no sign, money in `+` and the money-in
       colour; warnings are money-warning with words
       Spec  patterns §3; CLAUDE.md
AC-47s `git diff main...HEAD` contains no floating-point arithmetic on money (`parseFloat`, `toFixed`, `Number(` on
       amounts, `/ 100` followed by display, `Math.round(x * 100)`) outside the money module; the repo's no-float
       lint rule passes

AC-48  One set of UI patterns: no screen invents its own list row/form/sheet/empty; `SettingsRow` and `DetailPage`
       are gone; shadcn files edited in place carry a `// Sen:` first-line note
       Spec  CLAUDE.md conventions; brief
AC-48s No new raw colour literals (hex/rgb/oklch) in screens or blocks (semantic tokens only)
       Spec  patterns §2

AC-49  Behaviour unchanged by restructuring: every B04 flow still works (Undo, tap-guard, offline banner,
       "Not synced yet", Sen's sheet, back gesture order). Core journeys `first-run`, `pay-new`, `scan-after` pass
       Spec  flows core journeys (D124)
AC-49s The Android back gesture closes the top sheet first, then goes back one screen; on a tab other than Home goes
       to Home

AC-50  KL timezone: a payment at 23:59 KL on the last day of a cycle/month and 00:01 the next lands in the right
       cycle/day with the browser set to another timezone (e.g. America/Los_Angeles); Home/Payments totals don't move
       Spec  CLAUDE.md conventions
AC-50s Browser tz = Asia/Kuala_Lumpur and = Pacific/Auckland give identical figures

AC-51  Offline: with the network off, a Review answer is kept, marked "Not synced yet" after 5 s, an offline banner is
       shown (not an error), and it syncs exactly once on reconnect
       Spec  patterns "Empty, loading, error, offline"; spec §5
AC-51s Reloading while offline keeps the queue; nothing is applied twice

AC-52  Production build has no dev tools and no secret
       Then  `pnpm build` output contains no `/dev/` gallery, no dev panel, no `sk-`/`AIza`/`secret`/`token=` strings
       Spec  CLAUDE.md "Secrets never ship in the app"; `pnpm build` rule
AC-52s `?scenario=` / `?state=` in the production build does not switch to fake scenarios

AC-53  Real financial data never enters the repo: the diff's fixtures contain only made-up names and amounts
       (`TAN WEI MING` stand-in), no real account numbers, no handbook text
       Spec  CLAUDE.md non-negotiables; `pnpm hygiene` passes
AC-53s `pnpm hygiene` fails when a `private/` path is tracked (control)

AC-54  Text scale 1.5x and reduced motion: StepPager and ChoiceCards settle with no animation under
       `prefers-reduced-motion`; nothing relies on hover
       Spec  patterns §8

---

# Run 2 (full run, written from the docs before the code was read)

Sources: `docs/briefs/B04-redesign.md` (the brief, B), `docs/ui/patterns.md` (P, §2 sizes, §7 blocks, §8
accessibility), `docs/screens.md` (S), `docs/flows.md` (F), `docs/decisions.md` D129 and D130, and
`CLAUDE.md`'s non-negotiables. Identifiers are `R2-AC-n` so they do not clash with run 1's. The slice has
no database and no API of its own (B05 builds the server), so phase 4 does not apply.
Viewport 390x844 (the brief's "fit" size); the phone preset is 412x915 where a test does not care.

## Sizes (D129)

R2-AC-1  Type sizes
         Given  any redesigned screen in any look, light or dark
         When   computed font sizes are read from the DOM
         Then   body text is 15 px, secondary 13, caption 12, a section heading 17 semibold, a screen title 22,
                and no visible text node is under 12 px
         Sad    a heading is never smaller than the text it heads (a section heading is >= the largest body text
                in its card), and no list shows 16 px body text any more
         Spec   P §2 Sizes, D129

R2-AC-2  Touch targets
         Given  every interactive control on a screen
         When   its hit area is measured, including the invisible extension
         Then   it is at least 48x48, though a chip is drawn 32 and a secondary or icon button 40
         Sad    the extension never covers a neighbouring control: elementFromPoint at the centre of every
                control returns that control or a descendant (e.g. Back is not covered by a disclosure)
         Spec   P §2, §8, D129

R2-AC-3  List rows
         Given  Payments, Accounts, Shared, Review and the settings groups
         When   a row is measured
         Then   it is at least 56 px high with a 32 px mark, and the amount is normal weight
         Sad    a long merchant truncates before the amount does; the amount is never truncated or wrapped mid-number
         Spec   D129, P §3, §7 Rows

R2-AC-4  Filters scroll in one row
         Given  Payments' filters, Review's answers, any chip row
         When   viewed with more chips than fit
         Then   the row is one line, scrolls sideways, and has no vertical scroll
         Sad    at a 1.5x font scale it still does not wrap into two rows
         Spec   P §2, D129

R2-AC-5  Names as people read them
         Given  a payee stored as SATE KAJANG HJ SAMURI, and one stored as ZUS or TNG
         When   it is shown in a list row, a detail header, Review
         Then   the first reads "Sate Kajang Hj Samuri" and the short words stay "ZUS" and "TNG"
         Sad    the stored text is unchanged (the detail's "What the bank said" shows the original capitals)
         Spec   P §2 Names, D129

## Structure (D130)

R2-AC-6  Home fits one screen
         Given  Home at 390x844 in each of the six looks, light and dark
         When   the page is loaded with the default scenario
         Then   the screen's scroll container has scrollHeight <= clientHeight (no scroll), with the figure,
                pace line, Sen's note and the tab bar all visible
         Sad    it still fits with a health warning, with the payday plan active, and with a card to act on;
                if it cannot, the content that overflows is named (not silently clipped)
         Spec   B Screen table (home), D130

R2-AC-7  Home content
         Given  Home
         Then   "Left until payday" is the large figure with "N days to go"; the payday plan is a one-line strip
                (icon, "Payday plan · 2 of 3", chevron) and only while the plan is active; Sen's note is clamped to
                2 lines with "More"; the sparkline is 64 px tall
         Sad    with no active plan there is no strip; below zero the figure reads "Over by RM..." in words;
                before the first salary it reads "Spent since you started"; without capture there is no balance row
         Spec   B, S home, P §3

R2-AC-8  Review grouped by kind
         Given  Review with several kinds of item
         Then   items are grouped under icon headers with a count ("Categories · 8", "Splits", "Checks",
                "New wording"); each item is a card with amount and payee semibold, one muted line, and answers
                as chip-size buttons (32 drawn) in one sideways row, at most three plus "Other..."; Sen's pick has a
                sparkle and an accent outline; "Apply all" is a compact banner with an sm button
         Sad    nothing to do shows "Nothing needs you."; answering clears the card and a toast offers Undo, and
                Undo brings it back; two taps within half a second change one thing only
         Spec   B review row, P §7 Rows, S review

R2-AC-9  Insights is a pager
         Given  Insights
         Then   named steps on top (On track, Budgets, Subscriptions, Goals, Year), "2 of 5"-style position,
                one full-width card at a time with no peek of the next; a tap on a step moves to it; a swipe moves
                one card; the cycle picker stays above
         Sad    a card with no data is not shown (and the count follows); the pager is focusable by keyboard and a
                step has an accessible name; "Ask Sen about this" opens Sen with that question
         Spec   B insights, S insights, P §7 StepPager

R2-AC-10 More shows state
         Given  More
         Then   a GroupCard of NavRows, each with an icon tile, and its state: Payments count, Shared
                "RM24.40 owed to you", Accounts count, Claims "2 to submit", Settings
         Sad    without capture there is no Accounts row; with claims off there is no Claims row (D52)
         Spec   B more, S more, S rules

R2-AC-11 Cycle sheet
         Given  the cycle sheet from the large figure
         Then   StatTiles for in, spent and left, with left emphasised; the estimate at payday is a card with an
                icon and is labelled as an estimate
         Sad    the estimate is never in the same figure as a fact (no prediction mixed with a fact); counting by
                month reads "month", not "cycle"
         Spec   B cycle, S cycle, CLAUDE.md prediction rule

R2-AC-12 Payday
         Given  payday
         Then   a segmented progress bar "Step 1 of 4"; claims in a GroupCard with icons; Undo as a ghost sm
                button; the tab bar is hidden; every step has Skip
         Sad    a skipped step waits in Review as a skipped payday step
         Spec   B payday, S payday, F payday

R2-AC-13 Skipped notifications
         Then   one card each: the app's tile and time, title semibold, text clamped to 2 lines, "This was a payment"
                as a chip with an icon
         Sad    with none, an Empty state (icon, title, one line); tapping "This was a payment" books one payment,
                with Undo, and a second tap does not book another
         Spec   B skipped, S skipped

R2-AC-14 Manual entry
         Given  manual
         Then   the amount is large and centred; categories are a 4-column grid of icon tiles; "Paid from" and
                "When" are NavRows in one card; "More details" is a ghost disclosure; the tab bar is hidden
         Sad    the amount is parsed as text into sen: "19.99" stores 1999 and "0.10" 10; "0", "", "abc", "1.234",
                "1e3", "-5" and "12.5.5" are rejected with a message and nothing is saved; Save offers Undo
         Spec   B manual, S manual, P Forms, CLAUDE.md money rule

R2-AC-15 Scan
         Then   three tips as icon rows; "Take a photo" is the one main action (48), "From gallery" secondary,
                "Add by hand" a link
         Sad    in a browser the file picker path leads to crop; cancelling leaves nothing saved
         Spec   B scan, S scan

R2-AC-16 Receipt screens
         Given  confirm, receipt, crop, reading
         Then   the image in a card on top; items in a GroupCard; totals in a FactGrid; one main action; item
                prices add up exactly to the total and the check says so; "RM64.13 / 3 = RM21.38 a person" style
                meal average is integer arithmetic
         Sad    a missing receipt, unreadable image or empty state uses the Empty block with an icon, a title, one
                line and one button; items that do not add up are marked in place, not hidden; the same file twice
                is "Already added"
         Spec   B confirm..., S confirm, F scan-after

R2-AC-17 Payments
         Then   rows keep D129 sizes; the category mark is a hue-tinted icon tile; the search field has a search
                icon; day headers show the KL date and the day's spending and stick while scrolling
         Sad    a search with no hits shows an Empty state; a transfer is one row ("Ryt -> TNG eWallet"); marks
                (receipt, split, Not synced yet) have words, not colour alone
         Spec   B payments, S payments, P Rows

R2-AC-18 Accounts
         Then   the total first; accounts in a GroupCard with bank-initial tiles and a "Checked 1 Oct" or
                "Not checked" badge; "Elsewhere" in a muted card with no balances
         Sad    without capture the screen is not reachable from More
         Spec   B accounts, S accounts

R2-AC-19 Account
         Then   HeaderCard with the balance, a FactGrid (opening balance, fed by, last checked), an ActionBar
                (Check, Payments, Ask Sen), recent payments in a card
         Sad    each ActionBar button has a caption and an accessible name; the facts are not buttons
         Spec   B account

R2-AC-20 Balance check
         Then   one card per account: tile, name, "Sen has RM... " muted; input; "Matches" chip with a tick; the
                difference live; Save books each difference as Unaccounted
         Sad    the figure is parsed as text into sen (same rejected set as R2-AC-14); a matching figure books
                nothing; the screen hides the tab bar
         Spec   B balance-check, S accounts

R2-AC-21 Payment detail (txn)
         Then   HeaderCard (category tile, payee, amount, "Today 19:58 · Ryt Bank", "From Ryt Bank's
                notification"); FactGrid with Category (tappable chip with icon), Your share, Note; ActionBar
                Receipt, Split, Ask Sen and a menu with "No receipt", "Mark as...", "Delete"; the receipt's state
                as its own small card
         Sad    Delete (and Mark as, No receipt) act at once and show a toast with Undo, and Undo restores; the
                amount has a Copy button; facts (non-tappable) are not buttons and tappable ones show a chevron;
                changing a rule's category asks "Just this one" or "From now on"
         Spec   B txn, S txn, P Detail page, F fix

R2-AC-22 Shared bills
         Then   Segmented Open/Settled; each bill a card with a stack of avatars, a status badge, and "you owe" or
                "owed to you" in words and colour
         Sad    an empty tab shows Empty; colour is never the only signal
         Spec   B shared, S shared

R2-AC-23 Split
         Then   header and status card stay (words first: "Still changing", "Final", "Waiting for ..."); people as
                PersonRows in one card; the QR lives in the Share sheet, not on the page; items in a GroupCard
         Sad    final = ticks read-only; a stuck split (someone left, items unclaimed) offers "Lock without
                waiting"; the page never lists people outside a split (no people list, D64)
         Spec   B split, S split, F split-mine, split-stuck

R2-AC-24 Public split
         Then   a header card with the payer's avatar; items as a check list in one card; a sticky "I'm done" is
                the main action; no tab bar; no login
         Sad    a closed link shows "This split is closed" and nothing else; after the lock ticks are read-only
                with "To change a tick, ask ..."; the payer's QR and "Pay RM..." appear only once final
         Spec   B split-public, S split-public

R2-AC-25 Claims
         Then   each month a summary card ("September · 2 to submit · RM152 of RM200" with a bar) holding its
                claims with status icons; "Send to ESS" the one main action (shell only); "Download pack" in the
                app bar; no stand-in text
         Sad    claims off: not reachable; no real claim values anywhere in fixtures or shots (the amounts are
                made up)
         Spec   B claims, S claims, CLAUDE.md claim values rule

R2-AC-26 Claim
         Then   a stepper Draft -> Ready -> Sent -> Approved -> Paid; evidence as a thumbnail grid; FactGrid
                (amount, cap, due); each value has Copy; "Submitted" then Approved with the approved amount
         Sad    missing evidence says how to add it; the current stepper step is marked by more than colour
         Spec   B claim, S claims

R2-AC-27 Budgets, subscriptions, goals, year
         Then   budget cards with category tile, bar and status badge, "Add a budget" in the app bar;
                subscriptions as compact cards (tile, name, per month, next renewal) with history collapsed to
                "N matched" and expandable; goal cards with a progress ring, "RM2,950 of RM6,000", "needs RM610 a
                cycle"; goal screen with a large ring, FactGrid and contributions in a card; the year with the
                chart card, the savings rate as a stat tile, relief tags in a GroupCard
         Sad    a budget at risk uses the warning colour with words (e.g. "Over by RM..."); every progress bar has
                an accessible name and a value; an empty list uses Empty; a feasibility estimate is labelled as one
         Spec   B rows, S budgets..., P §7 Progress

R2-AC-28 Sen's pages
         Then   memory as one card each with an icon and an icon button "Forget" with an accessible label;
                research as cards with status badges and a count of findings; usage with StatTiles and one stacked
                bar with a legend
         Sad    empty memory/research use Empty; Forget acts with Undo; a research draft stays unconfirmed
                until the figures are confirmed
         Spec   B agent/*, S sen

R2-AC-29 Settings
         Then   a profile card on top (avatar, name, email); GroupCards of NavRows with states: Appearance shows
                a thumbnail of the look, Capture "4 apps · running", Claims "2 schemes", Sen "RM3.80 this month"
         Sad    sections hidden by switches (no capture, claims off, agent off, non-admin Members) are absent, not
                disabled (D52)
         Spec   B settings, S Settings

R2-AC-30 Appearance
         Then   Mode as Segmented with Monitor, Sun, Moon icons; "Changes each quarter" a switch card with the
                next change date; looks as ChoiceCards, two columns, each a live mini preview in that look; the
                chosen one has a ring and a tick
         Sad    choosing a look applies at once and survives a reload; pinning a look turns the quarterly switch
                off; choosing Dark/Light survives a reload; reduced motion settles the previews
         Spec   B appearance, S Settings, P §9

R2-AC-31 Categories and rules
         Then   Segmented Categories/Rules; Categories: a grid of hue tiles with names, a tap opens its sheet;
                Rules: sentence cards ("When the payee has "ZUS" -> Drinks & desserts") with origin ("from your
                answer, 3 Oct"); one intro line
         Sad    no rules shows Empty; deleting/editing a rule offers Undo; the hue is decoration (the name carries
                meaning)
         Spec   B categories, P §7 item 10

R2-AC-32 Claims settings
         Then   each scheme a card that reads as one sentence with an edit icon; ESS one connection card (signed
                in, payslip steps recorded, sender address) with "Teach again" and "Forget password" behind a menu
         Sad    forgetting asks or offers Undo as the patterns say (destructive stays behind the menu); no real
                claim values (non-negotiable)
         Spec   B settings/claims, S Settings

R2-AC-33 Capture screens
         Then   settings/capture: status card, 3-step checklist (Your apps, Access, Keep running) with ticks, and
                "Captured on this phone" as a NavRow; capture/apps, access, running: one intro line, "How it works"
                disclosure, Steps cards with sm buttons, status card on top
         Sad    capture off shows the fix; messaging, SMS, email and social apps can never be chosen in the picker
                (D86); the raw captured rows mask digits (D121)
         Spec   B capture, P Raw notification row, CLAUDE.md listener rule

R2-AC-34 You, email, Sen settings, data, account
         Then   payday as ChoiceCards with one line each (so "Last working day" does not wrap); sharing as a switch
                row; email address in a card with an inline copy icon button; Gmail setup as Steps, collapsed once
                confirmed; Sen's NavRows with tiles (Calendar "Not connected" with sm Connect, Memory "4 notes", AI
                credit); export card; account groups About and Account with Sign out and Delete account in
                destructive
         Sad    Delete account is destructive-styled and asks (a dialog, cannot be undone); a disabled switch says
                why in its line
         Spec   B, S Settings

R2-AC-35 Members
         Then   Invite in the app bar; seat meter ("2 of 20"); PersonRows with status badges; a member opens a
                pushed screen (not a sheet) with header, access switches in one GroupCard, phone and usage cards,
                and Remove at the foot in destructive
         Sad    Remove is behind confirmation or Undo; non-admins never see Members; the admin sees no member's money
         Spec   B members, CLAUDE.md RLS rule (D52)

R2-AC-36 Outside the tabs
         Then   sign-in and first-run: centred, the look's avatar or wordmark large above, one field, one main
                action; new-look: the card follows D130 (name, avatar still, Keep it main, Go back, switch)
         Sad    wrong or expired code says so and offers "Send a new code"; an unknown email says "Sen is
                invitation-only"; the new-look placeholder is still (no animation here)
         Spec   B, S sign-in, first-run, new-look

## The cross-cutting rules

R2-AC-37 Information and actions never look alike
         Then   no fact-grid cell, header or status line is exposed as a button unless it is tappable (and then it
                shows a chevron); every action is an icon button with a caption or one button; destructive and rare
                actions are behind a menu
         Sad    pick three screens at random: a fact and an action cannot be confused (visual check on shots)
         Spec   B rule 4, P §7 item 4

R2-AC-38 Icons lead destinations and actions
         Then   every NavRow/action leads with an icon tile (16 px icon on a 32 px square); information rows have
                none
         Sad    a row that opens nothing has no tile and no chevron
         Spec   B rule 3, P §7 item 3

R2-AC-39 Cards, not hairline lists
         Then   rows sit in rounded cards with a small label above; there are no full-bleed dividers outside the
                long lists
         Spec   B rule 2, P §7 item 2

R2-AC-40 Empty, loading, error
         Given  every screen in its empty, loading and error variants (?state=)
         Then   empty = Empty block (icon, title, one line, one button); loading = a skeleton shaped like the
                content; error = what happened and what to do, with a button
         Sad    never bare text plus a button; never a full-screen spinner
         Spec   B rule 9, P §7

R2-AC-41 Accessibility
         Then   no axe violation of serious/critical impact; contrast >= 4.5:1 for text and 3:1 for icons in every
                look light and dark; icon-only buttons have aria-label; progress bars are named with a value;
                the large figure reads as label and amount; dialogs and sheets trap focus and Back closes them
         Sad    at a 1.5x text scale nothing clips and amounts wrap before they truncate
         Spec   P §8

R2-AC-42 All six looks, both modes
         Then   every screen renders in all six looks and both modes with no horizontal overflow, no overlapped
                text, and the look's tab bar
         Sad    a screen that only breaks in one look (e.g. Instrument or Firefly) is a finding
         Spec   P §1, D77 "only materials change"

R2-AC-43 Tab bar
         Then   the tab bar shows on the five tabs and the screens pushed from them, and hides on first-run,
                payday, confirm, manual, balance-check, scan and split-public; the active tab has
                aria-current="page"
         Sad    the Sen button shows only on the five tab screens and never covers the last row
         Spec   P §6, S rules

R2-AC-44 Money is integer sen
         Then   no float arithmetic on money is introduced by the diff (grep for parseFloat, toFixed, Number(),
                Math.round(* 100), * 100, / 100, + 0.x on money paths in the diff); the no-float lint rule is on
         Sad    each hit is a Blocker until shown to be safe (display of a percent or pixel value is safe)
         Spec   CLAUDE.md, P §3

R2-AC-45 Dates and time zone
         Given  the browser set to America/Los_Angeles (or any non-KL zone)
         Then   day headers, "Today 19:58", cycle days and "days to go" are the same as in KL
         Sad    a payment at 23:59 KL on the last day of a cycle belongs to that cycle
         Spec   CLAUDE.md conventions, P §7 Rows

R2-AC-46 Offline
         Then   offline shows a banner, not an error; rows not synced show "Not synced yet"
                only while offline or after 5 s; what needs the network says so in place ("Sen needs a connection")
         Sad    reloading offline does not lose a draft
         Spec   P §7 Empty/offline, F offline

R2-AC-47 The production build
         Then   a production build has no dev panel, no ?scenario= or ?state=, no simulator; the bundle contains no
                secret; CSP holds (no inline-script violation in the console); the app is own-site only
         Sad    a hostile query string (?scenario=<script>, ?state=../../) never breaks or injects
         Spec   CLAUDE.md, spec §17

R2-AC-48 Data hygiene
         Then   `pnpm hygiene` passes; the diff contains no real notification text, balances, account numbers, or
                claim values; fixtures use made-up names (Wei Ming, Mei, Ali)
         Sad    any digit run that looks like a real account number or phone number in fixtures/screens is flagged
         Spec   CLAUDE.md

R2-AC-49 shadcn first
         Then   every customised file in components/ui has a "// Sen:" note on its first line; blocks are
                compositions of shadcn parts, not parallel hand-rolled versions
         Spec   CLAUDE.md conventions

R2-AC-50 Reduced motion and no decoration
         Then   with prefers-reduced-motion, pager scrolls, sheet entries and previews settle without animation;
                nothing loops
         Spec   P §8

R2-AC-51 Core journeys still work
         Then   first-run, pay-new and scan-after (F, core) complete on the redesigned screens (see flows)
         Sad    each one's listed failure (wrong code, swiped prompt, reading fails, same file twice) fails the right way
         Spec   F, D124
