# B34 · The ESS engine and filing

**Stage 8 · ESS on the phone** · after: B33 · next: B35

## Goal

The ESS adapter runs on the phone:
- a public engine that replays a person's **recipe**, which is data in their own rows and never code
- signing in with a password saved only on the phone
- filing the month's reviewed claims with one tap, keeping ESS's reference and a screenshot as
  evidence

Sessions build and test it **only against a made-up ESS**. The owner's real recipe is imported on
the phone.

**Before this slice starts:** §21 Q29 must be answered by the laptop capture (D110), at least sign-in,
session length, uploads, and whether a draft can be saved or a claim withdrawn. If it isn't, record
the blocker in the handoff and start B37 instead.

## Read first

- `spec_v2.md`:
  - §13.1, all of it
  - §13: *The submission kit*, and the claim record
  - §9.1: *ESS filing*
  - §15: `ess_recipes` and `claims.ess_ref`
  - §17: *Secrets* (the ESS password)
  - §21: Q29
- Decisions: D46, D96, D103, D105, D106 (import only here), D110.
- `docs/cloud.md` §3: a session never holds any ESS password, cookie, token, real address or recipe.
- `docs/screens.md`: `claims` (*Send to ESS*), and Settings → *Claims* → *ESS*.
- `docs/local.md`: *ESS, when P7 starts*.

## Builds

### Recipes (D105)
- **`ess_recipes`:**
  - `base_url` and `capabilities`
  - `steps`, each `http` or `page`, with slots such as `{claim.amount}` and never values
  - `field_map` and `payslip_map`
  - status `draft` or `active`, and `confirmed_at`
- **One schema shared by zod and Kotlin.** A recipe never contains values.
- ***Import recipe*:** a file is validated, then stored in that person's data. The owner's first
  comes from the laptop.

### The engine (Kotlin)
- **`http` steps** are replayed with OkHttp, using the signed-in session's cookie jar. Slots are filled
  from the claim or from an earlier response (a token, an id), chained.
- **`page` steps run in the sealed browser:**
  - a native screen in its own process, with `WebView.setDataDirectorySuffix`
  - `evaluateJavascript` fills and clicks by label, with a fallback selector
  - no bridge
  - files are handed over through `onShowFileChooser`
- **The cookie jar** is shared between the sealed browser and the `http` steps.
- **It stops and asks whenever anything isn't as expected:** a missing field, a changed page, an
  amount that doesn't match the draft, or a failed sign-in.

### Signing in (D103)
- **Settings → *Claims* → *ESS*** is a native screen: username and password, typed once.
  - They're encrypted with a non-exportable Android Keystore key that needs no fingerprint.
  - They never cross the bridge, never sync, and are left out of Android's backups.
  - *Forget ESS password* deletes them. A reinstall asks again.
- **A second step, or two failed sign-ins:** a push asks the owner to sign in in the sealed browser,
  where Google Password Manager fills it.

### Filing
- ***Send to ESS*** on `claims`, after the owner has reviewed the claims. It submits only claims
  whose evidence is complete and whose amounts code computed.
- **It fills, attaches and submits,** keeping ESS's reference (`ess_ref`) and a screenshot of the
  confirmation as evidence.
- **The first replay of a new or changed recipe** shows what it will send before it sends.
- **The island's *ESS filing*:** *Sending July claims · 2 of 3*, then the reference.
- **The adapter can be switched off.** The kit and the pack still work (B25, B26).

### The made-up ESS (in the repo)
- **A small fake server** with:
  - a cookie session and a CSRF token
  - a claim form with file upload
  - a payslip endpoint and page, shaped like Q29's answers (JSON or PDF, whichever is true)
  - an SSO-like sign-in page, for a `page` step
- **A made-up recipe for it.** Neither names any employer.

## Done when

1. On GitHub Actions' emulator, the engine files made-up claims end to end against the fake ESS, using
   mixed `http` and `page` steps, and keeps the reference and screenshot.
2. It stops on each planted fault: a changed label, an amount mismatch, an expired session.
3. The Keystore credentials never reach JavaScript (test). The backup rules exclude them.
4. **On the Xiaomi:** the owner imports their recipe, signs in once, and files a real claim. Test it
   first with a safe action, such as saving a draft or withdrawing a claim, if Q29 found one.

## On your phone

- [ ] Import the recipe from your laptop. Sign in once in Settings → *Claims* → *ESS*.
- [ ] Do the safe test first, then *Send to ESS* for a real month.

## Needs from you first

- Q29's answers, from the laptop capture (`docs/local.md`).
- Your recipe file, kept on the laptop and imported on the phone. **Never in a session.**
