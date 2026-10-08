# Modules: the slice map

**Status: agreed with the owner on 8 Oct 2026 in `S3` (D111).** It's the contract once its PR is
merged. Each slice has a brief in `docs/briefs/`, which is what its session starts from.

This file cuts `spec_v2.md` into **build slices**, built **one at a time, in this order**. Each slice
ends in one PR to `main`, titled with its label (*B07 · Sync and the outbox*). It's usually one cloud
session, and more when it hands off mid-slice (`CLAUDE.md`, *Session rotation*). Slices are grouped into **stages**, which play the part the spec's phases P1–P9 played: §19's
phases are still the risks to retire, and the table at the end shows where each one went.

## The slices

| # | Slice | Brief |
|---|---|---|
| | **1 · Frame** | |
| B01 | Design system and the six looks | [B01](briefs/B01-design-system.md) |
| B02 | The shell and the listener (P1) | [B02](briefs/B02-shell-listener.md) |
| B03 | Skeleton: the five tabs | [B03](briefs/B03-skeleton-tabs.md) |
| B04 | Skeleton: everything else, and your review | [B04](briefs/B04-skeleton-rest.md) |
| | **2 · Ground** | |
| B05 | Server, database and sign-in | [B05](briefs/B05-server.md) |
| B06 | Jobs, realtime, push and backups | [B06](briefs/B06-jobs-realtime-backups.md) |
| | **3 · Capture to ledger** | |
| B07 | Sync and the outbox | [B07](briefs/B07-sync.md) |
| B08 | First run, accounts and categories | [B08](briefs/B08-first-run-accounts.md) |
| B09 | The template engine | [B09](briefs/B09-template-engine.md) |
| B10 | New wording: drafting and booking | [B10](briefs/B10-drafting.md) |
| B11 | One payment, one transaction | [B11](briefs/B11-pairs-transfers.md) |
| B12 | Categories that stick | [B12](briefs/B12-categories.md) |
| B13 | Home, pay cycles and balance checks (daily use starts) | [B13](briefs/B13-home-cycles-balances.md) |
| B14 | The reveal and the rotation | [B14](briefs/B14-reveal.md) |
| | **4 · Receipts and shared bills** | |
| B15 | Scan and read | [B15](briefs/B15-scan-read.md) |
| B16 | Confirm and match | [B16](briefs/B16-confirm-match.md) |
| B17 | Splits | [B17](briefs/B17-splits.md) |
| B18 | Split links and paying friends | [B18](briefs/B18-split-links.md) |
| B19 | Receipts by email | [B19](briefs/B19-email-receipts.md) |
| | **5 · Insights and plans** | |
| B20 | Insights | [B20](briefs/B20-insights.md) |
| B21 | Budgets, goals and buckets | [B21](briefs/B21-budgets-goals.md) |
| B22 | Subscriptions and exchange rates | [B22](briefs/B22-subscriptions.md) |
| B23 | Widgets | [B23](briefs/B23-widgets.md) |
| | **6 · Claims by hand** | |
| B24 | Google Calendar | [B24](briefs/B24-calendar.md) |
| B25 | Claims | [B25](briefs/B25-claims.md) |
| B26 | The claim pack and reliefs | [B26](briefs/B26-claim-pack-reliefs.md) |
| | **7 · Sen** | |
| B27 | Sen's harness and answers | [B27](briefs/B27-sen-harness.md) |
| B28 | Proposals and chores | [B28](briefs/B28-proposals-chores.md) |
| B29 | Check-ins, experiments and closing the gap | [B29](briefs/B29-checkins.md) |
| B30 | Payday plan, look-back and projection | [B30](briefs/B30-payday-plan.md) |
| B31 | Files in the chat | [B31](briefs/B31-files-in-chat.md) |
| B32 | Research | [B32](briefs/B32-research.md) |
| B33 | Sen's advice (P6b) | [B33](briefs/B33-advice.md) |
| | **8 · ESS on the phone** | |
| B34 | The ESS engine and filing | [B34](briefs/B34-ess-engine.md) |
| B35 | The payslip on payday | [B35](briefs/B35-payslip.md) |
| B36 | Teach mode | [B36](briefs/B36-teach-mode.md) |
| | **9 · Sharing and data** | |
| B37 | Export everything | [B37](briefs/B37-export.md) |
| B38 | Members, invitations and AI credit | [B38](briefs/B38-members-credit.md) |
| B39 | The PWA | [B39](briefs/B39-pwa.md) |
| B40 | Integrations: lunchbot (P9), only if the pool still runs | [B40](briefs/B40-integrations.md) |

## How the cut was made

1. **A slice is a journey, not a table** (D7). Its boundary is the journeys (`flows.md` ids) and
   screens (`screens.md` ids) it makes real, end to end: native code, the API, the database and the
   screen together. GCO_events built one table and one screen per module, side by side, and the app
   didn't hang together.
2. **Few foundations, and only thin ones.** Something is built across the whole app only where every
   later slice needs the same answer: the design system and the looks, the server and its security,
   the sync contract and the shell. Everything else arrives with the journey that first needs it.
   The island, for example, arrives with *Just paid* and gains each moment in that moment's slice.
3. **Risk first.** What could change the design is learned early. That covers the listener on the
   Xiaomi, templates drafted from nothing, and pair rules. Model choices are benchmarked in the slice
   that first calls the model (D94).
4. **Correct before complete.** A feature that changes what spending means comes before the screens
   that show spending. So receipts and splits come before Insights, because they change `my_share`
   and categories, and claims' salary question comes before Sen, which reads income (§12.2 rule 7).
5. **Real data only once it's safe.** Backups and alarms run before the first real notification
   reaches the server (B06 before B07). Daily use starts at the end of B13.
6. **Nothing fake in production.** The skeleton's made-up data lives in previews and the dev panel.
   In production, a screen whose data isn't real yet says *Not built yet*; it never shows made-up
   figures.
7. **Build it once.** Sen is built after the data it reads exists, and its tools are the views
   Insights already uses. That way no slice comes back to redo an earlier one.

## Every slice, the same way

- **Starts from its brief and the spec**, and reads only the sections the brief names. If the spec is
  wrong or unclear, the slice fixes the spec in the same PR.
- **Done means:**
  - every journey it names walks end to end, in Playwright at a phone viewport, in all six looks
  - SQL, RLS and Kotlin tests pass
  - the `qa` skill has run, and its fixes are sorted into tiers (D8)
  - `docs/` is updated
  - a short *Try it on your phone* list is in the PR
- **Needs from you:** anything the owner must set up first goes into `docs/local.md` before the slice
  starts, with steps a phone can follow.
- **Native slices** end with a phone check. Kotlin that doesn't need Android, such as the template
  engine, is tested in the session; the rest is tested on GitHub Actions' emulator and then on the
  Xiaomi.
- **The next slice waits for the owner's merge, and nothing else** (decided 8 Oct). A phone soak or
  a slow phone test doesn't hold it up unless the next slice needs its answer, which its brief says.
  Only one slice is ever being built.
- **Briefs move with what's learned.** A slice that learns something that changes a later brief, such
  as a phone test's answer or a model's limits, updates that brief in its own PR.
- **A slice blocked on the owner** records the blocker in its handoff, and the next unblocked slice
  starts. Build sessions never stop to ask (`CLAUDE.md`).
- **Tables arrive with their slice.** Each table in `spec_v2.md` §15 is created by the slice that
  first needs it (the table below), with RLS and pgTAP from its first migration. A column used only
  by a later slice is added by that slice.

---

## Before code: publish

**Publish Sen** (D85, `docs/local.md`) when the owner says *publish Sen*: the clean snapshot goes to
`ztsia/Sen`, with `sen_ops` beside it. From B01 onwards, every slice is built in `ztsia/Sen`.

## Stage 1 · Frame

The app's look and shape, and the shell on the phone. Nothing is real yet.

### B01 · Design system and the six looks
- **Builds:**
  - The workspace: the web app (Vite, React, TypeScript strict, TanStack Router, confirmed here,
    §5.1), the money module (integer sen, parsing text into sen, largest remainder), CI, and Vercel
    production and previews.
  - Tailwind v4 and shadcn/ui on each look's tokens, and fonts self-hosted.
  - The six looks ported as `DIR` objects from `docs/ui/directions/src/`: wordmark, hero figure,
    strip, Sen's avatar in its eight states, and the tab bar.
  - Every building block in `patterns.md` §7, the chart base with each look's palette (§4), and the
    web behaviour of §10.
  - A dev panel with a look switcher, light and dark, and a pattern gallery.
  - The repo hygiene check (§17: tracked `private/` paths and the denylist), the stack's skills
    (`npx skills add`), and `CLAUDE.md` § Commands.
- **Done when:** the gallery shows every pattern in all six looks, light and dark, passing contrast
  and touch-target checks, and opens on the phone from its preview link.

### B02 · The shell and the listener (P1)
- **Builds:**
  - The Capacitor shell loading the web app from Vercel, opening offline through a service worker.
    This slice settles remote against bundled (§5.1).
  - The release and debug builds (§17), built and signed on GitHub Actions; a bridge that answers
    only our origin; back, status bar and edge-to-edge.
  - The Kotlin listener, and the native work around it:
    - the app picker, from a curated list plus *More* (D86)
    - the chosen-apps check first, then the OTP/TAC filter
    - raw events into the SQLite outbox, under their dedupe key
    - *Keep Sen running*, per phone brand
    - the restricted-settings route
    - a local heartbeat
    - a debug list of captured events, kept on the phone
  - Hidden test buttons for the category prompt's three buttons, *Test island* (Q27) and *Switch
    icon* (D77).
- **Done when:**
  - the Xiaomi has captured a week of real notifications from the chosen apps only, through reboots
    and idle days
  - Q2, Q3 and Q26 are answered, and the island and icon-switch tests are recorded
  - the samples are anonymised into `notifications.md`
- **Your phone soaks** while B03 to B06 are built (decided 8 Oct); B09 needs its answers.

### B03 · Skeleton: the five tabs
- **Builds:** every screen under the tabs, with made-up data, in all six looks:
  - Home: `home` and its `cycle` sheet
  - Review: `review` and `skipped`
  - Scan: `scan`, `scan-more`, `reading`, `confirm` and `manual`
  - Insights: `insights`, with `budgets`, `subscriptions`, `goals`, `goal` and `insights/year`, with
    real charts on made-up numbers
  - More: `more`, `payments`, `txn` and `receipt`

  The data layer is built here: screens read through query hooks, and writes go through one write
  interface. In the skeleton both are backed by an in-browser fake; later slices swap in the API (and
  the outbox in the shell) behind the same interface. The made-up scenario becomes the preview seed in
  B05.
- **Done when:** these screens' journeys click through at a phone viewport, in every look.

### B04 · Skeleton: everything else, and your review
- **Builds:**
  - The rest of the screens, with made-up data:
    - splits and Sen: `split`, `split-public`, `shared`, `sen` (with proposal cards, a research
      draft, `ask_user` buttons and *not checked*), and `agent/*`
    - accounts and claims: `accounts`, `account`, `balance-check`, `claims` and `claim`
    - Settings, every section
    - outside the tabs: `sign-in`, `first-run`, `payday`, and `new-look`'s shared frame, with a
      crossfade only
  - Stand-ins in the dev panel for every native surface: the prompts, widgets S/M/L, the island,
    pushes and the simulator (a notification arrives, payday, capture off).
  - Every journey in `flows.md`, clickable.
- **Your review, on the phone, inside the B02 shell:**
  - the seven *Defaults to confirm* (`screens.md`)
  - whether Mercury and Copper's WebGL feels right in the real WebView
  - anything you'd change

  Changes land in this slice, in `screens.md` and `flows.md` first.
- **Done when:** you sign the skeleton off.

## Stage 2 · Ground

The server, and what keeps it honest, before any real money reaches it.

### B05 · Server, database and sign-in
- **Builds:**
  - The database: Neon (production and preview projects), a local Postgres for development and
    tests, Drizzle, the `app_user` role that can't bypass RLS, and a pgTAP harness that every later
    table must pass.
  - The Hono API on Vercel Functions: each request in a short transaction that sets
    `app.user_id`, zod checks, the error shape, and the generic resource routes.
  - Sign-in: Better Auth by emailed code from Sen's Gmail, with sign-up off.
  - The tables for invitations, roles and switches, designed in now (D52, D98): `user_access`,
    `invitations` and `user_settings`, plus `audit_log`.
  - The owner's one-time admin seed; `sign-in` and Settings → Account real, including *Sign out
    everywhere*; the preview seed from the skeleton's scenario.
- **Done when:** sign-in works on a preview and in production, a second test user is blocked by RLS,
  and Q14 (whether the codes reach the inbox) is answered.

### B06 · Jobs, realtime, push and backups
- **Builds:**
  - The Cloudflare Worker: cron triggers calling `/jobs/tick`, and the relay with passes from
    `/realtime/token` (D99, D100).
  - The job tables: `scheduled_jobs`, `job_runs` and `alerts_sent`, with the morning and evening
    job frames and `/health/jobs`.
  - Realtime in the web app: hints reload queries, with the fallbacks.
  - Push: FCM in the shell, and `push_tokens`.
  - Backups: the `sen_ops` nightly backup to R2, with a restore tested once, and the last backup in
    Settings → Data.
  - The outside monitor (D99).
- **Done when:**
  - a scheduled test job runs on time
  - a change on one device updates an open screen on another, with no refresh
  - a test push arrives on the phone
  - a backup lands in R2 and restores
  - stopping the scheduler emails you

## Stage 3 · Capture to ledger

Notifications become categorised transactions. **Daily use starts at the end of B13.**

### B07 · Sync and the outbox
- **Builds:**
  - `/sync` end to end: UUIDv5 ids from dedupe keys, field-level edits, tombstones, idempotent
    batches, WorkManager retries.
  - The shell owns the session (Keystore) and hands it to the web app. Web-app writes go through the
    outbox in the shell, and to the API in a browser (optimistic, with *Retry*). Outbox rows show as
    *Not synced yet*.
  - The offline copy, synced down to the phone; `capture_apps`; `bank_events`.
  - Health: `device_heartbeats`, the capture watchdog push, Home's *Capture is off* with *Fix*, the
    shell's 26-hour scheduler check, and the *Capture* switch honoured by `/sync`.
- **Done when:** B02's events land in the hosted database, a replay and a reinstall are no-ops,
  offline capture syncs on reconnect, the watchdog fires when the listener is killed, and Q25 (Neon's
  free compute) is measured.

### B08 · First run, accounts and categories
- **Builds:**
  - `first-run` for the shell (D26, D86): sign in, apps, access, *Keep Sen running*, accounts with
    today's balances, your name, payday.
  - Accounts: tracked, *Elsewhere*, pots and stored credit (D93), each with `opening_at`, plus
    `account_names` and the balance view.
  - Categories: the starting list with its flags and system keys (D33).
  - `accounts` and `account` made real, plus Settings → *Categories* and → *You*.
- **Done when:** you finish first run on the phone, and each account shows its opening balance.

### B09 · The template engine
- **Builds:**
  - Templates: the skeleton normalisation, the blanks, compiling, and `parse_templates`.
  - The engine twice: in TypeScript, and as a pure Kotlin module, passing the same golden fixtures.
  - Templates applied natively, offline, and old events re-read on the server.
  - Events become transactions (`source = notification`); `payments`, `txn` (*What the bank said*)
    and `skipped` made real.
- **Done when:** both engines pass every fixture, and a fixture template books a notification natively
  and offline on the emulator. The phone check moves to B10, which makes the first real templates.

### B10 · New wording: drafting and booking
- **Builds:**
  - Drafting at sync (D87): one call per app per batch, digits masked, with the neighbouring
    notifications. A benchmark picks the cheap model (decision recorded).
  - Code's checks, including that the model's amount equals code's.
  - Notifications without an amount are `skipped`, free. `ignore`, `hold` and `context` templates
    apply silently.
  - A provisional template books its payments at once; Review asks *New wording: right?*, and *No*
    returns the events to `unparsed`.
  - Channel rules, the daily cap, `ai_usage`, the daily safety ceiling, and Settings → *Capture*'s
    wordings.
- **Done when:**
  - every sample in `notifications.md` drafts its documented template in CI
  - on the phone, a real payment with new wording books within a minute of sync
  - *Yes* and *No* both work
- **Real transactions start here.**

### B11 · One payment, one transaction
- **Builds:**
  - Pair rules (D88): `duplicate`, `same_payment`, `hold_for` and `context_for`, applied natively in
    either order. *One payment or two?*, rules the model proposes, and *These were two payments*.
  - Transfers between your own accounts (D17): pairing, the filled-in side, transfer rules,
    *Elsewhere*, and moves inside one app.
  - Review classifies money in: income, transfer, or a refund of a purchase (D21).
- **Done when:** Ryt's duplicates, the petrol hold, a Grab group order's context, Google Wallet with
  Ryt, and a Public Bank → Ryt transfer each end as exactly one correct transaction, in fixtures and
  on the phone.

### B12 · Categories that stick
- **Builds:**
  - Merchant normalisation, and merchant rules with their facets and aliases (D89).
  - The native category prompt: one at a time, waiting for a partner.
  - The island interface, with *Just paid* (D101; Xiaomi's own API only if Q27 passed).
  - `review` made real for everything so far.
  - Edits in `txn`: *Just this one* or *From now on*, notes, *Mark as…*, delete, *Undo* toasts, and
    *Changes*.
  - Search and filters in `payments`; `manual` with its near-duplicate warning; the *Add expense*
    shortcut.
- **Done when:** a full week of real spending is captured and categorised, starting from no
  templates (P3's bar).

### B13 · Home, pay cycles and balance checks
- **Builds:**
  - Pay cycles: salary by its merchant rule, the 15-day rule, *before the first salary*, and calendar
    months for people without capture (D79).
  - `home` made real: its four figures, the health warnings and the `cycle` sheet, with a labelled
    estimate (`project_cycle_end`).
  - Balance checks: weekly for four weeks, then on payday. *Unaccounted* adjustments, the gap, and
    `balance-check`.
  - The *Payday* card with its balance step.
- **Done when:** Home's figures match a hand check over a real week, and the unaccounted gap is
  known. **Daily use starts.**

### B14 · The reveal and the rotation
- **Builds:**
  - The yearly roster (D78), tested with a 30-year simulation, and Settings → *Appearance*.
  - Each look's arrival, drawn in code with `frontend-design` (`patterns.md` §9), *Play the reveal*,
    and reduced motion.
  - The launcher icon per look, if B02's icon test passed.
  - Notifications follow the look.
- **Rotation stays off, pinned to a look you choose, until this slice ships,** so a look never
  changes without its reveal. It's placed here to land before 1 Jan 2027.
- **Done when:** every arrival plays, from any look to any look, light and dark, on the phone.

## Stage 4 · Receipts and shared bills

What the money bought, and who it was for. It comes before Insights because both change spending.

### B15 · Scan and read
- **Builds:**
  - Capture: the ML Kit scanner (its mode chosen on faded receipts, Q12), gallery, the share target,
    and the browser camera with `crop`.
  - Upload: resizing, private R2 with signed links, and content-hash dedupe.
  - Extraction: a benchmark on 15–20 receipts picks the model (Q10, decision recorded).
    `receipt_extractions`, `reading`, and failure falling back to `manual` with the image.
  - Scan's tap and long-press, the *Scan receipt* shortcut, and the prompt's *Scan receipt* button,
    all made real; the island's *Reading a receipt*.
- **Done when:** a receipt scanned on the phone is read into `confirm`, and the accuracy is recorded.

### B16 · Confirm and match
- **Builds:**
  - `confirm` (D66, D67, D89):
    - tax and service spread into each item, checked against the full receipt
    - doubtful values marked
    - the category row, filled from the rule (*single* or *by item*)
    - how many people ate, and a note
  - `/match`: the same amount within ±3 hours; several matches; waiting, *Attach to a payment…*,
    *Evidence only*. Items become the payment's breakdown.
  - *No receipt…* (D90), the quiet scan prompt, and `receipt`.
  - The no-capture path, where a receipt creates its payment.
- **Done when:** a receipt scanned after paying attaches to its payment, and one scanned first waits,
  then attaches when the payment arrives (P4's bar). Q11 is tuned.

### B17 · Splits
- **Builds:**
  - Splits from a receipt or a payment, with who paid.
  - Ticks, *I've ticked everything I had*, the lock (D71), and shares by largest remainder.
  - The payer's tick list. Repayments matched to shares, with *Whose split share is it?* and
    `payer_names`.
  - What you owe when a friend paid: your payment matched within RM5 and 30 days, and the
    *Paying back* prompt, offline.
  - *Just my part* and the *Others* pool (D92), lending, *Write off*, `shared`, and the owe
    reminder.
- **Done when:** `split-mine`, `paid-back`, `split-theirs`, `split-stuck` and `lend` walk end to end,
  and §7's shared-bill example holds in SQL tests.

### B18 · Split links and paying friends
- **Builds:**
  - `split-public` and the `/s/:token` routes, through `SECURITY DEFINER` functions, with 128-bit
    tokens, guest browsers remembered, rate limits, and the split's realtime channel.
  - The friend-paid path, with their QR, and the link's expiry.
  - Paying from the same phone (D101): *Pay with TNG*, *Other app…*, *Save QR*, and your DuitNow QR
    in Settings.
  - The island's *A split at the table* and *Paying a friend*.
- **Done when:** three phones tick one split and it locks right, a friend's payment ticks their
  share, and Q28 (TNG accepting a shared QR) is answered.

### B19 · Receipts by email
- **Builds:**
  - Sen's inbox over IMAP, `/intake/email`, the `+code`, and Gmail's confirmation code in Settings.
  - One read per email (D91), cleaned HTML in a sandboxed frame, the raw `.eml` kept, and *Other
    attachments*.
  - Dedupe (Q30), and mail from the ESS sender set aside for B25's parser.
- **Done when:** a forwarded phone bill and a Grab e-receipt become receipts matched to their
  payments.

## Stage 5 · Insights and plans

Where the money went, on a month of real data.

### B20 · Insights
- **Builds:**
  - The cycle views, 12-month medians and the takeaways code writes.
  - The cards: on track, where it went, when the money leaks, the small things, meals, eating out,
    saving more than before, trusting the numbers, top merchants, and `insights/year` (§9.3).
  - `payments` filtered from a category. Q15 (a meal and a drink in one item).
- **Done when:** one month's figures match a hand check (P5's bar).

### B21 · Budgets, goals and buckets
- **Builds:**
  - Budgets per cycle (D29) and their status view, with the 80% and *over* signals stored for Sen.
  - Goals and buckets (§10): feasibility against median surplus, projected finish, and the
    trade-off code computes.
  - `budgets`, `goals` and `goal` made real.
- **Done when:** a budget's meter and a goal's feasibility match a hand check.

### B22 · Subscriptions and exchange rates
- **Builds:**
  - Declared subscriptions, with forecasts in `subscription_charges`, matching and *missed*.
  - Bank Negara's rate (ECB as fallback), then the charge's own rate (D99).
  - Invoices attaching to their charge, and *What renews soon*.
- **Done when:** a declared USD subscription matches its MYR charge and shows its effective rate.

### B23 · Widgets
- **Builds:** small, medium and large widgets in each look (D74), with real figures; they go dark with
  *Capture is off*, and FCM refreshes them while the app is closed.
- **Done when:** all three sizes sit on your home screen, in the current look, and update by
  themselves.

## Stage 6 · Claims by hand

The monthly claims, and the salary they come back in. Placed before Sen (decided 8 Oct), so Sen is
built once with claims and correct income already there; the ESS adapter waits until after Sen.

### B24 · Google Calendar
- **Builds:** connecting through a Custom Tab with a signed `state`, the refresh token encrypted, the
  app's own *Sen* calendar, `calendar_events` kept in step by the morning job, and renewals from B22.
- **Done when:** a renewal appears in your Google Calendar, then moves when its date changes.

### B25 · Claims
- **Builds:**
  - Schemes in Settings, starting from nothing, with *Describe it to Sen* waiting for B28. The scheme
    facet on rules.
  - The monthly draft on the 1st, with its evidence and what's missing.
  - Reminders by code: in Review, as pushes, and in the calendar.
  - `claims` and `claim`, the submission kit.
  - The approval-email parser, and `approved_amount`.
  - The payday claims question (D45): splitting the salary into repayments and income, as the
    *Payday* card's first step.
- **Done when:** a month's claims are drafted, reminded, submitted by hand and repaid by a split
  salary, on made-up schemes in tests and on the owner's real schemes on the phone.

### B26 · The claim pack and reliefs
- **Builds:** the claim pack PDF on the phone (D97): a page per line, paste areas sized for thermal
  slips, *page N of M*, and offline. Relief tags and yearly totals (§14).
- **Done when:** a printed pack matches D97's layout, from the phone, offline.

## Stage 7 · Sen

The agent, built once, on data and views that already exist. Its model is chosen on 20 real
questions over at least a month of your data (§12.6).

### B27 · Sen's harness and answers
- **Builds:**
  - The loop (`ToolLoopAgent`), the main prompt, skills with `activeTools`, and the always-on tools,
    `calc` included (D108).
  - Messages as parts, runs and steps, streaming, and continuations.
  - The figure check, with *not checked* in the chat.
  - The rolling summary through the `summariser` subagent, and `search_messages`.
  - The AI credit check before every call.
  - The `sen` sheet made real, with UI tools and avatar states. The `answers` and `memory` skills,
    *Ask Sen about this*, and the island's *Sen working*.
- **Done when:** 20 real questions are answered correctly against SQL truth, and the main model is
  chosen (decision recorded).

### B28 · Proposals and chores
- **Builds:**
  - `agent_proposals`, with `/proposals/:id` applying and undoing through code.
  - Skills: `merchant-rules`, `budgets`, `goals-buckets`, `subscriptions`, `promises` (with their
    morning chase), `owed`, `claims`, and *Describe it to Sen* for schemes.
  - `review-sorter` runs nightly; Review's *Apply all*.
- **Done when:** each kind of proposal applies and undoes, logged as Sen's, and a night's sorting
  clears a real backlog.

### B29 · Check-ins, experiments and closing the gap
- **Builds:**
  - `get_checkin_signals`, the 21:00 job (no signals, no call), and `post_checkin`'s one-push rule.
  - Home's note, and the Sunday summary.
  - `hold-to-word` experiments, counted by code.
  - `close-the-gap`, opening `manual` filled in.
- **Done when:** a week of check-ins you didn't mute (P6's bar).

### B30 · Payday plan, look-back and projection
- **Builds:**
  - `get_payday_plan` in SQL; plan items ticked by matching; plan progress on Home.
  - The look-back with one experiment, and `afford-it`.
  - The *Payday* card's steps 3 and 4, and the island's *Payday moves*.
- **Done when:** a real payday runs the whole card, and the plan ticks itself as its transfers land.

### B31 · Files in the chat
- **Builds:** the clip button and *Ask Sen* in the share sheet, `agent_files` and `read_file`, and
  figures marked *from your file* (D109). `add_to_calendar` and the `calendar` skill.
- **Done when:** Sen answers from a sent PDF, with its figures traced to the file.

### B32 · Research
- **Builds:** the `researcher` subagent with grounding, a question code has checked for amounts,
  sources stored by their final address, shown unedited and opened in the browser, `research_briefs`,
  confirming figures into `products`, and `agent/research`. Q24.
- **Done when:** a researched question shows dated sources, and only confirmed figures reach code.

### B33 · Sen's advice (P6b)
- **Builds:** `rate-watcher` with its monthly re-check, `product-advisor` with `compare_products`, and
  `left-on-table`.
- **Done when:** each answers from confirmed products and real spending, with code's figures only.

## Stage 8 · ESS on the phone

The adapter, once Q29 is answered by the laptop capture (D110).

### B34 · The ESS engine and filing
- **Builds:**
  - `ess_recipes`; the Kotlin engine for `http` and `page` steps; the sealed browser in its own
    process.
  - A made-up ESS and a made-up recipe in the repo to test against.
  - Signing in (D103): the native sign-in screen and Keystore, with the fallback to signing in
    yourself.
  - *Import recipe*; *Send to ESS* with its reference and screenshot kept as evidence, stopping
    whenever anything is unexpected; and the island's *ESS filing*.
- **Done when:**
  - the engine files claims end to end against the made-up ESS on the emulator
  - on your phone, your imported recipe files a real claim, checked first with a safe test (Q29)

### B35 · The payslip on payday
- **Builds:**
  - The fetch on a captured salary, retried hourly for 6 hours, then daily for a week.
  - `/payslips`, read through the recipe's map with no model; net pay and the claim lines checked.
  - The salary split by itself, with *Undo*; `payslip_lines` feeding reliefs; *Payslip not found*;
    `get_payslips`.
- **Done when:** on a real payday, the payslip arrives by itself and splits the salary.

### B36 · Teach mode
- **Builds:**
  - Recording in the sealed browser, values matched, and tokens chained.
  - Each step classed as `http` or `page`. A cheap model names only what code can't place, and you
    confirm it once.
  - The first replay shows what it will send.
- **Done when:** a recipe taught on the made-up ESS replays correctly.

## Stage 9 · Sharing and data

### B37 · Export everything
- **Builds:** the `sen_ops` export workflow, `/export`, the signed 24-hour link and its push, and the
  year filter (D49).
- **Done when:** a ZIP of your data downloads on the phone.

### B38 · Members, invitations and AI credit
- **Builds:**
  - Inviting, accepting (the `invited` journey) and the short first run.
  - Switches, enforced in the API.
  - The `ai_credit_entries` ledger and the versioned rate card (D98), plus `agent/usage`.
  - `Members`: credit, shell seats, *Suspend*, and *Remove* after offering their export.
- **Done when:** a test friend, invited, sees only their own data and spends their own credit, and
  the admin can't read their money.

### B39 · The PWA
- **Builds:** installing it, *Add to Home screen*, web push (iOS only from the home screen), and
  offline read-only.
- **Done when:** a friend uses Sen on an iPhone for a month (P8's bar).

### B40 · Integrations: lunchbot (P9)
- **Builds:** scoped integration tokens and the two routes (D102), with lunchbot's pools as splits.
  **Only if the pool still runs.**
- **Done when:** lunchbot sends a pool and reads its matched deposits.

---

## Where the spec's phases went

| Phase (§19) | Slices |
|---|---|
| P1 listener spike | B02 (kept, not thrown away) |
| P2 foundations | B01, B05, B06, B07 |
| P3 core tracking | B08–B13 |
| P4 receipts | B15–B18 |
| P5 insights | B19–B23 |
| P6 agent, P6b | B27–B32, B33 |
| P7 claims and reliefs | B24–B26, B34–B36 |
| P8 friends and family | B37–B39 |
| P9 integrations | B40 |
| *new* | B03–B04 (the skeleton, D84), B14 (the reveal) |

## Which slice creates which table

Every table in `spec_v2.md` §15, and the slice that creates it. A table's columns that only a later
slice uses are added by that slice.

| Slice | Tables |
|---|---|
| B05 | `auth_*`, `user_access`, `invitations`, `user_settings`, `audit_log` |
| B06 | `scheduled_jobs`, `job_runs`, `alerts_sent`, `push_tokens` |
| B07 | `bank_events`, `capture_apps`, `device_heartbeats` |
| B08 | `accounts`, `account_names`, `categories`, `transactions` (core columns) |
| B09 | `parse_templates` |
| B10 | `channel_rules`, `ai_usage` |
| B11 | `pair_rules`, `transfer_rules` |
| B12 | `merchant_rules`, `merchant_aliases` |
| B13 | `balance_checks` |
| B15 | `receipts`, `receipt_extractions` |
| B16 | `receipt_items` |
| B17 | `splits`, `split_members`, `split_picks`, `payer_names` |
| B18 | `split_guests` |
| B19 | `email_messages` |
| B21 | `budgets`, `goals`, `goal_contributions` |
| B22 | `subscriptions`, `subscription_charges` |
| B24 | `integrations`, `calendar_events` |
| B25 | `claim_schemes`, `claims`, `claim_items`, `claim_evidence` |
| B27 | `agent_messages`, `agent_summaries`, `agent_runs`, `agent_steps`, `agent_memory` |
| B28 | `agent_proposals`, `promises` |
| B30 | `payday_plans`, `payday_plan_items` |
| B31 | `agent_files` |
| B32 | `products`, `research_briefs` |
| B34 | `ess_recipes` |
| B35 | `payslips`, `payslip_lines` |
| B37 | `exports` |
| B38 | `ai_credit_entries` |
| B40 | `api_tokens` |

## Decided on 8 Oct

The owner chose the recommended answer to each (D111):
1. **Claims by hand come before Sen, and the ESS adapter after it.** Sen is built once, with its
   claims skill and the salary split it depends on already there.
2. **The next slice waits for the owner's merge only.** A soak or a phone test holds it up only when
   the next slice needs the answer.
3. **The shell comes second,** after the design system and before the skeleton, so the phone soaks
   while the skeleton is built, and the skeleton is reviewed inside the real shell.

## Defaults the briefs chose

The spec didn't settle these. Each brief builds the default unless the owner changes it, and records
what's built in the spec. The owner settled two on 8 Oct.

| Brief | Default |
|---|---|
| B10 | *This was a payment* on a skipped notification re-drafts its wording as money; if no money template passes code's checks, `manual` opens with the text beside it |
| B12 | **Settled (D112):** a new merchant's two guesses come from a cheap model, the first time only; offline or late, from the person's own history |
| B14 | **Settled (D113):** one roster for everyone, computed from the year |
| B22 | *Fixed costs* on *How much is spoken for* are declared subscriptions due this cycle, plus the payday plan's *due* items from B30 |
| B25 | A claim's `approved_amount` is its amount unless the owner changes it, or the approval email states an amount the parser can read |
| B27 | The 20-question model eval runs inside the app, on an admin-only screen, because no cloud session may see real data |
