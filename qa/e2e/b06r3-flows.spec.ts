import fs from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b06-setup';

// QA B06 run 3: the flows in qa/B06/flows.md (Run 3), against the local Worker, API and sen_qa
// (b06r3.config.ts). Each step asserts first, then takes its screenshot, then writes its row.
const ROOT = new URL('../../qa-artifacts/B06/jobs-realtime-backups/', import.meta.url);
const SHOTS = decodeURIComponent(new URL('screens/', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const STEPS = decodeURIComponent(new URL('r3-steps.jsonl', ROOT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(SHOTS, { recursive: true });
const WORKER = 'http://127.0.0.1:8795';
const API = 'http://127.0.0.1:8796';

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

async function phone(browser: Browser, email: string, timezoneId = 'Asia/Kuala_Lumpur') {
  const ctx = await browser.newContext({
    timezoneId,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
    baseURL: 'http://127.0.0.1:4187',
  });
  const page = await ctx.newPage();
  await signIn(page, email);
  return page;
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
const ben = PEOPLE.ben.id;

test.beforeEach(() => fresh());

test('FLOW-R3-1: a test job runs once through the real Worker, and its hint reloads the open Data screen', async ({
  page,
  request,
}) => {
  const F = 'FLOW-R3-1';
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

test('FLOW-R3-2: a change reaches the person’s other device, and not another person', async ({ browser }) => {
  const F = 'FLOW-R3-2';
  sql(`update user_settings set expected_payday = null where user_id in ('${admin}', '${ben}')`);
  const a = await phone(browser, PEOPLE.admin.email);
  const b = await phone(browser, PEOPLE.admin.email);
  const other = await phone(browser, PEOPLE.ben.email);
  for (const p of [a, b, other]) await p.goto('/s/settings/you');
  await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked();
  await expect(other.getByRole('radio', { name: 'Not set' })).toBeChecked();
  await a.waitForTimeout(2000); // let every socket open
  const navs = navigations(a);
  const benReads = settingsReads(other);
  await step(a, F, 1, 'three-open', 'two of the admin’s devices and Ben’s open You', 'Not set on each', async () => {
    await expect(b.getByRole('radio', { name: 'Not set' })).toBeChecked();
  });
  const t0 = Date.now();
  await b.getByRole('radio', { name: 'Last working day' }).click();
  await step(b, F, 2, 'b-changes', 'the admin’s second device picks Last working day', 'saved', async () => {
    await expect
      .poll(() => sql(`select expected_payday from user_settings where user_id = '${admin}'`))
      .toBe('last-working');
  });
  await step(a, F, 3, 'a-updates', 'wait on the first device', 'Last working day, no reload, within 5 s', async () => {
    await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked({ timeout: 5000 });
    expect(navs.count).toBe(0);
    test.info().annotations.push({ type: 'hint arrived', description: `${Date.now() - t0} ms` });
  });
  await other.waitForTimeout(3000);
  await step(other, F, 4, 'ben-untouched', 'Ben’s device, 3 s on', 'no settings read; still Not set', async () => {
    expect(benReads.length).toBe(0);
    await expect(other.getByRole('radio', { name: 'Not set' })).toBeChecked();
  });
  for (const p of [a, b, other]) await p.context().close();
});

test('FLOW-R3-3: offline, a change underneath, back online; then a return to the app', async ({ browser }) => {
  const F = 'FLOW-R3-3';
  sql(`update user_settings set expected_payday = 'last-working' where user_id = '${admin}'`);
  const a = await phone(browser, PEOPLE.admin.email);
  await a.goto('/s/settings/you');
  await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked();
  await a.waitForTimeout(1500);
  const stamp = a.getByRole('status').filter({ hasText: /Updated/ });
  await a.context().setOffline(true);
  await step(a, F, 1, 'offline-stamp', 'the phone goes offline', 'the Updated stamp shows', async () => {
    await expect(stamp).toBeVisible({ timeout: 5000 });
  });
  // a change no hint announces: written straight to the database, as another device's sync would be
  sql(`update user_settings set expected_payday = null where user_id = '${admin}'`);
  const t0 = Date.now();
  await a.context().setOffline(false);
  await step(
    a,
    F,
    2,
    'online',
    'back online',
    'Not set within 10 s (a reconnect reloads); the stamp goes',
    async () => {
      await expect(a.getByRole('radio', { name: 'Not set' })).toBeChecked({ timeout: 10_000 });
      await expect(stamp).toHaveCount(0, { timeout: 10_000 });
      test.info().annotations.push({ type: 'reconnect reload took', description: `${Date.now() - t0} ms` });
    },
  );
  // again, underneath; this time the app goes to the background and comes back
  sql(`update user_settings set expected_payday = 'last-working' where user_id = '${admin}'`);
  await a.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await a.waitForTimeout(500);
  await a.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await step(a, F, 3, 'resume', 'the app returns to the front', 'Last working day within 5 s', async () => {
    await expect(a.getByRole('radio', { name: 'Last working day' })).toBeChecked({ timeout: 5000 });
  });
  await a.context().close();
});

function seedBackups() {
  sql("delete from job_runs where job = 'backup'");
  // held: a good dump 2 days less an hour ago (1,500,000,000); not held: one 31 days ago (3,600,000,000);
  // a failed one today, which is never the last backup
  sql("select record_backup('qa3-old', 'ok', 3600000000, 1000, null)");
  sql("update job_runs set ran_at = now() - interval '31 days' where run_key = 'backup:qa3-old'");
  sql("select record_backup('qa3-good', 'ok', 1500000000, 1000, null)");
  sql("update job_runs set ran_at = now() - interval '47 hours' where run_key = 'backup:qa3-good'");
  sql("select record_backup('qa3-failed', 'failed', null, 1000, 'pg_dump: boom')");
}

for (const tz of ['Asia/Kuala_Lumpur', 'America/New_York'] as const) {
  test(`FLOW-R3-4${tz === 'Asia/Kuala_Lumpur' ? '' : 'b'}: the admin’s Data, worked by hand (${tz})`, async ({
    browser,
  }) => {
    const F = tz === 'Asia/Kuala_Lumpur' ? 'FLOW-R3-4' : 'FLOW-R3-4b';
    seedBackups();
    const want = sql(
      "select to_char((now() - interval '47 hours') at time zone 'Asia/Kuala_Lumpur', 'HH24:MI') from job_runs limit 1",
    );
    const p = await phone(browser, PEOPLE.admin.email, tz);
    await p.goto('/s/settings/data');
    const backups = p
      .getByRole('region', { name: 'Backups' })
      .or(p.locator('section', { hasText: 'Last backup' }))
      .first();
    await step(
      p,
      F,
      1,
      'facts',
      'open Data',
      `last backup at ${want} KL (2 days ago); storage 1.50 GB of 10 GB`,
      async () => {
        await expect(p.getByText('Last backup')).toBeVisible();
        await expect(backups).toContainText(want);
        await expect(backups).toContainText('1.50 GB of 10 GB');
      },
    );
    sql("select record_backup('qa3-big', 'ok', 4200000000, 1000, null)");
    const nowKL = sql(
      "select to_char(ran_at at time zone 'Asia/Kuala_Lumpur', 'HH24:MI') from job_runs where run_key = 'backup:qa3-big'",
    );
    await p.reload();
    await step(
      p,
      F,
      2,
      'half',
      'a 4.2 GB dump lands; reopen',
      `last backup at ${nowKL} KL; 5.70 GB of 10 GB with the warning icon`,
      async () => {
        await expect(backups).toContainText(nowKL);
        test.info().annotations.push({ type: 'last backup label', description: await backups.innerText() });
        const row = p.getByText('5.70 GB of 10 GB');
        await expect(row).toBeVisible();
        expect(await row.evaluate((e) => (e.closest('span') ?? e).className)).toMatch(/warning/);
        expect(await row.locator('xpath=..').locator('svg').count()).toBeGreaterThanOrEqual(1);
      },
    );
    sql("delete from job_runs where run_key = 'backup:qa3-big'");
    await p.context().close();
  });
}

test('FLOW-R3-4c: a member’s Data', async ({ browser }) => {
  const F = 'FLOW-R3-4c';
  const p = await phone(browser, PEOPLE.ben.email);
  await p.goto('/s/settings/data');
  await step(p, F, 1, 'member', 'Ben opens Data', 'no Last backup, Storage or Checks', async () => {
    await expect(p.getByText('Export everything').first()).toBeVisible();
    await expect(p.getByText('Last backup')).toHaveCount(0);
    await expect(p.getByText('Storage')).toHaveCount(0);
    await expect(p.getByText('Send a test push')).toHaveCount(0);
  });
  const r = await p.request.post('/api/push/test', { data: {}, headers: { origin: 'http://127.0.0.1:4187' } });
  await step(p, F, 2, 'member-403', 'Ben posts /api/push/test himself', '403 forbidden', async () => {
    expect(r.status()).toBe(403);
    expect(await r.json()).toMatchObject({ code: 'forbidden' });
  });
  await p.context().close();
});

test('FLOW-R3-5: four test pushes in a minute', async ({ browser }) => {
  const F = 'FLOW-R3-5';
  sql('delete from auth_rate_limit');
  const p = await phone(browser, PEOPLE.admin.email);
  await p.goto('/s/settings/data');
  const said: string[] = [];
  for (let i = 0; i < 4; i++) {
    const [res] = await Promise.all([
      p.waitForResponse((r) => new URL(r.url()).pathname === '/api/push/test'),
      p.getByText('Send a test push').click(),
    ]);
    said.push(`${res.status()} ${((await res.json()) as { message?: string }).message ?? ''}`);
    await p.waitForTimeout(600);
  }
  test.info().annotations.push({ type: 'toasts', description: said.join(' | ') });
  await step(p, F, 1, 'fourth', 'tap Send a test push four times', 'the 4th says to wait a minute', async () => {
    expect(said[3]).toMatch(/Wait a minute/);
    expect(said.slice(0, 3).every((s) => !/Wait a minute/.test(s))).toBe(true);
  });
  await p.context().close();
});

test('FLOW-R3-6: /health/jobs, fresh, late and forged', async ({ page, request }) => {
  const F = 'FLOW-R3-6';
  seedBackups();
  sql("delete from job_runs where job = 'morning'");
  sql(`insert into job_runs (user_id, job, run_key, status) values ('${admin}', 'morning', 'morning:qa3', 'ok')`);
  sql("update job_runs set ran_at = now() - interval '1 hour' where run_key = 'backup:qa3-good'");
  const fresh1 = await request.get(`${API}/api/health/jobs`);
  await page.goto(`${API}/api/health/jobs`);
  await step(page, F, 1, 'fresh', 'a morning run and a backup within their limits', '200 {ok:true}', async () => {
    expect(fresh1.status()).toBe(200);
    expect(await fresh1.json()).toEqual({ ok: true });
  });
  sql("update job_runs set ran_at = now() - interval '27 hours' where run_key = 'morning:qa3'");
  const late = await request.get(`${API}/api/health/jobs`);
  await page.goto(`${API}/api/health/jobs`);
  await step(page, F, 2, 'morning-late', 'the morning run 27 h old', '503, late morning, no ids or dates', async () => {
    expect(late.status()).toBe(503);
    const text = await late.text();
    expect(JSON.parse(text)).toMatchObject({ code: 'late', late: ['morning'] });
    expect(text).not.toMatch(/[0-9a-f]{8}-|20\d\d-/);
  });
  // a member writes their own 'ok' runs, as RLS allows: health must stay red
  sql(`insert into job_runs (user_id, job, run_key, status) values ('${ben}', 'morning', 'morning:forged', 'ok')`);
  const forged = await request.get(`${API}/api/health/jobs`);
  await page.goto(`${API}/api/health/jobs`);
  await step(page, F, 3, 'forged', 'Ben’s own fresh morning row', 'still 503', async () => {
    expect(forged.status()).toBe(503);
  });
  sql("delete from job_runs where run_key = 'morning:forged'");
  sql("update job_runs set ran_at = now() - interval '1 hour' where run_key = 'morning:qa3'");
  sql("update job_runs set ran_at = now() - interval '49 hours' where run_key = 'backup:qa3-good'");
  const bl = await request.get(`${API}/api/health/jobs`);
  await page.goto(`${API}/api/health/jobs`);
  await step(
    page,
    F,
    4,
    'backup-late',
    'the last good backup 49 h ago, a failed one today',
    '503 late backup',
    async () => {
      expect(bl.status()).toBe(503);
      expect(await bl.json()).toMatchObject({ late: ['backup'] });
    },
  );
  sql("delete from job_runs where job in ('morning', 'backup')");
  const none = await request.get(`${API}/api/health/jobs`);
  await page.goto(`${API}/api/health/jobs`);
  await step(page, F, 5, 'never', 'no run of either ever', '503, both late', async () => {
    expect(none.status()).toBe(503);
    expect(await none.json()).toMatchObject({ late: ['morning', 'backup'] });
  });
});

test('FLOW-R3-7: push tokens across two sessions and their sign-outs', async ({ browser }) => {
  const F = 'FLOW-R3-7';
  sql(`delete from push_tokens where user_id = '${admin}'`);
  const one = await phone(browser, PEOPLE.admin.email);
  const two = await phone(browser, PEOPLE.admin.email);
  const put = (p: Page, token: string) =>
    p.request.put('/api/push/token', { data: { token }, headers: { origin: 'http://127.0.0.1:4187' } });
  expect((await put(one, 'qa3-phone-one')).status()).toBe(200);
  expect((await put(two, 'qa3-phone-two')).status()).toBe(200);
  expect((await put(two, 'qa3-phone-two')).status()).toBe(200);
  await one.goto('/s/settings/account');
  await step(one, F, 1, 'two-tokens', 'two phones register (one twice)', 'two rows', async () => {
    expect(sql(`select count(*) from push_tokens where user_id = '${admin}'`)).toBe('2');
  });
  await one.getByText('Sign out', { exact: true }).click();
  await expect(one).toHaveURL(/sign-in/);
  await step(
    one,
    F,
    2,
    'one-out',
    'phone one signs out; phone two still signed in',
    'phone two’s token kept',
    async () => {
      expect(
        sql(`select string_agg(fcm_token, ',' order by fcm_token) from push_tokens where user_id = '${admin}'`),
      ).toContain('qa3-phone-two');
    },
  );
  await two.goto('/s/settings/account');
  await two.getByText('Sign out', { exact: true }).click();
  await expect(two).toHaveURL(/sign-in/);
  await step(two, F, 3, 'last-out', 'phone two signs out: the last session', 'no tokens left', async () => {
    expect(sql(`select count(*) from push_tokens where user_id = '${admin}'`)).toBe('0');
  });
  for (const p of [one, two]) await p.context().close();
});

test('FLOW-R3-8: signing in opens the live connection without a reload; signing out closes it', async ({ page }) => {
  const F = 'FLOW-R3-8';
  const sockets: { url: string; closed: boolean }[] = [];
  page.on('websocket', (ws) => {
    const s = { url: ws.url(), closed: false };
    sockets.push(s);
    ws.on('close', () => (s.closed = true));
  });
  const navs = navigations(page);
  await signIn(page, PEOPLE.admin.email);
  const navsAfterSignIn = navs.count;
  await page.waitForTimeout(3000);
  await step(
    page,
    F,
    1,
    'connected',
    'sign in by code, no reload',
    'one socket to the relay’s /connect, open',
    async () => {
      const relay = sockets.filter((s) => s.url.includes('/connect'));
      test.info().annotations.push({
        type: 'sockets',
        description: JSON.stringify(sockets.map((s) => ({ ...s, url: s.url.replace(/pass=[^&]+/, 'pass=…') }))),
      });
      test.info().annotations.push({ type: 'navigations during sign-in', description: String(navsAfterSignIn) });
      expect(relay.length).toBe(1);
      expect(relay[0]!.closed).toBe(false);
    },
  );
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('link', { name: /More/ })
    .click()
    .catch(() => undefined);
  await page.goto('/s/settings/account');
  await page.getByText('Sign out', { exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.waitForTimeout(1500);
  await step(page, F, 2, 'closed', 'sign out', 'every relay socket closed', async () => {
    expect(sockets.filter((s) => s.url.includes('/connect') && !s.closed)).toEqual([]);
  });
});

// The core journeys (D124), on the dev build with the api backend: sign-in is the server's, the rest
// is still the skeleton's fake after it.
test('FLOW-R3-C1 first-run (core): signed out → sign-in → home → first run', async ({ page }) => {
  const F = 'FLOW-R3-C1';
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

test('FLOW-R3-C2 pay-new (core): answering a new merchant files it and makes a rule', async ({ page }) => {
  const F = 'FLOW-R3-C2';
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

test('FLOW-R3-C3 scan-after (core): scan, confirm, Done attaches', async ({ page }) => {
  const F = 'FLOW-R3-C3';
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
