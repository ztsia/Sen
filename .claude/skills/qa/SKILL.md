---
name: qa
description: Independent QA pass on the current branch before its PR, plus the rules for fixing what it finds. Spawns a clean-context reviewer that writes acceptance criteria and flows from the spec, checks the tests actually catch breakage, exercises the database, row-level security and routes, and walks the journeys in the web app at a phone viewport with a screenshot per step. Then sorts every fix into three tiers. Small: the implementer fixes and self-verifies. Medium: the same reviewer is resumed for a targeted re-check. Big: a fresh full QA run. Use when a slice is finished, before a PR, when a non-negotiable was touched, or when asked to verify, QA or review work.
---

# QA pass

Verification by someone who didn't write the code, plus a fixed rule for what happens next. This
skill sets the run up and hands off to the `qa-reviewer` subagent. Its clean context is the point.

## When to run it

- **A slice branch is finished, before its PR is opened.** This is the main case.
- **A `CLAUDE.md` non-negotiable was touched**, even mid-slice.
- **Someone asks** to verify, QA or independently check work.

Skip it for a docs-only change. If `git diff --stat main...HEAD` shows nothing outside `docs/` and
`*.md` files, say so and stop.

## Running it

1. Start the QA database and the web app as `CLAUDE.md` § Commands describes. The foundations
   slice adds those commands.
2. Spawn `qa-reviewer` with the Agent tool, `subagent_type: "qa-reviewer"`. **Keep the agent ID**,
   because a medium-tier re-check resumes this same agent.
3. **Keep the prompt thin:** the branch, the slice label, and the slice's row in `docs/modules.md`.
   Nothing else.

> **Don't tell it what you built, how it works, or why you think it's right.** Its value is that it
> derives its criteria from the spec independently. Briefing it with your reasoning turns an
> independent check into a confirmation of your own assumptions. Don't pre-empt it with known
> issues either. If it misses one, that's a finding about how clear the spec is.

Run it in the background and keep working.

## Reading the result

The owner never sees the subagent's report, so relay these yourself:
- the verdict and the counts
- every Blocker and Major, in full

**First, commit and push the reviewer's record at once:** `qa/<slice>/report.md`,
`qa/<slice>/results.json`, and its `acceptance.md`, `flows.md` and specs. That's the durable record:
`qa-artifacts/` is gitignored and goes when the VM is reclaimed. If the reviewer didn't write
`report.md`, write it yourself from its final message before doing anything else.

Then **publish the HTML report with the Artifact tool** and give the owner the link:
1. If the reviewer didn't render it, run `node scripts/qa-report.mjs qa-artifacts/<branch>`. Never
   hand-write the HTML. The page links its screenshots as `screens/<name>.png` and writes
   `qa-artifacts/<branch>/publish-files.json`, which maps each one to its file.
2. Look at every screenshot before publishing (montage them into contact sheets), as the Artifact
   tool requires. Real financial data must never be in one.
3. Publish `qa-artifacts/<branch>/report.html` with `files` set to the map in `publish-files.json`.
   The screenshots are uploaded with the page and hosted with it, so the published report keeps
   working after the local files go. When a later run replaces it, publish to the same artifact URL.
4. Add the link to the top of `qa/<slice>/report.md`, and commit and push it.
5. **Discard `qa-artifacts/<branch>/`** once the publish has succeeded: `rm -rf qa-artifacts/<branch>`.
   It's gitignored and too big for git, and the artifact now holds it.

**To rebuild a discarded report** (to republish it, say), everything needed is committed: run QA's
specs as `qa/e2e/playwright.config.ts`'s header says (preview builds served, then
`playwright test` from `qa/e2e`) to retake the screenshots into `qa-artifacts/<branch>/screens/`, copy `qa/<slice>/results.json` to `qa-artifacts/<branch>/`, and
run `node scripts/qa-report.mjs qa-artifacts/<branch>`. Pass `--inline` to embed the screenshots
in one large self-contained file instead.

| Severity | Meaning | Rule |
|---|---|---|
| **Blocker** | A `CLAUDE.md` non-negotiable is violated | Fix it before the PR. Never downgrade it |
| **Major** | An acceptance criterion fails, or a test on a critical path catches nothing | Fix it, or record in the handoff why it's deliberate. Never silently |
| **Minor** | Real, but survivable | Your judgement. Say what you're leaving and why |
| **Note** | An observation | No action claimed |

If you disagree with a finding, argue it from the spec, not from what you meant. If the spec is
genuinely ambiguous, that's a spec bug: fix the spec, because the next slice will misread it the
same way.

## Fixing the findings: three tiers

Sort each **fix**, not each finding, by what the fix changes. Check the tiers in order, from 3 down
to 1; the first one that matches is the tier. **When unsure, go up a tier.** A batch of fixes takes
the highest tier among them. Record every tier decision, and why, in `qa/<slice>/ledger.md`.

### Tier 3, big: a fresh full QA run

The fix is tier 3 if **any** of these apply:
- It adds a migration, or changes the schema, row-level security, or a SQL view or function the
  agent reads.
- It touches a `CLAUDE.md` non-negotiable.
- It changes shared code:
  - navigation
  - a component in `components/ui/`
  - a pattern from `docs/ui/patterns.md`
  - a shared store
  - the money module
  - the theme
- It fixes a **Blocker**.
- It changes how the slice works, rather than fixing a defect in it.

Then spawn a **new** `qa-reviewer` with a clean context and run every phase again. Don't resume the
old reviewer: it has seen the old implementation, and a big change invalidates what it observed.

### Tier 2, medium: the same reviewer, targeted

The fix is tier 2 if it changes behaviour but stays inside the slice's own files, and nothing from
tier 3 applies.

1. Fix, commit and push.
2. Resume the **original** reviewer: send a message to its agent ID with the IDs of the findings you
   fixed and the commit range. Say nothing about how you fixed them.
3. It re-checks only the affected criteria and flows and re-runs the probes that covered them. It
   also walks the core journeys from `docs/flows.md` once. Then it updates `results.json` and the
   report.

If the original reviewer is gone because the session rotated, spawn a fresh one in **targeted
mode** instead. Point it at the committed `qa/<slice>/acceptance.md` and `flows.md`, and give it the
finding IDs.

**Escalation:** if two medium rounds in a row each find something new, the next round is tier 3.
Repeated misses mean the slice isn't understood yet.

### Tier 1, small: fix and self-verify

The fix is tier 1 only if **all** of these are true:
- It changes one source file, plus its test.
- It changes no behaviour beyond the finding itself, and nothing from tiers 2 or 3 applies.
- The finding is a Minor or a Major, never a Blocker.

1. **Red first.** Write or adjust a test that fails on the current code. Run it and keep the output.
2. Fix the code. Run that test (now green), the slice's suite, the typecheck and the lint.
3. If the finding was visual, take a screenshot in the web app at the phone viewport.
4. Record it in `qa/<slice>/ledger.md`:
   - the finding ID
   - the tier, and why
   - the red and green test output
   - the screenshot path, if there is one

No QA re-run for tier 1. The ledger is how the owner audits self-verification from a phone: every
tier-1 claim carries its own evidence.

## What is committed, and what isn't

| Path | Committed? | Why |
|---|---|---|
| `qa/<slice>/acceptance.md`, `qa/<slice>/flows.md` | Yes | A targeted re-check after a session rotation needs them |
| `qa/<slice>/ledger.md` | Yes | Tier-1 evidence, and every tier decision |
| `qa/e2e/*.spec.ts` | Yes | They're the regression suite |
| `qa/<slice>/report.md`, `qa/<slice>/results.json` | Yes | The findings, verdict and evidence, in the repo, so they outlive the VM |
| `qa-artifacts/<branch>/` | No | Screenshots, traces and the rendered `report.html`. Published with the Artifact tool, then deleted. Too big to commit, and rebuilt from the rows above when needed |
