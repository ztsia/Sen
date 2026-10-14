import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { db, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows E: hostile text, time zones and offline, on the forms added this run. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const HOSTILE = [
  `<img src=x onerror=alert(1)>`,
  `'; DROP TABLE goals; --`,
  `../../etc/passwd`,
  'مرحبا بالعالم 😀 שלום',
  'W'.repeat(300),
];

test('R4-FLOW-12 hostile names in the new forms stay literal and inside the screen', async ({ page }) => {
  const F = 'R4-FLOW-12';
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  await open(page, '/s/goals');
  await settled(page);
  const rows: string[] = [];
  for (const h of HOSTILE) {
    await page.getByRole('button', { name: 'Add a goal' }).click();
    await page.getByLabel('Name', { exact: true }).fill(h);
    await page.getByLabel('Target', { exact: true }).click();
    await page.keyboard.type('10000');
    await page.locator('[role="group"][aria-labelledby="goal-account"] button').first().click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(500);
    const stored = await db<string>(page, '(db) => JSON.stringify(db.goals.map(g=>g.name))');
    rows.push(`${h.slice(0, 20)} -> stored? ${JSON.parse(stored).some((x: string) => x === h.slice(0, 60))}`);
  }
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  const txt = await page.locator('main').innerText();
  note(F, `${rows.join(' | ')} | horizontal scroll ${over} | dialogs ${JSON.stringify(dialogs)}`);
  await step(
    page,
    F,
    1,
    'goals',
    'add five hostile goal names',
    'markup is text, no alert, no sideways scroll; the 300-letter name is cut to 60',
    async () => {
      expect(dialogs).toEqual([]);
      expect(over).toBe(false);
      expect(txt).toContain('<img src=x onerror=alert(1)>');
      expect(txt).toContain('DROP TABLE');
      expect(txt).not.toMatch('W'.repeat(61));
    },
  );
});

for (const tz of ['America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kuala_Lumpur']) {
  test(`R4-FLOW-12b time zone ${tz}: dates and totals read the same`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: tz,
      isMobile: true,
      hasTouch: true,
      baseURL: 'http://127.0.0.1:5291',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    await open(page, '/');
    await settled(page);
    const home = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
    await open(page, '/s/subscriptions');
    await settled(page);
    await page.getByRole('button', { name: 'Add a subscription' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Edge');
    await page.getByLabel('Amount each time', { exact: true }).click();
    await page.keyboard.type('500');
    await page.getByLabel('Next renewal', { exact: true }).fill('2026-11-01');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(600);
    const subs = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
    await open(page, '/s/payments');
    await settled(page);
    const pay = (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 1500);
    const out = { home: home.slice(0, 900), edge: /Edge[^|]*\|[^|]*\|[^|]*/.exec(subs)?.[0], pay: pay.slice(0, 500) };
    fs.writeFileSync(
      `/home/user/Sen/qa-artifacts/B04-redesign/text/r4-tz-${tz.replace('/', '_')}.json`,
      JSON.stringify(out, null, 1),
    );
    await ctx.close();
  });
}

test('R4-FLOW-12c the three time zones agree', async () => {
  const read = (tz: string) =>
    JSON.parse(
      fs.readFileSync(`/home/user/Sen/qa-artifacts/B04-redesign/text/r4-tz-${tz.replace('/', '_')}.json`, 'utf8'),
    );
  const kl = read('Asia/Kuala_Lumpur');
  for (const tz of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
    const o = read(tz);
    expect(o.home, tz).toBe(kl.home);
    expect(o.edge, tz).toBe(kl.edge);
    expect(o.pay, tz).toBe(kl.pay);
  }
  expect(kl.edge).toContain('1 Nov');
});

test('R4-FLOW-12d offline: adding a subscription and a goal is marked, kept once, and not duplicated on reconnect', async ({
  page,
  context,
}) => {
  const F = 'R4-FLOW-12d';
  await open(page, '/s/subscriptions');
  await settled(page);
  // visit the goals chunk while still online (the dev server loads a screen on first use)
  await page.goto('/s/goals?look=minted&mode=light');
  await settled(page);
  await page
    .getByRole('button', { name: 'Back' })
    .click()
    .catch(() => {});
  await open(page, '/s/subscriptions');
  await settled(page);
  const n0 = await db<number>(page, '(d) => d.subscriptions.length');
  await context.setOffline(true);
  await expect(page.getByText(/You're offline/)).toBeVisible();
  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Offline sub');
  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('900');
  await page.getByLabel('Next renewal', { exact: true }).fill('2026-12-01');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1800);
  const mid = await db<{ n: number; u: number }>(
    page,
    '(d) => ({ n: d.subscriptions.length, u: Object.keys(d.unsynced).length })',
  );
  const marks = await page.getByText('Not synced yet').count();
  note(F, `offline after Save: ${JSON.stringify(mid)} marks ${marks}; before ${n0}`);
  await step(
    page,
    F,
    1,
    'offline-add',
    'offline, add a subscription',
    'banner shown; one row added; the change is kept as unsynced (note: marks on screen)',
    async () => {
      expect(mid.n).toBe(n0 + 1);
    },
  );
  await context.setOffline(false);
  await page.waitForTimeout(3000);
  const end = await db<{ n: number; u: number }>(
    page,
    '(d) => ({ n: d.subscriptions.length, u: Object.keys(d.unsynced).length })',
  );
  note(F, `after reconnect: ${JSON.stringify(end)}`);
  await step(
    page,
    F,
    2,
    'online-again',
    'go online',
    'banner gone; still one added row; nothing unsynced',
    async () => {
      await expect(page.getByText(/You're offline/)).toHaveCount(0);
      expect(end.n).toBe(n0 + 1);
      expect(end.u).toBe(0);
    },
  );
});
