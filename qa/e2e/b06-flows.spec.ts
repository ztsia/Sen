import { expect, test, type Browser, type Page } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b06-setup';

// QA B06 run 1: the flows in qa/B06/flows.md, against the local API, Worker and sen_qa (b06.config.ts).
const SHOTS = process.env.QA_SCREENS ?? '../../qa-artifacts/B06_jobs-realtime-backups/screens';
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function signIn(page: Page, email: string) {
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

async function phone(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, email);
  return page;
}

/** Counts real navigations (a reload or a goto) after this point. */
async function watchNavigations(page: Page) {
  let n = 0;
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) n++;
  });
  return () => n;
}

test.beforeEach(() => fresh());

test('FLOW-1: a change on one device updates the same screen open on another, with no refresh', async ({ browser }) => {
  sql(`update user_settings set expected_payday = null where user_id = '${PEOPLE.admin.id}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  const b = await phone(browser, PEOPLE.admin.email);
  await a.goto('/s/settings/you');
  await b.goto('/s/settings/you');
  const lastWorking = (p: Page) => p.getByRole('radio', { name: 'Last working day' });
  await expect(lastWorking(a)).toBeVisible();
  // step 1: both open, A not yet "last working day"
  await expect(lastWorking(a)).not.toBeChecked();
  await shot(a, 'FLOW-1-step-1-a-open');
  const navs = await watchNavigations(a);
  // step 2: B changes the payday
  await lastWorking(b).click();
  await expect(lastWorking(b)).toBeChecked();
  await shot(b, 'FLOW-1-step-2-b-changes');
  // step 3: A shows it, by itself
  await expect(lastWorking(a)).toBeChecked({ timeout: 10_000 });
  expect(navs()).toBe(0);
  await expect(a.getByText(/Updated .* ago|Updated just now/)).toHaveCount(0);
  await shot(a, 'FLOW-1-step-3-a-updated');
  expect(sql(`select expected_payday from user_settings where user_id = '${PEOPLE.admin.id}'`)).toBe('last-working');
});

test('FLOW-2: the relay is down: the stamp shows, the 30 s fallback brings the change, and it goes on reconnect', async ({
  browser,
}) => {
  sql(`update user_settings set expected_payday = 'last-working' where user_id = '${PEOPLE.admin.id}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  const b = await phone(browser, PEOPLE.admin.email);
  // the relay refuses A: each socket is closed as it opens
  let refuse = true;
  await a.routeWebSocket(/\/connect/, (ws) => {
    if (refuse) ws.close();
    else ws.connectToServer();
  });
  await a.goto('/s/settings/you');
  await b.goto('/s/settings/you');
  // step 1: the stamp, in muted
  const stamp = a.getByRole('status').filter({ hasText: /Updated/ });
  await expect(stamp).toBeVisible({ timeout: 15_000 });
  await shot(a, 'FLOW-2-step-1-stamp');
  // step 2: B changes the payday; A has it within 30 s (and a little), with no navigation
  const navs = await watchNavigations(a);
  await b.getByRole('radio', { name: 'Not set' }).click();
  await expect(b.getByRole('radio', { name: 'Not set' })).toBeChecked();
  const t0 = Date.now();
  await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked({ timeout: 40_000 });
  const took = Date.now() - t0;
  expect(navs()).toBe(0);
  await shot(a, 'FLOW-2-step-2-fallback');
  test.info().annotations.push({ type: 'fallback', description: `arrived after ${took} ms` });
  // step 3: the relay comes back; the stamp goes
  refuse = false;
  await expect(stamp).toHaveCount(0, { timeout: 45_000 });
  await shot(a, 'FLOW-2-step-3-back');
  // step 4: live again, the 30 s polling has stopped: no settings read for 35 s with nothing changing
  let reads = 0;
  a.on('request', (r) => {
    if (r.url().includes('/api/settings')) reads++;
  });
  await a.waitForTimeout(35_000);
  test.info().annotations.push({ type: 'reads while live', description: String(reads) });
  expect(reads).toBe(0);
});

test('FLOW-3: coming back to the app reloads the screen', async ({ browser }) => {
  sql(`update user_settings set expected_payday = 'last-working' where user_id = '${PEOPLE.admin.id}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  // no relay for A at all, and no 30 s wait: hidden, changed underneath, shown
  await a.routeWebSocket(/\/connect/, () => undefined);
  await a.goto('/s/settings/you');
  await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked();
  await shot(a, 'FLOW-3-step-1-open');
  sql(`update user_settings set expected_payday = null where user_id = '${PEOPLE.admin.id}'`);
  await a.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked({ timeout: 5_000 });
  await shot(a, 'FLOW-3-step-2-reloaded');
});

test('FLOW-4: the admin sees the last good backup, storage and the checks', async ({ page }) => {
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  // 2026-10-24T15:30Z is 23:30 on Sat 24 Oct in KL; a later failed run doesn't count
  await expect(page.getByText('Last backup')).toBeVisible();
  await expect(page.getByText(/24 Oct, 23:30/)).toBeVisible();
  await expect(page.getByText('1.50 GB of 10 GB')).toBeVisible();
  await expect(page.getByText('Send a test push')).toBeVisible();
  await expect(page.getByText('Schedule a test job')).toBeVisible();
  await shot(page, 'FLOW-4-step-1-admin-data');
});

test('FLOW-4b: the last backup reads the same in another timezone', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  await expect(page.getByText(/24 Oct, 23:30/)).toBeVisible();
  await shot(page, 'FLOW-4b-step-1-new-york');
});

test('FLOW-5: a member sees Export only, and the test routes still answer them', async ({ page }) => {
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/data');
  await expect(page.getByRole('button', { name: 'Export everything' })).toBeVisible();
  await expect(page.getByText('Last backup')).toHaveCount(0);
  await expect(page.getByText('Send a test push')).toHaveCount(0);
  await shot(page, 'FLOW-5-step-1-member-data');
  // D142 (4): the checks are admin only. The routes behind them:
  const job = await page.request.post('/api/jobs/test', { data: {}, headers: { origin: 'http://127.0.0.1:4185' } });
  const push = await page.request.post('/api/push/test', { data: {}, headers: { origin: 'http://127.0.0.1:4185' } });
  test
    .info()
    .annotations.push({ type: 'member routes', description: `jobs/test ${job.status()}, push/test ${push.status()}` });
  expect.soft(job.status(), 'a member scheduling a test job').toBe(403);
  expect.soft(push.status(), 'a member sending a test push').toBe(403);
});

test('FLOW-6: test pushes, three a minute, the fourth refused in words', async ({ page }) => {
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  const row = page.getByText('Send a test push');
  const said: string[] = [];
  for (let i = 1; i <= 4; i++) {
    await row.click();
    // the row says Sending… while the request is on its way, then comes back
    await expect(page.getByText('Send a test push')).toBeVisible();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();
    said.push((await page.locator('[data-sonner-toast]').allInnerTexts()).join(' / '));
    await shot(page, `FLOW-6-step-${i}-push-${i}`);
  }
  test.info().annotations.push({ type: 'toasts', description: said.join(' | ') });
  await expect(page.getByText(/a few tests already/)).toBeVisible();
});

test('FLOW-7: the admin schedules a test job; it runs once', async ({ page, request }) => {
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/data');
  await page.getByText('Schedule a test job').click();
  const toast = page.locator('[data-sonner-toast]').last();
  await expect(toast).toContainText(/Test job set for \d\d:\d\d/);
  await shot(page, 'FLOW-7-step-1-scheduled');
  expect(
    sql(
      `select count(*) from scheduled_jobs where user_id = '${PEOPLE.admin.id}' and kind = 'test' and status = 'due'`,
    ),
  ).toBe('1');
  // two ticks at once, after its minute
  sql(`update scheduled_jobs set run_at = now() - interval '1 second' where kind = 'test'`);
  const tick = () =>
    request.post('http://127.0.0.1:8791/api/jobs/tick', {
      headers: {
        authorization: `Bearer ${process.env.QA_SCHEDULER_SECRET ?? 'qa-scheduler-secret-0123456789abcdefXYZ'}`,
      },
    });
  const [r1, r2] = await Promise.all([tick(), tick()]);
  expect([r1.status(), r2.status()]).toEqual([200, 200]);
  expect(
    sql(`select status || ' ' || attempts from scheduled_jobs where user_id = '${PEOPLE.admin.id}' and kind = 'test'`),
  ).toBe('done 1');
  expect(sql(`select count(*) from job_runs where user_id = '${PEOPLE.admin.id}' and job = 'once:test'`)).toBe('1');
  await shot(page, 'FLOW-7-step-2-ran');
});
