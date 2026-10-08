import { create } from 'zustand';
import type { AvatarState } from '@sen/looks';
import { DEV_TOOLS } from '@/lib/env';

/** States the dev panel can put a screen in (B03 and B04 use them to show each screen's states). */
export const DEV_STATES = ['normal', 'empty', 'loading', 'error', 'offline'] as const;
export type DevState = (typeof DEV_STATES)[number];

interface UiState {
  senOpen: boolean;
  scanMoreOpen: boolean;
  /** Needs you only (D72). Nothing is real yet, so production shows none; previews show a made-up count. */
  reviewCount: number;
  senState: AvatarState;
  devState: DevState;
  setSenOpen: (open: boolean) => void;
  setScanMoreOpen: (open: boolean) => void;
  setReviewCount: (n: number) => void;
  setSenState: (s: AvatarState) => void;
  setDevState: (s: DevState) => void;
}

export const useUi = create<UiState>((set) => ({
  senOpen: false,
  scanMoreOpen: false,
  reviewCount: DEV_TOOLS ? 5 : 0,
  senState: 'resting',
  devState: 'normal',
  setSenOpen: (senOpen) => set({ senOpen }),
  setScanMoreOpen: (scanMoreOpen) => set({ scanMoreOpen }),
  setReviewCount: (reviewCount) => set({ reviewCount }),
  setSenState: (senState) => set({ senState }),
  setDevState: (devState) => set({ devState }),
}));
