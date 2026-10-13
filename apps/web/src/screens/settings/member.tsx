import { useState } from 'react';
import { CircleCheckIcon, ClockIcon, SmartphoneIcon, UserRoundXIcon, WalletIcon } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { formatSen } from '@sen/core/money';
import type { SettingsView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { FactGrid, HeaderCard } from '@/blocks/facts';
import { GroupCard, GroupLabel, NavRow, PersonAvatar, SwitchRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { Badge } from '@/components/ui/badge';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, useGo, useScreenSearch } from '../kit';
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

const STATUS = {
  active: { label: 'Active', tone: 'accent' },
  invited: { label: 'Invited', tone: 'outline' },
  suspended: { label: 'Suspended', tone: 'warning' },
} as const;

const rmText = (sen: number) => formatSen(sen).replace('RM', '').replace(/,/g, '');

/**
 * One member (screens.md Members, D52, D98, D130), a pushed screen opened with ?id=: who they are, what
 * they can use, their phone and AI credit, then Suspend and Remove. It shows usage and credit, never
 * money (D52). The admin's own row has no credit, Suspend or Remove: Sen is paid directly for them.
 */
export default function MemberScreen() {
  const { id } = useScreenSearch();
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Member" />}>
      <Loaded q={q} what="this member" skeleton={<ListSkeleton rows={5} />}>
        {(s) => {
          const m = s.members.find((x) => x.id === id);
          return m ? <Body m={m} owner={m.email === s.email} /> : <Gone />;
        }}
      </Loaded>
    </Screen>
  );
}

function Gone() {
  const go = useGo();
  return (
    <EmptyState
      icon={UserRoundXIcon}
      title="Not here any more"
      line="This person was removed, or the link is old."
      action={{ label: 'See all members', onSelect: () => go('settings/members') }}
    />
  );
}

function Body({ m, owner }: { m: Member; owner: boolean }) {
  const write = useWrite();
  const router = useRouter();
  const [remove, setRemove] = useState(false);
  const set = (key: string, value: boolean | number | string) =>
    void write({ type: 'member.set', id: m.id, key, value });
  const back = () => router.history.back();
  const confirmRemove = (exportFirst: boolean) => {
    setRemove(false);
    back();
    void write(
      { type: 'member.remove', id: m.id, ...(exportFirst ? { exportFirst: true } : {}) },
      { quiet: true },
    ).then(
      (r) =>
        r && toastDone(exportFirst ? `Removed ${m.name}. Their data export goes to ${m.email}` : `Removed ${m.name}`),
    );
  };
  const status = STATUS[m.status];
  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <HeaderCard
        mark={<PersonAvatar name={m.name} size="xl" />}
        title={m.name}
        meta={m.email}
        source={m.status === 'invited' ? 'Invited, not signed in yet' : undefined}
        badge={<Badge variant={status.tone}>{status.label}</Badge>}
      />
      <GroupCard label="Can use">
        {SWITCHES.map((s) => (
          <SwitchRow
            key={s.key}
            title={s.label}
            description={s.about}
            checked={m.switches[s.key]}
            disabled={owner && (s.key === 'shell' || s.key === 'agent')}
            onCheckedChange={(on) => set(s.key, on)}
          />
        ))}
      </GroupCard>
      <GroupCard label="Phone">
        <NavRow icon={SmartphoneIcon} title="Shell version" value={m.shellVersion ?? 'Browser only'} />
        <NavRow
          icon={m.captureConnected ? CircleCheckIcon : ClockIcon}
          tone={m.captureConnected ? 'accent' : 'neutral'}
          title="Capture connected"
          value={m.captureConnected ? 'Yes' : 'No'}
        />
      </GroupCard>
      {owner ? null : (
        <>
          <section className="flex flex-col gap-2" aria-label="AI credit">
            <div className="px-5">
              <GroupLabel>AI credit</GroupLabel>
            </div>
            <FactGrid
              facts={[
                { label: 'Balance', value: formatSen(m.balance) },
                {
                  label: 'Allowance left this month',
                  value: m.unlimited ? 'Unlimited' : `${formatSen(m.allowanceLeft)} of ${formatSen(m.allowance)}`,
                },
              ]}
            />
          </section>
          <GroupCard label="Credit settings">
            <SwitchRow
              icon={WalletIcon}
              title="Unlimited"
              description="No ceiling on their credit."
              checked={m.unlimited}
              onCheckedChange={(on) => set('unlimited', on)}
            />
            <div className="flex flex-col gap-5 px-4 py-4">
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
          </GroupCard>
          <div className="flex flex-col gap-2 px-4">
            {m.status === 'invited' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void write({ type: 'member.resend', id: m.id }, { quiet: true }).then(
                      (r) => r && toastDone('Invitation sent again'),
                    )
                  }
                >
                  Resend
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    back();
                    void write({ type: 'member.revoke', id: m.id });
                  }}
                >
                  Revoke
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set('status', m.status === 'suspended' ? 'active' : 'suspended')}
                >
                  {m.status === 'suspended' ? 'Let them back in' : 'Suspend'}
                </Button>
                <Button variant="destructive" onClick={() => setRemove(true)}>
                  Remove
                </Button>
              </>
            )}
          </div>
        </>
      )}
      <Sheet
        open={remove}
        onOpenChange={setRemove}
        title={`Remove ${m.name}?`}
        description="They can't sign in any more and their data is deleted. This can't be undone. Send them a copy of their data first?"
      >
        <div className="flex flex-col gap-2 pb-2">
          <Button variant="secondary" size="sm" onClick={() => confirmRemove(true)}>
            Export their data first
          </Button>
          <Button variant="destructive" onClick={() => confirmRemove(false)}>
            Remove
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRemove(false)}>
            Keep them
          </Button>
        </div>
      </Sheet>
    </div>
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
        <Button variant="secondary" size="sm" onClick={() => go(onGrant, false)}>
          Grant
        </Button>
        <Button variant="secondary" size="sm" onClick={() => go(onRefund, true)}>
          Refund
        </Button>
      </div>
    </div>
  );
}
