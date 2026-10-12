import { test } from '@playwright/test';
import { open } from './b04-helpers';
import { smallTargets } from '../../apps/web/e2e/helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
const NK = 'eb9ebb1f-b041-4f7a-8f61-7f84bf03095c';
const ROUTES = [
  '/s/shared',
  `/s/split?id=${NK}`,
  '/s/split-public?id=demo',
  '/s/split-public?id=demo-new',
  '/s/accounts',
  '/s/balance-check',
  '/s/claims',
  '/s/payday',
  '/s/sign-in',
  '/s/first-run',
  '/s/new-look',
  '/s/settings',
  '/s/settings/appearance',
  '/s/settings/you',
  '/s/settings/categories',
  '/s/settings/email',
  '/s/settings/claims',
  '/s/settings/sen',
  '/s/settings/members',
  '/s/settings/data',
  '/s/settings/account',
  '/s/agent/memory',
  '/s/agent/research',
  '/s/agent/usage',
];
test('targets under 48px', async ({ page }) => {
  for (const r of ROUTES) {
    await open(page, r);
    await page.waitForTimeout(500);
    const small = await smallTargets(page);
    console.log(r.padEnd(46), small.length ? JSON.stringify(small).slice(0, 300) : 'ok');
  }
});
