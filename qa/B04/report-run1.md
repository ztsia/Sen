# B04 · QA report (run 1, full)

Published, with every screenshot: https://claude.ai/artifact/EysS8ku2w263ugj35pFXG3

**VERDICT: fix first**

90 criteria, 62 pass, 17 fail, 11 not reachable. Phases run: 1-6 (phase 4: no database, API or RLS exists; run against the fake and shared zod types). Screenshots: `qa-artifacts/B04-skeleton-rest/screens/` (202). Specs: `qa/e2e/b04-*.spec.ts`; criteria and flows: `qa/B04/acceptance.md`, `flows.md`.

The skeleton is solid on money, looks and production hygiene (no float, no secret, no leak, 703/703 suite, 24 routes with no small targets), but a double tap on any B04 action leaves an Undo that does nothing, and the public split's lock rule has no test.

Suites (from the sweep): unit 287/287, e2e 703 passed (preview and production), typecheck and lint clean. `pnpm hygiene` passed. Criteria were written from the docs before any B04 source was opened.

## Findings, worst first

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 1 | Major | A double tap on any B04 action replaces the toast with the no-op's message, and Undo then does nothing | AC-69, AC-11s; patterns.md §7 Toasts and undo (QA B03 run 2 finding 17) |
| 2 | Major | Nothing tests that a split must not lock while an item is unclaimed on the public page, and the app-side rule is caught only by a browser journey | AC-4, AC-4s; D71; spec §7 |
| 3 | Minor | A closed public link returning the real merchant and total is not caught by any test | AC-7s; screens.md split-public Varies |
| 4 | Minor | `split-public` says Sen remembers this browser, but a reload forgets the name | AC-7; spec §7 (random token kept in that browser), D64 |
| 5 | Minor | With the agent switch off, Sen's button still shows | AC-8; screens.md rules; D52 |
| 6 | Minor | The friend scenario (`month`) shows owner-only things, and a switched-off feature still opens by URL | AC-22, AC-22s, AC-71; spec §9.6, D52 |
| 7 | Minor | Settings -> Appearance: pinning a look is forgotten when you leave the screen; the reveal's switch pins nothing | AC-23s, AC-33; screens.md new-look, patterns §9 |
| 8 | Minor | The simulator's *A notification arrives* asks again after the rule exists | AC-34s, FLOW-C2; spec §6.3, §8 |
| 9 | Minor | Made-up claims and payday data contradict each other | AC-61 (coherence), spec §13, D45 |
| 10 | Minor | `claim` and `account` with no id hang on Loading | AC-16s; patterns §7 Error |
| 11 | Minor | The shared command schemas (`packages/core/src/commands.ts`) accept hostile input, and `balance.check` can double-book | AC-60, AC-17s; spec §16, §17 |
| 12 | Minor | Members: invite and member sheets lack what §9.6 lists | AC-26, AC-26s; spec §9.6, D98 |
| 13 | Minor | `paid-back` has no *Write off*, and `gap`'s answers don't open `manual` with the day | flows.md paid-back, gap; D19, D101 |
| 14 | Minor | `sign-in` has no expired-invitation state | AC-29; flows.md invited |
| 15 | Minor | *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard | AC-19s; spec §13, §13.1 |
| 19 | Minor | Scanning the same file twice does not say Already added | AC-40; flows.md scan-after; spec §6.5 |
| 16 | Note | First run saves nothing and its sad paths don't reach Home | AC-30, AC-30s; flows.md first-run |
| 17 | Note | Canned Sen replies sound like analysis | spec §12.2 |
| 18 | Note | Small things | AC-66; patterns §7 |

### 1 · Major · A double tap on any B04 action replaces the toast with the no-op's message, and Undo then does nothing

patterns.md §7's tap guard (`lib/tap-guard.ts`) is imported only by B03's files (`rows.tsx`, `review.tsx`, `skipped.tsx`, `txn.tsx`). No B04 screen uses it. A second tap runs the command again; the fake answers `Already …` with `touched: []`, that message becomes the toast, and its Undo restores a state that is already the changed one. The first change stays, and the person has no way to undo it. The same happens on *Submitted* (claim), and by the same code path on *Lock without waiting*, *Everyone* and the Sen *Apply*-style buttons.

**Repro:** dev server or preview: More -> Shared bills -> HAIDILAO -> double-tap "I've paid", then tap Undo in the toast. Spec file: qa/e2e/b04-dbl.spec.ts (split) and b04-claims.spec.ts (claim).

```
split: toast after dbl: "Already marked as paid\nUndo"  ->  paid after Undo: 1
(single tap: toast "Marked as paid to Mei\nUndo" -> paid after single Undo: 0)
claim: toast after dbl submitted: "Already submitted\nUndo"  status: submitted  status after undo: submitted
```

### 2 · Major · Nothing tests that a split must not lock while an item is unclaimed on the public page, and the app-side rule is caught only by a browser journey

Probe: dropped `&& s.items.every((i) => i.takers.length)` from `lockIfReady` in `data/fake/public-split.ts`. The unit suite stayed 26/26 and the whole split e2e group stayed 39/39. The D71 rule (a split locks only when everyone is done AND every item is claimed) therefore has no test on the friend's side, which is the side that handles real money in B18. On the app side (`maybeLock` without `!unclaimedOf`), `splits.test.ts` also stayed green; only the e2e journey `split-mine` went red (12 failures). Closed-link leak probe also survived (see probes).

**Repro:** Edit public-split.ts as above; `pnpm exec vitest run apps/web/src/data/fake/areas/splits.test.ts`; `pnpm exec playwright test --project=preview -g split` in apps/web.

```
unit: Test Files 1 passed (1), Tests 26 passed (26)
e2e (public probe only): 39 passed (2.5m)
app-side probe, e2e: 12 failed (split-mine in every look, light and dark); unit: 26 passed
```

### 3 · Minor · A closed public link returning the real merchant and total is not caught by any test

Probe: `readPublicSplit` for a closed link returned `merchant: s.merchant, total: 6413` instead of empty. `splits.test.ts` asserts only `state, items, people, pay, you` with `toMatchObject`, so the probe stayed green. The screen hides it (`Closed` draws one line), so nothing shows today, but the contract B18 copies is `This split is closed, and nothing else` (screens.md).

**Repro:** Edit the closed branch in public-split.ts; run splits.test.ts.

```
Tests 26 passed (26)
```

### 4 · Minor · `split-public` says Sen remembers this browser, but a reload forgets the name

Naming yourself shows `Hi <name>. Sen remembers this browser.`; the state lives in a module Map, nothing is written to localStorage/cookie. After a reload the name box is back. (The `demo` token is a canned remembered Mei, which hides this.)

**Repro:** /s/split-public?id=demo-new -> enter a name -> Continue -> reload.

```
STORAGE {"l":{},"s":{}}
AFTER RELOAD has name box: true has Hi: false
```

### 5 · Minor · With the agent switch off, Sen's button still shows

`frame/app-shell.tsx` shows the button on `showsSenButton(screen)` only; it never reads `me.agent`. screens.md and D52: with the agent off there's no Sen button. No scenario turns the agent off, so the dev panel can't show it.

**Repro:** dev server: set `db.agent = false` through the fake, navigate to Home.

```
agent=false: Ask Sen button count on Home: 1  | me.agent: false
```

### 6 · Minor · The friend scenario (`month`) shows owner-only things, and a switched-off feature still opens by URL

`?scenario=month` (a friend in a browser) keeps `settings.admin = true`: Settings lists Members, Data shows *Last backup* (admin only), Settings -> Sen shows the owner's cost estimate rather than credit and allowance. `/s/claims` with the claims switch off shows the full September claims (only `/s/settings/claims` says *Claims are off for you*). `settingsView` returns the whole `members` list to anyone. The non-admin branch of Members (`Only the admin sees Members.`) can't be reached by any scenario. Hiding is only a menu hide here; B05's API must enforce (D52).

**Repro:** /s/settings?scenario=month ; /s/claims?scenario=month ; /s/settings/data?scenario=month

```
settings (friend): [... "Features","Sen","Members","Data and account" ...]
claims direct, no claims: ["Claims","September 2026","","To submit · evidence complete","","Phone bill","RM88.00" ...]
data: Backups | Last backup | Yesterday, 03:00
```

### 7 · Minor · Settings -> Appearance: pinning a look is forgotten when you leave the screen; the reveal's switch pins nothing

The look and the mode persist, but `quarterly` is `useState(true)` in Appearance, and new-look's *Change each quarter* switch is local too. After pinning Copper and returning, the screen reads *Changes each quarter* and says the next change date. In new-look, switch off + *Keep it* leaves Appearance at *Changes each quarter*. The code says B14 stores it; the brief listed new-look's frame including the switch.

**Repro:** Settings -> Appearance -> Copper -> back -> More -> Settings -> Appearance.

```
return: quarterly checked? true | copper checked? false
reload: look copper mode dark | quarterly checked? true
```

### 8 · Minor · The simulator's *A notification arrives* asks again after the rule exists

It always shows the hard-coded ROTI BAKAR 88 prompt. After answering Meals the rule exists (`rules: ["ROTI BAKAR 88"]`), yet a second arrival shows the prompt again and answering it again 'makes' the same rule. The end state of `pay-new` (second payment asks nothing) and 'a second new merchant replaces the first prompt' can't be walked.

**Repro:** Dev panel -> A notification arrives -> Meals -> A notification arrives.

```
after answer 1: {"rules":["ROTI BAKAR 88"],"roti":0 ...}
arrival 2: prompt visible true
```

### 9 · Minor · Made-up claims and payday data contradict each other

Settings -> Claims: Phone bill cap RM80.00, deadline day 7; Claims: the September claim is RM88.00 'capped at RM100.00', 'Submit by 25 Oct' (parking 20 Oct). The claim exceeds its scheme's cap, which §13 says is applied. Payday step 1 says 'Sen split RM152.00 of claims from your salary' while both September claims are still *To submit* and Home still reads Left until payday RM5,800.00 (no RM152 taken out as D45 says). ESS references differ in format (ESS-26-04417 vs ESS-26-5700). Skipped-step labels say 'October's claims question' on a November payday. The owner reviews this data on the phone, so it should agree with itself.

**Repro:** /s/settings/claims ; /s/claims ; /s/payday?scenario=payday

```
(see text dumps tour-settings-claims.txt, tour-claims.txt, tour-payday.png)
```

### 10 · Minor · `claim` and `account` with no id hang on Loading

`/s/claim` and `/s/account` (no `id`) show the skeleton forever; `split`, `txn`, `receipt` and a wrong id show *… isn't here any more*.

**Repro:** /s/claim ; /s/account

```
== claim "Claim | Loading | ..."   == account "Account | Loading | ..."
```

### 11 · Minor · The shared command schemas (`packages/core/src/commands.ts`) accept hostile input, and `balance.check` can double-book

No B04 free-text field has a max length (100k-character email, Sen text, friend name, essRef all ACCEPTED); `balance.check` allows 10,000 rows and duplicate `accountId`s. With a duplicate, both adjustments are computed from the same snapshot, so after typing RM14,750.87 the balance is RM14,850.87. `member.set` `grant` takes any safe integer and the balance sums past it (`safe: false`). The UI can't produce these (parseSen caps at RM99,999,999,999.99, one box per account), but B05 turns these schemas into the API's contract.

**Repro:** qa/e2e/b04-cmd.spec.ts (dev server).

```
dupCheck: {before:1465087, typed:1475087, after:1485087}
invite 100k email: ACCEPTED ; sen.send 100k text: ACCEPTED ; split.assign 100k name: ACCEPTED ; balance.check 10000 rows: ACCEPTED
grantOverflow: {balance:18014398509482324, safe:false}
```

### 12 · Minor · Members: invite and member sheets lack what §9.6 lists

Welcome credit defaults to RM5.00 (spec: RM10, D98). The invite has no *Unlimited*; invited members have no *Resend* / *Revoke* (their sheet has only *Remove*); *Remove* doesn't offer their export. `<script>@x.co` passes the email check and creates a member (rendered as text, inert).

**Repro:** Settings -> Members -> Invite; open Farid.

```
welcome default 5.00 | allowance 2.00
INVITE "<script>@x.co" => members 3 -> 4
```

### 13 · Minor · `paid-back` has no *Write off*, and `gap`'s answers don't open `manual` with the day

flows.md `paid-back`: 'or write their part off, which adds it to your spending (D19)'; `grep 'Write off'` finds nothing. `gap`: *Yes, I did* only records the answer (toast `Answered: Yes, I did`), and *Add a payment for Sat 4 Oct* opens `manual` with no day (known open point in the handoff). D101's *Pay with TNG* / *Save QR* aren't on `split` or `split-public` either.

**Repro:** Sen sheet -> Add a payment for Sat 4 Oct; split -> any locked split.

```
url after Add a payment: /s/manual   (Add expense | Amount | RM | Category | ...)
```

### 14 · Minor · `sign-in` has no expired-invitation state

flows.md `invited`: 'an expired invitation: *Ask for a new invitation*'. Not built (`grep "new invitation"` finds nothing). Wrong code, expired code and invitation-only are built and work.

**Repro:** /s/sign-in?email=… (no way to reach an expired state).

```
grep 'new invitation' apps/web/src: no match
```

### 15 · Minor · *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard

`essReady` is `settings.claims.ess.signedIn` only, so a browser preview shows *Send to ESS* (§13.1: shell only; the PWA submits by hand). *Copy* on Amount copies the formatted `RM88.00`, which ESS's amount field may not take.

**Repro:** /s/claims; /s/claim?id=… -> Copy next to Amount.

```
clipboard: "RM88.00"
```

### 19 · Minor · Scanning the same file twice does not say Already added

flows.md `scan-after` sad path: 'The same file twice: Already added (§6.5)'. Choosing the same image (identical bytes) a second time in /scan opened `confirm` again (new draft id, same receipt) with no message. This is scan/confirm code from B03, walked here because `scan-after` is a core journey.

**Repro:** /scan -> choose receipt.jpg -> Use this -> Done; /scan -> choose the same file -> Use this.

```
second scan same file: http://127.0.0.1:5180/s/confirm?id=26e97c3c-… Check the receipt | SATE KAJANG HJ SAMURI | Today, 20:40 ...
```

### 16 · Note · First run saves nothing and its sad paths don't reach Home

Choices (balances, name, payday) are kept in the component, so a reload mid-way keeps the step but loses what was typed (patterns §7 Forms). *Skip for now* on access doesn't lead to Home's *Capture is off*. Finishing lands on the ordinary Wei Ming Home (`Left until payday RM1,931.27`), not *Spent since you started* (only the guided journey's scenario shows that). The email field accepts 400 characters. *Start using Sen* is disabled with no words when every category is off. The guided `first-run` journey shows sign-in twice (its own step and first-run's step 1). Documented in the code as B08's job.

**Repro:** /s/first-run through all seven steps.

```
HOME after first-run: Sen | Sen | Home | 2 of 3 moves done | October's payday plan ... Left until payday | RM | 1,931.27
```

### 17 · Note · Canned Sen replies sound like analysis

Any free-form question ('What is my salary?', 'How much will I have saved by December?') gets "I looked at this cycle's payments. Nothing stands out…". No figure is invented, but it doesn't say it can't answer (§12.2). Skeleton canned text; B27 owns it.

**Repro:** Sen sheet -> type a question.

```
Q "What is my salary?" => "I looked at this cycle's payments. Nothing stands out, so I'd leave things as they are."
```

### 18 · Note · Small things

Accounts' *Elsewhere* row is 56 px (patterns §7: list rows 64 px or more). `?state=offline` is honoured in the production build (B03-era; shows the offline banner only). `Wed, 30 Sept` uses a different month abbreviation from `1 Oct`. A friend's Settings -> You hides *Names* correctly, and Account's sign-out rows are B05's, so AC-27 is not reachable.

**Repro:** /s/accounts ; production /?state=offline

```
/s/accounts rows: LI:Maybank No balance=56
```

## Probes (phase 3)

| Broke | Caught | Note |
|---|---|---|
| Largest remainder replaced by per-person Math.round(price/n) in the app's `sharesOf` | yes | splits.test.ts: 2 failed (shares sum 5832 vs 5830) |
| App side: `maybeLock` ignores unclaimed items | yes | unit suite stayed green (26/26); only e2e `split-mine` went red, 12 of 12 looks. Caught late, by a browser journey, not a unit test. |
| Public side: `lockIfReady` ignores unclaimed items | **no** | unit 26/26 and e2e -g split 39/39 stayed green. Finding 2. |
| Public page: ticking allowed after the lock | yes | splits.test.ts 'demo-final is read-only' failed |
| `balance.check` booking direction flipped (out/in) | yes | money.test.ts: 2 failed |
| Closed public link returns the real merchant and total | **no** | splits.test.ts 26/26 stayed green. Finding 3. |
| Members: 'You can't remove yourself' guard dropped | yes | admin.test.ts 'suspends and removes others, never the admin' failed |
| Credit refund allowed to go below zero | yes | admin.test.ts 'grants and refunds credit' failed |
| `DEV_TOOLS = true` (dev panel, fake and simulator in a production build) | yes | production.spec.ts:7 failed (dev tools); B04's own two production tests stayed green, so B01's test is what protects it. |

`git status` was clean of source changes after every probe.

## Phase 4

No SQL, API route or RLS exists in this slice, so there is no RLS matrix or route table. I checked the shared zod command schemas and the fake's writes instead (finding 11), and `split-public`'s isolation (AC-7u, passed).

## What I couldn't test, and why

- **Mercury and Copper WebGL in the real WebView, the real widgets, notification prompts, the island**: needs the device; queued in docs/local.md (B04 phone checks)
- **Offline then app killed, outbox syncs exactly once**: the skeleton fake is in memory and has no outbox; B07
- **RLS matrix, API routes, SQL views**: the slice has none; no database exists yet (B05)
- **A non-admin Members screen, agent-off, claims-off payday steps**: no scenario reaches them
- **OTP and non-allowlisted notifications**: native filter is B02; the B04 simulator carries no such input
- **Reduced motion in new-look; simulator-off restores state; four-option ask_user**: not run / not reachable
- **A note on my own tooling**: reads of the fake through my db() helper were sometimes stale after direct loads (one payday read said last-working while the UI had saved day 15); I rechecked those through the UI before reporting. Hangs seen in my offline specs came from a locator waiting without timeout, not from the app.

## Scope notes

- Walked at 412x915; the sweep ran the brief's 390x844 in six looks, light and dark, with axe.
- Timezone: 13 routes were identical in Asia/Kuala_Lumpur, Pacific/Auckland and America/Los_Angeles, but the fake pins its clock, so that is weaker evidence than a payment at 23:30 KL.
- Findings 4, 7, 8, 16 and part of 6 are things the code says belong to later slices (B05, B08, B14, B18); they are listed because the owner reviews this skeleton and the spec/brief names them.
- Docs: a phone-check entry for B04 was added to `docs/local.md`.
