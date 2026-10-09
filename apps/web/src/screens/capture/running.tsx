import { useState } from 'react';
import { BatteryFullIcon, BatteryWarningIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/blocks/sheet';
import { ListSkeleton } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { openInBrowser } from '@/lib/open-in-browser';
import { SenCapture, type Brand } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BridgeError, CaptureScreen, Section } from './common';

/**
 * Sen's own steps for a Xiaomi (spec §6.2, D86): the three that matter there, each opening its page
 * where one exists. The full guide from dontkillmyapp.com is one tap away.
 */
const XIAOMI_STEPS: { text: string; open?: number }[] = [
  { text: 'Autostart: turn it on for Sen.', open: 0 },
  { text: 'Battery saver: choose No restrictions.', open: 1 },
  {
    text: "Lock Sen in recent apps: open recent apps, then drag Sen's card down, or long-press it and tap the padlock.",
  },
];

/**
 * Keep Sen running (spec §9.5 step 4, D86): Android's battery step, which every phone needs, then the
 * steps for this phone's brand, from dontkillmyapp.com. Only Xiaomi is tested; the heartbeat is the
 * real check, and Home warns when capture goes quiet (B07).
 */
export default function CaptureRunning() {
  const { data, error, reload } = useBridge(() => SenCapture.keepRunning());
  const [guide, setGuide] = useState(false);
  const fail = () => toastDone("Couldn't open that page. Find it in the phone's Settings app.");
  return (
    <CaptureScreen title="Keep Sen running">
      {error ? <BridgeError onRetry={reload} /> : null}
      {!data && !error ? <ListSkeleton rows={3} /> : null}
      {data ? (
        <>
          <Section title="Every phone">
            <div className="flex flex-col gap-3 px-4">
              <StatusCard
                icon={data.ignoringBattery ? BatteryFullIcon : BatteryWarningIcon}
                state={data.ignoringBattery ? 'Done' : 'Not done'}
                status={data.ignoringBattery ? 'done' : 'warning'}
                title="Let Sen run in the background, so Android doesn't stop it to save battery."
              >
                {data.ignoringBattery ? null : (
                  <Button
                    className="mt-2 self-start"
                    onClick={() => void SenCapture.requestIgnoreBattery().catch(fail)}
                  >
                    Allow
                  </Button>
                )}
              </StatusCard>
            </div>
          </Section>
          <BrandSteps
            brand={data.brand}
            manufacturer={data.manufacturer}
            onGuide={() => setGuide(true)}
            onFail={fail}
          />
          {data.brand ? (
            <Sheet
              open={guide}
              onOpenChange={setGuide}
              title={`The full guide for ${data.brand.name}`}
              description="From dontkillmyapp.com. Your phone may not have every setting."
            >
              <div className="flex flex-col gap-4 pb-2">
                {data.brand.sections.map((s) => (
                  <section key={s.heading} className="flex flex-col gap-1">
                    <h3 className="font-semibold">{s.heading}</h3>
                    {s.steps.map((t) => (
                      <p key={t} className="text-base text-pretty whitespace-pre-line">
                        {t}
                      </p>
                    ))}
                  </section>
                ))}
                <Button variant="outline" className="self-start" onClick={() => openInBrowser(data.brand!.url)}>
                  Open dontkillmyapp.com
                </Button>
              </div>
            </Sheet>
          ) : null}
        </>
      ) : null}
    </CaptureScreen>
  );
}

function BrandSteps({
  brand,
  manufacturer,
  onGuide,
  onFail,
}: {
  brand: Brand | null;
  manufacturer: string;
  onGuide: () => void;
  onFail: () => void;
}) {
  if (!brand)
    return (
      <Section title={`Your ${manufacturer}`}>
        <p className="px-4 text-base text-pretty">
          Sen has no extra steps for {manufacturer} phones. The battery step above is usually enough. If capture stops,
          the heartbeat under Captured on this phone shows when it last ran.
        </p>
      </Section>
    );
  const steps = brand.id === 'xiaomi' ? XIAOMI_STEPS : [];
  return (
    <Section title={`Your ${brand.name}`}>
      <div className="flex flex-col gap-3 px-4">
        {steps.length ? (
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s.text} className="flex flex-col gap-2">
                <p className="text-base text-pretty">
                  {i + 1}. {s.text}
                </p>
                {s.open !== undefined && brand.opens[s.open] ? (
                  <Button
                    variant="outline"
                    className="self-start"
                    onClick={() => void SenCapture.openBrandStep({ index: s.open! }).catch(onFail)}
                  >
                    Open {brand.opens[s.open].label}
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-base text-pretty">
            {brand.name} phones stop apps in the background in their own ways. The guide says where to look; Sen's info
            page holds most of the switches.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onGuide}>
            The full guide
          </Button>
          {steps.length ? null : (
            <Button variant="outline" onClick={() => void SenCapture.openAppInfo().catch(onFail)}>
              Open Sen's app info
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Steps from dontkillmyapp.com.{' '}
          {brand.tested
            ? `Sen is tried on a ${brand.name} first; the heartbeat shows whether capture keeps running.`
            : `Not tried on a ${brand.name} yet. If capture stops, the heartbeat under Captured on this phone shows when it last ran.`}
        </p>
      </div>
    </Section>
  );
}
