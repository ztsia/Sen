import { describe, expect, it } from 'vitest';
import { parseSen } from '@sen/core/money';
import { queryClient } from '@/data';
import { optionalSen, priceItems, sharedCategory } from './receipt-math';

// QA B03 run 2, finding 24: the receipt's arithmetic and the offline read mode had no unit test, so a
// float slipping into the prices, or reads pausing offline, would pass `pnpm test`.
const rm = (t: string) => {
  const r = parseSen(t);
  if (!r.ok) throw new Error(t);
  return r.sen;
};
const item = (amount: string, categoryId: string | null = 'meals') => ({
  id: amount,
  description: amount,
  qty: 1,
  amount: rm(amount),
  price: 0,
  categoryId,
  doubtful: false,
});

describe('a receipt spreads its tax and service into its items (D66)', () => {
  it('in whole sen, adding up to the total exactly', () => {
    const { items, total } = priceItems(
      [item('26.00'), item('15.00'), item('4.50'), item('8.40'), item('2.20')],
      rm('2.42'),
      rm('5.61'),
    );
    expect(total).toBe(rm('64.13'));
    expect(items.reduce((a, i) => a + i.price, 0)).toBe(total);
    for (const i of items) expect(Number.isInteger(i.price)).toBe(true);
    expect(items.map((i) => i.price)).toEqual([2972, 1715, 514, 960, 252]);
  });
  it('three items of RM0.10 with RM0.01 of tax: the sen goes to the first by largest remainder', () => {
    const { items } = priceItems([item('0.10'), item('0.10'), item('0.10')], 1, 0);
    expect(items.map((i) => i.price)).toEqual([11, 10, 10]);
  });
  it('no items priced: nothing to spread', () => {
    expect(priceItems([item('0.00')], 0, 0).items[0]!.price).toBe(0);
  });
  it('one shared category, or mixed', () => {
    expect(sharedCategory([item('1.00'), item('2.00')])).toBe('meals');
    expect(sharedCategory([item('1.00'), item('2.00', 'drinks')])).toBeNull();
  });
  it('an optional amount: empty is nothing, a bad one is flagged', () => {
    const parse = (t: string) => {
      const r = parseSen(t);
      return r.ok ? { sen: r.sen } : { error: r.reason };
    };
    expect(optionalSen(parse, '')).toEqual({ sen: 0, bad: false });
    expect(optionalSen(parse, '5.61')).toEqual({ sen: 561, bad: false });
    expect(optionalSen(parse, '5.611')).toEqual({ sen: 0, bad: true });
  });
});

describe('the screens read whether or not there is a network (finding 1)', () => {
  it('queries and writes never wait for the network: the backend works offline', () => {
    const d = queryClient.getDefaultOptions();
    expect(d.queries?.networkMode).toBe('always');
    expect(d.mutations?.networkMode).toBe('always');
  });
});
