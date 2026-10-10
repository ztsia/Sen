import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import type { BudgetsView } from '@sen/core/views';
import { BudgetMeter } from '@/blocks/charts';
import { MoneyInput, checkAmount } from '@/blocks/money-input';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { useBudgets, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BottomAction } from '../capture/common';
import { Loaded } from '../kit';

/**
 * Budgets (screens.md, D29, D31): each category's budget against what's spent, with a tick where the
 * cycle is. Tap one to change it; an amount of 0 removes it.
 */
export default function Budgets() {
  const q = useBudgets();
  return (
    <Screen bar={<AppBar title="Budgets" />}>
      <Loaded q={q} what="your budgets">
        {(v) => <BudgetsBody v={v} />}
      </Loaded>
    </Screen>
  );
}

/** What the sheet edits: an existing budget (a label and its cap), or a new one that picks its category first. */
type Editing = { categoryId: string | null; label: string; cap: number | null };

function BudgetsBody({ v }: { v: BudgetsView }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  return (
    <div className="flex min-h-full flex-col">
      <p className="px-4 pt-1 pb-2 text-sm text-muted-foreground">
        {v.cycle.label}, {shortDay(v.cycle.start)} – {shortDay(v.cycle.end)}. Tap a budget to change it. The line on
        each bar is how far through the cycle you are.
      </p>
      {v.rows.length ? (
        <ul className="flex flex-col">
          {v.rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="min-h-16 w-full px-4 py-3 text-left active:bg-accent"
                onClick={() => setEditing({ categoryId: r.categoryId, label: r.label, cap: r.cap })}
              >
                <BudgetMeter label={r.label} sen={r.sen} cap={r.cap} cycleShare={v.cycleShare} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState line="No budgets yet. Add one to see how a category is going." />
      )}
      <BottomAction>
        <Button
          size="lg"
          disabled={!v.others.length}
          onClick={() => setEditing({ categoryId: null, label: '', cap: null })}
        >
          <PlusIcon aria-hidden="true" />
          Add a budget
        </Button>
      </BottomAction>
      <BudgetSheet editing={editing} others={v.others} onClose={() => setEditing(null)} />
    </div>
  );
}

function BudgetSheet({
  editing,
  others,
  onClose,
}: {
  editing: Editing | null;
  others: BudgetsView['others'];
  onClose: () => void;
}) {
  // the sheet's body remounts for each budget, so what was typed for one never leaks into the next
  return (
    <Sheet
      open={editing !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={editing?.categoryId ? editing.label : 'Add a budget'}
      description="Each cycle. Type 0 to remove it."
    >
      {editing ? (
        <BudgetForm key={editing.categoryId ?? 'new'} editing={editing} others={others} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}

/** A budget's amount as the text the field starts with: its digits, split before the last two (no division). */
function sentText(cap: number | null): string {
  if (cap === null) return '';
  const digits = String(cap).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function BudgetForm({
  editing,
  others,
  onClose,
}: {
  editing: Editing;
  others: BudgetsView['others'];
  onClose: () => void;
}) {
  const write = useWrite();
  const [categoryId, setCategoryId] = useState(editing.categoryId);
  const [text, setText] = useState(sentText(editing.cap));
  const [error, setError] = useState<string | undefined>();
  const save = async () => {
    if (!categoryId) return setError('Pick a category first.');
    const r = checkAmount(text);
    if (r.error !== undefined) return setError(r.error);
    onClose();
    await write({ type: 'budget.set', categoryId, amount: r.sen });
  };
  return (
    <div className="flex flex-col gap-4">
      {editing.categoryId === null ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {others.map((o) => (
            <Button
              key={o.id}
              variant={categoryId === o.id ? 'default' : 'outline'}
              size="sm"
              aria-pressed={categoryId === o.id}
              className={cn(categoryId === o.id && 'font-semibold')}
              onClick={() => {
                setCategoryId(o.id);
                setError(undefined);
              }}
            >
              {o.label}
            </Button>
          ))}
        </div>
      ) : null}
      <MoneyInput
        label="Budget each cycle"
        value={text}
        onChange={(t) => {
          setText(t);
          setError(undefined);
        }}
        error={error}
        autoFocus={editing.categoryId !== null}
        onEnter={() => void save()}
      />
      <Button size="lg" onClick={() => void save()}>
        Save
      </Button>
    </div>
  );
}
