# Handoff

## Where things stand (24 Oct)

**B05 · Feel is merged** (PR #18, 22 Oct). **Next: B06 · Jobs, realtime, push and backups**
(`docs/briefs/B06-jobs-realtime-backups.md`), on `B06/jobs-realtime-backups` from `main`, in a new
session. It needs owner accounts (the Cloudflare Worker, cron-job.org, `sen_ops`' secrets); write
the steps into `docs/local.md` first and build everything that doesn't wait on them. It's the one
slice worth running mostly on the laptop (below).

**The workflow moved to a plugin** (`workflow/setup`, this PR). The rules (session rotation, models
and subagents, the owner's working rules), the agents (`workflow:implementer`, `workflow:qa-reviewer`,
`workflow:qa-eyes`, `workflow:scout`) and the `qa`, `uiux`, `database`, `llm` and `security` skills
now come from `ztsia/workflow`. What was true of Sen only is in `docs/workflow/{qa,database,uiux}.md`;
`CLAUDE.md` keeps Sen's facts, with an *Overrides* section. `brief` stays Sen's own skill.
`scripts/usage.mjs` and `qa-report.mjs` are the plugin's now: `node "${CLAUDE_PLUGIN_ROOT}/scripts/usage.mjs"`.

## Decided, and why

- **Where sessions run (owner asked, 24 Oct):** cloud by default. The laptop is for live keys, real
  data from `private/`, creating accounts and secrets, and the phone over USB. **B06 mostly on the
  laptop**; short laptop sittings for B10's and B15's benchmarks (the capped key; real receipts) and
  before B24 (the OAuth client) and B34 (Q29's captures). B27's model choice runs in the app, so it
  stays in cloud. Not yet tried: a full build session on the Windows laptop (bash scripts, no local
  Postgres there).
- **QA's security checks** go into B06 (owner, 24 Oct; its brief). Until then (dependency
  audit, secret scan, security lint), the sweep runs `pnpm audit --audit-level high` and
  `pnpm hygiene` (`docs/workflow/qa.md`).
- **The uiux component docs** in the plugin are for Next.js; Sen is Vite. The skill's refresh writes
  Sen's own copy to `docs/workflow/uiux/` the first time a session uses it.

## Open with the owner

- **Set the cloud environment's setup script** to the plugin's `cloud-setup.sh` before the next cloud
  session (`docs/local.md`, first item). Without it a cloud session has no rules, agents or skills.
- **Check after merging:** a fresh session opens with *The workflow* rules, `/agents` lists
  `workflow:implementer`, and the old unprefixed `implementer`, `qa-reviewer`, `qa-eyes` and `scout`
  are gone.
- Four improvements for `ztsia/workflow` (`docs/local.md`).
- `ztsia/claude_skills#5`: `ztsia/workflow` replaced that repo; merge it or close it.
- From before: the phone sign-off after the new APK; `docs/local.md` *Now* (delete
  `B05/qa-tooling-iad1-probe` and `B05/qa-tooling`, `SEN_OWNER_EMAIL`, the first sign-in, Q14, sign out
  everywhere).

## What to do first

- Merge this PR (docs and config only; no app code changed).
- Then B06, from `main`: `git checkout -b B06/jobs-realtime-backups origin/main`.

## Don't argue again

- D129–D140 (the owner's calls). Deploys happen only by merge (D122). The review build follows
  `review` (D115).
- Money never counts up or down in motion.
- iOS back is an edge swipe in B39, for iOS standalone only, and never on Android (owner, 21 Oct).
- Haptics go through `performHapticFeedback` (bridge 2), not `@capacitor/haptics`' vibrator.
- In cloud sessions, subagents can't start subagents. The QA reviewer runs its sweep, and the main
  session spawns `workflow:qa-eyes` (the `qa` skill).
