import { useState } from 'react';
import { PlusIcon, UsersIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { SettingsView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { GroupCard, PersonRow, SwitchRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, useGo } from '../kit';
import { SWITCHES } from './member';

type View = SettingsView;

const STATUS = {
  active: { label: 'Active', tone: 'accent' },
  invited: { label: 'Invited', tone: 'outline' },
  suspended: { label: 'Suspended', tone: 'warning' },
} as const;

/**
 * Settings → Members (screens.md; D52, D98), for the admin only: who is in, what each can use, their AI
 * credit and the shell seats. It shows usage and credit, never anyone's money (D52).
 */
export default function Members() {
  const q = useSettings();
  const [inviting, setInviting] = useState(false);
  return (
    <Screen
      bar={
        <AppBar
          title="Members"
          action={
            <Button variant="ghost" size="sm" onClick={() => setInviting(true)}>
              <PlusIcon aria-hidden="true" />
              Invite
            </Button>
          }
        />
      }
    >
      <Loaded q={q} what="your members">
        {(s) =>
          s.admin ? (
            <Body s={s} inviting={inviting} setInviting={setInviting} />
          ) : (
            <EmptyState icon={UsersIcon} title="Admin only" line="Only the admin sees Members." />
          )
        }
      </Loaded>
    </Screen>
  );
}

function Body({ s, inviting, setInviting }: { s: View; inviting: boolean; setInviting: (o: boolean) => void }) {
  const go = useGo();
  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <Card className="mx-4 gap-2 px-4 py-4" aria-label="Shell seats">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Shell seats in use</p>
          <p className="text-base font-semibold">{`${s.seats.used} of ${s.seats.of}`}</p>
        </div>
        <Progress value={(s.seats.used / Math.max(1, s.seats.of)) * 100} aria-label="Shell seats in use" />
      </Card>
      <GroupCard label="People">
        {s.members.map((m) => (
          <PersonRow
            key={m.id}
            name={`${m.name}${m.email === s.email ? ' (you)' : ''}`}
            detail={`${m.email} · ${m.switches.shell ? 'Android shell' : 'Browser'}`}
            state={STATUS[m.status]}
            trailing={
              m.unlimited || m.email === s.email ? null : (
                <span className="text-sm text-muted-foreground">{formatSen(m.balance)}</span>
              )
            }
            onOpen={() => go('settings/member', { id: m.id })}
          />
        ))}
      </GroupCard>
      <InviteSheet open={inviting} onOpenChange={setInviting} seatsFull={s.seats.used >= s.seats.of} />
    </div>
  );
}

// What an invitation starts with; the command sets these, and anything changed is sent after it
const DEFAULTS = { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false };
const EMAIL_MAX = 254;
// no consecutive dots, and no label that starts or ends with a hyphen
const validEmail = (a: string) =>
  a.length <= EMAIL_MAX &&
  !a.includes('..') &&
  // eslint-disable-next-line security/detect-unsafe-regex -- runs only after the length cap above, which bounds its backtracking
  /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(a);
const WELCOME = '10.00';
const ALLOWANCE = '2.00';

function InviteSheet({
  open,
  onOpenChange,
  seatsFull,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seatsFull: boolean;
}) {
  const write = useWrite();
  const [email, setEmail] = useState('');
  const [shell, setShell] = useState<'browser' | 'shell'>('browser');
  const [on, setOn] = useState<typeof DEFAULTS>(DEFAULTS);
  const [welcome, setWelcome] = useState(WELCOME);
  const [allowance, setAllowance] = useState(ALLOWANCE);
  const [unlimited, setUnlimited] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; welcome?: string; allowance?: string }>({});
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const e: typeof errors = {};
    const addr = email.trim();
    if (!validEmail(addr)) e.email = 'Type their email, like name@example.com.';
    const w = checkAmount(welcome);
    const a = unlimited ? { sen: 0 as number | undefined, error: undefined } : checkAmount(allowance);
    if (w.error !== undefined) e.welcome = w.error;
    if (a.error !== undefined) e.allowance = a.error;
    setErrors(e);
    if (e.email || e.welcome || e.allowance || w.sen === undefined || a.sen === undefined) return;
    setBusy(true);
    const isShell = shell === 'shell';
    const r = await write({
      type: 'member.invite',
      email: addr,
      shell: isShell,
      switches: { ...DEFAULTS, ...on } as typeof DEFAULTS,
      welcome: w.sen,
      allowance: a.sen,
      unlimited,
    });
    if (r) {
      setEmail('');
      setOn(DEFAULTS);
      setWelcome(WELCOME);
      setAllowance(ALLOWANCE);
      setUnlimited(false);
      onOpenChange(false);
    }
    setBusy(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invite someone"
      description="They get an email with a link. You'll see their AI usage and credit, never their money."
    >
      <div className="flex flex-col gap-5 pb-2">
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="invite-email">Their email</FieldLabel>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            maxLength={EMAIL_MAX}
            aria-invalid={errors.email ? true : undefined}
            onChange={(e) => {
              setErrors((x) => ({ ...x, email: undefined }));
              setEmail(e.target.value);
            }}
          />
          {errors.email ? <FieldError>{errors.email}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel id="invite-where">They will use</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            aria-labelledby="invite-where"
            value={shell}
            onValueChange={(v) => v && setShell(v as 'browser' | 'shell')}
          >
            <ToggleGroupItem value="browser">Browser</ToggleGroupItem>
            <ToggleGroupItem value="shell" disabled={seatsFull}>
              Android shell
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            {seatsFull
              ? 'All the shell seats are taken.'
              : shell === 'shell'
                ? 'Uses a shell seat and can capture payments from the apps they choose.'
                : 'A browser has no capture: they add payments and receipts by hand.'}
          </FieldDescription>
        </Field>
        <GroupCard className="-mx-4">
          {SWITCHES.filter((s) => s.key !== 'shell' && (s.key !== 'capture' || shell === 'shell')).map((s) => (
            <SwitchRow
              key={s.key}
              title={s.label}
              description={s.about}
              checked={s.key !== 'shell' && on[s.key]}
              onCheckedChange={(v) => setOn((o) => ({ ...o, [s.key]: v }))}
            />
          ))}
        </GroupCard>
        <MoneyInput
          label="Welcome credit"
          value={welcome}
          onChange={(t) => {
            setErrors((x) => ({ ...x, welcome: undefined }));
            setWelcome(t);
          }}
          error={errors.welcome}
        />
        <GroupCard className="-mx-4">
          <SwitchRow
            title="Unlimited"
            description="No ceiling on their credit; their charges are recorded as covered."
            checked={unlimited}
            onCheckedChange={setUnlimited}
          />
        </GroupCard>
        {unlimited ? null : (
          <MoneyInput
            label="Monthly allowance"
            value={allowance}
            onChange={(t) => {
              setErrors((x) => ({ ...x, allowance: undefined }));
              setAllowance(t);
            }}
            error={errors.allowance}
            hint="Free each month before their credit is used."
          />
        )}
        <Button onClick={() => void send()} aria-disabled={busy || undefined}>
          Send invitation
        </Button>
      </div>
    </Sheet>
  );
}
