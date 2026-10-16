import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiAuth } from './auth';

// How each answer of the server's sign-in reaches the screen (QA B05 runs 1 and 2): the words a
// person reads depend on these, and only a browser journey would otherwise notice one changing.
const answer = (status: number, body: unknown) =>
  vi.fn(async () => new Response(body === null ? 'null' : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('sending a code', () => {
  it.each([
    [200, { success: true }, 'sent'],
    [403, { code: 'not_invited', message: 'Sen is invitation-only.' }, 'not-invited'],
    [403, { code: 'suspended', message: 'Your access to Sen is paused.' }, 'suspended'],
    [429, { code: 'too_many', message: 'Too many codes asked for.' }, 'too-many'],
    [502, { code: 'mail_failed', message: 'Sen couldn’t send the email.' }, 'mail-failed'],
    [500, { code: 'server', message: 'Something went wrong.' }, 'failed'],
  ])('%i %o says %s', async (status, body, said) => {
    vi.stubGlobal('fetch', answer(status, body));
    expect(await apiAuth.send('a@example.com')).toBe(said);
  });

  it('says offline when the server can’t be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await apiAuth.send('a@example.com')).toBe('offline');
  });
});

describe('typing the code', () => {
  it.each([
    [200, { token: 't', user: {} }, 'ok'],
    [400, { code: 'INVALID_OTP', message: 'Invalid OTP' }, 'wrong'],
    [400, { code: 'OTP_EXPIRED', message: 'OTP expired' }, 'expired'],
    // three wrong tries end this code: a new one is needed
    [403, { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts' }, 'too-many'],
    // too many tries in a minute: waiting is what helps, not a new code (QA B05 run 1, 4)
    [429, { message: 'Too many requests. Please try again later.' }, 'wait'],
  ])('%i %o says %s', async (status, body, said) => {
    vi.stubGlobal('fetch', answer(status, body));
    expect(await apiAuth.verify('a@example.com', '123456')).toBe(said);
  });
});

describe('the signed-out gate', () => {
  it('is signed out only when the server says nobody is signed in', async () => {
    vi.stubGlobal('fetch', answer(200, null));
    expect(await apiAuth.signedOut()).toBe(true);
  });

  it('lets a signed-in person in offline (QA B05 run 1, 3)', async () => {
    await apiAuth.signOut().catch(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    // a fresh module state: the cached answer from sign-out isn't reused
    vi.resetModules();
    const { apiAuth: fresh } = await import('./auth');
    expect(await fresh.signedOut()).toBe(false);
  });

  it('lets them in when the server fails, too', async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', answer(500, { code: 'server', message: 'x' }));
    const { apiAuth: fresh } = await import('./auth');
    expect(await fresh.signedOut()).toBe(false);
  });
});
