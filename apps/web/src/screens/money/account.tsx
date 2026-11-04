import { useState } from 'react';
import { ArchiveIcon, CheckIcon, ListIcon, PencilIcon, ScaleIcon, WalletIcon } from 'lucide-react';
import { klDay } from '@sen/core/cycles';
import { formatSen as formatMoney, senText } from '@sen/core/money';
import type { AccountView } from '@sen/core/views';
import { ActionBar, FactGrid, HeaderCard, type BarAction } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { Sheet } from '@/blocks/sheet';
import { ListRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAccount, useMe, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { shortDay } from '@/lib/dates';
import { categoryIcon, categoryTone } from '../icons';
import { canOpen } from '../can-open';
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
  const [editing, setEditing] = useState(false);
  const actions: BarAction[] = [];
  if (canOpen('balance-check')) actions.push({ icon: ScaleIcon, label: 'Check', onSelect: () => go('balance-check') });
  if (canOpen('payments'))
    actions.push({ icon: ListIcon, label: 'Payments', onSelect: () => go('payments', { account: a.id }) });
  actions.push({ icon: PencilIcon, label: 'Edit', onSelect: () => setEditing(true) });
  if (me.data?.agent !== false && canOpen('sen'))
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
      <EditSheet v={v} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

function EditSheet({ v, open, onOpenChange }: { v: AccountView; open: boolean; onOpenChange: (o: boolean) => void }) {
  const write = useWrite();
  const go = useGo();
  const a = v.account;
  const [name, setName] = useState(a.name);
  const [opening, setOpening] = useState(senText(v.opening));
  const [errors, setErrors] = useState<{ name?: string; opening?: string }>({});
  const [busy, setBusy] = useState(false);
  const tracked = a.kind !== 'elsewhere';

  const save = async () => {
    const e: typeof errors = {};
    const next = name.trim();
    if (next === '') e.name = 'Type a name.';
    else if (next.length > 60) e.name = 'Keep it to 60 characters.';
    const o = tracked ? checkAmount(opening) : { sen: v.opening };
    if (o.error !== undefined) e.opening = o.error;
    setErrors(e);
    if (e.name || e.opening || o.sen === undefined) return;
    const cmd: { type: 'account.edit'; id: string; name?: string; opening?: number } = {
      type: 'account.edit',
      id: a.id,
    };
    if (next !== a.name) cmd.name = next;
    if (tracked && o.sen !== v.opening) cmd.opening = o.sen;
    if (cmd.name === undefined && cmd.opening === undefined) return onOpenChange(false);
    setBusy(true);
    const r = await write(cmd);
    setBusy(false);
    if (r) onOpenChange(false);
  };

  const archive = async () => {
    const r = await write({ type: 'account.archive', id: a.id, archived: true });
    if (r) go('accounts', {}, { replace: true });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(a.name);
          setOpening(senText(v.opening));
          setErrors({});
        }
        onOpenChange(o);
      }}
      title="Edit this account"
    >
      <form
        className="flex flex-col gap-5 pt-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void save();
        }}
      >
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="account-name">Name</FieldLabel>
          <Input
            id="account-name"
            value={name}
            autoComplete="off"
            maxLength={60}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              setErrors((x) => ({ ...x, name: undefined }));
              setName(e.target.value);
            }}
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
        {tracked ? (
          <MoneyInput
            label="Opening balance"
            value={opening}
            onChange={(t) => {
              setErrors((x) => ({ ...x, opening: undefined }));
              setOpening(t);
            }}
            error={errors.opening}
            hint={`Fix a typo. Sen still counts from ${shortDay(klDay(v.openingAt))}.`}
          />
        ) : null}
        <Button type="submit" aria-disabled={busy || undefined}>
          Save
        </Button>
        <Button type="button" variant="ghost" className="text-destructive" onClick={() => void archive()}>
          <ArchiveIcon aria-hidden="true" />
          Archive this account
        </Button>
      </form>
    </Sheet>
  );
}
