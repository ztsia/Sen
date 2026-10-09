# B02 capture path: acceptance criteria (scoped QA, independent run "compare-sonnet")

Area: what happens to a notification between the listener and storage, and how it shows on
*Captured on this phone* and in the dev simulator. Written from `spec_v2.md` §6.2, §6.5, §9.5, §17,
`docs/decisions.md` D86, D115, D116, D119, `docs/screens.md`, `docs/ui/patterns.md` and the B02 brief,
BEFORE any implementation or earlier QA record was read. All notification text is made up.

Vocabulary: "chosen app" = a package in the person's chosen list. "Stored" = a row in the outbox
(the phone's SQLite) and so on *Captured on this phone*.

## A. The chosen-apps check (first, D86)

AC-1  Unchosen app is dropped, not stored
      Given a chosen list of one app (`com.example.bank`) and a payment-looking notification from `com.example.other`
      When the listener receives it
      Then the outbox row count is unchanged and nothing in the page or the dev simulator log names `com.example.other`
      Spec §6.2 ("never stored or logged"), D86

AC-2  Sad twin: unchosen app leaves no trace anywhere
      Given an unchosen app posts an OTP-looking and a payment-looking notification, 3 times each
      When the drop log (the local record of drops) is read
      Then it holds no entry for that package (the drop log is only for drops from chosen apps), no counter, no text
      Spec §6.2 "No record of which other apps post notifications is kept"

AC-3  An empty chosen list stores nothing
      Given no chosen app, When any notification arrives, Then 0 rows
      Spec §6.2, D86

AC-4  The classifier refuses unchoosable apps
      Given the default SMS app, a `CATEGORY_SOCIAL` app and denylisted packages (WhatsApp, Telegram, Gmail, Messenger)
      When the picker's classifier is asked
      Then each is "can't be chosen"; a bank is choosable. Sad twin: a stored list that contains a refused app is not honoured by the listener
      Spec §6.2, D86, brief "Done when" 5

## B. Other drops

AC-5  Group-summary notifications are dropped
      Given a chosen app posts a group summary, Then 0 rows. Sad twin: the child notification in the same group is stored. Spec §6.2

AC-6  Ongoing notifications (a ride in progress) are dropped; a normal one from the same app is stored. Spec D115

AC-7  Channel drop list starts empty
      Given a fresh install, Then no channel is dropped; a payment on any channel is stored. Spec §6.2 (channel rules from B10), brief

AC-8  Conversation notifications are refused in the manifest, not in JS. Spec §6.2

## C. The OTP/TAC filter (English and Malay)

AC-9  A clear OTP is dropped
      Given a chosen app posts `Your OTP is 482913. Do not share it.` (made up)
      Then 0 rows and one drop-log entry: time + app, no text. Spec §6.2, D115

AC-10 Malay variants are dropped: `Kod TAC anda ialah 731942`, `Kod pengesahan: 5521 88`, `Jangan kongsi kod ini`. Spec §6.2

AC-11 Sad twin: a payment with advice footer and a store number is KEPT
      Given `RM12.90 paid at ZUS COFFEE #4471 using your Main Account. Never share your TAC with anyone.`
      Then it is stored (advice is not evidence), with `4471` masked. Spec §6.2 "A keyword that appears only in advice doesn't make the rest an OTP"

AC-12 A reference's own code is never a code: `Transfer settled. Reference no: 20260912345678` is kept (masked per AC-18). Spec §6.2

AC-13 Amounts, dates, times and phone numbers are not codes: `You've sent RM1,234.50 on 09-10-2026, 9:47 PM to 0123456789` is kept with no drop-log entry. Spec §6.2

AC-14 A code in any Unicode digit set or split by spaces/dashes/dots/zero-width characters is still found
      Given `Your TAC is 4 8 2 9 1 3` / `4-8-2-9-1-3` / fullwidth digits / `48​2913`
      Then dropped (strong keyword + code). Spec §6.2 "Digits are read as the filter reads them"

AC-15 In doubt it drops: a strong keyword + any 4-8 digit code anywhere in the rest of the message drops, even in a payment-looking one. Spec §6.2

AC-16 Title is weighed apart from text: an OTP word only in the title with a code in the text. Spec §6.2 ("the title apart from the text")

AC-17 Drop log: once per notification, time + app, never its text. Re-posting the identical OTP notification (same key/when) does not add a second entry. Sad twin: the log's serialised form contains none of the notification's words or digits. Spec §6.2, D115

## D. Masking what is kept (D116, D119)

AC-18 Every kept notification has each run of four or more digits outside amounts masked as `•`
      Given `Card ending 5678 used for RM25.00 at SHOP, ref 998877` Then stored text is `Card ending •••• used for RM25.00 at SHOP, ref ••••••` (each digit becomes one `•`; the amount untouched). Spec §6.2, D119

AC-19 Amounts are left: a decimal amount (`12.90`, `1,234.50`) and the number after a currency (`RM 1500`, `MYR2000`) are not masked, so money is never altered. Sad twin: a 4+ digit number that is not an amount and not after a currency is masked. Spec §6.2

AC-20 Masked with Unicode digits, spaces, dashes, dots, brackets, invisible characters: `(1234) 5678`, `1 2 3 4`, `1-2-3-4`, fullwidth, Arabic-Indic digits, `12​34`. No digit of such a run survives in the stored title, text or expanded text. Runs of 1-3 digits stay. Spec §6.2

AC-21 Masking applies to the title, the text and the expanded text each. Spec §6.2

AC-22 `maybe_otp` flag is set exactly when an OTP word is present (advice included) and the notification was kept. Not set for plain payments. Spec §6.2

AC-23 The dedupe key is taken from the masked text: two notifications differing only in a masked code produce the same key, and the stored key does not contain a hash of the unmasked digits. Spec §6.2 ("so a code never reaches storage, even as a hash")

AC-24 A notification the filter can't read is kept masked and marked; one that can't be read at all is dropped and logged by time and app as "unread". Spec §6.2

AC-25 Everything else in the text is stored unchanged: case, whitespace, emoji, apostrophes, newlines. Spec §6.2 "Raw text is never changed, except its long numbers masked"

AC-26 The unmasked digits never reach JavaScript: the bridge payload and the page's DOM never contain the original run. Spec §6.2, CLAUDE.md non-negotiable

## E. Dedupe (§6.2, §6.5, D115)

AC-27 The same notification posted twice (same key, `when`, text) is one row.
AC-28 Sad twin: two genuine identical payments with different `when` are two rows.
AC-29 A replay when the listener reconnects (notifications still showing, unchanged) adds 0 rows.
AC-30 Same text, different notification key -> two rows; same key and `when`, text differs by one character -> two rows.
AC-31 The key is length-prefixed per field: (title `ab`, text `c`) and (title `a`, text `bc`) give two distinct keys. Package is part of the key: same everything from two chosen apps -> two rows.
AC-32 UNIQUE on the key is enforced by the store itself, not only by a pre-check.
      Spec §6.5; CLAUDE.md "Every input has a dedupe key"

## F. Stored fields

AC-33 A stored row holds package, channel, key, postTime, `when`, title, text, expanded text, `maybe_otp`. Missing optional fields (no title) do not crash. Spec §6.2

AC-34 Hostile/very long text (100 kB, SQL metacharacters `'; DROP TABLE`, NUL, lone surrogates) is stored (masked) or dropped cleanly, never crashes the service. Spec §17 spirit

AC-35 Nothing about notification text is logged to the system log by native code. Brief Notes

## G. Captured on this phone (UI contract, patterns.md "Raw notification row")

AC-36 Newest first by arrival.
AC-37 Each row: app and time on one line; then title and text exactly as stored; selectable text.
AC-38 A `maybe_otp` row shows the muted line "Maybe a one-time code, so its numbers are hidden"; a plain payment row doesn't.
AC-39 Masked digits appear as `•` on screen; no original digit run of a masked notification is anywhere in the DOM, and none in the shared text.
AC-40 *Share samples*: checkbox leads each row, tapping the row ticks it; the shared text holds only ticked rows' stored (masked) text, with app and time. None ticked -> nothing is shared, no crash.
AC-41 Empty / loading / error states follow `patterns.md`.
AC-42 The heartbeat: listener connected, last event time; a dropped notification does not count as a captured event.
AC-43 Sad twin: the screen opened with the bridge missing (plain browser, no simulator) shows a sensible state, not a stack trace.

## H. The simulator (dev panel)

AC-44 The simulator drives the same logic as the listener (same filter, mask, dedupe), not a parallel reimplementation that can diverge: AC-9, AC-11, AC-18 inputs give the same result.
AC-45 The simulator exists only in preview/dev builds: a production build has no dev panel and no simulator hook.
AC-46 Simulator state survives a page reload (the outbox is the store).
AC-47 The simulator cannot insert with an unchosen package, nor bypass the filter. Spec "Native code never trusts the page".

## I. Non-negotiables touched

AC-48 Money: no float in any amount path in the diff; masking leaves amounts byte-identical.
AC-49 Secrets: the built bundle contains no key/token.
AC-50 Real data: no real notification text in fixtures; `pnpm hygiene` passes.
AC-51 Timezone: times on *Captured on this phone* show in Asia/Kuala_Lumpur whatever the browser timezone.
AC-52 Offline: with the network off, simulated capture still stores, survives a reload, and shows.
