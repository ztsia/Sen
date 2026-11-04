import { describe, expect, it } from 'vitest';
import { LOOK_IDS } from '@/looks/ids';
import {
  checkCode,
  checkEmail,
  inviteEmail,
  nextLook,
  parseDay,
  printedName,
  readDraft,
  signInState,
  stepsFor,
  suggestAccounts,
  withPrintedName,
  NO_DRAFT,
} from './logic';

describe('sign-in', () => {
  it('knows the made-up codes', () => {
    expect(checkCode('123456')).toBe('ok');
    expect(checkCode('000000')).toBe('expired');
    expect(checkCode('654321')).toBe('wrong');
    expect(checkCode('123')).toBe('incomplete');
  });
  it('turns away a malformed email, and leaves who was invited to the server', () => {
    expect(checkEmail('stranger@example.com')).toEqual({ ok: true, email: 'stranger@example.com' });
    expect(checkEmail('nope')).toEqual({ ok: false, reason: 'format' });
    expect(checkEmail('  ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkEmail(' Wei.Ming@Example.com ')).toEqual({ ok: true, email: 'wei.ming@example.com' });
  });
  it('has an expired-invitation state, from ?state=expired, in previews only', () => {
    expect(signInState('?state=expired', true)).toBe('expired');
    expect(signInState('?state=expired', false)).toBeNull();
    expect(signInState('?state=other', true)).toBeNull();
    expect(signInState('', true)).toBeNull();
  });
  it('reads the invitation link’s email', () => {
    expect(inviteEmail('?email=mei%40example.com')).toBe('mei@example.com');
    expect(inviteEmail('?email=junk')).toBe('');
    expect(inviteEmail('')).toBe('');
  });
});

describe('first run', () => {
  it('has seven steps with capture and two without (D79)', () => {
    expect(stepsFor(true)).toHaveLength(7);
    expect(stepsFor(false)).toEqual(['sign-in', 'categories']);
  });
  it('prints a name as banks do and reads a payday day', () => {
    expect(printedName('  tan   wei ming ')).toBe('TAN WEI MING');
    expect(parseDay('25')).toBe(25);
    expect(parseDay('0')).toBeNull();
    expect(parseDay('32')).toBeNull();
    expect(parseDay('2.5')).toBeNull();
  });
});

describe('new look', () => {
  it('goes to the next look, wrapping round', () => {
    expect(nextLook(LOOK_IDS, 'minted')).toBe('instrument');
    expect(nextLook(LOOK_IDS, 'copper')).toBe('minted');
  });
});

describe('first run (B08)', () => {
  const app = (pkg: string, label: string, kind: 'bank' | 'ewallet' | 'wallet', accounts: string[], chosen = true) => ({
    package: pkg,
    label,
    kind,
    accounts,
    chosen,
  });
  it('suggests one account per chosen app (D145), none for a card wallet, and finds one already saved', () => {
    const apps = [
      app('my.com.tngdigital.ewallet', "Touch 'n Go eWallet", 'ewallet', ['TNG eWallet']),
      app('my.rytbank.app', 'Ryt Bank', 'bank', ['Ryt Bank']),
      app('com.google.android.apps.walletnfcrel', 'Google Wallet', 'wallet', []),
      app('com.pbb.mypb', 'MyPB', 'bank', ['Public Bank'], false),
      app('com.example.bank', 'Example Bank', 'bank', []),
    ];
    const saved = [{ id: 'a1', package: 'my.rytbank.app', balance: 99 }];
    const s = suggestAccounts(apps, saved, new Map([['a1', 320050]]));
    expect(s.map((x) => x.name)).toEqual(['TNG eWallet', 'Ryt Bank', 'Example Bank']);
    expect(s[0]!.saved).toBeNull();
    expect(s[1]!.saved).toEqual({ id: 'a1', opening: 320050 });
  });
  it('reads a kept draft, and a broken one starts afresh', () => {
    expect(readDraft(null)).toEqual(NO_DRAFT);
    expect(readDraft('{not json')).toEqual(NO_DRAFT);
    expect(readDraft(JSON.stringify({ step: 'nope', balances: { a: '1.00', b: 2 } }))).toEqual({
      ...NO_DRAFT,
      balances: { a: '1.00' },
    });
    expect(
      readDraft(JSON.stringify({ step: 'running', name: 'TAN', payday: { kind: 'day', day: '25' } })),
    ).toMatchObject({
      step: 'running',
      name: 'TAN',
      payday: { kind: 'day', day: '25' },
    });
  });
  it('puts the typed name first and keeps the others', () => {
    expect(withPrintedName(['WEI MING TAN', 'TAN WEI MING'], 'TAN WEI MING')).toEqual(['TAN WEI MING', 'WEI MING TAN']);
    expect(withPrintedName([], 'TAN WEI MING')).toEqual(['TAN WEI MING']);
  });
});
