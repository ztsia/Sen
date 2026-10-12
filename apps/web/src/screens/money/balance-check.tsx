import { useRouter } from '@tanstack/react-router';
import { useBalanceCheck } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded } from '../kit';
import { BalanceForm } from './balance-form';

/**
 * Balance check (screens.md, spec §7, D18): each account's balance beside a box for the bank's
 * figure. *Save* books each difference as Unaccounted. The form is shared with payday's step 2.
 */
export default function BalanceCheck() {
  const q = useBalanceCheck();
  const router = useRouter();
  return (
    <Screen bar={<AppBar title="Balance check" />} className="flex flex-col pb-0">
      <p className="px-4 pt-1 pb-3 text-sm text-muted-foreground">
        Type what each bank app shows now, or tap Matches. Any difference is booked as Unaccounted.
      </p>
      <Loaded q={q} what="your balances">
        {(v) => (
          <BalanceForm
            v={v}
            onSaved={() => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' }))}
          />
        )}
      </Loaded>
    </Screen>
  );
}
