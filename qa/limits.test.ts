import { describe, expect, it } from 'vitest';
import { judge, judgeAll, median, serverTiming } from './limits';

describe('judging a number (D139)', () => {
  it('flags a human limit main keeps, and one main has no number for', () => {
    expect(judge('step.firstChangeMs', 220, 60)).toEqual({ kind: 'over', limit: 100 });
    expect(judge('step.firstChangeMs', 180)).toEqual({ kind: 'over', limit: 100 });
    // over the line, but within noise of main's number: not a flag
    expect(judge('step.firstChangeMs', 136, 96)).toEqual({ kind: 'ok' });
  });

  it('lists a human limit main breaks too as standing, unless it got worse still', () => {
    expect(judge('screen.settleMs', 1300, 1250)).toEqual({ kind: 'standing', limit: 1000, base: 1250 });
    expect(judge('screen.settleMs', 2400, 1250)).toEqual({ kind: 'over', limit: 1000 });
  });

  it('flags worse than main only past both the ratio and the floor', () => {
    expect(judge('screen.bytes', 130_000, 100_000)).toEqual({ kind: 'worse', base: 100_000 });
    // 40% worse, but 4 KB is noise
    expect(judge('screen.bytes', 14_000, 10_000)).toEqual({ kind: 'ok' });
    // 30 KB more, but 3% of the whole
    expect(judge('screen.bytes', 1_030_000, 1_000_000)).toEqual({ kind: 'ok' });
    expect(judge('api.queries', 9, 4)).toEqual({ kind: 'worse', base: 4 });
    expect(judge('api.queries', 6, 4)).toEqual({ kind: 'ok' });
  });

  it('flags any console error, and never a better number', () => {
    expect(judge('screen.console', 1, 0)).toEqual({ kind: 'over', limit: 0 });
    expect(judge('deploy.updateBytes', 200_000, 3_700_000)).toEqual({ kind: 'ok' });
  });

  it('matches a branch to main on key and metric', () => {
    const r = judgeAll(
      [
        { key: 'screen:a', metric: 'screen.settleMs', value: 900 },
        { key: 'screen:a', metric: 'screen.bytes', value: 300_000 },
        { key: 'screen:b', metric: 'screen.settleMs', value: 1200 },
      ],
      [
        { key: 'screen:a', metric: 'screen.settleMs', value: 850 },
        { key: 'screen:a', metric: 'screen.bytes', value: 100_000 },
        { key: 'screen:b', metric: 'screen.settleMs', value: 1150 },
      ],
    );
    expect(r.flags.map((f) => [f.key, f.metric])).toEqual([['screen:a', 'screen.bytes']]);
    expect(r.standing.map((f) => f.key)).toEqual(['screen:b']);
    expect(r.ok).toBe(1);
  });
});

describe('helpers', () => {
  it('takes the median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('reads Server-Timing', () => {
    expect(serverTiming('app;dur=41.2, db;dur=12.3, db-queries;dur=4, db-rows;dur=7')).toEqual({
      app: 41.2,
      db: 12.3,
      'db-queries': 4,
      'db-rows': 7,
    });
    expect(serverTiming(null)).toEqual({});
  });
});
