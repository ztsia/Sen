---
name: brief
description: How the main session hands work to a subagent and what it does when the work comes back wrong. Choosing the model and effort, the brief's template and its five checks, and the rule for a miss (find what the brief left unsaid, correct the same agent, re-judge on a second miss). Use before every Agent call that does work (implementer, a sweep, a port, tests written to given criteria), and whenever a subagent's report or diff falls short.
---

# Briefing a subagent

The main session is the brain and subagents are its hands. It runs on the strongest model, which
costs most and is there to think: it decides, then hands down work that is decided but too long or
repetitive to be worth its price. **A brief that leaves thinking to the subagent is the main
session's failure, not the model's.** If it hands the thinking down, the project pays for a brain
and gets a smaller one.

## 1. Decide first

Write down every decision the work needs before choosing who does it. If one can't be written yet,
the work isn't ready to delegate: make that decision (ask the owner if it's theirs), or the task is
one where what's left can't be written down in advance (step 2).

## 2. Choose the model, per task

The goal is **one run, on the cheapest model a complete brief allows**, not many cheap runs and not
one expensive one.

- **Haiku at `high` effort** (the `implementer`'s default) for anything the brief can fully specify.
  It costs about a twentieth of Sonnet per token; measured runs came out 10 to 16 times cheaper for
  comparable work. Anthropic's docs put `high` at longer agent tasks and strict instruction
  following; at `low` and `medium` it sometimes reports a change done without running a check.
- **Sonnet at `medium`, or `high`** (`model` and `effort` on the Agent call) when what's left can't
  honestly be written down: an unknown cause to find, a large body of unfamiliar code to reason
  across, output that sets a pattern before the main session can show one. Also after a second miss
  (step 5).
- **The main session itself** for a change under about 100 lines, a design call, or a
  non-negotiable's logic. Briefing and reviewing would cost more than doing.
- `xhigh` and `max` only for a gain you have measured.

## 3. Write the brief

Point at files rather than restating them; the brief carries decisions, not context the agent can
read.

```
Goal: <the outcome in one sentence, as the person using it will see it>
Decided: <every decision: what's primary, names, behaviour, edge cases>
Copy: <the finished example to follow, or the exact contract: types, keys, test selectors,
       names that must not change>
Owns: <the files it may edit>. Don't touch: <files>. Also editing now: <who, what>
Done when: <the commands to run and what passing looks like>. Wait for long runs to end;
           never report one still running.
Environment: working directory <absolute path>; start with `pwd` and use only paths under it;
             port <n>, its own; format only your own files; don't commit.
Report: each file changed, each check's result, and anything the brief didn't settle.
```

## 4. Check it before sending

Each line below is a miss that happened because a brief left it unsaid:

- **The outcome and every decision.** Nothing left that a reviewer would argue about. (An agent
  accepted only the settings keys it knew of, because the full set wasn't named.)
- **What to copy.** A finished example beats a description. Build the shared ground first, yourself:
  types, building blocks, one finished example. That example is what makes a brief complete.
- **The scope.** Its files, the ones it mustn't touch, and what other agents are editing now. (One
  ran a repo-wide formatter over another agent's files.)
- **How it proves it's done.** The checks, and *wait for long runs to end*. (One reported a test
  run while it was still going.)
- **Its environment.** The absolute working directory, a port of its own, *don't commit*. A worktree
  may start at `main`: tell it which commit to check out. (One worked in the main checkout instead
  of its worktree, was blocked, and was judged a failure of the model; the same model succeeded
  with the path stated.)

## 5. When it comes back

**Review every report and diff:** its file list, that it ran its checks, and the result itself. A
report is a claim, not proof. Fix small things yourself, then commit.

When it fell short, **ask first what the brief left unsaid.** Usually it's the brief.

| | What to do |
|---|---|
| **First miss** | Add the missing line to the brief, then **correct the same agent** (SendMessage), so it keeps what it knows: *what's wrong, where, because which decision; change it to exactly this; leave the rest; re-run the checks.* |
| **Off track** (wrong files, wrong approach) | Start a fresh run on the same model with the corrected brief, handing it whatever is salvageable. |
| **Second miss on the same point** | Re-judge. The brief was complete and it still failed, so the task needs judgment that couldn't be written down: Sonnet, starting from the work so far, or the main session if what's left is small. |

**Why there's no fixed retry count.** A cheap model's runs cost little, but each round also costs
the main session a review and a corrected brief, in the session's most expensive context. One
correction is almost always cheaper than a stronger model; repeated rounds on the same point mean
the model choice was wrong, and a fixed count would only keep retrying something already seen to be
wrong. When a miss came from the brief, carry that line into the next brief too.

## Working rules

- **One checkout unless two agents edit the same files.** Worktree agents check out the slice's
  commit first.
- **Subagents can't start subagents.** What an agent would delegate, the main session starts.
- **An agent stopped at a usage limit is resumed** (SendMessage), never restarted.
- **Commit an agent's files only after reviewing its report**, staging explicit paths, never `-a`,
  while other agents are still editing.
