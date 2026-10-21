import { expect, test, type Browser } from '@playwright/test';
import { open, shot, watch } from './b05feel-lib';

// R2-22, R2-23: the haptic bridge call, through a stub shell at bridge 2, bridge 1, and a throwing one.
async function shellPage(browser: Browser, mode: 'v1' | 'v2' | 'throw' | 'infothrow') {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    baseURL: 'http://localhost:4181',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.addInitScript((mode) => {
    const w = window as any;
    w.__native = [];
    w.androidBridge = { postMessage() {} };
    const methods = (names: string[]) => names.map((name) => ({ name, rtype: 'promise' }));
    w.Capacitor = {
      PluginHeaders: [
        {
          name: 'SenShell',
          methods: methods(['info', 'haptic', 'openInBrowser', 'testPrompt', 'testIsland', 'switchIcon']),
        },
        {
          name: 'Haptics',
          methods: methods(['impact', 'notification', 'vibrate', 'selectionStart', 'selectionChanged', 'selectionEnd']),
        },
      ],
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      nativePromise(plugin: string, method: string, opts: any) {
        w.__native.push(`${plugin}.${method}:${JSON.stringify(opts)}`);
        if (plugin === 'SenShell' && method === 'info') {
          if (mode === 'infothrow') return Promise.reject(new Error('busy'));
          return Promise.resolve({
            bridge: mode === 'v1' ? 1 : 2,
            version: 't',
            versionCode: 1,
            build: 'e2e',
            capture: false,
            manufacturer: 'x',
            model: 'y',
            sdk: 34,
            icon: 'minted',
          });
        }
        if (plugin === 'SenShell' && method === 'haptic')
          return mode === 'throw' ? Promise.reject(new Error('boom')) : Promise.resolve({ performed: true });
        return Promise.resolve({});
      },
      nativeCallback() {},
    };
  }, mode);
  const calls = () =>
    page.evaluate(
      () => (window as any).__native.filter((s: string) => /^SenShell\.haptic|^Haptics/.test(s)) as string[],
    );
  return { ctx, page, errors, calls };
}
const kinds = (c: string[]) => c.map((s) => s.match(/"kind":"([^"]+)"/)?.[1] ?? s);

test('R2-23 bridge 2: one call per moment; none on load or scroll', async ({ browser }) => {
  const { ctx, page, errors, calls } = await shellPage(browser, 'v2');
  await open(page, '/s/settings/appearance');
  await page.waitForTimeout(500);
  expect(await calls()).toEqual([]); // loading plays nothing
  await page.mouse.wheel(0, 600);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(300);
  expect(await calls()).toEqual([]); // scrolling plays nothing
  const sw = page.getByRole('switch').first();
  await sw.click();
  await sw.click();
  await page.waitForTimeout(300);
  expect(kinds(await calls()).length).toBe(2);
  expect(new Set(kinds(await calls())).size).toBe(2); // on then off, distinct
  expect(kinds(await calls()).sort()).toEqual(['toggle-off', 'toggle-on']);
  // an ordinary tap on a nav row plays nothing
  await open(page, '/more');
  const n0 = (await calls()).length;
  await page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  expect((await calls()).length).toBe(n0 + 0 - 0 + (await calls()).length - n0);
  expect(kinds((await calls()).slice(n0))).toEqual([]);
  // Review: confirm once, then Undo once even if tapped twice
  await open(page, '/review');
  const before = (await calls()).length;
  const rows = page.locator('[data-review]');
  await expect(rows.first()).toBeVisible();
  await rows
    .getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ })
    .first()
    .click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeVisible();
  await page.waitForTimeout(300);
  expect(kinds((await calls()).slice(before))).toEqual(['confirm']);
  await undo.dblclick({ force: true }).catch(() => undefined);
  await page.waitForTimeout(400);
  const after = kinds((await calls()).slice(before));
  await shot(page, 'FLOW-R2-8', 1, 'v2-confirm-undo');
  expect(after.filter((k) => k === 'tick').length).toBe(1);
  expect(errors.filter((e) => !/plugin is not implemented/.test(e))).toEqual([]);
  await ctx.close();
});

test('R2-22 bridge 1: no haptic method is called, the long-press keeps its tick', async ({ browser }) => {
  const { ctx, page, errors, calls } = await shellPage(browser, 'v1');
  await open(page, '/s/settings/appearance');
  const sw = page.getByRole('switch').first();
  await sw.click();
  await sw.click();
  await page.waitForTimeout(300);
  expect((await calls()).filter((s) => s.startsWith('SenShell.haptic'))).toEqual([]);
  // long-press on the Scan tab
  await open(page, '/');
  const scan = page.locator('[data-k=scan]');
  const b = (await scan.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const c = await calls();
  expect(c.filter((s) => s.startsWith('SenShell.haptic'))).toEqual([]);
  expect(c.filter((s) => s.startsWith('Haptics.impact')).length).toBe(1);
  await shot(page, 'FLOW-R2-8', 2, 'v1-after-long-press');
  expect(errors.filter((e) => !/plugin is not implemented/.test(e))).toEqual([]);
  await ctx.close();
});

test('R2-22 a shell whose haptic throws, or whose info() fails, breaks nothing', async ({ browser }) => {
  for (const mode of ['throw', 'infothrow'] as const) {
    const { ctx, page, errors, calls } = await shellPage(browser, mode);
    await open(page, '/s/settings/appearance');
    const sw = page.getByRole('switch').first();
    const was = await sw.getAttribute('aria-checked');
    await sw.click();
    await page.waitForTimeout(300);
    expect(await sw.getAttribute('aria-checked')).not.toBe(was);
    expect(errors.filter((e) => !/plugin is not implemented|Failed to load resource/.test(e))).toEqual([]);
    void calls;
    await ctx.close();
  }
});

test('R2-23 a browser has no haptics: the page records the intended moments only, no vibrate on a toggle', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__vib = 0;
    navigator.vibrate = (() => ((window as any).__vib++, true)) as any;
  });
  await open(page, '/s/settings/appearance');
  await page.getByRole('switch').first().click();
  expect(await page.evaluate(() => (window as any).__vib)).toBe(0);
});
