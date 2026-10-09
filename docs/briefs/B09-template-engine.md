# B09 · The template engine

**Stage 3 · Capture to ledger** · after: B08 · next: B10

## Goal

A template, the bank's wording with typed blanks, reads a notification into a payment, in exactly the
same way in Kotlin on the phone (offline, with the app closed) and in TypeScript on the server. The
two engines are proven identical by shared golden fixtures. A parsed event becomes a transaction.

No templates ship (D87): this slice builds the engine and books from **fixture** templates; B10
drafts the real ones.

## Read first

- `spec_v2.md`:
  - §6.2: *Parsing is by templates* with its four bullets (blanks, kinds, ownership, context),
    *No templates ship*, and *Each event ends up*
  - §6.3: the first two bullets
  - §5.1, the Tests row: both engines, one set of fixtures
  - §15: `bank_events.parsed_by`, `parse_status` and `parsed`, plus `parse_templates` and
    `transactions`
- Decisions: D15, D16, D17, D87.
- `docs/notifications.md`, all of it: every sample and its documented template.
- `docs/screens.md`: `payments`, `txn` (*What the bank said*) and `skipped`.

## Builds

### The engine (TypeScript and pure Kotlin, the same behaviour)
- **The skeleton:** the title and text normalised (Unicode NFC, straight apostrophes, collapsed
  spaces), with each blank as its token. `skeleton_hash` is computed from it.
- **Blanks, each with a fixed pattern:** `{amount}` (the RM and MYR forms, thousands separators and
  decimals, parsed into sen with no float), `{name}`, `{merchant}`, `{service}`, `{date}`, `{time}`,
  `{account}`, `{reference}`, `{balance}` and `{any}`. Dates and times come in the formats seen in
  `notifications.md`, and resolve to a `timestamptz` read as Kuala Lumpur time.
- **Compiling:** a template becomes an exact, anchored pattern over title and text, so the same text
  always gives the same result.
- **The result:** `{kind, amount, name, merchant, service, account, reference, occurred_at}`, where
  the kind is `out`, `in`, `internal`, `hold`, `context` or `ignore`.
- **The template's id** is a UUIDv5 of (user, package, skeleton), the same on phone and server.
- **Golden fixtures:** one file each of notifications, hand-written templates and expected results,
  built from `notifications.md`'s anonymised samples. Both engines' test suites read the same file.
  The templates are for testing only; none ships.

### Data
- **`parse_templates`:**
  - kind, `ignore_reason`, title and text templates, `account_id`
  - status `provisional`, `active` or `rejected`
  - `proposed_from_event_id`, `confirmed_at`
  - `UNIQUE (user_id, package, skeleton_hash)`
- **`bank_events`** gains `parsed_by`, `parse_status` and `parsed`.
- **Templates join the offline copy.**

### On the phone (native, offline)
- **On capture:** read the event with the synced templates, then write the transaction into the
  outbox with its derived id. Nothing waits for the web app or the network.
- **With no template:** `skipped` when there's no RM or MYR amount (§6.2 step 1); otherwise it waits
  for B10's drafting.
- **`ignore: OTP` templates run in the listener (D116),** after B02's filter and before the mask: a
  notification one matches is dropped and logged like any OTP, never stored. A wording a money
  template reads is a payment, so it isn't masked.

### On the server
- **A re-read:** when a template arrives or changes, the server re-reads that person's matching
  `unparsed` events and makes their transactions, with the same ids the phone would.
- **Events to transactions:**
  - `source = notification`, `kind` from the template (`spend` for out, `income` for in, `transfer`
    for internal), and direction and amount
  - `merchant_raw` from `{merchant}`, `{name}` or `{service}`
  - `occurred_at` from the text when it gives one, otherwise from `when`
- **Which account:** the template's `account_id`, or `{account}` looked up in `account_names`, or
  the package's only account. Failing those, *Review* asks *Which account is this?* once, and the
  answer is stored in `account_names`.
- `hold` and `ignore` never make a transaction; `context` waits for B11.

### Screens made real
- **`payments`:** real rows. Category and filters are partly made real in B12.
- **`txn`:** with *What the bank said* (the raw text) and where it came from.
- **`skipped`**, with its rows. *This was a payment* comes in B10.

## Leaves for later

- Drafting templates and *Review*'s *New wording: right?*: B10. Pair rules and transfers: B11.
  Categories and rules: B12.

## Done when

1. Both engines pass every golden fixture, with identical results; CI runs both.
2. Property tests: an amount read is always integer sen, and a template never matches text it wasn't
   compiled for.
3. On the emulator, a fixture template is synced down, a posted notification is booked natively in
   airplane mode, and it syncs with the same id the server's re-read gives.
4. A server re-read of old events is idempotent.
5. pgTAP covers `parse_templates`. `payments` and `txn` show real rows in Playwright, against the
   local database seeded with fixture templates.

## Notes

- The phone check moves to B10, because no real template exists until drafting does.
- Masking long digit runs belongs to B10's drafting. The engine reads the raw text.
