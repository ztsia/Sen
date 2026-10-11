import { CheckIcon, CircleAlertIcon } from 'lucide-react';
import type { GoalView } from '@sen/core/views';
import { GoalMeter } from '@/blocks/charts';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { useGoal } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { longDay, momentLabel, shortDay } from '@/lib/dates';
import { Loaded, Section, useScreenSearch } from '../kit';

/**
 * One goal (screens.md, spec §10): its amount, what it needs each cycle, whether that's feasible
 * against the median surplus (said with the sample it comes from), when it finishes at today's pace,
 * and what's been put in.
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
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <h2 className="text-xl font-semibold wrap-anywhere">{g.name}</h2>
      <GoalMeter label={g.kind === 'bucket' ? 'Bucket' : 'Goal'} saved={g.saved} target={g.target} />
      <p>
        Needs <Money sen={g.perCycle} /> a cycle
        {g.targetDate ? ` to be done by ${shortDay(g.targetDate)}` : ''}.
      </p>
      <p className="flex items-start gap-2" data-testid="feasible">
        <Icon className="mt-0.5 size-5 shrink-0 text-icon" aria-hidden="true" />
        <span>
          {v.sample === 0 ? (
            'Too early to say if it fits: there is no full cycle to compare with yet.'
          ) : (
            <>
              {v.feasible ? 'Within reach' : 'A stretch'}: your median surplus is{' '}
              <Money sen={v.medianSurplus} className="font-normal" /> over {cycles}
              {v.feasible ? ', which covers it.' : ', which falls short of it.'}
            </>
          )}
        </span>
      </p>
      <p>
        {v.projectedFinish ? (
          <>At the pace so far it's done around {longDay(v.projectedFinish)}. That's an estimate.</>
        ) : (
          'Nothing put in yet, so there is no finish date to project.'
        )}
      </p>
      <Section title="Put in so far">
        {v.contributions.length ? (
          <ul className="flex flex-col">
            {v.contributions.map((c) => (
              <li key={c.at} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <span className="text-sm text-muted-foreground">{momentLabel(new Date(c.at))}</span>
                <Money sen={c.sen} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 text-sm text-muted-foreground">Nothing yet.</p>
        )}
      </Section>
    </div>
  );
}
