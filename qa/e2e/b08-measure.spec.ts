import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// QA B08: what the console says on the three screens the metrics flagged, and scan-after's timeline after
// *Use this*, with the CPU slowed 4× as the metrics run does, on main (:4175) and this branch (:4176).
const OUT = '../../qa-artifacts/B08_first-run-accounts/measure.jsonl';
const SIDES = { main: 'http://localhost:4175', head: 'http://localhost:4176' };
const SCREENS = [
  '/s/receipt?id=RECEIPT',
  '/s/sign-in',
  '/s/settings/capture/access?scenario=capture-off',
];

async function slow(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

for (const [side, origin] of Object.entries(SIDES)) {
  test(`console on the flagged screens, ${side}`, async ({ page }) => {
    // the receipt's id, as the catalogue makes it
    const { uid } = await import('../../apps/web/src/data/fake/ids');
    await slow(page);
    for (const path of SCREENS) {
      const msgs: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') msgs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
      });
      page.on('pageerror', (e) => msgs.push(`pageerror: ${String(e).slice(0, 300)}`));
      const u = new URL(`${origin}${path.replace('RECEIPT', uid('receipt:nasi-kandar'))}`);
      u.searchParams.set('look', 'minted');
      u.searchParams.set('mode', 'light');
      await page.goto(u.toString());
      await page.waitForTimeout(4000);
      fs.appendFileSync(OUT, JSON.stringify({ side, path, count: msgs.length, msgs: [...new Set(msgs)] }) + '\n');
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
    }
  });

  test(`scan-after timeline, ${side}`, async ({ page }) => {
    await page.goto(`${origin}/?look=minted&mode=light`);
    await page.waitForTimeout(1500);
    await slow(page);
    const [camera] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
    ]);
    await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible({ timeout: 20_000 });
    const t0 = Date.now();
    await page.getByRole('button', { name: 'Use this' }).click();
    const seen: string[] = [];
    let last = '';
    while (Date.now() - t0 < 15_000) {
      const reading = await page.getByText('Reading receipt…').count();
      const now = `${new URL(page.url()).pathname}${reading ? ' +Reading' : ''}`;
      if (now !== last) seen.push(`${Date.now() - t0}ms ${now}`);
      last = now;
      if (now.startsWith('/s/confirm')) break;
      await page.waitForTimeout(50);
    }
    fs.appendFileSync(OUT, JSON.stringify({ side, scanAfter: seen }) + '\n');
  });
}

// As the metrics run opens them: the build already cached by the service worker, then the CPU 4× slower
// on a mobile network (apps/web/e2e/metrics.ts THROTTLE and warmUp).
test.describe('warm, as the metrics run', () => {
  test.use({ serviceWorkers: 'allow' });
  async function warm(page: Page, origin: string) {
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, undefined, { timeout: 20_000 }).catch(() => {});
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 });
  }
  for (const [side, origin] of Object.entries(SIDES)) {
    for (const path of SCREENS)
      test(`warm console ${path}, ${side}`, async ({ page }) => {
        const { uid } = await import('../../apps/web/src/data/fake/ids');
        await warm(page, origin);
        const msgs: string[] = [];
        page.on('console', (m) => {
          if (m.type() === 'error' || m.type() === 'warning') msgs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
        });
        page.on('pageerror', (e) => msgs.push(`pageerror: ${String(e).slice(0, 300)}`));
        await page.goto(`${origin}${path.replace('RECEIPT', uid('receipt:nasi-kandar'))}`);
        await page.waitForTimeout(6000);
        fs.appendFileSync(OUT, JSON.stringify({ warm: true, side, path, count: msgs.length, msgs: [...new Set(msgs)] }) + '\n');
      });
    test(`warm scan-after, ${side}`, async ({ page }) => {
      await warm(page, origin);
      await page.goto(`${origin}/?look=minted&mode=light`);
      await page.waitForTimeout(3000);
      const [camera] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
      ]);
      await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
      await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible({ timeout: 20_000 });
      const t0 = Date.now();
      await page.getByRole('button', { name: 'Use this' }).click();
      const seen: string[] = [];
      let last = '';
      while (Date.now() - t0 < 25_000) {
        const reading = await page.getByText('Reading receipt…').count();
        const now = `${new URL(page.url()).pathname}${reading ? ' +Reading' : ''}`;
        if (now !== last) seen.push(`${Date.now() - t0}ms ${now}`);
        last = now;
        if (now.startsWith('/s/confirm')) break;
        await page.waitForTimeout(50);
      }
      fs.appendFileSync(OUT, JSON.stringify({ warm: true, side, scanAfter: seen }) + '\n');
    });
  }
});
