# Claude Security results

A scan of the whole Sen repository (`C:/Zhong Tai/Sen`) at commit `cf2a525` on branch
`B06/jobs-realtime-backups`, the same code as `main` after B06's merge. It started on 28 Oct 2026 at
high effort, focused on production code an attacker can reach, and finished on 3 Nov 2026 after two
pauses for the account's usage limit (the finished parts were kept). **Six findings survived
verification, all LOW**: none Critical, High or Medium. Three of them are about the unauthenticated
sign-in code route.

## Coverage

The inventory split the tree's 1,720 tracked files into 10 components (about 48 asked for, of roughly
25 files each, at most 48 kept): `api` (apps/api), `db` (packages/db), `worker` (apps/worker),
`shell-android` (apps/shell/android), `shell-core` (the shell's capture core, curated data, offline
page and scripts), `web-app` (apps/web/src and its config), `web-build-scripts` (apps/web/scripts and
public), `core` (packages/core), `looks` (packages/looks) and `repo-scripts-ci` (scripts and .github).
Every top-level directory was accounted for, scanned or skipped on purpose.

Skipped on purpose:
- `apps/web/e2e`, `apps/web/playwright.config.ts`: "Playwright tests and recorded accessibility
  trees; test code".
- `.claude`: "Agent skills and tooling configuration, not shipped product code".
- `docs`: "Design documents, briefs and static design pages; not production code".
- `licenses`: "License texts".
- `qa`: "QA harness, limits, mutants and artifacts; test tooling not shipped".

All 63 researchers returned: two per component for each of injection and input handling,
authentication and authorization, and cryptography and secrets, plus two breadth sweeps and a secrets
pass. None of the groups' researchers was asked about memory-safety bugs: the workflow took the code
to be all in managed languages and dropped that lens for `api`, `db`, `worker`, `shell-android`,
`shell-core`, `web-app`, `web-build-scripts`, `core`, `looks` and `repo-scripts-ci` before briefing
them.

What the researchers report not having read: tests, fixtures and generated files in every component,
left as background (`apps/api/test`, `packages/db/migrations/meta`, `packages/db/test`, the worker's,
core's and scripts' `*.test.*` files, `apps/shell/android/app/src/androidTest`,
`apps/shell/core/src/test`, `apps/web/src/dev`, the Gradle wrapper and `.wrangler` build output).
Within `web-app`, `apps/web/src/blocks/charts.tsx` was read only in part (lines 75–260), the rest by
grep. Within `looks`, `packages/looks/src/line/index.ts`'s canvas geometry was not read, only its
markup and DOM reads. Checked against the components' 492 tracked files: 204 were read to a
conclusion, 211 lie under a declared not-reached path, and 77 no researcher accounted for. All 40 of
the unaccounted paths listed are PNG icon resources, such as
`apps/shell/android/app/src/main/res/drawable-hdpi/ic_stat_instrument.png`.

The panel took one verification run. No candidate was lost or left unverified. The panel lowered
three findings' severity (F1, F2, F3; see each).

## Findings

### F1 — The sign-in code route says whether an email has a Sen account and whether it is suspended (LOW, confidence high)

**Impact.** An unauthenticated caller learns who belongs to an invitation-only finance app and which
members are suspended. No financial data is exposed.

**Where.** `apps/api/src/app.ts:136` in `createApp` (the POST /api/auth/email-otp/send-verification-otp
handler) — CWE-204

**What.** The route posts the email to `auth_sign_in_check()` and answers in three ways: 403
`not_invited` (line 136), 403 suspended (line 137), or 200 with a code sent. Better Auth's own route
answers the same whatever the email; this one was written to tell the screen, and the comment at
lines 104–107 accepts revealing membership. Nothing caps lookups across IPs.

**Exploit scenario.** With a list of candidate emails, an attacker posts `{email, type:'sign-in'}`
for each, spreading requests over IPs to stay under 20 a minute per IP. `not_invited` means not a
member, suspended means a paused member, and 200 means an active member, who is also emailed a code.
The list of members then serves phishing or code guessing (F3).

**Preconditions.**
- Network access to the API.
- The per-IP lookup limit (20 a minute) can be spread across several source IPs.

**Fix.** Either answer the same for every address, or, keeping the on-screen *not invited* that the
comment accepts, stop revealing the suspended state and add a lookup limit that doesn't depend on the
client IP. Record whatever is kept as a risk the owner accepted.

**Verification.** 3/3 lens verifiers confirmed. The panel lowered it from MEDIUM to LOW (confirming
votes: LOW, LOW, LOW).

### F2 — `auth_sign_in_check` tells members, non-members and suspended members apart for an unauthenticated caller (LOW, confidence high)

**Impact.** As F1, from the database side: an attacker learns which addresses have accounts and which
the admin suspended, which helps targeted phishing. No data or access beyond that.

**Where.** `packages/db/migrations/0005_sign_in_check.sql:9` in `auth_sign_in_check` — CWE-204

**What.** The SECURITY DEFINER function reads across every `auth_user` and `user_access` row and
returns `ok`, `not_invited` or `suspended` for any email. It is called with the unauthenticated
request's email (`apps/api/src/app.ts:134`), and the API turns each answer into a different response.

**Exploit scenario.** The same request as F1, for addresses of the owner's friends and family; each
answer is told apart the same way.

**Preconditions.**
- The API is reachable over the network; no session is needed.
- The attacker has candidate addresses.
- 20 lookups a minute per client IP (by `x-forwarded-for`).

**Fix.** Keep the function's three-way answer inside the server: have the route answer one way for
every address and send any *not invited* or *paused* notice by email. If the on-screen *not invited*
stays, at least merge *suspended* into the generic answer and add a global lookup limit.

**Verification.** 3/3 lens verifiers confirmed. The panel lowered it from MEDIUM to LOW (confirming
votes: LOW, LOW, LOW).

### F3 — Guessing sign-in codes has no per-account failure limit; each new code brings 3 more tries (LOW, confidence medium)

**Impact.** After a long but unbounded campaign, takeover of an invited member's account, the admin's
included, and with it their financial data.

**Where.** `apps/api/src/app.ts:146` in `createApp` (the send-verification-otp handler) — CWE-307

**What.** Anyone can ask for a fresh 6-digit code for any invited email; it goes to the victim. Each
new code replaces the last and comes with Better Auth's 3 tries. The only limit tied to the account is
5 codes per email per 10 minutes; nothing counts failures across codes or locks the address.

**Exploit scenario.** For a known member's email, the attacker asks for a code, makes 3 guesses at
`/api/auth/sign-in/email-otp`, and repeats within the 5-per-10-minutes window: 15 guesses every 10
minutes, about 2,160 a day, against 1,000,000 codes. That is about 1% in 5 days, 6.5% in a month and
55% in a year for one account. A right guess gives a 90-day session as that person. The victim's inbox
fills with codes, but nothing stops it.

**Preconditions.**
- Production (previews use a fixed code by design).
- The attacker knows an invited member's email (F1 confirms one).
- A campaign kept up for weeks or months, one code email to the victim per request.

**Fix.** Bound the guesses per address over a day, not just per code: a daily cap on sign-in tries
and on codes per email, so the odds stay negligible over years, and tell the admin when an address
hits it.

**Verification.** 3/3 lens verifiers confirmed. The panel lowered it from MEDIUM to LOW (confirming
votes: MEDIUM, LOW, LOW).

### F4 — The offline copy of /me and /settings outlives a session the server ended, and shows on the next offline launch (LOW, confidence medium)

**Impact.** Whoever holds the device after the session was revoked can still read the previous
person's identity and settings. The exposure grows as later slices move more reads into `kept()`.

**Where.** `apps/web/src/data/auth.ts:45` in `load` — CWE-524

**What.** The app keeps the /me and /settings answers in localStorage (`sen.api.kept`) and serves them
when the API can't be reached. The copy is cleared only by `forgetSession()` (on a 401 or 403 from
another request) and by an explicit sign-out. The usual sign of a revoked or expired session,
`GET /auth/get-session` answering 200 with no user, makes `load()` return null and the router go to
sign-in without clearing it.

**Exploit scenario.** A loses the phone and uses *Sign out everywhere* from another device. Whoever
has the phone opens Sen online: the session check answers no user and sign-in shows, but the copy
stays. In airplane mode they relaunch: the check fails, the gate lets the cached state in, and More
and Settings render A's email, admin flag, switches, name as banks print it, payday and backup facts.

**Preconditions.**
- The device in another person's hands, after the session ended without a 401 or 403 reaching it.
- One online launch that sees the session end, then an offline launch.

**Fix.** Treat a session check with no user as a session end and clear the kept copy there (with
realtime and push stopped, as `forgetSession()` does), and tie the copy to the person it belongs to.

**Verification.** 2/3 lens verifiers confirmed.

### F5 — `qa-diff` runs `pnpm install` and `vite build` in a predictable temp folder it trusts because it exists (LOW, confidence medium)

**Impact.** On a shared Linux machine, another local user who creates the folder first gets code run
as the developer.

**Where.** `scripts/qa-diff.mjs:117` at module scope (main's worktree and the two builds) — CWE-377

**What.** The base worktree is `os.tmpdir()/sen-base-<first 8 hex of origin/main's SHA>`, predictable
because the repo is public. If `<path>/.git` exists, the script checks no ownership and runs no git
there, so git's own ownership check never runs; it goes straight to `pnpm install` (the root
package's lifecycle scripts) and `vite build` (which loads that folder's `vite.config`).

**Exploit scenario.** After a push to `main`, a local user creates `/tmp/sen-base-<sha8>/` with a
`.git` file, a `package.json` whose `preinstall` runs their code, a matching lockfile and
`apps/web/vite.config.ts`. The developer's next `node scripts/qa-diff.mjs` runs both as the
developer. `scripts/mutants.mjs`' fixed `sen-mutants` folder is the same shape, though git runs there
first and its ownership check stops it.

**Preconditions.**
- A multi-user machine with a shared temp folder; not a single-user laptop or a cloud VM.
- The attacker acts between a push to `main` and the developer's next run.

**Fix.** Keep the worktrees in a per-user place inside this repository's git folder, and before
reusing one, check that git lists it as a worktree of this repository.

**Verification.** 2/3 lens verifiers confirmed.

### F6 — No global cap on sign-in emails: one IP can flood an invited person and use up Sen's Gmail quota for everyone (LOW, confidence medium)

**Impact.** Hundreds of code emails a day to an invited person, then nobody can sign in until Gmail's
daily quota resets.

**Where.** `apps/api/src/app.ts:148` in `createApp` (the send-verification-otp handler) — CWE-770

**What.** Each unauthenticated request that passes the per-IP and per-email limits sends a real Gmail
message. The only bound is 5 per email per 10 minutes, about 720 a day per address, with no global or
daily cap, while Gmail's daily sending quota is lower.

**Exploit scenario.** The attacker posts to the route for one or more invited addresses, 5 per address
every 10 minutes from one IP. Sen's Gmail account reaches its daily limit or is flagged; every later
send fails, line 151 drops the unsent code, and nobody gets a sign-in code that day.

**Preconditions.**
- Network access to the API.
- At least one invited address (F1 confirms one).

**Fix.** A daily cap on sign-in emails across all addresses, set below Gmail's quota, and a daily cap
per address.

**Verification.** 3/3 lens verifiers confirmed.

## What was verified

Each finding was proposed by researchers reading the code, then put to a panel of three verifiers,
one each for reachability, impact and defenses. A finding needed two of three votes to stay: F1, F2,
F3 and F6 had 3/3, and F4 and F5 had 2/3. Of 13 distinct candidates, these 6 survived. Nothing was run:
no tests, no requests, no exploit. Every finding comes from reading. The stamp's verification status
is the one `render_report.py` prints beside this report.

## What was done (3 Nov)

Copied from `CLAUDE-SECURITY-20261028-171453/` (gitignored, kept on the laptop with its JSONL, SARIF
and revision stamp). Every finding is LOW, so none blocks by the `qa` skill's tiers; the owner asked
for what was found to be fixed, so each is fixed or put to the owner.

| Finding | What changed | Test that catches its break |
|---|---|---|
| F1, F2 | Nothing yet: revealing whether an email is invited, and when access is paused, is the sign-in screen's design (the comment at `apps/api/src/app.ts`, flows.md). **The owner's call**, in the handoff | — |
| F3 | Production gives an address 10 codes a day (`LIMITS.codesPerEmailDay`), each with Better Auth's 3 tries: 30 guesses a day, about 1% a year. Tries get no cap of their own: the commit review showed it would let anyone lock a person out without one email | `apps/api/test/api.test.ts`: *gives one email at most its daily codes, however they are spaced*; *takes a new code after three wrong ones* (the 3 tries) |
| F6 | Production sends at most 200 codes a day in all (`codesPerDay`), below Gmail's quota, and logs when it's reached; one client address asks for at most 30 (`codesPerIpDay`). Someone with many addresses can still stop sign-ins for the rest of a day, but Gmail no longer flags Sen's account | *sends at most Sen’s daily number of codes in all*; *gives one address at most its daily codes* |
| F4 | A session check answering *nobody signed in* clears the offline copy and stops realtime; the copy is marked with whose it is, and someone else's is dropped | `apps/web/src/data/auth.test.ts`: *are forgotten when the server says nobody is signed in*, *are only ever the signed-in person’s* (both fail with the fix taken out) |
| F5 | `qa-diff` and `mutants` keep their worktrees in this checkout's `.git/sen-qa/`, and reuse one only if git lists it as this repository's | — (QA tooling; run by hand) |

Previews and a local server keep no daily caps: they send nothing and take one fixed code.

**Accepted with the fixes:** whoever knows an invited email can use up its 10 codes and stop that
person signing in until the next day, though they get every one of those emails. Sessions last 90
days, so it bites only someone signing in that day.
