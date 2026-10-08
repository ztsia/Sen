import { Fragment } from 'react';
import { formatSen, spokenSen } from '@sen/core/money';
import { cn } from '@/lib/utils';

/**
 * in: money in, with a + and the money-in colour. out: spending, plain text, no sign: spending is
 * normal, not alarming. pending: not synced yet. warning: over a budget. (patterns.md §3) Colour is
 * never the only signal: the sign, or the words beside it, say it too.
 */
export type MoneyKind = 'in' | 'out' | 'pending' | 'warning';

const colour: Record<MoneyKind, string> = {
  in: 'text-money-in',
  out: 'text-money-out',
  pending: 'text-money-pending',
  warning: 'text-money-warning',
};

/**
 * An amount: integer sen in, text out, `RM1,284.50` with tabular figures. It may wrap after a
 * thousands comma but is never truncated, and a screen reader says it as money: "RM 1,284.50".
 */
export function Money({ sen, kind = 'out', className }: { sen: number; kind?: MoneyKind; className?: string }) {
  const plus = kind === 'in';
  const parts = formatSen(sen, { plus }).split(',');
  return (
    <span className={cn('num font-medium', colour[kind], className)} data-sen={sen}>
      <span aria-hidden="true">
        {parts.map((p, i) => (
          <Fragment key={i}>
            {i ? ',' : ''}
            {i ? <wbr /> : null}
            {p}
          </Fragment>
        ))}
      </span>
      <span className="sr-only">{spokenSen(sen, { plus })}</span>
    </span>
  );
}
