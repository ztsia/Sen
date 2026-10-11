import { useState } from 'react';
import { formatSen } from '@sen/core/money';
import type { UsageView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { useSettings, useUsage, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded, Section, useGo } from '../kit';
import { ActionRow } from './parts';

/**
 * Settings → Sen (screens.md; spec §12.7, D41, D98): Google Calendar, what Sen remembers, and your AI
 * credit. Connecting opens Google's sign-in in the phone's browser, so here it is a stand-in.
 */
export default function SenSettings() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Sen" />}>
      <Loaded q={q} what="Sen's settings">
        {(s) =>
          s.switches.agent ? (
            <Body calendar={s.sen.calendar} memories={s.sen.memories} />
          ) : (
            <EmptyState line="Sen is off for you." />
          )
        }
      </Loaded>
    </Screen>
  );
}

function Body({ calendar, memories }: { calendar: boolean; memories: number }) {
  const go = useGo();
  const usage = useUsage();
  return (
    <div className="flex flex-col pb-4">
      <Section title="Google Calendar">
        <Calendar connected={calendar} />
      </Section>
      <Section title="Memory">
        <SettingsRow
          label="What Sen remembers"
          value={memories ? `${memories} ${memories === 1 ? 'note' : 'notes'}` : 'Nothing yet'}
          onOpen={() => go('agent/memory')}
        />
      </Section>
      <Section title="AI credit">
        <Loaded q={usage} what="your AI credit">
          {(u) => <Credit u={u} onOpen={() => go('agent/usage')} />}
        </Loaded>
      </Section>
    </div>
  );
}

function Calendar({ connected }: { connected: boolean }) {
  const write = useWrite();
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionRow
        title="Google Calendar"
        value={connected ? 'Connected' : 'Not connected'}
        line={
          connected
            ? 'Sen puts claim deadlines and bills on your calendar.'
            : 'Without it, Review and pushes still remind you.'
        }
      >
        {connected ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void write({ type: 'setting.set', key: 'calendar', value: false })}
          >
            Disconnect
          </Button>
        ) : (
          <Button onClick={() => setOpen(true)}>Connect</Button>
        )}
      </ActionRow>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Connect Google Calendar"
        description="Google's sign-in opens in your phone's browser. The first time, Google warns that Sen isn't verified: that's expected. This is a stand-in."
      >
        <Button
          className="w-full"
          onClick={() =>
            void write({ type: 'setting.set', key: 'calendar', value: true }).then((r) => r && setOpen(false))
          }
        >
          Continue to Google
        </Button>
      </Sheet>
    </>
  );
}

/** The owner has no ledger, only an estimate; everyone else has a balance and a free allowance (D98). */
function Credit({ u, onOpen }: { u: UsageView; onOpen: () => void }) {
  if (u.owner)
    return (
      <SettingsRow
        label="This month's cost"
        value={u.estimate === null ? 'Not estimated yet' : `About ${formatSen(u.estimate)} (estimate)`}
        onOpen={onOpen}
      />
    );
  return (
    <>
      <SettingsRow label="Balance" value={u.unlimited ? 'Unlimited' : formatSen(u.balance)} onOpen={onOpen} />
      {u.unlimited ? null : (
        <SettingsRow
          label="This month's free allowance"
          value={`${formatSen(u.allowanceLeft)} of ${formatSen(u.allowance)} left`}
        />
      )}
      {u.pausedUntil ? <SettingsRow label="Sen is paused" value={`until ${shortDay(u.pausedUntil)}`} /> : null}
    </>
  );
}
