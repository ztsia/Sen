import { useState } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { AVATAR_STATES, type AvatarState } from '@sen/looks';
import { Avatar } from '@/components/look/avatar';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sheet } from '@/blocks/sheet';
import { SwitchRow } from '@/blocks/group';
import { DEV_STATES, useUi, type DevState } from '@/frame/ui-store';
import { LOOK_IDS, LOOK_NAMES, isLookId } from '@/looks/ids';
import { useTheme, type ModePref } from '@/theme/store';
import { inShell } from '@/shell/bridge';
import { scheduleTestJob, sendTestPush } from '@/data/checks';
import { useLive } from '@/data/realtime';
import { now as clockNow } from '@/lib/clock';
import { toastDone } from '@/blocks/toast';
import { SCENARIOS, SCENARIO_NAMES, type ScenarioId } from '@/data/fake/variants';
import { sim, useCaptureSim } from './capture-sim';
import { NativeLayer } from './native/native-layer';
import { useNative } from './native/store';
import { useCtx } from './native/use-ctx';
import { simulator } from './native/simulator';

/** The counts the dev panel can put on Review's badge: none, a few, and past 99+. */
const REVIEW_COUNTS = [0, 5, 120];

export const AVATAR_NAMES: Record<AvatarState, string> = {
  resting: 'Resting',
  note: 'Has a note',
  listening: 'Listening',
  thinking: 'Working',
  helpers: 'With helpers',
  speaking: 'Answering',
  paused: 'Paused',
  done: 'Done',
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 py-3" aria-label={label}>
      <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

/**
 * The dev panel (B01): only in development and previews, never in production. The look and light or
 * dark, reduced motion and text scale, the made-up scenario and a state for the screens (B03, B04), Sen's avatar in each of
 * its eight states, and the way to the gallery.
 */
export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const ui = useUi();
  return (
    <>
      {/* a 16 px strip in the screen's side gutter, so it covers no content; previews only, so it's
          the one target allowed under 48 px wide (QA B01 run 2, note 15) */}
      <Button
        variant="secondary"
        size="icon"
        aria-label="Dev panel"
        data-dev-handle=""
        className="fixed top-1/2 left-0 z-[var(--z-index-dev)] h-16 w-4 -translate-y-1/2 rounded-l-none opacity-70"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontalIcon className="size-3" />
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Dev panel"
        description="Previews only. Production never shows this."
      >
        <Group label="Look">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={theme.wantLook}
            onValueChange={(v) => isLookId(v) && theme.setLook(v)}
          >
            {LOOK_IDS.map((id) => (
              <ToggleGroupItem key={id} value={id}>
                {LOOK_NAMES[id]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <Group label="Light and dark">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={theme.modePref}
            onValueChange={(v) => v && theme.setModePref(v as ModePref)}
          >
            <ToggleGroupItem value="system">System</ToggleGroupItem>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          </ToggleGroup>
        </Group>
        <Group label="Text size">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={String(theme.textScale)}
            onValueChange={(v) => v && theme.setTextScale(v === '1.5' ? 1.5 : 1)}
          >
            <ToggleGroupItem value="1">1×</ToggleGroupItem>
            <ToggleGroupItem value="1.5">1.5×</ToggleGroupItem>
          </ToggleGroup>
        </Group>
        <div className="-mx-4">
          <SwitchRow
            title="Reduced motion"
            checked={theme.forceReducedMotion}
            onCheckedChange={theme.setForceReducedMotion}
          />
        </div>
        <Group label="Made-up scenario">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={ui.scenario}
            onValueChange={(v) => SCENARIOS.includes(v as ScenarioId) && ui.setScenario(v as ScenarioId)}
          >
            {SCENARIOS.map((s) => (
              <ToggleGroupItem key={s} value={s}>
                {SCENARIO_NAMES[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <Group label="Screen state">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={ui.devState}
            onValueChange={(v) => v && ui.setDevState(v as DevState)}
          >
            {DEV_STATES.map((s) => (
              <ToggleGroupItem key={s} value={s} className="capitalize">
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <Group label="To review">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={ui.reviewCount === null ? '' : String(ui.reviewCount)}
            onValueChange={(v) => ui.setReviewCount(v ? (REVIEW_COUNTS.find((n) => String(n) === v) ?? null) : null)}
          >
            {REVIEW_COUNTS.map((n) => (
              <ToggleGroupItem key={n} value={String(n)}>
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <Group label="Sen's avatar">
          <div className="flex items-center gap-4">
            <Avatar state={ui.senState} size={72} />
            <p className="text-sm text-muted-foreground">{AVATAR_NAMES[ui.senState]}. Sen's button plays it too.</p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={ui.senState}
            onValueChange={(v) => v && ui.setSenState(v as AvatarState)}
          >
            {AVATAR_STATES.map((s) => (
              <ToggleGroupItem key={s} value={s}>
                {AVATAR_NAMES[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <LiveUpdates />
        {inShell() ? null : <CaptureSim />}
        <Simulator close={() => setOpen(false)} />
        <div className="flex flex-col gap-2 py-3">
          <Button asChild variant="outline" className="w-full">
            <Link to="/dev/gallery" onClick={() => setOpen(false)}>
              Open the gallery
            </Link>
          </Button>
        </div>
      </Sheet>
      <NativeLayer />
    </>
  );
}

/**
 * The walking skeleton's review tools (B04): the reveal, the native stand-ins, the simulator that
 * drives the skeleton, and the guided journeys.
 */
function Simulator({ close }: { close: () => void }) {
  const ctx = useCtx();
  const setSheet = useNative((n) => n.setSheet);
  const offline = useUi((s) => s.devState) === 'offline';
  const run = (fn: () => void) => () => {
    close();
    // a sheet closing and another opening in one tick leaves the second shut; wait out the first's exit
    setTimeout(fn, 400);
  };
  return (
    <>
      <Group label="The reveal">
        <Button variant="outline" onClick={run(() => ctx.go('new-look'))}>
          Play the reveal
        </Button>
      </Group>
      <Group label="Native stand-ins">
        <p className="text-sm text-muted-foreground">
          Prompts, pushes, widgets, shortcuts, the share target and the island, as Android would draw them.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={run(() => setSheet('native'))}>
            Surfaces
          </Button>
          <Button variant="outline" onClick={run(() => setSheet('widgets'))}>
            Widgets
          </Button>
        </div>
      </Group>
      <Group label="Simulator">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={run(simulator.arrives)}>
            A notification arrives
          </Button>
          <Button variant="outline" onClick={run(() => simulator.payday(ctx))}>
            Payday
          </Button>
          <Button variant="outline" onClick={run(() => simulator.captureOff(ctx))}>
            Capture off
          </Button>
          <Button variant="outline" aria-pressed={offline} onClick={run(simulator.toggleOffline)}>
            {offline ? 'Back online' : 'Offline'}
          </Button>
        </div>
      </Group>
      <Group label="Guided journeys">
        <Button variant="outline" onClick={run(() => setSheet('journeys'))}>
          Choose a journey
        </Button>
      </Group>
    </>
  );
}

/**
 * Live updates (D100): the stamp *Updated 2 min ago* shows while the relay is down. The switch forces it, for
 * its tree and screenshot; with the server's backend, the two checks of Settings → Data run from here too.
 */
function LiveUpdates() {
  const forced = useLive((s) => s.forced !== null);
  const [busy, setBusy] = useState(false);
  const run = (check: () => Promise<string>) => () => {
    setBusy(true);
    void check()
      .then(toastDone)
      .finally(() => setBusy(false));
  };
  return (
    <Group label="Live updates">
      <div className="-mx-4">
        <SwitchRow
          title="Show the relay as down"
          checked={forced}
          onCheckedChange={(on) =>
            useLive.setState({ forced: on ? { updatedAt: new Date(clockNow().getTime() - 120_000) } : null })
          }
        />
      </div>
      {__SEN_BACKEND__ === 'api' ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={run(sendTestPush)}>
            Send a test push
          </Button>
          <Button variant="outline" disabled={busy} onClick={run(scheduleTestJob)}>
            Schedule a test job
          </Button>
        </div>
      ) : null}
    </Group>
  );
}

/** The shell's capture, simulated in a browser (dev/capture-sim.ts): what the phone would do. */
function CaptureSim() {
  const access = useCaptureSim((s) => s.access);
  const events = useCaptureSim((s) => s.events.length);
  const brand = useCaptureSim((s) => s.brand);
  return (
    <Group label="Capture (simulated)">
      <p className="text-sm text-muted-foreground">
        {access ? 'Notification access on' : 'Notification access off'} · {events} captured
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => sim.grantAccess(!access)}>
          {access ? 'Turn access off' : 'Grant access'}
        </Button>
        <Button variant="outline" onClick={() => sim.post()}>
          Post a notification
        </Button>
        <Button variant="outline" onClick={() => sim.repost()}>
          Post it again
        </Button>
        <Button variant="outline" onClick={() => sim.otp()}>
          Post an OTP
        </Button>
        <Button variant="outline" onClick={() => sim.maybeOtp()}>
          Post a maybe-OTP
        </Button>
        <Button variant="ghost" onClick={() => sim.reset()}>
          Reset
        </Button>
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Phone brand"
        value={brand}
        onValueChange={(v) => (v === 'xiaomi' || v === 'none') && sim.setBrand(v)}
      >
        <ToggleGroupItem value="xiaomi">Xiaomi</ToggleGroupItem>
        <ToggleGroupItem value="none">A brand with no steps</ToggleGroupItem>
      </ToggleGroup>
    </Group>
  );
}
