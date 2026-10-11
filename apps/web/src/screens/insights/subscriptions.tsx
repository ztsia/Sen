import { CheckIcon, CircleDashedIcon, XIcon, type LucideIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { SubscriptionsView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscriptions } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded, Section } from '../kit';

/**
 * Subscriptions (screens.md, spec §11): the monthly commitment, then each declared subscription with
 * its next renewal and what was expected against what was charged.
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

const STATUS: Record<SubscriptionsView['rows'][number]['history'][number]['status'], [LucideIcon, string]> = {
  matched: [CheckIcon, 'Matched'],
  missed: [XIcon, 'Missed'],
  expected: [CircleDashedIcon, 'Expected'],
};

function Body({ v }: { v: SubscriptionsView }) {
  if (!v.rows.length) return <EmptyState line="No subscriptions declared yet." />;
  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-1">
        <p className="text-sm text-muted-foreground">Committed each month</p>
        <p className="text-3xl font-semibold">
          <Money sen={v.monthly} />
        </p>
        <p className="text-sm text-muted-foreground">
          Yearly ones count a twelfth. Foreign ones are about, at the rate shown.
        </p>
      </div>
      <Section title="Declared">
        <div className="flex flex-col gap-3 px-4 pt-1">
          {v.rows.map((r) => (
            <Card key={r.id} className="gap-3">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="min-w-0 text-base font-semibold wrap-anywhere">{r.name}</h3>
                  <span className="num shrink-0 text-right font-medium">
                    {formatMinor(r.amount, r.currency)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {r.cadence === 'yearly' ? ' a year' : ' a month'}
                    </span>
                  </span>
                </div>
                {r.currency !== 'MYR' ? (
                  <p className="text-sm text-muted-foreground">
                    ≈ <Money sen={r.approx} className="font-normal" />
                    {r.rate ? ` · rate ${r.rate}` : ''}
                  </p>
                ) : null}
                <p className="text-sm">Next renewal {shortDay(r.next)}</p>
                {r.history.length ? (
                  <ul className="flex flex-col gap-1 border-t border-border pt-2" aria-label={`${r.name} history`}>
                    {r.history.map((h) => {
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
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
