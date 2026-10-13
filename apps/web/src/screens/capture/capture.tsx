import type { ComponentType } from 'react';
import {
  BatteryChargingIcon,
  BellIcon,
  CheckIcon,
  CircleCheckIcon,
  CirclePauseIcon,
  CircleSlashIcon,
  InboxIcon,
  LayoutGridIcon,
  RadioIcon,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { GroupCard, NavRow } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { momentLabel } from '@/lib/dates';
import { SenCapture, type CaptureStatus } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BridgeError, CaptureScreen } from './common';

/** What the listener is doing, in words first (patterns.md §7, Status cards). */
export function listenerState(s: CaptureStatus): {
  state: string;
  title: string;
  status: 'done' | 'waiting' | 'warning' | 'neutral';
} {
  if (!s.enabled)
    return {
      state: 'Off in this build',
      title: 'This is the review build, which never captures, so nothing is recorded twice.',
      status: 'neutral',
    };
  if (!s.access)
    return {
      state: 'Not listening',
      title: 'Sen needs notification access to read your bank apps.',
      status: 'warning',
    };
  if (!s.chosen.length)
    return { state: 'Not listening', title: "No apps are chosen yet, so there's nothing to read.", status: 'warning' };
  if (!s.connected)
    return {
      state: 'Waiting for Android',
      title: 'Access is on, but Android hasn’t started the listener yet. It usually does within a minute.',
      status: 'waiting',
    };
  return {
    state: 'Listening',
    title: `Reading ${s.chosen.length} ${s.chosen.length === 1 ? 'app' : 'apps'}.`,
    status: 'done',
  };
}

const ICONS = {
  done: CircleCheckIcon,
  waiting: CirclePauseIcon,
  warning: CircleSlashIcon,
  neutral: RadioIcon,
} as const;

/** One step of the setup checklist: a tick when it's done, its state on the right; the whole row opens its screen. */
function StepRow({
  done,
  title,
  value,
  icon,
  onOpen,
}: {
  done: boolean;
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  onOpen: () => void;
}) {
  return (
    <NavRow
      icon={icon}
      tone={done ? 'accent' : 'warn'}
      title={title}
      value={value}
      trailing={done ? <CheckIcon className="size-4 text-primary" aria-hidden="true" /> : undefined}
      onOpen={onOpen}
    />
  );
}

/**
 * Settings → Capture (screens.md; spec §6.2, §9.5 steps 2-4): the listener's state, then setup as a
 * three-step checklist (your apps, notification access, keep Sen running), each row opening its own
 * step, and, for the soak, what was captured on this phone. B09 and B10 add wordings, rules and
 * skipped notifications.
 */
export default function CaptureSettings() {
  const navigate = useNavigate();
  const { data: s, error, reload } = useBridge(() => SenCapture.status());
  const open = (id: string) => void navigate({ to: '/s/$', params: { _splat: id } });
  return (
    <CaptureScreen title="Capture">
      {error ? <BridgeError onRetry={reload} /> : null}
      {!s && !error ? <ListSkeleton rows={4} /> : null}
      {s ? (
        <div className="flex flex-col pb-8">
          <div className="px-4 pt-2">
            {(() => {
              const l = listenerState(s);
              return (
                <StatusCard
                  icon={ICONS[l.status]}
                  state={l.state}
                  status={l.status}
                  title={l.title}
                  waiting={
                    s.eventAt
                      ? `Last notification captured ${momentLabel(new Date(s.eventAt))}.`
                      : s.enabled && s.access
                        ? 'Nothing captured yet. It appears here as soon as a chosen app notifies.'
                        : undefined
                  }
                />
              );
            })()}
          </div>
          {s.enabled ? (
            <GroupCard label="Setup" className="pt-5">
              <StepRow
                done={s.chosen.length > 0}
                title="Your apps"
                value={s.chosen.length ? `${s.chosen.length} chosen` : 'None yet'}
                icon={LayoutGridIcon}
                onOpen={() => open('settings/capture/apps')}
              />
              <StepRow
                done={s.access}
                title="Notification access"
                value={s.access ? 'On' : 'Off'}
                icon={BellIcon}
                onOpen={() => open('settings/capture/access')}
              />
              <StepRow
                done={s.ignoringBattery}
                title="Keep Sen running"
                value={s.ignoringBattery ? 'Battery step done' : 'Not done'}
                icon={BatteryChargingIcon}
                onOpen={() => open('settings/capture/running')}
              />
            </GroupCard>
          ) : null}
          <GroupCard label="On this phone" className="pt-5">
            <NavRow
              icon={InboxIcon}
              title="Captured on this phone"
              value={String(s.events)}
              onOpen={() => open('settings/capture/captured')}
            />
          </GroupCard>
        </div>
      ) : null}
    </CaptureScreen>
  );
}
