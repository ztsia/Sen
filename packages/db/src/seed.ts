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
        `insert into user_settings (user_id, own_names, expected_payday) values ($1, $2, $3)
         on conflict (user_id) do update set own_names = excluded.own_names, expected_payday = excluded.expected_payday, updated_at = now()`,
        [p.id, p.ownNames, p.expectedPayday],
      );
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}
