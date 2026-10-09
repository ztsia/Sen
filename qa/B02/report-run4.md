# QA · B02 · The shell and the listener (run 4)

**Report with screenshots:** https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA (run 4)

Run 4, 9 Oct 2026, at `a4fd670` (code) / `f09624c` (HEAD): a fresh `qa-reviewer` after run 3's tier-3 fixes.
Earlier runs' records are in `report-run1.md`, `report-run2.md` and `report-run3.md`. The rendered report is
`qa-artifacts/B02-shell-listener/report.html`.

```
VERDICT   fix first
          48 criteria, 37 pass, 2 fail, 9 not reachable
          phases run: 1-6 (no server: phase 4 ran the outbox schema in SQLite, the APK manifests and the bundle)
          screenshots: qa-artifacts/B02-shell-listener/screens/ (87)
```

**Suites:**
- Unit tests: 141/141.
- Kotlin core: 29/29.
- The branch's Playwright: 100/100, on a fresh build (see finding 6).
- QA's Playwright: 46/46, including `b02-update` on :4177 and the new `b02-r4-flows`.
- Typecheck, lint and format: clean. Hygiene passes, but `DENYLIST` isn't set, so only `private/` was checked.
- APKs: release, debug and e2e all build here.
- CI: the `Shell` workflow, run 37891419789 at `a4fd670`, is green (core, apks, and the emulator's 7 tests).

**QA's core probes:**
- `Probe` 20/20, `Probe2` 31/31 and `Probe3` 40/40.
- The new `Probe4` passes 39 of 57: all 37 docs-first cases, and only 2 of the 20 written after reading the filter.

**Ordering:** I wrote AC-17 t–ap, AC-17s 7–20 and AC-47 from spec §6.2 and D115 before opening `OtpFilter.kt`.
Before that I had read QA's own records (run 3's report, the ledger and `Probe3.kt`), to avoid repeating
cases. All 37 of those cases pass. The cases marked `r4_*` in `Probe4.kt` came after reading the filter.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Blocker | OTPs that use only a weak keyword (code, PIN) are stored when an amount or a few words come between the keyword and the code | `gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe4` | AC-17, §6.2, D115, CLAUDE.md non-negotiable |
| 2 | Major | Payments are dropped where §6.2 says the number isn't a code, or the keyword is in advice: hyphen dates, card auth codes, *Keep your TAC confidential* | same, the `r4_*` payment cases | AC-17s, §6.2, D86 |
| 3 | Minor | `heartbeats.package` was added without bumping the outbox's version, so an outbox from an earlier build breaks the heartbeat log | SQLite, below | AC-23, AC-47, §18 |
| 4 | Minor | No test checks that a subdomain of the site is refused: a probe that accepts one stayed green | probe 6b | AC-3s, §17 |
| 5 | Note | §6.2's own rule keeps two OTP shapes: the keyword only in a footer, and no keyword at all | `Probe4 r4_keyword_only_in_advice` | §6.2, D115 |
| 6 | Note | A stale `vite preview` on :4173 made `pnpm e2e` test an old build | `ps aux \| grep 'vite.js preview'` | AC-46 |
| 7 | Note | No journey in `docs/flows.md` is marked core (fourth run) | `grep -n -i core docs/flows.md` | QA rules |

**1. Weak-keyword OTPs stored (Blocker).** The evidence approach works for strong keywords: all 23 of run 4's
docs-first OTP shapes drop, and so do runs 1–3's. The weak-keyword path still breaks in the way run 3's Blocker did:
- `weakThenIs` lets up to six words sit between the keyword and its code, but a word can't contain `.`, so
  `RM50.00` breaks the join.
- `weakJustBefore` allows only its closed list of linking words, so a colon after a few other words isn't a join.
- A code spaced one digit at a time is never treated as a code, though §6.2 says a code may be grouped.

```
Keep  <- Ryt Bank | Your code for DuitNow transfer of RM50.00 to TAN WEI MING is 482910 | null
Keep  <- Ryt Bank | Code for your RM50.00 transfer: 482910 | null
Keep  <- ShopeePay | Your code to log in to ShopeePay: 482910 | null
Keep  <- Ryt Bank | Your PIN for the RM50.00 transfer is 4829 | null
Keep  <- Ryt Bank | Your OTP is 4 8 2 9 1 0 | null
Keep  <- Ryt Bank | Kod sah anda: 482910 | null
57 tests completed, 18 failed
```
I recommend a structural fix, not more patterns: apply §6.2's *in doubt it drops* to weak keywords.
- A weak keyword and an unqualified code in the same sentence, outside a promotion, drops it.
  `NOT_A_CODE_BEFORE` and `QUALIFIED` already keep references and amounts out.
- Single-digit groups count as a code when there are 4 to 8 of them.

What limits the harm meanwhile (it doesn't waive the finding): Android 15 and later hide most OTP
notifications from listeners, and the outbox stays on the phone until B07.

**2. Payments dropped (Major).**
- Hyphen dates (`09-10-2026`) count as 8-digit codes.
- `authorisation code` is on the strong list. `Auth code`, `Payment code` and `Txn code` aren't treated as
  references.
- Footers that don't say *never/don't share* aren't treated as advice.

`secure2u` is a strong keyword, and MAE (`com.maybank2u.life`) is on the curated list. Each drop is now
logged by time and app, but the payment's raw text is lost for good.
```
Drop(reason=OTP)  <- MAE | Transfer of RM50.00 to TAN WEI MING approved via Secure2u on 09-10-2026. | null
Drop(reason=OTP)  <- Public Bank | PBe: Fund transfer RM100.00 to TAN WEI MING on 09-10-2026 successful (TAC verified). | null
Drop(reason=OTP)  <- Public Bank | Card ending 1234 charged RM38.15 at PETRON on 09 Oct. Auth code 482910. | null
Drop(reason=OTP)  <- Public Bank | Card ending 1234 charged RM38.15 at PETRON. Authorisation code: 482910. | null
Drop(reason=OTP)  <- Ryt Bank | Payment of RM12.90 to ZUS COFFEE successful. Payment code: 482910 | null
Drop(reason=OTP)  <- Ryt Bank | Paid RM12.90 to ZUS COFFEE. Txn code 482910 | null
Drop(reason=OTP)  <- Ryt Bank | RM12.90 paid at 7-ELEVEN 2241 KLCC. Keep your OTP and TAC confidential. | null
Drop(reason=OTP)  <- Ryt Bank | Bayaran RM12.90 di 7-ELEVEN 2241 KLCC berjaya. Rahsiakan TAC anda. | null
Drop(reason=OTP)  <- Public Bank | PBe: RM12.90 spent at SHELL 2241 PJ. Protect your PIN and OTP. | null
```
Two more drops are genuinely in doubt (`TAC CAFE 2241`, `LIM PIN 4829`), which §6.2 allows. They're listed
for the owner, not counted here.

**3. Outbox schema (Minor).** `a4fd670` added `package TEXT` to `heartbeats`, but `VERSION` stays 1 and
`onUpgrade` is `Unit`. On an outbox created before this commit, the insert fails, and Android's
`insert` swallows the error and returns -1. The read throws:
```
old schema: INSERT INTO heartbeats (at,kind,connecte -> table heartbeats has no column named package
old schema: SELECT at, kind, connected, package FROM -> no such column: package
```
Nothing is installed yet, so it's cheap to fix now: bump the version and add an `ALTER TABLE`. B07 will add
columns to the same outbox.

**4. Origin test (Minor).** With `return a.first == b.first && a.third == b.third && a.second.endsWith(b.second)`
in `Origin.kt`, all 29 core tests still pass (`BUILD SUCCESSFUL`). Add
`assertFalse(Origin.same("https://x.sen.vercel.app/", site))`.

**5. Spec gap (Note).** `RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.` is kept, and so
is `Enter 482910 to approve…`, which has no keyword at all. Both follow §6.2 as written. They're for the
owner to weigh with D115, which is still *Proposed*.

**6. Stale server (Note).** A `vite preview` started at 05:49 was still serving :4173. Locally,
`reuseExistingServer` is on, so `pnpm e2e` reused that server and tested its old build:
- My first full run passed 100/100 against it.
- Probe 7 also passed against it, at first.

Once I stopped the server, probe 7 went red as it should. Stop `vite preview` before reporting e2e numbers,
or run with `CI=1`.

**7. Core journeys (Note).** Still unmarked; it's open with the owner in the handoff.

## Probes (phase 3): 7 of 8 caught

| What was broken | Caught |
|---|---|
| The Malay keyword `kod pengesahan` removed from `otp-keywords.txt` | yes, 2 failed |
| Advice that holds a code no longer drops | yes, 1 failed |
| The chosen-apps check removed from `CaptureGate` | yes, 3 failed |
| The dedupe key's length prefix removed | yes, 2 failed |
| `ref`/`reference` removed from `NOT_A_CODE_BEFORE` | yes, 1 failed |
| `Origin` ignores the scheme | yes, 1 failed. My first attempt also changed the port, so it proved nothing; I redid it |
| `Origin` accepts any subdomain of the site | **no**: finding 4 |
| The simulator no longer logs an OTP drop | yes, `capture.spec.ts` failed, once the stale server was gone |

After each probe was reverted, `git status` showed no change to app source.

**Phase 4 (SQLite and the APKs):**
- In the outbox schema, a replayed insert changes nothing (rowcount 0), and a plain duplicate is refused
  (`UNIQUE constraint failed: events.dedupe_key`).
- A new `when` gives a second row; `channel_drops` starts empty; a heartbeat row with `package` stores.
- aapt2 shows the ids `io.github.ztsia.sen`, `.debug` and `.e2e`.
- The manifests have no `QUERY_ALL_PACKAGES`, and they do have `disabled_filter_types=conversations`.
- The debug build's listener and boot receiver are disabled, and there are two launcher aliases with one
  enabled.
- No secret turned up in the three APKs or the production bundle.
- The diff adds no `parseFloat`, `toFixed` or `Number(`.

## What I couldn't test, and why

- **The real listener on the Xiaomi:** the soak, and Q2, Q3, Q26 and Q27. It needs the device, and it's
  queued in `docs/local.md`.
- **Probes on emulator-only paths.** This VM has no KVM, and running them on CI would mean pushing a
  defect to the branch.
- **Repeated drop lines on reconnect.** By reading the code, an OTP still showing would be logged again
  each time the listener reconnects, because the replay goes through `Capture.post` → `store`. That needs
  an emulator, so I haven't reported it as a finding.
- **Android-only behaviour:** `openInBrowser`, the status bar, insets, haptics, *Switch icon*, the Live
  Update and the prompt's buttons.
- **The release and debug addresses.** Both are null in `sites.json` until Vercel is linked.
- **The signed release.** There's no key yet.
- **Real OTP wording.** None has been sampled, so every case, QA's included, is made up.
- **Offline capture syncing exactly once.** That's B07.

## Tier

Findings 1 and 2 touch a `CLAUDE.md` non-negotiable: the OTP/TAC filter, in native code. Finding 3 is a
schema change to the outbox. Fixing them is tier 3, so a full run 5 should follow, not a targeted one.
