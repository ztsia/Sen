import fs from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b06-setup';

// QA B06 run 2: the flows in qa/B06/flows.md (Run 2), against the local Worker, API and sen_qa
// (b06r2.config.ts). Each step asserts first, then takes its screenshot, then writes its row.
const ROOT = new URL('../../qa-artifacts/B06_jobs-realtime-backups/', import.meta.url);
const SHOTS = decodeURIComponent(new URL('screens/', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const STEPS = decodeURIComponent(new URL('r2-steps.jsonl', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(SHOTS, { recursive: true });
const WORKER = 'http://127.0.0.1:8793';
const API = 'http://127.0.0.1:8794';

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
    err = String(e).slice(0, 400);
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

async function phone(browser: Browser, email: string, timezoneId = 'Asia/Kuala_Lumpur') {
  const ctx = await browser.newContext({ timezoneId });
  const page = await ctx.newPage();
  await signIn(page, email);
  return page;
}

const toast = (p: Page) => p.locator('[data-sonner-toast]').last();
const admin = PEOPLE.admin.id;

test.beforeEach(() => fresh());

test('FLOW-R2-1: a test job a minute ahead runs once through the real Worker, two crons at once', async ({
  page,
  request,
}) => {
  const F = 'FLOW-R2-1';
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
  const cron = () => request.get(`${WORKER}/__scheduled?cron=*+*+*+*+*`);
  // before its minute: the Worker's crons don't run it
  await cron();
  await page.waitForTimeout(1500);
  await step(page, F, 2, 'not-yet', 'a cron before its minute', 'still due, nothing ran', async () => {
    expect(sql(`select status from scheduled_jobs where kind = 'test'`)).toBe('due');
  });
  await page.waitForTimeout(Math.max(0, runAt - Date.now() + 1500));
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
    'done, attempts 1, one job_runs row',
    async () => {
      expect(sql(`select status || ' ' || attempts from scheduled_jobs where kind = 'test'`)).toBe('done 1');
      expect(
        sql(`select count(*) from job_runs where user_id = '${admin}' and job = 'once:test' and status = 'ok'`),
      ).toBe('1');
    },
  );
  const health = await request.get(`${WORKER}/health`);
  await step(page, F, 4, 'worker-health', 'GET the Worker’s /health', '200 {ok:true}', async () => {
    expect(health.status()).toBe(200);
  });
});

test('FLOW-R2-2: a change on one device updates the same screen open on another', async ({ browser }) => {
  const F = 'FLOW-R2-2';
  sql(`update user_settings set expected_payday = null where user_id = '${admin}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  const b = await phone(browser, PEOPLE.admin.email);
  await a.goto('/s/settings/you');
  await b.goto('/s/settings/you');
  let navs = 0;
  a.on('framenavigated', (f) => {
    if (f === a.mainFrame()) navs++;
  });
  await step(a, F, 1, 'both-open', 'both devices open You', 'A shows Not set', async () => {
    await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked();
  });
  await b.getByRole('radio', { name: 'Last working day' }).click();
  await step(b, F, 2, 'b-changes', 'B taps Last working day', 'B checked; saved in user_settings', async () => {
    await expect(b.getByRole('radio', { name: 'Last working day' })).toBeChecked();
    await expect
      .poll(() => sql(`select expected_payday from user_settings where user_id = '${admin}'`))
      .toBe('last-working');
  });
  const t0 = Date.now();
  await step(
    a,
    F,
    3,
    'a-updated',
    'wait on A, touching nothing',
    'A shows Last working day within 5 s, no navigation, no stamp',
    async () => {
      await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked({ timeout: 5000 });
      expect(navs).toBe(0);
      await expect(a.getByText(/Updated .*ago|Updated just now/)).toHaveCount(0);
    },
  );
  test.info().annotations.push({ type: 'hint arrived', description: `${Date.now() - t0} ms` });
});

test('FLOW-R2-3: the relay is down, then back', async ({ browser }) => {
  const F = 'FLOW-R2-3';
  sql(`update user_settings set expected_payday = 'last-working' where user_id = '${admin}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  let refuse = true;
  await a.routeWebSocket(/\/connect/, (ws) => {
    if (refuse) ws.close();
    else ws.connectToServer();
  });
  await a.goto('/s/settings/you');
  const stamp = a.getByRole('status').filter({ hasText: /Updated/ });
  const opened = Date.now();
  await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked();
  await a.waitForTimeout(3000);
  await step(
    a,
    F,
    0,
    'loaded-no-stamp',
    'open You with the relay refusing; 3 s after it loaded',
    'records whether the stamp shows yet',
    async () => {
      test.info().annotations.push({ type: 'stamp 3 s after load', description: String(await stamp.count()) });
    },
  );
  await step(a, F, 1, 'stamp', 'wait with the relay refusing', 'the stamp shows, in muted', async () => {
    await expect(stamp).toBeVisible({ timeout: 40_000 });
    test.info().annotations.push({ type: 'stamp appeared after', description: `${Date.now() - opened} ms` });
    const color = await stamp
      .locator('xpath=.//*[contains(text(),"Updated")]')
      .first()
      .evaluate((e) => getComputedStyle(e).color);
    test.info().annotations.push({ type: 'stamp colour', description: color });
  });
  sql(`update user_settings set expected_payday = null where user_id = '${admin}'`);
  const t0 = Date.now();
  await step(a, F, 2, 'fallback', 'change underneath (another device), wait', 'Not set within 32 s', async () => {
    await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked({ timeout: 32_000 });
  });
  test.info().annotations.push({ type: 'fallback took', description: `${Date.now() - t0} ms` });
  refuse = false;
  await step(a, F, 3, 'back', 'the relay takes connections again', 'the stamp goes', async () => {
    await expect(stamp).toHaveCount(0, { timeout: 45_000 });
  });
});

test('FLOW-R2-4: the admin’s Settings → Data, and its checks', async ({ page }) => {
  const F = 'FLOW-R2-4';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  await step(
    page,
    F,
    1,
    'admin-data',
    'open Data as the admin',
    'last good backup 24 Oct 23:30, 1.50 GB of 10 GB, two checks',
    async () => {
      await expect(page.getByText(/24 Oct, 23:30/)).toBeVisible();
      await expect(page.getByText('1.50 GB of 10 GB')).toBeVisible();
      await expect(page.getByText('Send a test push')).toBeVisible();
      await expect(page.getByText('Schedule a test job')).toBeVisible();
    },
  );
  await page.getByText('Send a test push').click();
  await step(
    page,
    F,
    2,
    'test-push',
    'tap Send a test push (no Firebase here)',
    'a toast says push isn’t set up here',
    async () => {
      await expect(toast(page)).toContainText(/Push isn’t set up here|No phone is registered/);
    },
  );
});

test('FLOW-R2-4b: Data reads the same in New York', async ({ browser }) => {
  const F = 'FLOW-R2-4b';
  const p = await phone(browser, PEOPLE.admin.email, 'America/New_York');
  await p.goto('/s/settings/data');
  await step(p, F, 1, 'new-york', 'open Data with the browser in America/New_York', 'still 24 Oct, 23:30', async () => {
    await expect(p.getByText(/24 Oct, 23:30/)).toBeVisible();
  });
});

test('FLOW-R2-5: a member’s Settings → Data', async ({ page }) => {
  const F = 'FLOW-R2-5';
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/data');
  await step(
    page,
    F,
    1,
    'member-data',
    'open Data as a member',
    'Export only: no backup, storage or checks',
    async () => {
      await expect(page.getByRole('button', { name: 'Export everything' })).toBeVisible();
      await expect(page.getByText('Last backup')).toHaveCount(0);
      await expect(page.getByText(/GB of 10 GB/)).toHaveCount(0);
      await expect(page.getByText('Send a test push')).toHaveCount(0);
    },
  );
  const origin = { origin: 'http://127.0.0.1:4186' };
  const job = await page.request.post('/api/jobs/test', { data: {}, headers: origin });
  const push = await page.request.post('/api/push/test', { data: {}, headers: origin });
  await step(page, F, 2, 'member-routes', 'POST the two test routes as the member', 'both 403', async () => {
    expect(job.status()).toBe(403);
    expect(push.status()).toBe(403);
  });
});

test('FLOW-R2-6: a lost phone: sign out everywhere', async ({ browser }) => {
  const F = 'FLOW-R2-6';
  sql('delete from push_tokens');
  const lost = await phone(browser, PEOPLE.admin.email);
  const here = await phone(browser, PEOPLE.admin.email);
  const origin = { origin: 'http://127.0.0.1:4186' };
  expect(
    (await lost.request.put('/api/push/token', { data: { token: 'qa-lost-phone' }, headers: origin })).status(),
  ).toBe(200);
  expect(
    (await here.request.put('/api/push/token', { data: { token: 'qa-this-phone' }, headers: origin })).status(),
  ).toBe(200);
  await here.goto('/s/settings/account');
  await step(here, F, 1, 'two-phones', 'two phones registered; open Account', 'two tokens stored', async () => {
    expect(sql(`select count(*) from push_tokens where user_id = '${admin}'`)).toBe('2');
    await expect(here.getByText('Sign out everywhere')).toBeVisible();
  });
  await here.getByText('Sign out everywhere').click();
  await step(here, F, 2, 'confirm', 'tap Sign out everywhere', 'the dialog asks first', async () => {
    await expect(here.getByRole('alertdialog')).toBeVisible();
  });
  await here.getByRole('alertdialog').getByRole('button', { name: 'Sign out everywhere' }).click();
  await step(
    here,
    F,
    3,
    'signed-out',
    'confirm',
    'sign-in; no token left; the lost phone’s session refused',
    async () => {
      await expect(here).toHaveURL(/sign-in/);
      await expect.poll(() => sql(`select count(*) from push_tokens where user_id = '${admin}'`)).toBe('0');
      const r = await lost.request.get('/api/settings');
      expect(r.status()).toBe(401);
    },
  );
});

test('FLOW-R2-7: the scheduler stops: /health/jobs fails, with no data', async ({ page, request }) => {
  const F = 'FLOW-R2-7';
  sql("delete from job_runs where job = 'morning'");
  sql(
    `insert into job_runs (user_id, job, run_key, status, ran_at) values ('${admin}', 'morning', 'morning:qa', 'ok', now() - interval '1 hour')`,
  );
  sql("select record_backup('qa-r2-now', 'ok', 1000, 10, null)");
  await page.goto(`${API}/api/health/jobs`);
  await step(page, F, 1, 'healthy', 'GET /health/jobs, all fresh', '200 {"ok":true}', async () => {
    const r = await request.get(`${API}/api/health/jobs`);
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });
  sql("update job_runs set ran_at = now() - interval '27 hours' where run_key = 'morning:qa'");
  await page.goto(`${API}/api/health/jobs`);
  await step(
    page,
    F,
    2,
    'morning-late',
    'the morning run 27 h old',
    '503, names morning, no ids or times',
    async () => {
      const r = await request.get(`${API}/api/health/jobs`);
      expect(r.status()).toBe(503);
      const text = await r.text();
      expect(text).not.toMatch(/[0-9a-f]{8}-|20\d\d-/);
    },
  );
  sql("update job_runs set ran_at = now() - interval '1 hour' where run_key = 'morning:qa'");
  sql("update job_runs set ran_at = now() - interval '3 days' where job = 'backup' and status = 'ok'");
  sql("select record_backup('qa-r2-failed', 'failed', null, 10, 'pg_dump: boom')");
  await page.goto(`${API}/api/health/jobs`);
  await step(
    page,
    F,
    3,
    'backup-late',
    'last good backup 3 days ago, a failed one today',
    '503 late backup',
    async () => {
      const r = await request.get(`${API}/api/health/jobs`);
      expect(r.status()).toBe(503);
      expect(await r.json()).toMatchObject({ late: ['backup'] });
    },
  );
  // put the seed back for the other flows
  sql("delete from job_runs where run_key in ('backup:qa-r2-now', 'backup:qa-r2-failed', 'morning:qa')");
  sql("update job_runs set ran_at = '2026-10-24T15:30:00Z' where run_key = 'backup:qa-1'");
});

// The core journeys (D124), on the dev build with the api backend: sign-in is the server's, the rest
// is still the skeleton's fake after it.
test('FLOW-R2-8 first-run (core): sign-in by code, then first run opens', async ({ page }) => {
  const F = 'FLOW-R2-8';
  await page.goto('/s/first-run');
  await step(page, F, 1, 'gate', 'open first-run signed out', 'sent to sign-in', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
  });
  await signIn(page, PEOPLE.admin.email);
  await step(page, F, 2, 'home', 'sign in by code', 'home with the tab bar', async () => {
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
  });
  await page.goto('/s/first-run');
  await step(page, F, 3, 'first-run', 'open first-run signed in', 'the first-run screen opens', async () => {
    await expect(page).toHaveURL(/first-run/);
  });
});

test('FLOW-R2-9 pay-new (core): answering a new merchant files it and makes a rule', async ({ page }) => {
  const F = 'FLOW-R2-9';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/review');
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: /ROTI BAKAR 88/i });
  await step(page, F, 1, 'prompt', 'Review shows the new merchant', 'RM9.50 · Roti Bakar 88', async () => {
    await expect(row).toBeVisible();
    await expect(row).toContainText('RM9.50');
  });
  await row.getByRole('button', { name: 'Meals' }).click();
  await step(page, F, 2, 'answered', 'tap Meals', 'toast: Meals from now on; the card goes', async () => {
    await expect(page.locator('[data-sonner-toast]').first()).toContainText(/Roti Bakar 88 is Meals from now on/i);
    await expect(row).toHaveCount(0);
  });
});

test('FLOW-R2-10 scan-after (core): scan, confirm, Done attaches', async ({ page }) => {
  const F = 'FLOW-R2-10';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
  ]);
  await chooser.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
  await step(page, F, 1, 'crop', 'Scan tab, choose a photo', 'crop opens', async () => {
    await expect(page).toHaveURL(/\/s\/crop/, { timeout: 10_000 });
  });
  await page.getByRole('button', { name: 'Use this' }).click();
  await step(page, F, 2, 'confirm', 'Use this', 'confirm: items add up to the total', async () => {
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Items add up to the total' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await step(page, F, 3, 'attached', 'Done', 'Attached to RM64.13 on Ryt Bank, with Undo', async () => {
    await expect(page.locator('[data-sonner-toast]').first()).toContainText('Attached to RM64.13 on Ryt Bank');
  });
});

test('FLOW-R2-6b: signing out on purpose, then sign-in: which request found the session gone', async ({ browser }) => {
  const F = 'FLOW-R2-6b';
  for (const which of ['Sign out', 'Sign out everywhere'] as const) {
    const p = await phone(browser, PEOPLE.admin.email);
    await p.goto('/s/settings/account');
    await expect(p.getByText('Sign out everywhere')).toBeVisible();
    const after: string[] = [];
    p.on('response', (r) => {
      if (r.url().includes('/api/')) after.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
    });
    await p.getByText(which, { exact: true }).click();
    if (which === 'Sign out everywhere')
      await p.getByRole('alertdialog').getByRole('button', { name: 'Sign out everywhere' }).click();
    await expect(p).toHaveURL(/sign-in/);
    await p.waitForTimeout(1000);
    const slug = which === 'Sign out' ? 'sign-out' : 'everywhere';
    const said = await p.getByText('You were signed out').count();
    test.info().annotations.push({ type: `${which}: requests`, description: after.join(' | ') });
    test.info().annotations.push({ type: `${which}: "You were signed out" shown`, description: String(said) });
    await step(
      p,
      F,
      which === 'Sign out' ? 1 : 2,
      slug,
      `tap ${which} (and confirm)`,
      'sign-in, recorded whether it says "You were signed out"',
      async () => {
        await expect(p).toHaveURL(/sign-in/);
      },
    );
    await p.context().close();
  }
});
