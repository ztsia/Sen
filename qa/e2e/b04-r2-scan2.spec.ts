import { test } from '@playwright/test';
import { open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
const F = (name: string, body: string) => ({ name, mimeType: 'image/jpeg', buffer: Buffer.from(body) });
const toasts = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();
async function pick(page: import('@playwright/test').Page, f: ReturnType<typeof F>, first = false) {
  if (first) await open(page, '/scan');
  else if (!/\/scan$/.test(new URL(page.url()).pathname)) await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).click();
  await page.waitForTimeout(600);
  await page.getByTestId('scan-camera').setInputFiles(f);
  await page.waitForTimeout(1200);
  const use = page.getByRole('button', { name: 'Use this' });
  if (await use.count()) { await use.click(); await page.waitForTimeout(1500); }
  return `${new URL(page.url()).pathname} | toasts ${JSON.stringify(await toasts(page))}`;
}
test('F19 attacks', async ({ page }) => {
  console.log('1 A first             ', await pick(page, F('a.jpg', 'receipt-A'), true));
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(1200);
  console.log('2 A again             ', await pick(page, F('a.jpg', 'receipt-A')));
  console.log('3 A renamed           ', await pick(page, F('renamed.jpg', 'receipt-A')));
  console.log('4 B (different bytes) ', await pick(page, F('b.jpg', 'receipt-B')));
  // leave B without Done, scan B again
  await page.getByRole('button', { name: 'Back' }).first().click({ timeout: 3000 }).catch(() => console.log('no back'));
  await page.waitForTimeout(800);
  console.log('url after back', new URL(page.url()).pathname);
  if (!/\/scan$/.test(new URL(page.url()).pathname)) await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).click({ timeout: 3000 }).catch(() => console.log('no scan tab'));
  console.log('5 B again, left unfinished', await pick(page, F('b.jpg', 'receipt-B')));
  await shot(page, 'R2-F19-step-3-unfinished-rescan');
  await page.getByRole('button', { name: 'Done', exact: true }).click().catch(() => console.log('no Done'));
  await page.waitForTimeout(1200);
  console.log('6 after Done on the second B draft:', JSON.stringify(await toasts(page)));
});
test('F19 gallery path and by-hand', async ({ page }) => {
  console.log('1 first', await pick(page, F('g.jpg', 'receipt-G'), true));
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(1200);
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).click();
  await page.waitForTimeout(600);
  const gallery = page.getByTestId('scan-gallery');
  console.log('gallery input present', await gallery.count());
  if (await gallery.count()) { await gallery.setInputFiles(F('g.jpg', 'receipt-G')); await page.waitForTimeout(1500); console.log('gallery same file toasts', JSON.stringify(await toasts(page)), new URL(page.url()).pathname); }
});
