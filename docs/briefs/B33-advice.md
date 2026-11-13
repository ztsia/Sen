# B33 · Sen's advice and lessons (P6b)

**Stage 7 · Sen** · after: B32 · next: B34

## Goal

Sen's three advisory skills work from confirmed products and real spending, with code doing every
comparison:
- a rate watcher for savings
- a product advisor (is a card worth it, and which to use for what)
- *money left on the table* once a cycle

Sen also learns from its own shortfalls. A lesson it writes is shared, may change a skill, and only
goes live if Sen's test questions score at least as well as before. The owner can see it and undo it.

## Read first

- `spec_v2.md`:
  - §12.1: *Research and optimise* (all of it)
  - §12.3: `compare_products`, `get_left_on_table`, `note_lesson` and the *Compare* part in *What Sen
    answers with*
  - §12.5: the skills `rate-watcher`, `product-advisor` and `left-on-table`, *A research skill is a
    goal for `research`*, and the `lesson-folder` subagent
  - §12.6: the lesson folder's job
  - §12.9: *Shared lessons* and *Gaps*
  - §9.6: *Models, lessons and gaps*
  - §15: `agent_lessons`, `skill_lessons` and `agent_gaps`; *Key decisions* (the two app-wide
    settings)
  - §16: `GET /admin/lessons`, `POST /admin/lessons/:id/revert` and `GET /admin/gaps`
  - §7: a new card is a tracked account, and paying its bill is a transfer
- Decisions: D39, D40, D152, D153.
- `docs/screens.md`: `sen` (the comparison's card) and Settings → *Models* (`settings/models`).
- `docs/ui/patterns.md`: §7, *Sen's chat*, and §4 (the card anatomy).
- B32's `research(goal)`, B10 · Models in admin's resolver and *Test*, and the eval set from B27. Draw
  the comparison card to the chat's approved design page (`docs/modules.md`, *Three design pages*);
  don't design as you build.
- Skill: `database` (`SECURITY DEFINER` functions, rows owned by the admin).

## Builds

### Advice
- **`rate-watcher`,** a goal for `research`:
  - where to keep savings (Ryt, other digital banks, GO+, fixed-deposit promos)
  - researched through B32, with code comparing confirmed figures against the real balances, caps
    and promo end dates
  - a monthly re-check in the morning job that tells the owner when something changes
- **`product-advisor` with `compare_products(kind)`,** a goal for `research`, and deterministic in
  its comparison: spending by category over the last 12 cycles × each confirmed product's rates,
  within its caps, minus its fees.
  - It recommends a credit card only on the condition that the bill is paid in full every month, and
    then watches that it is.
  - Once products are held, it says which to use for each kind of spending.
  - Signing up is the owner's to do.
- **`left-on-table` with `get_left_on_table(cycle)`,** deterministic, once a cycle, in ringgit, each
  with its fix:
  - cashback missed by paying the wrong way (from confirmed products)
  - interest lost on idle balances
  - fees paid
- **The *Compare* part,** from `compare_products(kind)`: products side by side with the owner's own
  numbers. Its card is drawn here, in all six looks.

### Shared lessons (§12.9)
- **`note_lesson`:** when a tool falls short or the owner corrects Sen, it writes a lesson with no
  names or amounts (`agent_lessons`), as one of its own things, with a *Saved* line and *Undo*. Code
  checks it as it checks memory.
- **The `lesson-folder` subagent,** on a stronger model (its own job in admin), folds lessons into a
  skill's lessons section, kept as data (`skill_lessons`), not in the repo. It runs in the Sunday
  evening job.
- **Behind the eval gate:** a folded lesson goes live only if Sen's test questions score at least as
  well as before. One that scores lower is held, never live.
- **Rows owned by the admin:** `skill_lessons` belongs to the admin under the same RLS as any other
  table, and every request reads the live ones through the one narrow `SECURITY DEFINER` function
  that returns the app-wide settings and nothing else.
- **Admin's list of lessons,** on `settings/models`, below the jobs:
  - each skill's folded lessons, with *Undo* (`GET /admin/lessons`,
    `POST /admin/lessons/:id/revert`)
  - the shapes of questions Sen couldn't answer, never anyone's words or figures
    (`GET /admin/gaps`)

## Done when

1. `compare_products` and `get_left_on_table` pass SQL tests on hand-checked fixtures: caps, fees,
   and a card that loses after fees.
2. Each skill answers using code's figures only, with the figure check passing.
3. **A folded lesson that lowers the test score doesn't go live,** and one that holds the score does.
   *Undo* in admin puts the earlier version back.
4. A lesson and a gap carry no names or amounts, and only the admin reads the app-wide rows, through
   the narrow function (pgTAP).
5. **On the phone:** each skill answers a real question from confirmed products.

## On your phone

- [ ] Ask Sen *Is a cashback card worth it for me?* and read the comparison.
- [ ] In *Models*, read the lessons and the gaps. Undo a lesson.
