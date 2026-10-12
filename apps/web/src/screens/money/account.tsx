import { klDay } from '@sen/core/cycles';
import { formatSen as formatMoney } from '@sen/core/money';
import type { AccountView } from '@sen/core/views';
import { DetailPage } from '@/blocks/detail';
import { Money } from '@/blocks/money';
import { ListRow, SettingsRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { useAccount } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { categoryIcon } from '../icons';
import { Loaded, Section, useGo, useScreenSearch } from '../kit';

/**
 * One account (screens.md `account`, spec §7): its balance, opening balance, the app that feeds it,
 * its recent payments and its checks.
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
      line="This account isn't here any more."
      action={{ label: 'See all accounts', onSelect: () => go('accounts') }}
    />
  );
}

function Body({ v }: { v: AccountView }) {
  const go = useGo();
  const a = v.account;
  return (
    <div className="flex flex-col pb-4">
      <DetailPage
        sen={a.balance ?? 0}
        source={`Computed from your notifications since ${shortDay(klDay(v.openingAt))}. Not the bank's own figure.`}
        facts={[
          {
            label: 'Opening balance',
            value: (
              <>
                <Money sen={v.opening} className="font-normal" />{' '}
                <span className="text-muted-foreground">on {shortDay(klDay(v.openingAt))}</span>
              </>
            ),
          },
          { label: 'Fed by', value: a.app ?? 'Typed in by hand' },
          { label: 'Last checked', value: a.checkedAt ? shortDay(klDay(a.checkedAt)) : 'Not checked yet' },
        ]}
        actions={[
          { label: 'Check balances', onSelect: () => go('balance-check') },
          { label: 'See all its payments', onSelect: () => go('payments', { account: a.id }) },
        ]}
      />
      <Section title="Recent payments">
        {v.recent.length ? (
          <ul className="flex flex-col">
            {v.recent.map((r) => (
              <li key={r.id}>
                <ListRow
                  icon={categoryIcon(r.category)}
                  title={r.title}
                  secondary={[r.category, r.note].filter(Boolean).join(' · ')}
                  sen={r.amount}
                  kind={r.direction === 'in' ? 'in' : 'out'}
                  marks={r.marks}
                  onOpen={() => go('txn', { id: r.id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 text-muted-foreground">No payments on this account yet.</p>
        )}
      </Section>
      <Section title="Checks">
        {v.checks.length ? (
          <ul className="flex flex-col">
            {v.checks.map((c) => (
              <li key={c.at}>
                <SettingsRow
                  label={`${shortDay(klDay(c.at))}: bank showed ${formatMoney(c.balance)}`}
                  value={
                    c.difference === 0
                      ? 'Matched'
                      : `${formatMoney(Math.abs(c.difference))} ${c.difference < 0 ? 'less' : 'more'}`
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 text-muted-foreground">Not checked yet.</p>
        )}
      </Section>
    </div>
  );
}
