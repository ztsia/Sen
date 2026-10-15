import { createRequire } from 'node:module';
import { seedPreview, type PreviewPerson } from '@sen/db';
import { weiMing } from '../src/data/fake/scenario';

type PreviewClient = Parameters<typeof seedPreview>[0] & {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<unknown>;
};

/** Seeds Wei Ming into sen_test, as db-deploy.ts does for a preview, before the API starts taking sign-ins. */
export default async function setup() {
  // pg is @sen/db's dependency, not the web app's
  const pg = createRequire(createRequire(import.meta.url).resolve('@sen/db'))('pg') as {
    Client: new (o: { connectionString: string }) => PreviewClient;
  };
  const db = weiMing();
  const s = db.settings;
  const payday = s.you.payday;
  const person: PreviewPerson = {
    id: db.userId,
    name: 'Wei Ming',
    email: s.email,
    admin: s.admin,
    features: {
      shell: true,
      capture: db.capture,
      agent: db.agent,
      splits: true,
      email: true,
      calendar: true,
      claims: db.claims,
    },
    ownNames: s.you.bankNames,
    expectedPayday: payday.kind === 'day' ? String(payday.day) : payday.kind === 'last-working' ? 'last-working' : null,
  };
  const client = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await client.connect();
  try {
    // a run leaves codes with their tries used, rate-limit counts and sessions behind; start each from none
    await client.query('truncate auth_verification, auth_rate_limit, auth_session');
    await seedPreview(client, [person]);
  } finally {
    await client.end();
  }
}
