# Sen — Spec v2

**Status:** Draft, reviewed in `S1` · **Version:** 2.11 · **Date:** 2026-10-08 (2.0 was 4 Oct; 2.1 added the full stack and the design track; 2.2–2.4 are the `S1` review: decisions D14–D56, including a Capacitor shell around a web app (D42) and Vercel with Neon (D54); 2.5–2.7 are `S2`'s changes, from D57; 2.8 is the owner's 7 Oct refinement, D85–D102; 2.9 adds the ESS adapter, the payslip on payday and Sen's chat changes, D103–D110; 2.10 points §19 at `S3`'s slice map, D111; 2.11 settles the category guesses and the shared roster, D112–D113)

**Supersedes:** v0.16 (2026-07-21), which isn't in this repository: it stays in the owner's private design archive, as the record of *why* many carried-over decisions were made. This document cites it as "v0.16 §x" instead of repeating the reasoning.

**Decisions** are numbered in `docs/decisions.md` and cited here as D1, D2 and so on.

---

## 0. What changed, and why

Between July and October 2026 the priorities changed:

1. **Tracking is the core.** Money "evaporates" after payday with no idea where it went. The main job is knowing where every ringgit goes, with almost no effort.
2. **An AI agent is core.** Something that watches the money, warns early and helps manage it, the way a person would.
3. **Employer claims are a small feature.** Only two simple monthly schemes apply today, phone & data and travel (MyRapid), and more may come later, so v0.16's claims engine waits in a backlog rather than being cut (D50).

| Area | v0.16 | v2 | Why |
|---|---|---|---|
| Purpose | Claims/relief engine + tracking | Tracking + balances + agent; claims minor | Priorities above |
| Main input | Receipt photos | **Notifications and receipts together (D51):** notifications catch every payment; receipts say what it was | Notifications capture what you forget to snap; receipts give the items and categories |
| Platform | PWA | **A native Android shell (Capacitor) around a web app (D42)** | Only a native app can read notifications. A web UI keeps one codebase for the phone, a browser and a future PWA |
| UI components | shadcn/ui (web) | **shadcn/ui on Tailwind v4**, with this app's own design (D43) | The owner knows shadcn; source an agent can read |
| Verification | Playwright on the PWA | **Playwright on the real web UI**, Kotlin tests, the owner's phone | Cloud sessions have no Android emulator, and Android's WebView is Chromium (D42) |
| Backend | Next.js on Vercel | **A Hono API on Vercel Functions, Neon Postgres, Better Auth (D54)** | One platform for the app, the API and the agent, without server rendering |
| Schema tooling | Drizzle + Supabase CLI | **Drizzle alone:** schema, migrations, RLS policies and views | One tool owns the schema, which removes v0.16 §6.9's ownership conflict |
| Image enhancement | Server-side, at print time | **On the phone, at capture** (Google ML Kit Document Scanner) | You see and fix the crop while holding the receipt |
| Claims | Rule packs, allocation engine, paste-original pack, ESS guide | **Tag + a monthly draft + a submission kit and the printable claim pack (D45, D97), filed into ESS from the phone, which also fetches the payslip on payday (D96, D103–D106)** | Two simple monthly schemes |
| LHDN reliefs | e-Filing companion | **Optional tags + yearly totals** | Low value, and MyInvois pre-fill is taking it over |
| Income | A config value | **Detected from salary credits** | Notifications see it |
| Release | One big-bang release | **Use it for real from P3** | The tracking need is urgent |
| AI | One model (receipts); narration deferred | **Receipt reader + agent** | The agent is now a goal |
| Lunch pool | An n8n bot posts one lunch a day | **The prepayment is a shared bill. lunchbot sends each pool and reads the deposits this app matched (D23)** | Notifications now see the lump sum and colleagues' payments |

**Cut entirely:** the eligibility tri-state, render-time enhancement, the ESS fill guide, the e-Filing companion, server rendering, and the PWA as the only app (the web app now runs inside a native shell, and as a PWA for people without it, D52).

**In the backlog, not cut (D50):** the rule-pack YAML engine and its two-employer golden tests, and the allocation engine. The printable claim pack with paste areas is back (D97).

---

## 1. Overview

An Android app that tracks where your money goes, for you and, by invitation, a few friends and family (D52). It reads the payment notifications your bank and e-wallet apps already show, turns each into a transaction, and asks you only for what it can't know. Receipts are the other main input (D51): scanning one right after paying attaches the items, categories and evidence to the payment the notification already recorded. A payment with no receipt gets its *what* in one tap or a short note. An AI agent watches the data and talks to you about it, but never computes a number itself.

**The question it answers:** *Where did my money go, what's left, and am I on track?*

---

## 2. The user and the problem

- A salaried employee in Malaysia. Spending feels like it evaporates, and there's no trustworthy picture of where it goes.
- **How the money moves** (as of 5 Oct 2026):
  - Salary lands in **Public Bank** on the **last working day of the month**, and most of it moves straight on to **Ryt Bank**, which pays more interest. Ryt is the main account.
  - **TNG eWallet** is topped up from Ryt, mostly to send money to friends. Money is also kept in **GO+**, inside the TNG app.
  - Payments: **Google Pay with the Ryt debit card**, sometimes the **Public Bank debit card**, and TNG. A **physical TNG card** buys the monthly My50 transit pass and pays parking. Tolls on it are charged to the eWallet.
  - **Cash is seldom used, and there's no credit card.**
  - All three bank apps notify money arriving by transfer (`docs/notifications.md`). Public Bank may not notify money leaving it (§21 Q16), and whether card payments notify is still to be sampled (P0).
  - **Food is usually ordered on Grab**, often as a GrabFood group order where each colleague pays their own part, from the **GrabPay Wallet**.
- **The job may change.** Nothing may assume this employer: not the payday, the salary's payer or the claim schemes (D14).
- **Friends and family may join** by invitation (D52). Most would use Sen in a browser or as a PWA, without notification capture.
- **Petrol is paid by card at the pump**, which puts a hold on first and settles for the real amount about a minute later. Ryt notifies both (`docs/notifications.md`).
- Android phone: a **Xiaomi** on **HyperOS**, **Android 16**. No iOS.
- Employer claims: **phone & data** and **travel (MyRapid)** today. Others may come later.
- The reason to build rather than buy is unchanged: distrust of ad-funded finance apps holding purchase history (v0.16 §12.1).

---

## 3. Goals and non-goals

| # | Goal | Success looks like |
|---|---|---|
| G1 | Capture almost everything without effort | Notifications create transactions automatically; the rest takes one tap or a 10-second entry |
| G2 | Know balances | Per-account and total balance; the **unaccounted gap** visible and shrinking |
| G3 | Spending you can trust | Categories, trends, budgets, meal cost, drinks spend |
| G4 | An agent that watches and advises | Useful check-ins, honest answers, early warnings; never invents a figure |
| G5 | Savings goals grounded in reality | Feasibility checked against real surplus |
| G6 | Small: never miss a claim | Monthly reminder with the claimable amount |
| G7 | Evidence kept 7 years | Receipt images stored durably at print quality |

**Non-goals**
- No bank logins, open-banking APIs, scraping or SMS reading. The app only reads notifications the bank apps already show you, on your phone.
- Not double-entry accounting, although accounts, balances and transfers are modelled.
- No investments, net worth beyond account balances, or debt tracking.
- No iOS app and no Play Store. The Android shell is installed from a GitHub Actions build, by download link or over USB (§5.1). On iOS, Sen runs as a PWA without notification capture (D52).
- No open sign-up. A few friends and family join by invitation, each seeing only their own data (D52).
- Not tax advice. Not integrated with e-Filing or MyInvois. ESS is filed, and the payslip fetched, from the phone, by the owner's choice (§13.1, D96, D103).
- Not a hosted product. The source is public under AGPL-3.0 (D85), but nobody is supported to host it.
- Never moves money.

---

## 4. Principles carried over from v0.16

These held up and apply unchanged:

1. **Models draft, you confirm, code computes.** The receipt reader and the agent never produce a stored figure. Every number comes from SQL views or pure TypeScript (v0.16 §5.1). One kind of draft acts before you confirm it: a template for new notification wording books its payments at once, marked, and *No* undoes them, because code still reads every amount from the raw text (D87).
2. **Money is integer sen (`BIGINT`), never a float** (v0.16 §6.5). It's MYR everywhere except a subscription's declared amount, which is in its billing currency (§11, §15).
3. **A prediction and a fact never share a table.** Subscription forecasts, cost estimates and agent projections are never transactions (v0.16 §14.28).
4. **Evidence never changes after capture.** The stored receipt image and the raw notification text are immutable. Everything parsed from them can be re-derived.
5. **Silent failure is the worst bug.** Every background process has a heartbeat that something checks: the notification listener, scheduled jobs and backups (v0.16 §13).
6. **Every input has a dedupe key.** Retries and double-shares are no-ops.
7. **Secrets never ship in the app.** A key inside an APK can be extracted.
8. **The employer's handbook never enters the repo or any AI's context, and real claim values never enter the repo, test fixtures or a build session** (v0.16 §12.3, D10). Inside the app, Sen may see the claim values you typed (D95). A local session capturing ESS may see them too, and writes only to `private/` (D110).
9. **A metric earns its place only if it changes a decision.** Home shows at most four figures (v0.16 §7.14).

---

## 5. Architecture

**Three places, one rule each (D42, D54):**
- **The server** is one Hono API on Vercel Functions, over Neon Postgres. It runs anything that needs a secret key, or must run while the phone is asleep. A small Cloudflare Worker keeps time and relays realtime hints (D99, D100). GitHub Actions runs what outgrows a function call, with secrets of its own (§17): the public repo builds the shell, and the private `sen_ops` repo runs the nightly backup and *Export everything* (D85).
- **The native shell** (Kotlin, inside a Capacitor app) runs anything that must work while the app is closed, or needs Android itself: the notification listener, parsing, the category prompt, the outbox and its sync, the scanner, share-to-app, notifications with buttons, widgets.
- **The web app** is everything else: every screen. It's served from Vercel and shown inside the shell. It also runs in any browser, and as a PWA for people without the shell (D52).

```
 PHONE                                         VERCEL
 ─────                                         ──────
 Capacitor shell (Kotlin)                      web app          static; a preview per branch
   listener → templates → rules → prompt       Hono API         Functions (Node), as you
   outbox (SQLite) ── sync: changes by id ───▶   /sync, then /match
   scanner · share-to-app · widgets              ├─▶ Neon        Postgres + RLS, SQL views
 web app (React) in the shell's WebView ─────▶   ├─▶ Vertex AI   Gemini: receipts, templates, agent
   every screen; in the shell, writes            ├─▶ FCM         push to your phone
   go through the outbox                         ├─▶ Google      your calendar
        │                                        └─▶ R2          signs upload links
        │                                      CLOUDFLARE WORKER ─▶ /jobs/tick (schedules)
        │  ◀── realtime hints (no data) ──────   relay ◀── the API after each change
        └── photo upload via signed link ───▶  CLOUDFLARE R2  (receipt images)

 GITHUB ACTIONS  public repo: builds the shell · private sen_ops: nightly backup, Export everything ─▶ R2
```

| Job | Runs in | Why |
|---|---|---|
| Screens | Web app | One codebase for the shell, a browser, the PWA and the split link |
| Reading and parsing notifications, the category prompt | Native shell | It has to work while the app is closed, instantly and offline |
| Outbox and sync | Native shell | Capture never waits for the network, or for the web app to start |
| Scanning and cropping | Native shell (ML Kit). In a browser: the camera plus a four-corner crop (§6.4) | ML Kit needs Android. v0.16 only rejected processing on the phone because of the PWA's 8 MB WASM download |
| *Export everything* (D49) | GitHub Actions in the private `sen_ops` repo, started from the app (D85) | A ZIP of years of receipts outgrows a function call's limits, and its logs must stay private |
| Reads | Web app → the API → Neon | Each request runs as you, so RLS limits every row to you |
| Writes | In the shell: through the native outbox, over the bridge, then `/sync`. In a browser: straight to the API, online only | One write path that survives being offline or closed, and a retry is an upsert of the same row |
| Matching and pairing: receipts to payments, transfer sides, repayments and amounts owed, payday plan items, the salary split | The API (`/match`), after each sync | It needs your history, which the phone doesn't keep |
| Balances, totals, budgets, projections | SQL views and functions | The app and the agent read exactly the same numbers |
| Signing in to ESS and fetching the payslip (D103, D104) | Native shell, in the background when a salary is captured | The salary notification arrives there first, and the ESS password never leaves the phone |
| Checking the email inbox for forwarded receipts (D56) | The API, when a phone syncs, when the app opens, and in the morning job | It needs the inbox's app password |
| Reading receipts, drafting templates, the agent, signing R2 links, push, the calendar | The API | They need secret keys |
| Scheduled jobs | A Cloudflare Worker's cron → `/jobs/tick` → the API runs what's due (D99) | They must run while the phone sleeps, some at a set time (the 9pm note, a split's reminder). Vercel's free cron runs once a day, up to 59 minutes late |
| Realtime | The API → a Cloudflare Worker relay → open screens, which reload through the API; FCM while the shell is closed (D100) | Vercel can't hold connections open and Neon can't push. The relay carries hints, never data |
| Nightly backup | GitHub Actions in the private `sen_ops` repo (D85) | It needs `pg_dump`, which a function can't run |

- **What the phone keeps offline.** The shell holds a small synced copy of what capture and prompting need: the apps you chose, templates, pair and channel rules, merchant and transfer rules, categories, your names, and the split shares you owe, with the bank names Sen has learned for each payer. So a payment to someone you owe offers *Paying back* that share as its first button, even offline.
- **Rows still in the outbox** show in the web app beside synced ones, marked as not synced yet, so *Review* works offline too (D22), and computed balances include them.
- **Sync can't duplicate or undo.** An event's id is derived from its dedupe key (UUIDv5), and its transaction's id from the event's, so a notification captured again, after a reconnect, a reinstall or on a second phone, lands on the same rows. Edits sync as the changed fields only, never the whole row, so they can't undo what matching changed on the server. Rows the server deletes stay as tombstones (`deleted_at`), which a stale phone can't bring back.
- **The shell owns the session.** It keeps the session token in Keystore-backed storage, uses it for its own sync, and hands it to the web app over the bridge, so both share one login. In a plain browser, the web app keeps its own session.
- **Every request runs as you.** The API checks the session, then runs each database step in a short transaction that sets your user id (`set_config('app.user_id', …, true)`), through a role that can't bypass RLS. So RLS, not the API code, decides which rows a request can reach (§15, §17). A long request, such as an agent run, opens a fresh transaction per step and never holds one across a model call.
- **Requests with no signed-in person never set a user id.** Signing in uses Better Auth's own database role, which reaches only the `auth_*` tables. Everything else without a session (a split link, accepting an invitation, an integration's token, the calendar's callback, the export's report-back, the scheduler's tick) goes through one narrow `SECURITY DEFINER` function per job, which checks its token and touches only the rows that token names.

### 5.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| App | **A Capacitor shell for Android around a web app (D42).** The web app: React, TypeScript strict, Vite, TanStack Router | Installed from a GitHub Actions build, by download link or over USB. Google's developer verification reaches Malaysia in 2027: a free limited-distribution account (up to 20 devices) covers a personal app, and ADB installs stay exempt. TanStack Router, confirmed by B01: code-based routes, typed, with a screen id on each |
| Builds and updates | **Vercel** deploys the web app on every push: production from `main`, a preview per branch. **GitHub Actions** builds the shell, only when native code changes | The shell loads the web app from its Vercel address, so a deploy reaches the phone at once (D114, confirmed in B02 against bundling the web app with live updates). A service worker caches every file of the build, the six looks included, so the app opens offline; a new deploy takes over at the next launch, never mid-session. With nothing cached yet (a first launch offline), the shell shows its own page from the APK, *Connect once to finish setting up Sen*. The shell reports its version over the bridge, and the bridge's methods are only ever added, so a newer web app on an older shell checks before it calls |
| UI | **shadcn/ui on Tailwind v4**, lucide icons. This app's own design, not GCO_events' (D43) | The theme is shadcn's CSS variables in light and dark, plus app tokens for money in, money out, pending, warning and charts. `S2` designs several directions with the `frontend-design` skill, each a theme and an icon together, and the owner picks one (D57). The `uiux` skill and `docs/ui/patterns.md` govern use |
| Motion | CSS transitions; Motion where a gesture needs it | |
| Lists and sheets | TanStack Virtual for long lists · shadcn's Drawer for bottom sheets | |
| Toasts | Sonner (shadcn) | |
| Charts | shadcn charts (Recharts) | The `dataviz` skill's palette rules, readable in light and dark |
| Forms | react-hook-form + zod | Amounts parsed as text into sen |
| Dates | date-fns + @date-fns/tz | Always `Asia/Kuala_Lumpur` |
| Native pieces (Kotlin) | **Our own plugin for capture:** notification listener, template engine, merchant rules, category prompt with buttons, outbox and sync. **Plugins for the rest:** ML Kit Document Scanner, share target, push (FCM), haptics, status bar and back button, launcher shortcuts, widgets | Prefer a maintained Capacitor plugin (official or Capawesome) where one exists. The capture path is always ours |
| Local storage | The shell's SQLite outbox · the web app's cache in IndexedDB · the session in Android's Keystore-backed storage, owned by the shell (§5) | |
| State | TanStack Query for server state, persisted for offline · Zustand for UI-only state | As v0.16 §6.5. In the shell, writes go to the outbox (§5) |
| Database | **Neon Postgres** (D54) | **Drizzle** owns the schema, migrations, RLS policies and views, and types the queries. Previews use a separate Neon project holding only anonymised seed data, never a branch of production, which would copy everyone's real money |
| Auth | **Better Auth** (D54): a 6-digit code by email, by invitation only | Sign-up is off (`disableSignUp`), so an account is made only by accepting an invitation. Ids are UUIDs. No admin plugin, because it can impersonate people: the admin is a flag on `user_access`, set once for the owner by a seed step. Mail goes out through a dedicated Gmail account. Passkeys later, if ever |
| Backend | **One Hono app on Vercel Functions** (Node) | Up to 5 minutes a call on the free plan. Hono also runs on Bun and Cloudflare Workers, so it can move |
| Schedules | **A Cloudflare Worker's cron triggers** (D99) | Free, every few minutes. It calls `/jobs/tick` with its secret, and the API runs what's due: the morning job, the evening check-in, and one-off jobs at their time. An outside monitor checks `/health/jobs` and emails the owner when a job is late |
| Realtime | **The same Worker, as a WebSocket relay** (D100), and FCM | The API sends `{seq, topics}` hints after each change; screens reload what changed through the API. A short-lived pass from `/realtime/token` opens a channel |
| Objects | **Cloudflare R2**, private bucket | Signed URLs only (v0.16 §6.6) |
| AI provider | **Gemini through Vertex AI** (D55) | An API key bound to a service account; keyless sign-in from Vercel (workload identity federation) is the upgrade. Every call goes through the AI SDK, so the provider is configuration |
| Models | **Provisional until each phase tests them** (D94) | Each phase that first calls a model picks it with a small benchmark and records a decision. The bar is fixed: a paid API, no training on the data, zero retention (D34). Code names models only in `ai/models.ts`; this spec says *a cheap, main or strong model* |
| Receipt reading | **A main-tier model**; first candidates Gemini 3.8 Flash and 3.5 Flash-Lite, decided in P4 (D55) | Behind the `ReceiptExtractor` interface (v0.16 §9) |
| Template drafting | **A cheap-tier model**; first candidate Gemini 3.5 Flash-Lite (D15, D87) | Only for notification wording no template knows. Long runs of digits are masked first |
| Agent | **Our own small loop on the Vercel AI SDK** (D53, D94): its `ToolLoopAgent` | Main prompt, skills, tools and subagents (§12.5). No LangGraph. The main model is chosen in P6 (first candidates Gemini 3.8 Flash and Claude Haiku 4.5, D55). Web research through Vertex's search grounding (D39) |
| Push | **Firebase Cloud Messaging**, sent from the API | Free |
| Calendar | **Google Calendar API**, the app's own calendar only (D41) | |
| Backups | GitHub Actions in `sen_ops` → `pg_dump` → R2 | Nightly, about 100 of a private repo's 2,000 free minutes a month |
| Exchange rates | **Bank Negara Malaysia's open API**, the ECB as fallback (D99) | Free, no key, fetched by the morning job, display only |
| PDFs | **pdf-lib, on the phone** | The claim pack (D97), built from files the phone already holds |
| Validation | zod | Parsers, extraction output, API inputs |
| Money | Integer sen plus a small money module | Largest-remainder rounding for apportionment |
| Tests | Vitest (pure TypeScript) · React Testing Library (components) · **Playwright on the web app in Chromium at a phone viewport** (journeys) · Kotlin unit tests (native pieces) · SQL tests on a local Postgres · an Android emulator on GitHub Actions for native journeys, at phase ends | The `qa` skill and `qa-reviewer` agent run them (D8). The template engine exists in Kotlin and in TypeScript (for re-reading old events on the server), and both pass the same golden fixtures |

**The web app is the real UI (D42).** Android's WebView is Chromium, so what a cloud session tests in Chromium at a phone viewport is what runs on the phone.
- Native-only features (the listener, the scanner, notification buttons, widgets) get a dev-only simulator panel, so their journeys can still be walked in a browser.
- **The shell loads only our own site.** No third-party scripts, a strict content security policy, and the native bridge answers no other origin (§17).

**Free-tier limits that matter.** All are fine for you and a few friends:
- **Neon:** 1 GB of data and 100 compute-hours a month per project. It sleeps after 5 idle minutes and wakes on the next request, so it never pauses. The phone syncs when something happens, not on a timer, so the database mostly sleeps.
- **Vercel Hobby:** personal, non-commercial use, which this is, friends and family included, and a public repo doesn't change that. Sen never requests or processes a payment (D98). Functions run up to 5 minutes; its cron runs once a day, so schedules run from Cloudflare (D99).
- **Cloudflare Workers:** 100,000 requests a day free; an idle relay connection costs nothing.
- **R2:** 10 GB of storage.
- **Vertex AI:** pay as you go, billed after use, with no prepaid stop, so each person's credit and daily ceiling are the stop (D98).

**Local development.** A local Postgres in Docker stands in for Neon, the Hono API runs on Node, and `vite dev` serves the web app against them, in a browser or in the shell. Nothing is tested against production (v0.16 §6.9).

---

## 6. Capture

### 6.1 Sources

| Source | Gives | Your effort |
|---|---|---|
| **Bank/e-wallet notification** | Amount, time, account, merchant or payee; sometimes balance | None |
| **Category prompt** | The category for a merchant seen for the first time | One tap |
| **Receipt** (scan, gallery, shared PDF) | What it was: line items, categories, headcount, tax, evidence (D51) | 5–15 s |
| **Manual entry** | A payment capture missed | ~10 s |
| **Forwarded email** (D56) | What an online or subscription payment was: invoices, e-receipts, the phone bill PDF | None, once the Gmail filter is set |
| **Payslip** (D104) | What the salary included: net and gross pay, EPF, SOCSO, EIS, PCB and claims paid | None: fetched from ESS on payday |
| **Balance check** | The real balance, to measure what was missed | Occasional |

### 6.2 Notification listener

- **The service.** A Kotlin `NotificationListenerService` inside the app. You grant **Notification access** once in Settings.
- **You choose the apps (D86).** A picker, in first run and in Settings → *Capture*, suggests the installed apps on a curated list of Malaysian banks and e-wallets (a data file in the repo, each package name checked on Play), ticked. *More* searches every launchable app (a `<queries>` entry for launcher apps; no `QUERY_ALL_PACKAGES`). Messaging, SMS, email and social apps can't be chosen: the default SMS app, `CATEGORY_SOCIAL` apps and a denylist (WhatsApp, Telegram, Gmail…). The picker says plainly that Sen stores these apps' notifications, and sends each new wording to Google once, with digits masked.
- **The chosen list lives in native code and is checked first.** A notification from any other app is discarded before it reaches JavaScript and is never stored or logged. No record of which other apps post notifications is kept. The list syncs as `capture_apps`, so a reinstall restores it, and the admin never sees it.
- **Also dropped:** OTP/TAC messages, group-summary notifications, conversation notifications (refused in the listener's manifest), and any notification channel a channel rule has learned to drop (below).
- **How the OTP/TAC filter decides (D115).** It weighs evidence sentence by sentence, the title apart from the text. Advice ("never share your TAC") isn't evidence, since payments carry the same footers, unless it points at a code in the message ("do not share this code"). A strong keyword (OTP, TAC, verification code, kod pengesahan…) with a code anywhere in the rest drops it; a weak one (PIN, kod, code) only when joined to its code, never a reference's or a promotion's code. A code is 4 to 8 digits, maybe grouped or prefixed, and never an amount, a date, a time, a phone number or a reference. In doubt it drops: storing an OTP breaks a non-negotiable, while a dropped payment shows as a balance gap (§7). Each drop from a chosen app is logged on the phone by time and app, never its text, so the soak can tell a dropped payment from a missing one.
- **Raw text is stored first.** The package, notification channel, the notification's key, its post time and `when` (the time the app stamped on it), title, text and expanded text go into the local outbox, then sync to `bank_events`. Raw text is never changed.
- **Dedupe key:** a hash of package + the notification's key + `when` + text, where text is the title, the text and the expanded text, each field length-prefixed so no content can collide (D115). When the listener reconnects, Android hands it the notifications still showing, with all four unchanged, so a replay is a no-op. Two identical payments still differ in `when`. P1 checks how each app updates a notification, because an update may get a new `when`.
- **Parsing is by templates (D15, D87).** A template is the bank's wording with typed blanks, such as `You've sent RM{amount} to {name} on {date}, {time} (GMT+8) using your {account}.` Code compiles it into an exact pattern, so the same text always gives the same result, on the phone and offline.
  - **Blanks:** `{amount}`, `{name}` (a person), `{merchant}`, `{service}` (such as GrabFood), `{date}`, `{time}`, `{account}`, `{reference}`, `{balance}` and `{any}`. Each has a fixed pattern, and a drafted template can't add new ones.
  - **Each template says what the event is:** money out (`out`), money in (`in`), a move between two tracked accounts (`internal`, such as eWallet → GO+), a `hold` that a charge will follow, `context` for a nearby payment, or `ignore`, with its reason: an alert, a promo or a status message.
  - **A template belongs to one person and one app (D87):** `UNIQUE (user_id, package, skeleton_hash)`, where the skeleton is the title and text normalised (Unicode NFC, straight apostrophes, collapsed spaces, each blank as its token). Its id is a UUIDv5 of the three, so the phone and the server derive the same id. A reworded notification is a new row; the old one stays, to re-read old events.
  - **Context:** some charges name no merchant. Grab's charge doesn't, but its *group order has arrived* notification, posted the same minute, names the restaurant. A `context_for` pair rule (below) fills in the merchant or service of a payment within 10 minutes, from the same app or another. A charge that names no merchant waits for its context, up to those 10 minutes, before it prompts; with none, it prompts with what it has.
  - **No templates ship with the app (D87).** Everyone, the owner included, starts from nothing, and templates live in the database and sync to the phone. `docs/notifications.md`'s samples are the drafter's test in CI: each must produce its documented template.
- **New wording: a model writes a template, never a transaction (D15, D87).** When no template matches a notification:
  1. **No amount, no model.** A notification with no RM or MYR amount can't be a payment, because every money template needs `{amount}`. Code files it as `skipped`, every time, at no cost.
  2. **With an amount, it's drafted automatically, with no button.** At sync, the API sends a cheap-tier model (§5.1) the new notifications, one call per app per batch, with long runs of digits masked, plus what the chosen apps posted within 2 minutes either side (already-known neighbours only as their skeleton, kind and "same amount: yes/no"). It returns a template, its kind, and any pair rule it sees (below). Offline, the event waits in the outbox as *Waiting to read new wording*, as it does when the person's AI credit is spent (D98).
  3. **Code checks the proposal.** It must match the whole notification, read a valid `{amount}`, use only the blanks above, not match notifications another template already reads, and the model's own reading of the amount must equal what code extracts with the template.
  4. **`ignore`, `hold` and `context` templates apply at once and never ask.** They're listed in Settings → *Capture*, and their events show in *Skipped*, each with *This was a payment*.
  5. **A money template starts `provisional` and books at once.** Code reads the payment from the raw text, the category prompt fires while you still remember it (D24), and the payment is marked *new wording*. *Review* holds one item per new template, such as *"New Ryt wording: RM12.90 paid at ZUS COFFEE, Main Account. Right?"*, and later payments with that wording join the same item. *Yes* makes the template active. *No* rejects it, dismisses its payments, returns their events to `unparsed` and offers *Enter by hand*.

  The model is called once per new wording, not once per payment, and no number it writes is ever stored.
- **Keeping model calls rare.** Promos are new wording every time.
  - Each promo is saved as an `ignore` template, so the same wording never costs a call again.
  - **Channel rules:** once three events on the same app and notification channel are promos, and none is a payment, code adds a channel rule, and native code drops that channel from then on (§21 Q17).
  - A daily cap on model calls stops a runaway loop.
- **Pair rules: notifications that describe one payment (D88).** `pair_rules` relates two templates, with a time window:
  - `duplicate`: the same notification posted twice (Ryt). The second is ignored.
  - `same_payment`: two apps for one payment, such as Grab or Google Wallet plus the card's bank app. It becomes one transaction: the account from the bank's notification, the merchant or service from the other.
  - `hold_for`: a hold and its charge, no more than the hold and up to 3 hours later. A hold never moves money.
  - `context_for`: a notification that names the merchant of a nearby payment.

  Native code applies them deterministically: the first event makes the transaction, and a partner arriving within the window merges its fields in and is marked `ignored`, linked to it, in either order. The category prompt waits up to 2 minutes for a partner. **A rule is made in one of two ways:** by code, when two money events have the same amount within 2 minutes and no rule yet relates their templates (*Review* asks *One payment or two?* once, and either answer is stored), or by the model while drafting a template (above), which code checks against the real pair and asks about once. *These were two payments* on a merged payment undoes the merge.
- **Each event ends up** `parsed` (recording which template read it), `ignored` (a template or a pair rule says it isn't a payment of its own), `skipped` (no amount, or no template yet offline), `unparsed`, or `dismissed` once you delete its payment (§6.7). Raw text is kept, so a new template can re-read any old event.
- **Background execution (D42).** The Kotlin service stores the event, reads it with the templates (synced from the database), applies the merchant rules, posts the category prompt and queues the sync, all natively. Nothing waits for the web app to start. Sync retries with Android's WorkManager when the network returns. **Validate this on the Xiaomi in P1.**
- **Health.** The app writes a heartbeat: listener connected, and when it last saw a bank event. The morning job's watchdog sends a push saying "capture may be off" if there's been no heartbeat for 24 h or no bank event for 48 h.
- **Keep Sen running (D86):** Android's *ignore battery optimisations* dialog for every phone, then the steps for its brand, picked by `Build.MANUFACTURER` from a data file copied from dontkillmyapp when the shell is built. On the Xiaomi: Autostart on, battery saver set to "No restrictions", and the app locked in recents. Samsung, Oppo, realme, OnePlus, vivo and Honor have their own steps; only Xiaomi is tested, and the heartbeat watchdog is the real check.
- **Android 16 on the Xiaomi 15T (§2).** Two things for P1 to check:
  - **Restricted settings.** Android greys out notification access for an app installed outside a store until you choose *Allow restricted settings* on the app's info page. First-run setup handles it (§9.5).
  - **Hidden one-time passwords.** Since Android 15, the system hides OTP notifications from listener apps. The native OTP filter stays as a second line of defence. P1 confirms that payment notifications still arrive in full.

### 6.3 From event to transaction

- Each parsed event creates a transaction (`source = notification`). Money to or from your own name, and moves inside one app such as eWallet → GO+, become transfers (§7).
- **Known merchant** (a merchant rule exists): the category is applied silently, and the payment is done. There's no review step (D24).
- **New merchant:** the app posts its own notification, such as *"RM12.90 · ZUS COFFEE"*. Android allows three buttons on a notification: the two best guesses and *Scan receipt*. Tapping the notification itself opens the full choice in the app.
  - **The two best guesses come from a cheap model, the first time only (D112).** Online, the shell syncs the payment at once, and the server asks a cheap-tier model for the two likeliest of your own categories, given the merchant's name, the amount and the time of day; the prompt waits at most 5 seconds for them. Offline, or without an answer in time, or with no AI credit, code guesses from your own history: the categories you chose most for payments of a similar amount at a similar time of day over 90 days, then your most used. The notification and the island keep the buttons they were posted with, so nothing moves under your thumb; if the model answers late, its guesses replace history's in that payment's *Review* row. A guess is only a button: your tap makes the rule, and the model never sets a category. Your choice creates the merchant rule, so that merchant never asks again. On a phone with an island (§9.1, D101), the same choice shows there for 10 minutes, then stays as this notification.
- **Every payee is a merchant (D70)**, including a hawker whose DuitNow shows a personal name: a new one gets the prompt above, then a rule. The exception is a name Sen has matched to someone on a split (§7): a payment to them offers *Paying back* the open share first, even offline, and otherwise asks.
- **Scan receipt is one tap away** (D51), so the receipt attaches to that payment directly:
  - a new merchant's prompt has it as its third button
  - a known merchant's payment gets a quiet notification with that one button, which clears itself after 10 minutes and can be switched off in Settings

  `S2` designs both.
- **One prompt at a time (D24).** Prompts arrive straight after the payment, while you remember it. A new prompt replaces an unanswered one in the notification shade, and the unanswered one stays in *Review*.
- **Holds never move money.** Grab notifies a hold when you order and the final charge when it's done; Ryt does the same for a card hold at a petrol pump, with the final amount about a minute later. A hold is its own template kind, linked to its charge by a `hold_for` pair rule (§6.2), so the final charge is the payment.
- **Changing a category (D25, D89)** asks *just this one* or *from now on*, but only when the category came from a rule; a first answer makes the rule and doesn't ask. *From now on* updates the payment's rule, the one keyed on the notification's payee, because that rule files future payments. Past payments stay as they are. Changing one item at a single-category merchant asks *Just this one · From now on, sort by item*.
- **The same question waits inside the app (D22).** Every item still to answer sits in *Review*, with the full set of buttons, for when the notification is too small to hit or has been swiped away.
- **Buttons, not typing (D22, D90).** A note is optional, on any payment or receipt: one muted *Add a note* row that opens a small sheet. It's searchable, and marked in lists. When a *Needs you* item has a note, Sen may mark one of that row's own buttons as its suggestion (*birthday angpao from dad* → *Income*); you still tap it, and a note never changes a rule.

### 6.4 Receipts: what the money was for (D51)

A notification records that money moved; the receipt says what it bought. Scanning right after paying is the habit the app is built around, and the per-meal average, the categories of a mixed bill and claim evidence all depend on it. The receipt attaches to the payment the notification already recorded.

**Capture paths**
1. **Scan, in the Android shell.** Opens Google's ML Kit Document Scanner from inside the app.
   - On the phone, it auto-captures, finds the edges, crops, straightens and cleans shadows.
   - You see the crop and can adjust it before saving, while the receipt is still in your hand.
   - This replaces v0.16's whole server-side enhancement pipeline (§7.10.7), its crop-skip heuristic, and the "OEM document mode" question (#13, #30).
   - ⚠️ **No black-and-white filter on thermal receipts.** Hard thresholding drops faint digits (v0.16 §7.10.7). Pick the scanner mode in P4 by testing faded receipts: crop/rotate only, or with filters and cleanup.
2. **Gallery multi-select.** Images are stored as they are, after resizing.
3. **Share to the app.** PDFs or images shared from Gmail or Files, through the shell's share target. This covers e-bills such as the phone bill.
4. **In a browser or the PWA (D52).** ML Kit isn't available there.
   - The phone's own camera opens through the file picker, with its full resolution, focus and flash.
   - A crop screen with four draggable corners straightens the photo in a few lines of code. There's no automatic edge detection, which would need OpenCV.js (about 8 MB) or a paid SDK, and the receipt reader copes with a skewed photo anyway.
   - On an iPhone, the Files app's document scanner makes a PDF, which uploads like any file.
5. **Forwarded email (D56).** Invoices and e-receipts that arrive by email: Maxis, Spotify, Claude, Vertex AI, Grab's e-receipts, online shopping, the phone bill.
   - **Sen never sees your inbox.** A Gmail filter in your own account forwards only the senders you choose to Sen's dedicated Gmail account. You control what gets in by editing the filter.
   - **Each person has their own address** on that inbox, using Gmail's `+` addressing, such as `sen-inbox+<code>@example.com`. Gmail delivers anything after the `+` to the same inbox but keeps it in the address, so Sen knows whose email it is. The code is random, at least 128 bits (D85), shown in that person's Settings, and mail with an unknown code is dropped.
   - **Gmail confirms a forwarding address** by emailing it a code. That email lands in Sen's inbox, so Sen shows the code in that person's Settings, to type into Gmail.
   - **Sen checks that inbox** over IMAP with its app password, when a phone syncs, when the app opens, and in the morning job. Email receipts aren't urgent.
   - **ESS mail is routed off first (D96).** Mail from the ESS sender in Settings → *Claims* goes to the claims parser (§13), never to a model.
   - **One read per email (D91).** Code keeps only PDF, JPEG, PNG and WebP attachments, dropping embedded images, images under about 300 px, `.ics`, `.p7s`, `winmail.dat` and PDFs over about 10 pages, and sends at most five parts. One model call reads the body (as text, from sanitised HTML) together with them, and returns, for each document it finds, a role (*receipt*, *invoice* or *other*), which part it came from, and the usual itemised read. The roles are drafts: code checks the part exists and, for a native PDF or the body, that the total read appears in that part's own text, then runs the usual arithmetic check. A failed check marks the total as doubtful on `confirm`; nothing is dropped.
   - **What's stored.** One receipt per receipt or invoice with a distinct total; an invoice and a receipt for the same charge become one receipt, using the receipt. Its file is that attachment. **With no attachment, its file is the email body as sanitised HTML**: no scripts, forms, iframes or external CSS; remote images replaced by a placeholder and embedded ones inlined, and a content security policy of `img-src data:`, so no tracking pixel fires, at intake or on view. It shows in a sandboxed frame, and *Save as PDF* comes from the phone's print sheet when a claim needs one. The raw `.eml` is kept as evidence, and `receipt` lists *Other attachments*, with *Use this one instead*.
   - **Dedupe:** the `Message-ID` first (P5 checks that Gmail's filter forwarding keeps it), then each file's content hash; for a body, the hash of its normalised text, because tracking links differ per send. Each receipt then attaches to the payment the notification recorded, like a scan (§6.4 matching).
   - **Bank alerts aren't forwarded.** Ryt's payment emails repeat its notifications. They could become a backup for a missed notification later, but not now.
   - **One door for later:** all of this enters through `POST /intake/email`, which takes one raw email. Today Sen's own checker calls it; later, the owner's personal assistant can call the same route.

**Storage**
- The phone resizes photos to **≥1200 px on the short edge, JPEG quality ~80** (the print floor from v0.16 §7.1.4), then uploads them through a signed R2 link.
- PDFs are uploaded untouched.
- One stored file per receipt, deduplicated by content hash. A receipt entered by hand has no file (below).

**Extraction**
- The API sends the stored file to Gemini 3.8 Flash on Vertex AI (D55). There's no server-side resizing: `media_resolution` controls cost (`high` for photos, `medium` for PDFs; verify in P4).
- The output follows a strict JSON schema, is always itemised, and has a confidence score per field. Token usage is recorded (v0.16 §9).
- Failed calls retry with backoff. If extraction finally fails, you fall back to manual entry. A captured image is never lost.

**Confirm screen.** This is the most important screen, as it was in v0.16 §7.16.1. **It's one screen, and the itemised list is the receipt (D67):**
- Merchant and date on top, then **one category row**: the category when every item shares it, or *Mixed*, with each item's category on its second line. Tapping either opens the same category sheet as Review's *Other…*. Then every item with its price, then the total, and a muted *Add a note* row.
- **Each item's price includes its share of tax and service charge (D66).** Code spreads them pro rata, by largest remainder, so the items always add up exactly to the total (v0.16 §7.3.1–7.3.2). The receipt's own subtotal, tax and service lines stay on the receipt, and the arithmetic is checked on the **full** receipt: items + tax + service charge ≈ total.
- A low-confidence value is marked where it is, and you fix it in place.
- *View photo* opens the image, pinch to zoom. It's rarely needed: the list is the receipt.
- **How many people ate** (D66), for the meal average: the bill divided by that number. Without a split you paid for the whole bill, so all of it is your spending, whoever ate it. Who had which item matters only on a split (§7, D71).
- At the foot: **Done**, or **Split** (§7), which offers *Share a link* or ***Just my part*** (D92).
- **Categories (D89).** The reader returns one category per item, from your own active categories (a fixed list in its schema), with a confidence. Code decides the pre-fill: a known merchant's rule fills every item and the model's guesses are ignored, so the same latte can't flip between categories; the guesses are used only for a new merchant, or one whose rule is *by item* (a supermarket, Watsons, Shopee). A first receipt that's mixed makes a *by item* rule, with its largest category as the fallback. The reader never outputs a claim scheme or a relief code; code applies those facets from the rule.
- **What *Done* does to the payment.** When the receipt's total, or *my part*, equals the payment's amount, its items become the payment's category breakdown, split by item price, and the payment's own category is the largest; its row reads *Mixed*. When the totals differ, the items are detail only. Only one receipt on a payment sets its categories.
- ***Just my part* (D92).** You tick your items. On *Done*, every unticked item folds into one *Others' items* line, which belongs to an unnamed *Others* member, so the list still adds up to the printed total, exact in sen. The full read stays in `receipt_extractions`, and *Others* always counts as done, so the split locks at once. Then:
  - **A friend paid** (a ZUS screenshot from their phone): you owe your part, which your payment to them matches by §7's rule, in either order, as spending in your items' categories. A payment to a new name that fits an amount you owe offers *Paying back* first, instead of creating a merchant rule.
  - **You paid the whole bill** and friends pay you after reading the receipt: *Others* owes the rest as one pool and your spending is your items (D19). Money in that fits the pool asks *Is this for ZUS · others' part?* once, then links as a repayment. A status card shows *RM30.40 of RM45.60 back*, and *Write off* is there any time.
  - A link can still be shared later.

**No receipt (D90).** A payment's receipt row offers *Scan the receipt* and *No receipt…*, which opens a sheet with two choices:
- **Enter the items** opens `confirm` by hand: the same item list (D67), items typed with a description and a price as text into sen, optional tax and service spread by code (D66), and the headcount. It's checked against the payment's amount, and leaving some unitemised is allowed (*RM3.20 not itemised*). It's saved as a receipt with `source = manual` and no file, so splits, categories and the meal average work unchanged; its id is made on the phone.
- **Just a note** opens the note sheet.

Either marks the payment *no receipt*, cancels its scan prompt if it's still showing, and Sen never asks about it. Both have *Undo*.

**Matching to a payment** (works in either order, and runs on the server, §5)
- On commit, the app looks for an unlinked payment with the **same amount** within **±3 hours** (both tunable in P4).
  - One match: the receipt attaches to it, adding items, your share and evidence.
  - Several matches: the app asks you which.
  - No match: the receipt **waits** in *Review* and attaches itself when its payment's notification arrives. A receipt never creates a payment by itself, because a notification that hasn't synced yet is far likelier than a payment capture missed. That holds while capture is on. For a person without capture (D52), committing a receipt creates its payment (`source = receipt`), because no notification is coming.
- **A waiting receipt can also be:**
  - attached to an older payment by hand, such as a phone bill paid days before its PDF arrived
  - filed as **evidence only**, for a claim, with no payment, such as the My50 receipt, paid from the untracked TNG card (§13)
  - entered as a payment by hand, if capture really missed it
- **Cash purchases aren't entered (D16):** the ATM withdrawal already counted that money. A cash receipt can still be kept on the withdrawal for its detail. Whenever a receipt's total differs from its payment's amount, attaching adds items and evidence only, and never changes the amount, your share or the category. A payment can hold several receipts.
- **Who paid** is chosen when you split (§7). A bill someone else paid becomes a split whose payer isn't you. It commits straight to that split, and never waits for a payment of yours to match.

### 6.5 Dedupe, all cases

| Case | Mechanism |
|---|---|
| Same notification seen twice | Event dedupe key, `UNIQUE (user_id, dedupe_key)` |
| Receipt and notification for one payment | Matching (§6.4) |
| Same file uploaded twice | Content hash, `UNIQUE (user_id, content_hash)` |
| Manual entry and notification for one payment | Soft near-duplicate warning (same amount, close in time); doesn't block |
| Two notifications for one payment, from one app or two (D88) | A pair rule (`duplicate`, `same_payment`, `hold_for`, `context_for`) merges them into one transaction, in native code. Without a rule, the same amount within 2 minutes asks *One payment or two?* once, and the answer becomes the rule |
| Subscription forecast vs real charge | Forecasts live in their own table (§11) |
| Manual entry or edit retried by the outbox | The row's id is made on the phone, so a retried sync is an upsert of the same row. An edit sends only its changed fields (§5) |
| A notification captured again after a reconnect, a reinstall or on a second phone | Its event's and transaction's ids come from the dedupe key, so it lands on the same rows (§5) |
| Template drafting for one wording | A template's id is a UUIDv5 of person, app and skeleton, `UNIQUE (user_id, package, skeleton_hash)`, so a retried draft is an upsert (D87) |
| An email forwarded twice | `Message-ID`, then each file's content hash (D91) |
| A split created twice by a retry | Its id is made on the phone, so `POST /splits` returns the same split (§16) |
| A filled-in transfer side, then the real one | The real one replaces it (§7) |
| A shared bill sent twice by an integration | `PUT` on the bill's reference (§16, D102) |

### 6.6 Review: what needs you

*Review* has two parts (D72). **Needs you** is the list below; its count is the tab's badge. **Waiting on others** lists splits not yet paid back, receipts waiting for their payment, and refunds Sen is watching for (§12.1); it isn't counted, because there's nothing for you to do yet.

Each item in *Needs you* names what clears it:

| Item | Cleared by |
|---|---|
| A payment with no category: a new merchant | Choosing a category |
| Money in to classify | Marking it income, a transfer, or a refund of a purchase (D21) |
| A receipt read and waiting, for someone without capture | Confirming it, which creates its payment (§6.4) |
| A receipt that couldn't be read | Entering its details by hand; the image is kept |
| New notification wording, already booked (D87) | *Yes*, or *No*, which dismisses its payments and offers *Enter by hand* |
| Two money notifications that may be one payment (D88) | *One payment* or *Two payments* |
| A transfer with a missing side, the first time | Choosing the other account (D17) |
| A split share you owe, still unpaid an hour after the split | Paying it, which ticks it, or ticking it by hand (D65) |
| Money in from a name Sen hasn't seen, when it could be a split share | Choosing whose share it was, or *Not a split* (D64) |
| Money in that fits an *Others* pool (D92) | *Is this for … others' part?*: yes, or no |
| A colleague's first payment to an integration's shared bill, such as the lunch pool | Choosing which member it is (D23, D102) |
| A balance check that's due | Typing the balances in (D18) |
| A claim due within 7 days | Submitting it, or marking it submitted (§13) |
| An ESS email Sen couldn't place (D96) | *Approved: [claim]*, *Rejected* or *Not a claim* |
| A salary that landed while claims are submitted, when its payslip couldn't answer (D104) | Saying whether it included them (D45) |
| *Payslip not found* after a week, or ESS needing you to sign in (D103, D104) | *Sign in to ESS*, or *Skip this month* |
| An agent proposal | Applying or dismissing it (§12) |

**Waiting on others, not in this list:** a receipt waiting for its payment attaches itself when the payment arrives, or you attach it by hand, file it as evidence, or enter the payment (§6.4). A split not yet paid back clears as its shares are ticked (D65), and an *Others* pool as its money comes back or is written off (D92).

**Not in Review at all:** health warnings, such as *capture is off* or *backups are failing*. Those sit above everything on Home until fixed (§18).

### 6.7 Editing, deleting and undo

- **Every change happens at once, with *Undo* in a toast**: recategorising, deleting, marking as a transfer, linking a repayment. Nothing asks "are you sure?" except a destructive action that can't be undone.
- **A payment from a notification:** its category, share, note and kind are freely editable. Its amount, time and account are what the bank said. They can be corrected only on its detail screen, beside the raw notification.
- **Deleting a payment from a notification** marks its event `dismissed`. The raw text stays as evidence, and re-reading never brings the payment back. A manual entry is deleted, leaving a tombstone so a phone that hasn't synced can't bring it back (§5).
- **Every change is in `audit_log`**, with who made it: you, the agent or the system.

### 6.8 Manual entry

- **Asks for:** the amount, typed as text and stored in sen, and a category.
- **Defaults:** the account you used last (normally Ryt), and the time is now.
- **Optional, behind *More*:** merchant and note.
- **About 10 seconds.** It's for a payment capture missed: a notification that never came, or a card or app that doesn't notify. Cash purchases aren't entered, because the ATM withdrawal already counted them (D16). *Add expense* on the launcher opens it straight away.
- A near-duplicate of a payment a notification already made gets a warning that doesn't block (§6.5).

---

## 7. Accounts, balances and transfers

**Accounts (D16).** Public Bank, Ryt Bank (*Main Account*), TNG eWallet and GO+ are **tracked**: each has an opening balance, a computed balance and balance checks. GO+ is its own account, so money moving between it and the eWallet is a transfer.
- **GrabPay Wallet is tracked too (D38).** It pays for Grab. You top it up with the Public Bank debit card, so a top-up is a transfer from Public Bank, and each Grab charge is spending.
- **Opening balance:** the balance each app shows when you add the account, as of that moment (`opening_at`). The app can't see notifications from before it was installed, so nothing earlier counts. A balance counts only money that moved after its `opening_at`, so nothing captured while you set up is counted twice; spending counts every payment.
- **One app can feed two accounts.** TNG's notifications name GO+ whenever it's involved; anything else from TNG is the eWallet. Ryt names the paying account on money out (`docs/notifications.md`).
- **Elsewhere:** an account of yours the app doesn't watch, such as another bank. Money moved there is a transfer, not spending, and its balance isn't shown.
- **Stored credit is a tracked account (D93):** ZUS Balance, a Starbucks card and similar get an account each. A top-up is a transfer into it, and each purchase from it is spending. If the app notifies, you choose it in the app list (§6.2) and its purchases are captured like a wallet's; if not, a receipt or manual entry records each one. Bonus credit shows up at that account's balance check.
- **Accounts follow the apps you chose (D86).** First run offers one account per chosen app, plus *Add a pot* (for GO+); an `{account}` name Sen hasn't seen before asks once which account it is.

**Cash and the physical TNG card aren't tracked (D16).** Money going into them counts as spent at that moment:
- An **ATM withdrawal** is spending in a *Cash* category. Cash is seldom used, so cash purchases aren't logged.
- A **TNG card reload** is Transport spending. The card's balance mostly buys the monthly My50 transit pass, and parking deducts from it with no notification at all. Tolls are charged to the eWallet, so they arrive as eWallet notifications.
- Both work through ordinary merchant rules, so neither needs an account.

**Balance** = opening balance + money in − money out, for each tracked account and as a total.

**Balance checks (D18)**
- No notification shows a balance (`docs/notifications.md` §5), so you type balances in from the bank apps. The app shows each computed balance beside its box, so a match is one tap.
- **When:** the app asks weekly for the first four weeks, while capture is new, then on each payday.
- Each check compares the real balance with the computed one. The difference is booked as an `adjustment` in the **Unaccounted** category, dated at the check, so the balance stays right and the gap stays visible.
  - **Unaccounted spending is the cycle's adjustments netted together**, so surplus stays honest. Money that left unseen adds to it, and money that arrived unseen takes it back down, even below zero. So a payment whose notification lands after a check isn't counted twice.
  - **Unaccounted money in is never income.**
  - Computed balances include rows still in the outbox, so a check right after an offline spell doesn't find a false gap.
- **Where the gap shows:** Home shows the gap the last check found (§9.2), and Insights shows it per cycle. It should trend towards zero.

**Transfers between your own accounts (D17).** Money sent to or received from your own name is a transfer, never spending or income. Your name, as the banks print it, is a setting.
- **Pairing:** when both sides appear, they become one transfer. In every sample they arrived within the same minute, so the window is 30 minutes.
- **A missing side:** Public Bank doesn't seem to notify money leaving it (§21 Q16), so a transfer out of it shows up only as money arriving in Ryt or TNG. The app fills in the other account from the transfer rule it learned last time, and asks the first time. The filled-in side is marked `source = inferred`, and if the real side turns up later, it replaces the filled-in one.
- **Money to your own name that no tracked account receives** went *elsewhere*. The app asks once which account, and the transfer rule remembers.
- **Moves inside one app**, such as eWallet → GO+, are transfers by their template (§6.2).

**Spending vs cash flow**
- `amount` is what actually moved. Balances use it.
- `my_share` is what you bore, and defaults to `amount`. Spending uses it.
- **A bill you paid and didn't split** is all your spending: `my_share` = `amount`, whoever ate it. The items you tick say what you ate, for the meal average (D66).
- **Money in from a person** is a **repayment** of a split share, **income** (such as a gift), or a **transfer** if it's from your own name (D17). Unclassified money in sits in *Review*.
- **The shared-bill rule (D19).** A bill's spending is the smaller of `my_share` and `amount` − the repayments linked to it. *Owed to you* is `amount` − `my_share` − repaid, never below zero.

  | Dinner of RM120 on Ryt, your part RM40 | Spending | Owed to you |
  |---|---|---|
  | You split it; your share is RM40 | RM40 | RM80 |
  | Ali repays RM40 | RM40 | RM40 |
  | Ben repays RM40 | RM40 | RM0 |

  If someone never pays, *write it off*: your share grows by that amount.
- **Owing exists only on a split (D64).** There's no list of people. Who owes what lives on the split and its payment.
- **Splits (D47, D64–D66).** Any bill can be split, whoever paid it.
  - **Start one** from a receipt or a payment with *Split*, and say who paid: you, or a friend. A split started from a payment has no items, so its total is shared evenly between the people who join, and you can change any share.
  - **Everyone ticks what they had (D71)**, on their own phone or the payer's. An item one person ticks is theirs; an item several people tick is split evenly between them. Everyone has their own noodles; three of them tick the fried chicken. Items already carry their tax and service (§6.4), so a share is the sum of its items, and a shared item is divided by largest remainder.
  - **Each person taps *I've ticked everything I had*, and the split locks when everyone is done and every item is claimed (D71).** So people can tick in any order: a friend who ticks their own dish first doesn't lock the split before ticking a shared one. Until the lock, shares show live, marked *still changing*, with who is done, and nobody sees a QR. Then each person sees their final share and the payer's QR. A Done can be undone until the lock, and ticking again undoes it. After the lock only the payer can change a tick.
  - **When a split gets stuck,** the payer settles it: an item nobody ticked gets *Everyone* or *Someone else…*, and once every item is claimed the payer can lock without waiting for someone who left. Friends the payer ticked for count as done.
  - **The link**, with a QR for the table, opens a page with no login. A friend types a name and ticks their items, and their share so far shows at once. Sen keeps a random token in that browser, so the next link fills in their name and DuitNow QR; a different or cleared browser asks again. An invited Sen user who is signed in is just recognised (D52). You can change anything.
  - **How they pay** shows under the shares: the payer's DuitNow QR. Yours is uploaded once in Settings; a friend who paid uploads theirs on the link, or you add it.
  - **Paying from the same phone (D101).** No Malaysian bank or e-wallet offers a link that opens a transfer with the payee and amount filled in. So in the shell, *Pay with TNG* copies the amount and sends the payer's QR straight to TNG (`ACTION_SEND` to its package), and starts the *paying* island (§9.1); *Other app…* opens the share sheet, and *Save QR* saves the image. A QR Sen saved to the gallery is deleted once the share ticks. On the link in a browser: *Pay with an app* (the share sheet, with the amount copied) and *Save QR*. Sen never asks for money for itself: friends pay each other.
  - ***Just my part*** is a split with an unnamed *Others* member and no link (§6.4, D92).
  - **Who has paid: the payer's tick list (D65).** Only the payer ticks, on their own phone; everyone else sees the ticks. If you paid, money in that matches an open share ticks it. The first time a friend pays from a name Sen hasn't seen, *Review* asks whose share it was, and Sen remembers that name for that friend, for you alone. Cash you tick by hand. If a friend paid, your payment to them ticks your share, and you can tick it by hand, since Public Bank doesn't notify money out. An hour after the split, if your share is still unpaid, Sen reminds you once, with a push written by code.
  - **On your books:** if you paid, the bill's spending is your share (D19), and friends' repayments are linked to it. If a friend paid, your share is an **amount you owe**, which isn't a transaction because no money has moved. Your payment to the payer, matched by an amount within RM5 within 30 days, becomes the spending, in the receipt's categories, with the receipt attached.
  - **Lending** is a split of a payment whose whole amount goes to the friend (D70).
  - **It stops working** a day after the last tick, so a wrong tick can still be undone (D47, amended), or after 30 days. You can reopen it from the app. The page shows only that bill: the merchant, items, shares, names and the payer's QR. Nothing else from the app reaches it. A friend's QR is deleted when the link stops.
- **Refunds (D21)** link to the purchase they refund and take their amount off its spending (after the shared-bill rule), in the purchase's cycle. That cycle's figures change after the fact, while the money shows up in your balance the day it arrives. A refund is never income.

**Income.** Salary credits become income transactions automatically, through the merchant rule for your employer's name (§8). Interest from Ryt and GO+ returns are income too, but not salary. Surplus uses real income. Salary itself is never a Home figure (v0.16 §7.14.3).

**The lunch pool (D23), through an integration, built last (D102).** It's the first client of the generic integration adapter (§16): a shared bill it sends becomes a split with `source = integration`, and its deposits match the way split shares do. The `lunch_*` tables fold into `splits`, `split_members` and `payer_names`. The owner may stop ordering from DingDong, since group lunches are mostly GrabFood now. `S3` builds this last, and only if the pool is still running. You prepay DingDong meal pools for a group of colleagues, and they pay their deposits back into your TNG eWallet. **lunchbot**, your Telegram bot, runs the pool: the split, the deposit checklist and everyone's running balance. It's a Go service with its own database, and it replaced v0.16's n8n bot (v0.16 §7.15). No daily lunch events are posted any more.
- **The prepayment is a shared bill (D19).** Your share starts as your own pledge, which lunchbot sends when the pool's pledges are set. When the pool ends, lunchbot sends what you actually ate, and that replaces it, so your share comes out exact.
- **The bill is the money you paid the seller**, matched by the same amount within 3 days of the purchase, or linked by you.
- **Deposits are repayments to it.** A colleague's payment is matched to their pending pledge. The first time a name pays, the app asks which member it is. After that, their payments file themselves while they have a pledge pending (D23). A deposit that arrives before you've paid the seller waits on the pool, and links when you pay.
- **lunchbot confirms deposits by itself.** It reads the repayments this app has matched to its bills (§16) and ticks them off, so nobody taps through its checklist.
- **A pool bought before this app started** has no bill here. Its deposits still count as repayments, never income.
- **lunchbot's side** (reading deposits, sending pools) is built in its own repo (`docs/local.md`).

**Pay cycles (D14).** Wherever the app says *this month*, it means the current **pay cycle**: from the day a salary credit lands to the day before the next one lands.
- **What uses cycles:** Home, budgets, *this month* in Insights, and the agent's check-ins, reviews and projection.
- **What stays on the calendar:** claims, subscriptions and the tax year. They run on someone else's calendar.
- **A cycle starts when salary actually lands**, meaning a credit marked as salary. Nothing about the employer is built in: a new job's first salary is marked once, and a merchant rule learns the new employer's name.
- **Without capture** (D79), a cycle is the calendar month unless the person sets an expected payday (§9.6).
- **Expected payday** is a setting: the last working day of the month (today's), or a day number. It's used only for estimates: days to payday, the cycle-end projection, and a warning when salary is later than expected. An early payday, such as before Hari Raya or Chinese New Year, needs no setting, because the cycle starts when the money lands.
- **Edge cases:**
  - Until the first salary is seen, the cycle starts on the opening date.
  - A salary credit within 15 days of the last one, such as a bonus or a split payment, doesn't start a new cycle.
- **Names:** a cycle is called by the month most of it falls in. Screens show its exact dates.

---

## 8. Categories and rules

- **Your categories** describe your spending. They're **one flat list (D28)**, with no groups or sub-categories, so a notification can offer them directly. They carry flags `is_discretionary`, `is_meal` and `is_beverage` (v0.16 §7.14.4). A beverage only counts when it's the whole transaction: ZUS on the way to work counts, a kopitiam coffee with breakfast doesn't.
- **The starting list (D33).** Categories can be renamed, added or archived in the app.

  | Spending | Covers | Meal | Drink | Discretionary |
  |---|---|---|---|---|
  | Meals | Eating out, takeaway, the lunch pool | ✓ | | |
  | Drinks & desserts | ZUS, Chagee, bubble tea | | ✓ | ✓ |
  | Groceries | | | | |
  | Transport | TNG card reloads (My50, and parking paid by card), Grab rides, trains | | | |
  | Car | Petrol, tolls, parking paid by eWallet, servicing | | | |
  | Phone & internet | | | | |
  | Home & bills | Rent, utilities | | | |
  | Shopping | Clothes, gadgets | | | ✓ |
  | Entertainment | Movies, games, outings | | | ✓ |
  | Subscriptions | Streaming, apps | | | |
  | Health | Clinic, pharmacy | | | |
  | Personal care | Haircut, toiletries | | | |
  | Gifts & treats | For others | | | ✓ |
  | Family | Money for parents | | | |
  | Travel | Trips, hotels | | | ✓ |
  | Fees & charges | Bank fees, fines | | | |
  | Cash | ATM withdrawals (D16) | | | |
  | Unaccounted | Made by balance checks; never picked by hand | | | |

  **Money in:** Salary · Interest & returns · Other income.
- **Merchant rules (D89)** map a normalised merchant key to **facets**, each set on its own: a category (*single*, or *by item* for a merchant that sells many kinds of things), a kind (for money in, such as salary from your employer's name → income), a claim scheme (§13) and a relief code (§14). There's one rule per merchant, never several, so there's no order of rules to settle and one row to keep offline. D25's *from now on* changes only the facet you edited. A receipt's merchant key becomes an alias of the payment's rule the first time it attaches (`merchant_aliases`).
  - **Every payee gets a rule, personal names included (D70).** The exceptions: a name matched to someone on a split while they have an open share, and a lunch-pool member while they owe a deposit (D23).
  - Normalising means: uppercase, collapse spaces, strip punctuation, strip trailing reference numbers (v0.16 §7.11.1).
  - It applies to notification payee strings and receipt merchants alike.
  - Rules are learned from your confirmations and are deterministic.
- **Company claim schemes are a separate tag, not a category.** A MyRapid trip is *Transport* to you and *travel-claimable* to the company.
- **The AI never sets a category on its own.** The receipt reader's suggestion pre-fills the confirm screen only where no rule decides (§6.4), and you confirm.
- **Sen can set up rules from what you type (D89).** "Anything from KK MART is groceries": `find_merchants(text)` returns the merchant keys seen, how many payments each has, and their category or kind. Sen proposes one rule each, and code checks the keys exist, the category is active and isn't *Unaccounted*, and the facet is category, kind, *by item*, or a claim scheme (D95). Code refuses a relief facet from Sen. The card reads *SHOPEE MY, SHOPEEPAY → Shopping, from now on; 14 past payments stay as they are*, with *Apply* and *Undo*. For a merchant not seen yet, the proposal waits and becomes the first guess on its first prompt, so your tap still makes the rule.
- **Budgets (D29)** are only for the categories you choose: a standing amount per pay cycle, kept until you change it. Each cycle starts fresh, and unspent budget doesn't roll over; underspending shows up as surplus instead.

---

## 9. What you see

### 9.1 Navigation

- **Tabs (D68):** `Home · Review · Scan · Insights · More`.
  - **Review** is the list of everything that needs you (§6.6), with its count as the tab's badge.
  - **More:** Payments (every transaction, searchable), Accounts, Claims and Settings.
- **Sen** is a floating button on the tab screens, bottom right (D68). It opens the one conversation (§12.5) in a full-height sheet that knows which screen it was opened from. Insights cards, a payment, a split and a budget offer *Ask Sen about this* (D94). Sen's latest note shows on Home, and its proposals and suggested answers wait in *Review*. Opening a screen never calls a model.
- **Scan (D69):** a tap opens the scanner straight away, with its own gallery import. A long-press opens *Scan · From gallery · Add manually*. Right after paying, the fastest scan is still the button on the payment's own notification (§6.3).
- **Launcher shortcuts** (long-press the app icon): *Scan receipt*, *Add expense*. *Add expense* is also at the foot of *Review* (D72).
- **Widgets (D32, D74):** three sizes in the widget picker, so you choose by screen space. Each size answers more:
  - **Small:** *left until payday*, a meter of spending against how much of the cycle has gone, and *Scan*.
  - **Medium:** adds the pace line, this cycle against last, and *Review* with its count.
  - **Large:** adds the top categories, the budget most at risk, and Sen's latest note.
  - **Every size turns red with *Capture is off*** when the listener stops (§6.2), because the home screen is where you'd notice.
  - **Each look draws them (D77, D101):** colours, shapes, icons, the large figure and the layout, in light and dark. Fonts are limited to the system's, or text drawn as an image.
  - They come after Insights; `S3` places them. They're native-only, so the browser shows a stand-in (D42).
- **The island (D101).** On phones with one, a few moments you start and watch show in the island, each with an end and a countdown, then fall back to an ordinary notification if missed. One `Island` interface in the shell: its first implementation is Android 16 Live Updates, which HyperOS 3.1 draws as the Hyper Island and Samsung's Now Bar and OnePlus as theirs, with no approval needed; Xiaomi's own focus-notification API is added only if a phone test shows it working for a sideloaded app (`docs/local.md`); floating overlays are ruled out. The moments:
  - **Just paid:** "−RM12.90"; expanded, the merchant, the two best category guesses and *Scan receipt*, for 10 minutes. A setting can turn it off.
  - **Reading a receipt:** "Reading…", then "6 items · RM45.60 · Check".
  - **A split at the table:** "2 of 4 ticked", until it locks.
  - **Paying a friend:** "Mei · RM24.40" while you're in TNG, until TNG's notification ticks the share.
  - **Payday moves:** a segmented bar, one segment per move, each filling as its notification lands.
  - **ESS filing:** "Sending July claims · 2 of 3", then the reference.
  - **Sen working** on something you asked: Sen's state, then *Answer ready*.

  Each look sets the island's icon, accent colour, chip text and progress colours and marker; the pill's shape and font are the phone's.

### 9.2 Home: at most four figures

1. **Review (N):** what needs you (§6.6), shown as the *Review* tab's badge (D68).
2. **Spent this cycle vs the same day of the last cycle.** Pace, not total.
3. **Left until payday:** income received this cycle − spending this cycle, i.e. surplus or overspend so far (D14).
4. **Total balance**, with the unaccounted gap the last balance check found (§7).

A fifth figure means demoting one of these. The owner confirmed these four (D30).

**Layout (D59, D68).** *Left until payday* is the one large figure, with the days to go, and pace sits under it; it opens this cycle's payments. Sen's latest note sits below. Total balance and the gap are a quiet row at the bottom. Health warnings sit above everything (§18), and on payday the *Payday* card does too (§9.7).

### 9.3 Insights

**One scroll of question cards (D62, D73).** Each card is a question, a chart that answers it, a one-line takeaway computed by code, and *Ask Sen about this*, which opens Sen with that question. A card with no data isn't shown. Budgets, goals, buckets and subscriptions are edited from their cards. Charts follow the `dataviz` skill: thin marks, one accent for *this cycle*, grey for context.

| Group | Question | Chart |
|---|---|---|
| This cycle | *Am I on track?* | Cumulative spending this cycle against last cycle, the estimate to payday dashed, income as the ceiling |
| | *Which budgets are at risk?* (D29, D31) | A meter per budget, with a tick at how much of the cycle has gone |
| | *Where did it go, and what changed?* | Each category this cycle, with a tick at its typical level by this day (12-month median); bars above typical in the accent (v0.16 §7.14.3) |
| | *When does the money leak?* | A calendar of the cycle, each day shaded by discretionary spending |
| | *Do the small things add up?* | A figure: payments under RM15 this cycle, their count and total |
| Food (v0.16 §7.14.4) | *What does a meal cost me?* | The **meal average** (a bill ÷ the people who ate it, or your share on a split, D66), labelled an estimate, with a sparkline of recent cycles |
| | *Am I keeping my experiment?* | Weekly counts against the limit Sen is tracking, such as GrabFood 3 times a week (§12.1) |
| | *Eating out or cooking?* | Eating out against groceries, part to whole |
| Commitments | *How much is spoken for before I spend?* | Fixed costs, spending so far and what's left, part to whole |
| | *What renews soon?* | Subscriptions: the monthly commitment and the next renewals, with forecast against actual (§11) |
| Over time | *Am I saving more than before?* | What was left at each payday, the last six cycles, with the median |
| | *Will my goals make it?* | A meter per goal and bucket (§10) |
| | *Can I trust these numbers?* | The unaccounted gap per cycle (capture only, §7) |
| | *Where do I spend most often?* | Top merchants this cycle |
| | *The year* | Spending by month, savings rate and relief tags (§14) |

**Not built:** net worth, investments, scores, streaks, gamification, onboarding tours. First-run setup (§9.5) is setup, not a tour. (*Per-day charts* were here; D73 added the calendar.)

### 9.4 Look and feel (D43, D44)

- **This app's own design**, built on shadcn/ui's tokens (D43). `S2` designs its looks, each a theme, its icon and Sen's avatar together (D57, D76). What they share is the identity: a quiet instrument (D75).
- **Light and dark follow the phone, live**, status bar included. Settings can override it: *System* (the default), *Light* or *Dark* (D44).
- **Six looks, four a year, one per quarter (D77, D78).** Each look is a theme, its icon and Sen's avatar, designed together (D57, D76). The pool holds six: Minted, Instrument, Firefly, Line, Mercury and Copper. On 1 Jan the two looks that rested last year come back and open the year, in a random order, and the other two places are drawn at random from the four that played and close it (looks that haven't played yet count as resting). **The roster is the same for everyone,** computed from the year, so it needs no table (D113). The look changes on 1 Jan, 1 Apr, 1 Jul and 1 Oct, Kuala Lumpur time, so no look rests two years running or is away for more than two years, and none plays twice in a row. More looks can join the pool later. Settings can pin one instead. It never changes silently: the first open on or after that date shows a reveal, animating from the old look to the new one, with *Keep it* or *Go back* (the old look stays for the quarter), and a *Change each quarter* switch that pins the look chosen when turned off (D84). Until then, the icon, notifications and widgets keep the old look. There's no accent picker (D58).
  - **Only materials change.** Layout and patterns are the same in every look, and the money colours (in, out, pending, warning) and each chart slot's colour (D83) keep their meaning and hue. Each look draws the tab bar's icons in its own material, on outlines every look shares (D80). Every other icon is one shared set, in the look's colour, line weight and line ends (D81).
  - **On Android, everything follows the look:** the launcher icon (one activity-alias per look, if the owner's launcher keeps the icon in place), notifications, prompts and widgets. In a browser or the PWA the look rotates inside the app; an installed PWA keeps its icon.
- The choice is kept on the phone.

### 9.5 First run (D26)

A step-by-step setup at first launch, in this order:
1. **Log in** with the emailed code.
2. **Choose your apps (D86):** the banks and e-wallets Sen listens to, suggested from the curated list, with *More* (§6.2).
3. **Notification access**, granted in Android's settings. If the switch is greyed out, the app opens its own info page first, so you can choose *Allow restricted settings* (§6.2).
4. **Keep Sen running:** the battery step every phone needs, then your brand's steps (§6.2). Each step opens the right settings page.
5. **Accounts:** one per chosen app, plus pots such as GO+, and stored credit (D93), each with the balance its app shows right now (§7).
6. **Your name as the banks print it**, for spotting transfers between your own accounts (D17).
7. **Expected payday:** the last working day of the month by default (D14).

Capture starts as soon as step 3 is done; anything it sees before setup finishes waits in the outbox. Balances count only what moves after each account's opening balance, so nothing is counted twice (§7). **If something breaks later**, such as notification access being turned off, Home shows a warning with a button to fix it (§18). The setup steps don't come back.

### 9.6 Friends and family (D52)

- **By invitation only.** You invite someone by email from Settings → *Members*, and they sign in with an emailed code. There's no open sign-up.
- **One app, two ways in.** In a browser, or as a PWA on Android or iOS: receipts, manual entry, splits, budgets, Insights and the agent. Inside the Android shell: notification capture as well. At start, the app checks whether it's inside the shell and what that person's switches allow, and shows only that. The API enforces the switches too, so hiding is never the only guard.
- **Without capture**, the app adapts:
  - committing a receipt creates its payment (§6.4)
  - time runs by **calendar month** (D79): a cycle that starts on the 1st, so every screen works the same. Home shows *Review* and this month's spending against last month
  - **a payday is optional.** Setting an expected payday in Settings → *You* switches them to pay cycles: a cycle starts on that payday, or on a salary they mark (D14), and *left until payday* appears once they enter the cycle's income. Without a payday, no salary starts a cycle, so there's no *Payday* card (§9.7)
  - balances, balance checks and the unaccounted gap don't appear
  - first run is short: sign in and categories (D26 amended, D79)
  - no capture watchdog; pushes go through the browser's web push (on iOS, only when the PWA is on the home screen), or wait in the app
- **Capture in a friend's shell** works with any bank they choose (§6.2, D86), starting with no templates like everyone else (D87).
- **A switch per feature per person (D98):** *Shell* (they can sign in to the shell and see the APK link), *Capture* (needs *Shell*; with it off, the shell unbinds its listener and `/sync` refuses bank events), *Agent*, *Splits*, *Receipts by email*, *Calendar* and *Claims*. The ESS filing stays the owner's alone.
- **AI credit, not a monthly cap (D98).** Each invited person starts with RM10 of credit and gets a free monthly allowance (RM2 by default), spent before their balance, by Kuala Lumpur calendar month. Each sees their balance and what's left of the allowance on their own screen. Before every model call, jobs included, the API checks the switches and that there's allowance left or a positive balance; a call already running may end slightly below zero. At zero, AI features pause until the allowance renews or the admin grants more, and everything else keeps working. **Nobody pays inside Sen:** if a friend pays the owner back, it happens outside the app, and the owner adds a grant.
  - **The admin** can grant credit, set a person's allowance, or make them *Unlimited*, whose charges are recorded as covered, so the owner still sees what they cost. Everyone, the owner included, has a daily safety ceiling, because Vertex has no prepaid stop (§5.1).
  - **Each call's charge** is its token counts × Sen's rate card at that moment, in integer sen, rounded once, and stored in an append-only ledger (§15). It's a fact of Sen's credit system, like a price printed on a receipt, not a guess at Google's bill, which stays an ordinary transaction (§11). Failed calls aren't charged. The balance and the allowance left are computed, never stored. The owner has no ledger: their usage stays as tokens, with an estimate shown and never stored.
- **Members (D98):** *Invite* (email, *Browser/PWA* or *Android shell*, switches, welcome credit, allowance or *Unlimited*), *Resend* and *Revoke*; for each member, their switches, credit (balance, this month's free use, *Grant*, *Refund*, the daily ceiling), their shell version and *Capture connected: yes/no*; a count of shell seats against Google's 20-device limit (§5.1); *Suspend* (signs them out everywhere) and *Remove* (offers their export, then deletes their data through a function the owner can't read through).
- **Private from everyone, you included.** RLS keeps each person's money to themselves. As admin, you see only invitations, switches, credit totals and support facts, never anyone's money or chosen apps, through functions that check the admin flag.
- **The agent for a receipts-only person** works from what exists: spending, categories, meal averages and budgets. Skills that need balances (the payday plan, the rate watcher, closing the gap) stay off.
- **Built after your own daily use is solid**, but designed in from the first migration: roles, invitations, switches and credit (P8).

### 9.7 Payday (D60)

When a salary lands and starts a new cycle (D14), Home shows a *Payday* card above the figures. It walks through up to four steps, one screen each:
1. **Your claims, from the payslip (D104).** Only when claims are submitted (D45, §13). When the payslip's net pay matches the salary and its lines include the approved claims, code has already split the salary, and this step shows it done, with *Undo*. Without a payslip, or when something doesn't match, it asks *Did this salary include your claims?*, with the claims ESS approved named and *Yes* preselected (D96).
2. **Balance check** (D18).
3. **Last cycle's look-back:** the three biggest reasons it went the way it did, and one experiment for this cycle (§12.1).
4. **This cycle's payday plan:** what's due, what to set aside, what's left to spend (§12.1).

Any step can be skipped; it then waits in *Review*. Steps 3 and 4 need the agent, so until it exists the flow is the first two. Steps a person can't use aren't there (D52): without capture there's no balance check or payday plan.

---

## 10. Savings goals

As in v0.16 §7.13, counted in pay cycles (D14):
- the amount needed each cycle
- **feasibility against your median surplus**, with the sample size shown
- projected completion at the current rate
- competing goals
- discretionary trade-off framing: *"RM200 a cycle less on drinks brings this forward 3 months"*

**Buckets** are goals that come back every year, for lumpy costs such as road tax or the trip home at CNY. Each is filled by a set-aside every cycle, which the agent proposes (§12.1).

No investment-return assumptions.

---

## 11. Subscriptions and AI costs

- **Subscriptions are declared:** name, amount, currency, cadence, next renewal. The amount is in its billing currency's smallest unit, such as US cents, and it's a forecast. The MYR charge that matches it is the fact. The exchange rate is kept as `NUMERIC` for display only and never used to compute money.
  - **Where the rate comes from (D99):** before the first real charge, Bank Negara's 17:00 middle rate, fetched once a day by the morning job (the ECB as fallback), rounded to 4 decimal places as text and shown as *≈ RM40.88 · BNM 7 Oct*. After the first charge, that charge's own rate (the MYR charged ÷ the declared amount), which includes the card's markup. It's kept on the person's `subscriptions` row, never in a shared table. The agent's web search never fetches it.
  - Expected charges are **forecasts in `subscription_charges`, never transactions**.
  - A real charge is matched by subscription, amount tolerance and date window. No match by the end of the window means *missed* (v0.16 §7.11.2).
  - The MYR amount actually charged is the truth (v0.16 §7.11.3).
- Now that notifications show recurring charges, the agent may *suggest* "this looks like a new subscription". You declare it.
- **Invoice emails (D56):** a forwarded invoice from a declared subscription attaches to its charge, and one from a new sender suggests a subscription to declare.
- **AI costs** (receipt reading, template drafting and agent calls):
  - Token counts per call are facts, stored in `ai_usage`.
  - The provider's monthly charge is an ordinary transaction.
  - For the owner, any month-to-date ringgit estimate is computed for display only and never stored (v0.16 §7.11.4).
  - For an invited person, each call's charge to their credit is priced by Sen's own rate card at that moment and stored in `ai_credit_entries` (§9.6, D98). It's a fact of Sen's credit system, not an estimate of Google's bill, which stays a transaction.

---

## 12. The AI agent

### 12.1 What it does

**Its job is to be your money secretary (D40):** it plans, watches, researches, chases and reviews, not just summarises. **Voice (D35):** brief and plain, like a friend who's good with money. Short, specific, no lectures. It shares the app's name: *ask Sen* (D48). Its avatar is an abstract, animated mark whose state shows what it's doing (D76).

**Plan**
- **A payday plan you tick off by doing it.** On payday, `get_payday_plan` computes the cycle's split in SQL: what's due before the next payday, each goal's and bucket's set-aside, and what's left to spend. The agent only writes it up and proposes it. You make the moves in your bank apps, and matching ticks each one off when its notification arrives (`payday_plans`).
- **Buckets for lumpy costs.** It finds the yearly costs in your history, or asks about them (road tax and car insurance, CNY and the trip home, 11.11 sales), and proposes a set-aside each cycle (§10).
- **"Can I afford it?"** It answers with the trade-off, from its tools, and offers to set up a goal.
- **Projection:** spending and balance at the end of the cycle, explained.

**Watch**
- **Early warnings:** a budget about to break (D31), unusual spending, a growing unaccounted gap, a deadline coming up (`get_deadlines`, claims included, D95).
- **Closing the gap.** When the unaccounted gap grows, it looks for days with nothing captured and asks pointed questions (*"Nothing was captured on Saturday. Did you pay for anything?"*). For each payment you remember, it opens manual entry with the day filled in, and you type the amount.
- **Holding you to your word.** It remembers rules you set, such as *"two bubble teas a week"*, and speaks up when one is about to break.

**Research and optimise (D39)**
- **A rate watcher.** It researches where to keep savings (Ryt, other digital banks, GO+, fixed-deposit promos), with sources and dates. Code compares the figures you confirm on your real balances, caps and promo end dates. It checks again every month and tells you when something changes.
- **A product advisor.** Code works out from your actual spending whether a credit card (or another product, such as a cashback card or wallet) would be worth having. The agent researches the options you could sign up for, and code compares them net of fees. Once you have them, it tells you which to use for each kind of spending.
  - It only recommends a credit card on the condition that the bill is paid in full every month, because the interest would wipe out any cashback. It then watches that you do.
  - Signing up is yours to do. A new card becomes a tracked account, and paying its bill is a transfer (§7).
- **Money left on the table, once a cycle,** in ringgit, with the fix for each: cashback missed by paying the wrong way, interest lost on idle money, fees paid.

**Chase and file**
- **Deadlines go into your Google Calendar (D40, §12.7):** renewals, card bills and promo end dates. Claim deadlines go in too, written by code (§13).
- **Promises:** a refund or a return, added by you or proposed by the agent. It waits for the money to land and chases it if it doesn't.
- **What's owed to you:** who still owes what, with a message ready to copy and send.
- **Chores:** suggested answers for the whole *Review* backlog, prepared nightly and approved in one go, new subscriptions spotted, and merchant rules set up from what you type (§8).
- **Claims (D95):** what's due or missing this month, chasing the evidence, how much comes back, and drafting a scheme from your own words (§13).

**Review**
- **Check-ins:** a short daily note around **9pm**, only on days when something is worth saying (D35); a weekly summary; a review when each cycle ends.
- **A payday look-back with one experiment:** the three biggest reasons the cycle went the way it did, and one concrete experiment for the next (*"GrabFood at most 3 times a week"*), which it then tracks.
- **Answers:** "Where did last month's money go?", "How much on bubble tea since June?"
- **Proposals (D36, D40):** the kinds listed in §12.3. Each is applied with your tap.
- **Memory:** things you tell it, such as your goals, rules and experiments, kept in `agent_memory`.

### 12.2 Hard rules

1. **Every figure is traceable (D108).** Every figure Sen states comes from a tool result in this run, or from your own words. It never states a figure about your money from memory, and it does no arithmetic itself: `calc` does any sum, average, what-if or currency conversion, and a file you sent is read by `read_file` (D109). Code matches every RM figure in Sen's text against this run's tool results and your messages. In the chat, a figure it can't trace is shown marked *not checked*, rather than blocking the reply. A background message that fails is written again once, then replaced by a line code writes (D94).
2. **Read-only by default.** Changes are *proposals* (`agent_proposals`) that you apply with a tap, through `/proposals/:id`, never through the model. It never edits transactions directly. Applied changes are audit-logged with actor `agent`. Its only direct writes are its own: `agent_memory` (`remember`, `forget`), research briefs, and events in the app's own calendar (`add_to_calendar`), which carry no amounts.
3. **No verdicts on whether a claim will be approved, and no tax advice (D95).** It may state code's facts (what's tagged to a scheme, a draft's total, what's missing) and propose tagging a merchant with a scheme.
4. **Only your data.** Chats run with your session, so RLS applies. Scheduled runs list the people they're for through one narrow function, then run as each person in turn, under the same RLS (§16).
5. **Privacy (D34).** The model sees only what its tools return for the question asked: transactions (amount, date, merchant, category, note), totals, and your claims as you typed them (D95).
   - It never sees raw notification text or account numbers.
   - It never asks for passwords, codes, account numbers or the employer's handbook, and declines a handbook if offered one, asking for your own words instead.
   - Only a paid API that doesn't train on your data.
6. **Research (D39, D94).** It may search the web.
   - Every figure it finds is a draft, with its source and the date it was checked, until you confirm it into `products`.
   - Searches never include your own figures, such as your salary, balances or spending. **Only the researcher subagent uses search grounding** (§12.5), given a question that code has checked contains no amounts. Grounding can't be zero-retention: Vertex keeps its queries for up to 3 days (D55).
   - **Each finding** is `{text, figure_text?, source: {url, title, site}, checked_on}`. The researcher follows each redirect once and stores the real page's address (`https:` only, never an internal address). Its text is shown unedited, as Google's terms require, with a numbered marker by each figure, and below it the numbered sources: title, site, *checked 7 Oct 2026* and an external-link icon. Sen's own comment is a separate bubble.
   - **Sen writes no URLs.** Code removes any link in its text that isn't one of this run's sources. Every source opens in the phone's default browser, never inside the app (§17).
   - Code does every comparison, from confirmed figures only. Research briefs are deleted after 2 years.
   - It's information, not financial advice. It never signs you up for anything and never moves money.
7. **Claims (D95, replacing D10's rule).** Sen sees schemes, caps and amounts as you typed them, claim drafts, statuses, missing evidence and deadlines (`get_claims`, and claims in `get_deadlines` and `get_needs_attention`). Claim reminders and calendar entries stay code's (§13) and don't use up the one push. A salary reaches Sen only once the payday claims question is answered, by the payslip or by you (D45, D104), now for correctness: the income isn't known until the salary is split. Sen can draft a scheme from your own words (§13); the handbook never reaches it (rule 5).

### 12.3 Tools (deterministic: SQL views and functions)

**Always on:** `load_skill(name)` · `list_transactions(filters, limit)` · `get_spending(period, group_by)` · `search_notes(text)` · `link_record(kind, id)` · `show_chart(query, params)` · `ask_user(question, options)` · `propose(kind, payload)` · `remember(note)` · `calc(expression)` · `read_file(id)`

**Brought by skills (§12.5):** `get_budget_status(cycle)` · `get_balances(as_of)` · `project_cycle_end(cycle)` · `simulate_spend(amount, date)` · `get_subscriptions()` · `find_recurring()` · `get_goals()` · `find_yearly_costs()` · `get_unaccounted(period)` · `get_quiet_days(period)` · `get_owed()` · `get_payday_plan(cycle)` · `get_cycle_review(cycle)` · `get_left_on_table(cycle)` · `get_needs_attention()` · `get_deadlines(days)` · `get_claims(period)` · `get_payslips(period)` · `get_products()` · `compare_products(kind)` · `get_promises()` · `get_rule_status()` · `find_merchants(text)` · `list_categories()` · `list_memory()` · `forget(id)` · `search_messages(text)` · `research(question)` · `add_to_calendar(event)` · `open_screen(screen, params)` · `get_checkin_signals(date)` · `get_week_review(week)` · `post_checkin(push, message)` · `stay_silent(reason)`

`calc` evaluates arithmetic on figures already in this run (a tool result or your message) in integer sen, never floats, and returns the result with its working; currency conversion uses a rate a tool returned (D108). `read_file` returns the text of a file you sent in the chat (D109). `get_payslips` returns each payslip's lines, never an IC or account number (D104). `get_payday_plan` computes every line of the plan in SQL, so the agent never adds a figure of its own. `get_left_on_table` is deterministic: cashback missed by paying the wrong way (from confirmed products), interest lost on idle balances, and fees paid, each in ringgit. `compare_products` is deterministic: your spending by category over the last 12 cycles × each confirmed product's rates, within its caps, minus its fees. `project_cycle_end` is deterministic: spent so far + declared subscriptions due before payday + recent daily pace of variable spending × days to the expected payday. `research` returns sources and drafts, never confirmed figures (§12.2 rule 6). `find_merchants` never returns a relief facet.

**Tools that show something in the chat (D94).** A server tool has an `execute` function; an app-side tool has none, reaches the app as a typed part, and the app answers it (AI SDK 7's `addToolOutput`).

| Tool | Runs on | Shows as | Your action |
|---|---|---|---|
| `ask_user(question, options[{label, tradeoff, recommended}], other?)` | the app | buttons styled like a Review row, 2–4 options, the recommended one first and marked | Your tap is the answer. The server accepts only an option it offered, or text marked as yours. In a background run, the run waits (`waiting`) until you answer |
| `propose(kind, payload)` | the server: checked with zod, saved to `agent_proposals` | a proposal card, also in *Review* | *Apply* or *Dismiss* call `/proposals/:id`; code applies it, logged as Sen's, with *Undo*; no model call. Proposals outlive their chat, so they don't use the SDK's chat approvals |
| `open_screen(screen, params)` | the server, against a list of allowed screens | a button: *Add a payment for Sat 4 Oct* | Opens the screen filled in, never with an amount |
| `show_chart(query, params)` | the server, running a named query written in code | the shared chart card | none |
| `link_record(kind, id)` | the server, checked under RLS | the shared list row | Opens it |

**Kinds of proposal:** a budget, a merchant rule, a subscription to declare, a goal or bucket, the payday plan, a promise to watch for, an answer to a *Review* item, a claim scheme from your words (D95), and an experiment's check.

### 12.4 Proactive runs

The checks that trigger a message are deterministic SQL; the agent only writes the message (D94).
- **`get_checkin_signals(date)`** returns named signals not yet sent (not in `alerts_sent`): a budget past 80%, or over (D31); a payment above 95% of that category's usual payments; a day with nothing captured when you usually spend that day; an experiment one away from breaking; a deadline or promise within 3 days; five or more *Review* items older than 3 days; a missed subscription charge; a claim missing evidence.
- **No signals means no model call**, so a silent day costs nothing. Otherwise the evening job (21:00) starts a fresh run with the `checkin` skill: the fixed part (prompt, memory) and a message like this, with no chat history. The signals arrive as a tool result, so rule 1 holds word for word:

  ```
  [Daily check-in · Wed 7 Oct 2026 · 21:00 MYT · cycle day 7 · payday expected Fri 30 Oct]
  get_checkin_signals → (code's figures)
   1 budget_80   Drinks & desserts: RM161.20 of RM200.00; 23% of the cycle gone
   2 quiet_day   Sat 4 Oct: nothing captured; Saturdays usually RM40.00–RM60.00
   3 experiment  GrabFood ≤3 a week: 3 so far, week ends Sun
  Pushes sent today: none.
  Write one push line (≤90 characters, no greeting) and one chat message (≤60 words), most
  important first. Figures only from tool results. You may ask_user about the quiet day, or
  propose. If nothing deserves their attention, call stay_silent(reason).
  ```
- **Sen answers with `post_checkin({push, message})`.** Code checks the length and the figures, sends at most one push a day (`alerts_sent` key `sen_push:{date}`), and posts the message in the conversation and on Home. **No push if you opened Sen since 18:00**; the message still posts.
- **Weekly, on Sunday:** `get_week_review` gives the week against a typical week, each experiment's progress, and amounts owed for more than 7 days. Sen writes up to 120 words, and pushes only if that day's push is still unused.
- **Cycle end** starts when `/match` marks a salary, not by the clock. `look-back` and `payday-plan` fill steps 3 and 4 of the *Payday* card (§9.7). Its push is that day's one push.
- **Pushes written by code don't count** against the one a day: health alerts (capture is off, backups are failing: §18) and claim reminders (§13). A nagging app gets its notifications muted, and that would silence the alerts that matter (v0.16 §7.3.3).
- **Review's suggested answers** come from the `review-sorter` subagent, nightly and after a big sync, never when a screen opens.

### 12.5 How it runs (D53, D94)

- **One loop, in Claude Code's shape.** Sen is a main prompt, a list of skills, its tools (§12.3) and subagents. On each step the model either answers or asks for tools; the server runs them, and the loop repeats until it answers, within a step limit. It's AI SDK 7's `ToolLoopAgent`, not a framework such as LangGraph.
- **The main prompt**, about 1,500 tokens, always in this order: the prompt, tool declarations, the skill list, memory, the rolling summary, then the messages. What changes per call (the date, the screen Sen was opened from) goes in the user turn, so the start stays identical. Its outline:

  ```
  # Sen
  You are Sen, the money secretary in the Sen app for {name}: you plan, watch, research, chase, review.
  ## Voice
  - Brief and plain, a friend who's good with money. Calm, precise, discreet. No lectures, cheering, emoji.
  - Lead with the answer: ≤3 sentences or ≤5 bullets. Money exactly as tools format it (RM1,284.50).
  ## Rules you never break
  1. Every figure you state is in a tool result from this run or in their own words. No source, no
     number. Any arithmetic, conversion or rounding: calc. Figures from old messages or the summary
     must be fetched again.
  2. You change nothing directly: propose() cards the person applies. Direct writes: remember,
     research, add_to_calendar (no amounts).
  3. Never say whether a claim will be approved. No tax advice.
  4. Web only via research(); never put their figures in a question. Findings are drafts with source
     and date. Information, not advice. Never sign anyone up or move money.
  5. Never ask for passwords, codes, account numbers or the employer's handbook; if offered it,
     decline and ask for their own words.
  6. Never write a URL; sources render from research results.
  ## How you work
  - Task on the skill list: load_skill first. Narrowest tool; prefer one that computes.
  - Tool error or empty result: say so in one line. Never guess.
  - >4 figures: show_chart. A payment or split: link_record. Something to do: open_screen.
  - Background run: follow the job's skill; nothing worth saying, stay_silent.
  ## Asking and proposing
  - Ask only when the answer changes what you do and no tool knows it: ask_user, one question,
    2–4 options, recommended first, the trade-off inside each. Never ask what Review asks.
  - Propose reversible things they'd plausibly want: one card per change, one line of why.
  ## Skills
  {name: one line each}
  ## What you remember
  {agent_memory}
  ```

  Gemini caches automatically only from 6,144 tokens, so the prompt isn't padded to reach it; P6 reads `cachedContentTokenCount` to see what was cached.
- **Skills** are markdown files in the repo, one per capability, each headed `name · description · tools · requires (capture|claims) · phase`. A skill runs on Sen's own model: loading it adds its text and tools to the conversation, and starts no new run (D107). The main prompt lists each in one line, and loading one switches on its own tools (`prepareStep` → `activeTools`), so unused tools cost no input tokens.

  | Skill | When → what it does | Phase |
  |---|---|---|
  | `answers` | Past spending, a payment, a merchant, a note | P6 |
  | `checkin` | Background only: the evening note and the weekly summary (§12.4) | P6 |
  | `payday-plan` | A salary landed, or "how do I split my pay" → writes up the SQL plan and proposes it | P6 |
  | `look-back` | A cycle ended → three reasons, one experiment | P6 |
  | `afford-it` | "Can I afford…", "where will I end up" (the projection) | P6 |
  | `budgets` | Setting a budget, or one at risk | P6 |
  | `goals-buckets` | Saving for something; yearly lumpy costs | P6 |
  | `close-the-gap` | The gap grew, or a day with nothing captured → asks you, opens manual entry | P6, capture only |
  | `hold-to-word` | A limit in your words ("two bubble teas a week") → an experiment with a `check` code can count (merchant keys or a category, count or sum, a limit, a window), confirmed by you | P6 |
  | `merchant-rules` | "Anything from KK MART is groceries" → one proposal per merchant (§8) | P6 |
  | `review-chores` | "Sort my Review" → hands it to `review-sorter` | P6 |
  | `subscriptions` | Recurring charges, renewals | P6 |
  | `owed` | Who owes me, what I owe → reminds by sharing the split link again | P6 |
  | `promises` | A refund or return to watch for | P6 |
  | `calendar` | "Put it in my calendar" | P6 |
  | `memory` | Remember this, what do you know, forget that | P6 |
  | `rate-watcher` | Savings rates, FD promos, the monthly re-check | P6b |
  | `product-advisor` | Is a card worth it, and which to use for what | P6b |
  | `left-on-table` | Once a cycle: cashback missed, idle interest, fees | P6b |
  | `claims` | What's due or missing; a scheme described in your own words (D95) | P7 |

  *P6b* is after the core agent, once some products are confirmed.
- **Subagents** run the same loop with their own prompt, tools and fresh context; only their final report reaches Sen, and you only ever talk to Sen.

  | Subagent | Purpose | Tools | Tier |
  |---|---|---|---|
  | `researcher` | One question, checked by code for amounts → findings, each with source and date | search grounding only: Vertex can't combine search with function tools in one request, so it's a separate run | main, or strong if P6's eval says so |
  | `review-sorter` | A suggested answer for each *Review* item, with a reason and a confidence; applies nothing | `get_needs_attention`, `list_transactions`, `search_notes`, `list_categories`, `propose` | cheap |
  | `summariser` | Writes the rolling summary; code rejects one containing a money figure | none | cheap |
- **A model per subagent, not per skill (D107).** Skills run on Sen's model. Subagents, background runs (which start fresh, such as the evening check-in) and the readers (receipts, templates, email, chat files) name a tier: *cheap*, *main* or *strong*, resolved in `ai/models.ts` (§12.6). A skill that needs a stronger model for one step hands that step to a subagent.
- **Context stays bounded**, however long the conversation runs:
  - a fixed part, identical on every call so the provider caches it: the main prompt, the skill list and memory (`agent_memory`)
  - a rolling summary of older conversation, plus the last ten or so messages. The summary keeps no amounts, and a figure recalled from history is unverified until a tool returns it again (§12.2 rule 1)
  - tool results only for the question at hand; afterwards, only Sen's answer is kept
  - `search_messages`, five snippets at most, for questions such as "what did we say in June?"
- **Files in the chat (D109).** The composer has a clip button for photos, screenshots and PDFs, and Android's share sheet offers *Ask Sen* beside the receipt. A file is uploaded to R2 like a receipt, kept with its message, and sent to Gemini as you sent it, costing AI credit. `read_file` returns its text (a PDF's own text, or a cheap model's transcription of an image), read once and kept with the file, so Sen's figures from it are traceable and marked *from your file*. Anything worth keeping goes through the receipt reader and `confirm` (§6.4), never straight into the ledger. **Voice is in the backlog:** Gboard's microphone already types into the composer; a mic button (Android's on-device speech, or Gemini audio for Manglish) may come later.
- **The app sends only the new message or a tool's answer**, never the history, which the server loads from `agent_messages`, so a modified app can't forge it. Messages are stored as the SDK's `parts`, so every card redraws after a reload.
- **Background runs** (the evening note, research, the payday plan) start fresh, with memory and what they need, and post one message into the conversation, with a push.
- **Where:** the API on Vercel Functions. `/agent/chat` streams a reply, and `/jobs/*` starts background runs. Each step is saved in its own short transaction (`agent_runs`, `agent_steps`). Before its time runs out, a run queues a one-off job that calls `/agent/runs/:id/continue`, so work longer than one function call carries on in the next, and a failed call is retried by the scheduler (D99). A chat message's id is made in the app, so a retried send is a no-op.
- **What Sen costs (estimates at 2027 prices):** for the owner's month (two chats a day, the evening notes, a nightly sort), about RM13; RM0 on a silent day.
- **Later:** Sen's tools sit behind one interface, so the owner's future personal assistant can call Sen as a subagent, through an MCP server then.

### 12.6 Models

**Provisional until tested (D94).** Each phase that first calls a model picks it with a small benchmark and records a decision; the bar is fixed (a paid API, no training on the data, zero retention, D34). For the agent, P6 compares its first candidates, Gemini 3.8 Flash and Claude Haiku 4.5 (D55), on 20 real questions over at least a month of your data, scored against the SQL truth, plus whether you actually like reading the check-ins. Gemini 3.8 Flash's launch price ends on 1 Jan 2027. Search grounding is a Vertex feature, so moving the researcher to another provider needs a new research tool.


### 12.7 Your calendar (D40, D41)

Deadlines go into Google Calendar, so your calendar does the reminding: renewals, card bills and promo end dates from the agent, and claim deadlines from code (§13). They carry no amounts.

- **You sign in with Google once (D41)**, from Settings. The app asks for the narrowest permission Google offers, `calendar.app.created`: it creates its own *Sen* calendar in your account and can only touch that one, never your other calendars. If Google won't grant it, the calendar stays off, and *Review* and pushes still remind you.
- **The sign-in opens in the phone's browser** (a Custom Tab), because Google blocks sign-in inside an app's WebView. The app first gets a short-lived code from `/calendar/connect`, signed with a server secret, which travels in the sign-in's `state`. The callback checks the signature, so no table is needed, then stores the token and sends you back to the app.
- **The server side is the API.** It keeps Google's refresh token encrypted (AES-256-GCM) with a key from an environment secret, and writes the events. The app itself never holds it (D54).
- **The Google app must be published.** While a Google OAuth app is in *Testing*, its refresh tokens expire every 7 days. Publishing it to *In production* stops that. Unverified is fine for an app only you use: you see a "Google hasn't verified this app" screen once (`docs/local.md`).
- An event changes when its deadline changes, and goes when the deadline is done. `calendar_events` maps each deadline to its Google event, and the morning job keeps them in step.
---

## 13. Claims (small feature)

**How claiming works today (D45):** each month's claims go in online through the employer's ESS, with files attached, by a fixed day early in the following month. The money comes back inside the next salary.

- **Schemes** are rows you enter in Settings, starting from nothing (D95): name, period, cap, the deadline day of the following month, and where the claimable amount comes from: the spending tagged with the scheme, or the evidence receipt.
  - Today: *phone & data* (monthly, proved by the phone bill PDF) and *travel* (monthly, proved by the My50 pass receipt).
  - Any later scheme, such as flexi, is another row.
  - **Sen can draft a scheme from your own words (D95):** you describe it, Sen calls `propose('claim_scheme', {name, period, cap_text, deadline_day, amount_source})`, code turns `cap_text` into sen, and every figure must appear in your own message. You confirm it on the card. Nothing is uploaded: the handbook is never stored or sent to a model.
  - **Real values live only in your database (D10, D95):** never in the repo, test fixtures or a build session. Inside the app, Sen sees what you typed.
- **Tagging:** a merchant rule can carry a scheme. Your telco → phone & data, whose amount is the tagged spending. Travel takes its amount from the My50 receipt, filed as evidence (§6.4), because the TNG card it's paid from also pays for parking (D16). Its claim still covers transactions: that month's TNG card reloads, up to the claim amount, so the salary split has something to repay (D45).
- **The month's claim drafts itself** on the 1st, per scheme:
  - the claimable amount, computed by code from the scheme's source (the period's tagged spending, or the evidence receipt), capped at the scheme's cap
  - the evidence already in the app, such as the bill PDF you shared and the My50 receipt
  - what's missing, such as *"My50 receipt not added yet: share it to the app"*
- **Reminders, all written by code**, so they arrive whatever Sen does, and outside its one push (§12.2 rule 7):
  - the deadline in your calendar (D41)
  - the claim in *Review* from 7 days before it
  - a push 3 days before, and on the day

  Each is sent once per scheme, period and reminder (`alerts_sent`).
- **The submission kit** is one screen per claim, laid out in ESS's order: each amount to type, with a copy button, and each file ready to attach. In the shell, *Send to ESS* does it for you (§13.1); in the PWA you submit in ESS yourself, then tap *Submitted*. The claim then waits for its money, which arrives inside a salary.
- **The claim pack (D97): one PDF to print**, for the hardcopy submission, whichever way ESS was filled. *Download claim pack* on the claim period builds it on the phone (pdf-lib) from files it already holds, so it works offline, and you print it as it is:
  - **One claim line per page**, grouped by scheme, then by date, with *page N of M* in the header, because a dropped page in a stack is otherwise invisible.
  - **A header on each page:** the claim period, the ESS reference once there is one, the date, the merchant and the amount claimed. When only part of a receipt is claimed, a line says so (*Receipt total RM98.40 · RM30.00 claimed*), or HR bounces it.
  - **A thermal receipt** (`has_physical_original`) prints its day-one scan on the left and a bordered paste area on the right, sized for the widest common slip (about 80 mm), for the original.
  - **A document receipt** (the phone bill PDF, an e-invoice, an emailed receipt) prints full width with no paste area: the printed page is the submission copy.
  - It's the ≥1200 px scan that makes this legible (§6.4 Storage), and it's never stored: built again on demand.
- **Paid inside your salary (D45, D104).** When a salary lands while claims are submitted, the payslip answers whether it included them. Code checks that the payslip's net pay equals the salary credit to the sen, and finds each approved claim's amount among its lines. When both hold, the salary credit is split: the claims' part becomes repayments to the transactions they cover, so the phone bill's spending drops by what was reimbursed (D19), and the rest is income. The payday card shows it done, with *Undo* (§9.7). Without a payslip (the PWA, ESS switched off, or none found), or when something doesn't match, the app asks once instead. A claim the salary didn't include stays submitted, and the check comes back with the next salary.
- **The payslip (D104)** is fetched from ESS when a salary is captured (§13.1), and kept as evidence for 7 years. Code reads it through the recipe's payslip map into lines (gross pay, EPF, SOCSO, EIS, PCB, claims, others), never storing an IC or bank account number as data. Its statutory lines feed the LHDN reliefs (§14).
- **Rejected:** with a reason. The expense stays as your spending.
- **Claim record:** scheme, period, amount, status (`to_submit → submitted → approved → paid | rejected`), `approved_amount` for a claim only partly approved, ESS's reference (`ess_ref`), the transactions it covers, and its evidence files.
- **Approval emails (D96).** Mail from the ESS sender in Settings → *Claims* goes to a claims parser before any model sees it: it looks for a submitted claim's reference and a fixed status word (*approved, diluluskan, rejected, ditolak*) and moves the claim; one it can't place shows in *Review*. If the employer blocks automatic forwarding, forward approvals by hand, or the ESS screen reads ESS's own status list when you open Claims. The D45 salary split uses `approved_amount`.
- **ESS is filed, and the payslip fetched, from the phone** (§13.1, D96, D103–D106).
- **v0.16's claims engine is in the backlog** (D50); its printable claim pack is back (D97).
- ⛔ **The employee handbook never goes in the repo or into an AI's context.** It forbids reproducing, storing or transmitting it (v0.16 §12.3). Describe schemes in your own words in Settings. The employer's claim-classifier prompt stays out too, as in v0.16.

### 13.1 The ESS adapter, on the phone (D46, D96, D103–D106)

**The owner confirmed that automating ESS is allowed:** it's an internal project, it has launched, and it works outside the office.
- **An adapter of plugins (D105).** One shared **sign-in**, then capabilities: **fetch payslip** and **submit claims** now, and others later, such as the EA form for §14. Public code holds the interface and an engine. Everything about one company's ESS is a **recipe**, a row in that person's own data (`ess_recipes`): its address, its steps, and its field and payslip maps, with slots such as `{claim.amount}` where values go, never the values. A new company is a new recipe, not new code. The rest of the claims feature works without the adapter, and it can be switched off.
- **Two kinds of step.** `http`: a request replayed in Kotlin with the signed-in session's cookie, filled from the claim or from an earlier response (a token, an id). `page`: fill and click by label in the sealed browser, for what can't be replayed, such as a sign-in through company SSO. A recipe mixes them freely; `http` is preferred, because it's steadier than clicking.
- **The sealed browser.** A native screen in its own process, with its own web-data folder (`WebView.setDataDirectorySuffix`), so ESS's cookies and storage stay apart from Sen's. Kotlin drives the page with `evaluateJavascript`, with no bridge, and hands the evidence files to ESS through `onShowFileChooser`. Its cookie jar is shared with the `http` steps.
- **Signing in (D103).** You type ESS's username and password once, in a native screen (Settings → *Claims* → *ESS*). The shell encrypts them with a non-exportable Android Keystore key that needs no fingerprint, so background work can sign in by itself, from your phone and network, as you would. They never cross the bridge to JavaScript, never sync, and are left out of Android's backups. *Forget ESS password* deletes them; a reinstall asks again. If ESS asks for a second step, or signing in fails twice, a push asks you to sign in yourself in the sealed browser, where Google Password Manager fills it.
- **Fetch payslip, by itself (D104).** When a credit marked salary is captured, a background job (WorkManager, needing a network) signs in and fetches that month's payslip within minutes, then uploads it like a receipt (§16). Not out yet: it retries hourly for 6 hours, then daily for a week, then shows *Payslip not found* in Review. Code reads it (§13 *Paid inside your salary*); no model reads a payslip.
- **Submit claims, one tap.** On the 1st a push says the month's claims are ready. You review them; then *Send to ESS* fills every field from the drafted claim, attaches the files, submits, and keeps ESS's reference (`ess_ref`) and a screenshot of its confirmation as evidence, while the island shows its progress (§9.1).
  - It only submits a claim whose evidence is complete and whose amounts code computed.
  - **It stops and asks** whenever anything isn't as expected: a field it can't find, a page that has changed, an amount that doesn't match the draft, or a sign-in that fails.
- **Teach mode: a recipe is recorded once (D106).** The first time you use a capability, you do it yourself in the sealed browser with recording on.
  - Code knows what you should be entering (the claim's amount, date and files; the salary's amount as net pay), finds those values in what you typed and sent, and maps each field to its slot.
  - A token or id ESS handed out earlier is found in an earlier response and chained.
  - A step that was a plain request becomes `http`; anything else becomes `page`, with the field's label and a fallback selector.
  - Only what code can't place, such as the payslip's other lines, gets names drafted by a cheap model, checked by code (the value must be where it says) and confirmed by you once, as with templates (D87).
  - The first replay of a new or changed recipe shows what it will send before it sends.
  - A recipe can also be imported as a file, without values: the owner's first comes from a capture on the laptop (D110).
- **No session ever reaches the real ESS.** Sessions build and test the engine against a made-up ESS and a made-up recipe kept in the repo. Real recipes live only in their owners' data, because the address names the employer (§17).
- **In the PWA,** a browser can't drive another site, so the submission kit and the claim pack do the job by hand, and the payday question is asked. A same-company friend in the shell can use the adapter too, with their own recipe and password.
- **Still to learn** (§21 Q29), mostly from the 8 Oct capture (D110): whether sign-in has a second step, how long a session lasts, whether payslips come as data or only as a PDF, how files are uploaded, and whether a draft can be saved or a claim withdrawn, for a safe first test.

---

## 14. LHDN reliefs (minimal, P7)

- An optional `relief_code` tag on transactions, with a yearly total per code against public caps. Public LHDN data can be committed.
- The part of a bill the employer reimburses is not relievable.
- **The payslip's statutory lines** (EPF, SOCSO, EIS and PCB, D104) give the year's contributions and tax already deducted. The EA form, a later ESS capability (§13.1), would confirm them.
- Receipt images are kept for 7 years. *Export everything* can be limited to one year, for an audit (§17).
- No e-Filing companion.

---

## 15. Data model (sketch)

**Money is `BIGINT` sen, in MYR**, except a subscription's declared amount, which is in its billing currency's smallest unit (§11). Accounts, transactions and subscriptions record their currency; multi-currency itself is out of scope (§20). Money inside a JSON column is an integer too, checked by zod. Every table has `user_id` and RLS from the first migration, `job_runs` included. Policies compare `user_id` with the user id the API sets for each request's transaction (§5); the API's database role can't bypass RLS. **Drizzle** owns the schema, migrations, policies and views (D54). Ids are UUIDs made on the phone for anything the outbox syncs; an event's and its transaction's are derived from the dedupe key (§5), so a retried or repeated sync is an upsert. Rows the outbox syncs keep `deleted_at` tombstones.

```
accounts             id, user_id, name, kind (tracked|elsewhere),
                     notifier_package (nullable), notifier_label (nullable),
                     opening_balance, opening_at, currency, archived_at

auth_user, auth_session, auth_account, auth_verification
                     -- Better Auth's own tables (D54), prefixed so they're never
                     -- confused with bank accounts; the admin role lives on auth_user
user_access          user_id, is_admin, features (jsonb: shell|capture|agent|splits|
                     email_receipts|calendar|claims), ai_free_monthly (sen),
                     ai_unlimited (bool), ai_daily_ceiling (sen), suspended_at,
                     updated_by, updated_at
                                                 -- read-only to its person; written only by
                                                 -- the admin's functions (D52)
invitations          id, invited_by, email, token_hash, features (jsonb),
                     ai_welcome_credit, ai_free_monthly, ai_unlimited,
                     expires_at, accepted_at, created_at
                     UNIQUE (email) WHERE accepted_at IS NULL
user_settings        user_id, own_names (text[]), expected_payday,
                     duitnow_qr_key (R2, nullable), email_code (unique, ≥128-bit random),
                     ess_sender (nullable: the address ESS mails from, D96),
                     island_just_paid (bool, default on), updated_at
capture_apps         id, user_id, package, label, chosen_at   -- the apps you chose (D86)
                     UNIQUE (user_id, package)
channel_rules        id, user_id, package, channel_id, action (drop), learned_from (jsonb),
                     created_at                  -- a promo channel, dropped natively (D87)
                     UNIQUE (user_id, package, channel_id)
account_names        id, user_id, package, label, account_id
                     UNIQUE (user_id, package, label) -- an {account} name → an account
integrations         id, user_id, provider (google_calendar), token_ciphertext, key_id,
                     calendar_id, status, connected_at
                                                 -- AES-256-GCM, key from an env secret (D41, D54)
calendar_events      id, user_id, source_kind, source_id, google_event_id, updated_at
                     UNIQUE (user_id, source_kind, source_id)

bank_events          id, user_id, package, channel_id, notification_key, posted_at,
                     notified_at (the app's `when`), title, text, big_text, dedupe_key,
                     parsed_by (uuid → parse_templates, nullable),
                     parse_status (parsed|ignored|skipped|unparsed|dismissed),
                     parsed (jsonb), linked_event_id (nullable: the partner a pair
                     rule merged it into, D88), created_at
                     UNIQUE (user_id, dedupe_key)             -- raw text immutable

parse_templates      id (UUIDv5 of user, package, skeleton), user_id, package,
                     skeleton_hash, kind (out|in|internal|hold|context|ignore),
                     ignore_reason (alert|promo|status, nullable),
                     title_template, text_template, account_id (nullable),
                     status (provisional|active|rejected), proposed_from_event_id,
                     created_at, confirmed_at        -- no built-in ones (D15, D87)
                     UNIQUE (user_id, package, skeleton_hash)
pair_rules           id, user_id, template_a, template_b,
                     relation (duplicate|same_payment|hold_for|context_for),
                     window_s, match (jsonb), keep (a|b|merge),
                     status (active|rejected), created_by (code|model), created_at
                     UNIQUE (user_id, template_a, template_b, relation)   -- D88

transactions         id, user_id, account_id, bank_event_id (nullable),
                     occurred_at, direction (out|in), amount, currency,
                     kind (spend|income|transfer|repayment|refund|adjustment),
                     merchant_raw, merchant_key, category_id,
                     my_share (spend only; default = amount),
                     note, no_receipt (bool, D90),
                     source (notification|receipt|manual|inferred|adjustment),
                     status (needs_attention|done|pending),
                     transfer_group_id, linked_transaction_id,
                     claim_scheme_id, relief_code, created_at, updated_at, deleted_at

receipts             id, user_id, storage_key (R2; null for one entered by hand), content_hash,
                     transaction_id (nullable: the payment it's attached to),
                     merchant_raw, occurred_at, total, tax, service_charge,
                     pax (default 1: how many people ate, for the meal average: D66),
                     claim_scheme_id (nullable)  -- confirmed values, set on the confirm screen
                     note, email_message_id (nullable), has_physical_original (bool),
                     input_class (photo|native_pdf|scanned_pdf|email_html),
                     source (scan|gallery|share|email|manual), byte_size, width, height,
                     page_count,
                     status (uploading|extracting|needs_review|awaiting_payment|
                             committed|evidence|failed),
                     created_at                                -- file immutable
                     UNIQUE (user_id, content_hash)
receipt_items        id, user_id, receipt_id, transaction_id (nullable),
                     description, qty, amount (as printed),
                     price (with its share of tax and service: D66), category_id,
                     kind (item|others: the folded line of Just my part, D92)
                                                 -- items belong to the receipt
email_messages       id, user_id, message_id, from_address, subject, received_at,
                     kind (receipt|claim), status (new|read|ignored|failed)
                     UNIQUE (user_id, message_id)  -- forwarded email (D56); the raw
                                                   -- message is kept in R2 as evidence
receipt_extractions  id, user_id, receipt_id, model, raw (jsonb), extracted (jsonb),
                     confidence (jsonb), created_at            -- append-only drafts

balance_checks       id, user_id, account_id, as_of, balance, source (notification|manual),
                     adjustment_transaction_id

categories           id, user_id, name, is_discretionary, is_meal, is_beverage,
                     kind (spend|income), system_key (nullable: salary|cash|unaccounted),
                     archived_at                               -- one flat list (D28)
merchant_rules       id, user_id, merchant_key, category_id (nullable),
                     category_mode (single|by_item), kind (nullable), claim_scheme_id,
                     relief_code, status (active|staged), set_by (user|agent),
                     confirmed_count             -- one rule, several facets (D89)
merchant_aliases     id, user_id, rule_id, merchant_key
                     UNIQUE (user_id, merchant_key)  -- a receipt's key → the payment's rule
transfer_rules       id, user_id, from_account_id, to_account_id, merchant_key, confirmed_count
budgets              id, user_id, category_id, amount, effective_from,
                     effective_to (nullable)                   -- standing, per cycle (D29)
goals                id, user_id, name, kind (goal|bucket), target_amount,
                     target_date, repeats_yearly, status        -- buckets: §10
goal_contributions   id, user_id, goal_id, amount, occurred_at
payday_plans         id, user_id, cycle_start, status (proposed|active|done), created_at
                     UNIQUE (user_id, cycle_start)
payday_plan_items    id, user_id, plan_id, kind (due|save|spend), label, amount,
                     from_account_id, to_account_id (nullable),
                     done_transaction_id (nullable)            -- a plan, never a fact

subscriptions        id, user_id, name, merchant_key, amount, currency, cadence,
                     next_renewal_date, status, display_fx_rate (NUMERIC), display_fx_on,
                     display_fx_source (bnm|ecb|charge)   -- display only (D99)
subscription_charges id, user_id, subscription_id, expected_date, expected_amount, currency,
                     status (expected|matched|missed), matched_transaction_id,
                     effective_fx_rate                         -- forecasts, never spend
                     UNIQUE (subscription_id, expected_date)

claim_schemes        id, user_id, name, period, cap, deadline_day,
                     amount_source (tagged_spending|evidence), active_from, active_to
claims               id, user_id, scheme_id, period, amount, approved_amount (nullable),
                     status (to_submit|submitted|approved|paid|rejected), rejection_reason,
                     ess_ref (nullable), submitted_at, closed_at,
                     paid_by_transaction_id (nullable)
                     UNIQUE (user_id, scheme_id, period)
claim_items          id, user_id, claim_id, transaction_id, amount   -- what it covers
                     UNIQUE (claim_id, transaction_id)
claim_evidence       id, user_id, claim_id, receipt_id              -- bill PDF, My50
                     UNIQUE (claim_id, receipt_id)
ess_recipes          id, user_id, base_url, capabilities (text[]: sign_in|fetch_payslip|
                     submit_claims…), steps (jsonb: http|page, with slots, never values),
                     field_map (jsonb), payslip_map (jsonb), status (draft|active),
                     confirmed_at, updated_at
                     -- one company's ESS, in that person's data, never in code (D105, D106)
payslips             id, user_id, period, storage_key (R2), content_hash, net_pay,
                     gross_pay, salary_transaction_id (nullable),
                     status (matched|mismatch|unread), fetched_at
                     UNIQUE (user_id, period)          -- a retried fetch is a no-op (D104)
payslip_lines        id, user_id, payslip_id, label, kind (earning|claim|epf|socso|eis|
                     pcb|other_deduction), amount, claim_id (nullable)
                     -- never an IC or bank account number

splits               id, user_id, transaction_id (nullable), receipt_id (nullable),
                     source (app|integration), integration_id (nullable),
                     external_ref (nullable)    -- an integration's bill, such as a lunch pool
                     paid_by (me|other), payer_member_id (nullable),
                     payer_qr_key (R2, nullable), token_hash (nullable: only once shared),
                     status (open|settled|expired), locked_at (nullable: everyone done and
                     every item claimed, D71),
                     remind_at (nullable: when you owe, D65),
                     settled_at, expires_at, created_at        -- D47, D64-D66
split_members        id (made in the friend's browser), user_id, split_id, name,
                     guest_id (nullable), member_user_id (nullable: a signed-in Sen user),
                     is_me, is_others (the unnamed Others of Just my part, D92),
                     done_at (nullable: tapped Done, D71), share_override (nullable),
                     paid_at (nullable),
                     paid_by_transaction_id (nullable)
split_picks          id, user_id, split_id, split_member_id, receipt_item_id
                     UNIQUE (split_id, split_member_id, receipt_item_id)
                                                 -- one row: the item is theirs; several:
                                                 -- shared evenly between them (D71)
split_guests         id, user_id (the split's owner), token_hash, name,
                     duitnow_qr_key (R2, nullable), last_seen_at
                     UNIQUE (user_id, token_hash)  -- a friend's browser (D64); a link
                                                   -- prefills from the token's latest row
payer_names          id, user_id, bank_name, guest_id (nullable), member_user_id (nullable)
                     UNIQUE (user_id, bank_name)   -- names banks print for a split member,
                                                   -- learned at their first matched payment

agent_messages       id (made in the app), user_id, role, parts (jsonb: the SDK's message
                     parts, so cards redraw), run_id, created_at  -- a retried send is a no-op
agent_files          id, user_id, message_id, storage_key (R2), content_hash, mime,
                     text (nullable: read_file's result, kept once read), created_at
                     -- files sent in the chat (D109)
agent_summaries      id, user_id, upto_message_id, summary, created_at
                                                 -- the rolling summary of older conversation (§12.5)
agent_runs           id, user_id, kind (chat|job|subagent), skill (nullable),
                     trigger_key (a message id, or a job and its date),
                     parent_run_id (nullable), model, status (running|waiting|done|failed),
                     created_at, finished_at
                     UNIQUE (user_id, trigger_key)
agent_steps          id, user_id, run_id, seq, request (jsonb), response (jsonb), created_at
                     UNIQUE (run_id, seq)        -- a run resumes from its last step
agent_memory         id, user_id, kind (note|rule|experiment), note,
                     check (jsonb, nullable: what code counts for an experiment), created_at
products             id, user_id, kind (savings|card|wallet), name, provider,
                     terms (jsonb), source_url, checked_at, confirmed_at,
                     held (bool)                              -- confirmed research (D39)
research_briefs      id, user_id, question, body, sources (jsonb: url, title, site,
                     checked_on), created_at, expires_at (2 years: Google's terms)
promises             id, user_id, kind (refund|return|other), counterparty,
                     expected_amount, expected_by, matched_transaction_id,
                     status (waiting|landed|chased|dropped)   -- expectations, not facts
agent_proposals      id, user_id, kind, payload (jsonb),
                     status (pending|applied|dismissed), created_at, decided_at

ai_usage             id, user_id, purpose (receipt|template|category|email|agent), provider, model,
                     tokens_in, tokens_out, tokens_thinking, tokens_image,
                     outcome, latency_ms, created_at           -- no cost column, by design
ai_credit_entries    id, user_id, kind (welcome|grant|usage|refund|reversal),
                     bucket (free|balance|covered), amount (signed sen),
                     rate_card_version, ai_usage_id (nullable), dedupe_key,
                     created_by (system|admin), created_at
                     UNIQUE (user_id, dedupe_key)  -- append-only; balance = sum of the
                     -- balance bucket; the rate card lives in code, versioned (D98)
scheduled_jobs       id, user_id, kind, run_at, payload (jsonb), dedupe_key,
                     status (due|running|done|failed), attempts
                     UNIQUE (user_id, dedupe_key)  -- one-off jobs the tick runs (D99)
device_heartbeats    id, user_id, listener_connected, last_bank_event_at,
                     app_version, created_at
job_runs             id, user_id, job, ran_at, status, duration_ms,
                     error                       -- scheduled jobs and the GitHub Actions workflows
alerts_sent          id, user_id, alert_key, sent_at
                     UNIQUE (user_id, alert_key)
push_tokens          id, user_id, fcm_token, created_at
                     UNIQUE (user_id, fcm_token)
exports              id, user_id, storage_key (R2), year (nullable),
                     status (building|ready|expired), expires_at, created_at  -- D49
api_tokens           id, user_id, name, kind (integration), integration_id, token_hash,
                     scopes, created_at, last_used_at, revoked_at
                     -- integrations (§16, D102); lunchbot's pools are splits

audit_log            id, user_id, entity, entity_id, action, before, after,
                     actor (user|agent|system), created_at     -- append-only
```

**SQL views and functions.** These are the deterministic "engine", shared by the app and the agent:
- account balances, counting only what moved after each account's `opening_at`
- pay cycles, from salary credits (D14)
- per-cycle and rolling-12-month spend by category
- budget status
- meal and beverage stats
- eat-out vs groceries
- unaccounted per period
- owed to you, and what you owe, by split (D19, D64)
- cycle-end projection
- split shares: each member's items, an item shared evenly between the members it's shared with, prices already carrying their tax and service (D66), your overrides kept, and the rest divided by largest remainder, so shares always add up to the total

**Every view is created `WITH (security_invoker = true)`,** so RLS applies through it; without that, a Postgres view reads as its owner and skips RLS. Functions are `SECURITY INVOKER` unless a route says otherwise. They're tested with pgTAP on a local Postgres, against hand-checked fixtures.

**Key decisions**
- **A receipt is not a transaction.** Money movements are the ledger; receipts add detail to them, and never create a payment by themselves (§6.4). A payment can hold several receipts (`receipts.transaction_id`).
- **Items belong to the receipt**, so a bill someone else paid has items before any payment exists.
- **A bill someone else paid is a split** whose payer isn't you, shared as a link or not (D47, D64). Who paid lives only on the split.
- **`amount` and `my_share` stay separate.** Balances use one, spending uses the other.
- **`alerts_sent` makes every reminder and check-in safe to re-run.** This is v0.16 §7.7.1's idempotency, generalised.
- **No cost column anywhere, except Sen's own credit charges** (`ai_credit_entries`, D98), which are facts of its credit system. Estimates are never stored.
- **No global tables.** Even an exchange rate lives on the person's own row (D99), and the AI rate card lives in code, so every table keeps `user_id` and RLS.
- **One notification can make two transactions.** A salary that includes claims is split into income and repayments (D45). Both keep `source = notification` and the event's id.
- **`categories.system_key`** marks the few categories code relies on (Salary, Cash, Unaccounted), so renaming one breaks nothing.

---

## 16. Backend routes (one Hono app on Vercel Functions)

Everything goes through this one API, and every request runs as its signed-in user under RLS (§5). Plain reads and writes of your own rows use generic resource routes; the routes below are the ones with logic of their own.

| Route | Called by | Purpose |
|---|---|---|
| `/auth/*` | App, the shell | Better Auth: emailed codes, sessions, accepting an invitation (D54) |
| `POST /sync` | The shell | A batch from the outbox: events, transactions and field-level edits, each with its id; idempotent. Drafts templates for new wording, one call per app per batch, and returns them for the shell to re-read its events (D87). Then runs `/match` (§5) |
| `POST /receipts/upload-url` | App | Signed R2 upload link + `receipts` row |
| `POST /intake/email` | The inbox checker, with an internal secret; later the owner's assistant | One raw email in. Its `+` code names the person, through a narrow function. Mail from that person's ESS sender goes to the claims parser before any model (D96); the rest becomes receipts (D56, D91). Idempotent by `Message-ID` |
| `GET /receipts/:id/url` | App | Signed R2 view link |
| `POST /payslips/upload-url` · `POST /payslips/:id/read` | The shell, after fetching a payslip | A signed R2 upload link and a `payslips` row, idempotent per period; then code reads it through the recipe's payslip map, checks it against the salary and approved claims, and splits the salary (D104). No model |
| `POST /agent/files/upload-url` | App | A signed R2 upload link and an `agent_files` row for a file sent to Sen (D109) |
| `POST /receipts/:id/extract` | App, after upload | Gemini extraction → draft; idempotent |
| `POST /templates/:id/confirm` · `/reject` | App | *Yes* or *No* on a provisional template; *No* dismisses its payments and returns their events to `unparsed` (D87) |
| `POST /pairs/:id/answer` | App | *One payment or two?* becomes a pair rule (D88) |
| `POST /match` | The shell after each sync; the web app after committing a receipt or a split | Matching for new rows: receipts to payments, transfer sides, repayments and amounts owed, payday plan items, the salary split (§5). Idempotent |
| `POST /agent/chat` | App | Streaming agent reply. The message's id is made in the app, so a retry is a no-op; the run is saved step by step (§12.5) |
| `POST /agent/runs/:id/continue` | A one-off scheduled job, with an internal secret | Carries a run past one function call's time limit (§12.5) |
| `POST /proposals/:id/apply` · `/dismiss` | App | Code applies a proposal, logged as Sen's, with *Undo*; no model call (D94) |
| `POST /realtime/token` | App; a split link with its own token | A 5-minute pass to the relay's channel for this person or this split (D100) |
| `POST /jobs/tick` | The Cloudflare Worker's cron, with the scheduler secret (D99) | Runs what's due, each job for each person, listed by one narrow function, as that person, idempotent per person, job and Kuala Lumpur date or `dedupe_key`; a tick that comes twice is a no-op. **The morning job (07:00–08:00):** the listener and backup watchdogs (capture on only); claim drafts on the 1st, refreshed as evidence arrives, and claim reminders, including the deadline day's (§13); subscription matching and misses; exchange rates (§11); promises past their date (§12.1); balance checks due (D18); amounts owed past 30 days (D20); split links to close (D47); a late salary (D14); calendar sync (§12.7); the monthly rate re-check (§12.1); the inbox check (§6.4). **The evening job (21:00):** the check-in (§12.4), and the weekly summary on Sundays. **One-off jobs** in `scheduled_jobs` at their time: a split's reminder an hour later (D65), an agent run's continuation. Each run is recorded in `job_runs` |
| `GET /health/jobs` | The outside monitor | Returns no data: fails when a job or the backup is late, so the monitor emails the owner (D99) |
| `PUT /integrations/v1/shared-bills/:ref` | An integration, such as lunchbot | Creates or updates a shared bill (total, date, each member's share, and later your actual share), which becomes a split with `source = integration` (D23, D102). Idempotent |
| `GET /integrations/v1/matched-payments?after=:cursor` | An integration | Only the repayments matched to that integration's bills since the cursor (D102) |
| `POST /calendar/connect` | App | Returns Google's sign-in address with a one-time `state`, for the app to open in a Custom Tab (§12.7, D41) |
| `GET /calendar/callback` | Google | Checks the `state`, stores the refresh token encrypted, and sends you back to the app |
| `POST /splits` | App | Creates a split from a receipt or a payment, with an id made on the phone so a retry returns the same split; when you share it, returns its link (D20, D47) |
| `GET /s/:token` | Friends, no login | The split page's data: merchant, items, picks, shares, who has paid, how to pay |
| `POST /s/:token/picks` | Friends, no login | A friend's name and their items. A random token from their browser names them, so the next link fills in their name and QR (D64). Idempotent per member and item; rate-limited |
| `PUT /s/:token/payer` | Friends, no login | When a friend paid: who paid, and their DuitNow QR image, stored in R2. Set by the payer, recognised by their browser's token, or added by you (D65); rate-limited |
| `PUT /s/:token/members/:id/paid` | The payer, no login | When a friend paid: the payer, recognised by their browser's token, ticks or unticks a share as paid (D65). Idempotent |
| `POST /export` | App | Starts the export workflow in the private `sen_ops` repo (D49, D85) and records it in `exports`; the workflow gets only an opaque export id, because run inputs are visible to anyone who can read the repo |
| `POST /exports/:id/done` | The export workflow | Marks the export ready; the server signs its link and sends the push |
| `GET /admin/members` · `GET /admin/invitations` · `POST /admin/invitations` · `PUT /admin/members/:id` · `POST /admin/members/:id/credit` · `POST /admin/members/:id/suspend` · `DELETE /admin/members/:id` | The admin | Through `SECURITY DEFINER` functions that check the admin flag: list members, invitations, credit totals and support facts; invite someone; set a person's switches, allowance, *Unlimited* and daily ceiling; grant or refund credit; suspend; remove, after offering their export (D52, D98). Never their money or chosen apps |

- **Auth:** app calls carry your session token; the scheduler's tick carries its own secret; an integration's calls carry its token, whose scope covers only its routes and its own bills; a split link's calls carry its own token, which reaches only that split. `/export` starts its workflow with a fine-grained GitHub token limited to `sen_ops`' Actions. That access could start any workflow there that has a manual trigger, so only the export workflow has one. The workflow reports back with its own secret, and its ZIP never goes into a workflow artifact or log.
- **The split link's routes** (`/s/:token…`) never set a user id. Each calls a `SECURITY DEFINER` function that resolves the token to its one split and touches only that split's rows.
- **Validation:** every input is checked with zod.
- **Errors** use the shape `{ code, message, field? }`. A failed extraction is a status, not an HTTP error (v0.16 §9).

---

## 17. Security and privacy

- **Threat model.**
  - Defended against: ad-funded apps monetising your history, and anything that would need your bank credentials (the app never has any).
  - Accepted: Gemini, through Vertex AI (D55), sees receipt images, forwarded receipt emails, files you send to Sen as you sent them (D109), the text of each new wording with an amount, with long digit runs masked (D15, D87), and a new merchant's name, amount and time of day, for its category guesses (D112). The agent's model sees the transactions, totals and typed claim values its tools return for each question (D34, D95). The Cloudflare relay sees only which topics changed, never data (D100).
- **Secrets** exist only in Vercel's environment variables, with production values in Production alone: the database URL, Better Auth's secret, the Gmail app password (for sending, and for reading the forwarded-receipt inbox), the Vertex AI key, R2 keys, the Firebase service account, the Google OAuth client secret, the key that encrypts the calendar token, the scheduler's secret (shared with the Cloudflare Worker), the key that signs relay passes, the internal secret a run uses to continue itself, the key that signs the calendar's `state`, and a GitHub token that can start `sen_ops` workflows. GitHub Actions holds its own: the public repo only the shell's signing key; the private `sen_ops` the database URL and R2 keys for the backup and the export (D85). The app holds only your session. **The ESS password lives only on your phone**, encrypted with a non-exportable Keystore key, read only by native code and never synced or backed up, and ESS's session only in the shell (D103). **No server or cloud session ever holds either.** A local session capturing ESS may see the session, never the password (D110).
- **The shell trusts only our own site (D42).** The release shell loads the web app only from its production address, with a strict content security policy and no third-party scripts, and its native bridge answers no other origin, so a page from anywhere else can't reach notifications or the outbox. A separate debug build, with capture switched off so nothing is recorded twice, may also load one fixed preview address: a `.vercel.app` alias pointed at the branch under review, so the build doesn't change per branch. Never a wildcard such as `*.vercel.app`, which would let anyone's deployment reach the bridge.
- **Integration tokens** (lunchbot first, D102) are created in Settings and shown once. Each is stored hashed, rate-limited, can be revoked, and reaches only its integration's routes and bills. It lives in the integration's secret store, never in either repo.
- **RLS** is on every table from the first migration, and views are `security_invoker` so it applies through them (§15). The API connects as `app_user`, which can't bypass RLS, and policies read the user id as `nullif(current_setting('app.user_id', true), '')::uuid`. The export workflow connects as `app_user` too, with the requester's id. Only migrations and the backup use the owner role.
- **Previews never see real data.** They use a separate Neon project with anonymised seed data (§5.1).
- **The admin (D52, D98)** manages invitations, switches and credit. Its only reads across people are invitations, switches, credit totals and support facts (shell version, capture connected), never anyone's money or chosen apps. There's no impersonation: Better Auth's admin plugin isn't used.
- **Notification privacy:** the chosen-apps check, the OTP/TAC filter and channel rules run in native code before anything is stored (D86). Messaging, SMS, email and social apps can't be chosen.
- **R2:** a private bucket with signed URLs only. A public bucket invites denial-of-wallet.
- **Email (D56, D91):** Sen reads only its own dedicated inbox, which receives only what each person's Gmail filter forwards. Gemini reads a forwarded email the way it reads a receipt; ESS mail never reaches a model (D96). Stored email HTML is sanitised and shown in a sandboxed frame with `img-src data:`, so no remote content or tracking pixel ever loads.
- **Links leave the app (D94, D101):** every external link opens in the phone's default browser through the shell's own `openInBrowser(url)`, never in the shell's WebView or a Custom Tab, and only `https:` links from tool results are ever shown. `allowNavigation` stays empty. The site sends `Referrer-Policy: no-referrer`, so a split link's token never leaks to another site.
- **Login:** an emailed code is the only way in (Better Auth), sent from a dedicated Gmail account, so deliverability is tested deliberately in P2. If the phone is lost, a global sign-out from another device revokes its session.
- **Backups:** nightly `pg_dump` → R2 via GitHub Actions, which records each run in `job_runs`. A restore is tested once, and the last successful backup is visible in Settings. Backup files are never committed.
- **Retention:** receipts are kept 7 years.
- **Export, any time (D49):** Settings → *Export everything* builds a ZIP of CSVs (transactions, accounts, categories, rules, claims) and the receipt images on GitHub Actions, behind a link that lasts 24 hours. It can be limited to one year (§14). When the workflow reports back, the server signs the link and sends the push. The ZIP is deleted after a day.
- **Repo hygiene, for a public repo (D85):** `.gitignore` covers `private/`, database dumps and generated PDFs **before any exist**. No real cap, employer name, ESS address or scheme figure goes in code, fixtures, commits or this spec; ESS's address lives in a database row (§13.1). Secret scanning and push protection are on. A check on every PR fails on any tracked `private/` path (because `git add -f` gets past `.gitignore`) and on any string from a private denylist kept as an Actions secret. Workflows never use `pull_request_target`, so a fork's PR never sees a secret, and Vercel's fork protection stays on. Split-link tokens and the email `+code` are at least 128 bits. Copied skills and docs keep their own licences, listed in a third-party notice.

---

## 18. Reliability

| Silent failure | Guard |
|---|---|
| The phone kills the listener | Heartbeat + daily watchdog push |
| A bank changes its notification wording | The first new notification with an amount is drafted automatically and books at once, marked *new wording*, for you to confirm (D87). Offline, or with no AI credit, it waits as *Waiting to read new wording* |
| A pair rule merges two payments that were separate | *These were two payments* on the merged payment undoes it (D88) |
| The scheduler stops | Each run is recorded in `job_runs`. An outside monitor checks `/health/jobs` and emails the owner when a job is late (D99). When a sync finds the last morning run over 26 hours old, the shell posts its own notification, and Home and the widget warn, so a stopped scheduler can't hide behind its own watchdog |
| The realtime relay drops | Screens reload on return to the app and on reconnect, check every 30 s while it's down, and show *last updated* (D100) |
| Backups stop | The workflow records each run in `job_runs`. The last success shows in Settings, the morning job pushes an alert after 2 days without one, and `/health/jobs` fails so the outside monitor emails the owner |
| Extraction keeps failing | Failed receipts sit in *Review*; the image is kept |
| Phone offline | Everything captured goes to the outbox first; capture never waits on the network |

---

## 19. Build plan

Risk first, as in v0.16 §16.1. One change: **you start using it for real at P3**, rather than waiting for a single release.

**Before any code: the design track** (`CLAUDE.md`, D7).
1. `S1` reviews this spec with you.
2. `S2` writes the journeys, screens and patterns. Screens aren't mocked up: the walking skeleton is the first look at them in each look (D84).
3. `S3` cut the build into slices in `docs/modules.md`, with a brief per slice in `docs/briefs/` (D111). **That slice map replaces this table's phase cut**: forty slices in nine stages, built one at a time. `docs/modules.md` shows where each phase below went.

P0 runs alongside the design track. **Before the foundations slice, Sen is published** as the public `ztsia/Sen`, from a cleaned snapshot, with the private `sen_ops` beside it (D85, `docs/local.md`). The phases below are the risks the slices must still retire.

| Phase | Scope | Done when |
|---|---|---|
| **P0: no code (today)** | Turn on Android notification history; watch what TNG, Ryt, Public Bank and Grab send for a few days, including a Ryt QR payment, Ryt's duplicates and a Grab payment by card (`docs/local.md`) | You know whether amount, merchant, account and balance appear |
| **P1: listener spike** | A bare Capacitor shell; Kotlin listener; the app picker and the native chosen-apps check (D86); raw events in local SQLite; a list screen; the native category prompt; *Keep Sen running* | A week of real samples from your apps; the listener survived reboots; package names confirmed; Ryt's duplicate window measured |
| **P2: foundations** | `.gitignore` first; the Neon project, a local Postgres and the Vercel project; Drizzle migrations with RLS; Better Auth login by emailed code, with roles, invitations, switches and credit designed in (D52, D98); outbox sync; the Cloudflare Worker (scheduler and relay) and the outside monitor (D99, D100); the backup workflow in `sen_ops` | Login works; a captured event lands in the hosted DB and an open screen updates without a refresh; a backup lands in R2; RLS blocks a second test user |
| **P3: core tracking** *(start using it)* | Templates drafted from nothing, booked and confirmed after (D87), with the drafter tested on P1 samples; pair and channel rules (D88); first-run setup (D26, D86); events → transactions; merchant normalisation and rules with facets (D89); category prompt; manual entry; notes (D90); accounts, stored credit, transfers, balance checks, unaccounted gap; *Review*; basic Home | A full week of spending captured and categorised, from no templates; the unaccounted gap is known |
| **P4: receipts** | Scanner, gallery and share; resizing; R2 upload; extraction benchmark (15–20 receipts: faded thermal, kedai, long supermarket, phone bill PDF), which picks the reader's model (D94); confirm screen with categories, *No receipt* and *Just my part* (D89, D90, D92); matching in both orders; split links (D47); paying from the same phone (D101) | A receipt scanned after paying attaches to the notification's transaction; accuracy measured |
| **P5: insights** | Home, Insights, budgets, food metrics, subscriptions and exchange rates (D99), goals; launcher shortcuts; widgets in each look (D32, D101); the island (D101); forwarded email receipts (D56, D91) | One month's figures match a hand check |
| **P6: agent** | The harness (D53, D94): main prompt, skills, subagents, saved runs; tool views; chat with its UI tools; proposals; check-ins from signals + push; Sen's prepared rows outside the chat; `calc` and files in the chat (D108, D109); the calendar (D41); model eval (D55); `ai_usage`. **P6b:** the rate watcher, the product advisor and money left on the table | 20 real questions answered correctly; a week of check-ins you didn't mute |
| **P7: claims & reliefs** | Schemes in Settings, drafted by Sen from your words (D95); scheme tagging; reminders; claim drafts, the submission kit and the claim pack PDF (D97); the ESS adapter: engine, recipes and teach mode, sign-in with a saved password, the payslip on payday, filing ESS, and approval emails (D96, D103–D106); relief tags; *Export everything* (D49) | One real month's claims done from the app, printed from the pack; a payslip fetched by itself on payday, splitting the salary |
| **P8: friends and family** | Invitations; Members (D98); per-person switches and AI credit; the PWA's camera and four-corner crop (§9.6, D52) | A friend uses Sen on an iPhone for a month |
| **P9: integrations** | The integration adapter, with lunchbot first (D102) | lunchbot sends a pool and reads its matched deposits |

**Background track, starting now:**
- P0 samples (`docs/local.md`)
- keep 15–20 varied receipts for P4

---

## 20. Out of scope

- An iOS app and the Play Store. On iOS, Sen runs as a PWA without notification capture (D52).
- Bank logins, open banking, scraping, SMS reading. Revisit only if notifications prove insufficient.
- Investments, net worth beyond balances, debt payoff, double-entry accounting, multi-currency.
- Open sign-up. Friends and family join by invitation only (D52).
- e-Filing integration. v0.16's claims engine waits in the backlog (D50); its claim pack is back (D97), and ESS is filed from the phone (§13.1).
- Any payment requested or processed inside Sen, AI credit included (D98).
- Supporting others to host Sen, though its source is public (D85).
- Xiaomi's proprietary island API without a passing phone test, and floating overlays imitating an island (D101).
- Server-side image processing, and storing more than one file per receipt.
- Gamification and onboarding tours. First-run setup (§9.5) isn't a tour.
- Anything that moves money.

---

## 21. Open questions

| # | Question | When |
|---|---|---|
| 1 | What do the four apps' notifications contain: amount, merchant, account, balance? **Sampled on 5 Oct** (`docs/notifications.md`): transfers between your own accounts, and a GrabFood group order. All three banks show the amount and the other party's name, Ryt also shows the time and the paying account, and none shows a balance. Ryt's card payments, including a hold at a petrol pump, were sampled the same evening. Still to sample: Public Bank's card, QR payments (a Ryt QR payment from the Main Account first), Ryt's duplicate notifications, a Grab payment by card, a TNG card reload, salary, interest, refunds, promos, OTPs, Grab rides | P0/P1 |
| 2 | Package names: the curated list checks each on Play (D86). **Checked on Play on 9 Oct** (`apps/shell/data/capture-apps.json`): TNG `my.com.tngdigital.ewallet`, Ryt `my.rytbank.app`, Public Bank `com.pbb.mypb`, Grab `com.grabtaxi.passenger`. The soak confirms them on the phone | P1 |
| 3 | Does the listener, with its native prompt and sync, survive on the Xiaomi? | P1 |
| 10 | Does 3.5 Flash-Lite read faded receipts as well as 3.8 Flash (D55)? And `media_resolution` per input class | P4 |
| 11 | Matching window and amount tolerance | P4 |
| 12 | Scanner mode on faded thermal receipts | P4 |
| 14 | Deliverability of the emailed codes from the Gmail account, including spam placement | P2 |
| 15 | Is a line item ever both a meal and a beverage? (v0.16 #41) | P5 |
| 16 | Does Public Bank notify money leaving it? A sampled transfer out of Public Bank showed only the receiving side (`docs/notifications.md` §5) | P0 |
| 18 | How is DingDong paid for a pool, and what notifies? It decides how the prepayment is matched (§7) | P0 |
| 20 | Do Grab rides charge the GrabPay Wallet the same way as food? (Top-ups are from the Public Bank debit card: D38) | P0 |
| 22 | The app icon and Sen's avatar: drawn by `S2` directly as SVG, with Android's adaptive (layered) and monochrome versions (D48), designed together with the theme (D57, D76) | `S2` |
| 24 | Google's terms: do Vertex AI's terms bar under-18 users (Gemini API's do), does invite-only sharing count as consumer use, and must Google's search suggestions be shown with grounded research? (D52, D55) | Before friends join; the last before P6 |
| 25 | Neon's free compute allowance under real sync and usage patterns (§5.1) | P2 |
| 26 | How far apart are Ryt's duplicate notifications? It sets the `duplicate` window (D88) | P1 |
| 27 | Does HyperOS 3.1 give a sideloaded app's Live Update the full Hyper Island, expanded view included? Does the HyperIsland ToolKit's demo get Xiaomi's own island without a whitelist? (`docs/local.md`, D101) | Before P5 |
| 28 | Do TNG, Ryt and MAE accept a DuitNow QR shared from another app, and does TNG accept a QR carrying an amount? (D101) | P4 |
| 29 | ESS: its login (company sign-in or its own, and any second step), whether it has an API, how long a session lasts, whether payslips come as data or only as a PDF, how files are uploaded, and whether a draft can be saved or a claim withdrawn (§13.1). It works outside the office (owner, 8 Oct) | The 8 Oct capture (D110); the rest when P7 starts |
| 30 | Does Gmail's filter forwarding keep the original `Message-ID`? (D91) | P5 |

Answered on 7 Oct: **17** (promo channels are learned by channel rules, D87). Partly answered: **24** (search suggestions are optional below a million prompts a day, and grounded results may be stored only in the chat history, for up to 2 years, D94).

Answered in `S1`: **4** (balance checks, D18), **5** (TNG card, D16), **6** (no credit card, §2), **7** (pay cycles, D14), **8** (agent privacy, D34), **9** (agent model and provider, D55), **13** (Supabase's project cap, moot after D54), **19** (card holds at the pump: Ryt notifies the hold and then the final amount, so holds are ignored), **21** (the name, D48) and **23** (who paid, on a split link, D47).

---

## 22. Success metrics

1. **It's on your phone and used daily** past month 3.
2. **Automatic capture:** at least 90% of non-cash spending arrives via notifications.
3. **Unaccounted gap under 5%** of each cycle's outflow by the third cycle.
4. **Every cycle fully categorised** within 3 days of its end.
5. **"Where did last month's money go?"** answered in under a minute.
6. **Surplus improves** compared with your first full month of tracking. This is the real point.
7. **No silent failures:** the listener, scheduler and backup alerts all fire when deliberately broken.
8. **Zero missed claim deadlines.**
9. **Infrastructure stays at US$0/month**, and AI spend is visible in the app.
10. **Kill criterion (from v0.16):** if after 6 months the habit hasn't held, stop adding features and decide whether to keep it.
