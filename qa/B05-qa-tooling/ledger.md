# B05 · QA tooling: ledger

## Found by the new tools while they were built (16 Oct)

Each was found by a tool this slice adds, on its first run, before any QA run: the point of D139.

| # | Found by | What a person or the data would suffer | Fix | Evidence |
|---|---|---|---|---|
| T1 | The route sweep | An oversized body's 413 went out without `Cache-Control: no-store`: the body limit sat before the header middleware | `bodyLimit` after it (`app.ts`); bodies over 256 KB refused for every route | `sweep.test.ts`, every write route's *refuses bad bodies* |
| T2 | Lived-in, 200% text | At Android's largest font size, More's and Insights' rows drew their value over the title, and Review's suggestion bar drew *Apply all* over its words | The rows and the bar wrap at large text: `NavRow` (`group.tsx`), More's `LinkRow`, Review's bar | `lived.spec.ts` *at 200% text*, all six pass; screenshots checked at 200% |
| T3 | Lived-in, ended session (server) | A session that ended elsewhere sent the person to sign-in with no word of why | Sign-in says *You were signed out. Sign in again to carry on.* | `server.spec.ts` *a session that ends while Sen is open* |
| T4 | Breakage check `for-update-resource` survived | Dropping the resource PUT's row lock went unnoticed: no test sent identical upserts together. Concurrent creates could also log twice, the lock having no row yet to hold | The sweep sends three identical upserts at once, creating and updating; the PUT creates with `ON CONFLICT DO NOTHING` first | The mutant is killed (13 of 13); the test fails with the lock dropped |
| T5 | The API's `Server-Timing` | Pool queries made through pg's callback form weren't counted at first, so Better Auth's routes reported 0 queries | `timing.ts` wraps callback calls too | `/api/me` reports 6 round trips, `/api/settings` 10 |

## Retro

To be completed before the PR (`qa` skill, *The retro*).
