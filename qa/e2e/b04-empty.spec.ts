import { test } from '@playwright/test';
import { shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('empty / loading / error states', async ({ page }) => {
  for (const [r, st] of [
    ['/s/shared', 'empty'],
    ['/s/accounts', 'empty'],
    ['/s/claims', 'empty'],
    ['/s/agent/memory', 'empty'],
    ['/s/agent/research', 'empty'],
    ['/s/agent/usage', 'empty'],
    ['/s/settings/members', 'empty'],
    ['/s/shared', 'error'],
    ['/s/claims', 'error'],
    ['/s/shared', 'loading'],
    ['/s/split-public?id=demo', 'error'],
  ] as const) {
    await page.goto(`${r}${r.includes('?') ? '&' : '?'}state=${st}&look=minted&mode=light`);
    await page.waitForTimeout(900);
    console.log(
      `${r} ${st}`.padEnd(34),
      JSON.stringify(
        (await text(page))
          .split('\n')
          .filter(Boolean)
          .filter((l) => !/EVERY SEN|^Home$|^Review|^Scan$|^Insights$|^More$/.test(l))
          .slice(0, 6),
      ).slice(0, 260),
    );
    if (r === '/s/shared') await shot(page, `AC-66s-shared-${st}`);
  }
});
