# The polish pass: what needs the owner

The seven plans (12 Nov) hold 187 findings: 26 P1, 105 P2 and 56 P3, with a shared problem counted in
each plan that saw it. `components.md` holds each shared fix once. These calls bend a decision, a
pattern or the screen map, so they're the owner's. Each has a recommendation; nothing is built until
the owner says go. The re-spec (D152–D154) answered three of them, marked below; twelve are left.

| # | Question | Raised by | Recommended |
|---|---|---|---|
| 1 | **Minted's spaced amounts** (*RM1 , 234 . 56*). Proportional figures wherever an amount stands alone or sits in a sentence, tabular only in columns (what patterns §3 already says), or keep tabular everywhere and put each separator in a span that undoes the gap? | records 1, components 1, home 2, insights 1, start 1 | **Proportional outside columns.** It's what §3 says, needs no special markup, and fixes every font, Line's milder gap too |
| 2 | **Back arrow on the tab roots** (Review, Insights, More). Remove it, bending patterns §7's wording? | start 6, insights, components | **Remove.** A tab root has nowhere to go back to; the back gesture still goes to Home (D83) |
| 3 | **Warning colour.** It's red in every look, so health bands, *Not confirmed* and warning badges read as danger beside the amber money warning. Make warning amber in every look's tokens? | home 22, records, components | **Amber.** Red stays for removals and wrong fields (patterns §2) |
| 4 | **Row dividers** in grouped cards: show them everywhere, inset to where the text starts (what §8 says), or drop them everywhere and change §8? | settings 10, components | **Show, inset** |
| 5 | **Review's answer chips**: keep wrapping onto two rows (QA's earlier call), with the waiting receipt's answers shortened to *Attach…*, *Evidence only*, *Enter it*? | components, review 29 | **Keep the wrap, shorten the words** (full words stay in TalkBack labels) |
| 6 | *Answered by D152:* **Insights' card order**: put each card's answer straight under its question, above the chart (D73 says question, chart, takeaway)? | insights 5 | **Overtaken.** A card is now its title, the figure or takeaway, its change, the view, then *as of* (patterns §4), so the answer sits above the chart |
| 7 | *Answered by D152:* **The goal ring** on `goals` and `goal`, which patterns §4 doesn't name: add it to the patterns, or use the bar there too? | insights | **Overtaken.** The ring is one of the chart's thirteen kinds (spec §9.8) |
| 8 | **The cycle sheet** as rows that add up in a grouped card, instead of `StatTiles` (patterns §7)? | home 17 | **Rows that add up** |
| 9 | **Estimates in whole ringgit** (*about RM740*), against §3's *always two decimals*? | home 21 | **Whole ringgit, only where the words say *about*** |
| 10 | **Who you are** on the Settings hub: the first of *your names as banks print them*, else the email, or a display name of its own (a new field)? | settings | **The bank name**, no new field |
| 11 | **Delete account**, which only says *not yet*: hide it until it works? | settings | **Hide** |
| 12 | *Answered by D152:* **A research brief tapped**: open Sen's chat at that draft? | start | **Overtaken.** It opens Sen's chat at that brief, shown as findings from the web (`docs/screens.md`, `sen`) |
| 13 | **When on manual entry**: make it choosable (*Now*, *Yesterday*, *Pick a day*)? | review 2 | **Choosable** |
| 14 | **Shared bills' rows**: lead with what moves for you (*you owe*, *owed to you*) instead of the bill's total? | records 7 | **What moves for you** |
| 15 | **Scope, not polish:** nothing can edit or remove a goal or a subscription, though D62 says they're edited on their screens. A line in the slice map (B21, B22)? | insights | **Yes**, note it there |

Once these are answered, the main session writes `docs/plans/polish.md`: shared fixes first (the
`components.md` units), then each area's screens, each unit with its files, checks and model.
