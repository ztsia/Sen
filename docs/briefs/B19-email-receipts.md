# B19 · Receipts by email

**Stage 4 · Receipts and shared bills** · after: B18 · next:
B20

## Goal

Invoices and e-receipts forwarded by each person's own Gmail filter become receipts, read once,
stored safely and matched to their payments like a scan. Sen never sees anyone's inbox, and ESS mail
never reaches a model.

## Read first

- `spec_v2.md`:
  - §5: the inbox-check row
  - §6.4 *Capture paths*, item 5 (forwarded email), all of it
  - §6.5: the email row
  - §15: `email_messages`, the email columns of `receipts`, and `user_settings.email_code` and
    `ess_sender`
  - §16: `/intake/email`
  - §17: *Email*, and the threat model
  - §21: Q30
- Decisions: D56, D85 (the 128-bit `+code`), D91, D96 (routing only).
- `docs/screens.md`: Settings → *Receipts by email*, `receipt` (the email view), and *Defaults to
  confirm* item 6.
- `docs/flows.md`: `email-setup`.

## Builds

### Intake
- **Each person's `+code`** is at least 128 bits, base32, in `user_settings`. Mail to an unknown code
  is dropped.
- **The IMAP checker** reads Sen's dedicated inbox with its app password. It runs when a phone syncs,
  when the app opens, and in the morning job.
- **`POST /intake/email`** takes one raw email, with an internal secret. It's idempotent by
  `Message-ID`, and finds its person through one narrow function.
- **Gmail's forwarding confirmation** is recognised, and its code is shown in that person's Settings.
- **Mail from that person's ESS sender** is stored as `email_messages.kind = claim`, before any
  model. B25's parser reads it.

### One read per email (D91)
- **Code keeps only** PDF, JPEG, PNG and WebP attachments, dropping:
  - embedded images, and images under about 300 px
  - `.ics`, `.p7s` and `winmail.dat`
  - PDFs over about 10 pages

  It sends at most five parts.
- **One model call** reads the body as text (from sanitised HTML) together with those parts, and
  returns for each document its role (*receipt*, *invoice* or *other*), its part and its itemised
  read.
- **Code checks the roles:**
  - the part exists
  - for a native PDF or the body, the total appears in that part's own text
  - the usual arithmetic holds

  A failure marks the total as doubtful in `confirm`. Nothing is dropped.
- **One receipt per receipt or invoice with a distinct total.** An invoice and a receipt for the
  same charge make one receipt, using the receipt.

### What's stored
- **The receipt's file** is its attachment.
- **With no attachment, it's the body as sanitised HTML:**
  - no scripts, forms, iframes or external CSS
  - remote images replaced by a placeholder; embedded ones inlined
  - shown in a sandboxed frame with a content security policy of `img-src data:`, so no tracking
    pixel fires, at intake or on view
  - *Save as PDF* through the phone's print sheet
- **The raw `.eml`** is kept in R2 as evidence.
- **`receipt` lists *Other attachments*,** with *Use this one instead*.
- **Dedupe:** `Message-ID` first, then each file's hash; for a body, the hash of its normalised text.
- **Then matching,** like a scan (B16).

### Settings → *Receipts by email*
- **Your forwarding address,** with *Copy*.
- **How to set the Gmail filter.**
- **Gmail's code,** once it arrives.

## Done when

1. Made-up test emails pass end to end: a phone bill with a PDF attachment, a Grab e-receipt with a
   body only, and an invoice-plus-receipt pair. Each becomes the right receipts and matches its
   payment.
2. A test proves no remote request is made when a stored body is rendered.
3. Forwarding the same email twice is a no-op. An unknown `+code` is dropped. ESS-sender mail never
   reaches a model.
4. Q30 is answered with a real forward: does Gmail keep the `Message-ID`?
5. pgTAP covers `email_messages`. The narrow function finds only the code's person.

## On your phone

- [ ] Follow Settings → *Receipts by email* in your Gmail: the forwarding address, the code, and a
      filter for a few senders.
- [ ] Wait for the next phone bill, or forward an old e-receipt, and check it matches.

## Needs from you first

- Sen's Gmail with IMAP on. Its app password is already in Vercel from B05.
