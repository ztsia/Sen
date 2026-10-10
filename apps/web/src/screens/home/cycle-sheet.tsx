import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { ListSkeleton } from '@/blocks/states';
import { useCycle } from '@/data/hooks';
import { longDay, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `cycle` (screens.md): how *left until payday* is worked out, and where it will end. Income received,
 * spending, the result; the cycle's dates and expected payday; and the estimate at payday, labelled as
 * one. Counting by month, this month's spending against last month's instead (D79).
 */
export function CycleSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const q = useCycle();
  const title = q.data?.cycle.basis === 'month' ? 'This month' : 'This cycle';
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <Loaded q={q} what="this cycle" skeleton={<ListSkeleton rows={3} />}>
        {(c) => (
          <div className="flex flex-col gap-4 pb-2">
            <p className="text-sm text-muted-foreground">
              {c.cycle.label}: {shortDay(c.cycle.start)} to {shortDay(c.cycle.end)}
              {c.cycle.basis === 'pay' && c.cycle.expectedPayday
                ? `. Payday expected ${longDay(c.cycle.expectedPayday)}`
                : ''}
            </p>
            <dl className="flex flex-col">
              {c.cycle.basis === 'month' ? (
                <>
                  <Row label="Spent this month" value={<Money sen={c.spending} />} />
                  {c.lastSpending !== null ? <Row label="Last month" value={<Money sen={c.lastSpending} />} /> : null}
                </>
              ) : (
                <>
                  <Row label="Income received" value={<Money sen={c.income} kind="in" />} />
                  <Row label="Spending" value={<Money sen={c.spending} />} />
                  <Row
                    label={c.result < 0 ? 'Over by' : 'Left until payday'}
                    value={
                      <Money
                        sen={Math.abs(c.result)}
                        kind={c.result < 0 ? 'warning' : 'out'}
                        className="font-semibold"
                      />
                    }
                    strong
                  />
                </>
              )}
            </dl>
            {c.estimate !== null ? (
              <p className="rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">An estimate:</span> at this pace, about{' '}
                <Money sen={Math.abs(c.estimate)} className="font-medium" /> {c.estimate < 0 ? 'over' : 'left'} on
                payday. It assumes you keep spending as you have so far.
              </p>
            ) : null}
          </div>
        )}
      </Loaded>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div
      className={`flex min-h-12 items-baseline justify-between gap-4 border-b border-border py-3 ${strong ? 'font-semibold' : ''}`}
    >
      <dt className={strong ? '' : 'text-muted-foreground'}>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
