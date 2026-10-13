import { useUi } from '@/frame/ui-store';
import { useState } from 'react';
import { CheckIcon, ChevronDownIcon, CircleDashedIcon, RepeatIcon, XIcon, type LucideIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { SubscriptionsView } from '@sen/core/views';
import { StatTiles } from '@/blocks/facts';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Card } from '@/components/ui/card';
import { useSubscriptions } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * Subscriptions (screens.md, spec §11): the monthly commitment, then each declared subscription with
 * its next renewal and what was expected against what was charged. A subscription's history is
 * collapsed to a count until you open it (D130).
 */
export default function Subscriptions() {
  const q = useSubscriptions();
  return (
    <Screen bar={<AppBar title="Subscriptions" />}>
      <Loaded q={q} what="your subscriptions">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

const SYMBOL: Record<string, string> = { USD: 'US$', SGD: 'S$', EUR: '€', GBP: '£', AUD: 'A$' };

/**
 * An amount in its own currency, from its smallest unit: `2000` USD is `US$20.00`. Split as digits of
 * the whole number (the last two are the cents), so no division and no float ever carries an amount;
 * ringgit goes through formatSen.
 */
function formatMinor(amount: number, currency: string): string {
  if (currency === 'MYR') return formatSen(amount);
  const digits = String(amount).padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${SYMBOL[currency] ?? `${currency} `}${whole}.${digits.slice(-2)}`;
}

type History = SubscriptionsView['rows'][number]['history'];
type Status = History[number]['status'];

const STATUS: Record<Status, [LucideIcon, string]> = {
  matched: [CheckIcon, 'Matched'],
  missed: [XIcon, 'Missed'],
  expected: [CircleDashedIcon, 'Expected'],
};

/** *4 matched · 1 missed*: the history's counts in words, so a closed history still says how it went. */
function tally(history: History): string {
  const counts = new Map<Status, number>();
  for (const h of history) counts.set(h.status, (counts.get(h.status) ?? 0) + 1);
  return (['matched', 'missed', 'expected'] as const)
    .filter((s) => counts.has(s))
    .map((s) => `${counts.get(s)} ${STATUS[s][1].toLowerCase()}`)
    .join(' · ');
}

function Body({ v }: { v: SubscriptionsView }) {
  if (!v.rows.length)
    return (
      <EmptyState
        icon={RepeatIcon}
        title="No subscriptions yet"
        line="Tell Sen what you pay for, and each renewal shows here."
        action={{ label: 'Ask Sen', onSelect: () => useUi.getState().setSenOpen(true) }}
      />
    );
  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      <div>
        <StatTiles
          stats={[
            {
              label: 'Committed each month',
              value: <Money sen={v.monthly} className="font-semibold" />,
              emphasis: true,
            },
          ]}
        />
        <p className="px-5 pt-2 text-sm text-muted-foreground">
          Yearly ones count a twelfth. Foreign ones are about, at the rate shown.
        </p>
      </div>
      <section className="flex flex-col gap-2 px-4" aria-label="Declared">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Declared</h2>
        {v.rows.map((r) => (
          <Card key={r.id} className="gap-2 py-3">
            <div className="flex items-center gap-3 px-4">
              <IconTile icon={RepeatIcon} tone="accent" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 className="text-base font-semibold wrap-anywhere">{r.name}</h3>
                <p className="text-sm">Next renewal {shortDay(r.next)}</p>
              </div>
              <span className="num shrink-0 text-right font-medium">
                {formatMinor(r.amount, r.currency)}
                <span className="block text-xs font-normal text-muted-foreground">
                  {r.cadence === 'yearly' ? 'a year' : 'a month'}
                </span>
              </span>
            </div>
            {r.currency !== 'MYR' ? (
              <p className="px-4 pl-[60px] text-sm text-muted-foreground">
                ≈ <Money sen={r.approx} className="font-normal" />
                {r.rate ? ` · rate ${r.rate}` : ''}
              </p>
            ) : null}
            {r.history.length ? <HistoryList name={r.name} history={r.history} /> : null}
          </Card>
        ))}
      </section>
    </div>
  );
}

/** A subscription's history: its tally, opened to a list of each month, with what was expected and charged. */
function HistoryList({ name, history }: { name: string; history: History }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col border-t border-border px-4 pt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm active:bg-accent"
      >
        <span>{tally(history)}</span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-icon transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul className="flex flex-col gap-1 pt-1 pb-1" aria-label={`${name} history`}>
          {history.map((h) => {
            const [Icon, word] = STATUS[h.status];
            return (
              <li key={h.on} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                  <span>
                    {word}
                    <span className="text-muted-foreground"> · {shortDay(h.on)}</span>
                  </span>
                </span>
                <span className="num text-right text-muted-foreground">
                  {h.actual === null ? (
                    <>
                      expected <Money sen={h.expected} className="font-normal" />
                    </>
                  ) : (
                    <>
                      <Money sen={h.actual} className="font-normal" /> of{' '}
                      <Money sen={h.expected} className="font-normal" />
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
