import { expect, test } from '@playwright/test';
import { db, open, settled, shot } from './b04r-helpers';

test.use({ baseURL: 'http://127.0.0.1:5291' });

const EMPTY: [string, string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['insights', '/insights'],
  ['more', '/more'],
  ['payments', '/s/payments'],
  ['accounts', '/s/accounts'],
  ['claims', '/s/claims'],
  ['shared', '/s/shared'],
  ['budgets', '/s/budgets'],
  ['subscriptions', '/s/subscriptions'],
  ['goals', '/s/goals'],
  ['memory', '/s/agent/memory'],
  ['research', '/s/agent/research'],
  ['usage', '/s/agent/usage'],
  ['skipped', '/s/skipped'],
  ['members', '/s/settings/members'],
  ['categories', '/s/settings/categories'],
  ['balance-check', '/s/balance-check'],
  ['year', '/s/insights/year'],
  ['settings-claims', '/s/settings/claims'],
  ['email', '/s/settings/email'],
  ['payday', '/s/payday'],
];

test('FLOW-17 empty states: icon, title, one line, one button', async ({ page }) => {
  const rows: string[] = [];
  for (const [name, path] of EMPTY) {
    await open(page, `${path}?state=empty`);
    await settled(page);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const main = document.querySelector('main') as HTMLElement;
      const empties = [...main.querySelectorAll('[data-slot="empty"], [data-empty], [data-testid="empty"]')];
      const buttons = [...main.querySelectorAll('button, a[href]')]
        .map((b) => (b as HTMLElement).innerText.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      return { text: main.innerText.replace(/\n+/g, ' / ').slice(0, 220), empties: empties.length, buttons };
    });
    rows.push(`${name}: empties=${info.empties} buttons=${JSON.stringify(info.buttons)} text=${info.text}`);
    await shot(page, `FLOW-17-empty-${name}`);
  }
  console.log(rows.join('\n'));
});

test('FLOW-18 offline: Review answer, banner, Not synced yet, reload, once', async ({ page, context }) => {
  await open(page, '/review');
  const needs = page.getByRole('heading', { name: /Needs you/ });
  await expect(needs).toHaveText('Needs you · 12');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-18-step-1-offline');
  console.log(
    'banner:',
    (await page.locator('body').innerText()).match(/offline|connection|Not synced[^\n]*/gi)?.slice(0, 3),
  );
  await page.locator('[data-review="new-merchant"]').first().getByRole('button', { name: 'Meals' }).click();
  await expect(needs).toHaveText('Needs you · 11');
  await page.waitForTimeout(6500);
  await shot(page, 'FLOW-18-step-3-after-6s');
  const text = await page.locator('body').innerText();
  console.log('after 6s mentions Not synced yet:', /Not synced yet/.test(text));
  const q = JSON.parse(
    await db<string>(page, '(db)=>JSON.stringify({unsynced:db.unsynced?.length??db.unsynced, rules:db.rules.length})'),
  );
  console.log('db', JSON.stringify(q));
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(2500);
  const q2 = JSON.parse(
    await db<string>(page, '(db)=>JSON.stringify({unsynced:db.unsynced?.length??db.unsynced, rules:db.rules.length})'),
  );
  console.log('db online', JSON.stringify(q2));
  await shot(page, 'FLOW-18-step-5-online');
  expect(q2.rules).toBe(1);
});

test('FLOW-19 timezone: totals do not move', async ({ browser }) => {
  const out: Record<string, string> = {};
  for (const tz of ['Asia/Kuala_Lumpur', 'America/Los_Angeles', 'Pacific/Auckland']) {
    const ctx = await browser.newContext({
      timezoneId: tz,
      viewport: { width: 390, height: 844 },
      baseURL: 'http://127.0.0.1:5291',
    });
    const page = await ctx.newPage();
    await open(page, '/');
    await page.waitForTimeout(400);
    const home =
      (await page.getByTestId('hero').innerText()).replace(/\s+/g, ' ') +
      ' | ' +
      (await page.getByTestId('pace').innerText()).replace(/\s+/g, ' ').slice(0, 60);
    await page.goto('/s/payments?look=minted&mode=light');
    await page.waitForTimeout(800);
    const days = (await page.locator('main').innerText()).split('\n').slice(0, 14).join(' / ');
    out[tz] = `${home} || ${days}`;
    await shot(page, `FLOW-19-${tz.replace('/', '_')}`);
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  const vals = Object.values(out);
  expect(vals[1]).toBe(vals[0]);
  expect(vals[2]).toBe(vals[0]);
});
