# B31 · Files in the chat

**Stage 7 · Sen** · after: B30 · next: B32

## Goal

The owner can send Sen a photo, screenshot or PDF, from the composer's plus or Android's share sheet,
and Sen answers from it. Figures read from a file are traced to it. Anything worth keeping still goes
through the receipt reader and `confirm`, never straight into the ledger.

Sen can also hand a file back: a table becomes an Excel file with real formulas, or a CSV, built by
code from a result. And it can put deadlines in the calendar.

## Read first

- `spec_v2.md`:
  - §12.5: *Files in the chat*
  - §12.2 rule 1
  - §12.3: `read_file`, `calc` (*from your file*), `make_file` and the *File* part in *What Sen
    answers with*, and `add_to_calendar`
  - §12.7
  - §12.6: the chat files reader's job and its model
  - §15: `agent_files`
  - §16: `/agent/files/upload-url` and `GET /agent/files/:id/url`
  - §17: the threat model
- Decisions: D108, D109, D40, D41, D152, D153.
- `docs/screens.md`: `sen` (the composer's plus, and the file part), and the native surfaces table's
  *Share target* row.
- `docs/ui/patterns.md`: §7, *Sen's chat*, and §4 (the card anatomy).
- B27 · Sen's chat's parts, which the file part's card joins, and B15's reader. Draw the card to the
  chat's approved design page (`docs/modules.md`, *Three design pages*); don't design as you build.

## Builds

### Files you send
- **The composer's plus,** for a photo, the camera and PDFs. **Android's share sheet** offers *Ask
  Sen* beside the receipt target.
- **`/agent/files/upload-url`:** a signed R2 link and an `agent_files` row, kept with its message.
- **The file goes to the model as you sent it,** and costs AI credit.
- **`read_file(id)`:** a PDF's own text, or a model's transcription of an image, on the chat files
  reader's own job and model (set in admin, with its default picked on its golden set and a decision
  recorded). It's read once and kept on the row.
- **Sen's figures from a file** are traceable by the figure check, and shown as *from your file*.
- ***Read as a receipt*** sends the file through B15's reader into `confirm`.

### Files Sen makes (§12.3)
- **`make_file(kind, result)`:** built by code from a result already in this run, never by the model.
  - **Excel,** with real formulas, so a total is a formula over its cells and adds up when a cell is
    changed
  - **CSV**
  - every figure is the result's, and a column's formula is worked out in whole sen
- **Kept as an `agent_files` row,** and **`GET /agent/files/:id/url`** returns a signed link to it.
- **The *File* part's card** shows what the file is and opens it through the signed link. It's drawn here, in all
  six looks.

### Calendar from Sen
- **`add_to_calendar(event)`** and the `calendar` skill: renewals, card bills and promo end dates,
  into B24's *Sen* calendar, carrying no amounts. It's one of Sen's own things, set at once with a
  *Saved* line and *Undo*.

## Done when

1. Sen answers a question from a sent made-up PDF bill, with its figures marked *from your file*. A
   figure not in the file is marked *not checked*.
2. *Ask Sen* from the share sheet opens the chat with the file attached.
3. *Read as a receipt* reaches `confirm`. Nothing reaches the ledger without it.
4. A table downloads as a spreadsheet whose formulas add up, and as a CSV with the same figures. The
   file comes from a result by code, and its link is signed.
5. Sen adds a deadline to the calendar, with no amount.

## On your phone

- [ ] Send Sen a PDF bill from the plus, and from the share sheet. Ask about a figure in it.
- [ ] Ask for last month's spending as a spreadsheet. Open it and change a cell: the total follows.
