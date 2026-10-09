import { CircleCheckIcon, CirclePauseIcon, CircleSlashIcon, RadioIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SettingsRow } from '@/blocks/rows';
import { ListSkeleton } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { momentLabel } from '@/lib/dates';
import { SenCapture, type CaptureStatus } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BridgeError, CaptureScreen, Section } from './common';

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

/**
 * Settings → Capture (screens.md; spec §6.2, §9.5 steps 2-4): the listener's state, then your apps,
 * notification access and Keep Sen running, each opening its own step, and, for the soak, what was
 * captured on this phone. B09 and B10 add wordings, rules and skipped notifications.
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
        <>
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
            <Section title="Setup">
              <SettingsRow
                label="Your apps"
                value={s.chosen.length ? `${s.chosen.length} chosen` : 'None yet'}
                onOpen={() => open('settings/capture/apps')}
              />
              <SettingsRow
                label="Notification access"
                value={s.access ? 'On' : 'Off'}
                onOpen={() => open('settings/capture/access')}
              />
              <SettingsRow
                label="Keep Sen running"
                value={s.ignoringBattery ? 'Battery step done' : 'Not done'}
                onOpen={() => open('settings/capture/running')}
              />
            </Section>
          ) : null}
          <Section title="On this phone">
            <SettingsRow
              label="Captured on this phone"
              value={String(s.events)}
              onOpen={() => open('settings/capture/captured')}
            />
          </Section>
        </>
      ) : null}
    </CaptureScreen>
  );
}
