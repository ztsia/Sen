import { Capacitor, registerPlugin } from '@capacitor/core';

// The shell's two plugins (apps/shell/android/.../bridge/), as the web app calls them. Only our own
// site can reach them: Capacitor injects the bridge for that origin alone (spec §17). In a plain
// browser there's no shell, so production says capture lives in the Android app, and development and
// previews use a simulator instead (dev/capture-sim.ts), driven from the dev panel.

/** True inside the Android shell. */
export const inShell = (): boolean => Capacitor.isNativePlatform();

export interface ShellInfo {
  /** Counts the bridge's additions; methods are only ever added, so check it before calling a newer one. */
  bridge: number;
  version: string;
  versionCode: number;
  build: 'release' | 'debug' | 'e2e' | 'sim';
  capture: boolean;
  manufacturer: string;
  model: string;
  sdk: number;
  icon: 'minted' | 'instrument';
}

export interface SenShellPlugin {
  info(): Promise<ShellInfo>;
  openInBrowser(o: { url: string }): Promise<void>;
  testPrompt(): Promise<void>;
  testIsland(): Promise<{ promoted: boolean; liveUpdates: boolean }>;
  switchIcon(): Promise<{ icon: ShellInfo['icon'] }>;
}

export type BlockReason = 'self' | 'sms' | 'messaging' | 'email' | 'social' | 'denylist' | 'missing';

export interface CaptureApp {
  package: string;
  label: string;
  curated: boolean;
  kind: 'bank' | 'ewallet' | 'wallet' | null;
  accounts: string[];
  blocked: BlockReason | null;
  chosen: boolean;
  /** A PNG data URL, or null. */
  icon: string | null;
}

export interface CaptureStatus {
  /** Capture is built into this shell: false in the debug build (spec §17). */
  enabled: boolean;
  /** Notification access is granted. */
  access: boolean;
  /** Android has the listener bound right now. */
  connected: boolean;
  beatAt: number;
  eventAt: number;
  connectedAt: number;
  disconnectedAt: number;
  ignoringBattery: boolean;
  chosen: string[];
  events: number;
  /** Android 13+: notification access may be greyed out until Allow restricted settings. */
  restrictedSettings: boolean;
}

export interface CapturedEvent {
  id: number;
  package: string;
  channel: string | null;
  postTime: number;
  when: number;
  title: string | null;
  text: string | null;
  bigText: string | null;
  capturedAt: number;
  synced: boolean;
  /** Might hold a one-time code: stored with its code-like numbers masked (D116). */
  maybeOtp: boolean;
}

export interface Beat {
  at: number;
  /** otp: a one-time code from a chosen app was dropped; only its time and app are kept. */
  kind: 'connected' | 'disconnected' | 'beat' | 'boot' | 'updated' | 'otp' | 'unread';
  connected: boolean;
  /** The app, for an otp drop; null otherwise. */
  package?: string | null;
}

export interface BrandSection {
  heading: string;
  steps: string[];
}

export interface Brand {
  id: string;
  name: string;
  manufacturers: string[];
  sections: BrandSection[];
  opens: { label: string; component: string }[];
  url: string;
  tested: boolean;
}

export interface SenCapturePlugin {
  status(): Promise<CaptureStatus>;
  apps(o?: { icons?: boolean }): Promise<{ apps: CaptureApp[] }>;
  setChosen(o: {
    packages: string[];
  }): Promise<{ chosen: string[]; refused: { package: string; reason: BlockReason }[] }>;
  openNotificationAccess(): Promise<void>;
  openAppInfo(): Promise<void>;
  requestIgnoreBattery(): Promise<void>;
  keepRunning(): Promise<{ manufacturer: string; ignoringBattery: boolean; brand: Brand | null }>;
  openBrandStep(o: { index: number }): Promise<void>;
  events(o: { limit?: number; before?: number }): Promise<{ events: CapturedEvent[]; total: number }>;
  heartbeats(o?: { limit?: number }): Promise<{ beats: Beat[] }>;
  shareSamples(o: { ids: number[] }): Promise<void>;
}

// compared in place, so a production build leaves the simulator's chunk out (sen-env.d.ts)
const sim = __SEN_ENV__ !== 'production' ? () => import('@/dev/capture-sim') : null;

export const SenShell = registerPlugin<SenShellPlugin>(
  'SenShell',
  sim ? { web: () => sim().then((m) => m.shellSim) } : {},
);
export const SenCapture = registerPlugin<SenCapturePlugin>(
  'SenCapture',
  sim ? { web: () => sim().then((m) => m.captureSim) } : {},
);

/** Whether capture's screens can work here: the shell, or the simulator in development and previews. */
export const captureReachable = (): boolean => inShell() || __SEN_ENV__ !== 'production';
