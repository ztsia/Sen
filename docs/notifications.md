# Bank notifications

What TNG eWallet, Ryt Bank, Public Bank and Grab post when money moves. It's worked out from samples the
owner pasted into a cloud session (P0, `spec_v2.md` §19), and the parsers (§6.2) are built from it.

**Every example here is anonymised.** Names, amounts, dates and times are changed. The wording,
punctuation, spacing and capitals around them are copied exactly, because that's what a parser
matches. The raw samples stay in the chat and never enter the repo (D11).

`TAN WEI MING` stands in for the owner's own name throughout.

The templates below are the source of the app's built-in templates (`spec_v2.md` §6.2, D15), and
they use the same blanks. Names are printed in capitals.

When a new sample shows a format that isn't here, add it and update the status table.

## Status

✅ sampled · ❓ not sampled yet · — doesn't apply

| Event | TNG eWallet | Ryt Bank | Public Bank | Grab |
|---|---|---|---|---|
| Transfer out | ✅ | ✅ | ❓ none seen (§5) | — |
| Transfer in | ✅ | ✅ | ✅ | — |
| GO+ cash in | ✅ | — | — | — |
| GO+ cash out | ❓ | — | — | — |
| Card payment (Google Pay or the physical card) | — | ✅ Google Pay | ❓ | — |
| Card hold at a petrol pump, then the final amount | — | ✅ | ❓ | — |
| Toll charged to the eWallet | ❓ | — | — | — |
| TNG card reload | ❓ | — | — | — |
| ATM withdrawal | — | ❓ | ❓ | — |
| DuitNow QR payment | ❓ | ❓ | ❓ | — |
| GrabFood group order: hold, then charge | — | — | — | ✅ |
| Grab ride | — | — | — | ❓ |
| GrabPay top-up | ❓ | ❓ | ❓ | ❓ |
| Salary credit | — | — | ❓ | — |
| Interest or returns | ❓ GO+ | ❓ | — | — |
| Refund | ❓ | ❓ | ❓ | ❓ |
| Promo | ❓ | ❓ | ❓ | ❓ |
| OTP or TAC | ❓ | ❓ | ❓ | ❓ |

Sampled so far: transfers between the owner's own accounts in the three bank apps, a cash-in to GO+,
and a GrabFood group order (5 Oct 2026). The screenshots came from Android's notification history, which shows the title and
text but not necessarily every field the listener receives. P1 confirms which field holds what.

## 1. Ryt Bank

App label `Ryt Bank`. Package `my.rytbank.app` (checked on Play, 9 Oct; the soak confirms it on the phone).

| Event | Title | Text |
|---|---|---|
| Transfer out | `Nice! Transfer settled!` | `You've sent RM{amount} to {name} on {date}, {time} (GMT+8) using your {account}.` |
| Transfer in | `Your money is in!` | `You've received RM{amount} from {name} on {date}, {time} (GMT+8).` |
| Card payment | `Card payment completed 👍` | `RM{amount} paid at {merchant} using your {account}.` |
| Card hold (seen at a petrol pump) | `Card payment on hold ⏳` | `RM{amount} is on hold with {merchant} from your {account}.` |

```text
Nice! Transfer settled!
You've sent RM42.50 to TAN WEI MING on 12/9/2026, 9:47 PM (GMT+8) using your Main Account.

Your money is in!
You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).

Card payment on hold ⏳
RM150.00 is on hold with Petron from your Main Account.

Card payment completed 👍
RM38.15 paid at Petron using your Main Account.
```

- **`{amount}`:** `RM` straight before the number, with two decimals. How amounts of RM1,000 or more
  are written hasn't been seen yet.
- **`{date}`:** day/month/year with no zero padding. `5/10/2026` is 5 October.
- **`{time}`:** 12-hour clock with `AM` or `PM`, to the minute. `(GMT+8)` is literal.
- **`{account}`:** the paying account's name in the app, such as `Main Account`. It only appears on
  money out.
- No balance and no reference number.
- **Card payments** carry no date or time in the text, so use the post time. `{merchant}` is the name
  the card network prints, in mixed case, not capitals. The titles end in an emoji, which is part
  of the template.
- **At a petrol pump**, the hold came first and the final amount about a minute later, both from
  Ryt. The hold is an `ignore` template; the completed payment is the spending (`spec_v2.md` §6.3).
- **Google Wallet** also posts a notification for every Google Pay payment: the merchant as the title,
  and `MYR{amount} with Ryt Card ••{last four digits}`. It may be chosen in the app list (D86): a
  `same_payment` pair rule then merges it with Ryt's notification, so it can't double-count (D88).

Ryt also **emails** every transfer and card payment, and Gmail posts a notification for each email: the same text,
with an extra `Hi {name},` line. Gmail isn't on the allowlist, so those are dropped, and that's what
stops each transfer being counted twice. Keep Gmail off the allowlist.

## 2. TNG eWallet

App label `TNG eWallet`. Package `my.com.tngdigital.ewallet` (checked on Play, 9 Oct).

| Event | Title | Text |
|---|---|---|
| DuitNow transfer out | `DuitNow Transfer is successful!` | `You have successfully transferred RM {amount} to {name}.` |
| Money in | `You’ve received money!` | `{name} has transferred RM {amount} to you. Tap here to check the transaction details.` |
| GO+ cash in | `Cash In Successful` | `You have successfully cashed in RM{amount} into your GO+ account.` |

```text
DuitNow Transfer is successful!
You have successfully transferred RM 18.00 to LIM KAH HOE.

You’ve received money!
TAN WEI MING has transferred RM 18.00 to you. Tap here to check the transaction details.

Cash In Successful
You have successfully cashed in RM25.00 into your GO+ account.
```

- ⚠️ **The space after `RM` varies within this one app.** Transfers write `RM 18.00`, and the GO+
  cash-in writes `RM25.00`.
- No time in the text, so use the notification's post time.
- No balance and no reference number.
- **GO+ is a separate pot inside the same app**, so one package feeds two accounts. The text names
  GO+ whenever it's involved. It doesn't say where a cash-in draws from. In the sample it came
  straight after a top-up from Ryt, which suggests the eWallet balance.

## 3. Public Bank

App label `MyPB`. Package `com.pbb.mypb` (checked on Play, 9 Oct).

| Event | Title | Text |
|---|---|---|
| DuitNow transfer in | `Money Received` | `PBB. You have received a DuitNow Transfer of RM{amount} from {name}.` |

```text
Money Received
PBB. You have received a DuitNow Transfer of RM150.00 from TAN WEI MING.
```

- `PBB.` (Public Bank Berhad) starts the text.
- No time, account or balance. If the owner ever holds two Public Bank accounts, the text can't say
  which one received the money.

## 4. Grab

App label `Grab`. Package `com.grabtaxi.passenger` (checked on Play, 9 Oct). A GrabFood group order produced this sequence, top to
bottom. In a group order each member pays their own part, charged to their own GrabPay Wallet.

| When | Title | Text | What it is |
|---|---|---|---|
| Order placed | `RM{amount} is currently on hold` | `You'll only be charged the final amount once the service is complete. Any unused amount will be returned to your payment method.` | A hold. Ignore it: the final charge always notifies |
| Order placed | `GrabFood – Group Order` | `Group order placed! Your food is on the way.` | Status; ignore |
| Delivered | `{name}’s group order has arrived` | `Enjoy your food from {merchant}!` | Context: names the restaurant |
| Delivered | `Collected your food?` | `Let the host know, so they can ensure everyone gets exactly what they ordered.` | Status; ignore |
| Delivered | *(none)* | `Your GrabPay Wallet has been charged MYR {amount} for booking {reference}.` | **The charge** |
| Delivered | `You just earned {any} GrabCoins from {service}` | `Check out our catalogue to use your GrabCoins!` | Loyalty, but names the service |

```text
RM12.40 is currently on hold
You'll only be charged the final amount once the service is complete. Any unused amount will be returned to your payment method.

Tan Mei Ling’s group order has arrived
Enjoy your food from Nasi Lemak Corner 椰浆饭 - Bangsar [Non-Halal]!

Your GrabPay Wallet has been charged MYR 12.40 for booking 00129876543-K4XQ2PLM7RTWA-G-1.

You just earned 6 GrabCoins from GrabFood
Check out our catalogue to use your GrabCoins!
```

- ⚠️ **A third amount format:** `MYR 12.40`, a currency code and a space. The hold writes `RM12.40`.
- **The charge names no merchant.** The restaurant comes from *has arrived* and the service from the
  GrabCoins notification, both posted in the same minute as the charge. The charge came about 70
  minutes after the hold, when the food arrived.
- **The money comes out of the GrabPay Wallet**, so GrabPay is a pot of money in its own right
  (`spec_v2.md` §7).
- **In a group order the charge is the owner's own part**, so there's nothing to split.
- **Grab prints names as people registered them**, in title case, not in capitals like the banks. The
  host is a colleague, so that title carries a third party's name: it stays in the raw text and
  never enters the repo.
- The `{merchant}` here mixes English, Chinese and an area, such as `Nasi Lemak Corner 椰浆饭 - Bangsar [Non-Halal]`.
- The booking reference ends `-G-1` on this group order. Whether rides use another shape is unknown.
- Grab also emails an e-receipt with the total and pick-up time. Gmail is off the allowlist, so it's
  dropped.

## 5. What the samples settle

1. **Every transfer between the owner's own accounts names the owner on both sides**, as the banks
   print it. A transfer can be recognised by that name rather than by guessing from amount and time.
2. **The two sides of a transfer arrived within the same minute** in every pair sampled.
3. **No notification shows a balance.** Unless card payments turn out to carry one, balance checks
   are typed in by hand (`spec_v2.md` §7).
4. **Public Bank posted nothing when money left it.** In the sampled round trip, money moved from
   Public Bank to Ryt, and only Ryt's *Your money is in!* appeared. Until a sample shows otherwise,
   assume MyPB doesn't notify outgoing transfers. A transfer out of Public Bank is then seen only
   from the receiving side.
5. **Only Ryt gives the time of the transaction.** TNG and MyPB rely on the post time, which is
   close enough: every pair arrived within a minute.
6. **Grab notifies both a hold and the final charge**, so its holds can simply be ignored. So does
   Ryt for a card hold at a petrol pump: the final amount arrived about a minute after the hold.
7. **A charge can need its neighbours.** Grab's charge has no merchant, but a status notification
   from the same app in the same minute names the restaurant and the service.

## 6. Parsing notes

- **Normalise apostrophes before matching.** As rendered, TNG's title uses a curly `’` while Ryt's
  text uses a straight `'`. P1's raw text confirms the exact characters.
- **Match `RM` or `MYR`, then an optional space**, then the amount, and parse it as text into sen
  (`CLAUDE.md`, non-negotiables).
- **Capture names as everything between the fixed words**, not as letters and spaces. Malaysian
  names can contain `/` (`A/L`, `A/P`), `@`, `'`, `.` and `-`. Not yet seen in a sample.
- **Keep each template's fixed words exact.** A bank rewording a template has to fail the match and
  land in *Needs attention* as `unparsed`, rather than half-parse (`spec_v2.md` §6.2).
