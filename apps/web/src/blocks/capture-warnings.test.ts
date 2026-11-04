import { describe, expect, it, vi } from 'vitest';
import { SCHEDULER_LATE_MS as SERVERS, type CaptureHealthView } from '@sen/core/sync';
import { SCHEDULER_LATE_MS, captureWarning, type ShellFacts } from './capture-warnings';

// Home's warnings (B07, spec §6.2, §18): which one shows, when several apply. The first that applies wins.

vi.mock('@/data/hooks', () => ({ useCaptureHealth: () => ({}) }));

const HEALTHY: CaptureHealthView = {
  on: true,
  lastBeatAt: '2026-11-02T09:00:00+08:00',
  listenerConnected: true,
  access: true,
  lastListenAt: '2026-11-02T09:00:00+08:00',
  lastEventAt: '2026-11-02T08:00:00+08:00',
  silent: null,
  morningAt: '2026-11-03T06:00:00+08:00',
  schedulerLate: false,
};
const PHONE: ShellFacts = {
  status: { access: true, connected: true, captureSwitch: true },
  outbox: { morningAt: '2026-11-03T06:00:00+08:00', serverNow: '2026-11-03T09:00:00+08:00' },
};
const warn = (h: Partial<CaptureHealthView> | undefined, s: ShellFacts | null = null, canFix = false) =>
  captureWarning(h && { ...HEALTHY, ...h }, s, canFix);

describe('the capture warnings', () => {
  it('count 26 hours as the server does', () => {
    expect(SCHEDULER_LATE_MS).toBe(SERVERS);
  });

  it('says nothing when all is well', () => {
    expect(warn({})).toBeNull();
    expect(warn({}, PHONE, true)).toBeNull();
  });

  it('says nothing with the Capture switch off, whatever else is wrong', () => {
    const bad = { on: false, silent: 'no-heartbeat', schedulerLate: true } as const;
    expect(warn(bad)).toBeNull();
    expect(warn(bad, { ...PHONE, status: { access: false, connected: false, captureSwitch: false } })).toBeNull();
  });

  it('1. says Capture is off when the phone’s listener is not bound, with Fix', () => {
    const off = { ...PHONE, status: { ...PHONE.status, connected: false } };
    expect(warn({}, off)).toEqual({
      key: 'listener-off',
      title: 'Capture is off',
      detail: "Sen can't read your payment notifications.",
      fix: true,
    });
    const noAccess = { ...PHONE, status: { ...PHONE.status, access: false } };
    expect(warn({}, noAccess)?.key).toBe('listener-off');
  });

  it('1. comes before everything the server says', () => {
    const off = { ...PHONE, status: { ...PHONE.status, access: false } };
    expect(warn({ silent: 'no-heartbeat', schedulerLate: true }, off)?.key).toBe('listener-off');
  });

  it('2. says the phone has not been heard from, in Kuala Lumpur time', () => {
    const w = warn({ silent: 'no-heartbeat', lastBeatAt: '2026-11-01T01:30:00Z', schedulerLate: true });
    expect(w).toMatchObject({ key: 'no-heartbeat', title: 'Capture may be off', fix: false });
    expect(w?.detail).toBe("Sen hasn't heard from your phone since Sun, 1 Nov, 09:30.");
  });

  it('2. in a browser, says the phone reported access off, or its listener off since when', () => {
    const w = warn({ silent: 'no-access', access: false, listenerConnected: false });
    expect(w).toMatchObject({ key: 'no-access', title: 'Capture is off', fix: false });
    expect(w?.detail).toBe("Your phone says Sen can't read your payment notifications.");
    expect(warn({ silent: 'no-access' }, PHONE, true)?.fix).toBe(true);
    const off = warn({ silent: 'no-heartbeat', listenerConnected: false, lastListenAt: '2026-11-01T01:30:00Z' });
    expect(off?.detail).toBe("Sen's listener on your phone has been off since Sun, 1 Nov, 09:30.");
    expect(warn({ silent: 'no-heartbeat', listenerConnected: false, lastListenAt: null })?.detail).toBe(
      "Sen's listener on your phone is off.",
    );
  });

  it('3. says no payment notifications have come', () => {
    const w = warn({ silent: 'no-events', lastEventAt: '2026-10-31T15:12:00Z', schedulerLate: true });
    expect(w).toMatchObject({ key: 'no-events', title: 'Capture may be off' });
    expect(w?.detail).toBe('No payment notifications since Sat, 31 Oct, 23:12.');
    expect(warn({ silent: 'no-events', lastEventAt: null })?.detail).toBe('No payment notifications yet.');
  });

  it('2 and 3 offer Fix only where something can fix it', () => {
    expect(warn({ silent: 'no-events' }, null, false)?.fix).toBe(false);
    expect(warn({ silent: 'no-events' }, PHONE, true)?.fix).toBe(true);
    expect(warn({ silent: 'no-heartbeat' }, PHONE, true)?.fix).toBe(true);
  });

  it('2 comes before 3', () => {
    expect(warn({ silent: 'no-heartbeat' })?.key).toBe('no-heartbeat');
  });

  it('4. says the daily check has not run, with no Fix', () => {
    const w = warn({ schedulerLate: true, morningAt: '2026-11-01T22:00:00Z' }, PHONE, true);
    expect(w).toEqual({
      key: 'scheduler',
      title: "Sen's daily check hasn't run",
      detail: 'The morning job last ran Mon, 2 Nov, 06:00. Your payments are still kept.',
      fix: false,
    });
  });

  it('4. also by the phone’s own reading: the morning job over 26 hours before the server’s clock', () => {
    const late: ShellFacts = {
      ...PHONE,
      outbox: { morningAt: '2026-11-01T22:00:00Z', serverNow: '2026-11-03T02:00:01Z' },
    };
    expect(warn({}, late)?.key).toBe('scheduler');
    const fine: ShellFacts = {
      ...PHONE,
      outbox: { morningAt: '2026-11-01T22:00:00Z', serverNow: '2026-11-03T00:00:00Z' },
    };
    expect(warn({}, fine)).toBeNull();
    expect(warn({}, { ...PHONE, outbox: { morningAt: null, serverNow: null } })).toBeNull();
  });

  it('works from the phone alone when the server cannot be reached', () => {
    const off = { ...PHONE, status: { ...PHONE.status, connected: false } };
    expect(warn(undefined, off)?.key).toBe('listener-off');
    expect(warn(undefined, null)).toBeNull();
    expect(warn(undefined, { ...PHONE, status: { ...PHONE.status, captureSwitch: false } })).toBeNull();
  });
});
