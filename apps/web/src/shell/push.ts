import { registerPlugin } from '@capacitor/core';
import { apiCall } from '@/data/api/client';
import { screenById } from '@/screens/registry';
import { SenShell, inShell } from './bridge';

// Push in the shell (B06): Firebase Cloud Messaging through @capacitor-firebase/messaging, whose native
// side the shell holds from bridge 3. The npm package is deliberately not a dependency of the web app:
// its browser fallback pulls Firebase's SDK into the build, and the service worker would cache it on
// every phone. So the plugin is reached by name, typed here after its API.

type Receive = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
interface Handle {
  remove(): Promise<void>;
}
export interface FirebaseMessagingPlugin {
  checkPermissions(): Promise<{ receive: Receive }>;
  requestPermissions(): Promise<{ receive: Receive }>;
  getToken(): Promise<{ token: string }>;
  deleteToken(): Promise<void>;
  addListener(event: 'tokenReceived', fn: (e: { token: string }) => void): Promise<Handle>;
  addListener(
    event: 'notificationActionPerformed',
    fn: (e: { actionId?: string; notification: { data?: unknown } }) => void,
  ): Promise<Handle>;
}

/** The first bridge that has the plugin. */
const PUSH_BRIDGE = 3;

let plugin: FirebaseMessagingPlugin | null = null;
const messaging = () => (plugin ??= registerPlugin<FirebaseMessagingPlugin>('FirebaseMessaging'));

let started: Promise<void> | null = null;
let token: string | null = null;
let handles: Handle[] = [];

/**
 * Where a push opens: its `data.open` names a screen of the registry (`settings/data`). A tab goes to
 * its own path; a sheet or anything unknown opens nothing.
 */
export function screenTarget(data: unknown): { to: '/' | '/review' | '/insights' | '/more' } | { id: string } | null {
  const open = typeof data === 'object' && data !== null ? (data as { open?: unknown }).open : undefined;
  if (typeof open !== 'string') return null;
  const screen = screenById.get(open);
  if (!screen || screen.kind === 'sheet' || screen.kind === 'outside') return null;
  if (screen.kind === 'tab')
    return { to: screen.id === 'home' ? '/' : (`/${screen.id}` as '/review' | '/insights' | '/more') };
  return { id: screen.id };
}

async function register(next: string) {
  token = next;
  // offline or signed out: the next start tries again
  await apiCall('/push/token', { method: 'PUT', body: { token: next } }).catch(() => undefined);
}

export type PushTarget = NonNullable<ReturnType<typeof screenTarget>>;
let goTo: ((target: PushTarget) => void) | null = null;

/** The router's way of opening a screen, given by the shell's init (native.ts); the router imports this file's caller, so it can't be imported here. */
export function onPushOpen(fn: (target: PushTarget) => void) {
  goTo = fn;
}

function open(data: unknown) {
  const target = screenTarget(data);
  if (target) goTo?.(target);
}

async function begin() {
  if (!inShell()) return;
  const info = await SenShell.info();
  if (info.bridge < PUSH_BRIDGE) return;
  const fm = messaging();
  let { receive } = await fm.checkPermissions();
  // Android 13+ shows its prompt once; after a refusal this stays quiet
  if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await fm.requestPermissions()).receive;
  if (receive !== 'granted') return;
  handles = await Promise.all([
    fm.addListener('tokenReceived', (e) => void register(e.token).catch(() => undefined)),
    fm.addListener('notificationActionPerformed', (e) => open(e.notification.data)),
  ]);
  await register((await fm.getToken()).token);
}

/** After sign-in: ask to send pushes, and tell the server where. Does nothing in a browser or an older shell. */
export function startPush(): Promise<void> {
  started ??= begin().catch(() => {
    started = null; // try again at the next start
  });
  return started;
}

/**
 * Before sign-out, while the session still holds: the server forgets this phone, then the phone drops its
 * token. Every failure is ignored, so signing out never waits on push.
 */
export async function stopPush(): Promise<void> {
  if (!started) return;
  await started.catch(() => undefined);
  started = null;
  const gone = token;
  token = null;
  const hs = handles;
  handles = [];
  for (const h of hs) await h.remove().catch(() => undefined);
  if (gone) await apiCall('/push/token', { method: 'DELETE', body: { token: gone } }).catch(() => undefined);
  await messaging()
    .deleteToken()
    .catch(() => undefined);
}
