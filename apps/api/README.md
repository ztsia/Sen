# The API

One Hono app at `/api` on the web app's own origin (`spec_v2.md` §5, §16), bundled by esbuild into
one Node function in Vercel's Build Output (`apps/web/scripts/vercel-output.mjs`). Built from B05.

- `src/app.ts`: the pipeline. Better Auth at `/api/auth/*` (as `sen_auth`); every other route needs
  a session, then runs as its person under RLS (`src/db.ts`, as `app_user`).
- `src/auth.ts`: Better Auth, a 6-digit code by email (D13), sign-up off, rate limits in the database.
  Production sends from Sen's Gmail (`src/mail.ts`); previews and local runs send nothing and their
  code is always `123456`.
- `src/routes.ts`: `/me`, `/settings`, `/commands`, and `/admin/*` for the admin only.
- `src/resource.ts`: the generic resource routes later slices mount per table.
- `src/audit.ts`: the audit log's one writer.
- Errors are `{ code, message, field? }` (`src/errors.ts`); every input is checked with zod.

Locally: `pnpm --filter @sen/api dev` (port 8787, on `sen_dev`), and `SEN_BACKEND=api pnpm dev` for
the web app against it. Its tests run in `pnpm test:db`.
