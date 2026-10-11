import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { now } from '@/lib/clock';
import { longDay } from '@/lib/dates';
import { LOOK_IDS, LOOK_NAMES, type LookId } from '@/looks/ids';
import { useTheme, type ModePref } from '@/theme/store';
import { Section } from '../kit';

const MODES: { value: ModePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** The first day of the next quarter in Kuala Lumpur, as *1 Jan 2027* (D77): 1 Jan, 1 Apr, 1 Jul, 1 Oct. */
export function nextQuarterStart(at: Date): string {
  // Kuala Lumpur is UTC+8 with no daylight time, so its calendar reads off the UTC getters.
  const kl = new Date(at.getTime() + 8 * 3_600_000);
  const next = (Math.floor(kl.getUTCMonth() / 3) + 1) * 3;
  const year = kl.getUTCFullYear() + (next >= 12 ? 1 : 0);
  const month = String((next % 12) + 1).padStart(2, '0');
  return longDay(`${year}-${month}-01`);
}

/**
 * Settings → Appearance (D44, D77, D78): System, Light or Dark, and the look, either changing each
 * quarter or one of the six pinned. The theme is kept on this phone, so it isn't a setting.set write.
 * The store has no "changes each quarter" flag yet, so that choice is local state here.
 */
export default function Appearance() {
  const look = useTheme((t) => t.look);
  const modePref = useTheme((t) => t.modePref);
  const setLook = useTheme((t) => t.setLook);
  const setModePref = useTheme((t) => t.setModePref);
  const [quarterly, setQuarterly] = useState(true);
  const pick = (id: LookId) => {
    setQuarterly(false);
    setLook(id);
  };
  return (
    <Screen bar={<AppBar title="Appearance" />}>
      <Section title="Mode">
        <div className="px-4 pt-1 pb-2">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            aria-label="Mode"
            className="w-full"
            value={modePref}
            onValueChange={(v) => {
              if (v) setModePref(v as ModePref);
            }}
          >
            {MODES.map((m) => (
              <ToggleGroupItem key={m.value} value={m.value} className="min-h-12 flex-1">
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </Section>
      <Section title="Look">
        <p className="px-4 pt-1 pb-2 text-sm text-muted-foreground">
          {quarterly
            ? `Today's look is ${LOOK_NAMES[look]}. The next change is on ${nextQuarterStart(now())}.`
            : `${LOOK_NAMES[look]} stays until you change it here.`}
        </p>
        <ul role="radiogroup" aria-label="Look" className="flex flex-col">
          <li>
            <Choice checked={quarterly} label="Changes each quarter" onSelect={() => setQuarterly(true)} />
          </li>
          {LOOK_IDS.map((id) => (
            <li key={id}>
              <Choice checked={!quarterly && look === id} label={LOOK_NAMES[id]} onSelect={() => pick(id)} />
            </li>
          ))}
        </ul>
      </Section>
    </Screen>
  );
}

function Choice({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base active:bg-accent"
    >
      <span>{label}</span>
      {checked ? <CheckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
    </button>
  );
}
