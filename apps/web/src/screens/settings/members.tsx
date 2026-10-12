import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { SettingsView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, Section } from '../kit';
import { MemberSheet, SWITCHES } from './member-sheet';

type View = SettingsView;

const STATUS = { active: 'Active', invited: 'Invited', suspended: 'Suspended' } as const;

/**
 * Settings → Members (screens.md; D52, D98), for the admin only: who is in, what each can use, their AI
 * credit and the shell seats. It shows usage and credit, never anyone's money (D52).
 */
export default function Members() {
  const q = useSettings();
  const [inviting, setInviting] = useState(false);
  return (
    <Screen bar={<AppBar title="Members" />}>
      <Loaded q={q} what="your members">
        {(s) =>
          s.admin ? (
            <Body s={s} inviting={inviting} setInviting={setInviting} />
          ) : (
            <EmptyState line="Only the admin sees Members." />
          )
        }
      </Loaded>
    </Screen>
  );
}

function Body({ s, inviting, setInviting }: { s: View; inviting: boolean; setInviting: (o: boolean) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const member = s.members.find((m) => m.id === openId) ?? null;
  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-2">
        <Button onClick={() => setInviting(true)}>
          <PlusIcon aria-hidden="true" />
          Invite
        </Button>
      </div>
      <Section title="Shell seats">
        <SettingsRow label="In use" value={`${s.seats.used} of ${s.seats.of}`} />
      </Section>
      <Section title="People">
        {s.members.map((m) => (
          <Item
            key={m.id}
            asChild
            size="sm"
            className="min-h-16 w-full flex-nowrap rounded-none text-left text-base active:bg-accent"
          >
            <button type="button" onClick={() => setOpenId(m.id)}>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="block w-full truncate text-base">
                  {m.name}
                  {m.email === s.email ? ' (you)' : ''}
                </ItemTitle>
                <ItemDescription className="truncate">
                  {m.email} · {m.switches.shell ? 'Android shell' : 'Browser'}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="max-w-[40%] text-right text-sm text-muted-foreground">
                {STATUS[m.status]}
                {m.unlimited || m.email === s.email ? '' : ` · ${formatSen(m.balance)}`}
              </ItemActions>
            </button>
          </Item>
        ))}
      </Section>
      <MemberSheet member={member} owner={member?.email === s.email} onClose={() => setOpenId(null)} />
      <InviteSheet open={inviting} onOpenChange={setInviting} seatsFull={s.seats.used >= s.seats.of} />
    </div>
  );
}

// What an invitation starts with; the command sets these, and anything changed is sent after it
const DEFAULTS = { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false };
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
  const [errors, setErrors] = useState<{ email?: string; welcome?: string; allowance?: string }>({});
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const e: typeof errors = {};
    const addr = email.trim();
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(addr))
      e.email = 'Type their email, like name@example.com.';
    const w = checkAmount(welcome);
    const a = checkAmount(allowance);
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
    });
    if (r) {
      setEmail('');
      setOn(DEFAULTS);
      setWelcome(WELCOME);
      setAllowance(ALLOWANCE);
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
        <div className="-mx-4 flex flex-col">
          {SWITCHES.filter((s) => s.key !== 'shell' && (s.key !== 'capture' || shell === 'shell')).map((s) => (
            <SettingsRow
              key={s.key}
              label={s.label}
              description={s.about}
              checked={s.key !== 'shell' && on[s.key]}
              onCheckedChange={(v) => setOn((o) => ({ ...o, [s.key]: v }))}
            />
          ))}
        </div>
        <MoneyInput
          label="Welcome credit"
          value={welcome}
          onChange={(t) => {
            setErrors((x) => ({ ...x, welcome: undefined }));
            setWelcome(t);
          }}
          error={errors.welcome}
        />
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
        <Button onClick={() => void send()} aria-disabled={busy || undefined}>
          Send invitation
        </Button>
      </div>
    </Sheet>
  );
}
