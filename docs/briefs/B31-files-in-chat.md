# B31 · Files in the chat

**Stage 7 · Sen** · after: B30 · next: B32

## Goal

The owner can send Sen a photo, screenshot or PDF, from the composer or Android's share sheet, and
Sen answers from it. Figures read from a file are traced to it. Anything worth keeping still goes
through the receipt reader and `confirm`, never straight into the ledger. Sen can also put deadlines
in the calendar.

## Read first

- `spec_v2.md`:
  - §12.5: *Files in the chat*
  - §12.2 rule 1
  - §12.3: `read_file`, `calc` (*from your file*) and `add_to_calendar`
  - §12.7
  - §15: `agent_files`
  - §16: `/agent/files/upload-url`
  - §17: the threat model
- Decisions: D108, D109, D40, D41.
- `docs/screens.md`: `sen` (the composer's clip button), and the share target row.

## Builds

### Files
- **The clip button,** for photos, screenshots and PDFs. **Android's share sheet** offers *Ask Sen*
  beside the receipt target.
- **`/agent/files/upload-url`:** a signed R2 link and an `agent_files` row, kept with its message.
- **The file goes to Gemini as you sent it,** and costs AI credit.
- **`read_file(id)`:** a PDF's own text, or a cheap-tier model's transcription of an image. It's
  read once and kept on the row.
- **Sen's figures from a file** are traceable by the figure check, and shown as *from your file*.
- ***Read as a receipt*** sends the file through B15's reader into `confirm`.

### Calendar from Sen
- **`add_to_calendar(event)`** and the `calendar` skill: renewals, card bills and promo end dates,
  into B24's *Sen* calendar, carrying no amounts.

## Done when

1. Sen answers a question from a sent made-up PDF bill, with its figures marked *from your file*. A
   figure not in the file is marked *not checked*.
2. *Ask Sen* from the share sheet opens the chat with the file attached.
3. *Read as a receipt* reaches `confirm`. Nothing reaches the ledger without it.
4. Sen adds a deadline to the calendar, with no amount.
