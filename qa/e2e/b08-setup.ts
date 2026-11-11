import { createRequire } from 'node:module';
import { seedPreview, type PreviewPerson } from '@sen/db';

// QA B08: made-up people in sen_test, before the API takes sign-ins. Each flow gets someone fresh, so
// one flow's first run never leaks into another's.
type Client = Parameters<typeof seedPreview>[0] & {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<unknown>;
};
const all = { shell: true, capture: true, agent: true, splits: true, email: false, calendar: false, claims: false };
export const PEOPLE = {
  // capture on, first run not done: walked through /s/first-run with the simulator
  ming: { id: '5e15e15e-0b08-4000-8000-0000000a0001', email: 'qa.ming@example.com', name: 'Ming' },
  retry: { id: '5e15e15e-0b08-4000-8000-0000000a0002', email: 'qa.retry@example.com', name: 'Retry' },
  reload: { id: '5e15e15e-0b08-4000-8000-0000000a0003', email: 'qa.reload@example.com', name: 'Reload' },
  // capture off, not done: sent to the short first run anywhere (D146 (2))
  nocap: { id: '5e15e15e-0b08-4000-8000-0000000a0004', email: 'qa.nocap@example.com', name: 'Nocap' },
  nocap2: { id: '5e15e15e-0b08-4000-8000-0000000a0005', email: 'qa.nocap2@example.com', name: 'Nocap2' },
  other: { id: '5e15e15e-0b08-4000-8000-0000000a0006', email: 'qa.other@example.com', name: 'Other' },
  tz: { id: '5e15e15e-0b08-4000-8000-0000000a0007', email: 'qa.tz@example.com', name: 'Tz' },
  zero: { id: '5e15e15e-0b08-4000-8000-0000000a0009', email: 'qa.zero@example.com', name: 'Zero' },
  offline: { id: '5e15e15e-0b08-4000-8000-0000000a0008', email: 'qa.offline@example.com', name: 'Offline' },
} as const;
const NOCAP = new Set(['nocap', 'nocap2']);

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
  const c = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await c.connect();
  try {
    await c.query('truncate auth_verification, auth_rate_limit, auth_session');
    await seedPreview(c, people);
  } finally {
    await c.end();
  }
}
