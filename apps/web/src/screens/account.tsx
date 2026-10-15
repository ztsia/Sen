import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon, InfoIcon, LogOutIcon, Trash2Icon } from 'lucide-react';
import { queryClient } from '@/data';
import { auth } from '@/data/auth';
import { ApiFailure } from '@/data/api/client';
import { DestructiveDialog } from '@/blocks/dialog';
import { useGo } from './kit';
import { Button } from '@/components/ui/button';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { GroupCard, NavRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { toastDone } from '@/blocks/toast';
import { useLongPress } from '@/lib/long-press';
import { captureReachable, SenShell } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';

/**
 * Settings → Account. B02 puts the shell's version here, and behind a long-press on it the hidden
 * tests the soak needs (docs/local.md): a category prompt, the island, and the launcher icon. B05 added
 * your email and signing out (on a preview; the made-up backend stays signed in).
 */
export default function AccountSettings() {
  const shell = captureReachable();
  const info = useBridge(() => (shell ? SenShell.info() : Promise.resolve(null)));
  const [tests, setTests] = useState(false);
  const [everywhere, setEverywhere] = useState(false);
  const go = useGo();
  const session = useQuery({ queryKey: ['session'], queryFn: () => auth.session() });
  const leave = (call: () => Promise<void>) => {
    if (__SEN_BACKEND__ !== 'api') return toastDone('Made-up data stays signed in. Signing out works on a preview.');
    call().then(
      () => {
        queryClient.clear();
        go('sign-in', {}, { replace: true });
      },
      (e: unknown) => toastDone(e instanceof ApiFailure ? e.message : e instanceof Error ? e.message : String(e)),
    );
  };
  const press = useLongPress(
    () => undefined,
    () => (shell ? setTests(true) : undefined),
  );
  const i = info.data;
  const version = i ? `${i.version} · ${i.build}` : shell ? '…' : 'Web app';
  return (
    <Screen bar={<AppBar title="Account" />}>
      <div className="flex flex-col gap-6 pt-2 pb-8">
        <GroupCard label="About">
          <NavRow icon={InfoIcon} title="Version" value={version} press={shell ? press : undefined} />
        </GroupCard>
        <GroupCard label="Account">
          {/* information, so no tile (patterns §7, settings row; QA B05 run 1, 9) */}
          <NavRow title="Email" value={session.data?.email} />
          <NavRow icon={LogOutIcon} title="Sign out" onOpen={() => leave(() => auth.signOut())} />
          <NavRow
            icon={DoorOpenIcon}
            destructive
            title="Sign out everywhere"
            onOpen={() => (__SEN_BACKEND__ === 'api' ? setEverywhere(true) : leave(() => auth.signOutEverywhere()))}
          />
          <NavRow
            icon={Trash2Icon}
            destructive
            title="Delete account"
            onOpen={() => toastDone('Deleting an account arrives with accounts. Nothing was deleted.')}
          />
        </GroupCard>
      </div>
      <DestructiveDialog
        open={everywhere}
        onOpenChange={setEverywhere}
        title="Sign out everywhere?"
        description="Every phone and browser signed in to Sen is signed out, this one too. You’ll sign in again with a code."
        action="Sign out everywhere"
        cancel="Stay signed in"
        onConfirm={() => leave(() => auth.signOutEverywhere())}
      />
      <Sheet
        open={tests}
        onOpenChange={setTests}
        title="Tests"
        description="For trying the shell on your phone. Everything they show is made up."
      >
        <TestButtons />
      </Sheet>
    </Screen>
  );
}

function TestButtons() {
  const [said, setSaid] = useState<Record<string, string>>({});
  const run = (key: string, go: () => Promise<string>) =>
    void go().then(
      (s) => setSaid((o) => ({ ...o, [key]: s })),
      (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setSaid((o) => ({ ...o, [key]: msg }));
        toastDone(msg);
      },
    );
  const rows: { key: string; label: string; about: string; go: () => Promise<string> }[] = [
    {
      key: 'prompt',
      label: 'Test category prompt',
      about: 'A notification with three buttons, as a new merchant will get.',
      go: () => SenShell.testPrompt().then(() => 'Posted. Pull down the notifications and tap a button.'),
    },
    {
      key: 'island',
      label: 'Test island',
      about: 'A Live Update that counts down a minute and closes by itself.',
      go: () =>
        SenShell.testIsland().then((r) =>
          !r.liveUpdates
            ? 'Posted as a plain notification: this phone is older than Android 16.'
            : r.promoted
              ? 'Posted as a Live Update. Look at the top of the screen.'
              : 'Posted, but Android won’t promote it: Live Updates are off for Sen in its notification settings.',
        ),
    },
    {
      key: 'icon',
      label: 'Switch icon',
      about: 'Swaps the launcher icon between Minted and Instrument.',
      go: () =>
        SenShell.switchIcon().then(
          (r) => `Now ${r.icon === 'minted' ? 'Minted' : 'Instrument'}. Press Home and check where the icon is.`,
        ),
    },
  ];
  return (
    <div className="flex flex-col gap-4 pb-2">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-1">
          <Button variant="secondary" size="sm" className="self-start" onClick={() => run(r.key, r.go)}>
            {r.label}
          </Button>
          <p className="text-sm text-muted-foreground">{r.about}</p>
          {said[r.key] ? (
            <p role="status" className="text-sm">
              {said[r.key]}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
