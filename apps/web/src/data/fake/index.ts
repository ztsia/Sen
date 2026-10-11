import type { Command, WriteResult } from '@sen/core/commands';
import { momentLabel } from '@/lib/dates';
import { rm } from './scenario';
import type { Backend } from '../backend';
import type { Db } from './db';
import { apply, matchesFor, spread } from './apply';
import { buildScenario, withOffline, type ScenarioId } from './variants';
import * as v from './views';

/**
 * The skeleton's backend (B03): the whole person in memory, in previews and the dev server only. It
 * behaves like the app will: a write applies at once (as the shell's outbox does), its rows wait
 * *Not synced yet* until a made-up sync a moment later, or until the connection is back, and every
 * write answers with Undo.
 */

export type ReadMode = 'normal' | 'loading' | 'error';

export interface FakeControls {
  /** Rebuilds the scenario: an edge state, empty, or offline (the dev panel's switches). */
  reset(scenario: ScenarioId, opts: { empty: boolean; offline: boolean }): void;
  /** Loading never answers; error always fails, so each screen's states can be seen. */
  setReadMode(mode: ReadMode): void;
  setOffline(offline: boolean): void;
  /** For tests: the state as it is. */
  db(): Db;
}

const SYNC_MS = 1200;

/** A file's SHA-256, as hex: the same file twice is one receipt (§6.5), as `receipts.content_hash` will be. */
async function sha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** The first read of a screen takes a moment, so its skeleton shows; later reads answer at once. */
const FIRST_READ_MS = 250;

export function createFake(initial: ScenarioId = 'wei-ming'): Backend & FakeControls {
  let db = buildScenario(initial, false);
  let offline = false;
  let mode: ReadMode = 'normal';
  let firstRead = true;
  const snapshots = new Map<string, Db>();
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((l) => l());

  const read = <T>(fn: (d: Db) => T): Promise<T> => {
    if (mode === 'loading') return new Promise<T>(() => {});
    if (mode === 'error') return Promise.reject(new Error("Sen couldn't load this."));
    const delay = firstRead ? FIRST_READ_MS : 0;
    firstRead = false;
    return new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(fn(db));
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }, delay),
    );
  };
  const env = () => ({ offline });

  /** The made-up sync: online, the outbox empties a moment after each write (§5). */
  const sync = () => {
    if (offline) return;
    const ids = Object.keys(db.unsynced);
    if (!ids.length) return;
    setTimeout(() => {
      if (offline) return;
      for (const id of ids) delete db.unsynced[id];
      changed();
    }, SYNC_MS);
  };

  const run = async (cmd: Command): Promise<WriteResult> => {
    if (cmd.type === 'undo') {
      const before = snapshots.get(cmd.token);
      if (!before) return { said: 'Nothing to undo', undo: null };
      snapshots.delete(cmd.token);
      db = before;
      changed();
      return { said: 'Undone', undo: null };
    }
    const before = structuredClone(db);
    const { said, touched } = apply(db, cmd);
    const since = new Date().toISOString();
    for (const id of touched) db.unsynced[id] = since;
    const token = crypto.randomUUID();
    snapshots.set(token, before);
    changed();
    sync();
    return { said, undo: { type: 'undo', token } };
  };

  const draftFor = (
    file: File | null,
    forTxnId: string | null,
    byHand: boolean,
    contentHash: string | null,
  ): string => {
    const id = crypto.randomUUID();
    const now = new Date(Date.parse(db.now)).toISOString();
    const name = file?.name.toLowerCase() ?? '';
    const meals = db.categories.find((c) => c.name === 'Meals')?.id ?? null;
    const forTxn = forTxnId ? db.txns.find((t) => t.id === forTxnId) : undefined;
    if (byHand) {
      db.drafts.push({
        id,
        contentHash: null,
        status: 'read',
        byHand: true,
        merchant: forTxn?.merchantRaw ?? '',
        occurredAt: forTxn?.occurredAt ?? db.now,
        items: [],
        subtotal: 0,
        tax: 0,
        service: 0,
        total: forTxn?.amount ?? 0,
        pax: 1,
        note: null,
        forTxnId,
      });
      return id;
    }
    // what the reader returns, a moment later; a name with "nomatch" or "blur" picks the other cases
    const printed: [string, string, boolean][] = name.includes('nomatch')
      ? [
          ['Kopi O kosong', '2.40', false],
          ['Kaya toast set', '7.90', false],
          ['Half-boiled eggs', '4.50', false],
        ]
      : [
          ['Sate ayam (20)', '26.00', false],
          ['Sate daging (10)', '15.00', false],
          ['Nasi impit', '4.50', true],
          ['Teh o ais (3)', '8.40', false],
          ['Kuah kacang (extra)', '2.20', false],
        ];
    const amounts = printed.map(([, a]) => rm(a));
    const subtotal = amounts.reduce((a, b) => a + b, 0);
    const total = name.includes('nomatch') ? rm('14.80') : rm('64.13');
    const service = name.includes('nomatch') ? 0 : rm('5.61');
    const prices = spread(amounts, total);
    db.drafts.push({
      id,
      contentHash,
      status: 'reading',
      byHand: false,
      merchant: name.includes('nomatch') ? 'KOPITIAM SRI DAMAI' : 'SATE KAJANG HJ SAMURI',
      occurredAt: forTxn?.occurredAt ?? now,
      items: printed.map(([description, , doubtful], i) => ({
        id: crypto.randomUUID(),
        description,
        qty: 1,
        amount: amounts[i]!,
        price: prices[i]!,
        categoryId: meals,
        doubtful,
      })),
      subtotal,
      tax: total - subtotal - service,
      service,
      total,
      pax: 1,
      note: null,
      forTxnId,
    });
    setTimeout(() => {
      const d = db.drafts.find((x) => x.id === id);
      if (!d) return;
      d.status = name.includes('blur') || db.aiPausedUntil ? 'failed' : 'read';
      changed();
    }, 1800);
    return id;
  };

  return {
    home: () => read(v.home),
    cycle: (id) => read((d) => v.cycleSheet(d, id)),
    review: () => read(v.review),
    skipped: () => read(v.skipped),
    payments: (f) => read((d) => v.payments(d, env(), f)),
    txn: (id) => read((d) => v.txnView(d, env(), id)),
    receipt: (id) => read((d) => v.receiptView(d, id)),
    insights: (id) => read((d) => v.insights(d, id)),
    budgets: (id) => read((d) => v.budgets(d, id)),
    subscriptions: () => read(v.subscriptions),
    goals: () => read(v.goalsView),
    goal: (id) => read((d) => v.goalView(d, id)),
    year: (y) => read((d) => v.year(d, y)),
    me: () => read(v.me),
    categories: (kind) => read((d) => v.categoryChoices(d, kind)),
    accounts: () => read(v.accountChoices),
    upload: async (file, forTxnId) => draftFor(file, forTxnId, false, file ? await sha256(file) : null),
    byHand: (forTxnId) => Promise.resolve(draftFor(null, forTxnId, true, null)),
    draft: (id) => read((d) => structuredClone(d.drafts.find((x) => x.id === id) ?? null)),
    matches: (total, at) => read((d) => matchesFor(d, total, at)),
    nearDuplicate: (amount, at) =>
      read((d) => {
        const t0 = Date.parse(at);
        const t = d.txns.find(
          (x) =>
            !x.deletedAt &&
            x.amount === amount &&
            x.source === 'notification' &&
            Math.abs(Date.parse(x.occurredAt) - t0) < 2 * 3_600_000,
        );
        return t ? `${t.merchantRaw ?? 'A payment'}, ${momentLabel(new Date(t.occurredAt), new Date(d.now))}` : null;
      }),
    run,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset: (scenario, opts) => {
      db = buildScenario(scenario, opts.empty);
      offline = opts.offline;
      if (opts.offline) db = withOffline(db);
      snapshots.clear();
      firstRead = true;
      changed();
    },
    setReadMode: (m) => {
      mode = m;
      firstRead = true;
      changed();
    },
    setOffline: (o) => {
      offline = o;
      changed();
      sync();
    },
    db: () => db,
  };
}
