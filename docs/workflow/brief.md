# Brief: what Sen adds to the workflow's `brief` skill

The plugin's `brief` skill (D131, made general from Sen's copy) holds the method. This file holds
what's true of Sen only, and wins where they differ.

- **`pnpm test:db` drops `sen_test`.** A brief for agents running at once says which one holds it;
  the ports are in `CLAUDE.md` § *Ports*.
- **The skill's examples are Sen's:** two configs on port 4175, and a run dropping `sen_test` under
  another's (QA tooling, 16 Oct); cold opens measured as first installs, in 70 minutes (QA tooling,
  16 Oct); one agent, 185 turns of waits (15 Oct); a resumed Sonnet agent on Opus at three times the
  cost (17 Oct).
- **In a cloud session, subagents can't start their own,** whatever their tools list (B05 · Feel). The
  main session starts what an agent would delegate, such as `workflow:qa-eyes` for the reviewer.
- **A slice's plan is `docs/plans/<slice>.md`** (D151), written by the main session before it builds
  anything: the units, each with its outcome, owned files, what it copies, its checks and its model,
  with the foundations and seams marked as the main session's. A builder's answered question is added
  to it. The handoff points at it.
