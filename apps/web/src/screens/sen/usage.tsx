import { formatSen } from '@sen/core/money';
import type { UsageView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { SettingsRow } from '@/blocks/rows';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUsage } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded, Section } from '../kit';

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

const count = new Intl.NumberFormat('en-MY');
const tokens = (n: number) => `${count.format(n)} tokens`;

function Body({ v }: { v: UsageView }) {
  const total = v.byUse.reduce((a, u) => a + u.sen, 0);
  return (
    <div className="flex flex-col pb-4">
      {v.pausedUntil ? (
        <div className="px-4 pt-1">
          <Alert>
            <AlertDescription>Sen is paused until {shortDay(v.pausedUntil)}; everything else works.</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {v.owner ? (
        <>
          <Section title="This month">
            <SettingsRow label="Used" value={tokens(total)} />
            {v.estimate !== null ? (
              <SettingsRow label="Estimated cost" value={`About ${formatSen(v.estimate)}`} />
            ) : null}
          </Section>
          <p className="px-4 pt-1 text-sm text-muted-foreground">
            The cost is an estimate from the token counts, not a bill, and is never stored.
          </p>
        </>
      ) : (
        <Section title="Your AI credit">
          <Row label="Credit balance" sen={v.balance} />
          <Row label="Free this month" sen={v.allowanceLeft} of={v.allowance} />
        </Section>
      )}
      {v.byUse.length ? (
        <Section title="By what used it">
          {v.byUse.map((u) =>
            v.owner ? (
              <SettingsRow key={u.label} label={u.label} value={tokens(u.sen)} />
            ) : (
              <Row key={u.label} label={u.label} sen={u.sen} />
            ),
          )}
        </Section>
      ) : null}
      {v.owner ? null : (
        <p className="px-4 pt-3 text-sm text-muted-foreground">
          The free allowance renews each month and is used before your balance. Nobody pays inside Sen: if you need
          more, ask the person who invited you.
        </p>
      )}
    </div>
  );
}

function Row({ label, sen, of }: { label: string; sen: number; of?: number }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-base">
      <span>{label}</span>
      <span className="text-right">
        <Money sen={sen} className="font-normal" />
        {of !== undefined ? (
          <span className="text-sm text-muted-foreground">
            {' '}
            of <Money sen={of} className="font-normal" />
          </span>
        ) : null}
      </span>
    </div>
  );
}
