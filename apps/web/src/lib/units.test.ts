import { describe, expect, it } from 'vitest';
import { foldParts } from '@/blocks/charts';
import { checkAmount } from '@/blocks/money-input';
import { badgeLabel, badgeText } from '@/frame/tab-bar';
import { SCREENS, showsSenButton, showsTabBar } from '@/screens/registry';
import { REAL } from '@/screens/real';
import { dayLabel, updatedAgo } from './dates';

describe("Review's badge", () => {
  it('counts up to 99+, and reads as words', () => {
    expect(badgeText(5)).toBe('5');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
    expect(badgeLabel(5)).toBe('5 to review');
    expect(badgeLabel(120)).toBe('More than 99 to review');
  });
});

describe('separate series', () => {
  const p = (key: string, sen: number) => ({ key, label: key, sen });
  it('keeps three parts in their own order, whatever their size', () => {
    expect(foldParts([p('a', 1), p('b', 900), p('c', 5)]).map((x) => [x.key, x.color])).toEqual([
      ['a', 'var(--chart-1)'],
      ['b', 'var(--chart-2)'],
      ['c', 'var(--chart-3)'],
    ]);
  });
  it('folds a fourth part and beyond into Other, in the grey, adding exactly', () => {
    const f = foldParts([p('a', 1), p('b', 2), p('c', 3), p('d', 4), p('e', 5)]);
    expect(f).toHaveLength(4);
    expect(f[3]).toEqual({ key: 'other', label: 'Other', sen: 9, color: 'var(--chart-context)' });
  });
});

describe('dates, in Kuala Lumpur', () => {
  it('labels a day by its date in KL, not UTC', () => {
    // 20:00 UTC on 7 Oct is 04:00 on 8 Oct in Kuala Lumpur
    expect(dayLabel(new Date('2026-10-07T20:00:00Z'))).toMatch(/8 Oct/);
  });
  it('says how stale a screen is', () => {
    const now = new Date('2026-10-08T10:00:00Z');
    expect(updatedAgo(new Date('2026-10-08T09:59:40Z'), now)).toBe('Updated just now');
    expect(updatedAgo(new Date('2026-10-08T09:58:00Z'), now)).toBe('Updated 2 min ago');
    expect(updatedAgo(new Date('2026-10-08T07:00:00Z'), now)).toBe('Updated 3 h ago');
  });
});

describe('the money input', () => {
  it('turns typed text into sen, or says what is wrong in words', () => {
    expect(checkAmount('1,284.50')).toEqual({ sen: 128450 });
    expect(checkAmount('12.345').error).toBe('Two decimals at most, like 12.50.');
    expect(checkAmount('').error).toBe('Type the amount.');
    expect(checkAmount('-5').error).toMatch(/like 12\.50/);
  });
});

describe('the screen registry', () => {
  it('has every screen once, and a component for each one a slice made real', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const real = SCREENS.filter((s) => s.status === 'real').map((s) => s.id);
    expect(real.sort()).toEqual(Object.keys(REAL).sort());
  });
  it('shows the tab bar on tabs and pushed screens, and hides it during a task', () => {
    const by = (id: string) => SCREENS.find((s) => s.id === id);
    for (const id of ['first-run', 'payday', 'confirm', 'manual', 'balance-check', 'scan', 'split-public'])
      expect(showsTabBar(by(id)), id).toBe(false);
    expect(showsTabBar(by('payments'))).toBe(true);
    expect(showsSenButton(by('home'))).toBe(true);
    expect(showsSenButton(by('payments'))).toBe(false);
  });
});

describe('day headers name another year', () => {
  it('leaves this year out, and says last year (QA B03, F14)', async () => {
    const { dayLabel } = await import('./dates');
    const now = new Date('2026-10-18T12:00:00+08:00');
    expect(dayLabel(new Date('2026-10-08T12:00:00+08:00'), now)).toBe('Thu, 8 Oct');
    expect(dayLabel(new Date('2025-10-31T12:00:00+08:00'), now)).toMatch(/31 Oct 2025$/);
  });
});
