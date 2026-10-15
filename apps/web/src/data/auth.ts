import { ApiFailure, apiCall } from './api/client';
import { CODE_EXPIRED, CODE_OK } from '@/screens/outside/logic';

/** Who is signed in: Better Auth's session, as the screens need it. */
export interface Session {
  email: string;
  name: string;
}

export type SendResult = 'sent' | 'not-invited' | 'suspended' | 'too-many' | 'offline' | 'failed';
/** `too-many`: three wrong tries ended this code, so a new one is needed. `wait`: too many tries in a minute. */
export type VerifyResult = 'ok' | 'wrong' | 'expired' | 'too-many' | 'wait' | 'offline' | 'failed';

/**
 * Signing in and out (B05, D13): the one interface the sign-in and Account screens use. On the `api`
 * backend it's Better Auth's emailed code at /api/auth; on the skeleton's fake it's made up (logic.ts:
 * 123456 signs in, 000000 has expired, `stranger@…` was never invited) and always signed in.
 */
export interface Auth {
  /** Null when signed out, or when the server can't be asked (offline). */
  session(): Promise<Session | null>;
  /**
   * True only when the server says nobody is signed in. Offline, or with the server failing, it's
   * false: a signed-in person opening Sen offline stays in it (QA B05 run 1, 3); a request that
   * finds the session gone later sends them to sign-in (router.tsx).
   */
  signedOut(): Promise<boolean>;
  send(email: string): Promise<SendResult>;
  verify(email: string, code: string): Promise<VerifyResult>;
  signOut(): Promise<void>;
  /** Revokes every session of this person, this one too (§17: a lost phone). */
  signOutEverywhere(): Promise<void>;
}

const failure = (e: unknown) => (e instanceof ApiFailure ? e : new ApiFailure(0, 'failed', String(e)));

let sessionP: Promise<Session | null | 'unknown'> | null = null;

function load(): Promise<Session | null | 'unknown'> {
  sessionP ??= apiCall<{ user: Session } | null>('/auth/get-session').then(
    (r) => (r?.user ? { email: r.user.email, name: r.user.name } : null),
    () => {
      sessionP = null; // ask again next time: it may be back
      return 'unknown' as const;
    },
  );
  return sessionP;
}

const apiAuth: Auth = {
  async session() {
    const s = await load();
    return s === 'unknown' ? null : s;
  },
  async signedOut() {
    return (await load()) === null;
  },
  async send(email) {
    try {
      await apiCall('/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
      return 'sent';
    } catch (e) {
      const f = failure(e);
      return f.code === 'not_invited'
        ? 'not-invited'
        : f.code === 'suspended'
          ? 'suspended'
          : f.status === 429
            ? 'too-many'
            : f.status === 0
              ? 'offline'
              : 'failed';
    }
  },
  async verify(email, code) {
    try {
      await apiCall('/auth/sign-in/email-otp', { body: { email, otp: code } });
      sessionP = null;
      return 'ok';
    } catch (e) {
      const f = failure(e);
      if (f.code === 'INVALID_OTP') return 'wrong';
      if (f.code === 'OTP_EXPIRED') return 'expired';
      if (f.code === 'TOO_MANY_ATTEMPTS') return 'too-many';
      if (f.status === 429) return 'wait';
      return f.status === 0 ? 'offline' : 'failed';
    }
  },
  async signOut() {
    await apiCall('/auth/sign-out', { body: {} });
    sessionP = Promise.resolve(null);
  },
  async signOutEverywhere() {
    await apiCall('/auth/revoke-sessions', { body: {} });
    sessionP = Promise.resolve(null);
  },
};

const fakeAuth: Auth = {
  session: async () => ({ email: 'weiming@example.com', name: 'Wei Ming' }),
  signedOut: async () => false,
  send: async (email) => (email.startsWith('stranger@') ? 'not-invited' : 'sent'),
  verify: async (_email, code) => (code === CODE_OK ? 'ok' : code === CODE_EXPIRED ? 'expired' : 'wrong'),
  signOut: async () => undefined,
  signOutEverywhere: async () => undefined,
};

/** The auth this build signs in with, matching its backend (data/index.ts). */
export const auth: Auth = __SEN_BACKEND__ === 'api' ? apiAuth : fakeAuth;

/** Forgets the cached session, after the API said it's gone. */
export function forgetSession() {
  sessionP = Promise.resolve(null);
}

let reason: 'paused' | null = null;

/** Why the app last sent someone to sign-in, for sign-in to say once (QA B05 run 1, 10). */
export function noteSignedOutBecause(r: 'paused') {
  reason = r;
}
export function takeSignedOutReason(): 'paused' | null {
  const r = reason;
  reason = null;
  return r;
}
