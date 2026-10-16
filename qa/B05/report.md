# B05 · Server, database and sign-in: QA report (run 4, scoped, tier 2)

```
VERDICT   ship
          14 criteria in the area, 12 pass, 2 fail, 0 not reachable
          phases run: scoped (tier 2)      screenshots: qa-artifacts/B05/server-r4/screens/
```

All seven of run 3's fixed findings hold, and every probe now turns a test red, the lock's included. One new Minor: walking the body for NUL characters made a deeply nested JSON body a 500 again, reachable without signing in. No Blocker or Major is open.

**Area:**
- signing in and out, including what a session's end leaves on the device (§17 *Login*, §16 `/auth/*`);
- the API's handling of input (§16 *Validation*, *Errors*).

**Commits:** 15105b8..1205503 (2e6802c, 590b49e).

**Method:** the reviewer resumed. The new criteria (AC-90 to AC-93, in `acceptance.md` *Run 4*) were written after reading 2e6802c.

**Left out:** everything outside the two areas. No screen changed, so the diff run was not repeated.

**Ship, with finding 37 open:** it is a Minor, but it is a regression from run 3's fixes, it's reachable without signing in, and the fix is small. I'd fix it as tier 1 before the PR.

## Suites

| Suite | Result |
|---|---|
| unit | 336/336 |
| db | pgTAP 103/103, API 37/37 |
| e2e:server | 3/3 |
| qa specs | qa/e2e/b05-*: 33/33 |
| typecheck | clean |
| lint | clean |
| diff | not re-run: no screen changed in 15105b8..1205503 |

## Findings, worst first

| # | Severity | Status | What breaks | AC / spec |
|---|---|---|---|---|
| 37 | Minor | open | A deeply nested JSON body now gets a 500, on /api/commands and, unsigned-in, on every /api/auth POST | AC-90s, AC-75; spec §16 Errors |
| 27 | Note | open | Run 3: A code sent just before a suspension still signs in | qa/B05/report-run3.md |
| 38 | Note | open | Better Auth's own routes take `Origin: null`, and the send route takes `text/plain` | §17 |
| 30 | Major | fixed | Run 3: A revoked browser kept and showed the person’s data offline | qa/B05/report-run3.md |
| 32 | Major | fixed | Run 3: The concurrent-write test couldn't fail | qa/B05/report-run3.md |
| 31 | Minor | fixed | Run 3: A NUL in an email gave a 500 on the sign-in routes | qa/B05/report-run3.md |
| 33 | Minor | fixed | Run 3: Origin null gave a 500 | qa/B05/report-run3.md |
| 34 | Note | fixed | Run 3: The NUL guard refused the text \u0000 | qa/B05/report-run3.md |
| 35 | Note | fixed | Run 3: A silent mail server held sign-in for 2 minutes | qa/B05/report-run3.md |
| 36 | Note | fixed | Run 3: The send route fell through to Better Auth and skipped Origin | qa/B05/report-run3.md |

### New findings: detail, repro and real output

#### 37 · Minor · A deeply nested JSON body now gets a 500, on /api/commands and, unsigned-in, on every /api/auth POST

Finding 34's fix moved the NUL check onto the parsed body, and `hasNul` walks it recursively. A body nested a few thousand levels deep overflows the stack (`RangeError: Maximum call stack size exceeded`) and becomes a 500. Run 2 had this body as a 400. Under `/api/auth/*` it needs no session, so anyone can produce 500s and stack traces in the logs at will. Walk the value with an explicit stack, or cap the depth and answer 400.

Repro:
```
curl -X POST :8795/api/auth/email-otp/send-verification-otp -H 'content-type: application/json' --data-binary @<(python3 -c "print('['*100000 + ']'*100000)")
curl -b ben.jar :8795/api/commands -H 'content-type: application/json' --data-binary @<(python3 -c "print('['*5000 + ']'*5000)")
```
Output:
```
deep nest 100k (send)     {"code":"server","message":"Something went wrong on Sen’s side."} [500]
deep object 20k (send)    {"code":"server",...} [500]
sign-in deep nest         {"code":"server",...} [500]
deep 5k (commands)        {"code":"server",...} [500]
log: RangeError: Maximum call stack size exceeded
    at hasNul (/home/user/Sen/apps/api/src/errors.ts:67:17)
    at Array.some (<anonymous>)
```

#### 38 · Note · Better Auth's own routes take `Origin: null`, and the send route takes `text/plain`

Sen's guard refuses a `null` Origin (finding 33), but Better Auth's routes accept one: sign-in by code and sign-out both answered 200 with `Origin: null`. The send route, now Sen's, reads any content type. The `SameSite=Lax` cookie keeps a cross-site page from using either, and signing in needs the code. Noted for consistency.

Repro:
```
curl -X POST :8795/api/auth/sign-out -H 'content-type: application/json' -H 'origin: null' -d '{}'
```
Output:
```
sign-in origin null   {"token":"…","user":{"name":"Qa Chong",…}} [200]
sign-out origin null  {"success":true} [200]
text/plain (send)     {"success":true} [200]
```

### Run 3's findings, re-checked

- **27** (Note, open): A code sent just before a suspension still signs in. left on purpose (ledger)
- **30** (Major, fixed): A revoked browser kept and showed the person’s data offline. FLOW-31 passes: kept after the 401: undefined; offline You shows no payday. Probe: forgetKept() removed from forgetSession → auth.test.ts *are forgotten whenever the session is* failed
- **32** (Major, fixed): The concurrent-write test couldn't fail. FOR UPDATE removed: pnpm test:db 1 failed (3 of 3 fresh runs); clean 37/37 (3 of 3)
- **31** (Minor, fixed): A NUL in an email gave a 500 on the sign-in routes. 400 on both; probe caught. Deep nesting regressed: finding 37
- **33** (Minor, fixed): Origin null gave a 500. 403 on /api/commands and the send route; probe caught
- **34** (Note, fixed): The NUL guard refused the text \u0000. saved as typed; probe caught
- **35** (Note, fixed): A silent mail server held sign-in for 2 minutes. 502 in 10.077 s
- **36** (Note, fixed): The send route fell through to Better Auth and skipped Origin. 10k email, blank, wrong type → 400; foreign Origin → 403; probe caught. text/plain still accepted: finding 38

## Probes (each on a fresh `pnpm test:db` or `pnpm test`)

| What was broken | Caught? | Note |
|---|---|---|
| FOR UPDATE removed from setYou (fresh pnpm test:db, 3 runs) | Yes | "makes two identical writes sent at once one change and one audit entry (22)" failed 3 of 3; clean 37/37 3 of 3 |
| forgetKept() removed from forgetSession (auth.ts) | Yes | auth.test.ts "are forgotten whenever the session is" failed |
| NUL check on /auth/* removed (app.ts) | Yes | "refuses a NUL in an email on the sign-in routes with a 400 (31)" failed |
| sameOrigin() true for a malformed Origin (errors.ts) | Yes | "refuses a write with a null or malformed Origin with a 403, not a 500 (33)" failed |
| the send route's Origin check removed (app.ts) | Yes | "checks the send route’s body and Origin itself (36)" failed |
| hasNul matches the escape text again (errors.ts) | Yes | "keeps the text \u0000, which isn’t a NUL (34)" failed |

After each probe, `git status` showed no app source changed.

## What I couldn't test, and why

- **The diff run and eyes pass:** the fixes changed no screen (auth.ts logic, API only).
- **A device that stays offline from revocation on:** it never hears the 401, so its offline copy stays until it next reaches the server; inherent to opening offline.
- **Production sign-in and a real Gmail failure:** production deploys only from main; no production credentials.
- **Everything outside the two areas:** scoped mode.
