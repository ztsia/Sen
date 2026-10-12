import { test } from '@playwright/test';
import { shot, text, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('F10: ids missing or wrong', async ({ page }) => {
  const w = watch(page);
  for (const p of [
    'claim',
    'claim?id=',
    'claim?id=%20',
    'claim?id=nope',
    'account',
    'account?id=',
    'account?id=nope',
    'split',
    'split?id=',
    'txn',
    'txn?id=',
    'receipt',
    'receipt?id=',
    'goal',
    'goal?id=nope',
    'confirm',
    'reading',
    'split-public',
    'split-public?id=',
  ]) {
    await page.goto(`/s/${p}${p.includes('?') ? '&' : '?'}look=minted&mode=light`);
    await page.waitForTimeout(1800);
    const t = (await text(page))
      .split('\n')
      .filter((l) => l && !/EVERY SEN|^Home$|^Review|^Scan$|^Insights$|^More$|to review|^\d+$/.test(l))
      .slice(0, 4)
      .join(' | ');
    console.log(p.padEnd(18), /Loading/.test(t) ? 'HANGS ' : 'ok    ', t.slice(0, 120));
    if (p === 'claim' || p === 'account') await shot(page, `R2-F10-${p}`);
  }
  console.log('errors', JSON.stringify(w.errors).slice(0, 300));
});
