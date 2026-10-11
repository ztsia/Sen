import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { SettingsRow } from '@/blocks/rows';
import { EmptyState, OfflineBanner } from '@/blocks/states';
import { useAccountList, useCategories, useMe } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useOnline } from '@/lib/online';
import { readStored, writeStored } from '@/lib/storage';
import { Loaded, useGo } from '../kit';
import { SignInFlow } from './sign-in';
import { parseDay, printedName, stepsFor, type StepId } from './logic';

const KEY = 'sen.firstRun.step';

const TITLES: Record<StepId, string> = {
  'sign-in': 'Sign in',
  apps: 'Choose your apps',
  access: 'Notification access',
  running: 'Keep Sen running',
  accounts: 'Your accounts',
  name: 'Your name',
  payday: 'Expected payday',
  categories: 'Your categories',
};

/**
 * `first-run` (screens.md, flows.md, D26, D86): full screen, one step per screen, with Back and a step
 * count. Seven steps with capture; without it, sign in and categories (§9.6, D79). It reopens at the
 * step it was closed on. The steps never come back once done (D26). Choices are kept in the screen
 * until B08 saves them.
 */
export default function FirstRun() {
  const me = useMe();
  return (
    <Loaded
      q={me}
      what="Sen"
      skeleton={
        <Frame title="Welcome" count={null} onBack={() => undefined}>
          {null}
        </Frame>
      }
    >
      {(m) => <Steps capture={m.capture} />}
    </Loaded>
  );
}

function Steps({ capture }: { capture: boolean }) {
  const go = useGo();
  const online = useOnline();
  const steps = stepsFor(capture);
  const [i, setI] = useState(() => {
    const at = steps.findIndex((_, k) => k > 0 && String(k) === readStored(KEY));
    return at > 0 ? at : 0;
  });
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const to = (n: number) => {
    setI(n);
    writeStored(KEY, n === 0 ? null : String(n));
  };
  const next = () => {
    if (last) {
      writeStored(KEY, null);
      go('home', {}, { replace: true });
    } else to(i + 1);
  };
  const [names, setNames] = useState('');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [off, setOff] = useState<Set<string>>(new Set());
  const [payday, setPayday] = useState<{ kind: 'last' | 'day'; day: string }>({ kind: 'last', day: '' });
  return (
    <Frame
      title={TITLES[step]}
      count={{ at: i + 1, of: steps.length }}
      offline={!online}
      onBack={() => (i === 0 ? window.history.back() : to(i - 1))}
    >
      {step === 'sign-in' ? (
        <div className="px-4 pt-6">
          <SignInFlow onDone={next} />
        </div>
      ) : step === 'categories' ? (
        <Categories off={off} setOff={setOff} onDone={next} />
      ) : step === 'apps' ? (
        <BuiltStep
          to="settings/capture/apps"
          open="Open your apps"
          line="Pick the banks and e-wallets Sen reads notifications from. Other apps are ignored, and messaging, SMS and email apps can never be chosen."
          onNext={next}
        />
      ) : step === 'access' ? (
        <BuiltStep
          to="settings/capture/access"
          open="Open notification access"
          line="Switch Sen on in Android’s notification access, once. If the switch is greyed out, Sen shows you how to allow restricted settings."
          onNext={next}
          skip
        />
      ) : step === 'running' ? (
        <BuiltStep
          to="settings/capture/running"
          open="Open Keep Sen running"
          line="Android may stop Sen to save battery. This step lets it run, with the extra steps your phone’s brand needs."
          onNext={next}
          skip
        />
      ) : step === 'accounts' ? (
        <Accounts balances={balances} setBalances={setBalances} onNext={next} />
      ) : step === 'name' ? (
        <NameStep value={names} onChange={setNames} onNext={next} />
      ) : (
        <PaydayStep value={payday} onChange={setPayday} onNext={next} last={last} />
      )}
    </Frame>
  );
}

/** One step's frame: back, the title, the count, and a thin bar of how far along. No tab bar (screens.md). */
function Frame({
  title,
  count,
  offline,
  onBack,
  children,
}: {
  title: string;
  count: { at: number; of: number } | null;
  offline?: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <Screen
      bar={
        <div>
          <AppBar
            title={title}
            onBack={onBack}
            action={
              count ? (
                <span className="pr-3 text-sm whitespace-nowrap text-muted-foreground">
                  Step {count.at} of {count.of}
                </span>
              ) : undefined
            }
          />
          {count ? (
            <div className="mx-4 h-1 bg-muted" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${(count.at / count.of) * 100}%` }} />
            </div>
          ) : null}
        </div>
      }
    >
      {offline ? <OfflineBanner>You’re offline. Signing in needs a connection; the rest waits.</OfflineBanner> : null}
      <div className="flex min-h-full flex-col">{children}</div>
    </Screen>
  );
}

/** The sticky bottom: the step's main action, with an optional quiet one under it. */
function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-background/95 px-4 pt-3 pb-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

/**
 * The shell's own step screens (B02) draw their own bar, so they can't sit inside this frame as they
 * are. Until they take a bare mode, this step says what it is and opens the built screen.
 */
function BuiltStep({
  to,
  open,
  line,
  onNext,
  skip,
}: {
  to: string;
  open: string;
  line: string;
  onNext: () => void;
  skip?: boolean;
}) {
  const go = useGo();
  return (
    <>
      <p className="px-4 pt-4 text-base text-pretty">{line}</p>
      <div className="px-4 pt-4">
        <Button variant="outline" size="lg" className="w-full" onClick={() => go(to)}>
          {open}
        </Button>
      </div>
      <Actions>
        <Button size="lg" onClick={onNext}>
          Next
        </Button>
        {skip ? (
          <Button variant="ghost" onClick={onNext}>
            Skip for now
          </Button>
        ) : null}
      </Actions>
    </>
  );
}

function Accounts({
  balances,
  setBalances,
  onNext,
}: {
  balances: Record<string, string>;
  setBalances: (b: Record<string, string>) => void;
  onNext: () => void;
}) {
  const q = useAccountList();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = (ids: string[]) => {
    const e: Record<string, string> = {};
    for (const id of ids) {
      const t = balances[id] ?? '';
      if (t.trim() && checkAmount(t).error) e[id] = checkAmount(t).error!;
    }
    setErrors(e);
    if (!Object.keys(e).length) onNext();
  };
  return (
    <Loaded q={q} what="your accounts">
      {(v) => (
        <>
          <p className="px-4 pt-4 text-base text-pretty">
            Type today’s balance in each account, as your bank shows it. Sen counts from here. Leave one blank to set it
            later.
          </p>
          {v.tracked.length ? (
            <div className="flex flex-col gap-5 px-4 pt-4">
              {v.tracked.map((a) => (
                <MoneyInput
                  key={a.id}
                  label={a.name}
                  value={balances[a.id] ?? ''}
                  error={errors[a.id]}
                  onChange={(t) => {
                    setBalances({ ...balances, [a.id]: t });
                    setErrors({ ...errors, [a.id]: '' });
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState line="Your accounts appear here once you’ve chosen your apps." />
          )}
          <Actions>
            <Button size="lg" onClick={() => submit(v.tracked.map((a) => a.id))}>
              Next
            </Button>
          </Actions>
        </>
      )}
    </Loaded>
  );
}

function NameStep({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  const [error, setError] = useState<string>();
  const printed = printedName(value);
  return (
    <form
      className="flex min-h-full flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (printed) onNext();
        else setError('Type your name as your bank prints it.');
      }}
    >
      <div className="flex flex-col gap-3 px-4 pt-4">
        <p className="text-base text-pretty">
          Banks print your name in capitals on a transfer. Sen uses it to tell a move between your own accounts from a
          payment to someone else.
        </p>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="printed-name">Your name</FieldLabel>
          <Input
            id="printed-name"
            autoComplete="name"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="TAN WEI MING"
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby="name-msg"
            onChange={(e) => {
              onChange(e.target.value);
              setError(undefined);
            }}
          />
          <div id="name-msg" aria-live="polite">
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>
                {printed ? `Sen will look for ${printed}.` : 'You can add other spellings later in Settings.'}
              </FieldDescription>
            )}
          </div>
        </Field>
      </div>
      <Actions>
        <Button type="submit" size="lg">
          Next
        </Button>
      </Actions>
    </form>
  );
}

function PaydayStep({
  value,
  onChange,
  onNext,
  last,
}: {
  value: { kind: 'last' | 'day'; day: string };
  onChange: (v: { kind: 'last' | 'day'; day: string }) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [error, setError] = useState<string>();
  return (
    <form
      className="flex min-h-full flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (value.kind === 'day' && parseDay(value.day) === null) setError('Type a day from 1 to 31.');
        else onNext();
      }}
    >
      <div className="flex flex-col gap-4 px-4 pt-4">
        <p className="text-base text-pretty">
          When does your salary usually arrive? Sen uses it only for estimates, such as days to payday. If it comes
          early, nothing needs changing: your cycle starts when the money lands.
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          aria-label="Expected payday"
          value={value.kind}
          onValueChange={(k) => {
            if (k === 'last' || k === 'day') {
              onChange({ ...value, kind: k });
              setError(undefined);
            }
          }}
        >
          <ToggleGroupItem value="last" className="h-12 flex-1">
            Last working day
          </ToggleGroupItem>
          <ToggleGroupItem value="day" className="h-12 flex-1">
            A day number
          </ToggleGroupItem>
        </ToggleGroup>
        {value.kind === 'day' ? (
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="payday-day">Day of the month</FieldLabel>
            <Input
              id="payday-day"
              inputMode="numeric"
              maxLength={2}
              className="num"
              placeholder="25"
              value={value.day}
              aria-invalid={error ? true : undefined}
              aria-describedby="payday-msg"
              onChange={(e) => {
                onChange({ ...value, day: e.target.value.replace(/\D/g, '') });
                setError(undefined);
              }}
            />
            <div id="payday-msg" aria-live="polite">
              {error ? <FieldError>{error}</FieldError> : null}
            </div>
          </Field>
        ) : null}
      </div>
      <Actions>
        <Button type="submit" size="lg">
          {last ? 'Finish' : 'Next'}
        </Button>
      </Actions>
    </form>
  );
}

/** Without capture (D79): the categories, any of which can be switched off. No payday, no balances. */
function Categories({
  off,
  setOff,
  onDone,
}: {
  off: Set<string>;
  setOff: (s: Set<string>) => void;
  onDone: () => void;
}) {
  const q = useCategories('spend');
  return (
    <Loaded q={q} what="the categories">
      {(cats) => (
        <>
          <p className="px-4 pt-4 text-base text-pretty">
            These describe your spending. Switch off any you won’t use; you can rename, add or switch them back in
            Settings. You count by calendar month, and can set a payday later.
          </p>
          <div className="pt-2">
            {cats.map((c) => (
              <SettingsRow
                key={c.id}
                label={c.label}
                checked={!off.has(c.id)}
                onCheckedChange={(on) => {
                  const next = new Set(off);
                  if (on) next.delete(c.id);
                  else next.add(c.id);
                  setOff(next);
                }}
              />
            ))}
          </div>
          <Actions>
            <Button size="lg" onClick={onDone} disabled={off.size >= cats.length}>
              Start using Sen
            </Button>
          </Actions>
        </>
      )}
    </Loaded>
  );
}
