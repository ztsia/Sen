# Usage by session

One row per session, written by `node scripts/usage.mjs --log <slice>` before a handoff or a PR
(D125). The dollar figures are API-price equivalents, a proxy for the share of the plan's quota each
part used, not a bill. Read it when tuning which model does what: a mechanical batch on Sonnet that
Haiku could have done, a main session doing work a subagent should have, a scout that cost more than
the reading it saved.

## Haiku against Sonnet (13 Oct, the B04 redesign)

The same pointer brief, run on both models, each in its own worktree:

| Batch | Sonnet | Haiku | Kept |
|---|---|---|---|
| D, 8 screens | `medium`: $1.12, 5 min | `low`: $0.11, 7 min, comparable, no slips | Haiku's |
| E, 17 screens | `medium`: $3.43, 11 min | `low`: $0.16, unfinished; it edited the main checkout, not its worktree, and was blocked | Sonnet's |
| E rematch | | `medium`, path stated: $0.21, 10 min, comparable, followed the brief more literally | Sonnet's, already on the branch |

- **What decided it was the brief, not the model.** Each Haiku slip, here and earlier in B04
  (accepting only its own settings keys, a repo-wide formatter, reporting a running test as done),
  came from something the brief left unsaid.
- **Effort, from Anthropic's model docs:**
  - **Haiku 5.5** defaults to `medium`. `high` is "for longer agent tasks and strict instruction
    following". At `low` and `medium` it sometimes reports a code change done without running a check.
  - **Sonnet 5.5** starts at `medium` for agentic coding.
  - **On both**, `xhigh` and `max` are for a measured gain only.
  - **Price:** Haiku costs $0.10/$0.50 per million tokens against Sonnet's $2/$10.
  - No published comparison of Haiku at `high` with Sonnet at `medium` exists.
- **The rule this gave** is D131.

| Date | Slice | Session | Main | Subagents | Total | By model |
|---|---|---|--:|---|--:|---|
| 11 Oct | B03 | `01a75b9c` | $85.5 | 4× implementer on sonnet-5-5 $5.96; 3× qa-reviewer on sonnet-5-5 $28.42 | $119.88 | opus 71%, sonnet 29% |
| 11 Oct | setup | `c0da593a` | $17.25 | none | $17.25 | opus 100% |
| 11 Oct | setup | `f55dd374` | $15.2 | none | $15.2 | opus 100% |
| 14 Oct | B04-redesign | `a62b07c1` | $148.03 | 13× implementer on haiku-5-5 $1.47; 7× implementer on sonnet-5-5 $11.41; 4× qa-reviewer on sonnet-5-5 $50.39; 1× general-purpose on haiku-5-5 $0.01; 1× claude-code-guide on haiku-5-5 $0.01 | $211.32 | opus 70%, sonnet 29%, haiku 1% |
| 15 Oct | B04 QA tooling | `c23de0d2` | $17.66 | 1× general-purpose on sonnet-5-5, opus-5-5 $48.44 | $66.1 | opus 63%, sonnet 37% |
| 16 Oct | B05 | `012a2743` | $24.21 | 1× implementer on sonnet-5-5 $2.33 | $26.55 | opus 91%, sonnet 9% |
