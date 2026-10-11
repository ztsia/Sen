# Usage by session

One row per session, written by `node scripts/usage.mjs --log <slice>` before a handoff or a PR
(D125). The dollar figures are API-price equivalents, a proxy for the share of the plan's quota each
part used, not a bill. Read it when tuning which model does what: a mechanical batch on Sonnet that
Haiku could have done, a main session doing work a subagent should have, a scout that cost more than
the reading it saved.

| Date | Slice | Session | Main | Subagents | Total | By model |
|---|---|---|--:|---|--:|---|
| 11 Oct | B03 | `01a75b9c` | $77.65 | implementer (sonnet-5-5) $2.03; implementer (sonnet-5-5) $1.62; implementer (sonnet-5-5) $1.24; qa-reviewer (sonnet-5-5) $10.18; implementer (sonnet-5-5) $1.07; qa-reviewer (sonnet-5-5) $4.41; qa-reviewer (sonnet-5-5) $8.66 | $106.85 | opus 73%, sonnet 27% |
