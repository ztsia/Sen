# B35 · The payslip on payday

**Stage 8 · ESS on the phone** · after: B34 · next: B36

## Goal

Minutes after the salary notification, the phone signs in to ESS by itself and fetches that month's
payslip. When its net pay matches the salary to the sen, and its lines include the approved claims,
code splits the salary with no question asked (D104). Its statutory lines feed the reliefs.

## Read first

- `spec_v2.md`:
  - §13: *Paid inside your salary* and *The payslip*
  - §13.1: *Fetch payslip, by itself*
  - §6.1: the payslip row
  - §6.6: the payslip rows
  - §9.7: step 1
  - §14: the statutory lines
  - §15: `payslips` and `payslip_lines`
  - §16: `/payslips/upload-url` and `/payslips/:id/read`
- Decisions: D45, D103, D104, D105.

## Builds

### Fetching (native)
- **When a credit marked salary is captured,** a WorkManager job, with a network constraint, runs the
  recipe's *sign in* and *fetch payslip* for that month.
- **If it isn't out yet,** retry hourly for 6 hours, then daily for a week. After that, *Review* shows
  *Payslip not found*, with *Sign in to ESS* or *Skip this month*.
- **Upload:** `/payslips/upload-url` gives a signed R2 link and a `payslips` row, idempotent per
  period (`UNIQUE (user_id, period)`).

### Reading (code, no model)
- **`/payslips/:id/read`** reads the payslip through the recipe's `payslip_map`, as JSON or as PDF
  text, whichever Q29 found. It produces lines: gross pay, EPF, SOCSO, EIS, PCB, claims, and others.
- **IC and bank account numbers are never stored as data.**
- **The checks:**
  - net pay equals the salary credit, to the sen
  - each approved claim's amount appears among the lines
- **Both hold:** B25's salary split runs by itself, and the *Payday* card's step 1 shows it done, with
  *Undo*.
- **Otherwise:** B25's question is asked, as before.
- **The file is kept as evidence for 7 years.**
- **`payslips.status`** is `matched`, `mismatch` or `unread`.
- **Statutory lines** feed the reliefs' yearly totals (B26). **`get_payslips`** is Sen's tool,
  never returning an IC or account number.
- **Settings → *Claims*** shows the last payslip fetched.

## Done when

1. On the emulator against the fake ESS:
   - a captured salary fetches the payslip
   - a matching one splits the salary
   - a mismatched one asks
   - a missing one retries on schedule, then shows *Payslip not found*
2. Tests:
   - net pay must match to the sen
   - a claim line missing means asking
   - no IC or account number survives reading
3. **On a real payday:** the payslip arrives by itself and splits the salary.

## On your phone

- [ ] On payday, do nothing. Check the *Payday* card: was the salary split by the payslip?
