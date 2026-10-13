import { useState } from 'react';
import { CalendarSyncIcon, MonitorSmartphoneIcon, MoonIcon, SunIcon } from 'lucide-react';
import { ChoiceCards, Segmented, type Segment } from '@/blocks/choice';
import { GroupCard, GroupLabel, SwitchRow } from '@/blocks/group';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { now } from '@/lib/clock';
import { longDay } from '@/lib/dates';
import { LOOK_IDS, LOOK_NAMES, type LookId } from '@/looks/ids';
import { useMode, useTheme, type ModePref } from '@/theme/store';
import { LookPreview } from './look-preview';

const MODES: Segment<ModePref>[] = [
  { value: 'system', label: 'System', icon: MonitorSmartphoneIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
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
 * Settings → Appearance (D44, D77, D78, D130): the mode with its icons, whether the look changes each
 * quarter, and the six looks, each shown as a mini Home drawn in it. The theme is kept on this phone,
 * so it isn't a setting.set write. The store has no "changes each quarter" flag yet, so that choice is
 * local state here.
 */
export default function Appearance() {
  const look = useTheme((t) => t.look);
  const modePref = useTheme((t) => t.modePref);
  const setLook = useTheme((t) => t.setLook);
  const setModePref = useTheme((t) => t.setModePref);
  const mode = useMode();
  const [quarterly, setQuarterly] = useState(true);
  return (
    <Screen bar={<AppBar title="Appearance" />}>
      <div className="flex flex-col gap-6 pt-2 pb-8">
        <div className="flex flex-col gap-2">
          <div className="px-4">
            <GroupLabel>Mode</GroupLabel>
          </div>
          <Segmented label="Mode" options={MODES} value={modePref} onChange={setModePref} />
        </div>

        <GroupCard label="Look">
          <SwitchRow
            icon={CalendarSyncIcon}
            tone="accent"
            title="Change each quarter"
            description={
              quarterly
                ? `${LOOK_NAMES[look]} until ${nextQuarterStart(now())}`
                : `${LOOK_NAMES[look]} stays until you change it`
            }
            checked={quarterly}
            onCheckedChange={setQuarterly}
          />
        </GroupCard>

        <ChoiceCards
          label="Look"
          value={quarterly ? null : look}
          onChange={(id: LookId) => {
            setQuarterly(false);
            setLook(id);
          }}
          options={LOOK_IDS.map((id) => ({
            value: id,
            label: LOOK_NAMES[id],
            description: quarterly && id === look ? 'This quarter' : undefined,
            preview: <LookPreview look={id} mode={mode} />,
          }))}
        />
      </div>
    </Screen>
  );
}
