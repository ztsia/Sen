import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { shot } from './b02-helpers';

// AC-8: a new deploy installs alongside and waits; it takes over at the next launch, never mid-session.
// Serves a copy of the production build on :4177 (QA_SITE) and swaps its sw.js under an open page.
const SITE = process.env.QA_SITE!;
const URL4177 = 'http://localhost:4177';

test.use({ baseURL: URL4177, serviceWorkers: 'allow' });

test('AC-8 a new deploy waits for the next launch', async ({ context }) => {
  const swPath = `${SITE}/sw.js`;
  const v1 = fs.readFileSync(swPath, 'utf8');
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('not-built')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    (window as unknown as { __qaMarker: number }).__qaMarker = 42;
  });
  const before = await page.evaluate(() => caches.keys());
  try {
    // deploy v2: a new worker version
    fs.writeFileSync(swPath, v1.replace(/const VERSION = "[0-9a-f]+"/, 'const VERSION = "qa0000000000v002"'));
    const state = await page.evaluate(async () => {
      const reg = (await navigator.serviceWorker.getRegistration())!;
      await reg.update();
      for (let i = 0; i < 100 && !reg.waiting; i++) await new Promise((r) => setTimeout(r, 100));
      return { waiting: !!reg.waiting, activeIsController: reg.active === navigator.serviceWorker.controller, keys: await caches.keys() };
    });
    expect(state.waiting).toBe(true);
    // in-app navigation and a reload of the same page: still v1, the page wasn't swapped under the person
    await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /More/ }).click();
    expect(await page.evaluate(() => (window as unknown as { __qaMarker?: number }).__qaMarker)).toBe(42);
    expect(await page.evaluate(() => caches.keys())).toContain(before[0]);
    await shot(page, 'AC-8-step-1-v2-waiting');
    // the next launch: the last page closes, a new one opens
    await page.close();
    const next = await context.newPage();
    await next.goto('/');
    await expect(next.getByTestId('not-built')).toBeVisible();
    const after = await next.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const k = await caches.keys();
        if (k.includes('sen-qa0000000000v002') && k.length === 1) return k;
        await new Promise((r) => setTimeout(r, 100));
      }
      return caches.keys();
    });
    test.info().annotations.push({ type: 'caches', description: `before ${JSON.stringify(before)} after ${JSON.stringify(after)}` });
    expect(after).toEqual(['sen-qa0000000000v002']);
    await shot(next, 'AC-8-step-2-v2-after-relaunch');
  } finally {
    fs.writeFileSync(swPath, v1);
  }
});
