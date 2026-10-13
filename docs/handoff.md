# Handoff

## Where things stand (13 Oct)

**B04 and its review fixes are merged** (ztsia/Sen#11, ztsia/Sen#12, D129's size hierarchy).
On the phone the owner found the main tabs fine, but most other screens plain lists of text, where
facts and actions look alike. **D130 decides the redesign:** calm, card-based screens.
Its brief is `docs/briefs/B04-redesign.md`, branch `B04/redesign`, PR *B04 · Redesign*.
**B05** (`docs/briefs/B05-server.md`) waits until it's merged.

**Phases 1 and 2 are done and pushed** (13 Oct). D130's blocks, `patterns.md` §7, and every screen
rebuilt in batches A–E; `SettingsRow` and `DetailPage` are gone; `apps/web/scripts/shots.mjs` takes
screenshots. The e2e tests follow the redesign, and the product bugs the run found are fixed (avatar
contrast, unnamed progress bars, the pager's focus, stat tiles truncating, two disclosures whose
48 px extension covered Back, Subscriptions' 40 px toggle). Last run, Minted and Copper: 308 of 312,
the 4 being that toggle, since fixed.

**QA run 3 is done: *fix first*** (`qa/B04-redesign/report.md`, published at
https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa): 3 Major, 5 Minor, 4 Note, no Blocker. Runs 1 and
2's fixes hold. **Waiting for the owner's approval** before any fix: run 3's findings and the owner's
list below go in one batch (owner, 13 Oct), then one fresh full QA run (run 4).

### The owner's list (13 Oct), decided; add D132–D135 to `docs/decisions.md` when work starts
1. Cycle sheet: figures never wrap (`StatTiles`, `blocks/facts.tsx`): at most 2 tiles across.
2. **D132, money entry like bank apps:** digits only, each enters from the right (1250 → 12.50), the
   dot and letters ignored, always 2 decimals, number pad, backspace drops a digit. `MoneyInput`,
   every caller. Main session (non-negotiable territory), with tests.
3. Scan tab in a browser: a tap opens the camera at once, long-press the menu (D69 already says so).
   ML Kit is native only (B15) and does its own edges and enhancement; our 4-corner crop is browser-only.
4. **D134:** Add forms for subscriptions and goals, like Add a budget.
5. **D133, goals sit in their own account:** each names its account or pocket (shared allowed); the
   payday plan says *move RMx to …*; a notification ticks the move, or **a hand tick** (the owner's
   Ryt pocket moves have no notification) books the transfer between the two accounts, counts it,
   amount editable, deduped by plan step; a later notification matches it. Spec §10, §15
   `goals.account_id`. Here only the form's field; the rest is the goals slice's.
6. **D135, Sen opens with a prefill:** `setSenOpen(true, draft)`. Claim schemes get *Add* (*I want to
   add a claim scheme: *) and edit (*Change my … scheme: *); every set-up *Ask Sen* likewise.
7. Not now: suggestion pills that know the screen Sen opened from → add to B27 in `modules.md`.

### What to do next
1. On the owner's approval: decisions and spec first, then fixes by who makes each (`qa` skill),
   with a ledger "Run 3" section. Run 3's reviewer was a383ab0d19f4f3335 (gone after rotation).
2. Rename `report.md`/`results.json` to `-run3`, Haiku sweep, then a **new** `qa-reviewer`.
3. Then `cd /home/user && node Sen/scripts/usage.mjs --log B04-redesign` and the PR *B04 · Redesign*.
4. The published artifact holds old runs' screenshots; it allows 512 files, so null old ones on publish.

### Decided with the owner (13 Oct; all recommended options taken)
- **Home fits one screen** at 390×844 by compressing: the payday plan becomes a one-line strip, the
  chart gets shorter, and Sen's note is clamped. A test asserts no scroll.
- **Insights is one card at a time:** sideways swipe with named steps on top.
- **Order:** phase 1 reference screens checked on the phone, then the batches.
- **This redesign comes before B05,** on its own branch.
- **48 px stays the touch target**, invisible; what's drawn follows D129's levels. Review's answer
  chips are still 40 px Toggles: make them `chip` size.
- **The owner asked for the screens they didn't mention too:** all are in the brief's table.
- **The new-look reveal's animation is B14's** (`patterns.md` §9). Here only its card follows D130;
  the skeleton keeps a still placeholder.

### Open with the owner
- `claude_skills` branch `workflow/brain-and-cards` (D130's uiux rules, D131's model principle, the
  implementer on Haiku at high, the `brief` skill) is pushed; the owner opens or asks for its PR.

## Don't argue again
- D129's levels and the 48 px target rule; D130's card-based structure; D131, Opus decides and briefs
  completely, Haiku at high by default (owner's calls).
- Deploys only by merge (D122); the review build follows the `review` branch (D115).
