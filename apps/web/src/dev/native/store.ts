import { create } from 'zustand';
import type { SurfaceId } from './ids';

/** Which dev sheet is open (the stand-ins, the journeys), and the stand-in shown over the app like Android's shade. */
interface NativeState {
  sheet: 'native' | 'widgets' | 'journeys' | null;
  shade: SurfaceId | null;
  setSheet: (s: NativeState['sheet']) => void;
  setShade: (s: SurfaceId | null) => void;
}

export const useNative = create<NativeState>((set) => ({
  sheet: null,
  shade: null,
  setSheet: (sheet) => set({ sheet }),
  setShade: (shade) => set({ shade }),
}));
