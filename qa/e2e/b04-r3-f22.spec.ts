import { test } from '@playwright/test';
import { open, text, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const L = async (p: import('@playwright/test').Page, n = 20) => (await text(p)).split('\n').filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^\d+$/.test(l)).slice(0, n).join(' | ');
test('F22 friend email, claims-off text, closed-link date, toast on crop', async ({ page }) => {
  await open(page, '/s/settings?scenario=month');
  console.log('friend Account row:', (await L(page, 30)).match(/Account \| [^|]*/)?.[0]);
  await open(page, '/s/claims?scenario=month');
  console.log('friend claims empty:', (await L(page, 4)));
  await open(page, '/s/claims?scenario=cap');
  console.log('owner (cap) claims first lines:', (await L(page, 4)).slice(0, 120));
  const closed = await page.evaluate(async () => {
    const m: any = await import(/* @vite-ignore */ '/src/data/fake/public-split.ts');
    return JSON.stringify(m.readPublicSplit('demo-closed'));
  });
  console.log('closed view:', closed);
  console.log('unknown token view at:', JSON.parse(await page.evaluate(async () => JSON.stringify((await import(/* @vite-ignore */ '/src/data/fake/public-split.ts') as any).readPublicSplit('zzz'))) as string).at);
  // toast on crop
  const F = (n: string, b: string) => ({ name: n, mimeType: 'image/jpeg', buffer: Buffer.from(b) });
  await open(page, '/scan');
  await page.getByTestId('scan-camera').setInputFiles(F('a.jpg', 'receipt-A'));
  await page.getByRole('button', { name: 'Use this' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).click();
  await page.waitForTimeout(600);
  await page.getByTestId('scan-camera').setInputFiles(F('a.jpg', 'receipt-A'));
  await page.waitForTimeout(800);
  console.log('toast (same file):', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
  await page.getByTestId('scan-camera').setInputFiles(F('b.jpg', 'receipt-B'));
  await page.waitForTimeout(1200);
  const u = page.getByRole('button', { name: 'Use this' });
  if (await u.count()) { await u.click(); await page.waitForTimeout(1200); }
  console.log('after different file: path', new URL(page.url()).pathname, '| toasts', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
  await shot(page, 'R3-F22-step-1-no-stale-toast');
});
test('prod ignores ?state=expired', async ({ page }) => {
  await page.goto('http://127.0.0.1:5182/s/sign-in?state=expired');
  await page.waitForTimeout(900);
  console.log('PROD sign-in expired:', (await L(page, 4)));
});

test('dismissToast does not eat an earlier Undo toast', async ({ page }) => {
  const F = (n: string, b: string) => ({ name: n, mimeType: 'image/jpeg', buffer: Buffer.from(b) });
  await open(page, '/scan');
  await page.getByTestId('scan-camera').setInputFiles(F('a.jpg', 'receipt-A2'));
  await page.getByRole('button', { name: 'Use this' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(900);
  console.log('after Done toasts:', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).click();
  await page.waitForTimeout(500);
  console.log('on scan page, toasts:', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
  await page.getByTestId('scan-camera').setInputFiles(F('b.jpg', 'receipt-B2'));
  await page.waitForTimeout(1200);
  const u = page.getByRole('button', { name: 'Use this' });
  if (await u.count()) await u.click();
  await page.waitForTimeout(900);
  console.log('after picking a new file, toasts:', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()), '(the earlier Attached/Undo toast was up for 6 s)');
});
