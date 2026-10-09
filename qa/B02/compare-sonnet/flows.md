# B02 capture path: flows (scoped QA, "compare-sonnet")

Written from docs before reading the implementation. Entry for all: the web app at a phone viewport (412x915),
dev panel (simulator), Settings -> Capture -> *Captured on this phone*. All text made up.

FLOW-1  A payment from a chosen app is captured (happy)
  Actor  owner   Entry  dev panel: simulate "Card payment completed" / "RM12.90 paid at FAKE COFFEE using your Main Account."
  Steps  1. open Captured on this phone: empty state  2. simulate  3. the row appears at top with app, time, title and text as sent
  Ends   exactly one outbox row; amount text byte-identical; no maybe-OTP line
  Covers AC-18, 19, 25, 36, 37, 38

FLOW-2  An unchosen app posts (sad)
  Entry  dev panel: simulate from a package not chosen / a denylisted one
  Ends   0 rows, list unchanged; no log entry for it
  Covers AC-1, 2, 3, 47

FLOW-3  A clear OTP (sad)
  Steps  simulate English OTP, Malay TAC, spaced/dashed/fullwidth variants
  Ends   0 rows each; one drop-log entry each with time+app only
  Covers AC-9, 10, 14, 15, 17

FLOW-4  Payment with advice footer and store number (happy, tricky)
  Ends   stored, `#4471` masked, maybe-OTP line shown
  Covers AC-11, 12, 13, 22, 38

FLOW-5  Masking edge cases
  Steps  card ending 5678; ref numbers; amounts "RM 1,234.50", "RM1500"; fullwidth, Arabic-Indic digits; zero-width split
  Ends   every 4+ digit run outside amounts is bullets; amounts intact
  Covers AC-18..21, 39

FLOW-6  Same notification twice; two genuine identical payments
  Steps  post identical (same key/when) twice; then identical text with different `when`
  Ends   1 row, then 2 rows
  Covers AC-27, 28, 29, 30, 31

FLOW-7  Two notifications differing only in a masked code
  Ends   same masked text, same dedupe key
  Covers AC-23

FLOW-8  Share samples
  Steps  select 2 rows via row tap; share; check shared text; select none
  Ends   shared text has only the ticked rows' masked text; no unmasked digits
  Covers AC-39, 40

FLOW-9  Offline capture, reload, back online (offline)
  Ends   rows persisted, no duplicates after reconnect
  Covers AC-52, AC-46

FLOW-10 Timezone: browser in America/New_York; 23:30 KL last-day-of-month notification
  Ends   shown with KL date/time
  Covers AC-51

FLOW-11 Production build has no simulator (sad)
  Covers AC-45

FLOW-12 Bridge missing / empty / error states
  Covers AC-41, 43

FLOW-13 Kotlin core tests + probes: run the pure core's tests; break the filter/mask/dedupe on purpose
  Covers AC-9..32 (native logic)

Core journeys from docs/flows.md: the docs mark none as core (the owner's open question). At B02 the
other screens are skeleton on made-up data; the capture path's own journey is FLOW-1, walked here.
