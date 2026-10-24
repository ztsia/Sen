# Handoff

## Where things stand (24 Oct)

**Next: B06 · Jobs, realtime, push and backups**, on **`B06/jobs-realtime-backups`** (created from
`main` on 24 Oct; it holds only this handoff and the brief's additions so far). Brief:
`docs/briefs/B06-jobs-realtime-backups.md`. It needs owner accounts (the Cloudflare Worker,
cron-job.org, `sen_ops`' secrets): write the steps into `docs/local.md` first, and build everything
that doesn't wait on them.

**Merged on 24 Oct:** Sen #19 (Sen takes up the `workflow` plugin) and `ztsia/workflow#11` (plugin
1.1.0: the QA agents read `docs/workflow/qa.md` themselves, `*Who makes each fix*` is back,
`workflow:brief` ships in the plugin). The rules, agents and the `qa`, `uiux`, `database`, `llm`,
`security` and `brief` skills come from the plugin. Sen's own additions are in `docs/workflow/`.
The laptop's plugin is 1.1.0 at both user and project scope.

## Decided, and why (24 Oct, owner)

- **B06 gained three things** (all in its brief):
  - **Workflow cleanup, first:** delete Sen's `brief` skill and the two `CLAUDE.md` *Overrides*
    lines that 1.1.0 makes unnecessary.
  - **Security checks:** one `pnpm security` command in CI and QA (`pnpm audit`, `gitleaks`, the
    ESLint security plugins). Its first run covers B01–B05.
  - **One `claude-security` scan of the whole codebase**, not only B06's diff, before B07 lets real
    money reach the server. B01–B05 never had one.
- **Where sessions run:** cloud by default. The laptop is for live keys, real data from `private/`,
  creating accounts and secrets, and the phone over USB. **B06 mostly on the laptop**. Short laptop
  sittings: B10's and B15's benchmarks (the capped key; real receipts), and before B24 (the OAuth
  client) and B34 (Q29's captures). B27's model choice runs in the app, so it stays in cloud. Not
  yet tried: a full build session on the Windows laptop (bash scripts, no local Postgres there).
- **Until B06's checks exist,** QA's sweep runs `pnpm audit --audit-level high` and `pnpm hygiene`
  (`docs/workflow/qa.md`).
- **The `uiux` component docs** in the plugin are for Next.js; Sen is Vite. The skill re-pulls Sen's
  own copy into `docs/workflow/uiux/` the first time a session uses it.
- **The plugin's scripts** are named in docs as `node "<workflow plugin>/scripts/<name>"`: the folder
  the rules name at session start. Never a local absolute path.

## Open with the owner

- **The cloud environment's setup script** must be the plugin's `cloud-setup.sh` before the next
  cloud session (`docs/local.md`, first item). Without it a cloud session has no rules, agents or
  skills.
- `ztsia/claude_skills#5`: `ztsia/workflow` replaced that repo; merge it or close it.
- From before: the phone sign-off after the new APK; `docs/local.md` *Now* (delete
  `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`, `SEN_OWNER_EMAIL`, the first sign-in, Q14, sign out
  everywhere).

## What to do first

1. Check the session opened with the 1.1.0 rules (their path names `workflow/1.1.0`), and that
   `/agents` lists `workflow:implementer` with no unprefixed copies.
2. `git checkout -B B06/jobs-realtime-backups origin/B06/jobs-realtime-backups`, then the brief's
   *Workflow cleanup* step, then the rest of B06.

## Don't argue again

- D129–D140 (the owner's calls). Deploys happen only by merge (D122). The review build follows
  `review` (D115).
- Money never counts up or down in motion.
- iOS back is an edge swipe in B39, for iOS standalone only, and never on Android (owner, 21 Oct).
- Haptics go through `performHapticFeedback` (bridge 2), not `@capacitor/haptics`' vibrator.
- In cloud sessions, subagents can't start subagents. The QA reviewer runs its sweep, and the main
  session spawns `workflow:qa-eyes` (the `qa` skill).
