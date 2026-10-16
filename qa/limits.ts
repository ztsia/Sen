/**
 * How QA judges what the runs measure (D139). Every number is what a person waits or a phone pays,
 * never a cause: no check says "the function is in sin1" or "file X under N KB". A number is flagged
 * two ways:
 *   - it breaks a human limit that main keeps (`HUMAN`)
 *   - it is worse than main's by more than `WORSE` and more than its unit's floor, so noise doesn't flag
 * A human limit main breaks too is *standing*: listed, never a flag, so it's explained once, not every
 * run. A flag never fails CI, because timings vary; the reviewer explains each one in the ledger.
 *
 * Imported by scripts/qa-diff.mjs and scripts/live-metrics.mjs (Node strips the types) and by the
 * Playwright collectors, so it stays plain: no enums, no imports.
 */

/** What a metric counts, which sets its noise floor. */
export type Unit = 'ms' | 'bytes' | 'count' | 'score';

/** One measurement. `key` says where (a screen, a journey step, a route); `metric` says what. */
export interface Metric {
  /** The source and the thing measured: `screen:home--default`, `step:capture/2`, `api:POST /api/commands 200`. */
  key: string;
  /** One of `METRICS`' names. */
  metric: MetricName;
  value: number;
  /** How many samples the value is the median of. */
  n?: number;
}

/** Every metric the runs record, with its unit and, where a person would notice, its human limit. */
export const METRICS = {
  // a catalogue entry, opened cold with the CPU 4× slower on a mobile network (e2e/metrics.ts)
  'screen.settleMs': { unit: 'ms', human: 1000, says: 'opened until it stopped changing' },
  'screen.requests': { unit: 'count', says: 'requests to open it' },
  'screen.bytes': { unit: 'bytes', says: 'bytes over the network to open it' },
  'screen.blockingMs': { unit: 'ms', human: 200, says: 'main thread blocked past 50 ms per task' },
  'screen.heapBytes': { unit: 'bytes', says: 'JS heap once settled' },
  'screen.layoutShift': { unit: 'score', human: 0.1, says: 'layout shift while opening' },
  'screen.console': { unit: 'count', human: 0, says: 'console errors and warnings' },
  // a journey step: a tap and what it caused, same throttling
  'step.firstChangeMs': { unit: 'ms', human: 100, says: 'tap until the first frame that answers it' },
  'step.settleMs': { unit: 'ms', human: 1000, says: 'tap until it stopped changing' },
  'step.bytes': { unit: 'bytes', says: 'bytes over the network the step caused' },
  // the API, from its tests (Server-Timing) and the live preview
  'api.serverMs': { unit: 'ms', human: 300, says: 'time inside the server' },
  'api.dbMs': { unit: 'ms', says: 'time waiting on the database' },
  'api.queries': { unit: 'count', says: 'database round trips' },
  'api.rows': { unit: 'count', says: 'rows the database returned or wrote' },
  'api.bytes': { unit: 'bytes', says: 'response body' },
  'live.totalMs': { unit: 'ms', says: 'request until response, from the runner' },
  // the build, and a phone moving from one build to the next (lived-in deploy journey)
  'build.installBytes': { unit: 'bytes', says: 'a first install downloads (gzip)' },
  'build.firstScreenJsBytes': { unit: 'bytes', says: 'JS before the first screen (gzip)' },
  'build.chunkBytes': { unit: 'bytes', says: 'one chunk (gzip)' },
  'deploy.updateBytes': { unit: 'bytes', human: 1_000_000, says: 'a phone downloads to update' },
  'deploy.updateMs': { unit: 'ms', human: 60_000, says: 'deploy until the open app runs it' },
} as const satisfies Record<string, { unit: Unit; human?: number; says: string }>;

export type MetricName = keyof typeof METRICS;

/** Worse than main by more than this ratio *and* more than the unit's floor flags. */
export const WORSE = 1.25;
export const FLOOR: Record<Unit, number> = { ms: 100, bytes: 20_000, count: 3, score: 0.05 };

export type Verdict =
  /** breaks a human limit main keeps, or main has no such number */
  | { kind: 'over'; limit: number }
  /** worse than main beyond the ratio and floor */
  | { kind: 'worse'; base: number }
  /** breaks a human limit main breaks too: listed, not flagged */
  | { kind: 'standing'; limit: number; base: number }
  | { kind: 'ok' };

/** Judges one number on this branch against its human limit and main's number, if main has one. */
export function judge(metric: MetricName, head: number, base?: number): Verdict {
  const { unit } = METRICS[metric];
  const human = 'human' in METRICS[metric] ? (METRICS[metric] as { human: number }).human : undefined;
  if (human !== undefined && head > human) {
    if (base !== undefined && base > human && !worse(unit, head, base)) return { kind: 'standing', limit: human, base };
    return { kind: 'over', limit: human };
  }
  if (base !== undefined && worse(unit, head, base)) return { kind: 'worse', base };
  return { kind: 'ok' };
}

const worse = (unit: Unit, head: number, base: number) => head > base * WORSE && head - base > FLOOR[unit];

/** A flagged or standing number, as the report lists it. */
export interface Judged extends Metric {
  base?: number;
  verdict: Verdict;
}

/** Judges a branch's metrics against main's, matching on key and metric. Flags first, then standing. */
export function judgeAll(head: Metric[], base: Metric[]): { flags: Judged[]; standing: Judged[]; ok: number } {
  const baseOf = new Map(base.map((m) => [`${m.key}|${m.metric}`, m.value]));
  const flags: Judged[] = [];
  const standing: Judged[] = [];
  let ok = 0;
  for (const m of head) {
    const b = baseOf.get(`${m.key}|${m.metric}`);
    const verdict = judge(m.metric, m.value, b);
    const j: Judged = { ...m, ...(b === undefined ? {} : { base: b }), verdict };
    if (verdict.kind === 'over' || verdict.kind === 'worse') flags.push(j);
    else if (verdict.kind === 'standing') standing.push(j);
    else ok++;
  }
  return { flags, standing, ok };
}

/** The median of some samples: the value a metric records when a run repeats a measurement. */
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Reads the API's `Server-Timing` header (apps/api/src/timing.ts): `app;dur=41.2, db;dur=12.3,
 * db-queries;dur=4, db-rows;dur=7`. Numbers only, never data.
 */
export function serverTiming(header: string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of (header ?? '').split(',')) {
    const [name, ...params] = part.trim().split(';');
    const dur = params.map((p) => p.trim()).find((p) => p.startsWith('dur='));
    if (name && dur) out[name] = Number(dur.slice(4));
  }
  return out;
}

/** A request the API's tests made (apps/api/src/timing.ts' `Timed`). */
export interface ApiRecord {
  method: string;
  route: string;
  status: number;
  appMs: number;
  dbMs: number;
  queries: number;
  rows: number;
  bytes: number;
}

/** The API's records as metrics: the median of each, per route and status (`api:POST /api/commands 200`). */
export function apiMetrics(records: ApiRecord[]): Metric[] {
  const by = new Map<string, ApiRecord[]>();
  for (const r of records) {
    const key = `api:${r.method} ${r.route} ${r.status}`;
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  const out: Metric[] = [];
  for (const [key, rs] of [...by].sort(([a], [b]) => a.localeCompare(b))) {
    const m = (metric: MetricName, f: (r: ApiRecord) => number) =>
      out.push({ key, metric, value: Math.round(median(rs.map(f)) * 10) / 10, n: rs.length });
    m('api.serverMs', (r) => r.appMs);
    m('api.dbMs', (r) => r.dbMs);
    m('api.queries', (r) => r.queries);
    m('api.rows', (r) => r.rows);
    m('api.bytes', (r) => r.bytes);
  }
  return out;
}
