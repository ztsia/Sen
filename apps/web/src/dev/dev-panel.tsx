import { useState } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { AVATAR_STATES, type AvatarState } from '@sen/looks';
import { Avatar } from '@/components/look/avatar';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sheet } from '@/blocks/sheet';
import { SettingsRow } from '@/blocks/rows';
import { DEV_STATES, useUi, type DevState } from '@/frame/ui-store';
import { LOOK_IDS, LOOK_NAMES, isLookId } from '@/looks/ids';
import { useTheme, type ModePref } from '@/theme/store';
import { inShell } from '@/shell/bridge';
import { SCENARIOS, SCENARIO_NAMES, type ScenarioId } from '@/data/fake/variants';
import { sim, useCaptureSim } from './capture-sim';

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
          <SettingsRow
            label="Reduced motion"
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
        {inShell() ? null : <CaptureSim />}
        <div className="py-3">
          <Button asChild variant="outline" className="w-full">
            <Link to="/dev/gallery" onClick={() => setOpen(false)}>
              Open the gallery
            </Link>
          </Button>
        </div>
      </Sheet>
    </>
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
