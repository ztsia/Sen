import { ChevronRightIcon, TargetIcon } from 'lucide-react';
import { formatSen, percent } from '@sen/core/money';
import type { GoalSummary, GoalsView } from '@sen/core/views';
import { GroupCard } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { useGoals } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Loaded, useGo } from '../kit';

/**
 * Goals (screens.md, spec §10): each goal and bucket with its progress, what it needs each cycle, and
 * the median surplus that needs paying for, with how many cycles it comes from.
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

/**
 * A progress ring (D130), in the accent: saved against its target, with the percentage in its middle.
 * Not a risk meter, like GoalMeter: a goal that's behind isn't an alarm, so it never takes the warning.
 * Composed here, not in blocks/charts.tsx, since no block draws a ring yet.
 */
export function GoalRing({ saved, target, size = 'md' }: { saved: number; target: number; size?: 'md' | 'lg' }) {
  const share = target > 0 ? Math.min(1, saved / target) : 0;
  const r = 20;
  const c = 2 * Math.PI * r;
  const px = size === 'lg' ? 96 : 48;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
      <svg viewBox="0 0 48 48" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="var(--chart-accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
        />
      </svg>
      <span className={cn('num absolute font-semibold', size === 'lg' ? 'text-lg' : 'text-xs')} aria-hidden="true">
        {percent(share)}%
      </span>
    </span>
  );
}

function Body({ v }: { v: GoalsView }) {
  const go = useGo();
  if (!v.goals.length)
    return <EmptyState icon={TargetIcon} line="Your goals and buckets show here once you've set one." />;
  const groups: [string, GoalSummary[]][] = [
    ['Goals', v.goals.filter((g) => g.kind === 'goal')],
    ['Buckets', v.goals.filter((g) => g.kind === 'bucket')],
  ];
  return (
    <div className="flex flex-col gap-6 pt-1 pb-4">
      <p className="px-4 text-sm text-muted-foreground" data-testid="surplus">
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
          <GroupCard key={title} label={title}>
            {rows.map((g) => (
              <button
                key={g.id}
                type="button"
                className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
                onClick={() => go('goal', { id: g.id })}
              >
                <GoalRing saved={g.saved} target={g.target} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-medium">{g.name}</span>
                  <span className="num text-sm text-muted-foreground">
                    {formatSen(g.saved)} of {formatSen(g.target)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Needs <Money sen={g.perCycle} className="font-normal text-foreground" /> a cycle
                    {g.targetDate ? ` to be done by ${shortDay(g.targetDate)}` : ''}
                  </span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
              </button>
            ))}
          </GroupCard>
        ) : null,
      )}
    </div>
  );
}
