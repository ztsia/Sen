import { test } from '@playwright/test';
import { text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5182' });
test('state param in production', async ({ page }) => {
  for (const r of ['/', '/?state=offline', '/?state=error', '/?state=loading', '/?state=empty']) {
    await page.goto(r);
    await page.waitForTimeout(900);
    console.log(r.padEnd(18), JSON.stringify((await text(page)).split('\n').filter(Boolean).slice(0, 4)));
  }
});
