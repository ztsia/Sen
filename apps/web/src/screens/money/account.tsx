import { CheckIcon, ListIcon, ScaleIcon, WalletIcon } from 'lucide-react';
import { klDay } from '@sen/core/cycles';
import { formatSen as formatMoney } from '@sen/core/money';
import type { AccountView } from '@sen/core/views';
import { ActionBar, FactGrid, HeaderCard, type BarAction } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { ListRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Badge } from '@/components/ui/badge';
import { useAccount, useMe } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { shortDay } from '@/lib/dates';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded, useGo, useScreenSearch } from '../kit';

/**
 * One account (screens.md `account`, spec §7): its balance first, then what you can do, its opening
 * balance and the app that feeds it, its recent payments and its checks.
 */
export default function Account() {
  const { id } = useScreenSearch();
  const q = useAccount(id ?? '');
  return (
    <Screen bar={<AppBar title="Account" />}>
      {/* no id (an old or hand-typed link): gone, not loading forever (QA B04 run 1, finding 10) */}
      {id ? (
        <Loaded q={q} what="this account">
          {(v) => (v ? <Body v={v} /> : <Gone />)}
        </Loaded>
      ) : (
        <Gone />
      )}
    </Screen>
  );
}

function Gone() {
  const go = useGo();
  return (
    <EmptyState
      icon={WalletIcon}
      title="Not here any more"
      line="This account isn't here any more."
      action={{ label: 'See all accounts', onSelect: () => go('accounts') }}
    />
  );
}

function Body({ v }: { v: AccountView }) {
  const go = useGo();
  const me = useMe();
  const a = v.account;
  const actions: BarAction[] = [
    { icon: ScaleIcon, label: 'Check', onSelect: () => go('balance-check') },
    { icon: ListIcon, label: 'Payments', onSelect: () => go('payments', { account: a.id }) },
  ];
  if (me.data?.agent !== false)
    actions.push({ icon: SenMark, label: 'Ask Sen', onSelect: () => useUi.getState().setSenOpen(true) });
  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <HeaderCard
        mark={<IconTile size="lg" icon={WalletIcon} tone="accent" />}
        title={a.name}
        figure={<Money sen={a.balance ?? 0} />}
        meta="Balance now"
        source={`Computed from your notifications since ${shortDay(klDay(v.openingAt))}. Not the bank's own figure.`}
      />
      <ActionBar actions={actions} />
      <FactGrid
        facts={[
          {
            label: 'Opening balance',
            value: (
              <>
                <Money sen={v.opening} className="font-normal" />{' '}
                <span className="text-muted-foreground">on {shortDay(klDay(v.openingAt))}</span>
              </>
            ),
            wide: true,
          },
          { label: 'Fed by', value: a.app ?? 'Typed in by hand' },
          { label: 'Last checked', value: a.checkedAt ? shortDay(klDay(a.checkedAt)) : 'Not checked yet' },
        ]}
      />
      <GroupCard label="Recent payments">
        {v.recent.length ? (
          v.recent.map((r) => (
            <ListRow
              key={r.id}
              icon={categoryIcon(r.category)}
              tone={categoryTone(r.category)}
              title={r.title}
              secondary={[r.category, r.note].filter(Boolean).join(' · ')}
              sen={r.amount}
              kind={r.direction === 'in' ? 'in' : 'out'}
              marks={r.marks}
              onOpen={() => go('txn', { id: r.id })}
              shareId={r.id}
            />
          ))
        ) : (
          <p className="px-4 py-3 text-muted-foreground">No payments on this account yet.</p>
        )}
      </GroupCard>
      <GroupCard label="Checks">
        {v.checks.length ? (
          v.checks.map((c) => (
            <NavRow
              key={c.at}
              title={`${shortDay(klDay(c.at))}: bank showed ${formatMoney(c.balance)}`}
              trailing={
                c.difference === 0 ? (
                  <Badge variant="accent">
                    <CheckIcon aria-hidden="true" />
                    Matched
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    {formatMoney(Math.abs(c.difference))} {c.difference < 0 ? 'less' : 'more'}
                  </Badge>
                )
              }
            />
          ))
        ) : (
          <p className="px-4 py-3 text-muted-foreground">Not checked yet.</p>
        )}
      </GroupCard>
    </div>
  );
}
