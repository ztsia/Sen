import { useState } from 'react';
import { ListChecksIcon, TagsIcon } from 'lucide-react';
import { Segmented } from '@/blocks/choice';
import { GroupCard, SwitchRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { readableName } from '@/lib/names';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded } from '../kit';

type Cat = { id: string; name: string; kind: 'spend' | 'income'; rules: number };
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
        {(v) => <Body categories={v.categories} rules={v.rules} />}
      </Loaded>
    </Screen>
  );
}

function Body({ categories, rules }: { categories: Cat[]; rules: Rule[] }) {
  const [tab, setTab] = useState<'categories' | 'rules'>('categories');
  const [openId, setOpenId] = useState<string | null>(null);
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
      {tab === 'categories' ? <CategoryGrid categories={categories} onOpen={setOpenId} /> : <RuleList rules={rules} />}
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={open?.name ?? 'Category'}
        description={open ? (open.kind === 'income' ? 'An income category' : 'A spending category') : undefined}
      >
        {open ? <CategoryDetail cat={open} rules={rules.filter((r) => r.category === open.name)} /> : null}
      </Sheet>
    </div>
  );
}

function CategoryGrid({ categories, onOpen }: { categories: Cat[]; onOpen: (id: string) => void }) {
  if (!categories.length) return <EmptyState line="Categories show here once your first payment is in." />;
  const groups = [
    { label: 'Spending categories', items: categories.filter((c) => c.kind === 'spend') },
    { label: 'Income categories', items: categories.filter((c) => c.kind === 'income') },
  ];
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
                    className="flex min-h-24 w-full flex-col items-center gap-2 rounded-[var(--radius-card,16px)] bg-card px-1.5 py-3 text-center active:bg-accent"
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
    </>
  );
}

/** What a category holds: its kind and the rules that point at it. */
function CategoryDetail({ cat, rules }: { cat: Cat; rules: Rule[] }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex items-center gap-3">
        <IconTile size="lg" icon={categoryIcon(cat.name)} tone={categoryTone(cat.name)} />
        <p className="text-base">{cat.rules ? `${cat.rules} ${cat.rules === 1 ? 'rule' : 'rules'}` : 'No rules yet'}</p>
      </div>
      {rules.length ? (
        <ul aria-label={`Rules for ${cat.name}`} className="flex flex-col gap-1 text-base">
          {rules.map((r) => (
            <li key={r.id}>When the payee has “{readableName(r.merchant)}”</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">A merchant gets a rule the first time you answer for it.</p>
      )}
    </div>
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
