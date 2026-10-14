import { formatSen } from '@sen/core/money';
import type { UsageView } from '@sen/core/views';
import { Legend, PartsBar, foldParts, type Part } from '@/blocks/charts';
import { GroupCard } from '@/blocks/group';
import { StatTiles } from '@/blocks/facts';
import { Money } from '@/blocks/money';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUsage } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `agent/usage` (screens.md, spec §9.6, D98): what Sen has cost this month. A friend sees their credit:
 * the balance and what is left of this month's free allowance, both computed from the ledger. The owner
 * has no ledger, so sees tokens, with an estimate that says it is one. Nobody pays inside Sen.
 */
export default function Usage() {
  const q = useUsage();
  return (
    <Screen bar={<AppBar title="Usage" />}>
      <Loaded q={q} what="your AI usage">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

// counts, not money: thousands keep it short
const tokens = (n: number) => `${Math.round(n / 1000)}k tokens`;

function Body({ v }: { v: UsageView }) {
  const total = v.byUse.reduce((a, u) => a + u.sen, 0);
  const parts: Part[] = v.byUse.map((u, i) => ({ key: `use${i}`, label: u.label, sen: u.sen }));
  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      {v.pausedUntil ? (
        <div className="px-4">
          <Alert>
            <AlertDescription>Sen is paused until {shortDay(v.pausedUntil)}; everything else works.</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {v.owner ? (
        <>
          <StatTiles
            stats={[
              { label: 'Used this month', value: tokens(total), emphasis: true },
              {
                label: 'Estimated cost',
                value: v.estimate !== null ? `About ${formatSen(v.estimate)}` : 'Not estimated',
              },
            ]}
          />
          <p className="px-4 text-sm text-muted-foreground">
            The cost is an estimate from the token counts, not a bill, and is never stored.
          </p>
        </>
      ) : (
        <>
          <StatTiles
            stats={[
              { label: 'Credit balance', value: <Money sen={v.balance} className="font-semibold" />, emphasis: true },
              {
                label: 'Free this month',
                value: (
                  <>
                    <Money sen={v.allowanceLeft} className="font-semibold" />
                    <span className="block text-xs font-normal text-muted-foreground">
                      of <Money sen={v.allowance} className="font-normal" />
                    </span>
                  </>
                ),
              },
            ]}
          />
        </>
      )}
      {v.byUse.length ? (
        <GroupCard label="By what used it">
          <div className="flex flex-col gap-2 px-4 py-4">
            {v.owner ? <TokenBar parts={parts} /> : <PartsBar parts={parts} label="This month" />}
          </div>
        </GroupCard>
      ) : null}
      {v.owner ? null : (
        <p className="px-4 text-sm text-muted-foreground">
          The free allowance renews each month and is used before your balance. Nobody pays inside Sen: if you need
          more, ask the person who invited you.
        </p>
      )}
    </div>
  );
}

/**
 * The owner's use as one stacked bar in tokens, with a legend that says tokens. PartsBar's legend
 * formats its parts as money, so the owner's counts can't go through it. Colours come from the same
 * folding as the charts (foldParts), so the two read alike.
 */
function TokenBar({ parts }: { parts: Part[] }) {
  const folded = foldParts(parts);
  const total = folded.reduce((a, p) => a + p.sen, 0) || 1;
  return (
    <>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Tokens by use">
        {folded.map((p) => (
          <span
            key={p.key}
            className="h-full border-r-2 border-card last:border-r-0"
            style={{ width: `${(p.sen / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <Legend items={folded.map((p) => ({ label: `${p.label} · ${tokens(p.sen)}`, color: p.color }))} />
    </>
  );
}
