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

**QA run 3 said *fix first*; its fixes and the owner's list are done and pushed** (13 Oct):
decisions D132–D136, spec §10/§11/§15, B27's note, and the ledger's "Run 3" section
(`qa/B04-redesign/ledger.md`). Run 3's record: `report-run3.md`, `results-run3.json`, published at
https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa. The e2e suite follows the deliberate changes and
has 14 new pins, each shown failing under its break (e71bd6d; full e2e 825 passed).

**QA run 4 said *fix first*** (1 Major, 6 Minor, 4 Notes, no Blocker): `qa/B04-redesign/report.md`,
published at the same URL (version 4). Its fixes are in 4de5471, with the ledger's "Run 4" section:
tier 2, scoped to money entry, subscriptions and goals added by hand, and the buttons that open Sen.

### What to do next
1. The full `pnpm e2e` on 4de5471 is running (log in the scratchpad); it must pass before step 2.
2. **Resume run 4's reviewer** (agent `a55f117fed5c8972e`, if this session still has it; otherwise a
   fresh `qa-reviewer` in scoped mode reading the committed `acceptance.md`, `flows.md`,
   `results.json`) with the three areas, findings 1–5, 7, 10 and the range
   0110260..4de5471. Nothing about how they were fixed.
3. Clean → `cd /home/user && node Sen/scripts/usage.mjs --log B04-redesign`, PR *B04 · Redesign*.
4. **Then, before B05: D137's QA tooling** (diff-driven QA: aria snapshots of every screen on the
   golden scenario, behaviour in one look, pixel diff against `main` in all 12, the reviewer gets
   only the changed screens), plus its quality half: the eyes pass, `qa/escapes.md`, scripted visual
   checks, and the reviewer spawning its own helpers (add `Agent` to its tools). Own branch and brief;
   update the `qa` skill to match.

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
