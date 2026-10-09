# QA B02 · run 6's twin on Sonnet (comparison, not part of the slice's record)

Same thin prompt as run 6, same area (the capture path), on the code run 6 tested (`251d584`, app code as
of `a6a2437`), in its own worktree, with no run-6 material read. Saved by the main session from the
reviewer's final message. It was stopped once by the session's usage limit and resumed.

```
VERDICT   fix first
          52 criteria: 40 pass, 5 fail, 7 not reachable
          phases run: 1-6, scoped to the capture path
```

| # | Severity | Finding | Run 6 (Opus) |
|---|---|---|---|
| 1 | Major | A code split by bidi controls (U+202A–E, 2066–9), U+061C, U+2061–4, U+034F, keycaps or tag characters is stored whole and unmarked | Same family (finding 10: keycaps, variation selectors, CGJ), plus bullets and colons, which Sonnet missed |
| 2 | Minor | A code split 3+3 across title and text ("Your OTP 482" / "913") is stored whole | Not found |
| 3 | Minor | A time after a date loses its hour: `09-10-2026 21:47` → `••-••-•••• ••:47` | Not found |
| 4 | Minor | Whole foreign-currency amounts are masked (`THB ••••`, `£••••`); only RM, MYR, USD, SGD, `$` protect | Not found |
| 5 | Minor | The OTP filter is quadratic in text length (20 kB ≈ 1.2 s, 100 kB ≈ 30 s), on the one capture thread | Not found |
| 7 | Minor | "as the apps wrote them" though every long number is masked | Same (finding 13) |
| 6 | Note | "Top up RM50.00 successful. Code: 123456" drops as an OTP, by design | — |
| 8 | Note | The simulator is a stand-in and loses its state on reload | Same (note 14) |
| 9 | Note | `CaptureGate` trusts the stored chosen list without re-running the classifier | — |
| 10 | Note | `Capture.store` catches only the gate; a SQLite exception from `outbox.insert` is uncaught | — |
| 11 | Note | The emulator was red for this code (the 1,024-character cut) | Same |
| 12 | Note | Only OTP and unread drops are logged; group-summary, ongoing, channel and empty drops leave no trace | — |
| — | — | Not found by Sonnet | Run 6's 11 (four spaces), 12 (nothing guarded "unreadable is marked"), 15 (no `when`), 16 (records edited) |

Run 5's findings 1–5: all fixed (both runs agree). Phase 3: Sonnet broke 15 things, all caught; run 6 broke
11, two not caught (its finding 12).

## The comparison

| | Run 6 (Opus) | Twin (Sonnet) |
|---|---|---|
| Criteria | 27 | 52 |
| Findings (Major / Minor / Note) | 1 / 3 / 3 | 1 / 5 / 6 |
| Unique real findings | four spaces; the untested "unread is marked" rule; bullets and colons | title/text split; foreign currency; date-and-time; filter timing; uncaught insert; unlogged drops |
| Probes in phase 3 | 11 (2 uncaught) | 15 (all caught) |
| Tokens | about 240k | about 234k |
| Tool calls | 102 | 76 |
| Time | about 31 min | about 21 min (active) |
| Price per token | 1× | ½× |

Both found the one Major. Each found real things the other didn't, and Sonnet found more of them, at about
half the cost and in less time. One sample can't rank them finely, but it supports D118: Sonnet by default,
Opus when a run's risk calls for it.
