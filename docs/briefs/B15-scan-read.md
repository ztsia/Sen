# B15 · Scan and read

**Stage 4 · Receipts and shared bills** · after: B14 · next: B16

## Goal

A receipt reaches Sen from the scanner, the gallery, a shared file or a browser camera. It's stored
once, at print quality, privately, and is read by the model into an itemised draft shown in
`confirm`. The model for reading receipts is chosen by benchmark. An image is never lost.

## Read first

- `spec_v2.md`:
  - §5: the scanning row
  - §6.4: *Capture paths* (1–4), *Storage* and *Extraction*
  - §6.5: the same-file row
  - §11: *AI costs*
  - §15: `receipts` and `receipt_extractions`
  - §16: `/receipts/upload-url`, `/receipts/:id/extract` and `/receipts/:id/url`
  - §17: *R2*
  - §21: Q10 and Q12
- Decisions: D9, D51, D55, D69, D94, D101 (the *Reading a receipt* moment).
- `docs/screens.md`: `scan`, `scan-more` and `reading` (and `crop` in a browser), plus the share
  target and launcher shortcut rows.
- `docs/flows.md`: `scan-after`, steps 1–2, and its sad paths for failed reading, offline and the
  same file twice.

## Builds

### Capture
- **The ML Kit Document Scanner in the shell,** through a maintained plugin or our own, with its
  gallery import.
  - **No black-and-white filter.** Pick the mode by testing faded thermal receipts (Q12), and record
    the choice.
- **Gallery multi-select.**
- **The share target** for images and PDFs. It uploads the file as a receipt, then shows `reading`.
  It shows as *Sen · Receipt*, pinned near the top of the share sheet by a sharing shortcut (D123).
- **A screenshot right after paying (D123):** for 10 minutes after a captured payment, a MediaStore
  observer on the screenshots folder; a new screenshot swaps the payment's notification and island
  button to ***Attach screenshot***, and a tap attaches it to that payment and reads it. Only behind
  Settings → *Capture* → *Screenshots after paying*, which asks for photo access (*Allow all*); never
  attached without the tap, and the image opened only then.
- **In a browser:** the camera through the file picker, then `crop` with four draggable corners,
  straightening in a canvas.
- **The Scan tab:**
  - a tap opens the scanner at once
  - a long-press opens `scan-more`
  - the *Scan receipt* launcher shortcut
  - the category prompt's third button becomes ***Scan receipt*** for that payment (B12 had
    *Other…*)

### Storage
- **Photos are resized** on the phone, or in the browser, to at least 1200 px on the short edge,
  JPEG about 80. PDFs go up untouched.
- **A SHA-256 content hash,** `UNIQUE (user_id, content_hash)`, shows *Already added* for a
  duplicate.
- **A private R2 bucket with signed links only:**
  - `/receipts/upload-url` makes the `receipts` row
  - `/receipts/:id/url` gives a view link
- **In the shell, the upload queues while offline** and the receipt waits in *Review*.

### Reading
- **`/receipts/:id/extract`,** idempotent:
  - the main-tier model on Vertex, with a strict JSON schema
  - always itemised, with a confidence per field
  - categories only from the person's active list, as an enum
  - **never a claim scheme or relief code**
- **The input class** (photo, native PDF or scanned PDF) sets `media_resolution`.
- **Retries with backoff.** A final failure marks the receipt `failed`: *Review* shows *couldn't be
  read*, which opens `manual` with the image beside it.
- **`receipt_extractions`** is append-only, and every call goes into `ai_usage`.
- **`reading`:** you can leave, and it waits in *Review* once read.
- **`confirm` shows the draft:** items, prices, total and the marked doubtful values, fixable in
  place. B16 builds *Done*, matching, categories by rule and splitting.
- **The island's *Reading a receipt*:** *Reading…*, then *6 items · RM45.60 · Check*.

### The benchmark (Q10)
- **15 to 20 of the owner's kept receipts:** faded thermal, kedai, a long supermarket receipt, and
  the phone bill PDF.
- **They're shared with the benchmark session only, never committed.** The session scores the
  candidates (first Gemini 3.8 Flash and 3.5 Flash-Lite, D55) on item text, prices and totals, at
  each `media_resolution`.
- **The winner is named only in `ai/models.ts`, with a recorded decision.**
- **Tests use made-up receipts,** re-typed into fixtures (D11).

## Leaves for later

- *Done*, matching, categories from rules, *No receipt*, pax, the quiet scan prompt and `receipt`:
  B16. Splits: B17.

## Done when

1. On the Xiaomi, a receipt scanned straight after paying is uploaded and read, and shows in
   `confirm` with its items.
2. The same file shared twice says *Already added*. Offline, the scan waits and uploads on reconnect.
   A screenshot taken within 10 minutes of a captured payment is offered on its notification, one
   taken later isn't, and neither is read before the tap (emulator test).
3. A forced extraction failure falls back to `manual` with the image, and the image is kept.
4. In a browser at a phone viewport, the camera input with four-corner crop produces a straightened
   upload (Playwright with a fixture image).
5. The benchmark's accuracy per candidate and the choice are recorded.
6. pgTAP covers the new tables. Signed links expire, and one person can't get another's link.

## On your phone

- [ ] Scan a few real receipts: a faded one, a long one. Share the phone bill PDF from Gmail.
- [ ] Long-press Scan; use the *Scan receipt* shortcut.
- [ ] Pay for a ZUS order, screenshot the order, and tap *Attach screenshot*. Share another
      screenshot from its preview: is *Sen · Receipt* near the top?

## Needs from you first

- The R2 bucket for receipts (it may be the backup bucket's account, but a separate bucket).
- **For the benchmark session only:** 15–20 receipts, and a capped Vertex key, added and then
  removed.
