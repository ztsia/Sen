import { useState } from 'react';
import {
  EllipsisIcon,
  HandCoinsIcon,
  LogInIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  UserCheckIcon,
} from 'lucide-react';
import type { SettingsView } from '@sen/core/views';
import { formatSen } from '@sen/core/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DestructiveDialog } from '@/blocks/dialog';
import { GroupCard, NavRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { longDay } from '@/lib/dates';
import { DEV_TOOLS } from '@/lib/env';
import { captureReachable } from '@/shell/bridge';
import { Loaded } from '../kit';

type Claims = SettingsView['claims'];

/**
 * Settings → Claims (screens.md; spec §13, D95, D96, D103–D106): the schemes, each to describe to Sen in
 * your own words; the ESS sender address; and, in the shell, ESS itself. Values here are what you
 * typed, so Sen may see them (D95); the made-up ones are not anyone's real claim.
 */
export default function ClaimsSettings() {
  const q = useSettings();
  return (
    <Screen
      bar={
        <AppBar
          title="Claims"
          action={
            <Button variant="outline" size="sm" onClick={() => useUi.getState().askSen(ADD_SCHEME)}>
              <PlusIcon aria-hidden="true" />
              Add a scheme
            </Button>
          }
        />
      }
    >
      <Loaded q={q} what="your claims settings">
        {(s) =>
          s.switches.claims ? (
            <Body claims={s.claims} />
          ) : (
            <EmptyState icon={HandCoinsIcon} title="Claims are off" line="Claims are off for you." />
          )
        }
      </Loaded>
    </Screen>
  );
}

const ordinal = (n: number) => {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

/** What Sen's message box starts with, for you to finish in your own words (D95, D135). */
const ADD_SCHEME = 'I want to add a claim scheme: ';
const editScheme = (name: string) => `Change my ${name} scheme: `;

function Body({ claims }: { claims: Claims }) {
  const askSen = useUi((s) => s.askSen);
  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      {claims.schemes.length ? (
        <GroupCard
          label="Schemes"
          footer="Describe a scheme to Sen in your own words, and it sets it up for you to confirm."
        >
          {claims.schemes.map((c) => (
            <NavRow
              key={c.id}
              icon={ReceiptTextIcon}
              tone="accent"
              title={c.name}
              description={`Up to ${formatSen(c.cap)} a month, submit by the ${ordinal(c.deadlineDay)}, from ${
                c.source === 'tagged' ? 'spending you tag' : 'receipts kept as evidence'
              }`}
              trailing={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => askSen(editScheme(c.name))}
                >
                  <PencilIcon />
                </Button>
              }
            />
          ))}
        </GroupCard>
      ) : (
        <EmptyState
          icon={HandCoinsIcon}
          title="No schemes yet"
          line="Tell Sen about one in your own words and it sets it up for you to confirm."
          action={{ label: 'Describe a scheme to Sen', icon: SenMark, onSelect: () => askSen(ADD_SCHEME) }}
        />
      )}
      <EssCard claims={claims} showEss={captureReachable() || DEV_TOOLS} />
    </div>
  );
}

/**
 * ESS as one connection card (D103–D106): signed in, the payslip steps recorded, the sender address. The
 * sign-in is a native screen, so here it is a stand-in; passwords never reach the page. Without the
 * shell only the sender address shows.
 */
function EssCard({ claims, showEss }: { claims: Claims; showEss: boolean }) {
  const write = useWrite();
  const { setSenOpen } = useUi();
  const { ess, essSender: sender } = claims;
  const [signIn, setSignIn] = useState(false);
  const [forget, setForget] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);
  const [text, setText] = useState(sender ?? '');
  const [error, setError] = useState<string | undefined>();
  const setSignedIn = (signedIn: boolean, quiet = false) =>
    write({ type: 'setting.set', key: 'claims.ess.signedIn', value: signedIn }, { quiet });
  const save = () => {
    const v = text.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Type the address, like name@example.com.');
    void write({ type: 'setting.set', key: 'claims.essSender', value: v || null }).then(
      (r) => r && setSenderOpen(false),
    );
  };
  const recorded = ess.capabilities.filter((c) => c.recorded);
  const menu =
    showEss && ess.signedIn ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More about ESS">
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {recorded.map((c) => (
            <DropdownMenuItem key={c.name} onSelect={() => setSenOpen(true)}>
              Teach again: {c.name}
            </DropdownMenuItem>
          ))}
          {recorded.length ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem variant="destructive" onSelect={() => setForget(true)}>
            Forget password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;
  return (
    <GroupCard label="ESS">
      {showEss ? (
        <NavRow
          icon={ess.signedIn ? UserCheckIcon : LogInIcon}
          tone={ess.signedIn ? 'accent' : 'neutral'}
          title={ess.signedIn ? 'Signed in to ESS' : 'Not signed in'}
          description={
            ess.signedIn ? undefined : 'Sign in once and Sen can fetch your payslip and, once taught, submit claims.'
          }
          trailing={
            ess.signedIn ? (
              <>
                <Badge variant="accent">Signed in</Badge>
                {menu}
              </>
            ) : (
              <Button size="sm" onClick={() => setSignIn(true)}>
                Sign in to ESS
              </Button>
            )
          }
        />
      ) : null}
      {showEss
        ? ess.capabilities.map((c) => (
            <div key={c.name}>
              <NavRow
                title={c.name}
                description={
                  c.recorded ? 'Sen knows these steps.' : 'Show Sen the steps once, or import a recipe someone made.'
                }
                trailing={
                  <Badge variant={c.recorded ? 'accent' : 'muted'}>{c.recorded ? 'Recorded' : 'Not recorded'}</Badge>
                }
              />
              {c.recorded ? null : (
                <div className="flex flex-wrap gap-2 px-4 pb-3 pl-15">
                  <Button variant="secondary" size="sm" onClick={() => setSenOpen(true)}>
                    Teach Sen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void write({ type: 'setting.set', key: 'claims.ess.recipe', value: c.name })}
                  >
                    Import recipe
                  </Button>
                </div>
              )}
            </div>
          ))
        : null}
      {showEss && ess.signedIn ? (
        <NavRow title="Last payslip fetched" value={ess.lastPayslip ? longDay(ess.lastPayslip) : 'Not yet'} />
      ) : null}
      <NavRow
        icon={MailIcon}
        title="ESS email address"
        value={sender ?? 'Not set'}
        onOpen={() => {
          setText(sender ?? '');
          setError(undefined);
          setSenderOpen(true);
        }}
      />
      <Sheet
        open={senderOpen}
        onOpenChange={setSenderOpen}
        title="ESS email address"
        description="The address ESS sends from, so Sen can tell its emails from the rest (D96)."
      >
        <div className="flex flex-col gap-3">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="ess-sender">Address</FieldLabel>
            <Input
              id="ess-sender"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={text}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setError(undefined);
                setText(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>Leave it empty to clear it.</FieldDescription>
            )}
          </Field>
          <Button onClick={save}>Save</Button>
        </div>
      </Sheet>
      <Sheet
        open={signIn}
        onOpenChange={setSignIn}
        title="Sign in to ESS"
        description="In the shell this is a screen of its own, and your password stays on the phone (D103). This is a stand-in."
      >
        <Button
          className="w-full"
          onClick={() =>
            void setSignedIn(true).then((r) => {
              if (r) setSignIn(false);
            })
          }
        >
          Pretend I signed in
        </Button>
      </Sheet>
      <DestructiveDialog
        open={forget}
        onOpenChange={setForget}
        title="Forget your ESS password?"
        description="Sen signs out of ESS and deletes the password from this phone. It can't be undone: you would sign in again."
        action="Forget password"
        onConfirm={() => {
          setForget(false);
          void setSignedIn(false, true).then((r) => r && toastDone('Forgot your ESS password'));
        }}
      />
    </GroupCard>
  );
}
