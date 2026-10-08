import { create } from 'zustand';
import { DEV_TOOLS } from '@/lib/env';
import { readStored, writeStored } from '@/lib/storage';
import { PRODUCTION_LOOK, isLookId, type LookId } from '@/looks/ids';

export type ModePref = 'system' | 'light' | 'dark';
export type Mode = 'light' | 'dark';
export type TextScale = 1 | 1.5;

interface ThemeState {
  /** The look shown. In production it's pinned until B14; previews can switch it in the dev panel. */
  look: LookId;
  /** System (the default), Light or Dark (D44). */
  modePref: ModePref;
  /** The phone's own setting, followed live. */
  systemDark: boolean;
  /** The dev panel's toggles: reduced motion forced on, and text at 1.5×. */
  forceReducedMotion: boolean;
  systemReducedMotion: boolean;
  textScale: TextScale;
  setLook: (look: LookId) => void;
  setModePref: (pref: ModePref) => void;
  setForceReducedMotion: (on: boolean) => void;
  setTextScale: (scale: TextScale) => void;
}

const KEYS = { look: 'sen.look', mode: 'sen.mode', motion: 'sen.dev.reducedMotion', scale: 'sen.dev.textScale' };

const mq = (q: string) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);
const darkMq = mq('(prefers-color-scheme: dark)');
const motionMq = mq('(prefers-reduced-motion: reduce)');

function initialLook(): LookId {
  if (!DEV_TOOLS) return PRODUCTION_LOOK;
  const fromUrl = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;
  if (isLookId(fromUrl)) return fromUrl;
  const stored = readStored(KEYS.look);
  return isLookId(stored) ? stored : PRODUCTION_LOOK;
}
function initialMode(): ModePref {
  const fromUrl =
    DEV_TOOLS && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mode') : null;
  const v = fromUrl ?? readStored(KEYS.mode);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export const useTheme = create<ThemeState>((set) => ({
  look: initialLook(),
  modePref: initialMode(),
  systemDark: darkMq?.matches ?? false,
  forceReducedMotion: DEV_TOOLS && readStored(KEYS.motion) === '1',
  systemReducedMotion: motionMq?.matches ?? false,
  textScale: DEV_TOOLS && readStored(KEYS.scale) === '1.5' ? 1.5 : 1,
  setLook: (look) => {
    writeStored(KEYS.look, look);
    set({ look });
  },
  setModePref: (modePref) => {
    writeStored(KEYS.mode, modePref);
    set({ modePref });
  },
  setForceReducedMotion: (forceReducedMotion) => {
    writeStored(KEYS.motion, forceReducedMotion ? '1' : null);
    set({ forceReducedMotion });
  },
  setTextScale: (textScale) => {
    writeStored(KEYS.scale, textScale === 1 ? null : String(textScale));
    set({ textScale });
  },
}));

darkMq?.addEventListener('change', (e) => useTheme.setState({ systemDark: e.matches }));
motionMq?.addEventListener('change', (e) => useTheme.setState({ systemReducedMotion: e.matches }));

export const resolveMode = (s: Pick<ThemeState, 'modePref' | 'systemDark'>): Mode =>
  s.modePref === 'system' ? (s.systemDark ? 'dark' : 'light') : s.modePref;

export const useMode = () => useTheme(resolveMode);
export const useReducedMotion = () => useTheme((s) => s.forceReducedMotion || s.systemReducedMotion);

/** Reduced motion, read outside React (a look's drawing loop). */
export const reducedMotionNow = () => {
  const s = useTheme.getState();
  return s.forceReducedMotion || s.systemReducedMotion;
};

/** Puts the look and mode on <html>, and keeps the browser's status bar colour in step. */
export function applyTheme(s: ThemeState = useTheme.getState()) {
  const root = document.documentElement;
  const mode = resolveMode(s);
  root.dataset.look = s.look;
  root.dataset.mode = mode;
  root.dataset.reducedMotion = String(s.forceReducedMotion);
  root.style.setProperty('--text-scale', String(s.textScale));
  const bg = getComputedStyle(root).getPropertyValue('--background').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && bg) meta.setAttribute('content', bg);
}
