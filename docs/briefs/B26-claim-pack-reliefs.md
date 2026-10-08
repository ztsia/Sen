# B26 · The claim pack and reliefs

**Stage 6 · Claims by hand** · after: B25 · next: B27

## Goal

Two things:
- **The claim pack:** one PDF per claim period, built on the phone, offline, printed as it is for
  the hardcopy submission.
- **Reliefs:** tags with yearly totals against LHDN's public caps.

## Read first

- `spec_v2.md`:
  - §13: *The claim pack*
  - §6.4: *Storage* (why ≥1200 px matters)
  - §14, all of it
  - §15: `receipts.has_physical_original`, and the relief code on `transactions` and
    `merchant_rules`
  - §8: *Merchant rules*, the relief facet; Sen can never set it
- Decisions: D49, D89 (code refuses a tax facet from Sen), D97.
- `docs/screens.md`: `claims` (*Download claim pack*), and the Insights card *The year*.

## Builds

### The claim pack (D97), with pdf-lib in the web app
- ***Download claim pack*** on a claim period builds it **on the phone, from files it already holds,
  so it works offline**. It's never stored, only built again on demand.
- **One claim line per page,** grouped by scheme, then by date, with *page N of M* in each header.
- **A header on each page:**
  - the claim period
  - the ESS reference, once there is one
  - the date, the merchant and the amount claimed
  - a line when only part of a receipt is claimed: *Receipt total RM98.40 · RM30.00 claimed*
- **A thermal receipt** (`has_physical_original`) prints its day-one scan on the left, and a
  bordered paste area on the right, sized for an 80 mm slip.
- **A document receipt** (the phone bill PDF, an e-invoice, an emailed receipt) prints full width,
  with no paste area.
- **Offline:** the receipt files a claim needs are cached on the phone when the claim drafts.
- **`has_physical_original`:** set on scans by default, and editable on `receipt`.

### Reliefs (§14)
- **An optional `relief_code`** on transactions, and as a rule facet, set only by the person. Code
  refuses it from Sen (B28).
- **LHDN's public reliefs and caps for the current year,** committed as data, since public data can
  be.
- **Yearly totals per code against its cap.** The part an employer reimbursed (B25's repayments) is
  not relievable.
- ***The year*** in Insights shows them. The payslip's statutory lines (EPF, SOCSO, EIS, PCB) join
  in B35.

## Done when

1. A pack built from made-up claims and receipts matches D97's layout: rendered to images in a test,
   with screenshots in the PR. *Page N of M* is right across schemes.
2. It builds in airplane mode in the shell.
3. Relief totals pass tests, including a reimbursed bill excluded, and the cap.

## On your phone

- [ ] Download this month's claim pack in airplane mode, and print it. Does a thermal slip fit its
      paste area?
