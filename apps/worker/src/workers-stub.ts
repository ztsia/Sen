// Node has no `cloudflare:workers`. The Worker's tests (vitest.config.ts) load this in its place: they
// run the routes against stand-in Durable Objects, so the base class is never constructed.
export class DurableObject {}
