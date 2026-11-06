import { createRequire } from 'node:module';
import { seedPreview, type PreviewPerson } from '@sen/db';

// QA B08 run 2: made-up people, each fresh for one flow.
type Client = Parameters<typeof seedPreview>[0] & {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<unknown>;
};
const all = { shell: true, capture: true, agent: true, splits: true, email: false, calendar: false, claims: false };
export const DB = process.env.QA_DB ?? 'sen_test';
export const PEOPLE = {
  main: { id: '5e15e15e-0b08-4000-8000-0000000b0001', email: 'qa.r2main@example.com', name: 'Main' },
  early: { id: '5e15e15e-0b08-4000-8000-0000000b0002', email: 'qa.r2early@example.com', name: 'Early' },
  off: { id: '5e15e15e-0b08-4000-8000-0000000b0003', email: 'qa.r2off@example.com', name: 'Off' },
  nocap: { id: '5e15e15e-0b08-4000-8000-0000000b0004', email: 'qa.r2nocap@example.com', name: 'Nocap' },
  off5: { id: '5e15e15e-0b08-4000-8000-0000000b0005', email: 'qa.r2off5@example.com', name: 'Off5' },
} as const;
const NOCAP = new Set(['nocap']);

export default async function setup() {
  const pg = createRequire(createRequire(import.meta.url).resolve('@sen/db'))('pg') as {
    Client: new (o: { connectionString: string }) => Client;
  };
  const people: PreviewPerson[] = Object.entries(PEOPLE).map(([k, p]) => ({
    ...p,
    admin: false,
    features: { ...all, capture: !NOCAP.has(k), shell: !NOCAP.has(k) },
    ownNames: [],
    expectedPayday: null,
    setupDone: false,
    accounts: [],
    categories: [],
  }));
  const c = new pg.Client({ connectionString: `postgres://sen_owner@127.0.0.1:5432/${DB}` });
  await c.connect();
  try {
    await c.query('truncate auth_verification, auth_rate_limit, auth_session');
    await seedPreview(c, people);
  } finally {
    await c.end();
  }
}
