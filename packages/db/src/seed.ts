import { dedupeKey, eventId } from './ids';
import type pg from 'pg';
import type { MemberSwitches } from '@sen/core/views';

const ALL_ON: MemberSwitches = {
  shell: true,
  capture: true,
  agent: true,
  splits: true,
  email: true,
  calendar: true,
  claims: true,
};

/**
 * Production's one seed (B05): the owner's account with the admin flag, from SEN_OWNER_EMAIL, when no
 * admin exists yet. Sign-up is off, so this is how the first person gets in; everyone after comes by
 * invitation (B38). Never makes an existing account the admin: once there's an admin, it does nothing.
 */
export async function seedOwner(client: pg.ClientBase, email: string): Promise<'created' | 'exists'> {
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error('SEN_OWNER_EMAIL is not an email address');
  const admin = await client.query('select 1 from user_access where is_admin limit 1');
  if (admin.rowCount) return 'exists';
  await client.query('begin');
  try {
    const user = await client.query<{ id: string }>(
      `insert into auth_user (id, name, email, email_verified) values (gen_random_uuid(), $1, $2, true)
       on conflict (email) do nothing returning id`,
      [address.split('@')[0], address],
    );
    if (!user.rowCount) throw new Error('SEN_OWNER_EMAIL already has an account that isn’t the admin; not changing it');
    const id = user.rows[0]!.id;
    // the owner's usage is their own bill: Unlimited, recorded as covered (D98)
    await client.query(
      `insert into user_access (user_id, is_admin, features, ai_unlimited) values ($1, true, $2, true)`,
      [id, ALL_ON],
    );
    await client.query('insert into user_settings (user_id) values ($1)', [id]);
    await client.query('commit');
    return 'created';
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

/** A preview's person, made up (B03's scenario), as the rows B05's tables hold. */
export interface PreviewPerson {
  id: string;
  name: string;
  email: string;
  admin: boolean;
  features: MemberSwitches;
  ownNames: string[];
  /** `last-working`, a day `1`–`31`, or null (user_settings.expected_payday). */
  expectedPayday: string | null;
  /** First run is finished (B08): someone who hasn't done it is sent to it. */
  setupDone: boolean;
  /** Their accounts and categories (B08), as the scenario has them; none before first run. */
  accounts: PreviewAccount[];
  categories: PreviewCategory[];
}

export interface PreviewAccount {
  id: string;
  name: string;
  kind: 'tracked' | 'elsewhere';
  package: string | null;
  label: string | null;
  /** Integer sen. */
  opening: number;
  openingAt: string;
}

export interface PreviewCategory {
  id: string;
  name: string;
  kind: 'spend' | 'income';
  meal: boolean;
  beverage: boolean;
  discretionary: boolean;
  system: 'salary' | 'cash' | 'unaccounted' | null;
}

/**
 * A preview's seed (B05): the made-up people, reset to the scenario on every preview deploy. Previews
 * share one database (sen-preview), never production's, and hold nothing else. Each later slice adds
 * its own tables' rows.
 */
export async function seedPreview(client: pg.ClientBase, people: PreviewPerson[]): Promise<void> {
  await client.query('begin');
  try {
    for (const p of people) {
      await client.query(
        `insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)
         on conflict (id) do update set name = excluded.name, email = excluded.email`,
        [p.id, p.name, p.email],
      );
      await client.query(
        `insert into user_access (user_id, is_admin, features) values ($1, $2, $3)
         on conflict (user_id) do update set is_admin = excluded.is_admin, features = excluded.features, updated_at = now()`,
        [p.id, p.admin, p.features],
      );
      await client.query(
        `insert into user_settings (user_id, own_names, expected_payday, setup_done_at) values ($1, $2, $3, $4)
         on conflict (user_id) do update set own_names = excluded.own_names, expected_payday = excluded.expected_payday,
           setup_done_at = excluded.setup_done_at, updated_at = now()`,
        [p.id, p.ownNames, p.expectedPayday, p.setupDone ? new Date() : null],
      );
      await seedLedger(client, p);
      if (p.features.capture) await seedCapture(client, p.id, new Date());
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

/** A preview person's accounts and categories (B08), reset to the scenario on every deploy. */
async function seedLedger(client: pg.ClientBase, p: PreviewPerson): Promise<void> {
  for (const t of ['transactions', 'account_names', 'accounts', 'categories'])
    await client.query(`delete from ${t} where user_id = $1`, [p.id]);
  for (const a of p.accounts)
    await client.query(
      `insert into accounts (id, user_id, name, kind, notifier_package, notifier_label, opening_balance, opening_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [a.id, p.id, a.name, a.kind, a.package, a.label, a.opening, a.openingAt],
    );
  for (const [i, c] of p.categories.entries())
    await client.query(
      `insert into categories (id, user_id, name, kind, is_meal, is_beverage, is_discretionary, system_key, position)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c.id, p.id, c.name, c.kind, c.meal, c.beverage, c.discretionary, c.system, i + 1],
    );
}

/** The made-up notifications a preview's *Captured on this phone* shows (B07), masked as the listener stores them. */
const PREVIEW_EVENTS = [
  {
    minutesAgo: 50,
    title: 'Payment successful',
    text: 'You have paid RM12.90 to ZUS COFFEE •••• on ••/••/•••• ••:••.',
  },
  { minutesAgo: 60 * 26, title: 'eWallet reload', text: 'RM50.00 has been reloaded into your eWallet.' },
  { minutesAgo: 60 * 50, title: 'Payment successful', text: 'You have paid RM8.50 to •-ELEVEN MALAYSIA.' },
];

/**
 * A preview person's capture, reset on every deploy (B07): Touch 'n Go chosen, three events with the
 * ids the shell would derive, and a heartbeat just now, so Home's warnings start quiet.
 */
async function seedCapture(client: pg.ClientBase, userId: string, now: Date): Promise<void> {
  const pkg = 'my.com.tngdigital.ewallet';
  for (const t of ['bank_events', 'capture_apps', 'device_heartbeats'])
    await client.query(`delete from ${t} where user_id = $1`, [userId]);
  await client.query(
    `insert into capture_apps (id, user_id, package, label, chosen_at) values (gen_random_uuid(), $1, $2, 'TNG eWallet', $3)`,
    [userId, pkg, now],
  );
  for (const [i, e] of PREVIEW_EVENTS.entries()) {
    const when = new Date(now.getTime() - e.minutesAgo * 60_000);
    const key = `0|${pkg}|${1000 + i}|null|10123`;
    const dedupe = dedupeKey(pkg, key, when.getTime(), e.title, e.text, null);
    await client.query(
      `insert into bank_events (id, user_id, package, channel_id, notification_key, posted_at, notified_at, title, text, dedupe_key)
       values ($1, $2, $3, 'payments', $4, $5, $5, $6, $7, $8)`,
      [eventId(userId, dedupe), userId, pkg, key, when, e.title, e.text, dedupe],
    );
  }
  await client.query(
    `insert into device_heartbeats (id, user_id, listener_connected, access, last_bank_event_at, app_version)
     values (gen_random_uuid(), $1, true, true, $2, 'preview')`,
    [userId, new Date(now.getTime() - PREVIEW_EVENTS[0]!.minutesAgo * 60_000)],
  );
}
