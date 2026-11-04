import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { senText } from '@sen/core/money';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { GroupCard, SwitchRow } from '@/blocks/group';
import { EmptyState, ListSkeleton, OfflineBanner } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import CaptureAccess from '../capture/access';
import CaptureApps from '../capture/apps';
import { BridgeError, CaptureStep } from '../capture/common';
import CaptureRunning from '../capture/running';
import { runCommand, useAccountList, useCategories, useMe, useSettings, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useOnline } from '@/lib/online';
import { readStored, writeStored } from '@/lib/storage';
import { newId } from '@/lib/uid';
import { SenCapture } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded, useGo } from '../kit';
import { SignInFlow } from './sign-in';
import {
  parseDay,
  printedName,
  readDraft,
  stepsFor,
  suggestAccounts,
  withPrintedName,
  type AccountSuggestion,
  type FirstRunDraft,
  type StepId,
} from './logic';

/** What first run keeps on this phone until it's finished: its step, and what's typed but not saved. */
const KEY = 'sen.firstRun';

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
 * count. Seven steps with capture; without it, sign in and categories (§9.6, D79). Each step saves as
 * it goes (B08): the apps and access live in the shell, the accounts, your name and payday on the
 * server, and what's typed but not yet saved stays on this phone, so a reload or a closed app reopens
 * at the same step with it. Signed in on Sen's server, it starts after sign-in. Finishing it is saved
 * too, and its steps never come back (D26).
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

const loadDraft = () => readDraft(readStored(KEY));

function Steps({ capture }: { capture: boolean }) {
  const go = useGo();
  const online = useOnline();
  const steps = stepsFor(capture);
  // on Sen's server, the router sends only the signed-in here: sign-in is behind them
  const first = __SEN_BACKEND__ === 'api' ? 1 : 0;
  const [draft, setDraftState] = useState(loadDraft);
  const setDraft = (d: Partial<FirstRunDraft>) => {
    setDraftState((cur) => {
      const next = { ...cur, ...d };
      writeStored(KEY, JSON.stringify(next));
      return next;
    });
  };
  const at = draft.step ? steps.indexOf(draft.step) : -1;
  const i = Math.max(first, at);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const to = (n: number) => setDraft({ step: steps[n]! });
  // the starting categories, once (§8, D33): a retry seeds nothing more
  const started = useRef(false);
  useEffect(() => {
    if (started.current || step === 'sign-in') return;
    started.current = true;
    void runCommand({ type: 'setup.start' }).catch(() => {
      started.current = false;
    });
  }, [step]);
  const [finishing, setFinishing] = useState(false);
  const next = async () => {
    if (!last) return to(i + 1);
    setFinishing(true);
    try {
      await runCommand({ type: 'setup.finish' });
    } catch (e) {
      setFinishing(false);
      toastDone(e instanceof Error ? e.message : 'Couldn’t finish. Try again.');
      return;
    }
    writeStored(KEY, null);
    go('home', {}, { replace: true });
  };
  return (
    <Frame
      title={TITLES[step]}
      count={{ at: i + 1, of: steps.length }}
      offline={!online}
      onBack={() => (i <= first ? window.history.back() : to(i - 1))}
    >
      {step === 'sign-in' ? (
        <div className="px-4 pt-6">
          <SignInFlow onDone={() => to(i + 1)} />
        </div>
      ) : step === 'categories' ? (
        <Categories
          off={new Set(draft.off)}
          setOff={(off) => setDraft({ off: [...off] })}
          busy={finishing}
          onDone={async (off) => {
            // switched off means archived: Settings can bring each back (§8)
            for (const id of off) {
              try {
                await runCommand({ type: 'category.archive', id, archived: true });
              } catch (e) {
                toastDone(e instanceof Error ? e.message : 'Couldn’t save. Try again.');
                return;
              }
            }
            await next();
          }}
        />
      ) : step === 'apps' ? (
        <BuiltStep screen={CaptureApps} onNext={() => void next()} />
      ) : step === 'access' ? (
        <BuiltStep screen={CaptureAccess} onNext={() => void next()} skip />
      ) : step === 'running' ? (
        <BuiltStep screen={CaptureRunning} onNext={() => void next()} skip />
      ) : step === 'accounts' ? (
        <Accounts typed={draft.balances} setTyped={(balances) => setDraft({ balances })} onNext={() => void next()} />
      ) : step === 'name' ? (
        <NameStep typed={draft.name} setTyped={(name) => setDraft({ name })} onNext={() => void next()} />
      ) : (
        <PaydayStep
          typed={draft.payday}
          setTyped={(payday) => setDraft({ payday })}
          onNext={next}
          last={last}
          busy={finishing}
        />
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
                <span className="pr-3 text-xs whitespace-nowrap text-muted-foreground">
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

/** The shell's own step screens (B02), drawn inside this frame: the same screens Settings → Capture shows. */
function BuiltStep({ screen: Step, onNext, skip }: { screen: ComponentType; onNext: () => void; skip?: boolean }) {
  return (
    <>
      <CaptureStep>
        <Step />
      </CaptureStep>
      <Actions>
        <Button onClick={onNext}>Next</Button>
        {skip ? (
          <Button variant="ghost" size="sm" onClick={onNext}>
            Skip for now
          </Button>
        ) : null}
      </Actions>
    </>
  );
}

function Accounts({
  typed,
  setTyped,
  onNext,
}: {
  typed: Record<string, string>;
  setTyped: (b: Record<string, string>) => void;
  onNext: () => void;
}) {
  const apps = useBridge(() => SenCapture.apps());
  const q = useAccountList();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  if (apps.error) return <BridgeError onRetry={apps.reload} />;
  if (!apps.data) return <ListSkeleton rows={3} />;
  const list = apps.data.apps;
  return (
    <Loaded q={q} what="your accounts">
      {(v) => {
        const openings = new Map([...v.tracked].map((a) => [a.id, a.balance ?? 0]));
        const offered = suggestAccounts(list, v.tracked, openings);
        // what's typed, or what's saved for an account already made (a step reopened)
        const text = (a: AccountSuggestion) => typed[a.package] ?? (a.saved ? senText(a.saved.opening) : '');
        const save = async () => {
          const e: Record<string, string> = {};
          const parsed = new Map<string, number>();
          for (const a of offered) {
            const t = text(a);
            const c = checkAmount(t);
            if (!t.trim()) e[a.package] = 'Type today’s balance, or 0.';
            else if (c.error !== undefined) e[a.package] = c.error;
            else parsed.set(a.package, c.sen);
          }
          setErrors(e);
          if (Object.keys(e).length) return;
          setSaving(true);
          try {
            for (const a of offered) {
              const sen = parsed.get(a.package)!;
              if (!a.saved)
                await runCommand({
                  type: 'account.add',
                  id: newId(),
                  name: a.name,
                  kind: 'tracked',
                  app: { package: a.package, label: a.label },
                  opening: sen,
                });
              else if (a.saved.opening !== sen)
                await runCommand({ type: 'account.edit', id: a.saved.id, opening: sen });
            }
          } catch (err) {
            setSaving(false);
            toastDone(err instanceof Error ? err.message : 'Couldn’t save your accounts. Try again.');
            return;
          }
          setSaving(false);
          setTyped({});
          onNext();
        };
        return (
          <>
            <p className="px-4 pt-4 text-base text-pretty">
              Type the balance each app shows today, pockets and GO+ included. Sen counts from here.
            </p>
            {offered.length ? (
              <div className="flex flex-col gap-5 px-4 pt-4">
                {offered.map((a) => (
                  <MoneyInput
                    key={a.package}
                    label={a.name}
                    hint={a.name === a.label ? undefined : a.label}
                    value={text(a)}
                    error={errors[a.package]}
                    onChange={(t) => {
                      setTyped({ ...typed, [a.package]: t });
                      setErrors({ ...errors, [a.package]: '' });
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState line="Choose your apps first: each one you choose gets an account here." />
            )}
            <Actions>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Next'}
              </Button>
            </Actions>
          </>
        );
      }}
    </Loaded>
  );
}

function NameStep({
  typed,
  setTyped,
  onNext,
}: {
  typed: string | null;
  setTyped: (v: string) => void;
  onNext: () => void;
}) {
  const settings = useSettings();
  const write = useWrite();
  const [error, setError] = useState<string>();
  return (
    <Loaded q={settings} what="your settings">
      {(st) => {
        const value = typed ?? st.you.bankNames[0] ?? '';
        const printed = printedName(value);
        return (
          <form
            className="flex min-h-full flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!printed) return setError('Type your name as your bank prints it.');
              const names = withPrintedName(st.you.bankNames, printed);
              // the one write first run can make offline: it waits in the outbox (B07)
              if (names.join('\n') !== st.you.bankNames.join('\n'))
                void write({ type: 'setting.set', key: 'you.bankNames', value: names.join('\n') }, { quiet: true });
              onNext();
            }}
          >
            <div className="flex flex-col gap-3 px-4 pt-4">
              <p className="text-base text-pretty">
                Banks print your name in capitals on a transfer. Sen uses it to tell a move between your own accounts
                from a payment to someone else.
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
                    setTyped(e.target.value);
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
              <Button type="submit">Next</Button>
            </Actions>
          </form>
        );
      }}
    </Loaded>
  );
}

type PaydayTyped = { kind: 'last' | 'day'; day: string };

function PaydayStep({
  typed,
  setTyped,
  onNext,
  last,
  busy,
}: {
  typed: PaydayTyped | null;
  setTyped: (v: PaydayTyped) => void;
  onNext: () => Promise<void>;
  last: boolean;
  busy: boolean;
}) {
  const settings = useSettings();
  const write = useWrite();
  const [error, setError] = useState<string>();
  return (
    <Loaded q={settings} what="your settings">
      {(st) => {
        const saved = st.you.payday;
        const value: PaydayTyped =
          typed ?? (saved.kind === 'day' ? { kind: 'day', day: String(saved.day) } : { kind: 'last', day: '' });
        return (
          <form
            className="flex min-h-full flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const day = value.kind === 'day' ? parseDay(value.day) : null;
              if (value.kind === 'day' && day === null) return setError('Type a day from 1 to 31.');
              const pick: Record<string, string | number> =
                day === null ? { kind: 'last-working' } : { kind: 'day', day };
              if (JSON.stringify(pick) !== JSON.stringify(saved))
                void write({ type: 'setting.set', key: 'you.payday', value: pick }, { quiet: true });
              void onNext();
            }}
          >
            <div className="flex flex-col gap-4 px-4 pt-4">
              <p className="text-base text-pretty">
                When does your salary usually arrive? Sen uses it only for estimates, such as days to payday. If it
                comes early, nothing needs changing: your cycle starts when the money lands.
              </p>
              <ToggleGroup
                type="single"
                variant="outline"
                className="w-full"
                aria-label="Expected payday"
                value={value.kind}
                onValueChange={(k) => {
                  if (k === 'last' || k === 'day') {
                    setTyped({ ...value, kind: k });
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
                      setTyped({ ...value, day: e.target.value.replace(/\D/g, '') });
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
              <Button type="submit" disabled={busy}>
                {last ? 'Finish' : 'Next'}
              </Button>
            </Actions>
          </form>
        );
      }}
    </Loaded>
  );
}

/** Without capture (D79): the categories, any of which can be switched off. No payday, no balances. */
function Categories({
  off,
  setOff,
  busy,
  onDone,
}: {
  off: Set<string>;
  setOff: (s: Set<string>) => void;
  busy: boolean;
  onDone: (off: string[]) => Promise<void>;
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
          <div className="pt-3">
            <GroupCard>
              {cats.map((c) => (
                <SwitchRow
                  key={c.id}
                  icon={categoryIcon(c.label)}
                  tone={categoryTone(c.label)}
                  title={c.label}
                  checked={!off.has(c.id)}
                  onCheckedChange={(on) => {
                    const next = new Set(off);
                    if (on) next.delete(c.id);
                    else next.add(c.id);
                    setOff(next);
                  }}
                />
              ))}
            </GroupCard>
          </div>
          <Actions>
            <Button
              onClick={() => void onDone([...off].filter((id) => cats.some((c) => c.id === id)))}
              disabled={busy || !cats.length || cats.every((c) => off.has(c.id))}
            >
              Start using Sen
            </Button>
          </Actions>
        </>
      )}
    </Loaded>
  );
}
