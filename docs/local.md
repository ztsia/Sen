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
- [x] **Link Vercel to `ztsia/Sen`** (done 10 Oct, from the laptop's CLI). Project **sen** in
      *ztsia's projects*: root `apps/web`, Vite, Node 22.x, production branch `main`, a preview per
      branch behind Vercel Authentication, Git Fork Protection on. Production is
      `https://sen-my.vercel.app`. Sessions never deploy by hand and never hold a Vercel
      token: every push deploys through this link (D122).
      The owner chose the name (10 Oct). Vercel's own `sen-ochre-three.vercel.app` still answers; the
      app never uses it. Changing the address after installing makes the app start again as a new
      site, with its cache and sign-in gone.
- [ ] **B02: the shell on your phone.** Parts 1 and 2 are done; install, then the soak, a week of
      ordinary use.
      1. **The signing key: done (10 Oct), made on the laptop.** The repo holds `SEN_KEYSTORE_B64`
         and `SEN_KEYSTORE_PASSWORD`; never delete those, or updates stop installing over the app
         (you'd uninstall, and lose what's only on the phone). Its certificate's SHA-256 starts
         `A2:8A:62:49`. The *Shell signing key* workflow isn't needed any more, and refuses to run
         while a key exists.
         - [ ] **Move the backup off the laptop.** It's in your user folder, `sen-signing-key/`:
               `sen.jks` and `sen-password.txt`. Put both in your password manager, then delete the
               folder. GitHub never shows a secret again, so this is the only other copy.
      2. **The two addresses: done (10 Oct),** in `apps/shell/sites.json`. Production above; the
         review alias is `https://sen-review.vercel.app`, which follows the Git branch `review`. A
         session points it at the branch under review by pushing that branch to `review`.
         - [ ] **The review alias is behind Vercel's login** (measured 10 Oct: it redirects to
               vercel.com), so the review build can't load it yet. Say which you'd rather: turn
               Vercel Authentication off for the project (recommended: the repo is public, and a
               preview only ever holds made-up data), or keep it and have a session teach the review
               build to sign in to Vercel once.
      3. **Install and set up.** The *Shell* workflow builds both apps on every push, and on `main`
         publishes them. *ztsia/Sen* → *Releases* → the newest *Sen 0.2.N* → tap `sen-0.2.N.apk`
         (Chrome asks to allow installing unknown apps: allow it for Chrome). **Play Protect blocks
         it, with no *Install anyway*** (measured 10 Oct): Malaysia has had enhanced fraud protection
         since April 2026, which stops apps asking for notification access when they come from a
         browser, a chat app or a file manager. So: *Play Store* → your picture → *Play Protect* → ⚙
         → turn *Scan apps with Play Protect* off, install, and turn it back on. `adb install` from
         the laptop isn't blocked. Install `sen-0.2.N.apk`, named **Sen**; `sen-review-0.2.N.apk`
         (*Sen review*) is the review build, which opens Chrome while the review alias is behind
         Vercel's login.
         **For updates without checking by hand, use Obtainium** (D122): install it from
         github.com/ImranR98/Obtainium (*Releases*), *Add app*, source
         `https://github.com/ztsia/Sen`, and under *Filter APKs by regular expression* put
         `^sen-\d`, so it skips the review build. It then tells you when a new Sen is out and
         installs it in one tap. Most changes need no new app at all: the shell loads the web app
         from Vercel, so a merge reaches the phone at its next launch.
         Then in Sen: *More* → *Settings* → *Capture*:
         - *Your apps*: tap *Choose these*, or tick yours.
         - *Notification access* → *Open settings*, find Sen, switch it on. **Greyed out?** Back in
           Sen, *Open Sen's app info*, tap ⋮ at the top right → *Allow restricted settings*, then try
           again.
         - *Keep Sen running*: *Allow*, then *Autostart* on, *Battery saver* → *No restrictions*,
           and lock Sen in recent apps (open recents, drag Sen's card down or long-press → padlock).
      4. **The soak, a week** (B02 done-when 6). Pay as you normally do. Now and then open *Settings* →
         *Capture* → *Captured on this phone*: each payment should be there, and the ♥ (*Heartbeat*) at the top
         shows the listener's checks. **Reboot once**, and **leave the phone alone for a day once**;
         the heartbeat should show it carrying on after both. Then:
         - *Share samples*: tick the new notifications (Ryt's duplicates with their times, a TNG QR
           payment, a toll, …) and share them into a cloud session, which anonymises them into
           `docs/notifications.md`. Real text never goes into the repo.
         - Say whether anything from an app you didn't choose ever showed up (it must not).
         - Say whether any row shows a one-time code or TAC you could read (it must not: long
           numbers show as `•`, D119). Expect Ryt's dates as `••/•/••••`; that's the mask, not a fault.
           (QA B02 run 6)
      The **hidden tests** are behind a long-press on *Version* in *More* → *Settings* → *Account*,
      in the next two items.
- [ ] **Does your launcher keep Sen's icon when the look changes?** (D77) In the installed release, long-press
      *Version* (*More* → *Settings* → *Account*) and tap **Switch icon**. Put Sen on your home screen first,
      then press Home after tapping and check, on the home screen and in the app drawer:
      - Sen's icon changed (Minted ↔ Instrument) and stayed where it was
      - no second Sen icon appeared, and nothing went missing
      - a Sen widget, if one exists by then, still updates
      Tap it again to switch back. Report what you saw in a cloud session. If anything misbehaved, the
      icon stays fixed and only the inside of the app rotates.
- [ ] **Does your phone show Sen's moments in the Hyper Island?** (D101, `spec_v2.md` §21 Q27) Same
      place, **Test island**. Then:
      - does the pill appear at the top, and does tapping it expand into the full card with its
        buttons?
      - does it count down and close by itself after a minute?
      - **Test category prompt**: do its three buttons show and work when you pull the notification
        down?
      Separately, install the demo app from github.com/D4vidDf/HyperIsland-ToolKit (*Releases*), and
      check whether its demo notifications show as the island. If they do, a session adds Xiaomi's
      own island as a second implementation; if not, Sen stays on the standard one.
- [ ] **Add the `DENYLIST` secret to `ztsia/Sen`** (B01). github.com → *ztsia/Sen* → *Settings* →
      *Secrets and variables* → *Actions* → *New repository secret*. Name: `DENYLIST`. Value: one
      string per line that must never appear in the repo, such as your employer's name and ESS's
      address. Write it only there, nowhere else. On the laptop, in your own terminal (never in a
      session's chat): `gh secret set DENYLIST --repo ztsia/Sen`, paste the lines, then Enter and
      Ctrl+Z, Enter. The hygiene check on every PR then fails on any of
      them, matched without regard to case, and names only the file and line. Until it's set, the check
      still blocks `private/` files and says plainly that the denylist part was skipped.
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

- [ ] **B01 phone check: Scan's long-press** (QA B01, finding on AC-23s). Once the preview link
      opens on the phone (Chrome is fine; the shell from B02 too):
      1. On Home, press and hold **Scan** for about one second, then lift your thumb.
      2. *Add a payment* should open and **stay open**. Write down whether it instead jumped straight
         to *From gallery* (a screen saying *Not built yet*) or *Add manually*.
      3. Repeat with Android's *Touch and hold delay* set to **Medium** or **Long** (Settings →
         Accessibility; on the Xiaomi, *Additional settings → Accessibility → Interaction*), then put
         it back.
      Paste what happened into the next cloud session. In Chromium's touch emulation, lifting the
      finger picked the sheet's row under it.
- [x] **Turn on GitHub's protections for `ztsia/Sen`** (D85): Settings → *Code security* → **secret
      scanning** and **push protection**. Both on (checked 10 Oct).
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
  `sen-preview`. Never let a preview branch from production: a branch copies everyone's real money.
  Through Vercel, so the connection strings go straight into its environments and no session sees
  them:
  1. Vercel → *sen* → *Storage* → *Create Database* → **Neon**, and accept its terms (the one step
     only you can do). Region **Singapore**, free plan, name `sen`. Connect it to **Production
     only**.
  2. The same again, name `sen-preview`, connected to **Preview** and **Development** only.
  On the laptop instead: run `vercel integration accept-terms neon` in your own terminal, and a
  local session creates both.
- **Better Auth's secret: done (10 Oct).** `BETTER_AUTH_SECRET` is in Vercel, a different random
  value in *Production* and in *Preview*, made on the laptop and never shown.
- **make yourself the admin**, once, after the first production deploy. Sign-up is off, so the
  foundations slice gives a one-time seed command that creates your account with the admin flag
- a Firebase project for push (FCM), in the same Google Cloud project
- an R2 bucket
- **an Anthropic API key** (D120, before B10): console.anthropic.com → *API keys* → *Create key*,
  named `sen`, with a monthly spend limit. Into Vercel's *Production* environment only
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

- [ ] **B03's five tabs on the real phone** (QA B03). Open the preview in the debug shell and check what a
      browser can't: hold the Scan tab for half a second (a light buzz, the sheet opens, no tap on release);
      answer a Review row and see the toast sit above the tab bar, clear of Sen's button; turn on airplane
      mode and answer a row, then say whether the screen updates (in a browser it doesn't: QA B03 finding 1);
      and swipe back from a sheet, then from Insights (it should go to Home).
      Run 2 adds three: set Android's font size to the largest and read Home's *Spent … this cycle* card (the
      amount should stay whole; QA B03 finding 23); scroll Review down and tap Insights, then More →
      Payments twice (each should open at its top; finding 18); and double-tap *Apply all* and *Delete*
      (one application, one step back; findings 17 and 21).
      Run 3 adds two: with the font size at the largest, check Home's *Spent … this cycle* amount again (it
      still breaks at the comma in a browser; finding 23, still failing); and on a slow signal, open Payments
      for the first time after an update and say whether the tab bar jumps to the middle of the screen while
      it loads (QA B03 run 3, finding 31).
