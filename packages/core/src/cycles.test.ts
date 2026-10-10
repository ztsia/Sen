import { describe, expect, it } from 'vitest';
import { addDays, cycleLabel, cycleOf, daysBetween, klDay, lastWorkingDay, monthCycles, payCycles } from './cycles';

describe('days in Kuala Lumpur', () => {
  it('reads an instant as its Kuala Lumpur day, across midnight UTC', () => {
    expect(klDay('2026-10-17T16:30:00Z')).toBe('2026-10-18');
    expect(klDay('2026-10-17T15:59:00Z')).toBe('2026-10-17');
  });
  it('adds and counts days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-18', '2026-10-30')).toBe(12);
  });
  it('finds the last working day of a month', () => {
    expect(lastWorkingDay('2026-10-05')).toBe('2026-10-30'); // the 31st is a Saturday
    expect(lastWorkingDay('2026-05-01')).toBe('2026-05-29'); // the 30th and 31st are a weekend
    expect(lastWorkingDay('2026-09-10')).toBe('2026-09-30');
  });
  it('names a cycle by the month most of it falls in', () => {
    expect(cycleLabel('2026-09-30', '2026-10-29')).toBe('October');
    expect(cycleLabel('2026-08-31', '2026-09-29')).toBe('September');
  });
});

describe('pay cycles (§7, D14)', () => {
  const today = '2026-10-18';
  it('starts each cycle on a salary and ends it the day before the next', () => {
    const c = payCycles(['2026-08-31', '2026-09-30'], '2026-08-01', today);
    expect(c.map((x) => [x.start, x.end])).toEqual([
      ['2026-08-01', '2026-08-30'],
      ['2026-08-31', '2026-09-29'],
      ['2026-09-30', '2026-10-29'],
    ]);
    expect(c[2]!.expectedPayday).toBe('2026-10-30');
    expect(c[2]!.label).toBe('October');
  });
  it('ignores a salary within 15 days of the last (a bonus)', () => {
    const c = payCycles(['2026-09-30', '2026-10-09'], '2026-09-30', today);
    expect(c).toHaveLength(1);
    expect(c[0]!.start).toBe('2026-09-30');
  });
  it('starts on the opening day before the first salary, expecting the month-end payday', () => {
    const c = payCycles([], '2026-10-05', today);
    expect(c).toEqual([{ start: '2026-10-05', end: '2026-10-29', label: 'October', expectedPayday: '2026-10-30' }]);
  });
  it('set up a fortnight before payday, the first cycle ends the day before it', () => {
    expect(payCycles([], '2026-10-18', '2026-10-18')[0]).toMatchObject({
      end: '2026-10-29',
      expectedPayday: '2026-10-30',
      label: 'October',
    });
    expect(payCycles([], '2026-10-30', '2026-10-30')[0]!.expectedPayday).toBe('2026-11-30');
  });
  it('a late salary stretches the current cycle to today', () => {
    const c = payCycles(['2026-09-30'], '2026-09-01', '2026-10-31');
    expect(c[c.length - 1]!.end).toBe('2026-10-31');
  });
  it('counts by calendar month without capture (D79)', () => {
    const c = monthCycles('2026-08-20', today);
    expect(c.map((x) => x.start)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(c[2]!.end).toBe('2026-10-31');
    expect(cycleOf(c, '2026-09-15')!.label).toBe('September');
  });
});
