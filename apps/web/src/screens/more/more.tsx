import type { ComponentType } from 'react';
import { ChevronRightIcon, CreditCardIcon, HandCoinsIcon, SettingsIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { RowMarkIcon } from '@/blocks/rows';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { useMe } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, useGo } from '../kit';

/**
 * More (screens.md `more`): the places that aren't a tab. Accounts needs capture, and Claims needs
 * claims switched on, so a person who has neither never sees a row that leads nowhere.
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

interface Entry {
  id: string;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}

function MoreRows({ capture, claims }: { capture: boolean; claims: boolean }) {
  const go = useGo();
  const entries: Entry[] = [
    { id: 'payments', label: 'Payments', hint: 'Every payment, searchable', icon: CreditCardIcon },
    { id: 'shared', label: 'Shared bills', hint: 'Who owes whom', icon: UsersIcon },
    ...(capture ? [{ id: 'accounts', label: 'Accounts', hint: 'Balances and checks', icon: WalletIcon }] : []),
    ...(claims ? [{ id: 'claims', label: 'Claims', hint: 'What you can claim back', icon: HandCoinsIcon }] : []),
    { id: 'settings', label: 'Settings', hint: 'Looks, capture, categories and more', icon: SettingsIcon },
  ];
  return (
    <ItemGroup className="pt-2">
      {entries.map((e, i) => (
        <div key={e.id}>
          {i ? <ItemSeparator /> : null}
          <Item
            asChild
            size="sm"
            className="min-h-16 w-full flex-nowrap rounded-none text-left text-base active:bg-accent"
          >
            <button type="button" onClick={() => go(e.id)}>
              <RowMarkIcon icon={e.icon} />
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="text-base">{e.label}</ItemTitle>
                <ItemDescription>{e.hint}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
              </ItemActions>
            </button>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}
