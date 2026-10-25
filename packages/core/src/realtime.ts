/**
 * Realtime hints (D100, B06): the API tells the relay *what changed*, never the data, and open screens
 * reload those queries through the API. Shared by the API, the Worker and the web app.
 */

/**
 * Every topic a hint can name, in one place. A screen's queries listen to the topics that change them
 * (apps/web/src/data/realtime.ts); a later slice adds its topics here and posts them after its writes.
 */
export const TOPICS = [
  /** Your settings and switches. */
  'settings',
  /** The scheduler's runs and the backups (Settings → Data). */
  'jobs',
] as const;
export type Topic = (typeof TOPICS)[number];

/** What the relay sends a screen: `seq` counts up per channel, so a gap means a hint was missed. */
export interface Hint {
  seq: number;
  topics: Topic[];
}

/** A person's channel; a split's (`split:<id>`) comes with splits. */
export const personChannel = (userId: string) => `user:${userId}`;

/** A pass lasts 5 minutes: long enough to connect, never a standing key (spec §16). */
export const PASS_TTL_MS = 5 * 60_000;

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c: string) => c.charCodeAt(0));

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

/** A signed pass to one channel: `<payload>.<signature>`, HMAC-SHA256 with the relay's key. */
export async function signPass(secret: string, channel: string, now = Date.now()): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ch: channel, exp: now + PASS_TTL_MS })));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

/** The channel a pass opens, or null when it's forged, malformed or expired. */
export async function verifyPass(secret: string, pass: string, now = Date.now()): Promise<string | null> {
  const [body, sig, extra] = pass.split('.');
  if (!body || !sig || extra !== undefined || pass.length > 1024) return null;
  try {
    const want = await hmac(secret, body);
    const got = fromB64url(sig);
    if (got.length !== want.length) return null;
    let diff = 0;
    for (let i = 0; i < want.length; i++) diff |= want[i]! ^ got[i]!;
    if (diff) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { ch?: unknown; exp?: unknown };
    if (typeof p.ch !== 'string' || typeof p.exp !== 'number' || p.exp < now) return null;
    return p.ch;
  } catch {
    return null;
  }
}
