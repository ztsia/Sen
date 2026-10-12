import { test } from '@playwright/test';
import { open, shot, text, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('unknown ids', async ({ page }) => {
  const w = watch(page);
  for (const p of ['claim', 'claim?id=nope', 'account', 'account?id=nope', 'split', 'split?id=nope', 'split?id=%3Cb%3Ex', 'split-public', 'split-public?id=../../etc/passwd', 'split-public?id=' + 'a'.repeat(3000), 'txn?id=nope', 'receipt?id=nope']) {
    await page.goto(`/s/${p}${p.includes('?') ? '&' : '?'}look=minted&mode=light`);
    await page.waitForTimeout(2500);
    const t = (await text(page)).split('\n').slice(0, 8).join(' | ');
    console.log('==', p.slice(0, 40), JSON.stringify(t.slice(0, 220)));
    if (p === 'claim' || p === 'account?id=nope') await shot(page, 'AC-16s-' + p.replace(/\W/g, '-'));
  }
  console.log('errors', JSON.stringify(w.errors).slice(0, 600));
});
