import { useState } from 'react';
import type { SettingsView } from '@sen/core/views';
import { formatSen } from '@sen/core/money';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DestructiveDialog } from '@/blocks/dialog';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useUi } from '@/frame/ui-store';
import { longDay } from '@/lib/dates';
import { DEV_TOOLS } from '@/lib/env';
import { captureReachable } from '@/shell/bridge';
import { Loaded, Section } from '../kit';
import { ActionRow } from './parts';

type Claims = SettingsView['claims'];

/**
 * Settings → Claims (screens.md; spec §13, D95, D96, D103–D106): the schemes, each to describe to Sen in
 * your own words; the ESS sender address; and, in the shell, ESS itself. Values here are what you
 * typed, so Sen may see them (D95); the made-up ones are not anyone's real claim.
 */
export default function ClaimsSettings() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Claims" />}>
      <Loaded q={q} what="your claims settings">
        {(s) => (s.switches.claims ? <Body claims={s.claims} /> : <EmptyState line="Claims are off for you." />)}
      </Loaded>
    </Screen>
  );
}

const deadline = (d: number) => `by day ${d}`;

function Body({ claims }: { claims: Claims }) {
  const { setSenOpen } = useUi();
  return (
    <div className="flex flex-col pb-4">
      <Section title="Schemes">
        {claims.schemes.length ? (
          claims.schemes.map((c) => (
            <ActionRow
              key={c.id}
              title={c.name}
              line={`Monthly, up to ${formatSen(c.cap)}, ${deadline(c.deadlineDay)} · from ${
                c.source === 'tagged' ? 'spending you tag' : 'receipts kept as evidence'
              }`}
            >
              <Button variant="secondary" size="sm" onClick={() => setSenOpen(true)}>
                Describe it to Sen
              </Button>
            </ActionRow>
          ))
        ) : (
          <EmptyState
            line="No schemes yet. Tell Sen about one in your own words and it sets it up for you to confirm."
            action={{ label: 'Describe a scheme to Sen', onSelect: () => setSenOpen(true) }}
          />
        )}
      </Section>
      <Sender sender={claims.essSender} />
      {captureReachable() || DEV_TOOLS ? <Ess ess={claims.ess} /> : null}
    </div>
  );
}

function Sender({ sender }: { sender: string | null }) {
  const write = useWrite();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(sender ?? '');
  const [error, setError] = useState<string | undefined>();
  const save = () => {
    const v = text.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Type the address, like name@example.com.');
    void write({ type: 'setting.set', key: 'claims.essSender', value: v || null }).then((r) => r && setOpen(false));
  };
  return (
    <Section title="ESS sender">
      <SettingsRow
        label="ESS email address"
        value={sender ?? 'Not set'}
        onOpen={() => {
          setText(sender ?? '');
          setError(undefined);
          setOpen(true);
        }}
      />
      <Sheet
        open={open}
        onOpenChange={setOpen}
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
    </Section>
  );
}

/** ESS (D103–D106): the sign-in is a native screen, so here it is a stand-in; passwords never reach the page. */
function Ess({ ess }: { ess: Claims['ess'] }) {
  const write = useWrite();
  const { setSenOpen } = useUi();
  const [signIn, setSignIn] = useState(false);
  const [forget, setForget] = useState(false);
  const setSignedIn = (signedIn: boolean, quiet = false) =>
    write({ type: 'setting.set', key: 'claims.ess.signedIn', value: signedIn }, { quiet });
  return (
    <Section title="ESS">
      {ess.signedIn ? (
        <>
          <SettingsRow label="Signed in to ESS" value="Yes" />
          <SettingsRow label="Forget ESS password" onOpen={() => setForget(true)} />
        </>
      ) : (
        <ActionRow
          title="Not signed in"
          line="Sign in once and Sen can fetch your payslip and, once taught, submit claims."
        >
          <Button size="sm" onClick={() => setSignIn(true)}>
            Sign in to ESS
          </Button>
        </ActionRow>
      )}
      {ess.capabilities.map((c) => (
        <ActionRow
          key={c.name}
          title={c.name}
          value={c.recorded ? 'Recorded' : 'Not recorded'}
          line={c.recorded ? 'Sen knows these steps.' : 'Show Sen the steps once, or import a recipe someone made.'}
        >
          <Button variant="secondary" size="sm" onClick={() => setSenOpen(true)}>
            {c.recorded ? 'Teach again' : 'Teach Sen'}
          </Button>
          {c.recorded ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void write({ type: 'setting.set', key: 'claims.ess.recipe', value: c.name })}
            >
              Import recipe
            </Button>
          )}
        </ActionRow>
      ))}
      {ess.signedIn ? (
        <SettingsRow label="Last payslip fetched" value={ess.lastPayslip ? longDay(ess.lastPayslip) : 'Not yet'} />
      ) : null}
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
    </Section>
  );
}
