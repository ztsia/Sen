import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  PlusIcon,
  RepeatIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { SUB_CURRENCIES } from '@sen/core/commands';
import { formatSen } from '@sen/core/money';
import type { SubscriptionsView } from '@sen/core/views';
import { StatTiles } from '@/blocks/facts';
import { MoneyInput, checkAmount } from '@/blocks/money-input';
import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSubscriptions, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { newId } from '@/lib/uid';
import { cn } from '@/lib/utils';
import { Loaded } from '../kit';

/**
 * Subscriptions (screens.md, spec §11): the monthly commitment, then each declared subscription with
 * its next renewal and what was expected against what was charged. A subscription's history is
 * collapsed to a count until you open it (D130). Adding one by hand is in the app bar (D134).
 */
export default function Subscriptions() {
  const q = useSubscriptions();
  const [adding, setAdding] = useState(false);
  return (
    <Screen
      bar={
        <AppBar
          title="Subscriptions"
          action={
            <Button variant="outline" size="sm" aria-label="Add a subscription" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden="true" />
              Add
            </Button>
          }
        />
      }
    >
      <Loaded q={q} what="your subscriptions">
        {(v) => <Body v={v} />}
      </Loaded>
      <Sheet
        open={adding}
        onOpenChange={setAdding}
        title="Add a subscription"
        description="A forecast: the charge that matches it is what counts."
      >
        {/* the form's body remounts each time the sheet opens, so nothing typed for one shows in the next */}
        {adding ? <SubscriptionForm onClose={() => setAdding(false)} /> : null}
      </Sheet>
    </Screen>
  );
}

type Currency = (typeof SUB_CURRENCIES)[number];

/** The sign before a subscription's amount: the currency's own, `RM` for ringgit. */
const PREFIX: Record<Currency, string> = { MYR: 'RM', USD: 'US$', SGD: 'S$', EUR: '€', GBP: '£' };

/** Which field an error is about: one message at a time (Budgets). */
type Where = 'name' | 'amount' | 'renewal';

/** Adds a subscription by hand (D134): its name, the currency and amount of each charge, how often, and the next renewal. */
function SubscriptionForm({ onClose }: { onClose: () => void }) {
  const write = useWrite();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('MYR');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'monthly' | 'yearly'>('monthly');
  const [renewal, setRenewal] = useState('');
  const [error, setError] = useState<{ at: Where; message: string }>();
  const save = async () => {
    if (name.trim() === '') return setError({ at: 'name', message: 'Type its name.' });
    const r = checkAmount(amount);
    if (r.error !== undefined && amount !== '') return setError({ at: 'amount', message: r.error });
    const sen = r.sen;
    if (sen === undefined || sen === 0) return setError({ at: 'amount', message: 'Type the amount.' });
    if (renewal === '') return setError({ at: 'renewal', message: 'Pick the next renewal date.' });
    onClose();
    await write({
      type: 'subscription.add',
      id: newId(),
      name: name.trim(),
      amount: sen,
      currency,
      cadence,
      nextRenewal: renewal,
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={error?.at === 'name' ? true : undefined}>
        <FieldLabel htmlFor="subscription-name">Name</FieldLabel>
        <Input
          id="subscription-name"
          value={name}
          maxLength={60}
          autoFocus
          aria-invalid={error?.at === 'name' ? true : undefined}
          onChange={(e) => {
            setError(undefined);
            setName(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />
        {error?.at === 'name' ? <FieldError>{error.message}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel id="subscription-currency">Currency</FieldLabel>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]"
          role="group"
          aria-labelledby="subscription-currency"
        >
          {SUB_CURRENCIES.map((c) => (
            <Button
              key={c}
              variant={currency === c ? 'default' : 'outline'}
              size="chip"
              aria-pressed={currency === c}
              className={cn(currency === c && 'font-semibold')}
              onClick={() => {
                setCurrency(c);
                setError(undefined);
              }}
            >
              {c}
            </Button>
          ))}
        </div>
      </Field>
      <MoneyInput
        label="Amount each time"
        prefix={PREFIX[currency]}
        value={amount}
        onChange={(t) => {
          setError(undefined);
          setAmount(t);
        }}
        error={error?.at === 'amount' ? error.message : undefined}
        onEnter={() => void save()}
      />
      <Field>
        <FieldLabel id="subscription-cadence">How often</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          aria-labelledby="subscription-cadence"
          value={cadence}
          onValueChange={(v) => v && setCadence(v as 'monthly' | 'yearly')}
        >
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          <ToggleGroupItem value="yearly">Yearly</ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <Field data-invalid={error?.at === 'renewal' ? true : undefined}>
        <FieldLabel htmlFor="subscription-renewal">Next renewal</FieldLabel>
        <Input
          id="subscription-renewal"
          type="date"
          value={renewal}
          aria-invalid={error?.at === 'renewal' ? true : undefined}
          onChange={(e) => {
            setError(undefined);
            setRenewal(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />
        {error?.at === 'renewal' ? <FieldError>{error.message}</FieldError> : null}
      </Field>
      <Button onClick={() => void save()}>Save</Button>
    </div>
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
  // eslint-disable-next-line security/detect-unsafe-regex -- thousands separator on a short run of digits: the lookahead repeats a fixed 3-digit group and cannot backtrack catastrophically
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
        action={{
          label: 'Ask Sen',
          icon: SenMark,
          onSelect: () => useUi.getState().askSen('I want to add a subscription: '),
        }}
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
                {r.rateFrom
                  ? r.rateFrom.source === 'charge'
                    ? ', from the last charge'
                    : `, ${r.rateFrom.source.toUpperCase()} ${shortDay(r.rateFrom.on)}`
                  : ''}
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
    <div className="flex flex-col border-t border-border px-4 py-1">
      {/* drawn 40 px, a secondary control (D129); tap gives it the 48 px target, inside the 4 px padding above and below */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tap relative flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm"
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
