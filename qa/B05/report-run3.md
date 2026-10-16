# B05 · Server, database and sign-in: QA report (run 3, scoped, tier 2)

Published: https://claude.ai/artifact/AzAyheGoaGbcR68PSDJWdz (version 3; runs 1 and 2 are versions 1 and 2)

```
VERDICT   fix first
          26 criteria in the area, 19 pass, 6 fail, 1 not reachable
          phases run: scoped (tier 2)      screenshots: qa-artifacts/B05/server-r3/screens/
```

All twelve of run 2's fixed findings hold. Two new Majors: the answers kept for offline outlive a session ended on another device, so a revoked browser shows the person's settings offline (the lost-phone journey); and the test pinning the concurrent-write fix can't fail. Two Minors still answer 500 to hostile input (a NUL in an email on the sign-in routes, and an `Origin: null`).

**Area:** signing in and out (§17 *Login*, §16 `/auth/*`), the API's handling of input (§16 *Validation*, *Errors*), and Settings → You.

**Commits:** 2c3de77..15105b8.

**Method:** the run-2 reviewer, resumed. The new criteria (AC-81 to AC-88, in `acceptance.md` *Run 3*) were written after reading the fix commits, as scoped mode says.

**Left out:** everything else in the slice, and the full `pnpm e2e`. The diff run re-ran the whole catalogue against `main` instead.

**Recommendation:** finding 30 sits in the offline layer every later slice will read through, so treat its fix as reaching beyond this area.

## Suites

| Suite | Result |
|---|---|
| unit | 335/335 |
| db | pgTAP 103/103, API 33/33 |
| e2e:server | 3/3 |
| qa specs | qa/e2e/b05-*: 33 run, 32 pass, 1 fail (FLOW-31: finding 30) |
| typecheck | clean |
| lint | clean |
| diff | 87 entries: settings/account (tree and pixels), sign-in, first-run, sign-in@invited, first-run@without-capture (pixels: the focused email field), 0 check findings |

## Findings, worst first

| # | Severity | Status | What breaks | AC / spec |
|---|---|---|---|---|
| 30 | Major | open | After “Sign out everywhere” elsewhere, the revoked browser keeps the person’s data and shows it offline | AC-86, AC-86s; spec §17 Login; flows.md lost-phone |
| 32 | Major | open | The test pinning finding 22's fix can't fail: the test pool runs one transaction at a time | AC-85; CLAUDE.md dedupe; qa skill (a test on a critical path that catches nothing) |
| 31 | Minor | open | A NUL in the email still gives a 500 on both sign-in routes | AC-82s, AC-75; spec §16 Errors |
| 33 | Minor | open | An `Origin: null` or malformed Origin on a write gives a 500 | AC-83s; spec §16 Errors |
| 27 | Note | open | Run 2: A code sent just before a suspension still signs in | qa/B05/report-run2.md |
| 34 | Note | open | The NUL guard also refuses the six characters \u0000 typed as text | AC-84s |
| 35 | Note | open | A send whose mail server doesn’t answer waits 2 minutes before saying so | AC-81; patterns §7 Error |
| 36 | Note | open | The send route falls through to Better Auth for a body it can’t read, and no longer checks Origin | AC-82; §5.1 |
| 18 | Major | fixed | Run 2: A failed code email answered 200 “success” | qa/B05/report-run2.md |
| 19 | Major | fixed | Run 2: Run 1's web fixes were pinned only in qa/e2e | qa/B05/report-run2.md |
| 10 | Minor | fixed | Run 2: A suspended person with a live session wasn’t told | qa/B05/report-run2.md |
| 20 | Minor | fixed | Run 2: A NUL in a name gave a 500 | qa/B05/report-run2.md |
| 21 | Minor | fixed | Run 2: Undo on You didn’t redraw | qa/B05/report-run2.md |
| 22 | Minor | fixed | Run 2: Concurrent identical writes were audited twice | qa/B05/report-run2.md |
| 23 | Minor | fixed | Run 2: You turned into an error offline in a browser | qa/B05/report-run2.md |
| 24 | Minor | fixed | Run 2: Sign-in’s email field wasn’t focused | qa/B05/report-run2.md |
| 29 | Minor | fixed | Run 2: A long email on Account was clipped | qa/B05/report-run2.md |
| 25 | Note | fixed | Run 2: Unknown /api/auth paths answered an empty 404 | qa/B05/report-run2.md |
| 26 | Note | fixed | Run 2: The API’s routes checked neither Origin nor Content-Type | qa/B05/report-run2.md |
| 28 | Note | fixed | Run 2: docs/local.md’s Q14 SQL kept the case | qa/B05/report-run2.md |

### New findings: detail, repro and real output

#### 30 · Major · After “Sign out everywhere” elsewhere, the revoked browser keeps the person’s data and shows it offline

Finding 23's fix keeps the last `me` and Settings answers in `localStorage` (`sen.api.kept`) and forgets them at *Sign out* and *Sign out everywhere* in that browser. When the session ends anywhere else (another device's *Sign out everywhere*, expiry), this browser gets a 401, and `router.tsx`'s handler only forgets the session in memory and navigates. It never calls `forgetKept()`. Opened offline later, the gate lets it in (it can't ask the server), and Settings → You shows the person's payday and switches from the kept answers. This is the lost-phone journey (§17 *Login*, flows `lost-phone`). Today the kept data is email, names, payday and switches, but the mechanism is what later slices will put money through. Forget the kept answers (and the query cache) on every 401, not only on this browser's own sign-out.

Repro:
```
qa/e2e/b05-r3.spec.ts FLOW-31: browser A opens You; browser B signs out everywhere; A opens You online (→ sign-in), then offline
```
Output:
```
FLOW-31: kept after the 401: {"me":{"capture":false,...},"settings":{"email":"qa-ben@example.com",...,"you":{...,"payday":{"kind":"last-working"}}}}
FLOW-31: offline open after revocation: http://localhost:4177/s/settings/you | You're offline. ... | You | Payday | Last working day | A day | Not set | ...
```
Screenshots: qa-artifacts/B05/server-r3/screens/FLOW-31-step-1-kept.png, qa-artifacts/B05/server-r3/screens/FLOW-31-step-2-revoked.png, qa-artifacts/B05/server-r3/screens/FLOW-31-step-3-offline.png

#### 32 · Major · The test pinning finding 22's fix can't fail: the test pool runs one transaction at a time

`api.test.ts` *makes two identical writes sent at once one change and one audit entry (22)* fires 5 requests with `Promise.all`, but the test's `app_user` pool is `max: 1`, so the transactions run one after another and the race never happens. Probe: `.for('update')` removed from `setYou`: `pnpm test:db` stays 33/33. The same change against a live API (pool of 3) gave a round with 3 audit rows. Raise the test pool (e.g. `max: 5`) so the test can see the race.

Repro:
```
sed -i "s/.where(eq(t.userId, person)).for('update');/.where(eq(t.userId, person));/" apps/api/src/routes.ts; pnpm test:db
then the same against a local API on :8798, 5 parallel identical setting.set, 5 rounds
```
Output:
```
pnpm test:db:  Tests  33 passed (33)
live API:      probe (no FOR UPDATE) day 2: audit added 1
               probe (no FOR UPDATE) day 3: audit added 3
               probe (no FOR UPDATE) day 4: audit added 1
```

#### 31 · Minor · A NUL in the email still gives a 500 on both sign-in routes

Finding 20's guard is in `readJson`, which the commands use. The send-code route reads its body itself (`c.req.raw.clone().json()`), and Better Auth's sign-in route reads its own. A `\u0000` in `email` reaches Postgres (22021) and comes back 500. Better Auth's is a 500 with an empty body.

Repro:
```
curl -X POST :8795/api/auth/email-otp/send-verification-otp -H 'content-type: application/json' -d '{"email":"qa-ben@example.com\u0000"}'
curl -X POST :8795/api/auth/sign-in/email-otp -H 'content-type: application/json' -d '{"email":"qa-ben@example.com\u0000","otp":"123456"}'
```
Output:
```
NUL email (send)      {"code":"server","message":"Something went wrong on Sen’s side."} [500]
NUL email (sign-in)    [500]   (empty body)
server log: routine: 'report_invalid_encoding_int'
```

#### 33 · Minor · An `Origin: null` or malformed Origin on a write gives a 500

The new origin guard does `new URL(origin)`, which throws on `null` (sent by browsers from sandboxed frames, `file:` pages and some redirects) and on junk, and the throw becomes a 500. It should be the 403 the guard means.

Repro:
```
curl -b ben.jar :8795/api/commands -H 'content-type: application/json' -H 'origin: null' -d '{"type":"setting.set","key":"you.payday","value":{"kind":"day","day":7}}'
```
Output:
```
origin null      {"code":"server","message":"Something went wrong on Sen’s side."} [500]
origin garbage   {"code":"server","message":"Something went wrong on Sen’s side."} [500]
```

#### 34 · Note · The NUL guard also refuses the six characters \u0000 typed as text

The guard matches the escape's text in the raw body, so a value holding a real backslash followed by u0000 (JSON `\\u0000`) is refused although it has no NUL. Nobody's bank name looks like that; noted for later free-text fields (notes, Sen's chat).

Repro:
```
-d '{"type":"setting.set","key":"you.bankNames","value":"TAN\\\\u0000 BIN"}'
```
Output:
```
backslash name   {"code":"invalid","message":"That has a character Sen can’t keep."} [400]
```

#### 35 · Note · A send whose mail server doesn’t answer waits 2 minutes before saying so

Sen now awaits Gmail, so an unreachable SMTP host holds the request for nodemailer's 2-minute connect timeout. Sign-in's button stays disabled with no word until the 502 arrives. A wrong app password fails fast; this is only the unreachable case. A shorter `connectionTimeout` (say 15 s) would say so sooner.

Repro:
```
production-target API with GMAIL host unreachable; time curl … send-verification-otp
```
Output:
```
{"code":"mail_failed",...} [502]
real 2m0.074s
```

#### 36 · Note · The send route falls through to Better Auth for a body it can’t read, and no longer checks Origin

When `email` isn't a string of up to 254 characters, the pre-check is skipped and Better Auth's own handler answers. For a 10 000-character address that's `200 {"success":true}` (Better Auth's answer for an unknown user), so the screen would say a code was sent rather than *invitation-only*. And since the route no longer reaches Better Auth for a readable body, Better Auth's Origin check no longer runs on it: a foreign Origin gets 200. Both are reachable by curl anyway; neither sends a code to anyone who wasn't invited.

Repro:
```
curl … send-verification-otp -d '{"email":"aaaa…(10 000)@x.com"}'; curl … -H 'origin: https://evil.example' -d '{"email":"qa-ben@example.com"}'
```
Output:
```
email 10k chars   {"success":true} [200]
foreign origin    {"success":true} [200]
```

### Run 2's findings, re-checked

- **27** (Note, open): A code sent just before a suspension still signs in. left on purpose (ledger): every route then 403s and the app says paused
- **18** (Major, fixed): A failed code email answered 200 “success”. 502 mail_failed, no code row (AC-81); probe 2 caught. Waits 2 minutes when the host is unreachable: finding 35
- **19** (Major, fixed): Run 1's web fixes were pinned only in qa/e2e. Reverted signedOut(): pnpm test 2 failed (auth.test.ts), e2e:server 1 failed (*opened offline*); consumed-once paused reason: e2e:server *a suspended person is told* failed
- **10** (Minor, fixed): A suspended person with a live session wasn’t told. FLOW-21 and FLOW-32 pass; CI pins it
- **20** (Minor, fixed): A NUL in a name gave a 500. commands → 400; probe 4 caught. The auth routes still 500: finding 31
- **21** (Minor, fixed): Undo on You didn’t redraw. FLOW-22 passes
- **22** (Minor, fixed): Concurrent identical writes were audited twice. live API: 1 row a round; chain consistent. Its test can’t fail: finding 32
- **23** (Minor, fixed): You turned into an error offline in a browser. FLOW-24 passes. The kept answers it added outlive a revoked session: finding 30
- **24** (Minor, fixed): Sign-in’s email field wasn’t focused. FLOW-25 passes; the diff shows the focus ring on sign-in, first-run and their states in all 12 pairs
- **29** (Minor, fixed): A long email on Account was clipped. FLOW-26 passes
- **25** (Note, fixed): Unknown /api/auth paths answered an empty 404. {"code":"not_found","message":"No such route."}
- **26** (Note, fixed): The API’s routes checked neither Origin nor Content-Type. 403 and 415 as meant; Origin null is a 500: finding 33
- **28** (Note, fixed): docs/local.md’s Q14 SQL kept the case. now lower('you@outlook.com')

## Probes

| What was broken | Caught? | Note |
|---|---|---|
| signedOut() reads offline as signed out (auth.ts) | Yes | pnpm test: 2 failed (auth.test.ts); e2e:server: *opened offline* failed (finding 19 fixed) |
| mail failure answered as success (app.ts) | Yes | api.test.ts (18) failed |
| FOR UPDATE removed from setYou (routes.ts) | **No** | pnpm test:db 33/33 green: the test pool has max 1 (finding 32); a live API then wrote 3 audit rows in one round |
| NUL check removed (errors.ts) | Yes | api.test.ts (20) failed |
| origin check removed (app.ts) | Yes | api.test.ts (26) failed |
| the old code not deleted before a new one (app.ts) | **No** | green, but two sends still leave 1 auth_verification row, so Better Auth replaces it itself: the line is redundant, not untested behaviour |
| the one-at-a-time sign-out lead removed (router.tsx) | **No** | green: with the paused reason now kept until the next sign-in, the race no longer loses the message, so nothing observable broke |
| the paused reason consumed once again (auth.ts) | Yes | e2e:server *a suspended person is told* failed |

After each probe, `git status` showed no app source changed. The diff run's head build ran while one API-only probe was applied, which the catalogue doesn't touch, so its report says *with uncommitted changes*.

## Diff and eyes

The diff run covered 87 entries:
- **Changed:** `settings/account` (tree and pixels, as in run 2), plus the pixels of `sign-in`, `first-run`, `sign-in@invited` and `first-run@without-capture`, in all 12 pairs: the email field now opens focused, with each look's focus ring (finding 24). Every change is one the fixes call for.
- **Check findings:** none.

Account's long-email wrap shows only with a long address (FLOW-26 passes).

## What I couldn't test, and why

- **Sign-in in production:** production deploys only from main; the run-3 fixes are proved on local production- and preview-target APIs.
- **A real Gmail failure on Vercel:** no production credentials; an unreachable SMTP host stood in.
- **AC-88s, a refetch overwriting an unsaved draft on You:** no way found to cause a refetch while a draft is open (staleTime Infinity, no refetch on focus).
- **The full pnpm e2e:** scoped run: the diff run re-ran the whole catalogue in all six looks against main instead; e2e:server, unit, database and QA specs ran in full.
- **The eyes pass as a separate helper:** no Agent tool; the reviewer looked at the diff’s changed screens itself.
- **Everything outside the three areas:** scoped mode.
