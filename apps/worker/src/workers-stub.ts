// Node has no `cloudflare:workers`. The Worker's tests (vitest.config.ts) load this in its place. Like
// Cloudflare's own, the base class keeps its state and bindings, so a test can drive a Durable Object
// with a stand-in storage.
export class DurableObject<E = unknown> {
  constructor(
    protected ctx: DurableObjectState,
    protected env: E,
  ) {}
}
