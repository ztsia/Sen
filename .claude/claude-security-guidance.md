# Project security rules

- Every API route reads the session on the server before anything else. A handler that loads or
  changes a row by an id from the request relies on the table's row-level security, run as
  `app_user` with `app.user_id` set for the transaction (`docs/workflow/database.md`). Loading by id
  as the owner role is an IDOR.
- Request bodies are parsed with a strict zod schema (`packages/core`) before use. Spreading a
  request body into a database insert or update is mass assignment.
- The database owner URL, R2 keys, the model keys, the Firebase service account, the scheduler's
  secret and the relay's signing key are used only in `apps/api` or `apps/worker`, after the caller
  is authorised. Any of them in `apps/web`, or in a `VITE_` variable, is a leaked secret. No cloud
  session holds a production one (`docs/cloud.md` §3).
- Money is integer sen. A float, or an amount the client sends that the server trusts for a total, is
  a finding.
- A webhook or scheduler call verifies its secret or signature before parsing, and is idempotent.
- Text from a model is untrusted input: validated before it is stored, shown as HTML, used in a query
  or a path, or used to choose an action. A model never decides whether a person may do something;
  code does. No number a model produces is stored or shown as fact.
- Redirect targets from a request are relative paths or an allowlisted origin. The shell loads only
  Sen's own site, and its bridge answers no other origin.
- Real financial data, claim values and the employee handbook never appear in fixtures, seeds, tests,
  logs or screenshots.
