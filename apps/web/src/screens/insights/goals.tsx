import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { useState } from 'react';
import { ChevronRightIcon, PlusIcon, TargetIcon } from 'lucide-react';
import { formatSen, percent } from '@sen/core/money';
import type { GoalSummary, GoalsView } from '@sen/core/views';
import { GroupCard } from '@/blocks/group';
import { MoneyInput, checkAmount } from '@/blocks/money-input';
import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAccountList, useGoals, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { klDay } from '@sen/core/cycles';
import { nowIso } from '@/lib/clock';
import { shortDay } from '@/lib/dates';
import { newId } from '@/lib/uid';
import { cn } from '@/lib/utils';
import { Loaded, useGo } from '../kit';

/**
 * Goals (screens.md, spec §10): each goal and bucket with its progress, what it needs each cycle, and
 * the median surplus that needs paying for, with how many cycles it comes from. Adding one by hand is
 * in the app bar (D134); it's kept in one of the person's accounts, so it needs one to add to.
 */
export default function Goals() {
  const q = useGoals();
  const accounts = useAccountList();
  const [adding, setAdding] = useState(false);
  const kept = [...(accounts.data?.tracked ?? []), ...(accounts.data?.elsewhere ?? [])];
  return (
    <Screen
      bar={
        <AppBar
          title="Goals"
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={!kept.length}
              aria-label="Add a goal"
              onClick={() => setAdding(true)}
            >
              <PlusIcon aria-hidden="true" />
              Add
            </Button>
          }
        />
      }
    >
      <Loaded q={q} what="your goals">
        {(v) => <Body v={v} />}
      </Loaded>
      <Sheet open={adding} onOpenChange={setAdding} title="Add a goal">
        {/* the form's body remounts each time the sheet opens, so nothing typed for one shows in the next */}
        {adding ? <GoalForm accounts={kept} onClose={() => setAdding(false)} /> : null}
      </Sheet>
    </Screen>
  );
}

/** Which field an error is about: one message at a time (Budgets). */
type Where = 'name' | 'target' | 'by' | 'account';

/** Adds a goal or a yearly bucket by hand (D134): its name, what it's for, its target, when, and the account it's kept in. */
function GoalForm({ accounts, onClose }: { accounts: { id: string; name: string }[]; onClose: () => void }) {
  const write = useWrite();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'goal' | 'bucket'>('goal');
  const [target, setTarget] = useState('');
  const [by, setBy] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<{ at: Where; message: string }>();
  const save = async () => {
    if (name.trim() === '') return setError({ at: 'name', message: 'Type its name.' });
    const r = checkAmount(target);
    if (r.error !== undefined && target !== '') return setError({ at: 'target', message: r.error });
    const sen = r.sen;
    if (sen === undefined || sen === 0) return setError({ at: 'target', message: 'Type the target.' });
    // a date already gone can't be saved for (QA B04 redesign run 4, 10)
    if (by !== '' && by <= klDay(nowIso())) return setError({ at: 'by', message: 'Pick a day after today.' });
    if (accountId === null) return setError({ at: 'account', message: "Pick the account it's kept in." });
    onClose();
    await write({
      type: 'goal.add',
      id: newId(),
      name: name.trim(),
      kind,
      target: sen,
      by: by === '' ? null : by,
      accountId,
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={error?.at === 'name' ? true : undefined}>
        <FieldLabel htmlFor="goal-name">Name</FieldLabel>
        <Input
          id="goal-name"
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
        <FieldLabel id="goal-kind">Kind</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          aria-labelledby="goal-kind"
          value={kind}
          onValueChange={(v) => v && setKind(v as 'goal' | 'bucket')}
        >
          <ToggleGroupItem value="goal">A goal</ToggleGroupItem>
          <ToggleGroupItem value="bucket">Every year</ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <MoneyInput
        label="Target"
        value={target}
        onChange={(t) => {
          setError(undefined);
          setTarget(t);
        }}
        error={error?.at === 'target' ? error.message : undefined}
        onEnter={() => void save()}
      />
      <Field data-invalid={error?.at === 'by' ? true : undefined}>
        <FieldLabel htmlFor="goal-by">By when (optional)</FieldLabel>
        <Input
          id="goal-by"
          type="date"
          value={by}
          aria-invalid={error?.at === 'by' ? true : undefined}
          onChange={(e) => {
            setError(undefined);
            setBy(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />
        {error?.at === 'by' ? <FieldError>{error.message}</FieldError> : null}
      </Field>
      <Field data-invalid={error?.at === 'account' ? true : undefined}>
        <FieldLabel id="goal-account">Kept in</FieldLabel>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]"
          role="group"
          aria-labelledby="goal-account"
        >
          {accounts.map((a) => (
            <Button
              key={a.id}
              variant={accountId === a.id ? 'default' : 'outline'}
              size="chip"
              aria-pressed={accountId === a.id}
              className={cn(accountId === a.id && 'font-semibold')}
              onClick={() => {
                setAccountId(a.id);
                setError(undefined);
              }}
            >
              {a.name}
            </Button>
          ))}
        </div>
        {error?.at === 'account' ? (
          <FieldError>{error.message}</FieldError>
        ) : (
          <FieldDescription>Sen can't move money: on payday it says how much to move here.</FieldDescription>
        )}
      </Field>
      <Button onClick={() => void save()}>Save</Button>
    </div>
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
    return (
      <EmptyState
        icon={TargetIcon}
        title="No goals yet"
        line="Tell Sen what you're saving for, and your goals and buckets show here."
        action={{ label: 'Ask Sen', icon: SenMark, onSelect: () => useUi.getState().askSen('I want to save for ') }}
      />
    );
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
                    {g.keptIn ? ` · in ${g.keptIn}` : ''}
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
