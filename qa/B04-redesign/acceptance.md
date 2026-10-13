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
