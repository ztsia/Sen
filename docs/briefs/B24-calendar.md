# B24 · Google Calendar

**Stage 6 · Claims by hand** · after: B23 · next: B25

## Goal

Deadlines go into the owner's Google Calendar, in Sen's own calendar only, so the calendar does the
reminding. Renewals start now. Claim deadlines come in B25, and Sen's deadlines in B31.

## Read first

- `spec_v2.md`:
  - §12.7, all of it
  - §15: `integrations` and `calendar_events`
  - §16: `/calendar/connect` and `/calendar/callback`, and the morning job's calendar sync
  - §17: *Secrets*, and *Links leave the app* (the sign-in opens in a Custom Tab, the one exception)
- Decisions: D40, D41, D54.
- `docs/screens.md`: Settings → *Sen* (Google Calendar). This section shows before Sen exists, with
  only the calendar, behind the *Calendar* switch.
- `docs/flows.md`: `calendar`.

## Builds

### Connecting
- **`/calendar/connect`** returns Google's sign-in address. Its `state` is a short-lived code signed
  with a server secret, so no table is needed.
- **The shell opens it in a Custom Tab,** because Google blocks sign-in inside a WebView.
- **The scope is `calendar.app.created` only.** If Google won't grant it, the calendar stays off,
  and *Review* and pushes still remind.
- **`/calendar/callback`:**
  - checks the signature
  - stores the refresh token in `integrations`, encrypted with AES-256-GCM using a key from an
    environment secret, with its `key_id`
  - creates the *Sen* calendar
  - sends you back to the app
- ***Disconnect*** in Settings deletes the token.

### Keeping it in step
- **`calendar_events`** maps each deadline (`source_kind`, `source_id`) to its Google event.
- **The morning job** creates, moves and deletes events as deadlines change or are done. Events carry
  no amounts.
- **The first source is subscription renewals** (B22). B25 adds claim deadlines; B31 adds
  `add_to_calendar` for Sen.

## Done when

1. Tests with Google's API mocked:
   - a bad or expired `state` is refused
   - the token is never stored in plain text
   - the morning sync creates, then moves, then deletes an event
2. **On the phone:** connecting works (with Google's *unverified app* screen once), and a renewal
   appears in Google Calendar, moves when its date changes, and goes when it's done.

## Needs from you first

- A Google Cloud OAuth client, consent screen *External*, **published to *In production*** so its
  tokens don't expire after 7 days, with the redirect URL this slice gives. Plus its secret, the
  encryption key and the state-signing key in Vercel. The steps go into `docs/local.md`.
