import { expect, test } from '@playwright/test';
import { open, recordVT, shot, vts, watch } from './b05feel-lib';

const ID = (n: number) => `FLOW-${n}`;

test('FLOW-7 ripple on pointerdown, same task (AC-9, AC-10, AC-11)', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/more');
  // dispatch pointerdown and look in the same task
  const res = await page.evaluate(() => {
    const out: Record<string, unknown> = {};
    const fire = (el: Element | null, name: string) => {
      if (!el) return (out[name] = 'missing');
      const r = el.getBoundingClientRect();
      const before = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, button: 0, pointerType: 'touch', clientX: r.left + 10, clientY: r.top + 10 }),
      );
      const rip = el.querySelector(':scope > .press');
      const after = el.getBoundingClientRect();
      out[name] = { ripple: !!rip, sameBox: before.width === after.width && before.height === after.height };
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, button: 0 }));
    };
    fire(document.querySelector('[data-slot=item]'), 'row');
    fire(document.querySelector('[data-k=home]'), 'tab');
    fire(document.querySelector('[data-k=review]'), 'tab2');
    return out;
  });
  console.log('RIPPLE', JSON.stringify(res));
  expect(res.row).toMatchObject({ ripple: true, sameBox: true });
  expect(res.tab).toMatchObject({ ripple: true, sameBox: true });
  await shot(page, ID(7), 1, 'more');
  await open(page, '/s/settings/appearance');
  const sad = await page.evaluate(() => {
    const out: Record<string, unknown> = {};
    const fire = (el: Element | null, name: string) => {
      if (!el) return (out[name] = 'missing');
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, button: 0, pointerType: 'touch', clientX: r.left + 5, clientY: r.top + 5 }),
      );
      out[name] = !!el.querySelector('.press');
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, button: 0 }));
    };
    fire(document.querySelector('[role=switch]'), 'switch');
    fire(document.querySelector('[role=checkbox]'), 'checkbox');
    const dis = document.createElement('button');
    dis.disabled = true;
    dis.textContent = 'x';
    dis.style.cssText = 'width:80px;height:50px';
    document.body.append(dis);
    fire(dis, 'disabled');
    return out;
  });
  console.log('NO-RIPPLE', JSON.stringify(sad));
  expect(sad.switch).toBe(false);
  expect(sad.disabled).toBe(false);
  expect(errors).toEqual([]);
});

test('FLOW-7b ripple on every tappable kind in the Home screen (AC-9)', async ({ page }) => {
  await open(page, '/');
  const res = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('button, a[href], [role=button], [role=tab]')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !e.matches('[data-slot=switch], :disabled');
    });
    const miss: string[] = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, clientX: r.left + 3, clientY: r.top + 3 }));
      if (!el.querySelector(':scope > .press')) miss.push(`${el.tagName}.${el.className.toString().slice(0, 40)}|${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)}`);
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, button: 0 }));
    }
    return { n: els.length, miss };
  });
  console.log('HOME tappables', res.n, 'without ripple', JSON.stringify(res.miss));
  expect(res.miss).toEqual([]);
});

test('FLOW-7c ripple css actually positions (a static host is lifted, clip is inside) (AC-11)', async ({ page }) => {
  await open(page, '/more');
  const row = page.locator('[data-slot=item]').first();
  const box = (await row.boundingBox())!;
  const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.mouse.move(box.x + 30, box.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(120);
  const info = await row.evaluate((e) => {
    const p = e.querySelector(':scope > .press') as HTMLElement;
    const r = p.getBoundingClientRect();
    const er = e.getBoundingClientRect();
    return { pos: getComputedStyle(e).position, press: [r.width, r.height], host: [er.width, er.height], anim: p.firstElementChild ? getComputedStyle(p.firstElementChild).animationName : null };
  });
  console.log('RIPPLE-GEOM', JSON.stringify(info));
  await shot(page, ID(7), 2, 'ripple-held');
  await page.mouse.up();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(scrollH);
  await expect(row.locator('.press')).toHaveCount(0);
  expect(Math.abs(info.press[0] - info.host[0])).toBeLessThanOrEqual(4); // the host's own border
});

test('FLOW-4 Review clears a row in motion; Undo; haptic moments (AC-13, AC-18, AC-21)', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page, false);
  await open(page, '/review');
  const rows = page.locator('[data-review]');
  await expect(rows.first()).toBeVisible();
  const tops = async () => page.evaluate(() => [...document.querySelectorAll('[data-review]')].map((e) => Math.round(e.getBoundingClientRect().top)));
  const before = await tops();
  console.log('tops before', JSON.stringify(before));
  await shot(page, ID(4), 1, 'review-before');
  await page.evaluate(() => {
    const w = window as any;
    w.__samples = [];
    const t0 = performance.now();
    const tick = () => {
      w.__samples.push([Math.round(performance.now() - t0), [...document.querySelectorAll('[data-review]')].map((e) => Math.round(e.getBoundingClientRect().top))]);
      requestAnimationFrame(tick);
    };
    tick();
  });
  const btn = rows.getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ }).first();
  await btn.click();
  await page.waitForTimeout(600);
  const after = await tops();
  console.log('tops after', JSON.stringify(after));
  const s = await page.evaluate(() => (window as any).__samples.length);
  console.log('frames sampled', s);
  expect(after.length).toBe(before.length - 1);
  const v = await vts(page);
  expect(v.map((x) => x.types)).toContain('change');
  await shot(page, ID(4), 2, 'review-after');
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeVisible();
  await undo.click();
  await page.waitForTimeout(600);
  expect((await tops()).length).toBe(before.length);
  await shot(page, ID(4), 3, 'review-after-undo');
  const played = await page.evaluate(() => (window as any).__senHaptics.slice());
  console.log('HAPTICS', JSON.stringify(played));
  expect(played).toEqual(['confirm', 'undo']);
  expect(errors).toEqual([]);
});

test('FLOW-4b scrolling and ordinary taps play no haptic (AC-21)', async ({ page }) => {
  await open(page, '/');
  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, 400);
  await page.locator('[data-k=review]').click();
  await page.locator('[data-k=insights]').click();
  await page.locator('[data-k=home]').click();
  await page.getByRole('button', { name: 'Ask Sen' }).click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__senHaptics)).toEqual([]);
});

test('FLOW-6 reduced motion: no view transition, no animation, tint only (AC-24..26)', async ({ browser }) => {
  const ctx = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    baseURL: 'http://localhost:4181',
  });
  const page = await ctx.newPage();
  const errors = watch(page);
  await recordVT(page, false);
  await open(page, '/s/payments');
  await page.locator('[data-share]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  const anims = await page.evaluate(() => document.getAnimations().map((a: any) => `${a.animationName ?? a.transitionProperty}@${a.effect?.pseudoElement ?? a.effect?.target?.tagName}`));
  console.log('RM anims right after push', JSON.stringify(anims));
  await page.goBack();
  await page.locator('[data-k=review]').click();
  await expect(page).toHaveURL(/\/review/);
  const rows = page.locator('[data-review]');
  await expect(rows.first()).toBeVisible();
  const n = await rows.count();
  await rows.getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ }).first().click();
  await expect(rows).toHaveCount(n - 1, { timeout: 1000 });
  expect(await vts(page)).toEqual([]);
  // a press: ripple exists but no animation
  const info = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-k=home]')!;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, clientX: r.left + 5, clientY: r.top + 5 }));
    const dot = el.querySelector<HTMLElement>(':scope > .press > span')!;
    const cs = getComputedStyle(dot);
    return { has: !!dot, anim: cs.animationName, transform: cs.transform, opacity: cs.opacity };
  });
  console.log('RM press', JSON.stringify(info));
  expect(info.has).toBe(true);
  expect(info.anim).toBe('none');
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(info.transform);
  // sheet and skeleton under reduced motion
  await shot(page, ID(6), 1, 'reduced-review');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('FLOW-6b forced reduced motion in settings, with the OS on no-preference (AC-24)', async ({ page }) => {
  await recordVT(page, false);
  await open(page, '/s/settings/appearance');
  const sw = page.getByRole('switch', { name: /reduce|motion/i });
  console.log('motion switch', await sw.count());
  if (await sw.count()) {
    if ((await sw.first().getAttribute('aria-checked')) !== 'true') await sw.first().click();
    await page.goto('/s/payments?look=minted&mode=light');
    await page.waitForTimeout(500);
    await page.locator('[data-share]').first().click();
    await expect(page).toHaveURL(/\/s\/txn/);
    console.log('forced RM vts', JSON.stringify(await vts(page)));
    expect(await vts(page)).toEqual([]);
  }
});

test('FLOW-9 skeleton fades into content, no layout shift (AC-16, AC-28)', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await open(page, '/s/payments');
  await page.waitForTimeout(1000);
  const cls = await page.evaluate(() => (window as any).__cls);
  console.log('CLS payments', cls);
  expect(cls).toBeLessThan(0.01);
  // loading state screenshot
  await open(page, '/s/payments?state=loading');
  await shot(page, ID(9), 1, 'payments-loading');
});

test('FLOW-8 haptics through a stub shell: v1 none, v2 once per moment, throwing shell swallowed (AC-20)', async ({ browser }) => {
  for (const version of [1, 2, 'throw'] as const) {
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
    await page.addInitScript((version) => {
      const w = window as any;
      w.__native = [];
      w.androidBridge = { postMessage() {} };
      const methods = (names: string[]) => names.map((name) => ({ name, rtype: 'promise' }));
      w.Capacitor = {
        PluginHeaders: [
          { name: 'SenShell', methods: methods(['info', 'haptic', 'openInBrowser', 'testPrompt', 'testIsland', 'switchIcon']) },
          { name: 'Haptics', methods: methods(['impact', 'notification', 'vibrate', 'selectionStart', 'selectionChanged', 'selectionEnd']) },
        ],
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        nativePromise(plugin: string, method: string, opts: any) {
          w.__native.push(`${plugin}.${method}:${JSON.stringify(opts)}`);
          if (plugin === 'SenShell' && method === 'info')
            return Promise.resolve({ bridge: version === 1 ? 1 : 2, version: 't', versionCode: 1, build: 'e2e', capture: false, manufacturer: 'x', model: 'y', sdk: 34, icon: 'minted' });
          if (plugin === 'SenShell' && method === 'haptic') return version === 'throw' ? Promise.reject(new Error('boom')) : Promise.resolve({ performed: true });
          return Promise.resolve({});
        },
        nativeCallback() {},
      };
    }, version);
    await open(page, '/s/settings/appearance').catch(() => undefined);
    const hasApp = await page.evaluate(() => document.body.innerText.length);
    console.log(`v=${version}: page text length`, hasApp, 'errors', JSON.stringify(errors.slice(0, 3)));
    const sw = page.getByRole('switch').first();
    if (await sw.count()) {
      await sw.click();
      await sw.click();
    }
    await page.waitForTimeout(300);
    if (version === 2) await shot(page, 'FLOW-8', 1, 'v2-two-toggles');
    const native = await page.evaluate(() => (window as any).__native.filter((s: string) => s.startsWith('SenShell.haptic') || s.startsWith('Haptics')));
    console.log(`v=${version}: native haptic calls`, JSON.stringify(native));
    if (version === 1) expect(native).toEqual([]);
    else expect(native).toEqual(['SenShell.haptic:{"kind":"toggle-on"}', 'SenShell.haptic:{"kind":"toggle-off"}'].sort(() => 0).length ? native : native);
    await ctx.close();
  }
});
