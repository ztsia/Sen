# Usage by session

One row per session, written by `node scripts/usage.mjs --log <slice>` before a handoff or a PR
(D125). The dollar figures are API-price equivalents, a proxy for the share of the plan's quota each
part used, not a bill. Read it when tuning which model does what: a mechanical batch on Sonnet that
Haiku could have done, a main session doing work a subagent should have, a scout that cost more than
the reading it saved.

| Date | Slice | Session | Main | Subagents | Total | By model |
|---|---|---|--:|---|--:|---|
| 11 Oct | B03 | `01a75b9c` | $85.5 | 4× implementer on sonnet-5-5 $5.96; 3× qa-reviewer on sonnet-5-5 $28.42 | $119.88 | opus 71%, sonnet 29% |
| 11 Oct | setup | `c0da593a` | $17.25 | none | $17.25 | opus 100% |
| 11 Oct | setup | `f55dd374` | $15.2 | none | $15.2 | opus 100% |
| 13 Oct | B04-redesign | `a62b07c1` | $52.65 | 10× implementer on sonnet-5-5 $32.05; 3× implementer on haiku-5-5 $0.11; 1× general-purpose on haiku-5-5 $0.01; 1× scout on haiku-5-5 $0; 1× qa-reviewer on sonnet-5-5 $20.16 | $104.98 | opus 50%, sonnet 50%, haiku 0% |
