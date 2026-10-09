import { BellIcon, BellOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { SenCapture } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BottomAction, BridgeError, CaptureScreen, Section } from './common';

/**
 * Notification access (spec §9.5 step 3, §6.2): Android's own page, where Sen is switched on once. If
 * the switch is greyed out, Android 13 and later want *Allow restricted settings* on Sen's info page
 * first, because Sen isn't from Play. B08 shows this as first run's third step.
 */
export default function CaptureAccess() {
  const { data: s, error, reload } = useBridge(() => SenCapture.status());
  const open = (go: () => Promise<unknown>) =>
    void go().catch(() => toastDone("Couldn't open Android's settings. Open them from the phone's Settings app."));
  return (
    <CaptureScreen title="Notification access">
      {error ? <BridgeError onRetry={reload} /> : null}
      {!s && !error ? <ListSkeleton rows={2} /> : null}
      {s ? (
        <div className="flex min-h-full flex-col">
          <div className="flex flex-col gap-3 px-4 pt-2">
            <StatusCard
              icon={s.access ? BellIcon : BellOffIcon}
              state={s.access ? 'On' : 'Off'}
              status={s.access ? 'done' : 'warning'}
              title={
                s.access
                  ? 'Sen can read notifications. It keeps only those from the apps you chose.'
                  : 'Sen can’t read your bank notifications yet.'
              }
              waiting={s.access ? undefined : 'Open settings, find Sen, switch it on, then come back here.'}
            />
          </div>
          {s.restrictedSettings && !s.access ? (
            <Section title="If Sen's switch is greyed out">
              <ol className="flex list-decimal flex-col gap-2 pr-4 pl-9 text-base">
                <li>Open Sen's app info.</li>
                <li>
                  Tap <span aria-label="the menu">⋮</span> at the top right, then{' '}
                  <strong>Allow restricted settings</strong>, and confirm.
                </li>
                <li>Come back and tap Open settings again.</li>
              </ol>
              <p className="px-4 pt-2 text-sm text-muted-foreground">
                Android asks this of apps installed from outside Play. It changes nothing else.
              </p>
              <div className="px-4 pt-3">
                <Button variant="outline" onClick={() => open(() => SenCapture.openAppInfo())}>
                  Open Sen's app info
                </Button>
              </div>
            </Section>
          ) : null}
          <BottomAction>
            <Button
              size="lg"
              variant={s.access ? 'outline' : 'default'}
              onClick={() => open(() => SenCapture.openNotificationAccess())}
            >
              {s.access ? 'Open Android’s settings' : 'Open settings'}
            </Button>
          </BottomAction>
        </div>
      ) : null}
    </CaptureScreen>
  );
}
