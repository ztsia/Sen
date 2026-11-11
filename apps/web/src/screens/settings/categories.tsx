import { useState } from 'react';
import { ArchiveIcon, LayoutGridIcon, ListChecksIcon, PlusIcon, TagsIcon, Undo2Icon } from 'lucide-react';
import { Segmented } from '@/blocks/choice';
import { GroupCard, SwitchRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Command } from '@sen/core/commands';
import { toastDone, toastUndo } from '@/blocks/toast';
import { runCommand, useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { readableName } from '@/lib/names';
import { newId } from '@/lib/uid';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded } from '../kit';

type Cat = {
  id: string;
  name: string;
  kind: 'spend' | 'income';
  rules: number;
  meal: boolean;
  beverage: boolean;
  discretionary: boolean;
  system: 'salary' | 'cash' | 'unaccounted' | null;
  archived: boolean;
};
const NAME_MAX = 40;

/** A typed name, trimmed: the words to show when it can't be saved, or null when it can. */
const nameError = (text: string) =>
  text.trim() === '' ? 'Type a name.' : text.trim().length > NAME_MAX ? `Keep it to ${NAME_MAX} characters.` : null;

/**
 * A rename or an add. A taken name is said under the Name field, where it's put right, not in a toast
 * over the sheet: the server names the field it refuses (QA B08 run 3, 3).
 */
async function writeNamed(cmd: Command, onName: (message: string) => void) {
  try {
    const r = await runCommand(cmd);
    if (!r.failed) {
      if (r.canUndo) toastUndo(r.said, r.undo);
      else toastDone(r.said);
    }
    return r;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'That didn’t save. Try again.';
    if ((e as { field?: unknown }).field === 'name') onName(message);
    else toastDone(message);
    return null;
  }
}
type Rule = { id: string; merchant: string; category: string; hawker: boolean; setBy: 'user' | 'agent' };

/**
 * Settings → Categories and rules (screens.md; D70, D130): the categories as a grid of tinted tiles,
 * and the merchant rules as sentences. A rule's hawker switch is the change made here.
 */
export default function Categories() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Categories and rules" />}>
      <Loaded q={q} what="your categories" skeleton={<ListSkeleton rows={6} />}>
        {(v) => <Body categories={v.categories} rules={v.rules ?? []} />}
      </Loaded>
    </Screen>
  );
}

function Body({ categories, rules }: { categories: Cat[]; rules: Rule[] }) {
  const [tab, setTab] = useState<'categories' | 'rules'>('categories');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = categories.find((c) => c.id === openId) ?? null;
  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <Segmented
        label="Show"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'categories', label: 'Categories', icon: TagsIcon },
          { value: 'rules', label: 'Rules', icon: ListChecksIcon },
        ]}
      />
      {tab === 'categories' ? (
        <>
          {/* above both groups, so it reads as for either, not as the income group's (QA B08 run 3, eyes) */}
          <div className="px-4">
            <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden="true" />
              Add a category
            </Button>
          </div>
          <CategoryGrid categories={categories} onOpen={setOpenId} />
        </>
      ) : (
        <RuleList rules={rules} />
      )}
      <AddSheet open={adding} onOpenChange={setAdding} />
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={open?.name ?? 'Category'}
        description={open ? (open.kind === 'income' ? 'An income category' : 'A spending category') : undefined}
      >
        {open ? (
          <CategoryDetail
            key={open.id}
            cat={open}
            rules={rules.filter((r) => r.category === open.name)}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function CategoryGrid({ categories, onOpen }: { categories: Cat[]; onOpen: (id: string) => void }) {
  const write = useWrite();
  if (!categories.length)
    return (
      <EmptyState
        icon={LayoutGridIcon}
        title="No categories yet"
        line="Sen’s starting list comes with first run. One you add now joins it."
      />
    );
  const live = categories.filter((c) => !c.archived);
  const groups = [
    { label: 'Spending categories', items: live.filter((c) => c.kind === 'spend') },
    { label: 'Income categories', items: live.filter((c) => c.kind === 'income') },
  ];
  const archived = categories.filter((c) => c.archived);
  return (
    <>
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.label} className="flex flex-col gap-2 px-4" aria-label={g.label}>
            <h2 className="text-sm font-medium text-muted-foreground">{g.label}</h2>
            <ul className="grid grid-cols-3 gap-2">
              {g.items.map((c) => (
                <li key={c.id} className="flex">
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    aria-label={`${c.name}, ${c.rules ? `${c.rules} ${c.rules === 1 ? 'rule' : 'rules'}` : 'no rules'}`}
                    className="flex min-h-24 w-full flex-col items-center gap-2 rounded-[var(--radius-card,16px)] bg-card px-1.5 py-3 text-center"
                  >
                    <IconTile icon={categoryIcon(c.name)} tone={categoryTone(c.name)} />
                    <span className="line-clamp-2 text-sm leading-tight">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {archived.length ? (
        <GroupCard label="Archived">
          {archived.map((c) => (
            <div key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">{c.name}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Bring back ${c.name}`}
                onClick={() => void write({ type: 'category.archive', id: c.id, archived: false })}
              >
                <Undo2Icon aria-hidden="true" />
                Bring back
              </Button>
            </div>
          ))}
        </GroupCard>
      ) : null}
    </>
  );
}

/** What a category holds and how to change it: its name, its flags, its rules, and archiving it. */
function CategoryDetail({ cat, rules, onClose }: { cat: Cat; rules: Rule[]; onClose: () => void }) {
  const write = useWrite();
  const [name, setName] = useState(cat.name);
  const [error, setError] = useState<string | null>(null);
  const flags = cat.kind === 'spend' && cat.system !== 'unaccounted';
  const save = async () => {
    const e = nameError(name);
    setError(e);
    if (e) return;
    const next = name.trim();
    if (next === cat.name) return;
    await writeNamed({ type: 'category.edit', id: cat.id, name: next }, setError);
  };
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center gap-3">
        <IconTile size="lg" icon={categoryIcon(cat.name)} tone={categoryTone(cat.name)} />
        <p className="text-base">{cat.rules ? `${cat.rules} ${cat.rules === 1 ? 'rule' : 'rules'}` : 'No rules yet'}</p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="category-name">Name</FieldLabel>
          <Input
            id="category-name"
            value={name}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setError(null);
              setName(e.target.value);
            }}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Button type="submit">Save</Button>
      </form>
      {flags ? (
        <GroupCard label="Counts as">
          <SwitchRow
            title="Meal"
            description="Counts toward your meal average"
            checked={cat.meal}
            onCheckedChange={(on) => void write({ type: 'category.edit', id: cat.id, meal: on })}
          />
          <SwitchRow
            title="Drink"
            description="Counts only when it's the whole payment"
            checked={cat.beverage}
            onCheckedChange={(on) => void write({ type: 'category.edit', id: cat.id, beverage: on })}
          />
          <SwitchRow
            title="Discretionary"
            description="Spending you could choose not to make"
            checked={cat.discretionary}
            onCheckedChange={(on) => void write({ type: 'category.edit', id: cat.id, discretionary: on })}
          />
        </GroupCard>
      ) : null}
      {cat.system === 'unaccounted' ? (
        <p className="text-sm text-muted-foreground">
          Only balance checks book to it, so it can't be picked for a payment.
        </p>
      ) : null}
      {rules.length ? (
        <ul aria-label={`Rules for ${cat.name}`} className="flex flex-col gap-1 text-base">
          {rules.map((r) => (
            <li key={r.id}>When the payee has “{readableName(r.merchant)}”</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">A merchant gets a rule the first time you answer for it.</p>
      )}
      {cat.system ? (
        <p className="text-sm text-muted-foreground">Sen relies on this one, so it can be renamed but not archived.</p>
      ) : (
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            const r = await write({ type: 'category.archive', id: cat.id, archived: true });
            if (r) onClose();
          }}
        >
          <ArchiveIcon aria-hidden="true" />
          Archive
        </Button>
      )}
    </div>
  );
}

function AddSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'spend' | 'income'>('spend');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const e = nameError(name);
    setError(e);
    if (e) return;
    setBusy(true);
    const r = await writeNamed({ type: 'category.add', id: newId(), name: name.trim(), kind }, setError);
    setBusy(false);
    if (r) {
      setName('');
      setKind('spend');
      onOpenChange(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add a category">
      <form
        className="flex flex-col gap-4 pt-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void add();
        }}
      >
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
          <Input
            id="new-category-name"
            value={name}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setError(null);
              setName(e.target.value);
            }}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel id="new-category-kind">It is for</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            aria-labelledby="new-category-kind"
            value={kind}
            onValueChange={(v) => v && setKind(v as 'spend' | 'income')}
          >
            <ToggleGroupItem value="spend">Spending</ToggleGroupItem>
            <ToggleGroupItem value="income">Money in</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Button type="submit" aria-disabled={busy || undefined}>
          Add
        </Button>
      </form>
    </Sheet>
  );
}

function RuleList({ rules }: { rules: Rule[] }) {
  const write = useWrite();
  if (!rules.length)
    return (
      <EmptyState
        icon={ListChecksIcon}
        title="No rules yet"
        line="A merchant gets a rule the first time you answer for it: its category follows it from then on."
      />
    );
  return (
    <>
      <p className="px-4 text-sm text-muted-foreground">
        A rule files a merchant's payments under a category, so you only answer once.
      </p>
      <GroupCard label="Merchant rules">
        {rules.map((r) => (
          <SwitchRow
            key={r.id}
            icon={categoryIcon(r.category)}
            tone={categoryTone(r.category)}
            title={`When the payee has “${readableName(r.merchant)}” → ${r.category}`}
            // the switch says what it turns on (QA B04 redesign run 3, 12)
            name={`${readableName(r.merchant)} is a hawker`}
            // where it came from, and the switch's state in words either way (QA B04 redesign, finding 8)
            description={`${r.setBy === 'agent' ? "Sen's suggestion, confirmed" : 'From your answer'} · ${r.hawker ? 'A hawker' : 'Not a hawker'}`}
            checked={r.hawker}
            onCheckedChange={(on) => void write({ type: 'setting.set', key: `rules.${r.id}.hawker`, value: on })}
          />
        ))}
      </GroupCard>
    </>
  );
}
