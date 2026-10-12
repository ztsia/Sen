import { test } from '@playwright/test';
import { open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('F15 copy amount', async ({ page }) => {
  await open(page, '/s/claims');
  const ids = await page.evaluate(async () => {
    const m: any = await import(/* @vite-ignore */ '/src/data/index.ts');
    return (await (await m.backend()).claimList()).claims.map((c: any) => [c.id, c.scheme, c.period, c.amount]);
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [id, scheme, period, amount] of ids as [string, string, string, number][]) {
    await open(page, `/s/claim?id=${id}`);
    const labels = await page
      .getByRole('button', { name: /^Copy/ })
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const btn = page.getByRole('button', { name: /^Copy Amount/ });
    await btn.click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const shown = (await text(page))
      .split('\n')
      .filter((l) => /^\d+\.\d\d$/.test(l.trim()) || /^RM/.test(l.trim()))
      .slice(0, 3)
      .join(' / ');
    console.log(
      scheme,
      period,
      'amount sen',
      amount,
      '| copy labels',
      JSON.stringify(labels),
      '| clipboard',
      JSON.stringify(clip),
      '| shown',
      shown,
    );
  }
  await shot(page, 'R2-F15-step-1-claim-copy');
});
