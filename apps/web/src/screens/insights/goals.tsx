import { ChevronRightIcon } from 'lucide-react';
import type { GoalSummary, GoalsView } from '@sen/core/views';
import { GoalMeter } from '@/blocks/charts';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { useGoals } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded, Section, useGo } from '../kit';

/**
 * Goals (screens.md, spec §10): each goal and bucket with its meter, what it needs each cycle, and the
 * median surplus that needs paying for, with how many cycles it comes from.
 */
export default function Goals() {
  const q = useGoals();
  return (
    <Screen bar={<AppBar title="Goals" />}>
      <Loaded q={q} what="your goals">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: GoalsView }) {
  const go = useGo();
  if (!v.goals.length) return <EmptyState line="Your goals and buckets show here once you've set one." />;
  const groups: [string, GoalSummary[]][] = [
    ['Goals', v.goals.filter((g) => g.kind === 'goal')],
    ['Buckets', v.goals.filter((g) => g.kind === 'bucket')],
  ];
  return (
    <div className="flex flex-col pb-4">
      <p className="px-4 pt-1 text-sm text-muted-foreground" data-testid="surplus">
        {v.sample ? (
          <>
            Your median surplus is <Money sen={v.medianSurplus} className="font-normal text-foreground" /> over{' '}
            {v.sample} {v.sample === 1 ? 'cycle' : 'cycles'}.
          </>
        ) : (
          'Too early to say what you can set aside: no full cycle yet.'
        )}
      </p>
      {groups.map(([title, rows]) =>
        rows.length ? (
          <Section key={title} title={title}>
            <ul className="flex flex-col">
              {rows.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
                    onClick={() => go('goal', { id: g.id })}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <GoalMeter label={g.name} saved={g.saved} target={g.target} />
                      <span className="text-sm text-muted-foreground">
                        Needs <Money sen={g.perCycle} className="font-normal text-foreground" /> a cycle
                        {g.targetDate ? ` to be done by ${shortDay(g.targetDate)}` : ''}
                      </span>
                    </span>
                    <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        ) : null,
      )}
    </div>
  );
}
