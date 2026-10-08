# B18 · Split links and paying friends

**Stage 4 · Receipts and shared bills** · after: B17 · next: B19

## Goal

Friends join a split at the table, from a QR or a link, with no login: they tick what they had, see
their share settle live, and then see the payer's DuitNow QR. The link reaches only that one bill.
On the phone, paying a friend's QR is a share straight into TNG.

## Read first

- `spec_v2.md`:
  - §5: *Requests with no signed-in person*
  - §7, *Splits*:
    - *The link*, *How they pay* and *Paying from the same phone*
    - *Who has paid: the payer's tick list*
    - *It stops working*
  - §15: `split_guests`, plus `splits.token_hash`, `payer_qr_key` and `expires_at`, and
    `user_settings.duitnow_qr_key`
  - §16: the `/s/:token` routes and `/realtime/token` (split channels), plus *Auth*
  - §17: *Links leave the app* (`Referrer-Policy`), *Repo hygiene* (tokens of at least 128 bits)
    and *R2*
  - §21: Q28
- Decisions: D47 (with its amendment), D64, D65, D71, D85, D100, D101.
- `docs/screens.md`: `split-public`, `split` (the QR and *Share the link*), and Settings → *You*
  (DuitNow QR).
- `docs/flows.md`: `split-mine` steps 3–6, `split-theirs` and `paid-back`.
- Skill: `database` (`SECURITY DEFINER` functions).

## Builds

### The link
- ***Share the link*** makes a random token of at least 128 bits and stores only its hash.
- **The QR for the table** is drawn locally.
- **The link stops** a day after the last tick, so a wrong tick can be undone, or after 30 days. The
  payer can reopen it from the app. A friend's QR is deleted when it stops.

### Routes with no login (§16)
- **The routes:**
  - `GET /s/:token`
  - `POST /s/:token/picks`
  - `PUT /s/:token/payer`
  - `PUT /s/:token/members/:id/paid`
- **Each calls one `SECURITY DEFINER` function** that resolves the token to its single split and
  touches only that split's rows. They never set a user id.
- **Rate limits per token and address,** input size limits, and image type and size checks on QR
  uploads.
- **A friend's browser** keeps a random guest token (at least 128 bits) in local storage, which maps
  to `split_guests`. The next link fills in their name and DuitNow QR. A signed-in Sen user is simply
  recognised.

### `split-public` (no app chrome; the same components and look)
- ***Hi Mei. Sen remembers this browser***, or a name box the first time.
- **The status,** live through the split's realtime channel, using a pass from `/realtime/token`
  issued against the split token.
- **Items to tick,** each with who else ticked it and their part of a shared one.
- ***Your share so far*** and *I've ticked everything I had*.
- **Once it's final,** the payer's DuitNow QR and *Pay RM22.14*. After the lock it's read-only: *To
  change a tick, ask Wei Ming*. A closed link shows only *This split is closed*.
- **When a friend paid:** they declare it and upload their QR; or the owner adds it. The payer ticks
  shares from their browser token.
- **Headers:** `Referrer-Policy: no-referrer` and the strict content security policy. Nothing from
  the app reaches the page beyond that bill.

### Paying from the same phone (D101)
- **Settings → *You*: your DuitNow QR,** uploaded once.
- ***Pay with TNG*** copies the amount, sends the payer's QR to TNG's package (`ACTION_SEND`), and
  starts the island's *Paying a friend*, which ends when the share ticks.
- ***Other app…*** opens the share sheet. ***Save QR*** saves to the gallery, deleted once the share
  ticks.
- **In a browser:** *Pay with an app* (the share sheet, with the amount copied) and *Save QR*.
- **The island's *A split at the table*:** *2 of 4 ticked*, until it locks.

## Done when

1. Playwright with three browser contexts (the payer and two friends) ticks one split live, in any
   order. It locks only when everyone is done and every item is claimed; shares match B17's view.
2. Definer tests:
   - a token reaches only its split
   - an expired or closed token reaches nothing
   - guessing tokens is rate-limited
   - no money from any other table is reachable
3. The friend-paid path: a QR is uploaded, the payer ticks from their browser, and you owe the
   right share.
4. **On the phone:** *Pay with TNG* opens TNG with the QR. Q28 is answered for TNG, Ryt and MAE, and
   for an amount carried in the QR.
5. The closed page shows nothing else, and the friend's QR is deleted from R2.

## On your phone

- [ ] Split a real meal: friends scan the QR at the table, tick, and see your QR.
- [ ] When a friend paid: tick their link, then *Pay with TNG*.
