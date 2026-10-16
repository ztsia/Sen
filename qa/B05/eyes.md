# B05 · eyes pass, run 1

The `qa-eyes` helper couldn't be spawned: this reviewer ran without the Agent tool. So the reviewer
looked at the diff report's one changed entry itself, in four of its twelve pairs (Minted light, Copper
dark, Line light, and the base/head of Minted light). This is weaker than the Opus eyes pass the skill
asks for. A later run should repeat it.

Diff report: 87 entries; 1 tree changed (`settings/account`), 0 new, 0 removed; 1 entry with pixels
changed (12 pairs); 1 unexplored (`reading`, unchanged since B04); 0 check findings.

## settings/account

Tree change: `+ text: Email weiming@example.com`, `+ button "Sign out everywhere"`. The brief and
screens.md (Account: *your email, Sign out, Sign out everywhere*) call for both. Nothing else moved.

| Question | Answer |
|---|---|
| Is every change one the brief calls for? | Yes: the email row and *Sign out everywhere* |
| Is anything unreadable, clipped or overlapping in the pairs looked at? | No. Copper dark and Line light draw the destructive tint and its icon tile legibly |
| Does it follow patterns.md? | **No, a little** (finding 9). The Email row is information yet leads with a tile. *Sign out* and *Sign out everywhere* are actions, but they're drawn as chevron NavRows, so they read as places to go |
| Verdict | **wrong** (Minor): the pattern drift above. The change itself is right |

Not looked at: a long email in the value slot (whether it truncates or wraps), and the eight other pairs.

# Run 2 (full, 15–16 Oct)

The `qa-eyes` helper couldn't be spawned again: this reviewer had no Agent tool. The reviewer looked at
the one changed entry itself, this time in **all twelve** look-and-mode pairs (head images as two
contact sheets, plus Minted light at full size from QA's own walk).

Diff report: 87 entries; 1 tree changed (`settings/account`), 0 new, 0 removed; 1 entry with pixels
changed (12 pairs); 1 unexplored (`reading`, unchanged since B04); 0 check findings.

## settings/account

Tree change: `+ text: Email weiming@example.com`, `+ button "Sign out everywhere"`, as the brief and
screens.md (Account: *your email, Sign out, Sign out everywhere*) ask.

| Question | Answer |
|---|---|
| Is every change one the brief calls for? | Yes: the email row and *Sign out everywhere* |
| Did run 1's drift get fixed? | Yes for the Email row: information, now without a tile, value on the right. The chevron action rows were kept on purpose (ledger, like B04's approved *Delete account*) |
| Anything unreadable, clipped or overlapping in the twelve pairs? | No, with Wei Ming's short address. The destructive tint and its tile read in every look, Copper dark and Line dark included |
| A long email? | **Clipped** (QA's FLOW-26, finding 29): a 70-character address runs past the card's edge and its middle is lost. The catalogue's fixture is short, so the scripted clip check can't see it |
| Verdict | **right** for what the diff shows; **look again** at long values in the Email row (finding 29, Minor) |

# Run 3 (scoped, 16 Oct)

The diff run shows 5 changed entries:
- `settings/account`: as in run 2.
- `sign-in`, `first-run`, `sign-in@invited` and `first-run@without-capture`: pixels only, trees unchanged.

The reviewer looked at sign-in in Minted light (base and head) and Copper dark, and at first-run in Line light. The change is the email field drawn focused, in each look's ring colour, as finding 24's fix (patterns §7 Forms) calls for. Nothing is clipped, overlapping or unreadable.

**Verdict:** right.
