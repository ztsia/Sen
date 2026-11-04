import { TriangleAlertIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { CaptureHealthView } from '@sen/core/sync';
import { useCaptureHealth } from '@/data/hooks';
import { momentLabel } from '@/lib/dates';
import { OUTBOX_BRIDGE, SenCapture, captureReachable, hasBridge, inShell } from '@/shell/bridge';
import type { CaptureStatus, OutboxState } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { HealthBar } from './status';

// Home's capture warnings (B07, spec §6.2 *Health*, §18): one block at the top of Home, for when capture
// or the morning job stops. It says what's wrong in words and, where something here can fix it, has the
// one button that does.

/** What the phone itself says, in the shell. */
export interface ShellFacts {
  status: Pick<CaptureStatus, 'access' | 'connected' | 'captureSwitch'>;
  /** Bridge 4's outbox state: the morning job's last run and the server's clock, as the last sync heard them. */
  outbox: Pick<OutboxState, 'morningAt' | 'serverNow'> | null;
}

export interface CaptureWarning {
  key: 'listener-off' | 'no-access' | 'no-heartbeat' | 'no-events' | 'scheduler';
  title: string;
  detail: string;
  /** Whether *Fix* is offered: the first opens Android's notification access; the others, Capture's own screen. */
  fix: boolean;
}

/** `SCHEDULER_LATE_MS` of @sen/core/sync (a test holds them equal): a value import would pull zod into the app, which breaks our CSP. */
export const SCHEDULER_LATE_MS = 26 * 3_600_000;

const when = (at: string) => momentLabel(new Date(at));

/**
 * The first warning that applies, or none. Nothing shows with the *Capture* switch off. The phone's own
 * view comes first (the listener isn't bound), then the server's watchdog (no heartbeat, no events), then
 * the morning job; each of those can also be seen by the shell from its last sync.
 */
export function captureWarning(
  health: CaptureHealthView | undefined,
  shell: ShellFacts | null,
  canFix: boolean,
): CaptureWarning | null {
  const on = health?.on ?? shell?.status.captureSwitch ?? false;
  if (!on) return null;
  if (shell && (!shell.status.access || !shell.status.connected))
    return {
      key: 'listener-off',
      title: 'Capture is off',
      detail: "Sen can't read your payment notifications.",
      fix: true,
    };
  // in a browser, or when the phone's own view is fine but its last sync said otherwise
  if (health?.silent === 'no-access')
    return {
      key: 'no-access',
      title: 'Capture is off',
      detail: "Your phone says Sen can't read your payment notifications.",
      fix: canFix,
    };
  if (health?.silent === 'no-heartbeat' && health.lastBeatAt)
    return {
      key: 'no-heartbeat',
      title: 'Capture may be off',
      detail:
        health.listenerConnected === false
          ? health.lastListenAt
            ? `Sen's listener on your phone has been off since ${when(health.lastListenAt)}.`
            : "Sen's listener on your phone is off."
          : `Sen hasn't heard from your phone since ${when(health.lastBeatAt)}.`,
      fix: canFix,
    };
  if (health?.silent === 'no-events')
    return {
      key: 'no-events',
      title: 'Capture may be off',
      detail: health.lastEventAt
        ? `No payment notifications since ${when(health.lastEventAt)}.`
        : 'No payment notifications yet.',
      fix: canFix,
    };
  // the server's reading, or the phone's own from its last sync (the server's clock, not the phone's)
  const phone = shell?.outbox;
  const late =
    health?.schedulerLate === true
      ? health.morningAt
      : phone?.morningAt &&
          phone.serverNow &&
          Date.parse(phone.serverNow) - Date.parse(phone.morningAt) > SCHEDULER_LATE_MS
        ? phone.morningAt
        : undefined;
  if (late)
    return {
      key: 'scheduler',
      title: "Sen's daily check hasn't run",
      detail: `The morning job last ran ${when(late)}. Your payments are still kept.`,
      fix: false,
    };
  return null;
}

async function loadShell(): Promise<ShellFacts | null> {
  if (!inShell()) return null;
  const status = await SenCapture.status();
  const outbox = (await hasBridge(OUTBOX_BRIDGE)) ? await SenCapture.pending().catch(() => null) : null;
  return { status, outbox };
}

/** Home's warnings. Reads the server's view of capture, and in the shell the phone's own. */
export function CaptureWarnings({ className }: { className?: string }) {
  const health = useCaptureHealth();
  // read again when the app comes back to the front: Android's settings page may have fixed it
  const shell = useBridge(loadShell);
  const navigate = useNavigate();
  // the shell's answer is awaited, so a warning never flashes up and goes (or the reverse) for one that is on its way
  if (inShell() && shell.loading && !shell.data) return null;
  const w = captureWarning(health.data, shell.data ?? null, captureReachable());
  if (!w) return null;
  const fix = () => {
    if (w.key === 'listener-off') void SenCapture.openNotificationAccess();
    else void navigate({ to: '/s/$', params: { _splat: 'settings/capture' } });
  };
  return (
    <HealthBar
      className={className}
      icon={TriangleAlertIcon}
      title={w.title}
      detail={w.detail}
      fix={w.fix ? 'Fix' : undefined}
      onFix={w.fix ? fix : undefined}
    />
  );
}
