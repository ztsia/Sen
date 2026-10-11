// What the made-up sign-in and first run decide, kept apart from the screens so it can be tested. The
// real API (B05) replaces the code check; the words stay.

/** The made-up codes: 123456 signs in, 000000 has expired, anything else is wrong. */
export const CODE_OK = '123456';
export const CODE_EXPIRED = '000000';

export type EmailCheck = { ok: true; email: string } | { ok: false; reason: 'empty' | 'format' | 'invitation-only' };

/** An email at `stranger@…` was never invited (D52). */
export function checkEmail(text: string): EmailCheck {
  const email = text.trim().toLowerCase();
  if (!email) return { ok: false, reason: 'empty' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'format' };
  if (email.startsWith('stranger@')) return { ok: false, reason: 'invitation-only' };
  return { ok: true, email };
}

export const EMAIL_MESSAGES = {
  empty: 'Type your email.',
  format: 'That doesn’t look like an email. Check it and try again.',
  'invitation-only': 'Sen is invitation-only. Ask whoever runs your Sen for an invitation.',
} as const;

export type CodeCheck = 'ok' | 'expired' | 'wrong' | 'incomplete';

export function checkCode(text: string): CodeCheck {
  const code = text.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return 'incomplete';
  if (code === CODE_OK) return 'ok';
  if (code === CODE_EXPIRED) return 'expired';
  return 'wrong';
}

/** The email an invitation's link carries, if it looks like one. */
export function inviteEmail(search: string): string {
  const e = new URLSearchParams(search).get('email')?.trim() ?? '';
  return checkEmail(e).ok || e.startsWith('stranger@') ? e : '';
}

export type StepId = 'sign-in' | 'apps' | 'access' | 'running' | 'accounts' | 'name' | 'payday' | 'categories';

/** The steps a person sees: the shell's seven with capture (D26, D86), or sign in and categories without (D79). */
export const stepsFor = (capture: boolean): StepId[] =>
  capture ? ['sign-in', 'apps', 'access', 'running', 'accounts', 'name', 'payday'] : ['sign-in', 'categories'];

/** A name as banks print it: capitals, single spaces (D17). */
export const printedName = (text: string) => text.trim().replace(/\s+/g, ' ').toUpperCase();

export type PaydayChoice = { kind: 'last-working' } | { kind: 'day'; day: number };

/** The payday day number, 1 to 31 (D14); null if it isn't one. */
export function parseDay(text: string): number | null {
  const t = text.trim();
  // matched against the days themselves: this is a day, not money, but the lint rule is blunt
  return Array.from({ length: 31 }, (_, i) => i + 1).find((d) => String(d) === t) ?? null;
}

/** The look after this one in the pool, wrapping round (D77). */
export function nextLook<T extends string>(ids: readonly T[], current: T): T {
  const i = ids.indexOf(current);
  return ids[(i + 1) % ids.length]!;
}
