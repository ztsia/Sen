import { SettingsRow } from '@/blocks/rows';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { readableName } from '@/lib/names';
import { Loaded, Section } from '../kit';

/**
 * Settings → Categories and rules (screens.md; D70): the categories with how many rules each one
 * holds, then the merchant rules, hawkers included. A rule's hawker switch is the change made here.
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

function Body({
  categories,
  rules,
}: {
  categories: { id: string; name: string; kind: 'spend' | 'income'; rules: number }[];
  rules: { id: string; merchant: string; category: string; hawker: boolean }[];
}) {
  const write = useWrite();
  const spend = categories.filter((c) => c.kind === 'spend');
  const income = categories.filter((c) => c.kind === 'income');
  return (
    <div className="flex flex-col pb-6">
      <Section title="Categories">
        {categories.length ? (
          <>
            {[spend, income].map((group, i) =>
              group.length ? (
                <ul key={i} aria-label={i ? 'Income categories' : 'Spending categories'} className="flex flex-col">
                  {group.map((c) => (
                    <li key={c.id}>
                      <SettingsRow
                        label={c.name}
                        value={c.rules ? `${c.rules} ${c.rules === 1 ? 'rule' : 'rules'}` : 'No rules'}
                      />
                    </li>
                  ))}
                </ul>
              ) : null,
            )}
          </>
        ) : (
          <EmptyState line="Categories show here once your first payment is in." />
        )}
      </Section>
      <Section title="Merchant rules">
        {rules.length ? (
          <ul aria-label="Merchant rules" className="flex flex-col">
            {rules.map((r) => (
              <li key={r.id}>
                <SettingsRow
                  label={readableName(r.merchant)}
                  description={r.hawker ? `${r.category} · a hawker` : r.category}
                  checked={r.hawker}
                  onCheckedChange={(on) => void write({ type: 'setting.set', key: `rules.${r.id}.hawker`, value: on })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState line="A merchant gets a rule the first time you answer for it: its category follows it from then on." />
        )}
      </Section>
    </div>
  );
}
