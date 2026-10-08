# Owner and local tasks

Everything a cloud session can't do: anything that needs the owner's accounts, the owner's phone,
or a machine with a device attached.

**Cloud sessions: never attempt these.** Add them to this file instead, with steps the owner can
follow on a phone, and commit.

## Now

- [ ] **Tonight (8 Oct): capture ESS's API in a local session on your laptop** (D105, D110), from the
      two claims you're submitting. It needs Node 20 or later on the laptop.
      1. On the laptop: clone `ztsia/Sen` (or `git pull` it), on `main`.
      2. Give Claude Code a browser it can watch:
         `claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`. Then run `claude` in the
         repo and say: *Capture ESS, per docs/local.md (D110).*
      3. It opens a Chrome window. **Sign in yourself, in that window**: type the password there,
         never in the chat.
      4. Then, in order: open the payslip list and one payslip (download it if there's a button);
         open your claims list; submit the two claims with their files; open the EA form page if
         there is one; then **sign out**, so the cookie the session saw is dead.
      5. **The session records,** from the network panel, the console and the page:
         - each request's method, path, query, and body field names and types
         - which cookie holds the session, and when it expires
         - any token (such as CSRF) a request sends, and which earlier response gave it
         - the sign-in's redirects, and any second step
         - how files are uploaded
         - whether a payslip comes as data (JSON) or only as a PDF
         - each form field's label and selector, and console errors
      6. **It writes only to `private/ess/`** (gitignored): `capture/` (the raw requests),
         `recipe.draft.json` (the steps as `http` or `page`, with slots such as `{claim.amount}`
         where values go, never the values) and `notes.md`. Nothing ESS-specific goes in the repo:
         no address, employer name, paths or amounts. The one repo change it may make is the generic
         answers to `spec_v2.md` §21 Q29 (for example: a cookie session, about 8 hours, no second
         step, payslips as JSON), committed and pushed.
      7. Keep `private/ess/` on the laptop. In B34 the recipe goes into Sen by *Import recipe*
         (D106); no cloud session ever sees it.
- [ ] **Create the cloud environment.** At claude.ai/code, start a new session, open the environment
      selector and choose *Add environment*. Fill it in from `docs/cloud.md` §2: name, network,
      variables and setup script.
- [ ] **P0, notification samples** (`spec_v2.md` §19). Transfers between your own accounts are done
      (5 Oct, `docs/notifications.md`). Screenshot these as they happen and paste them into a cloud
      session, which anonymises them before anything reaches the repo. Android's notification
      history only keeps about a day, so screenshot the same day.
      - [x] a Google Pay payment with the Ryt card (5 Oct: Ryt and Google Wallet both notify)
      - [ ] a payment with the Public Bank debit card
      - [ ] a DuitNow QR payment from TNG at a shop or stall
      - [ ] a toll charged to the eWallet through the TNG card
      - [ ] a TNG card reload
      - [ ] an ATM withdrawal, if one happens
      - [ ] money sent out of Public Bank: does MyPB show anything?
      - [ ] salary landing in Public Bank, and the transfer of RM1,000 or more that follows it
      - [ ] interest from Ryt, and GO+ returns or a GO+ cash-out
      - [ ] a refund, whenever one happens
      - [ ] one promo from each app
      - [ ] an OTP or TAC, **with the code blanked out**
      - [ ] paying DingDong for a lunch pool
      - [x] petrol paid by card at the pump (5 Oct: a hold, then the final amount a minute later)
      - [ ] a Grab ride, and a GrabPay top-up
      - [ ] **a Ryt DuitNow QR payment from the Main Account** (you have one: please resend it; the
            attachment didn't come through on 7 Oct)
      - [ ] **Ryt posting the same notification twice**: screenshot both, with their times showing
            (it sets how far apart duplicates can be, D88)
      - [ ] a Grab payment made by card, if Grab and the bank app both notify it

- [ ] **Turn on GitHub's protections for `ztsia/Sen`** (D85): Settings → *Code security* → **secret
      scanning** and **push protection**. And keep *Keep my email addresses private* ticked in your
      GitHub email settings.
- [ ] **Never make `ztsia/finance-tracker` public.** It's the private design archive: its history
      holds the claim values removed on 7 Oct, and GitHub keeps old PR pages.

## Optional

- [ ] **If the cloud environment still lists Expo hosts or `EXPO_TOKEN`**, remove them. The app no
      longer uses Expo (D42, `docs/cloud.md` §2).

## Later

- [ ] **lunchbot changes, in its own repo** (`spec_v2.md` §7 *The lunch pool*, §16, D23, D102). **Only
      if you're still ordering from DingDong** once Sen's integrations exist (P9). Then ask a lunchbot
      session to:
      - read `GET /integrations/v1/matched-payments` every few minutes, and confirm each matched
        deposit with the amount actually received
      - send `PUT /integrations/v1/shared-bills/:ref` when a pool's pledges are set, and again when
        the pool ends, with what you ate and how many lunches
      - keep the integration token in the Northflank secret group, never in the repo
      - first, amend lunchbot's own rules with your sign-off: its `CLAUDE.md` rule 2 and spec §14 say
        only your tap confirms a deposit. Here a deposit is confirmed by your bank's own notification
        of the money arriving, matched to the member you chose the first time, rather than by
        reading a screenshot

Queued by the build, not needed yet. Every key goes into Vercel's environment variables (production
values in *Production* only), never into the repo or a chat:
- **a dedicated Gmail account for Sen** (D54). It sends the login codes and invitations.
  1. Create the account, then turn on 2-Step Verification (Google Account → Security).
  2. Google Account → Security → *App passwords*: create one named `sen`. Keep it for the
     foundations slice; it's the password Better Auth's mail uses.
- **a Google Cloud project for the AI**, Gemini through Vertex AI (D55). There's no "Gemini key" page
  in Vertex: it's an ordinary Google Cloud API key bound to a service account.
  1. console.cloud.google.com → create a project, such as `sen`. Billing → link a billing account
     with your card (billed in MYR, after use).
  2. APIs & Services → Library → **Vertex AI API** → *Enable*.
  3. IAM & Admin → Service accounts → *Create*: name `sen-ai`, role **Vertex AI User**.
  4. APIs & Services → Credentials → *Create credentials* → **API key**. Tick *Authenticate API
     calls through a service account* and choose `sen-ai`. Then restrict the key to the Vertex AI
     API.
  5. The same project can hold Firebase for push (below) and the calendar's OAuth client.
- a Google Cloud OAuth client for the calendar (D41): consent screen *External*, then **publish it to
  *In production*** so its tokens don't expire after 7 days. The foundations slice adds the redirect URL
- **two Neon projects** (free plan, D54): `sen` for production, and `sen-preview` holding only the
  anonymised seed data the foundations slice provides. Point Vercel's *Preview* environment at
  `sen-preview`. Never let a preview branch from production: a branch copies everyone's real money
- **make yourself the admin**, once, after the first production deploy. Sign-up is off, so the
  foundations slice gives a one-time seed command that creates your account with the admin flag
- a Vercel project for the web app and the API, linked to this repo
- a Firebase project for push (FCM), in the same Google Cloud project
- an R2 bucket
- the Android shell on the phone, from a GitHub Actions build
- **forward receipts by email** (D56, from P5). Sen's Settings shows your own forwarding address,
  such as `sen-inbox+<code>@…`.
  1. In your main Gmail: Settings → *Forwarding and POP/IMAP* → *Add a forwarding address*, and
     paste that address. Gmail sends a confirmation to Sen's inbox, and the foundations slice shows
     how to approve it.
  2. Create a filter, From: the senders you want (Maxis, Spotify, Anthropic, Google Cloud billing,
     Grab, your shops), then *Forward it to* that address. Leave your bank alerts out.
- GitHub Actions secrets for the jobs that run there (D85): in the private `sen_ops`, the database
  URL and R2 keys for the backup and *Export everything*; in the public `ztsia/Sen`, only the
  shell's signing key. Plus a fine-grained GitHub token that can start `sen_ops` workflows, kept as
  a Vercel secret (`spec_v2.md` §17)
- **a Cloudflare Worker** for the schedule and the realtime relay (D99, D100), in the same
  Cloudflare account as R2, with the scheduler secret shared with Vercel
- **an outside monitor** (D99): a free cron-job.org account checking Sen's `/health/jobs`, emailing
  you when it fails

Each slice that needs one of these lists it under *Needs from you first* in its brief
(`docs/briefs/`), and writes the exact steps here before it starts.

- [ ] **Does your launcher keep Sen's icon when the look changes?** (D77) Once the first build of the
      Android shell is on your phone, a session adds a hidden *Switch icon* button. Put Sen on your
      home screen, tap the button, then press Home and check, on the home screen and in the app
      drawer:
      - Sen's icon changed and stayed where it was
      - no second Sen icon appeared, and nothing went missing
      - its long-press shortcuts (*Scan receipt*, *Add expense*) still work
      - a Sen widget, if you've added one, still updates
      Report what you saw in a cloud session. If anything misbehaved, the icon stays fixed and only
      the inside of the app rotates.

- [ ] **Does your phone show Sen's moments in the Hyper Island?** (D101, `spec_v2.md` §21 Q27) Once the
      first shell build is on your phone, a session adds a hidden *Test island* button. Tap it, then:
      - does the pill appear at the top, and does tapping it expand into the full card with its
        buttons?
      - does it count down and close by itself?
      Separately, install the demo app from github.com/D4vidDf/HyperIsland-ToolKit (*Releases*), and
      check whether its demo notifications show as the island. If they do, a session adds Xiaomi's
      own island as a second implementation; if not, Sen stays on the standard one.
- [ ] **Does TNG accept a QR shared from Sen?** (D101, Q28) In B18, a session adds *Pay with TNG*.
      Try it with a test QR, then the same in Ryt and MAE, and say which opened the payment screen,
      and whether TNG filled in an amount carried in the QR.
- [ ] **ESS, when B34 starts** (D103–D106, §13.1, Q29). Tonight's capture should already have
      answered most of Q29. Tell the P7 session only what's still open, never the address, amounts
      or policy text (D10):
      - anything Q29 still lists
      - whether a draft can be saved or a claim withdrawn, for a safe first test
      - the form's file limits
      - one approval email, anonymised
      Your recipe goes into Sen from the laptop by *Import recipe*, or by *Teach Sen* on the phone.
      Then, on the phone: sign in once in Settings → *Claims* → *ESS*, and on the next payday check
      that the payslip arrived by itself.

