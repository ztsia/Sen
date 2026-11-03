import type { CaptureHealthView, CapturedView } from '@sen/core/sync';
import type { Db } from './db';

// The server's two capture reads, made up from the scenario (B07): `GET /captured` is the scenario's
// bank events, and `GET /capture/health` is healthy unless the scenario says capture stopped (its
// `health` warnings, from the `capture-off` and jobs-stopped variants).

const PAGE = 50;
const HOUR = 3_600_000;

export function capturedView(db: Db, before?: string): CapturedView {
  const all = db.events
    .filter((e) => before === undefined || Date.parse(e.postedAt) < Date.parse(before))
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  const page = all.slice(0, PAGE);
  return {
    events: page.map((e) => ({
      id: e.id,
      package: e.package,
      channelId: null,
      postedAt: new Date(e.postedAt).toISOString(),
      title: e.title,
      text: e.text,
      bigText: null,
      maybeOtp: false,
      parseStatus: e.parseStatus,
      synced: true,
    })),
    next: all.length > PAGE ? new Date(page.at(-1)!.postedAt).toISOString() : null,
  };
}

export function captureHealthView(db: Db): CaptureHealthView {
  const now = Date.parse(db.now);
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();
  const off = db.health.some((h) => h.key === 'capture-off');
  const late = db.health.some((h) => h.key === 'jobs-stopped');
  return {
    on: db.capture,
    lastBeatAt: at(1),
    listenerConnected: true,
    access: true,
    lastListenAt: at(1),
    lastEventAt: at(off ? 51 : 3),
    silent: off ? 'no-events' : null,
    morningAt: at(late ? 30 : 6),
    schedulerLate: late,
  };
}
