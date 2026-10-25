import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b06-setup';

// QA B06 run 3, scoped re-check (the scheduler): FLOW-R3S-1 in qa/B06/flows.md, against the local Worker, API and sen_qa
// (b06r3.config.ts). Each step asserts first, then takes its screenshot, then writes its row.
const ROOT = new URL('../../qa-artifacts/B06/jobs-realtime-backups/', import.meta.url);
const SHOTS = decodeURIComponent(new URL('screens/', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const STEPS = decodeURIComponent(new URL('r3s-steps.jsonl', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(SHOTS, { recursive: true });
const WORKER = 'http://127.0.0.1:8795';

async function step(
  page: Page,
  flow: string,
  n: number,
  slug: string,
  action: string,
  assertion: string,
  check: () => Promise<void>,
) {
  const file = `${flow}-step-${n}-${slug}`;
  let status = 'pass';
  let err = '';
  try {
    await check();
  } catch (e) {
    status = 'fail';
    err = String(e).slice(0, 600);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${file}.png` }).catch(() => undefined);
  fs.appendFileSync(
    STEPS,
    JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n',
  );
  if (status === 'fail') throw new Error(`${flow} step ${n}: ${err}`);
}

async function signIn(page: Page, email: string) {
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** Counts the page's GET /api/settings from now. */
function settingsReads(p: Page) {
  const at: number[] = [];
  p.on('request', (r) => {
    if (r.method() === 'GET' && new URL(r.url()).pathname === '/api/settings') at.push(Date.now());
  });
  return at;
}

/** Counts main-frame navigations (a reload would be one). */
function navigations(p: Page) {
  const n = { count: 0 };
  p.on('framenavigated', (f) => {
    if (f === p.mainFrame()) n.count++;
  });
  return n;
}

const toast = (p: Page) => p.locator('[data-sonner-toast]').last();
const admin = PEOPLE.admin.id;

test.beforeEach(() => fresh());

test('FLOW-R3S-1: a test job runs once through the real Worker, and its hint reloads the open Data screen', async ({
  page,
  request,
}) => {
  const F = 'FLOW-R3S-1';
  sql("delete from scheduled_jobs; delete from job_runs where job like 'once:%'");
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  await expect(page.getByText('Schedule a test job')).toBeVisible();
  await page.getByText('Schedule a test job').click();
  await step(page, F, 1, 'scheduled', 'tap Schedule a test job', 'toast names its minute; one due row', async () => {
    await expect(toast(page)).toContainText(/Test job set for \d\d:\d\d/);
    expect(
      sql(`select count(*) from scheduled_jobs where user_id = '${admin}' and kind = 'test' and status = 'due'`),
    ).toBe('1');
  });
  const runAt = Date.parse(
    sql(
      `select to_char(run_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from scheduled_jobs where kind = 'test'`,
    ),
  );
  const reads = settingsReads(page);
  const navs = navigations(page);
  const cron = () => request.get(`${WORKER}/__scheduled?cron=*+*+*+*+*`);
  await cron();
  await page.waitForTimeout(1500);
  await step(page, F, 2, 'not-yet', 'a cron before its minute', 'still due; nothing ran', async () => {
    expect(sql(`select status from scheduled_jobs where kind = 'test'`)).toBe('due');
  });
  await page.waitForTimeout(Math.max(0, runAt - Date.now() + 1500));
  const before = reads.length;
  const [c1, c2] = await Promise.all([cron(), cron()]);
  expect([c1.status(), c2.status()]).toEqual([200, 200]);
  await page.waitForTimeout(3000);
  await cron();
  await page.waitForTimeout(1500);
  await step(
    page,
    F,
    3,
    'ran-once',
    'two crons at once after its minute, then a third',
    'done 1; one ok job_runs row',
    async () => {
      expect(sql(`select status || ' ' || attempts from scheduled_jobs where kind = 'test'`)).toBe('done 1');
      expect(
        sql(`select count(*) from job_runs where user_id = '${admin}' and job = 'once:test' and status = 'ok'`),
      ).toBe('1');
    },
  );
  await step(
    page,
    F,
    4,
    'hint-reload',
    'the job’s hint reaches the open Data screen',
    'a GET /api/settings, no reload',
    async () => {
      expect(reads.length - before).toBeGreaterThanOrEqual(1);
      expect(navs.count).toBe(0);
      test
        .info()
        .annotations.push({ type: 'settings reads after the job', description: String(reads.length - before) });
    },
  );
  const health = await request.get(`${WORKER}/health`);
  await step(page, F, 5, 'worker-health', 'GET the Worker’s /health', '200 {ok:true}', async () => {
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
  });
});
