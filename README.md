# Sen

*Every sen counted.* A personal finance tracker made in Malaysia, for its owner and, by invitation,
a few friends and family.

- **Payment notifications** from the bank and e-wallet apps you choose become transactions on your
  phone, with no bank logins.
- **Receipts,** scanned or forwarded by email, say what the money bought.
- **Balances,** and the gap between them and what was captured.
- **Sen, an AI money secretary,** that never states a figure its tools didn't compute.

It's an Android app, a Capacitor shell around a web app (React, Vite, shadcn/ui), with a Hono API on
Vercel, Neon Postgres and Gemini through Vertex AI. Money is integer sen, never a float, and every
table has row-level security from its first migration.

## Status

The design is done, and the build starts now, one slice at a time:
- the spec: `spec_v2.md`
- the decisions: `docs/decisions.md`
- the journeys and screens: `docs/flows.md`, `docs/screens.md` and `docs/ui/patterns.md`
- the slice map: `docs/modules.md`, with a brief per slice in `docs/briefs/`

It's built by Claude Code cloud sessions; `CLAUDE.md` is their guide.

## Licence

GNU Affero General Public License v3.0 (`LICENSE`). Anyone who runs a changed Sen for others must
publish their changes. Parts copied from others keep their own licences (`THIRD_PARTY_NOTICES.md`).

Sen isn't a hosted product, and nobody is supported to host it. It never requests or moves money.
