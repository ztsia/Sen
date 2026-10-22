import { useState } from 'react';
import { PiggyBankIcon, PlusIcon } from 'lucide-react';
import type { BudgetsView } from '@sen/core/views';
import { BudgetMeter } from '@/blocks/charts';
import { GroupCard } from '@/blocks/group';
import { MoneyInput, checkAmount } from '@/blocks/money-input';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Button } from '@/components/ui/button';
import { useBudgets, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded } from '../kit';

/**
 * Budgets (screens.md, D29, D31): each category's budget against what's spent, with a tick where the
 * cycle is. Those at risk come first (D130). Tap one to change it; an amount of 0 removes it. Adding
 * one is in the app bar.
 */
export default function Budgets() {
  const q = useBudgets();
  const [editing, setEditing] = useState<Editing | null>(null);
  const others = q.data?.others ?? [];
  return (
    <Screen
      bar={
        <AppBar
          title="Budgets"
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={!others.length}
              aria-label="Add a budget"
              onClick={() => setEditing({ categoryId: null, label: '', cap: null })}
            >
              <PlusIcon aria-hidden="true" />
              Add
            </Button>
          }
        />
      }
    >
      <Loaded q={q} what="your budgets">
        {(v) => <BudgetsBody v={v} onEdit={setEditing} />}
      </Loaded>
      <BudgetSheet editing={editing} others={others} onClose={() => setEditing(null)} />
    </Screen>
  );
}

/** What the sheet edits: an existing budget (a label and its cap), or a new one that picks its category first. */
type Editing = { categoryId: string | null; label: string; cap: number | null };

type Row = BudgetsView['rows'][number];

/** The same test BudgetMeter draws its warning with: spent is past the cycle's share by more than 10 points. */
const atRisk = (r: Row, cycleShare: number) => r.sen / r.cap > cycleShare + 0.1;

function BudgetsBody({ v, onEdit }: { v: BudgetsView; onEdit: (e: Editing) => void }) {
  const cycle = `${v.cycle.label}, ${shortDay(v.cycle.start)} – ${shortDay(v.cycle.end)}.`;
  if (!v.rows.length)
    return (
      <div className="flex flex-col pb-4">
        <p className="px-4 pt-1 pb-2 text-sm text-muted-foreground">{cycle}</p>
        <EmptyState
          icon={PiggyBankIcon}
          title="No budgets yet"
          line="Add one to see how a category is going."
          action={
            v.others.length
              ? { label: 'Add a budget', onSelect: () => onEdit({ categoryId: null, label: '', cap: null }) }
              : undefined
          }
        />
      </div>
    );
  const risky = v.rows.filter((r) => atRisk(r, v.cycleShare));
  const fine = v.rows.filter((r) => !atRisk(r, v.cycleShare));
  const groups: [string, Row[]][] = [
    ['At risk', risky],
    ['On track', fine],
  ];
  return (
    <div className="flex flex-col gap-6 pt-1 pb-4">
      <p className="px-4 text-sm text-muted-foreground">
        {cycle} Tap a budget to change it. The line on each bar is how far through the cycle you are.
      </p>
      {groups.map(([title, rows]) =>
        rows.length ? (
          <GroupCard key={title} label={title}>
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left')}
                onClick={() => onEdit({ categoryId: r.categoryId, label: r.label, cap: r.cap })}
              >
                <IconTile icon={categoryIcon(r.label)} tone={categoryTone(r.label)} />
                <span className="min-w-0 flex-1">
                  <BudgetMeter label={r.label} sen={r.sen} cap={r.cap} cycleShare={v.cycleShare} />
                </span>
              </button>
            ))}
          </GroupCard>
        ) : null,
      )}
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
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]"
          role="group"
          aria-label="Category"
        >
          {others.map((o) => (
            <Button
              key={o.id}
              variant={categoryId === o.id ? 'default' : 'outline'}
              size="chip"
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
      <Button onClick={() => void save()}>Save</Button>
    </div>
  );
}
