import { describe, expect, it } from 'vitest';
import { momentLabel } from '@/lib/dates';
import { listenerState } from '@/screens/capture/capture';
import type { CaptureStatus } from './bridge';
import { backAction } from './native';

describe("Android's back, in the shell (patterns.md §6)", () => {
  it('closes an open sheet first, wherever it is', () => {
    expect(backAction('/', true, true)).toBe('back');
    expect(backAction('/review', true, false)).toBe('back');
  });
  it('leaves the app from Home, and goes Home from the other tabs', () => {
    expect(backAction('/', false, true)).toBe('leave');
    for (const tab of ['/review', '/insights', '/more']) expect(backAction(tab, false, true)).toBe('home');
  });
  it('goes back a screen from a pushed one, or Home when there is nothing to go back to', () => {
    expect(backAction('/s/settings/capture', false, true)).toBe('back');
    expect(backAction('/s/settings/capture', false, false)).toBe('home');
  });
});

describe("the listener's state, in words", () => {
  const base: CaptureStatus = {
    enabled: true,
    access: true,
    connected: true,
    beatAt: 0,
    eventAt: 0,
    connectedAt: 0,
    disconnectedAt: 0,
    ignoringBattery: true,
    chosen: ['my.rytbank.app', 'com.pbb.mypb'],
    events: 0,
    restrictedSettings: true,
  };
  it('says what stops it, most basic first', () => {
    expect(listenerState({ ...base, enabled: false }).state).toBe('Off in this build');
    expect(listenerState({ ...base, access: false, chosen: [] }).title).toMatch(/notification access/);
    expect(listenerState({ ...base, chosen: [] }).title).toMatch(/No apps are chosen/);
    expect(listenerState({ ...base, connected: false }).status).toBe('waiting');
    expect(listenerState(base)).toMatchObject({ state: 'Listening', title: 'Reading 2 apps.', status: 'done' });
  });
});

describe('moments, in Kuala Lumpur time', () => {
  // 9 Oct 2026, 11:35 in Kuala Lumpur is 03:35 UTC
  const now = new Date('2026-10-09T03:35:00Z');
  it('is relative when recent', () => {
    expect(momentLabel(new Date('2026-10-09T01:02:00Z'), now)).toBe('Today, 09:02');
    expect(momentLabel(new Date('2026-10-08T13:15:00Z'), now)).toBe('Yesterday, 21:15');
  });
  it('turns over at midnight in Kuala Lumpur, not UTC', () => {
    // 16:30 UTC on 8 Oct is 00:30 on 9 Oct in Kuala Lumpur: today
    expect(momentLabel(new Date('2026-10-08T16:30:00Z'), now)).toBe('Today, 00:30');
    expect(momentLabel(new Date('2026-10-06T04:00:00Z'), now)).toMatch(/^Tue, 6 Oct, 12:00$/);
  });
});
