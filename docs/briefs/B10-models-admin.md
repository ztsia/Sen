# B10 · Models in admin

**Stage 3 · Capture to ledger** · after: B10 · next: B11

## Goal

The owner chooses every job's model from the phone, and nothing else has to ship.
- A change takes effect on the next call: no release, and no change to Vercel's environment (D153).
- *Test* runs the job's golden set on a candidate and shows its score, cost and speed beside the
  current model's. The owner may switch whatever the score, and one tap reverts.
- Nobody but the admin can read or write a setting, and the admin can never point a model call at an
  address of their own choosing.

## Read first

- `spec_v2.md`:
  - §12.6: *Models*, all of it
  - §9.6: the *Models, lessons and gaps* bullet, and the AI credit bullets (the rate card is these
    prices)
  - §15: `model_settings`, and the *Key decisions* bullet on the two app-wide settings
  - §16: the `/admin/models` rows (only the models routes; lessons and gaps are not here)
  - §21: Q31
- Decisions: D34, D52, D55, D94, D98, D107, D120, D127, D153.
- `docs/screens.md`: the Settings table's *Models* row (`settings/models`).
- `docs/cloud.md` §3 (what a cloud session must never hold), `docs/workflow/database.md`, and
  `docs/modules.md`, *Three design pages* (D154): the *Models* page is drawn and approved before this
  slice starts. Build to it; don't design as you build.

## Builds

### The table and who may touch it
- **`model_settings`** (§15): append-only. The newest row per job is live, and the rows are the log:
  who, when, and what it replaced (`replaces_id`).
- **Owned by the admin, like any table.** Each row has the admin's `user_id` and RLS from its first
  migration, so no other person's request can read or write it.
- **One narrow `SECURITY DEFINER` function** returns the live row for a job: settings and nothing
  else. Every request reads a job's model through it.
- **Only the admin's functions write,** and each checks the admin flag. A change, a *Use it* and a
  revert are each a new row.

### The resolver
- **One resolver every model call goes through:** the live row for its job, else `ai/models.ts`'
  default. `ai/models.ts` holds only the defaults, the list of jobs and the list of providers.
- **B10's drafting call moves onto it.** A later slice's job is one more entry in the list of jobs,
  and *Models* shows a job only once it exists in code.
- **A row holds** the provider, model, effort, a fallback model for a turn the first refuses or fails,
  and the price per million tokens (input, cached input, output) as integers, which AI credit charges
  by (D98). A known model's price is filled in; a new one's is typed.
- **Effort is one scale** that code maps to each provider's own setting, offering only the levels
  that model has.

### Providers
- **A fixed list in code:** Anthropic, Google (Vertex) and OpenAI. A provider is offered only when its
  key is in Vercel's environment, set once, and its data terms pass D34's bar (a paid API, no
  training on the data, zero retention). OpenAI stays off until Q31 is answered.
- **No provider address is ever typed in admin.** An address the admin could type could send every
  member's money data to any server, which the admin must never be able to do (D52). A fourth provider
  is a code change on purpose.
- **The model comes from the provider's own list, or is typed,** so a new generation can be chosen
  the day it's out. The researcher changes only within Google. Members have no model picker.

### *Test*, and `settings/models`
- **`POST /admin/models/:job/test`:** the job's golden set (`evals/`) run on the candidate by the job
  runner, in batches, scored by code. Its score, cost and speed are saved on the row (`test`) and shown
  beside the current model's.
- **`GET /admin/models`, `PUT /admin/models/:job` and `POST /admin/models/:job/revert`:** *Use it*
  writes a new row; *Revert* writes one that restores the last.
- **The screen** is built to its approved page, with every state: each job's provider, model, effort,
  fallback and price; *Test*; *Use it*; *Revert*; and the log of changes. The skills' lessons and the
  shapes of unanswered questions come with B33, not here.

## Done when

1. Tests, on two people under RLS:
   - a member can't read or write `model_settings`, and the function returns settings only
   - only the admin's functions write, and each change is a new row
   - the resolver returns the live row, else the default; a revert restores the last row
   - a provider outside the list, or one without its key, is refused; no field takes an address
   - prices are integers; effort maps to a level the model has
2. The drafting call uses the resolver, and a changed setting reaches its next call.
3. **Owner's check:** the owner changes the drafting model from the phone with no release, a test
   shows both models side by side, and a revert restores the last one.
4. `settings/models` in all six looks, every state, matching the approved page.

## On your phone

- [ ] Open Settings → *Models* as the owner. Pick a candidate for drafting, tap *Test*, and read its
  score, cost and speed beside the current model's.
- [ ] Tap *Use it*, then *Revert*. Check the log shows both.
- [ ] Sign in as a member: *Models* isn't there.

## Needs from you first

- The approved design page for admin's *Models*.
- A key for each provider you want to test, set once in Vercel's environment. No cloud session holds
  one (`docs/cloud.md` §3), so *Test* against a real provider is your step, on your phone. Tests in a
  cloud session use a fake provider.
