import { expect, test } from '@playwright/test';
import { LOOKS, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows H: an app bar's title is never cut by its action. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-16 app bar titles next to an action are not truncated, in six looks and two modes', async ({ page }) => {
  const F = 'R4-FLOW-16';
  const cut: string[] = [];
  const paths = [
    '/s/subscriptions',
    '/s/goals',
    '/s/settings/claims',
    '/s/budgets',
    '/s/settings/members',
    '/s/claims',
    '/s/accounts',
    '/s/payments',
  ];
  for (const look of LOOKS) {
    for (const mode of ['light', 'dark']) {
      for (const p of paths) {
        await open(page, p, look, mode);
        const r = await page.evaluate(() => {
          const h = document.querySelector('header h1') as HTMLElement | null;
          return h
            ? { t: h.textContent, cut: h.scrollWidth > h.clientWidth + 1, w: h.clientWidth, sw: h.scrollWidth }
            : null;
        });
        if (r?.cut) cut.push(`${look}-${mode} ${p}: "${r.t}" ${r.sw}>${r.w}`);
      }
    }
  }
  note(F, cut.join(' | ') || 'none cut');
  await open(page, '/s/subscriptions', 'minted', 'light');
  await settled(page);
  await step(
    page,
    F,
    1,
    'subscriptions-minted',
    'read each app bar title with an action',
    'no title is cut by ellipsis',
    async () => {
      expect(cut).toEqual([]);
    },
  );
});
