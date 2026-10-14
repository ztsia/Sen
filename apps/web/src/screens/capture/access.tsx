import { BellIcon, BellOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/blocks/states';
import { Steps } from '@/blocks/steps';
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
              <Steps
                steps={[
                  {
                    title: "Open Sen's app info.",
                    action: { label: "Open Sen's app info", onSelect: () => open(() => SenCapture.openAppInfo()) },
                  },
                  {
                    title: 'Tap the menu (⋮) at the top right, then Allow restricted settings, and confirm.',
                  },
                  { title: 'Come back and tap Open settings again.' },
                ]}
              />
              <p className="px-5 pt-2 text-sm text-muted-foreground">
                Android asks this of apps installed from outside Play. It changes nothing else.
              </p>
            </Section>
          ) : null}
          <BottomAction>
            <Button
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
