import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CDPSession, Page, test as baseTest } from '@playwright/test';
import { PNG } from 'pngjs';
import type { Metric, MetricName } from '../../../qa/limits';

// What a screen and a tap cost a person and a phone (D139). Nothing here names a cause: it records
// numbers, and qa/limits.ts judges them. It does nothing unless QA_METRICS names a folder, so `pnpm e2e`
// is unchanged. scripts/qa-diff.mjs runs metrics.spec.ts and journeys.spec.ts with it on main's build and
// on this branch's, and reads the JSONL these write: screens.jsonl, steps.jsonl.
//
// The phone is Lighthouse's mobile profile: the CPU 4× slower (as scripts/frame-times.mjs does) and the
// network at 150 ms of latency, 1.6 Mbps down and 750 Kbps up. The page records what only it can see
// (long tasks, layout shifts, Event Timing, every change to the document); this side counts the network.

/** The folder the metrics go to; unset means no metrics are taken. */
export const METRICS_DIR = process.env.QA_METRICS;
/** The folder the filmstrips go to (a PNG per tap); unset means none are made. */
export const FILM_DIR = process.env.QA_FILMSTRIP;

export const THROTTLE = { cpuRate: 4, latencyMs: 150, downBytesPerSec: 200_000, upBytesPerSec: 93_750 } as const;
/** Nothing changes and nothing is in flight for this long, and the screen has settled. */
const QUIET_MS = 500;
/** A screen or tap that never settles is measured as 8 s. */
const CAP_MS = 8000;
/** The filmstrip: a frame every 50 ms for the second after a tap (21 frames, the tap's own moment first). */
const FRAME_EVERY_MS = 50;
const FRAME_COUNT = 21;
const FILM_SCALE = 3;
/** Frames wider than this in one row go in two rows. */
const FILM_MAX_WIDTH = 2000;

/* ---------- what the page records ---------------------------------------------------- */

interface PageTap {
  /** performance.now() of the pointerdown */
  start: number;
  /** performance.now() of the last change to the document since, until the next tap */
  lastMutation: number;
}
interface PageEvent {
  start: number;
  duration: number;
  id: number;
}
interface PageState {
  /** a name for this document, since the page's own clock may be fixed (the catalogue's NOW) and so say nothing */
  id: string;
  longTasks: number[];
  shifts: number[];
  events: PageEvent[];
  taps: PageTap[];
  lastMutation: number;
}

/** Runs in the page before any of its scripts, on every document. Self-contained: it is serialised. */
export function pageProbe() {
  type Slot = {
    id: string;
    longTasks: number[];
    shifts: number[];
    events: PageEvent[];
    taps: PageTap[];
    lastMutation: number;
    tapIdx: number;
    now: () => number;
    flush: () => void;
  };
  const w = window as unknown as { __qa?: Slot; __qaTap?: (id: string, start: number, now: number) => void };
  if (w.__qa) return;
  // the browser's own clock: a fixed time (page.clock, for the catalogue's NOW) replaces performance.now with
  // one that runs from the context's start, not the page's, so this must run before it does (metrics.spec.ts)
  const now = performance.now.bind(performance);
  const q: Slot = {
    id: Math.random().toString(36).slice(2),
    longTasks: [],
    shifts: [],
    events: [],
    taps: [],
    lastMutation: now(),
    now,
    tapIdx: -1,
    flush: () => {},
  };
  w.__qa = q;
  const observers: PerformanceObserver[] = [];
  const watch = (init: PerformanceObserverInit, take: (e: PerformanceEntry) => void) => {
    try {
      const o = new PerformanceObserver((l) => l.getEntries().forEach(take));
      o.observe(init);
      observers.push(o);
      return o;
    } catch {
      return undefined;
    }
  };
  type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean };
  type Ev = PerformanceEntry & { interactionId?: number };
  watch({ type: 'longtask', buffered: true }, (e) => q.longTasks.push(e.duration));
  watch({ type: 'layout-shift', buffered: true }, (e) => {
    if (!(e as Shift).hadRecentInput) q.shifts.push((e as Shift).value);
  });
  watch({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit, (e) =>
    q.events.push({ start: e.startTime, duration: e.duration, id: (e as Ev).interactionId ?? 0 }),
  );
  // entries are delivered later than they happen: this takes the pending ones
  q.flush = () =>
    observers.forEach((o) => {
      for (const e of o.takeRecords()) {
        if (e.entryType === 'longtask') q.longTasks.push(e.duration);
        else if (e.entryType === 'layout-shift') {
          if (!(e as Shift).hadRecentInput) q.shifts.push((e as Shift).value);
        } else if (e.entryType === 'event')
          q.events.push({ start: e.startTime, duration: e.duration, id: (e as Ev).interactionId ?? 0 });
      }
    });
  // the ripple (frame/press.ts) is the press's own feedback, fading out after the finger lifts: it's
  // not the screen settling, so its nodes and attributes don't count as a change (QA B05 Feel run 1, 5)
  const press = (r: MutationRecord) =>
    (r.target as Element).closest?.('.press') ||
    (r.type === 'attributes' && r.attributeName === 'data-pressed') ||
    (r.type === 'childList' &&
      [...r.addedNodes, ...r.removedNodes].every((n) => (n as Element).classList?.contains('press')));
  new MutationObserver((records) => {
    if (records.every(press)) return;
    const t = now();
    q.lastMutation = t;
    if (q.tapIdx >= 0) q.taps[q.tapIdx]!.lastMutation = t;
  }).observe(document, { subtree: true, attributes: true, childList: true, characterData: true });
  // a tap is a pointer interaction: it starts at the pointerdown, which Event Timing dates to the same instant
  document.addEventListener(
    'pointerdown',
    (e) => {
      q.taps.push({ start: e.timeStamp, lastMutation: e.timeStamp });
      q.tapIdx = q.taps.length - 1;
      w.__qaTap?.(q.id, e.timeStamp, now());
    },
    true,
  );
}

/* ---------- what one run measured ---------------------------------------------------- */

export interface ScreenSample {
  settleMs: number;
  requests: number;
  bytes: number;
  blockingMs: number;
  heapBytes: number;
  layoutShift: number;
  console: number;
}

export interface StepSample {
  /** 1-based, in the order the taps happened */
  n: number;
  firstChangeMs: number;
  settleMs: number;
  bytes: number;
}

interface Tap {
  doc: string;
  /** performance.now() in its document */
  start: number;
  /** epoch ms, by this side's clock */
  at: number;
  frames: Frame[];
}
interface Frame {
  at: number;
  data: string;
}
interface Fetched {
  /** epoch ms, as this side saw the response finish */
  at: number;
  bytes: number;
  /** went to the network: not answered by the service worker's cache, nor the browser's */
  network: boolean;
}

/** A page under the phone's throttling, and what it did from then on. Start it before the page navigates. */
export class Probe {
  /** each document's last numbers, and when it began by this side's clock (the page's own may be fixed) */
  private docs = new Map<string, { state: PageState; origin: number }>();
  private fetched: Fetched[] = [];
  private inflight = new Set<string>();
  private lastNetwork = 0;
  private consoleCount = 0;
  private taps: Tap[] = [];
  private recent: Frame[] = [];
  private polling = false;
  /** the document the last read came from */
  private current: string | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private film = false;

  private constructor(
    private page: Page,
    private cdp: CDPSession,
  ) {}

  static async start(page: Page, opts: { film?: boolean } = {}) {
    const cdp = await page.context().newCDPSession(page);
    const p = new Probe(page, cdp);
    p.film = !!opts.film;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE.cpuRate });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: THROTTLE.latencyMs,
      downloadThroughput: THROTTLE.downBytesPerSec,
      uploadThroughput: THROTTLE.upBytesPerSec,
    });
    // data: URLs and long-lived channels are not the network, so neither counts nor holds a screen open
    const counted = new Map<string, boolean>();
    // a response the service worker or a cache answered cost the network nothing
    const cached = new Set<string>();
    cdp.on('Network.responseReceived', (e) => {
      if (e.response.fromServiceWorker || e.response.fromDiskCache || e.response.fromPrefetchCache)
        cached.add(e.requestId);
    });
    cdp.on('Network.requestWillBeSent', (e) => {
      const ok = !e.request.url.startsWith('data:') && !['EventSource', 'WebSocket', 'Ping'].includes(e.type ?? '');
      counted.set(e.requestId, ok);
      if (ok) p.inflight.add(e.requestId);
    });
    cdp.on('Network.loadingFinished', (e) => {
      if (!counted.get(e.requestId)) return;
      p.inflight.delete(e.requestId);
      p.lastNetwork = Date.now();
      p.fetched.push({ at: p.lastNetwork, bytes: e.encodedDataLength, network: !cached.has(e.requestId) });
    });
    cdp.on('Network.loadingFailed', (e) => {
      p.inflight.delete(e.requestId);
      p.lastNetwork = Date.now();
    });
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') p.consoleCount += 1;
    });
    page.on('pageerror', () => (p.consoleCount += 1));
    await page.exposeFunction('__qaTap', (id: string, start: number, now: number) => p.tapped(id, start, now));
    await page.addInitScript(pageProbe);
    if (p.film) {
      cdp.on('Page.screencastFrame', (f) => {
        void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
        p.framed({ at: f.metadata.timestamp! * 1000, data: f.data });
      });
      await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    }
    // the page's own state, kept as it is polled: a document that is replaced takes its numbers with it
    p.timer = setInterval(() => void p.read(), 200);
    return p;
  }

  private tapped(doc: string, start: number, now: number) {
    // the call came a moment after the tap, which `now - start` says
    const at = Date.now() - (now - start);
    // the frame before the tap shows what it started from, however long ago that was
    const before = this.recent.filter((f) => f.at <= at).at(-1);
    const frames = this.recent.filter((f) => f.at > at - 300 && f !== before);
    this.taps.push({ doc, start, at, frames: before ? [before, ...frames] : frames });
  }

  private framed(f: Frame) {
    this.recent.push(f);
    // two seconds back are kept, and always the newest, which a still screen may not replace for long
    const cut = f.at - 2000;
    while (this.recent.length > 1 && this.recent[0]!.at < cut) this.recent.shift();
    for (const t of this.taps) if (f.at <= t.at + FRAME_EVERY_MS * (FRAME_COUNT - 1) + 100) t.frames.push(f);
  }

  /** Takes the page's numbers into this side; a page that is navigating is skipped. */
  private async read() {
    if (this.polling || this.page.isClosed()) return;
    this.polling = true;
    try {
      // only what is new since the last read of this document, so a read costs the page next to nothing
      const last = this.current ? this.docs.get(this.current) : undefined;
      const from = last
        ? {
            id: last.state.id,
            l: last.state.longTasks.length,
            s: last.state.shifts.length,
            e: last.state.events.length,
          }
        : { id: '', l: 0, s: 0, e: 0 };
      const sent = Date.now();
      const r = await this.page.evaluate((f) => {
        const q = (window as unknown as { __qa?: PageState & { flush: () => void; now: () => number } }).__qa;
        if (!q) return undefined;
        q.flush();
        const same = q.id === f.id;
        return {
          id: q.id,
          longTasks: q.longTasks.slice(same ? f.l : 0),
          shifts: q.shifts.slice(same ? f.s : 0),
          events: q.events.slice(same ? f.e : 0),
          taps: q.taps,
          lastMutation: q.lastMutation,
          now: q.now(),
        };
      }, from);
      if (!r) return;
      // the document began `now` ago, as of the middle of the round trip
      const origin = (sent + Date.now()) / 2 - r.now;
      const had = this.docs.get(r.id);
      const state: PageState = had
        ? {
            id: r.id,
            longTasks: [...had.state.longTasks, ...r.longTasks],
            shifts: [...had.state.shifts, ...r.shifts],
            events: [...had.state.events, ...r.events],
            taps: r.taps,
            lastMutation: r.lastMutation,
          }
        : {
            id: r.id,
            longTasks: r.longTasks,
            shifts: r.shifts,
            events: r.events,
            taps: r.taps,
            lastMutation: r.lastMutation,
          };
      this.docs.set(r.id, { state, origin });
      this.current = r.id;
    } catch {
      // the page navigated under it, or is closing
    } finally {
      this.polling = false;
    }
  }

  /** Waits until nothing has changed or been fetched for QUIET_MS; returns the epoch ms of the last change. */
  private async quiet(since: number, cap: number) {
    for (;;) {
      await this.read();
      const now = Date.now();
      const last = Math.max(
        since,
        this.lastNetwork,
        ...[...this.docs.values()].map((d) => d.origin + d.state.lastMutation),
      );
      const busy = this.inflight.size > 0;
      if (now - since >= cap) return { last: since + cap, capped: true };
      if (!busy && now - last >= QUIET_MS) return { last, capped: false };
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** A screen, once it has loaded: how it settled and what it cost. */
  async screen(): Promise<ScreenSample> {
    // the page that has loaded began when it was navigated to: the newest document
    await this.read();
    const doc = [...this.docs.values()].sort((a, b) => a.origin - b.origin).at(-1);
    const origin = doc?.origin ?? Date.now();
    const { last } = await this.quiet(origin, CAP_MS);
    // the live heap, not what is waiting to be collected
    await this.cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const heap = await this.cdp.send('Runtime.getHeapUsage').catch(() => ({ usedSize: 0 }));
    await this.read();
    const s = this.docs.get(doc?.state.id ?? '')?.state;
    return {
      settleMs: Math.round(Math.min(Math.max(0, last - origin), CAP_MS)),
      requests: this.fetched.filter((f) => f.network).length,
      bytes: this.fetched.filter((f) => f.network).reduce((n, f) => n + f.bytes, 0),
      blockingMs: Math.round((s?.longTasks ?? []).reduce((n, d) => n + Math.max(0, d - 50), 0)),
      heapBytes: heap.usedSize,
      layoutShift: Math.round((s?.shifts ?? []).reduce((n, v) => n + v, 0) * 1000) / 1000,
      console: this.consoleCount,
    };
  }

  /** Every tap so far, once the last has settled: the time to its first change, to its settling, and its bytes. */
  async steps(): Promise<StepSample[]> {
    const lastTap = this.taps.at(-1)?.at;
    if (lastTap !== undefined) await this.quiet(lastTap, CAP_MS);
    await this.read();
    const docs = [...this.docs.values()].sort((a, b) => a.origin - b.origin);
    const taps = [...this.taps].sort((a, b) => a.at - b.at);
    return taps.map((t, i) => {
      // a tap's story ends at the next tap, or at the next page load, which the journey's own `go` starts
      const nextTap = taps[i + 1]?.at ?? Infinity;
      const nextDoc = docs.find((d) => d.origin > t.at)?.origin ?? Infinity;
      const end = Math.min(nextTap, nextDoc);
      const own = this.docs.get(t.doc)?.state;
      const originOfOwn = this.docs.get(t.doc)?.origin ?? t.at - t.start;
      const mine = own?.taps.find((x) => x.start === t.start);
      // Event Timing, as INP measures an interaction: the longest of the entries that share its id. A
      // tap quicker than the API's 16 ms floor leaves none, and counts as the floor.
      const first = own?.events.find((e) => e.id > 0 && Math.abs(e.start - t.start) < 1);
      const group = first ? own!.events.filter((e) => e.id === first.id) : [];
      const firstChange = group.length ? Math.max(...group.map((e) => e.duration)) : 16;
      const inWindow = this.fetched.filter((f) => f.at >= t.at && f.at < end);
      const overNetwork = inWindow.filter((f) => f.network);
      const last = Math.max(t.at, mine ? originOfOwn + mine.lastMutation : t.at, ...inWindow.map((f) => f.at));
      return {
        n: i + 1,
        firstChangeMs: Math.round(firstChange),
        settleMs: Math.round(Math.min(Math.max(0, Math.min(last, end) - t.at), CAP_MS)),
        bytes: overNetwork.reduce((n, f) => n + f.bytes, 0),
      };
    });
  }

  /** One PNG per tap in `dir`: the frames the screen showed from the tap to a second after, side by side. */
  async filmstrips(dir: string) {
    if (!this.film) return;
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    const taps = [...this.taps].sort((a, b) => a.at - b.at);
    // every frame at a third of the phone's size in CSS px, whatever size the screencast sent it at
    const view = this.page.viewportSize() ?? { width: 390, height: 844 };
    const w = Math.round(view.width / FILM_SCALE);
    const h = Math.round(view.height / FILM_SCALE);
    const decoded = new Map<Frame, PNG>();
    const small = (f: Frame) => {
      let p = decoded.get(f);
      if (!p) decoded.set(f, (p = resample(PNG.sync.read(Buffer.from(f.data, 'base64')), w, h)));
      return p;
    };
    taps.forEach((t, i) => {
      const frames = [...t.frames].sort((a, b) => a.at - b.at);
      if (!frames.length) return;
      mkdirSync(dir, { recursive: true });
      // what the screen showed at each mark: the latest frame at or before it
      const picks = Array.from({ length: FRAME_COUNT }, (_, k) => {
        const mark = t.at + k * FRAME_EVERY_MS;
        return frames.filter((f) => f.at <= mark).at(-1) ?? frames[0]!;
      }).map(small);
      writeFileSync(join(dir, `${i + 1}.png`), PNG.sync.write(sheet(picks)));
    });
  }

  async stop() {
    clearInterval(this.timer);
    await this.cdp.detach().catch(() => {});
  }
}

/** `img` as `w`×`h`, each pixel the average of the block it covers; the screencast's frames come in more than one size. */
function resample(img: PNG, w: number, h: number) {
  const out = new PNG({ width: w, height: h });
  const sx = img.width / w;
  const sy = img.height / h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      const sum = [0, 0, 0, 0];
      for (let yy = y0; yy < y1 && yy < img.height; yy++)
        for (let xx = x0; xx < x1 && xx < img.width; xx++)
          for (let c = 0; c < 4; c++) sum[c]! += img.data[(yy * img.width + xx) * 4 + c]!;
      const n = (Math.min(y1, img.height) - y0) * (Math.min(x1, img.width) - x0) || 1;
      for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = Math.round(sum[c]! / n);
    }
  return out;
}

/** The frames side by side, in reading order, in two rows when one row would be wider than FILM_MAX_WIDTH. */
function sheet(frames: PNG[]) {
  const GAP = 4;
  const { width: w, height: h } = frames[0]!;
  const rows = frames.length * (w + GAP) > FILM_MAX_WIDTH ? 2 : 1;
  const cols = Math.ceil(frames.length / rows);
  const out = new PNG({ width: cols * (w + GAP) - GAP, height: rows * (h + GAP) - GAP });
  for (let i = 0; i < out.data.length; i += 4) out.data.set([96, 96, 96, 255], i);
  frames.forEach((f, i) => {
    const x = (i % cols) * (w + GAP);
    const y = Math.floor(i / cols) * (h + GAP);
    PNG.bitblt(f, out, 0, 0, Math.min(f.width, w), Math.min(f.height, h), x, y);
  });
  return out;
}

/* ---------- writing ------------------------------------------------------------------- */

/** Appends metrics to one of the run's JSONL files. */
export function record(file: 'screens.jsonl' | 'steps.jsonl', metrics: Metric[]) {
  if (!METRICS_DIR || !metrics.length) return;
  mkdirSync(METRICS_DIR, { recursive: true });
  appendFileSync(join(METRICS_DIR, file), metrics.map((m) => JSON.stringify(m)).join('\n') + '\n');
}

const SCREEN_METRICS: Record<keyof ScreenSample, MetricName> = {
  settleMs: 'screen.settleMs',
  requests: 'screen.requests',
  bytes: 'screen.bytes',
  blockingMs: 'screen.blockingMs',
  heapBytes: 'screen.heapBytes',
  layoutShift: 'screen.layoutShift',
  console: 'screen.console',
};

/** One open of a screen, as the metrics `qa/limits.ts` judges; qa-diff.mjs takes the median of the opens. */
export function screenMetrics(id: string, run: ScreenSample): Metric[] {
  return (Object.keys(SCREEN_METRICS) as (keyof ScreenSample)[]).map((k) => ({
    key: `screen:${id}`,
    metric: SCREEN_METRICS[k],
    value: Math.round(run[k] * 1000) / 1000,
    n: 1,
  }));
}

export function stepMetricsOf(title: string, steps: StepSample[]): Metric[] {
  return steps.flatMap((s) => {
    const key = `step:${title}/${s.n}`;
    return [
      { key, metric: 'step.firstChangeMs' as const, value: s.firstChangeMs, n: 1 },
      { key, metric: 'step.settleMs' as const, value: s.settleMs, n: 1 },
      { key, metric: 'step.bytes' as const, value: s.bytes, n: 1 },
    ];
  });
}

/**
 * Sen as a phone opens it after the first time: the service worker has the whole build cached. This visits
 * once, unthrottled and unmeasured, until the worker controls the page; what the measured visits then
 * fetch is what a visit costs beyond the cache. A build with no worker is measured as it is.
 */
export async function warmUp(page: Page) {
  await page.goto('/');
  await page
    .waitForFunction(() => !!navigator.serviceWorker?.controller, undefined, { timeout: 20_000 })
    .catch(() => {});
  // what the visit stored (the looks, the dev panel) is not the next page's
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // no storage to clear
    }
  });
}

/** A test title as a folder name. */
export const slug = (title: string) => title.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * Wires a spec file's tests (the journeys) to the metrics: each runs under the phone's throttling, and
 * every tap in it is recorded, as `step:<test title>/<n>`. With QA_FILMSTRIP also a filmstrip per tap,
 * in `<QA_FILMSTRIP>/<test title>/<n>.png`. Nothing happens unless QA_METRICS is set.
 */
export function stepMetrics(t: typeof baseTest) {
  if (!METRICS_DIR) return;
  const probes = new Map<Page, Probe>();
  t.beforeEach(async ({ page }, info) => {
    // throttled, a journey takes several times as long
    info.setTimeout(info.timeout * 3);
    await warmUp(page);
    probes.set(page, await Probe.start(page, { film: !!FILM_DIR }));
  });
  t.afterEach(async ({ page }, info) => {
    const probe = probes.get(page);
    probes.delete(page);
    if (!probe) return;
    try {
      const steps = await probe.steps();
      record('steps.jsonl', stepMetricsOf(info.title, steps));
      if (FILM_DIR) await probe.filmstrips(join(FILM_DIR, slug(info.title)));
    } finally {
      await probe.stop();
    }
  });
}
