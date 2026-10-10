import { formatSen, percent } from '@sen/core/money';
import type { YearView } from '@sen/core/views';
import { ChartCard, ChartTable, ColumnBars } from '@/blocks/charts';
import { SettingsRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { useYear } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useUi } from '@/frame/ui-store';
import { Loaded, Section } from '../kit';

/** The year (screens.md, spec §9.3): spending by month, the savings rate, and the relief tags. */
export default function Year() {
  const q = useYear();
  return (
    <Screen bar={<AppBar title="The year" />}>
      <Loaded q={q} what="the year">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: YearView }) {
  const last = v.months[v.months.length - 1];
  if (!last) return <EmptyState line="Your year shows once you've a month of payments." />;
  const top = v.months.reduce((a, m) => (m.spent > a.spent ? m : a), last);
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="px-4">
        <ChartCard
          question={`How did ${v.year} go, month by month?`}
          takeaway={`${top.label} was the heaviest month at ${formatSen(top.spent)}.`}
          onAskSen={() => useUi.getState().setSenOpen(true)}
          table={
            <ChartTable
              caption={`Spent each month of ${v.year}`}
              head={['Month', 'Spent', 'Income']}
              rows={v.months.map((m) => [m.label, formatSen(m.spent), formatSen(m.income)])}
            />
          }
        >
          <ColumnBars
            name="Spent"
            columns={v.months.map((m) => ({ label: m.label, value: m.spent }))}
            format={formatSen}
          />
        </ChartCard>
      </div>
      <Section title="Savings rate">
        <p className="px-4 text-sm" data-testid="rate">
          {v.savingsRate === null
            ? 'No income recorded yet, so there is no rate to work out.'
            : `You kept ${percent(v.savingsRate)}% of what came in this year.`}
        </p>
      </Section>
      <Section title="Relief tags">
        {v.reliefs.length ? (
          <div className="flex flex-col">
            {v.reliefs.map((r) => (
              <SettingsRow key={r.label} label={r.label} value={formatSen(r.sen)} />
            ))}
          </div>
        ) : (
          <p className="px-4 text-sm text-muted-foreground">No payments tagged for tax relief yet.</p>
        )}
      </Section>
    </div>
  );
}
