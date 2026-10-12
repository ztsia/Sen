import { describe, expect, it } from 'vitest';
import { LOOK_IDS } from '@/looks/ids';
import { checkCode, checkEmail, inviteEmail, nextLook, parseDay, printedName, signInState, stepsFor } from './logic';

describe('sign-in', () => {
  it('knows the made-up codes', () => {
    expect(checkCode('123456')).toBe('ok');
    expect(checkCode('000000')).toBe('expired');
    expect(checkCode('654321')).toBe('wrong');
    expect(checkCode('123')).toBe('incomplete');
  });
  it('turns away an uninvited email and a malformed one', () => {
    expect(checkEmail('stranger@example.com')).toEqual({ ok: false, reason: 'invitation-only' });
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
