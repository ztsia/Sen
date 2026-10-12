import { test } from '@playwright/test';
import { open } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
for (const r of ['/s/shared', '/s/accounts', '/s/claims', '/s/settings/members', '/s/agent/research', '/s/agent/memory', '/s/settings/categories', '/s/settings']) test(`rows ${r}`, async ({ page }) => {
  await open(page, r);
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => [...document.querySelectorAll('main button, main a[href], main [role="button"], main li')].map((e) => { const b = e.getBoundingClientRect(); return { t: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28), h: Math.round(b.height), w: Math.round(b.width), tag: e.tagName }; }).filter((x) => x.w > 300 && x.h > 20));
  console.log(r.padEnd(24), JSON.stringify(rows.map((x) => `${x.tag}:${x.t}=${x.h}`)).slice(0, 700));
});
