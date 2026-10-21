import { ScaleIcon, WalletIcon } from 'lucide-react';
import type { AccountRow, AccountsView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { GroupCard } from '@/blocks/group';
import { EmptyState } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useAccountList } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { klDay } from '@sen/core/cycles';
import { Loaded, useGo } from '../kit';

/** *Checked 1 Oct · Ryt Bank*: when it was last checked and the app that feeds it. */
export const accountLine = (a: AccountRow) =>
  [
    a.checkedAt ? `Checked ${shortDay(klDay(a.checkedAt))}` : 'Not checked yet',
    a.app && a.app !== a.name ? a.app : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** The bank's initial on a tinted tile: *R* for Ryt Bank. Decorative, the row says the name. */
function BankTile({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[calc(var(--radius-card,16px)*0.6)] bg-primary/12 text-sm font-semibold text-primary"
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/**
 * Accounts (screens.md, spec §7, D16, D93): capture only. The total first, then each tracked account in
 * one card with its computed balance and whether it was last checked, the accounts kept elsewhere
 * without balances, and *Check balances*.
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
    return (
      <EmptyState
        icon={WalletIcon}
        title="No accounts yet"
        line="Your accounts and their balances show here once Sen is reading your bank apps."
      />
    );
  return (
    <div className="flex flex-col gap-5 pt-2 pb-8">
      <div className="flex flex-col gap-1 px-4">
        <p className="text-sm text-muted-foreground">In {v.tracked.length} accounts</p>
        <Money sen={v.total} className="text-4xl font-semibold" />
        {v.gap ? (
          <p className="text-sm text-muted-foreground">
            The last check found <Money sen={Math.abs(v.gap)} className="font-normal text-foreground" whole />{' '}
            {v.gap > 0 ? 'that left without a notification' : 'that arrived without one'}, booked as Unaccounted.
          </p>
        ) : null}
      </div>
      <div className="px-4">
        <Button className="w-full" onClick={() => go('balance-check')}>
          <ScaleIcon aria-hidden="true" />
          Check balances
        </Button>
      </div>
      <GroupCard label="Tracked">
        {v.tracked.map((a) => (
          <Item
            key={a.id}
            asChild
            size="sm"
            className="min-h-14 w-full flex-nowrap gap-3 rounded-none py-2.5 text-left text-base"
          >
            <button type="button" onClick={() => go('account', { id: a.id })}>
              <BankTile name={a.name} />
              <ItemContent className="min-w-0 gap-0.5">
                <ItemTitle className="block w-full truncate text-base font-normal">{a.name}</ItemTitle>
                <ItemDescription className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Badge variant={a.checkedAt ? 'muted' : 'warning'}>
                    {a.checkedAt ? `Checked ${shortDay(klDay(a.checkedAt))}` : 'Not checked'}
                  </Badge>
                  {a.app && a.app !== a.name ? <span className="truncate">{a.app}</span> : null}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="max-w-[45%] shrink-0 justify-end text-right">
                <Money sen={a.balance ?? 0} className="font-normal" />
              </ItemActions>
            </button>
          </Item>
        ))}
      </GroupCard>
      {v.elsewhere.length ? (
        <section className="flex flex-col gap-2 px-4" aria-label="Elsewhere">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">Elsewhere</h2>
          <Card className="gap-1 bg-muted/60 px-4 py-3 shadow-none">
            <p className="text-sm text-muted-foreground">Kept elsewhere, so Sen shows no balance for them.</p>
            <ul className="flex flex-col">
              {v.elsewhere.map((a) => (
                <li key={a.id} className="flex min-h-10 items-center justify-between gap-3">
                  <span className="truncate">{a.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">No balance</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
