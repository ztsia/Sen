import { describe, expect, it } from 'vitest';
import { frameAt, klAt, klClock, nextTick } from './jobs';
import { PASS_TTL_MS, signPass, verifyPass } from './realtime';

const at = (iso: string) => new Date(iso);

describe('the scheduler clock', () => {
  it('reads the Kuala Lumpur date and hour', () => {
    expect(klClock(at('2026-10-24T23:30:00Z'))).toEqual({ day: '2026-10-25', hour: 7 });
    expect(klAt('2026-10-25', 7).toISOString()).toBe('2026-10-24T23:00:00.000Z');
  });
  it('finds the frame whose window holds now', () => {
    expect(frameAt(at('2026-10-24T23:00:00Z'))).toBe('morning'); // 07:00
    expect(frameAt(at('2026-10-24T23:59:59Z'))).toBe('morning'); // 07:59
    expect(frameAt(at('2026-10-25T00:00:00Z'))).toBeNull(); // 08:00
    expect(frameAt(at('2026-10-25T13:00:00Z'))).toBe('evening'); // 21:00
    expect(frameAt(at('2026-10-25T14:00:00Z'))).toBeNull(); // 22:00
  });
});

describe('when the Worker ticks next', () => {
  const none = { unfinished: null, nextOnce: null };
  it('sleeps until the next frame', () => {
    expect(nextTick(at('2026-10-24T20:00:00Z'), none).toISOString()).toBe('2026-10-24T23:00:00.000Z'); // 04:00 → 07:00
    expect(nextTick(at('2026-10-24T23:00:10Z'), none).toISOString()).toBe('2026-10-25T13:00:00.000Z'); // done at 07:00 → 21:00
    expect(nextTick(at('2026-10-25T13:00:05Z'), none).toISOString()).toBe('2026-10-25T23:00:00.000Z'); // done at 21:00 → 07:00
    expect(nextTick(at('2026-10-25T15:30:00Z'), none).toISOString()).toBe('2026-10-25T23:00:00.000Z'); // 23:30 → 07:00
  });
  it('retries an unfinished frame in five minutes', () => {
    expect(nextTick(at('2026-10-24T23:00:00Z'), { unfinished: 'morning', nextOnce: null }).toISOString()).toBe(
      '2026-10-24T23:05:00.000Z',
    );
  });
  it('wakes for a one-off job before the frame', () => {
    expect(
      nextTick(at('2026-10-25T02:00:00Z'), { unfinished: null, nextOnce: at('2026-10-25T03:00:00Z') }).toISOString(),
    ).toBe('2026-10-25T03:00:00.000Z');
  });
  it('is never sooner than a minute ahead', () => {
    expect(
      nextTick(at('2026-10-25T02:00:00Z'), { unfinished: null, nextOnce: at('2026-10-25T01:00:00Z') }).toISOString(),
    ).toBe('2026-10-25T02:01:00.000Z');
  });
});

describe('relay passes', () => {
  const now = Date.parse('2026-10-25T02:00:00Z');
  it('open the channel they were signed for, for five minutes', async () => {
    const pass = await signPass('k', 'user:1', now);
    expect(await verifyPass('k', pass, now + PASS_TTL_MS - 1)).toBe('user:1');
    expect(await verifyPass('k', pass, now + PASS_TTL_MS + 1)).toBeNull();
  });
  it('refuse another key, a changed channel or junk', async () => {
    const pass = await signPass('k', 'user:1', now);
    expect(await verifyPass('other', pass, now)).toBeNull();
    const [, sig] = pass.split('.');
    const forged = `${btoa(JSON.stringify({ ch: 'user:2', exp: now + 1000 })).replace(/=+$/, '')}.${sig}`;
    expect(await verifyPass('k', forged, now)).toBeNull();
    for (const junk of ['', '.', 'a.b', 'a.b.c', '%%%.%%%']) expect(await verifyPass('k', junk, now)).toBeNull();
  });
});
