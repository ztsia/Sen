# Handoff

Rewritten 8 Oct 2026 by the session that closed `S3` and published this repo. The protocol is in
`CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **Sen is published:** this repo, `ztsia/Sen`, is one clean snapshot of the private design repo.
  Every slice is built here from now on.
- **The design track is done.** The slice map is `docs/modules.md`, with one brief per slice in
  `docs/briefs/` (D111).
- **Next: B01 · Design system and the six looks.** Its brief is the whole start.

## Decided at the end of the design track

- **D111, the map.** Forty slices, built one at a time:
  - claims by hand (B24–B26) come before Sen, and the ESS adapter (B34–B36) after it
  - the next slice waits only for the owner's merge
  - the shell (B02) comes second, so the phone soaks while the skeleton is built
- **D112:** a new merchant's two category guesses come from a cheap model, the first time only,
  waiting at most 5 seconds; offline or late, from the person's own history. The notification keeps
  its buttons, and late guesses replace history's in *Review* (B12).
- **D113:** one look roster for everyone (B14).
- **The handoff is this one file,** rewritten every session, finished or not. A slice can span
  sessions: see *Session rotation*.

## Open with the owner

- **B01 needs, first:**
  - a Vercel project linked to `ztsia/Sen`
  - the `DENYLIST` Actions secret
  - secret scanning and push protection turned on (`docs/local.md`)
- **The laptop ESS capture** (D110) hadn't been done. It matters only for B34; until then, Q29 stays
  open.
- **The other four defaults** in the map's *Defaults the briefs chose* stand unless the owner changes
  them.

## Don't reopen

D1–D113, unless the owner raises one. In particular:
- the slice order (D111)
- no screen mockups (D84)
- ESS on the phone with a saved password (D103), with recipes as data (D105)
- no payment inside Sen (D98)
