import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Command } from '@sen/core/commands';

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
  /** Bridge 2 (B05): one of Android's haptics, through the WebView; check `info().bridge` first. */
  haptic(o: { kind: string }): Promise<{ performed: boolean }>;
  /**
   * Bridge 4 (B07): the web app signed in or out, so the shell reads the session again (it keeps the
   * token for sync and clears it at sign-out). Check `info().bridge` first.
   */
  sessionChanged(): Promise<{ signedIn: boolean }>;
}

/** The first bridge that has the outbox's write path, `pending`, `syncNow` and the session hand-over. */
export const OUTBOX_BRIDGE = 4;

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
  /** Bridge 4: the person's *Capture* switch as the last sync heard it. */
  captureSwitch: boolean;
  /** Bridge 4: when the last sync finished (epoch ms), or null before the first. */
  lastSyncAt: number | null;
  /** Bridge 4: captured events still waiting to sync. */
  pendingEvents: number;
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
  /** Bridge 4: why the server won't take it (stored, never retried), or null. */
  refused: string | null;
}

/** A write in the outbox (bridge 4): `status` is null until a sync has carried it. */
export interface PendingCommand {
  id: string;
  command: Command;
  madeAt: string;
  status: null | 'applied' | 'already' | 'refused';
  /** The server's words for it (why, when refused). */
  said: string | null;
}

export interface OutboxState {
  commands: PendingCommand[];
  /** Captured events not yet synced. */
  events: number;
  lastSyncAt: number | null;
  /** When the morning job last ran, and the server's clock at the last sync (spec §18). */
  morningAt: string | null;
  serverNow: string | null;
  /** The *Capture* switch as the last sync heard it. */
  capture: boolean;
  signedIn: boolean;
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
  /** `pending: true` (bridge 4) returns only the events not yet synced. */
  events(o: {
    limit?: number;
    before?: number;
    pending?: boolean;
  }): Promise<{ events: CapturedEvent[]; total: number }>;
  heartbeats(o?: { limit?: number }): Promise<{ beats: Beat[] }>;
  shareSamples(o: { ids: number[] }): Promise<void>;
  /** Bridge 4 (B07): a write goes into the outbox, to sync when it can. `id` is the write's own, so a retry is a no-op. */
  write(o: { id: string; command: Command; madeAt: string }): Promise<{ queued: true }>;
  /** Bridge 4: what the outbox holds, and what the last sync heard. */
  pending(): Promise<OutboxState>;
  /** Bridge 4: sync now, rather than at the next trigger. */
  syncNow(): Promise<Record<string, never>>;
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

let bridgeLevel: Promise<number> | null = null;

/** True inside the shell when its bridge is at least `n` (`info().bridge`): methods are only ever added, so check before calling a newer one. */
export async function hasBridge(n: number): Promise<boolean> {
  if (!inShell()) return false;
  bridgeLevel ??= SenShell.info().then(
    (i) => i.bridge,
    () => {
      bridgeLevel = null; // ask again next time
      return 0;
    },
  );
  return (await bridgeLevel) >= n;
}
