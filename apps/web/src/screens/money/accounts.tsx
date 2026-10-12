import { WalletIcon } from 'lucide-react';
import type { AccountRow, AccountsView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { ListRow, SettingsRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { useAccountList } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { klDay } from '@sen/core/cycles';
import { Loaded, Section, useGo } from '../kit';

/** *Checked 1 Oct · Ryt Bank*: when it was last checked and the app that feeds it. */
export const accountLine = (a: AccountRow) =>
  [
    a.checkedAt ? `Checked ${shortDay(klDay(a.checkedAt))}` : 'Not checked yet',
    a.app && a.app !== a.name ? a.app : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Accounts (screens.md, spec §7, D16, D93): capture only. The total, each tracked account with its
 * computed balance and when it was last checked, the accounts kept elsewhere without balances, and
 * *Check balances*.
 */
export default function Accounts() {
  const q = useAccountList();
  return (
    <Screen bar={<AppBar title="Accounts" />}>
      <Loaded q={q} what="your accounts">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: AccountsView }) {
  const go = useGo();
  if (!v.tracked.length)
    return <EmptyState line="Your accounts and their balances show here once Sen is reading your bank apps." />;
  return (
    <div className="flex flex-col pb-4">
      <div className="flex flex-col gap-1 px-4 pt-2">
        <p className="text-sm text-muted-foreground">In {v.tracked.length} accounts</p>
        <Money sen={v.total} className="text-4xl font-semibold" />
        {v.gap ? (
          <p className="text-sm text-muted-foreground">
            The last check found <Money sen={Math.abs(v.gap)} className="font-normal text-foreground" whole />{' '}
            {v.gap > 0 ? 'that left without a notification' : 'that arrived without one'}, booked as Unaccounted.
          </p>
        ) : null}
      </div>
      <div className="px-4 pt-4">
        <Button className="w-full" size="lg" onClick={() => go('balance-check')}>
          Check balances
        </Button>
      </div>
      <Section title="Tracked">
        <ul className="flex flex-col">
          {v.tracked.map((a) => (
            <li key={a.id}>
              <ListRow
                icon={WalletIcon}
                title={a.name}
                secondary={accountLine(a)}
                sen={a.balance ?? 0}
                onOpen={() => go('account', { id: a.id })}
              />
            </li>
          ))}
        </ul>
      </Section>
      {v.elsewhere.length ? (
        <Section title="Elsewhere">
          <p className="px-4 pb-1 text-sm text-muted-foreground">Kept elsewhere, so Sen shows no balance for them.</p>
          <ul className="flex flex-col">
            {v.elsewhere.map((a) => (
              <li key={a.id}>
                <SettingsRow label={a.name} value="No balance" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
