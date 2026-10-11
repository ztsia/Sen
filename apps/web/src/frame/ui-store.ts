import { create } from 'zustand';
import type { AvatarState } from '@sen/looks';
import type { ScenarioId } from '@/data/fake/variants';

/** States the dev panel can put a screen in (B03 and B04 use them to show each screen's states). */
export const DEV_STATES = ['normal', 'empty', 'loading', 'error', 'offline'] as const;
export type DevState = (typeof DEV_STATES)[number];

const SCENARIO_IDS: readonly string[] = [
  'wei-ming',
  'payday',
  'before-salary',
  'first-cycle',
  'month',
  'capture-off',
  'cap',
];

/** ?scenario= and ?state= pick the made-up scenario and the screen state on load (previews only: production has no fake). */
function fromUrl<T extends string>(key: string, allowed: readonly string[], fallback: T): T {
  if (typeof location === 'undefined') return fallback;
  const v = new URLSearchParams(location.search).get(key);
  return v && allowed.includes(v) ? (v as T) : fallback;
}

interface UiState {
  senOpen: boolean;
  scanMoreOpen: boolean;
  /** The dev panel's override for Review's badge; otherwise it counts Needs you (D72). */
  reviewCount: number | null;
  senState: AvatarState;
  devState: DevState;
  /** The skeleton's made-up scenario: Wei Ming's month, or one of its edge states. */
  scenario: ScenarioId;
  setSenOpen: (open: boolean) => void;
  setScanMoreOpen: (open: boolean) => void;
  setReviewCount: (n: number | null) => void;
  setSenState: (s: AvatarState) => void;
  setDevState: (s: DevState) => void;
  setScenario: (s: ScenarioId) => void;
}

export const useUi = create<UiState>((set) => ({
  senOpen: false,
  scanMoreOpen: false,
  reviewCount: null,
  senState: 'resting',
  devState: fromUrl('state', DEV_STATES, 'normal'),
  scenario: fromUrl('scenario', SCENARIO_IDS, 'wei-ming'),
  setSenOpen: (senOpen) => set({ senOpen }),
  setScanMoreOpen: (scanMoreOpen) => set({ scanMoreOpen }),
  setReviewCount: (reviewCount) => set({ reviewCount }),
  setSenState: (senState) => set({ senState }),
  setDevState: (devState) => set({ devState }),
  setScenario: (scenario) => set({ scenario }),
}));
