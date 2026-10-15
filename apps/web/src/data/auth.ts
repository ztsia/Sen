import { ApiFailure, apiCall } from './api/client';
import { CODE_EXPIRED, CODE_OK } from '@/screens/outside/logic';

/** Who is signed in: Better Auth's session, as the screens need it. */
export interface Session {
  email: string;
  name: string;
}

export type SendResult = 'sent' | 'not-invited' | 'too-many' | 'offline' | 'failed';
/** `too-many`: three wrong tries ended the code, or codes were asked for too often; a new one is needed. */
export type VerifyResult = 'ok' | 'wrong' | 'expired' | 'too-many' | 'offline' | 'failed';

/**
 * Signing in and out (B05, D13): the one interface the sign-in and Account screens use. On the `api`
 * backend it's Better Auth's emailed code at /api/auth; on the skeleton's fake it's made up (logic.ts:
 * 123456 signs in, 000000 has expired, `stranger@…` was never invited) and always signed in.
 */
export interface Auth {
  /** Null when signed out. */
  session(): Promise<Session | null>;
  send(email: string): Promise<SendResult>;
  verify(email: string, code: string): Promise<VerifyResult>;
  signOut(): Promise<void>;
  /** Revokes every session of this person, this one too (§17: a lost phone). */
  signOutEverywhere(): Promise<void>;
}

const failure = (e: unknown) => (e instanceof ApiFailure ? e : new ApiFailure(0, 'failed', String(e)));

let sessionP: Promise<Session | null> | null = null;

const apiAuth: Auth = {
  session() {
    sessionP ??= apiCall<{ user: Session } | null>('/auth/get-session').then(
      (r) => (r?.user ? { email: r.user.email, name: r.user.name } : null),
      () => null,
    );
    return sessionP;
  },
  async send(email) {
    try {
      await apiCall('/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
      return 'sent';
    } catch (e) {
      const f = failure(e);
      return f.code === 'not_invited'
        ? 'not-invited'
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
      if (f.code === 'TOO_MANY_ATTEMPTS' || f.status === 429) return 'too-many';
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
