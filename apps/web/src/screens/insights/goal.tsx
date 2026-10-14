import { CheckIcon, CircleAlertIcon, InboxIcon } from 'lucide-react';
import { formatSen, percent } from '@sen/core/money';
import type { GoalView } from '@sen/core/views';
import { HeaderCard, FactGrid, type GridFact } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { Card } from '@/components/ui/card';
import { useGoal } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { longDay, momentLabel, shortDay } from '@/lib/dates';
import { Loaded, useScreenSearch } from '../kit';
import { GoalRing } from './goals';

/**
 * One goal (screens.md, spec §10): its ring and amount on top, what it needs each cycle, the median
 * surplus that said whether it's feasible (with the sample it comes from), when it finishes at today's
 * pace, and what's been put in.
 */
export default function Goal() {
  const { id } = useScreenSearch();
  const q = useGoal(id ?? '');
  return (
    <Screen bar={<AppBar title="Goal" />}>
      {id ? (
        <Loaded q={q} what="this goal">
          {(v) => (v ? <Body v={v} /> : <EmptyState line="That goal isn't here any more." />)}
        </Loaded>
      ) : (
        <EmptyState line="Pick a goal from Goals to see it here." />
      )}
    </Screen>
  );
}

function Body({ v }: { v: GoalView }) {
  const g = v.goal;
  const Icon = v.feasible ? CheckIcon : CircleAlertIcon;
  const cycles = `${v.sample} ${v.sample === 1 ? 'cycle' : 'cycles'}`;
  const share = g.target > 0 ? percent(Math.min(1, g.saved / g.target)) : '0';
  const facts: GridFact[] = [
    { label: 'Needs a cycle', value: <Money sen={g.perCycle} /> },
    { label: 'Target', value: <Money sen={g.target} /> },
    {
      label: 'Done by',
      value: g.targetDate ? shortDay(g.targetDate) : 'No date set',
      muted: !g.targetDate,
    },
    {
      label: 'At this pace',
      value: v.projectedFinish ? `About ${longDay(v.projectedFinish)}` : 'Nothing put in yet',
      muted: !v.projectedFinish,
    },
    // where its money sits (D133): payday's plan moves it there
    { label: 'Kept in', value: g.keptIn ?? 'Not set', muted: !g.keptIn, wide: true },
    {
      label: 'Median surplus',
      value: v.sample === 0 ? 'Too early to say' : `${formatSen(v.medianSurplus)} over ${cycles}`,
      muted: v.sample === 0,
      wide: true,
    },
  ];
  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <HeaderCard
        mark={<GoalRing saved={g.saved} target={g.target} size="lg" />}
        title={g.name}
        figure={<Money sen={g.saved} />}
        meta={`of ${formatSen(g.target)} · ${share}% saved`}
        source={g.kind === 'bucket' ? 'A bucket' : 'A goal'}
      />
      <FactGrid facts={facts} />
      <Card className="mx-4 flex-row items-start gap-3 py-3 pr-4 pl-4 text-base">
        <Icon className="mt-0.5 size-5 shrink-0 text-icon" aria-hidden="true" />
        <p data-testid="feasible">
          {v.sample === 0 ? (
            'Too early to say if it fits: there is no full cycle to compare with yet.'
          ) : (
            <>
              {v.feasible ? 'Within reach' : 'A stretch'}: your median surplus is{' '}
              <Money sen={v.medianSurplus} className="font-normal" /> over {cycles}
              {v.feasible ? ', which covers it.' : ', which falls short of it.'}
            </>
          )}
        </p>
      </Card>
      <GroupCard label="Put in so far">
        {v.contributions.length ? (
          v.contributions.map((c) => (
            <NavRow key={c.at} title={momentLabel(new Date(c.at))} value={<Money sen={c.sen} />} />
          ))
        ) : (
          <EmptyState icon={InboxIcon} line="Nothing put in yet." />
        )}
      </GroupCard>
    </div>
  );
}
