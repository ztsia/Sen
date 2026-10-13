import { useState } from 'react';
import { BrainIcon, CalendarDaysIcon, CoinsIcon, PauseCircleIcon, SparklesIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { UsageView } from '@sen/core/views';
import { Button } from '@/components/ui/button';
import { GroupCard, NavRow } from '@/blocks/group';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { useSettings, useUsage, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { Loaded, useGo } from '../kit';

/**
 * Settings → Sen (screens.md; spec §12.7, D41, D98): Google Calendar, what Sen remembers, and your AI
 * credit, each a row that says its state. Connecting opens Google's sign-in in the phone's browser, so
 * here it is a stand-in.
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
            <EmptyState icon={SparklesIcon} title="Sen is off" line="Sen is off for you." />
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
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <Calendar connected={calendar} />
      <GroupCard label="Memory">
        <NavRow
          icon={BrainIcon}
          title="What Sen remembers"
          value={memories ? `${memories} ${memories === 1 ? 'note' : 'notes'}` : 'Nothing yet'}
          onOpen={() => go('agent/memory')}
        />
      </GroupCard>
      <Loaded q={usage} what="your AI credit">
        {(u) => <Credit u={u} onOpen={() => go('agent/usage')} />}
      </Loaded>
    </div>
  );
}

function Calendar({ connected }: { connected: boolean }) {
  const write = useWrite();
  const [open, setOpen] = useState(false);
  return (
    <>
      <GroupCard>
        <NavRow
          icon={CalendarDaysIcon}
          tone={connected ? 'accent' : 'neutral'}
          title="Google Calendar"
          description={
            connected
              ? 'Connected. Sen puts claim deadlines and bills on your calendar.'
              : 'Not connected. Without it, Review and pushes still remind you.'
          }
          trailing={
            connected ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void write({ type: 'setting.set', key: 'calendar', value: false })}
              >
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={() => setOpen(true)}>
                Connect
              </Button>
            )
          }
        />
      </GroupCard>
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
      <GroupCard label="AI credit">
        <NavRow
          icon={CoinsIcon}
          title="This month's cost"
          description="An estimate from the tokens used"
          value={u.estimate === null ? 'Not estimated yet' : `About ${formatSen(u.estimate)}`}
          onOpen={onOpen}
        />
      </GroupCard>
    );
  return (
    <GroupCard label="AI credit">
      <NavRow
        icon={CoinsIcon}
        title="Balance"
        value={u.unlimited ? 'Unlimited' : formatSen(u.balance)}
        onOpen={onOpen}
      />
      {u.unlimited ? null : (
        <NavRow
          title="This month's free allowance"
          value={`${formatSen(u.allowanceLeft)} of ${formatSen(u.allowance)} left`}
        />
      )}
      {u.pausedUntil ? (
        <NavRow icon={PauseCircleIcon} tone="warn" title="Sen is paused" value={`until ${shortDay(u.pausedUntil)}`} />
      ) : null}
    </GroupCard>
  );
}
