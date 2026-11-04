// What the made-up sign-in and first run decide, kept apart from the screens so it can be tested. The
// real API (B05) replaces the code check; the words stay.

/** The made-up codes: 123456 signs in, 000000 has expired, anything else is wrong. */
export const CODE_OK = '123456';
export const CODE_EXPIRED = '000000';

export type EmailCheck = { ok: true; email: string } | { ok: false; reason: 'empty' | 'format' | 'invitation-only' };

/** Empty or badly formed; whether it was invited is the server's to say (D52). */
export function checkEmail(text: string): EmailCheck {
  const email = text.trim().toLowerCase();
  if (!email) return { ok: false, reason: 'empty' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'format' };
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

/** `?state=expired` puts sign-in in its expired-invitation state (previews only, like `?state=` elsewhere). */
export function signInState(search: string, previews: boolean): 'expired' | null {
  return previews && new URLSearchParams(search).get('state') === 'expired' ? 'expired' : null;
}

export const EXPIRED_ASK = 'Ask whoever runs your Sen for a new invitation. Sen can’t send one for you.';

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

/** The apps' side of an account suggestion (the shell's CaptureApp, B02). */
export interface AppForAccount {
  package: string;
  label: string;
  kind: 'bank' | 'ewallet' | 'wallet' | null;
  accounts: string[];
  chosen: boolean;
}

/** An account first run offers: one per chosen app (D145), matched to the account it already has, if any. */
export interface AccountSuggestion {
  package: string;
  label: string;
  /** The curated list's name for it, or the app's own. */
  name: string;
  /** The account already saved for this app (a step reopened), with its opening balance. */
  saved: { id: string; opening: number } | null;
}

/**
 * One account per chosen app (D145), in the picker's order. A card wallet (Google Wallet) holds no money
 * of its own, so it gets none (D88); an app the curated list doesn't know is named after itself.
 */
export function suggestAccounts(
  apps: readonly AppForAccount[],
  accounts: readonly { id: string; package: string | null; balance: number | null }[],
  openings: ReadonlyMap<string, number>,
): AccountSuggestion[] {
  return apps
    .filter((a) => a.chosen && a.kind !== 'wallet')
    .map((a) => {
      const have = accounts.find((x) => x.package === a.package);
      return {
        package: a.package,
        label: a.label,
        name: a.accounts[0] ?? a.label,
        saved: have ? { id: have.id, opening: openings.get(have.id) ?? have.balance ?? 0 } : null,
      };
    });
}

/** What first run keeps on this phone while it runs (B08): the step it's on and what's typed but not saved. */
export interface FirstRunDraft {
  step: StepId | null;
  balances: Record<string, string>;
  name: string | null;
  payday: { kind: 'last' | 'day'; day: string } | null;
  off: string[];
}

export const NO_DRAFT: FirstRunDraft = { step: null, balances: {}, name: null, payday: null, off: [] };

/** Reads the kept draft, forgiving anything malformed: a bad draft starts first run afresh, never breaks it. */
export function readDraft(text: string | null): FirstRunDraft {
  if (!text) return NO_DRAFT;
  try {
    const d = JSON.parse(text) as Partial<FirstRunDraft>;
    const steps: StepId[] = ['sign-in', 'apps', 'access', 'running', 'accounts', 'name', 'payday', 'categories'];
    const strings = (o: unknown): Record<string, string> =>
      o && typeof o === 'object'
        ? Object.fromEntries(Object.entries(o).filter((e): e is [string, string] => typeof e[1] === 'string'))
        : {};
    return {
      step: typeof d.step === 'string' && steps.includes(d.step) ? d.step : null,
      balances: strings(d.balances),
      name: typeof d.name === 'string' ? d.name : null,
      payday:
        d.payday && (d.payday.kind === 'last' || d.payday.kind === 'day') && typeof d.payday.day === 'string'
          ? { kind: d.payday.kind, day: d.payday.day }
          : null,
      off: Array.isArray(d.off) ? d.off.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch {
    return NO_DRAFT;
  }
}

/** Your names with the one typed first: the others you'd added stay (D17). */
export function withPrintedName(names: readonly string[], printed: string): string[] {
  return [printed, ...names.filter((n) => n !== printed)];
}
