import {
  BellRingIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  DatabaseIcon,
  MailIcon,
  PaletteIcon,
  SparklesIcon,
  TagsIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import type { SettingsView } from '@sen/core/views';
import { formatSen } from '@sen/core/money';
import { GroupCard, NavRow, PersonAvatar } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useMe, useSettings } from '@/data/hooks';
import { DEV_TOOLS } from '@/lib/env';
import { dayLabel } from '@/lib/dates';
import { LOOK_NAMES } from '@/looks/ids';
import { useMode, useTheme } from '@/theme/store';
import { inShell, SenCapture } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { listenerState } from '../capture/capture';
import { Loaded, useGo } from '../kit';
import { LookSwatch } from './look-preview';

/**
 * Settings (screens.md, D130): who you are on top, then where to go, each row saying its state so you
 * needn't open it. Each section shows only to the people who can use it (D52): Capture in the shell,
 * or in previews, where the browser stands in for it; Members is the admin's alone.
 */
export default function Settings() {
  const s = useSettings();
  const me = useMe();
  return (
    <Screen bar={<AppBar title="Settings" />}>
      <Loaded q={s} what="your settings" skeleton={<ListSkeleton rows={6} />}>
        {(v) => (
          <Loaded q={me} what="your settings" skeleton={<ListSkeleton rows={6} />}>
            {(m) => <Body v={v} me={m} />}
          </Loaded>
        )}
      </Loaded>
    </Screen>
  );
}

const PAYDAY: Record<SettingsView['you']['payday']['kind'], (d?: number) => string> = {
  'last-working': () => 'Last working day',
  day: (d) =>
    `On the ${d}${d === 1 || d === 21 || d === 31 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th'}`,
  none: () => 'No payday',
};
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Body({ v, me }: { v: SettingsView; me: { capture: boolean; claims: boolean; agent: boolean } }) {
  const go = useGo();
  const look = useTheme((t) => t.look);
  const mode = useMode();
  const captureHere = me.capture && (inShell() || DEV_TOOLS);
  const pd = v.you.payday;
  const credit = v.sen.credit;
  const name = v.email.split('@')[0] ?? v.email;
  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <div className="px-4">
        <Card className="py-0">
          <button
            type="button"
            aria-label={`Account, ${v.email}`}
            onClick={() => go('settings/account')}
            className="flex min-h-18 w-full items-center gap-3 rounded-[var(--radius-card,16px)] px-4 py-3 text-left"
          >
            <PersonAvatar name={name} size="xl" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold">{name}</span>
                {v.admin ? <Badge variant="accent">Admin</Badge> : null}
              </span>
              <span className="truncate text-sm text-muted-foreground">{v.email}</span>
            </span>
            <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
          </button>
        </Card>
      </div>

      <GroupCard>
        <NavRow
          icon={PaletteIcon}
          tone="accent"
          title="Appearance"
          value={LOOK_NAMES[look]}
          trailing={<LookSwatch look={look} mode={mode} />}
          onOpen={() => go('settings/appearance')}
        />
      </GroupCard>

      <GroupCard label="Setup">
        {captureHere ? <CaptureRow onOpen={() => go('settings/capture')} /> : null}
        <NavRow
          icon={UserRoundIcon}
          title="You"
          value={PAYDAY[pd.kind](pd.kind === 'day' ? pd.day : undefined)}
          onOpen={() => go('settings/you')}
        />
        <NavRow
          icon={TagsIcon}
          title="Categories and rules"
          value={count(v.rules.length, 'rule')}
          onOpen={() => go('settings/categories')}
        />
        <NavRow
          icon={MailIcon}
          title="Receipts by email"
          value={v.receiptsByEmail.code ? 'Not confirmed' : `${v.receiptsByEmail.received} received`}
          onOpen={() => go('settings/email')}
        />
      </GroupCard>

      {me.claims || me.agent || v.admin ? (
        <GroupCard label="Features">
          {me.claims ? (
            <NavRow
              icon={ClipboardCheckIcon}
              title="Claims"
              value={count(v.claims.schemes.length, 'scheme')}
              onOpen={() => go('settings/claims')}
            />
          ) : null}
          {me.agent ? (
            <NavRow
              icon={SparklesIcon}
              title="Sen"
              value={
                credit.owner
                  ? credit.estimate !== null
                    ? `~${formatSen(credit.estimate)} this month`
                    : undefined
                  : credit.unlimited
                    ? 'Unlimited'
                    : `${formatSen(credit.allowanceLeft)} left`
              }
              onOpen={() => go('settings/sen')}
            />
          ) : null}
          {v.admin ? (
            <NavRow
              icon={UsersIcon}
              title="Members"
              value={`${v.seats.used} of ${v.seats.of}`}
              onOpen={() => go('settings/members')}
            />
          ) : null}
        </GroupCard>
      ) : null}

      <GroupCard label="Data">
        <NavRow
          icon={DatabaseIcon}
          title="Export and backups"
          value={v.data.lastBackup ? `Backed up ${dayLabel(new Date(v.data.lastBackup))}` : 'No backup yet'}
          onOpen={() => go('settings/data')}
        />
      </GroupCard>
    </div>
  );
}

/** Capture's row says what the listener is doing, read from the shell (or its stand-in in previews). */
function CaptureRow({ onOpen }: { onOpen: () => void }) {
  const { data: s } = useBridge(() => SenCapture.status());
  const value = s ? `${count(s.chosen.length, 'app')} · ${listenerState(s).state.toLowerCase()}` : undefined;
  return <NavRow icon={BellRingIcon} title="Capture" value={value} onOpen={onOpen} />;
}
