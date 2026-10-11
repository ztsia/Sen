import { useState } from 'react';
import { formatSen } from '@sen/core/money';
import type { SettingsView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { DestructiveDialog } from '@/blocks/dialog';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { useWrite } from '@/data/hooks';
import { AmountEditor } from './parts';

export type Member = SettingsView['members'][number];
type Key = keyof Member['switches'];

/** What each switch lets a person use (D52). The shell and capture are one pair: capture needs the shell. */
export const SWITCHES: { key: Key; label: string; about: string }[] = [
  { key: 'shell', label: 'Android shell', about: 'Uses one of the shell seats.' },
  { key: 'capture', label: 'Capture', about: 'Reads the payment notifications of the apps they choose.' },
  { key: 'agent', label: 'Sen', about: 'The assistant, with AI credit.' },
  { key: 'splits', label: 'Shared bills', about: 'Splits with friends.' },
  { key: 'email', label: 'Receipts by email', about: 'Their forwarding address.' },
  { key: 'calendar', label: 'Calendar', about: 'Google Calendar reminders.' },
  { key: 'claims', label: 'Claims', about: 'Work claims and the ESS adapter.' },
];

const rmText = (sen: number) => formatSen(sen).replace('RM', '').replace(/,/g, '');

/**
 * One member (screens.md Members, D52, D98): their switches, AI credit, shell and capture state, then
 * Suspend and Remove. It shows usage and credit, never money (D52). The admin's own row has no credit,
 * Suspend or Remove: Sen is paid directly for them.
 */
export function MemberSheet({
  member: m,
  owner,
  onClose,
}: {
  member: Member | null;
  owner: boolean;
  onClose: () => void;
}) {
  const write = useWrite();
  const [remove, setRemove] = useState(false);
  if (!m) return null;
  const set = (key: string, value: boolean | number | string) =>
    void write({ type: 'member.set', id: m.id, key, value });
  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={m.name}
        description={`${m.email} · ${m.status === 'invited' ? 'Invited, not signed in yet' : m.status === 'suspended' ? 'Suspended' : 'Active'}`}
      >
        <div className="-mx-4 flex flex-col pb-2">
          <h3 className="px-4 pt-2 pb-1 text-sm font-semibold text-muted-foreground">Can use</h3>
          {SWITCHES.map((s) => (
            <SettingsRow
              key={s.key}
              label={s.label}
              description={s.about}
              checked={m.switches[s.key]}
              disabled={owner && (s.key === 'shell' || s.key === 'agent')}
              onCheckedChange={(on) => set(s.key, on)}
            />
          ))}
          <h3 className="px-4 pt-5 pb-1 text-sm font-semibold text-muted-foreground">Phone</h3>
          <SettingsRow label="Shell version" value={m.shellVersion ?? 'Browser only'} />
          <SettingsRow label="Capture connected" value={m.captureConnected ? 'Yes' : 'No'} />
          {owner ? null : (
            <>
              <h3 className="px-4 pt-5 pb-1 text-sm font-semibold text-muted-foreground">AI credit</h3>
              <SettingsRow label="Balance" value={formatSen(m.balance)} />
              <SettingsRow
                label="Allowance left this month"
                value={m.unlimited ? 'Unlimited' : `${formatSen(m.allowanceLeft)} of ${formatSen(m.allowance)}`}
              />
              <SettingsRow
                label="Unlimited"
                description="No ceiling on their credit."
                checked={m.unlimited}
                onCheckedChange={(on) => set('unlimited', on)}
              />
              <div className="flex flex-col gap-5 px-4 pt-3">
                <CreditAmount
                  label="Grant or refund"
                  hint="Grant adds to their balance; Refund takes it back."
                  max={m.balance}
                  onGrant={(sen) => set('grant', sen)}
                  onRefund={(sen) => set('grant', -sen)}
                />
                <AmountEditor
                  key={`a${m.allowance}`}
                  label="Monthly allowance"
                  initial={rmText(m.allowance)}
                  action="Save allowance"
                  onSave={(sen) => set('allowance', sen)}
                />
                <AmountEditor
                  key={`d${m.dailyCeiling}`}
                  label="Daily ceiling"
                  initial={rmText(m.dailyCeiling)}
                  action="Save ceiling"
                  hint="The most Sen spends for them in a day."
                  onSave={(sen) => set('dailyCeiling', sen)}
                />
              </div>
              <div className="flex flex-col gap-2 px-4 pt-6">
                {m.status === 'invited' ? null : (
                  <Button
                    variant="secondary"
                    onClick={() => set('status', m.status === 'suspended' ? 'active' : 'suspended')}
                  >
                    {m.status === 'suspended' ? 'Let them back in' : 'Suspend'}
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setRemove(true)}>
                  Remove
                </Button>
              </div>
            </>
          )}
        </div>
      </Sheet>
      <DestructiveDialog
        open={remove}
        onOpenChange={setRemove}
        title={`Remove ${m.name}?`}
        description="They can't sign in any more and their data is deleted. This can't be undone."
        action="Remove"
        onConfirm={() => {
          setRemove(false);
          onClose();
          void write({ type: 'member.remove', id: m.id }, { quiet: true });
        }}
      />
    </>
  );
}

/** One amount with two buttons: Grant and Refund. A refund can't take more than the balance. */
function CreditAmount({
  label,
  hint,
  max,
  onGrant,
  onRefund,
}: {
  label: string;
  hint: string;
  max: number;
  onGrant: (sen: number) => void;
  onRefund: (sen: number) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const go = (fn: (sen: number) => void, refund: boolean) => {
    const r = checkAmount(text);
    if (r.error !== undefined) return setError(r.error);
    if (r.sen === 0) return setError('Type an amount above zero.');
    if (refund && r.sen > max) return setError(`They only have ${formatSen(max)} to refund.`);
    setError(undefined);
    setText('');
    fn(r.sen);
  };
  return (
    <div className="flex flex-col gap-2">
      <MoneyInput
        label={label}
        value={text}
        onChange={(t) => {
          setError(undefined);
          setText(t);
        }}
        error={error}
        hint={hint}
      />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => go(onGrant, false)}>
          Grant
        </Button>
        <Button variant="secondary" onClick={() => go(onRefund, true)}>
          Refund
        </Button>
      </div>
    </div>
  );
}
