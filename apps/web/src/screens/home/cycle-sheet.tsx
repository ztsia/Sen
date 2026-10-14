import { TrendingUpIcon } from 'lucide-react';
import { StatTiles } from '@/blocks/facts';
import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { ListSkeleton } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Card } from '@/components/ui/card';
import { useCycle } from '@/data/hooks';
import { longDay, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `cycle` (screens.md): how *left until payday* is worked out, and where it will end. Income received,
 * spending, the result as three figures with the last emphasised; the cycle's dates and expected
 * payday; and the estimate at payday, labelled as one. Counting by month, this month's spending
 * against last month's instead (D79).
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
            {c.cycle.basis === 'pay' && !c.salary ? (
              // before the first salary: what's been spent, never a misleading "over" (QA B03 run 3, 34)
              <StatTiles
                className="px-0"
                stats={[
                  ...(c.income ? [{ label: 'Money in so far', value: <Money sen={c.income} kind="in" /> }] : []),
                  {
                    label: 'Spent since you started',
                    value: <Money sen={c.spending} className="font-semibold" />,
                    emphasis: true,
                  },
                ]}
              />
            ) : c.cycle.basis === 'month' ? (
              <StatTiles
                className="px-0"
                stats={[
                  { label: 'Spent this month', value: <Money sen={c.spending} />, emphasis: true },
                  ...(c.lastSpending !== null ? [{ label: 'Last month', value: <Money sen={c.lastSpending} /> }] : []),
                ]}
              />
            ) : (
              <StatTiles
                className="px-0"
                stats={[
                  { label: 'Income received', value: <Money sen={c.income} kind="in" /> },
                  { label: 'Spending', value: <Money sen={c.spending} /> },
                  {
                    label: c.result < 0 ? 'Over by' : 'Left until payday',
                    value: (
                      <Money
                        sen={Math.abs(c.result)}
                        kind={c.result < 0 ? 'warning' : 'out'}
                        className="font-semibold"
                      />
                    ),
                    emphasis: true,
                  },
                ]}
              />
            )}
            {c.estimate !== null ? (
              <Card className="flex-row items-start gap-3 p-3 text-sm">
                <IconTile icon={TrendingUpIcon} tone="accent" />
                <p>
                  <span className="font-medium">An estimate:</span> at this pace, about{' '}
                  <Money sen={Math.abs(c.estimate)} className="font-medium" /> {c.estimate < 0 ? 'over' : 'left'} on
                  payday. It assumes you keep spending as you have so far.
                </p>
              </Card>
            ) : null}
          </div>
        )}
      </Loaded>
    </Sheet>
  );
}
