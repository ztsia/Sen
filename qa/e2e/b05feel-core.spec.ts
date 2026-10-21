import { expect, test } from '@playwright/test';
import { open, shot, watch } from './b05feel-lib';

// Core journeys with motion ON (AC-33): scan-after and pay-new, as docs/flows.md writes them.
test('FLOW-13 core scan-after with motion on', async ({ page, browser }) => {
  const errors = watch(page);
  await open(page, '/');
  const [camera] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
  ]);
  await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
  await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  await shot(page, 'FLOW-13', 1, 'crop');
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText('Reading receipt…')).toBeVisible({ timeout: 5000 });
  await shot(page, 'FLOW-13', 2, 'reading');
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
  await shot(page, 'FLOW-13', 3, 'confirm');
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('RM21.38');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('[data-sonner-toast]')).toContainText('Attached to RM64.13 on Ryt Bank');
  await shot(page, 'FLOW-13', 4, 'attached-with-undo');
  console.log('errors', JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test('FLOW-13b the same under a 4x slower CPU, motion on', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await open(page, '/');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const [camera] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
  ]);
  await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
  await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  await page.getByRole('button', { name: 'Use this' }).click();
  // poll the DOM for the reading text, every 25 ms, for 4 s
  const seen = await page.evaluate(
    () =>
      new Promise<{ reading: number; urls: string[] }>((res) => {
        let reading = 0;
        const urls: string[] = [];
        const t0 = performance.now();
        const tick = () => {
          if (document.body.innerText.includes('Reading receipt')) reading++;
          if (urls[urls.length - 1] !== location.pathname) urls.push(location.pathname);
          if (performance.now() - t0 < 4000) setTimeout(tick, 25);
          else res({ reading, urls });
        };
        tick();
      }),
  );
  console.log('throttled: polls seeing Reading receipt:', seen.reading, 'paths', JSON.stringify(seen.urls));
});
