import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Sheet } from '@/blocks/sheet';
import { toastDone } from '@/blocks/toast';
import { useLongPress } from '@/lib/long-press';
import { captureReachable, SenShell } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { Section } from './capture/common';

/**
 * Settings → Account. B02 puts the shell's version here, and behind a long-press on it the hidden
 * tests the soak needs (docs/local.md): a category prompt, the island, and the launcher icon. B05
 * adds your email and signing out.
 */
export default function AccountSettings() {
  const shell = captureReachable();
  const info = useBridge(() => (shell ? SenShell.info() : Promise.resolve(null)));
  const [tests, setTests] = useState(false);
  const press = useLongPress(
    () => undefined,
    () => (shell ? setTests(true) : undefined),
  );
  const i = info.data;
  const version = i ? `${i.version} · ${i.build}` : shell ? '…' : 'Web app';
  return (
    <Screen bar={<AppBar title="Account" />}>
      <Section title="About">
        <Item
          asChild
          size="sm"
          className="min-h-14 w-full flex-nowrap rounded-none text-left text-base active:bg-accent"
        >
          <button type="button" aria-label={`Version ${version}`} {...press}>
            <ItemContent className="min-w-0">
              <ItemTitle className="text-base font-normal">Version</ItemTitle>
            </ItemContent>
            <ItemActions className="text-sm text-muted-foreground">{version}</ItemActions>
          </button>
        </Item>
      </Section>
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
          <Button variant="secondary" className="self-start" onClick={() => run(r.key, r.go)}>
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
