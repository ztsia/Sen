import { create } from 'zustand';
import type {
  Beat,
  Brand,
  CaptureApp,
  CapturedEvent,
  SenCapturePlugin,
  SenShellPlugin,
  ShellInfo,
} from '@/shell/bridge';
import { toastDone } from '@/blocks/toast';
import { REFRESH } from '@/shell/use-bridge';

// The shell, simulated, for development and previews in a browser (CLAUDE.md: native-only features get
// a dev-only simulator). Never in production: bridge.ts loads it only outside production builds. Every
// app, event and time here is made up; the notifications are docs/notifications.md's anonymised ones.

const MIN = 60_000;

const APPS: Omit<CaptureApp, 'chosen'>[] = [
  {
    package: 'my.com.tngdigital.ewallet',
    label: "Touch 'n Go eWallet",
    curated: true,
    kind: 'ewallet',
    accounts: ['TNG eWallet', 'GO+'],
    blocked: null,
    icon: null,
  },
  {
    package: 'my.rytbank.app',
    label: 'Ryt Bank',
    curated: true,
    kind: 'bank',
    accounts: ['Ryt Main Account'],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.pbb.mypb',
    label: 'MyPB by Public Bank',
    curated: true,
    kind: 'bank',
    accounts: ['Public Bank'],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.grabtaxi.passenger',
    label: 'Grab',
    curated: true,
    kind: 'ewallet',
    accounts: ['GrabPay Wallet'],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.google.android.apps.walletnfcrel',
    label: 'Google Wallet',
    curated: true,
    kind: 'wallet',
    accounts: [],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.example.shopping',
    label: 'A shopping app',
    curated: false,
    kind: null,
    accounts: [],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.example.coffee',
    label: 'A coffee app',
    curated: false,
    kind: null,
    accounts: [],
    blocked: null,
    icon: null,
  },
  {
    package: 'com.google.android.apps.messaging',
    label: 'Messages',
    curated: false,
    kind: null,
    accounts: [],
    blocked: 'sms',
    icon: null,
  },
  {
    package: 'com.whatsapp',
    label: 'WhatsApp',
    curated: false,
    kind: null,
    accounts: [],
    blocked: 'messaging',
    icon: null,
  },
  {
    package: 'com.google.android.gm',
    label: 'Gmail',
    curated: false,
    kind: null,
    accounts: [],
    blocked: 'email',
    icon: null,
  },
  {
    package: 'com.instagram.android',
    label: 'Instagram',
    curated: false,
    kind: null,
    accounts: [],
    blocked: 'social',
    icon: null,
  },
];

const SAMPLES: Omit<CapturedEvent, 'id' | 'postTime' | 'when' | 'capturedAt' | 'synced' | 'maybeOtp'>[] = [
  {
    package: 'my.rytbank.app',
    channel: 'transactions',
    title: 'Card payment completed 👍',
    text: 'RM38.15 paid at Petron using your Main Account.',
    bigText: null,
  },
  {
    package: 'my.com.tngdigital.ewallet',
    channel: 'payments',
    title: 'DuitNow Transfer is successful!',
    text: 'You have successfully transferred RM 18.00 to LIM KAH HOE.',
    bigText: null,
  },
  {
    package: 'com.pbb.mypb',
    channel: null,
    title: 'Money Received',
    text: 'PBB. You have received a DuitNow Transfer of RM150.00 from TAN WEI MING.',
    bigText: null,
  },
  {
    package: 'my.rytbank.app',
    channel: 'transactions',
    title: 'Your money is in!',
    text: "You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).",
    bigText: null,
  },
];

const XIAOMI: Brand = {
  id: 'xiaomi',
  name: 'Xiaomi',
  manufacturers: ['xiaomi'],
  url: 'https://dontkillmyapp.com/xiaomi',
  tested: true,
  opens: [
    { label: 'Autostart', component: 'com.miui.securitycenter/…' },
    { label: 'Battery saver', component: 'com.miui.powerkeeper/…' },
  ],
  sections: [
    {
      heading: 'App pinning / App locking',
      steps: ['When you open the recent apps tray, drag your app downwards (it will be locked).'],
    },
    { heading: 'Autostart', steps: ['Security app → Permissions → Autostart, and turn the app on.'] },
  ],
};

interface SimState {
  /** The phone's maker: the one tested brand, or one dontkillmyapp has no steps for. */
  brand: 'xiaomi' | 'none';
  access: boolean;
  connected: boolean;
  ignoringBattery: boolean;
  chosen: string[];
  events: CapturedEvent[];
  beats: Beat[];
  icon: ShellInfo['icon'];
  next: number;
}

export const useCaptureSim = create<SimState>(() => {
  const now = Date.now();
  return {
    brand: 'xiaomi' as const,
    access: false,
    connected: false,
    ignoringBattery: false,
    chosen: [],
    events: [],
    beats: [{ at: now - 90 * MIN, kind: 'boot', connected: false }],
    icon: 'minted',
    next: 1,
  };
});

const set = useCaptureSim.setState;
// Screens read the shell again when it changes (shell/use-bridge.ts), as they do after a resume.
useCaptureSim.subscribe(() => window.dispatchEvent(new Event(REFRESH)));
const get = useCaptureSim.getState;

/** The dev panel's buttons. */
export const sim = {
  grantAccess(on: boolean) {
    const at = Date.now();
    set((s) => ({
      access: on,
      connected: on,
      beats: [{ at, kind: on ? 'connected' : 'disconnected', connected: on }, ...s.beats],
    }));
  },
  /** A made-up notification from one of the samples: stored only if its app was chosen, as the listener does. */
  post() {
    const s = get();
    const sample = SAMPLES[s.next % SAMPLES.length]!;
    set({ next: s.next + 1 });
    store(sample, Date.now() + s.next);
  },
  /** The last notification again, as a listener reconnect replays it: the same dedupe key, so nothing new. */
  repost() {
    // the newest event's own fields, `when` included: the same dedupe identity, as a reconnect replays it
    const last = get().events[0];
    if (!last) return toastDone('Simulated: nothing to post again yet');
    store(
      {
        package: last.package,
        channel: last.channel,
        title: last.title,
        text: last.text,
        bigText: last.bigText,
        maybeOtp: last.maybeOtp,
      },
      last.when,
    );
  },
  /**
   * An OTP from a chosen app. The browser can't run the shell's Kotlin filter, so this made-up OTP is
   * marked as one and dropped the way the shell drops it: before anything is stored. The filter itself
   * is tested in apps/shell/core and on the emulator.
   */
  otp() {
    const pkg = get().chosen[0] ?? 'my.rytbank.app';
    store(
      {
        package: pkg,
        channel: 'security',
        title: 'Ryt Bank',
        text: 'Your TAC is 482910. Do not share it.',
        bigText: null,
        otp: true,
      },
      Date.now(),
    );
  },
  /**
   * A payment-like notification that might hold a code: the shell's filter keeps it, and its mask
   * (D116) stores it with the code-like numbers hidden. Made up, and already masked here, as the shell
   * would store it.
   */
  maybeOtp() {
    const pkg = get().chosen[0] ?? 'my.rytbank.app';
    store(
      {
        package: pkg,
        channel: 'transactions',
        title: 'Ryt Bank',
        text: 'RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.',
        bigText: null,
        maybeOtp: true,
      },
      Date.now(),
    );
  },
  setBrand(brand: SimState['brand']) {
    set({ brand });
  },
  reset() {
    useCaptureSim.setState(useCaptureSim.getInitialState(), true);
  },
};

type Posted = Omit<CapturedEvent, 'id' | 'postTime' | 'when' | 'capturedAt' | 'synced' | 'maybeOtp'> & {
  otp?: boolean;
  maybeOtp?: boolean;
};

/** What the listener does with a notification: unchosen, then OTP, then the dedupe key (spec §6.2). */
function store(posted: Posted, when: number) {
  const s = get();
  if (!s.access || !s.chosen.includes(posted.package)) {
    toastDone('Simulated: not stored, its app isn’t chosen or access is off');
    return;
  }
  if (posted.otp) {
    // dropped before anything is stored; only its time and app go in the heartbeat's log
    set({ beats: [{ at: Date.now(), kind: 'otp', connected: s.connected, package: posted.package }, ...s.beats] });
    toastDone('Simulated: an OTP, dropped before anything was stored');
    return;
  }
  const key = (e: Pick<CapturedEvent, 'package' | 'title' | 'text' | 'bigText' | 'when'>) =>
    [e.package, e.title, e.text, e.bigText, e.when].join('\u0000');
  const { otp: _otp, maybeOtp = false, ...rest } = posted;
  const event = { ...rest, maybeOtp };
  if (s.events.some((e) => key(e) === key({ ...event, when }))) {
    toastDone('Simulated: the same notification again, not stored twice');
    return;
  }
  const now = Date.now();
  set({
    events: [
      { ...event, id: (s.events[0]?.id ?? 1000) + 1, postTime: now, when, capturedAt: now, synced: false },
      ...s.events,
    ],
  });
  toastDone(
    maybeOtp ? 'Simulated: maybe an OTP, stored with its numbers hidden' : 'Simulated: a notification captured',
  );
}

const status = () => {
  const s = get();
  return {
    enabled: true,
    access: s.access,
    connected: s.connected,
    beatAt: s.beats[0]?.at ?? 0,
    eventAt: s.events[0]?.capturedAt ?? 0,
    connectedAt: s.beats.find((b) => b.kind === 'connected')?.at ?? 0,
    disconnectedAt: s.beats.find((b) => b.kind === 'disconnected')?.at ?? 0,
    ignoringBattery: s.ignoringBattery,
    chosen: [...s.chosen].sort(),
    events: s.events.length,
    restrictedSettings: true,
  };
};

const pause = () => new Promise((r) => setTimeout(r, 150));

export const captureSim: SenCapturePlugin = {
  async status() {
    await pause();
    return status();
  },
  async apps() {
    await pause();
    const chosen = new Set(get().chosen);
    return { apps: APPS.map((a) => ({ ...a, chosen: chosen.has(a.package) })) };
  },
  async setChosen({ packages }) {
    const byId = new Map(APPS.map((a) => [a.package, a]));
    const refused = packages.flatMap((p) => {
      const a = byId.get(p);
      const reason = a ? a.blocked : 'missing';
      return reason ? [{ package: p, reason }] : [];
    });
    const chosen = packages.filter((p) => !refused.some((r) => r.package === p));
    set({ chosen });
    return { chosen, refused };
  },
  async openNotificationAccess() {
    sim.grantAccess(true);
    toastDone('Simulated: notification access granted');
  },
  async openAppInfo() {
    toastDone('Simulated: the app’s info page');
  },
  async requestIgnoreBattery() {
    set({ ignoringBattery: true });
    toastDone('Simulated: battery optimisation off');
  },
  async keepRunning() {
    await pause();
    const xiaomi = get().brand === 'xiaomi';
    return {
      manufacturer: xiaomi ? 'Xiaomi' : 'Fairphone',
      ignoringBattery: get().ignoringBattery,
      brand: xiaomi ? XIAOMI : null,
    };
  },
  async openBrandStep({ index }) {
    toastDone(`Simulated: ${XIAOMI.opens[index]?.label ?? 'the app’s info page'}`);
  },
  async events({ limit = 50, before }) {
    await pause();
    const all = get().events;
    const from = before === undefined ? all : all.filter((e) => e.id < before);
    return { events: from.slice(0, limit), total: all.length };
  },
  async heartbeats() {
    return { beats: get().beats };
  },
  async shareSamples({ ids }) {
    // as the shell does: nothing chosen is refused
    if (!ids.length) throw Object.assign(new Error('Nothing chosen'), { code: 'EMPTY' });
    toastDone(`Simulated: the share sheet with ${ids.length} sample${ids.length === 1 ? '' : 's'}`);
  },
};

export const shellSim: SenShellPlugin = {
  async info() {
    return {
      bridge: 1,
      version: 'simulated',
      versionCode: 0,
      build: 'sim',
      capture: true,
      manufacturer: 'Xiaomi',
      model: 'Simulated',
      sdk: 36,
      icon: get().icon,
    };
  },
  async openInBrowser({ url }) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  async testPrompt() {
    toastDone('Simulated: a category prompt with three buttons');
  },
  async testIsland() {
    toastDone('Simulated: a Live Update counting down a minute');
    return { promoted: true, liveUpdates: true };
  },
  async switchIcon() {
    const icon = get().icon === 'minted' ? 'instrument' : 'minted';
    set({ icon });
    return { icon };
  },
};
