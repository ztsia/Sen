import { execFileSync } from 'node:child_process';

/** QA's database for B06 (sen_qa): the QA people, a clean slate of job rows, no sessions or codes. */
export const QA_DB = 'postgres://sen_owner@127.0.0.1:5432/sen_qa';

// On the Windows laptop psql lives in the `senpg` container (docs/handoff.md); elsewhere it's on PATH
const PSQL: [string, string[]] =
  process.platform === 'win32' ? ['docker', ['exec', '-i', 'senpg', 'psql']] : ['psql', []];

export const sql = (q: string): string =>
  execFileSync(PSQL[0], [...PSQL[1], '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', QA_DB, '-c', q], {
    encoding: 'utf8',
  }).trim();

export const PEOPLE = {
  admin: { id: '00000000-0000-4000-8000-00000000000a', email: 'qa-admin@example.com' },
  ben: { id: '00000000-0000-4000-8000-00000000000b', email: 'qa-ben@example.com' },
};

export const fresh = () => sql('truncate auth_verification, auth_rate_limit, auth_session');

export default function setup() {
  sql(`insert into auth_user (id, name, email, email_verified) values
    ('${PEOPLE.admin.id}', 'Qa Admin', '${PEOPLE.admin.email}', true),
    ('${PEOPLE.ben.id}', 'Qa Ben', '${PEOPLE.ben.email}', true)
    on conflict (id) do nothing`);
  sql(`insert into user_access (user_id, is_admin, features) values
    ('${PEOPLE.admin.id}', true, '{}'), ('${PEOPLE.ben.id}', false, '{}') on conflict (user_id) do nothing`);
  sql('delete from job_runs; delete from scheduled_jobs; delete from alerts_sent; delete from push_tokens');
  // one good backup, 23:30 KL yesterday-ish (a fixed instant, so the label is checked by hand), 1.5 GB;
  // then a later failed one, which Settings must not show as the last backup
  sql("select record_backup('qa-1', 'ok', 1500000000, 90000, null)");
  sql("update job_runs set ran_at = '2026-10-24T15:30:00Z' where run_key = 'backup:qa-1'");
  sql("select record_backup('qa-2', 'failed', null, 1000, 'pg_dump: boom')");
  fresh();
}
