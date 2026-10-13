import type { ComponentType, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, CreditCardIcon, HandCoinsIcon, SettingsIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { GroupCard } from '@/blocks/group';
import { IconTile } from '@/blocks/tile';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { useAccountList, useClaims, useMe, usePayments, useShared } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded } from '../kit';

/**
 * More (screens.md `more`): the places that aren't a tab. Accounts needs capture, and Claims needs
 * claims switched on, so a person who has neither never sees a row that leads nowhere. Each row says
 * its state (D130), so you needn't open it to know.
 */
export default function More() {
  const q = useMe();
  return (
    <Screen bar={<AppBar title="More" />} senRoom>
      <h2 className="sr-only">More</h2>
      <Loaded q={q} what="More">
        {(me) => <MoreRows capture={me.capture} claims={me.claims} />}
      </Loaded>
    </Screen>
  );
}

/** Each row is a link: it goes somewhere, it doesn't do something. */
function MoreRows({ capture, claims }: { capture: boolean; claims: boolean }) {
  const payments = usePayments({}).data;
  const shared = useShared().data;
  const accounts = useAccountList().data;
  const claimList = useClaims().data;
  const open = shared?.rows.filter((r) => r.open).length;
  const toSubmit = claimList?.claims.filter((c) => c.status === 'to_submit').length;
  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <GroupCard>
        <LinkRow
          id="payments"
          label="Payments"
          icon={CreditCardIcon}
          value={payments ? String(payments.rows.length).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : undefined}
        />
        <LinkRow
          id="shared"
          label="Shared bills"
          icon={UsersIcon}
          value={open === undefined ? undefined : open ? `${open} open` : 'All settled'}
        />
        {capture ? (
          <LinkRow id="accounts" label="Accounts" icon={WalletIcon} value={accounts?.tracked.length.toString()} />
        ) : null}
        {claims ? (
          <LinkRow
            id="claims"
            label="Claims"
            icon={HandCoinsIcon}
            value={toSubmit === undefined ? undefined : toSubmit ? `${toSubmit} to submit` : 'Nothing to submit'}
          />
        ) : null}
      </GroupCard>
      <GroupCard>
        <LinkRow id="settings" label="Settings" icon={SettingsIcon} />
      </GroupCard>
    </div>
  );
}

function LinkRow({
  id,
  label,
  icon,
  value,
}: {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  value?: ReactNode;
}) {
  return (
    <Item
      asChild
      size="sm"
      className="min-h-14 w-full flex-nowrap gap-3 rounded-none py-2.5 text-left text-base active:bg-accent"
    >
      <Link to="/s/$" params={{ _splat: id }}>
        <IconTile icon={icon} />
        <ItemContent className="min-w-0">
          <ItemTitle className="text-base font-normal">{label}</ItemTitle>
        </ItemContent>
        <ItemActions className="shrink-0 gap-2 text-sm text-muted-foreground">
          {value ? <span className="truncate">{value}</span> : null}
          <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
        </ItemActions>
      </Link>
    </Item>
  );
}
