import { createSign } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type pg from 'pg';
import { schema } from '@sen/db';
import { asPerson } from '../db';
import type { FirebaseAccount } from '../env';

/** What a push says. `data` is for the shell (a screen to open), never money or personal data. */
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Sends to a person's phones; answers how many took it. A fake in tests. */
export interface Pusher {
  readonly on: boolean;
  send(userId: string, msg: PushMessage): Promise<number>;
}

export const noPush: Pusher = { on: false, send: async () => 0 };

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

/**
 * FCM's HTTP v1 API with the Firebase service account (spec §5.1 Push, §17). The access token is a
 * JWT signed with the account's key and swapped at Google for an hour's token, kept while it lasts.
 * Each phone's token is read as its person under RLS; one FCM calls gone (the app uninstalled, the
 * token rotated) is deleted, so it isn't tried again.
 */
export function fcmPusher(account: FirebaseAccount, pool: pg.Pool, fetcher: typeof fetch = fetch): Pusher {
  let cached: { token: string; until: number } | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.until > Date.now() + 60_000) return cached.token;
    const now = Math.floor(Date.now() / 1000);
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(
      JSON.stringify({
        iss: account.client_email,
        scope: SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    );
    const sig = createSign('RSA-SHA256').update(`${head}.${claims}`).sign(account.private_key).toString('base64url');
    const res = await fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${head}.${claims}.${sig}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Google refused the service account (${res.status})`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: body.access_token, until: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  return {
    on: true,
    async send(userId, msg) {
      const t = schema.pushTokens;
      const tokens = await asPerson(pool, userId, (db) =>
        db.select({ id: t.id, token: t.fcmToken }).from(t).where(eq(t.userId, userId)),
      );
      if (!tokens.length) return 0;
      const bearer = await accessToken();
      const gone: string[] = [];
      let sent = 0;
      for (const { id, token } of tokens) {
        const res = await fetcher(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
          method: 'POST',
          headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: msg.title, body: msg.body },
              data: msg.data ?? {},
              android: { priority: 'high' },
            },
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) sent++;
        // 404 UNREGISTERED: the app is gone from that phone; 400 on a token FCM can't read
        else if (res.status === 404 || res.status === 400) gone.push(id);
        else console.error('push not sent', res.status);
      }
      if (gone.length) await asPerson(pool, userId, (db) => db.delete(t).where(inArray(t.id, gone)));
      return sent;
    },
  };
}
