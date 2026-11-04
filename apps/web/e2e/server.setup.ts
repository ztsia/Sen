import { createRequire } from 'node:module';
import { seedPreview, type PreviewPerson } from '@sen/db';
import { weiMing } from '../src/data/fake/scenario';

type PreviewClient = Parameters<typeof seedPreview>[0] & {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<unknown>;
};

/** First run's made-up people, before they've finished it. */
export const FIRST_RUN = {
  capture: { id: '5e15e15e-0b08-4000-8000-0000000e2e01', email: 'hana@example.com' },
  noCapture: { id: '5e15e15e-0b08-4000-8000-0000000e2e02', email: 'aziz@example.com' },
} as const;

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
    // first run done, so sign-in lands on Home (B08); the journey here is sign-in's, not the ledger's
    setupDone: true,
    accounts: [],
    categories: [],
  };
  // first run's people (first-run.server.spec.ts): neither has finished it; one has capture, one hasn't
  const unfinished = (id: string, name: string, email: string, capture: boolean): PreviewPerson => ({
    id,
    name,
    email,
    admin: false,
    features: { shell: capture, capture, agent: false, splits: true, email: false, calendar: false, claims: false },
    ownNames: [],
    expectedPayday: null,
    setupDone: false,
    accounts: [],
    categories: [],
  });
  const client = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await client.connect();
  try {
    // a run leaves codes with their tries used, rate-limit counts and sessions behind; start each from none
    await client.query('truncate auth_verification, auth_rate_limit, auth_session');
    await seedPreview(client, [
      person,
      unfinished(FIRST_RUN.capture.id, 'Hana', FIRST_RUN.capture.email, true),
      unfinished(FIRST_RUN.noCapture.id, 'Aziz', FIRST_RUN.noCapture.email, false),
    ]);
  } finally {
    await client.end();
  }
}

/** One statement on sen_test as the owner, for a journey that changes a person's access. */
export async function ownerSql(text: string, params: unknown[] = []): Promise<void> {
  const pg = createRequire(createRequire(import.meta.url).resolve('@sen/db'))('pg') as {
    Client: new (o: { connectionString: string }) => {
      connect(): Promise<void>;
      end(): Promise<void>;
      query(sql: string, params: unknown[]): Promise<unknown>;
    };
  };
  const client = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await client.connect();
  try {
    await client.query(text, params);
  } finally {
    await client.end();
  }
}
