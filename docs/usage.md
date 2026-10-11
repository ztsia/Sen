# Usage by session

One row per session, written by `node scripts/usage.mjs --log <slice>` before a handoff or a PR
(D125). The dollar figures are API-price equivalents, a proxy for the share of the plan's quota each
part used, not a bill. Read it when tuning which model does what: a mechanical batch on Sonnet that
Haiku could have done, a main session doing work a subagent should have, a scout that cost more than
the reading it saved.

| Date | Slice | Session | Main | Subagents | Total | By model |
|---|---|---|--:|---|--:|---|
| 11 Oct | B03 | `01a75b9c` | $77.86 | 4× implementer on sonnet-5-5 $5.96; 3× qa-reviewer on sonnet-5-5 $23.24 | $107.06 | opus 73%, sonnet 27% |
