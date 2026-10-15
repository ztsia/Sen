import { execFileSync } from 'node:child_process';

/** QA's database (sen_qa): the made-up QA people, and no sessions, codes or rate-limit counts left over. */
export const QA_DB = 'postgres://sen_owner@127.0.0.1:5432/sen_qa';

export const sql = (q: string): string =>
  execFileSync('psql', ['-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', QA_DB, '-c', q], { encoding: 'utf8' }).trim();

export const PEOPLE = {
  admin: { id: '00000000-0000-4000-8000-00000000000a', email: 'qa-admin@example.com' },
  ben: { id: '00000000-0000-4000-8000-00000000000b', email: 'qa-ben@example.com' },
  chong: { id: '00000000-0000-4000-8000-00000000000c', email: 'qa-chong@example.com' },
};

/** Clears what one test leaves for the next: codes, rate-limit counts, sessions. */
export const fresh = () => sql('truncate auth_verification, auth_rate_limit, auth_session');

export default function setup() {
  sql(`insert into auth_user (id, name, email, email_verified) values
    ('${PEOPLE.admin.id}', 'Qa Admin', '${PEOPLE.admin.email}', true),
    ('${PEOPLE.ben.id}', 'Qa Ben', '${PEOPLE.ben.email}', true),
    ('${PEOPLE.chong.id}', 'Qa Chong', '${PEOPLE.chong.email}', true)
    on conflict (id) do nothing`);
  sql(`insert into user_access (user_id, is_admin, features) values
    ('${PEOPLE.admin.id}', true, '{"shell":true,"capture":true,"agent":true,"splits":true,"email":true,"calendar":true,"claims":true}'),
    ('${PEOPLE.ben.id}', false, '{"agent":true}')
    on conflict (user_id) do nothing`);
  fresh();
}
