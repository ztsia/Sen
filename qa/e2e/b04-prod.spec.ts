import { expect, test } from '@playwright/test';
import { shot, text, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5182' });
test('production shows nothing made up', async ({ page }) => {
  const w = watch(page);
  const routes = ['/', '/dev/gallery', '/s/split-public?id=demo', '/s/shared', '/s/accounts', '/s/claims', '/s/payday', '/s/sign-in', '/s/first-run', '/s/new-look', '/s/settings', '/s/settings/members', '/s/sen', '/?scenario=payday&state=offline', '/s/split?id=eb9ebb1f-b041-4f7a-8f61-7f84bf03095c'];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForTimeout(900);
    const t = (await text(page)).split('\n').filter(Boolean).slice(0, 9).join(' | ');
    const dev = await page.getByRole('button', { name: 'Dev panel' }).count();
    console.log(r.padEnd(40), 'devpanel', dev, '|', t.slice(0, 180));
    if (r === '/s/split-public?id=demo' || r === '/s/payday') await shot(page, 'FLOW-19-prod-' + r.replace(/\W/g, '-'));
    for (const bad of ['Wei Ming', 'RM1,', 'Ryt', 'KEDAI', 'Mei']) expect(t).not.toContain(bad);
  }
  console.log('errors', JSON.stringify(w.errors).slice(0, 400), 'external', JSON.stringify(w.external));
});
