import { apportion } from '@sen/core/money';
import type { ReceiptDraft } from '@sen/core/views';

export type DraftItem = ReceiptDraft['items'][number];

export const sumSen = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Tax and service spread into each item's price (D66), by largest remainder, so the prices add up to
 * the total exactly. The total is what the printed amounts, the tax and the service come to.
 */
export function priceItems(
  items: readonly DraftItem[],
  tax: number,
  service: number,
): { items: DraftItem[]; total: number } {
  const amounts = items.map((i) => i.amount);
  const total = sumSen(amounts) + tax + service;
  const prices = amounts.some((a) => a > 0) ? apportion(total, amounts) : amounts.map(() => 0);
  return { items: items.map((i, n) => ({ ...i, price: prices[n] ?? 0 })), total };
}

/** The one category every item shares, or null for mixed (or none). */
export function sharedCategory(items: readonly DraftItem[]): string | null {
  const first = items[0]?.categoryId ?? null;
  return first && items.every((i) => i.categoryId === first) ? first : null;
}

/** A typed optional amount (tax, service): empty is nothing; a bad one is flagged, never guessed. */
export function optionalSen(parse: (t: string) => { sen?: number; error?: string }, text: string) {
  if (text.trim() === '') return { sen: 0, bad: false };
  const r = parse(text);
  return r.sen === undefined ? { sen: 0, bad: true } : { sen: r.sen, bad: false };
}
