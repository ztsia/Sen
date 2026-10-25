import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { Command, type WriteResult } from '@sen/core/commands';
import { MemberRow, type MeView, type SettingsCore } from '@sen/core/views';
import { schema } from '@sen/db';
import { audit } from './audit';
import { NO_SWITCHES, type Env } from './context';
import { ApiError, forbidden, notBuilt, parse, readJson } from './errors';
import { backupFacts, R2_ALLOWANCE_BYTES, R2_WARN_BYTES } from './jobs/frames';

const Payday = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('last-working') }),
  z.object({ kind: z.literal('day'), day: z.int().min(1).max(31) }),
  z.object({ kind: z.literal('none') }),
]);
type Payday = z.infer<typeof Payday>;

/** `user_settings.expected_payday` as the screens show it, and back. */
const toPayday = (v: string | null): Payday =>
  v === null
    ? { kind: 'none' }
    : v === 'last-working'
      ? { kind: 'last-working' }
      : { kind: 'day', day: z.coerce.number().int().parse(v) };
const fromPayday = (p: Payday): string | null => (p.kind === 'none' ? null : p.kind === 'day' ? String(p.day) : p.kind);

/** Names as banks print them, one to a line (the form sends text). */
const BankNames = z
  .string()
  .max(2000)
  .transform((s) =>
    s
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean),
  );

/** The routes every signed-in person has (spec §16): who they are, their settings, and commands. */
export function personRoutes() {
  const r = new Hono<Env>();

  r.get('/me', (c) => {
    const f = c.var.access.features;
    const me: MeView = { capture: f.capture, claims: f.claims, agent: f.agent, aiPausedUntil: null };
    return c.json(me);
  });

  r.get('/settings', async (c) => {
    const { person, access } = c.var;
    const { row, backups } = await c.var.db(async (db) => {
      const [s] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, person.id));
      // the backups are the admin's (job_runs, B06); everyone else has none to see
      return { row: s, backups: access.isAdmin ? await backupFacts(db, person.id, new Date()) : null };
    });
    const view: SettingsCore = {
      email: person.email,
      admin: access.isAdmin,
      switches: access.features,
      you: { bankNames: row?.ownNames ?? [], payday: toPayday(row?.expectedPayday ?? null), qr: false },
      data: {
        lastBackup: backups?.last?.at.toISOString() ?? null,
        exportReady: false,
        storage: backups ? { used: backups.heldBytes, allowance: R2_ALLOWANCE_BYTES, warnAt: R2_WARN_BYTES } : null,
      },
    };
    return c.json(view);
  });

  /**
   * Every change, as a command (`@sen/core/commands`). B05 carries the commands whose tables exist:
   * *You*'s names and payday. The admin's `member.*` refuse everyone else; the rest answer *not built*
   * until their slice.
   */
  r.post('/commands', async (c) => {
    const cmd = parse(Command, await readJson(c));
    if (cmd.type.startsWith('member.')) {
      if (!c.var.access.isAdmin) throw forbidden();
      throw notBuilt('B38');
    }
    if (cmd.type !== 'setting.set') throw notBuilt('a later slice');
    const result = await setYou(c.var, cmd.key, cmd.value);
    // the person's other open screens reload their settings (D100)
    await c.var.svc.relay.hint(c.var.person.id, ['settings']);
    return c.json(result);
  });

  return r;
}

/** `setting.set` for *You* (D17, D79): saved with its audit entry, and answered with its undo. */
async function setYou(v: Env['Variables'], key: string, value: unknown): Promise<WriteResult> {
  const person = v.person.id;
  const t = schema.userSettings;
  let patch: { ownNames: string[] } | { expectedPayday: string | null };
  let said: string;
  if (key === 'you.bankNames') {
    patch = { ownNames: parse(BankNames, value) };
    said = 'Names saved';
  } else if (key === 'you.payday') {
    patch = { expectedPayday: fromPayday(parse(Payday, value)) };
    said = 'Payday saved';
  } else throw notBuilt('a later slice');

  return v.db(async (db) => {
    // the row exists and is locked before the comparison, so two identical writes sent at once
    // are one change and one audit entry (QA B05 run 2, 22)
    await db.insert(t).values({ userId: person }).onConflictDoNothing();
    const [before] = await db.select().from(t).where(eq(t.userId, person)).for('update');
    const undoValue =
      key === 'you.bankNames' ? (before?.ownNames ?? []).join('\n') : toPayday(before?.expectedPayday ?? null);
    const undo: Command = { type: 'setting.set', key, value: undoValue };
    // the same value again (a retry, a double tap) changes nothing and logs nothing (QA B05 run 1, 7)
    const same =
      'ownNames' in patch
        ? JSON.stringify(patch.ownNames) === JSON.stringify(before?.ownNames ?? [])
        : patch.expectedPayday === (before?.expectedPayday ?? null);
    if (same) return { said, undo };
    const [after] = await db
      .insert(t)
      .values({ userId: person, ...patch })
      .onConflictDoUpdate({ target: t.userId, set: { ...patch, updatedAt: sql`now()` } })
      .returning();
    if (!after) throw new ApiError(500, 'server', 'Your settings weren’t saved.');
    await audit(db, {
      userId: person,
      entity: 'user_settings',
      entityId: person,
      action: key,
      before,
      after,
      actor: 'user',
    });
    return { said, undo };
  });
}

/**
 * The admin's routes (D52): refused to everyone else here, and again in the database, where each
 * reads through a `SECURITY DEFINER` function that checks the flag itself. Only the database's check
 * counts; this one answers a member with a clear 403.
 */
export function adminRoutes() {
  const r = new Hono<Env>();
  r.use('*', async (c, next) => {
    if (!c.var.access.isAdmin) throw forbidden();
    await next();
  });
  r.get('/members', async (c) => {
    const rows = await c.var.db((db) =>
      db.execute<{
        id: string;
        name: string;
        email: string;
        is_admin: boolean;
        features: MemberRow['switches'];
        suspended_at: string | null;
      }>(sql`select * from admin_members()`),
    );
    const members: MemberRow[] = rows.rows.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      admin: m.is_admin,
      status: m.suspended_at ? 'suspended' : 'active',
      // all seven, as /settings has them: a switch never set is off (QA B05 run 1, 8)
      switches: { ...NO_SWITCHES, ...m.features },
    }));
    return c.json(members);
  });
  return r;
}
