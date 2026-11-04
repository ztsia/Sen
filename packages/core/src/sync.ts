import { z } from 'zod';
import { Command } from './commands';
import { Id, Instant } from './schema';

/**
 * The outbox's sync (B07, spec §5, §6.2, §16 `/sync`): what the shell sends and what it gets back.
 * Every item carries its id, made or derived on the phone, so the whole batch is idempotent: sending
 * it again changes nothing. The Kotlin side writes the same shapes (apps/shell/…/sync/SyncClient.kt).
 */

const Text = (max: number) => z.string().max(max).nullable();
/** An Android package name. */
const Package = z
  .string()
  .min(1)
  .max(255)
  .refine((p) => {
    const parts = p.split('.');
    return parts.length >= 2 && /^[A-Za-z]/.test(p) && parts.every((x) => /^[A-Za-z0-9_]+$/.test(x));
  }, 'an Android package name');

/** A captured notification, raw and masked as the listener stored it (§6.2, D121). */
export const SyncEvent = z.object({
  /** UUIDv5 of the person and the dedupe key (packages/db/src/ids.ts); the server checks it. */
  id: Id,
  package: Package,
  channelId: Text(255),
  notificationKey: z.string().min(1).max(1024),
  postedAt: Instant,
  /** The app's own `when`, which the dedupe key hashes (in milliseconds). */
  notifiedAt: Instant,
  title: Text(4000),
  text: Text(8000),
  bigText: Text(16000),
  maybeOtp: z.boolean(),
  dedupeKey: z.string().regex(/^[0-9a-f]{64}$/),
});
export type SyncEvent = z.infer<typeof SyncEvent>;

/** A field-level edit (§5): only the fields it names change. Today, a bank event's status. */
export const SyncEdit = z.object({
  /** The edit's own id, so a retry is recognised. */
  id: Id,
  kind: z.literal('bank_event'),
  rowId: Id,
  fields: z
    .object({
      parse_status: z.enum(['parsed', 'ignored', 'skipped', 'unparsed', 'dismissed']),
      parsed_by: Id.nullable(),
      parsed: z.record(z.string(), z.unknown()).nullable(),
    })
    .partial()
    .strict()
    .refine((f) => Object.keys(f).length > 0, 'an edit names a field'),
});
export type SyncEdit = z.infer<typeof SyncEdit>;

/** A choice in the app picker (D86): chosen, or removed with its tombstone's time. */
export const SyncCaptureApp = z.object({
  id: Id,
  package: Package,
  label: z.string().min(1).max(200),
  chosenAt: Instant,
  deletedAt: Instant.nullable(),
});
export type SyncCaptureApp = z.infer<typeof SyncCaptureApp>;

/** A write the web app made in the shell (§5 *Writes*), with the id it was made with. */
export const SyncCommand = z.object({ id: Id, command: Command, madeAt: Instant });
export type SyncCommand = z.infer<typeof SyncCommand>;

/** The shell's heartbeat (§6.2 *Health*), on every sync. */
export const SyncHeartbeat = z.object({
  id: Id,
  listenerConnected: z.boolean(),
  access: z.boolean(),
  lastBankEventAt: Instant.nullable(),
  appVersion: z.string().min(1).max(64),
});
export type SyncHeartbeat = z.infer<typeof SyncHeartbeat>;

/** One batch. The shell sends at most these many of each; the rest go in the next batch. */
export const SYNC_LIMITS = { events: 100, edits: 100, captureApps: 100, commands: 50 } as const;

export const SyncRequest = z
  .object({
    events: z.array(SyncEvent).max(SYNC_LIMITS.events).default([]),
    edits: z.array(SyncEdit).max(SYNC_LIMITS.edits).default([]),
    captureApps: z.array(SyncCaptureApp).max(SYNC_LIMITS.captureApps).default([]),
    commands: z.array(SyncCommand).max(SYNC_LIMITS.commands).default([]),
    heartbeat: SyncHeartbeat.nullable().default(null),
  })
  .strict();
export type SyncRequest = z.infer<typeof SyncRequest>;

/** What became of one command: applied now, applied by an earlier try, or refused (and why, in words). */
export const CommandOutcome = z.object({
  id: Id,
  status: z.enum(['applied', 'already', 'refused']),
  said: z.string(),
});

/** An item the server won't take, ever, and why: the shell stops sending it and keeps it, marked. */
export const Refused = z.object({ id: z.string(), reason: z.string() });

export const SyncResult = z.object({
  /** Every id the server now holds, new or known: the shell marks each synced. */
  synced: z.object({
    events: z.array(Id),
    edits: z.array(Id),
    captureApps: z.array(Id),
    commands: z.array(CommandOutcome),
  }),
  /**
   * Items checked one by one, so one bad item never blocks the outbox: an event whose id or dedupe
   * key doesn't match its text, an edit of an event the server doesn't have, anything malformed.
   */
  refused: z.object({ events: z.array(Refused), edits: z.array(Refused), captureApps: z.array(Refused) }),
  /** The person's *Capture* switch (D98): off, the shell unbinds its listener. */
  capture: z.boolean(),
  /** When this person's morning job last ran (§18): over 26 hours ago, the shell warns. */
  morningAt: Instant.nullable(),
  /** The server's clock, so the shell's check doesn't trust its own. */
  now: Instant,
});
export type SyncResult = z.infer<typeof SyncResult>;

/** What the phone keeps offline, pulled down by version (§5). Later slices add their kinds. */
export const SyncChanges = z.object({
  /** Pass this as `since` next time. */
  version: z.number().int().nonnegative(),
  /** More changes wait: ask again from `version`. */
  more: z.boolean(),
  captureApps: z.array(SyncCaptureApp),
});
export type SyncChanges = z.infer<typeof SyncChanges>;

/** The error code `/sync` answers with a bank event while the *Capture* switch is off (§9.6). */
export const CAPTURE_OFF = 'capture_off';

/** Capture's health, as Home warns of it (§6.2 *Health*, §18). */
export const CaptureHealthView = z.object({
  /** The *Capture* switch. Off, nothing below is shown. */
  on: z.boolean(),
  /** The newest heartbeat's facts, or null before the shell has ever synced. */
  lastBeatAt: Instant.nullable(),
  listenerConnected: z.boolean().nullable(),
  access: z.boolean().nullable(),
  lastEventAt: Instant.nullable(),
  /** The newest heartbeat with the listener connected and access granted: the listener's own. */
  lastListenAt: Instant.nullable(),
  /**
   * The watchdog's reading: the phone says notification access is off (`no-access`); the listener
   * hasn't been connected for 24 h (`no-heartbeat`); or no event for 48 h (`no-events`).
   */
  silent: z.enum(['no-access', 'no-heartbeat', 'no-events']).nullable(),
  /** The morning job's last run, and whether it's over 26 hours ago (§18). */
  morningAt: Instant.nullable(),
  schedulerLate: z.boolean(),
});
export type CaptureHealthView = z.infer<typeof CaptureHealthView>;

/** *Captured on this phone* (B07): the server's `bank_events`, raw and masked, newest first. */
export const CapturedEvent = z.object({
  id: Id,
  package: z.string(),
  channelId: z.string().nullable(),
  postedAt: Instant,
  title: z.string().nullable(),
  text: z.string().nullable(),
  bigText: z.string().nullable(),
  maybeOtp: z.boolean(),
  parseStatus: z.string(),
  /** False for one still in this phone's outbox (the shell's own copy). */
  synced: z.boolean(),
});
export type CapturedEvent = z.infer<typeof CapturedEvent>;

export const CapturedView = z.object({
  events: z.array(CapturedEvent),
  /** Pass as `before` for the next page (an opaque cursor); null at the end. */
  next: z.string().max(100).nullable(),
});
export type CapturedView = z.infer<typeof CapturedView>;

export const HEARTBEAT_SILENT_MS = 24 * 3_600_000;
export const EVENTS_SILENT_MS = 48 * 3_600_000;
export const SCHEDULER_LATE_MS = 26 * 3_600_000;
