import { useState } from 'react';
import { CheckIcon, CircleCheckIcon, SplitIcon, UsersIcon } from 'lucide-react';
import type { SharedView } from '@sen/core/views';
import { Segmented } from '@/blocks/choice';
import { PersonAvatar } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useShared } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { readableName } from '@/lib/names';
import { Loaded, useGo } from '../kit';

/** `shared` (screens.md, D130): every bill as a card, Open or Settled. A card opens `split`. */
export default function Shared() {
  const q = useShared();
  const go = useGo();
  return (
    <Screen bar={<AppBar title="Shared bills" />}>
      <Loaded q={q} what="your shared bills">
        {(v) =>
          v.rows.length ? (
            <Lists rows={v.rows} />
          ) : (
            <EmptyState
              icon={SplitIcon}
              title="No shared bills yet"
              line="Open a payment and tap Split to share it."
              action={{ label: 'See all payments', onSelect: () => go('payments') }}
            />
          )
        }
      </Loaded>
    </Screen>
  );
}

function Lists({ rows }: { rows: SharedView['rows'] }) {
  const open = rows.filter((r) => r.open);
  const settled = rows.filter((r) => !r.open);
  const [which, setWhich] = useState<'open' | 'settled'>(open.length ? 'open' : 'settled');
  const shown = which === 'open' ? open : settled;
  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <Segmented
        label="Which bills"
        value={which}
        onChange={setWhich}
        options={[
          { value: 'open', label: `Open · ${open.length}` },
          { value: 'settled', label: `Settled · ${settled.length}` },
        ]}
      />
      {shown.length ? (
        <ul className="flex flex-col gap-3 px-4">
          {shown.map((r) => (
            <li key={r.id}>
              <Bill row={r} />
            </li>
          ))}
        </ul>
      ) : which === 'open' ? (
        <EmptyState icon={UsersIcon} title="Nothing open" line="Nothing is waiting on anyone." />
      ) : (
        <EmptyState icon={CircleCheckIcon} title="Nothing settled yet" line="Bills move here once everyone has paid." />
      )}
    </div>
  );
}

/** Mei paid → *Mei paid · you owe RM24.40*: the payer's name is the line's first word(s). */
const payerOf = (r: SharedView['rows'][number]) => (r.paidBy === 'me' ? 'You' : r.line.split(' paid')[0] || 'Them');

function Bill({ row: r }: { row: SharedView['rows'][number] }) {
  const go = useGo();
  const payer = payerOf(r);
  // you owe is money out, owed to you is money in; a settled bill says neither in colour
  const tone = !r.open ? 'text-muted-foreground' : r.paidBy === 'me' ? 'text-money-in' : 'text-money-out';
  return (
    <button type="button" className="w-full text-left" onClick={() => go('split', { id: r.id })}>
      <Card className="gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 -space-x-2">
            {r.paidBy === 'other' ? <PersonAvatar name="You" size="default" /> : null}
            <PersonAvatar name={payer} size="default" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold">{readableName(r.merchant)}</span>
            <span className="text-sm text-muted-foreground">{shortDay(dayOfInstant(r.at))}</span>
          </div>
          <Money sen={r.sen} className="text-base font-semibold text-foreground" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className={`min-w-0 text-sm ${tone}`}>{r.line}</p>
          <Badge variant={r.open ? 'accent' : 'muted'}>
            {r.open ? null : <CheckIcon />}
            {r.open ? 'Open' : 'Settled'}
          </Badge>
        </div>
      </Card>
    </button>
  );
}
