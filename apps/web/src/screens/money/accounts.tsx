import { useState } from 'react';
import { PlusIcon, ScaleIcon, Undo2Icon, WalletIcon } from 'lucide-react';
import type { AccountRow, AccountsView } from '@sen/core/views';
import { CaptureWarnings } from '@/blocks/capture-warnings';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { GroupCard } from '@/blocks/group';
import { Pending } from '@/blocks/pending';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useAccountList, useMe, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { newId } from '@/lib/uid';
import { SenCapture, captureReachable } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { klDay } from '@sen/core/cycles';
import { canOpen } from '../can-open';
import { accountHint, HOLDS, suggestAccounts, type AccountSuggestion } from '../outside/logic';
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
  const me = useMe();
  return (
    <Screen bar={<AppBar title="Accounts" />}>
      <Loaded q={me} what="your accounts">
        {(m) => (m.capture ? <List /> : <NoCapture />)}
      </Loaded>
    </Screen>
  );
}

function List() {
  const q = useAccountList();
  return (
    <Loaded q={q} what="your accounts">
      {(v) => <Body v={v} />}
    </Loaded>
  );
}

/** Without Capture the server holds no balances for them (§9.6): say why, not *check your connection*. */
function NoCapture() {
  return (
    <EmptyState
      icon={WalletIcon}
      title="No accounts here"
      line="Accounts come with Sen reading your bank notifications, which isn’t switched on for you."
    />
  );
}

function Body({ v }: { v: AccountsView }) {
  const go = useGo();
  if (!v.tracked.length && !v.archived.length)
    return (
      <div className="flex flex-col gap-5 pt-2 pb-8">
        <NotAdded tracked={[]} archived={[]} />
        <EmptyState
          icon={WalletIcon}
          title="No accounts yet"
          line="Each app you choose for Sen to read gets an account here, with the balance you type for it."
          action={
            canOpen('settings/capture/apps')
              ? { label: 'Choose apps', onSelect: () => go('settings/capture/apps') }
              : undefined
          }
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-5 pt-2 pb-8">
      {/* capture stopped: these balances stop moving, so say so where they're read (QA B08 run 3, eyes) */}
      <CaptureWarnings className="mx-4 w-auto" />
      {/* a total and a check only when there's an account to total and check (QA B08 run 4, 3) */}
      {v.tracked.length ? (
        <>
          <div className="flex flex-col gap-1 px-4">
            <p className="text-sm text-muted-foreground">
              In {v.tracked.length} {v.tracked.length === 1 ? 'account' : 'accounts'}
            </p>
            <Money sen={v.total} className="text-4xl font-semibold" />
            {v.gap ? (
              <p className="text-sm text-muted-foreground">
                The last check found <Money sen={Math.abs(v.gap)} className="font-normal text-foreground" whole />{' '}
                {v.gap > 0 ? 'that left without a notification' : 'that arrived without one'}, booked as Unaccounted.
              </p>
            ) : null}
          </div>
          {canOpen('balance-check') ? (
            <div className="px-4">
              <Button className="w-full" onClick={() => go('balance-check')}>
                <ScaleIcon aria-hidden="true" />
                Check balances
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {v.tracked.length ? (
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
                    {/* a check is only asked for once balance checks exist (B13) */}
                    {canOpen('balance-check') ? (
                      <Badge variant={a.checkedAt ? 'muted' : 'warning'}>
                        {a.checkedAt ? `Checked ${shortDay(klDay(a.checkedAt))}` : 'Not checked'}
                      </Badge>
                    ) : null}
                    {/* one line, the same on every row: the app it's from, then what its one figure holds
                        (D145), wrapped, never cut (QA B08 run 2, 3; run 3, eyes) */}
                    {sourceLine(a) ? <span className="basis-full">{sourceLine(a)}</span> : null}
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="max-w-[45%] shrink-0 justify-end text-right">
                  <Money sen={a.balance ?? 0} className="font-normal" />
                </ItemActions>
              </button>
            </Item>
          ))}
        </GroupCard>
      ) : null}
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
      <NotAdded tracked={v.tracked} archived={v.archived} />
      <Archived rows={v.archived} />
    </div>
  );
}

/** *From Touch 'n Go eWallet · eWallet and GO+ together*: the app that feeds it, and what its figure holds. */
const sourceLine = (a: AccountRow) =>
  [a.app ? `From ${a.app}` : null, a.package ? (HOLDS[a.package] ?? null) : null].filter(Boolean).join(' · ');

/**
 * The apps chosen after first run with no account yet (D148): each is added here with the balance it
 * shows today, as first run asks, since only first run made accounts before. An app whose account is
 * archived isn't one of them: *Bring back* is its way back, never a second account (QA B08 run 4, 3).
 */
function NotAdded({ tracked, archived }: { tracked: AccountRow[]; archived: AccountsView['archived'] }) {
  const reachable = captureReachable();
  const apps = useBridge(() => (reachable ? SenCapture.apps() : Promise.resolve({ apps: [] })));
  const [adding, setAdding] = useState<AccountSuggestion | null>(null);
  const had = [...tracked, ...archived.map((a) => ({ ...a, opening: null }))];
  const missing = apps.data ? suggestAccounts(apps.data.apps, had).filter((a) => !a.saved) : [];
  if (!missing.length) return null;
  return (
    <>
      <GroupCard label="Not added yet" footer="Apps you chose after first run. Each gets one account.">
        {missing.map((a) => (
          <div key={a.package} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <BankTile name={a.name} />
            <span className="min-w-0 flex-1 truncate text-base">{a.name}</span>
            <Button variant="ghost" size="sm" aria-label={`Add ${a.name}`} onClick={() => setAdding(a)}>
              <PlusIcon aria-hidden="true" />
              Add
            </Button>
          </div>
        ))}
      </GroupCard>
      <AddSheet key={adding?.package ?? 'none'} app={adding} onClose={() => setAdding(null)} />
    </>
  );
}

/** Today's balance for one app's account, asked as first run asks it: empty is refused, 0 counts. */
function AddSheet({ app, onClose }: { app: AccountSuggestion | null; onClose: () => void }) {
  const write = useWrite();
  // one id per sheet, so a save whose answer was lost and is tapped again is the same account
  const [id] = useState(newId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!app) return;
    const c = checkAmount(text);
    if (!text.trim()) return setError('Type today’s balance, or 0.');
    if (c.error !== undefined) return setError(c.error);
    setBusy(true);
    const r = await write({
      type: 'account.add',
      id,
      name: app.name,
      kind: 'tracked',
      app: { package: app.package, label: app.label },
      opening: c.sen,
    });
    setBusy(false);
    if (r && !r.failed) onClose();
  };
  return (
    <Sheet
      open={!!app}
      onOpenChange={(o) => !o && onClose()}
      title={app ? `Add ${app.name}` : 'Add an account'}
      description="Type the balance the app shows today. Sen counts from here."
    >
      <form
        className="flex flex-col gap-4 pt-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void save();
        }}
      >
        {app ? (
          <MoneyInput
            label="Today’s balance"
            hint={accountHint(app)}
            placeholder=""
            value={text}
            error={error}
            onChange={(t) => {
              setText(t);
              setError(undefined);
            }}
          />
        ) : null}
        <Button type="submit" aria-disabled={busy || undefined}>
          <Pending on={busy} label="Saving…">
            Add account
          </Pending>
        </Button>
      </form>
    </Sheet>
  );
}

/** Archived accounts, each with *Bring back*, as Settings → Categories has (QA B08 run 1, 5). */
function Archived({ rows }: { rows: AccountsView['archived'] }) {
  const write = useWrite();
  if (!rows.length) return null;
  return (
    <GroupCard label="Archived">
      {rows.map((a) => (
        <div key={a.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">{a.name}</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Bring back ${a.name}`}
            onClick={() => void write({ type: 'account.archive', id: a.id, archived: false })}
          >
            <Undo2Icon aria-hidden="true" />
            Bring back
          </Button>
        </div>
      ))}
    </GroupCard>
  );
}
