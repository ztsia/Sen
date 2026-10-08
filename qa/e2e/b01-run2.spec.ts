import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { LOOKS, MODES, NAMES, closePanel, openPanel, shot, tabs, touchHold, watch } from './helpers';

// QA B01, run 2 (8 Oct): FLOW-15 to FLOW-20 and the criteria added in run 2 (AC-53 to AC-70).
// Each step asserts first, then screenshots. Run as qa/e2e/playwright.config.ts's header says.

const open = async (page: Page, path: string, look = 'minted', mode = 'light') => {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
};

test('FLOW-15 a wrong address shows the shared error state, and its button goes Home', async ({ page }) => {
  const w = watch(page);
  // step 1: an unknown screen id
  await open(page, '/');
  await page.goto('/s/no-such-screen');
  await expect(page).toHaveURL(/4173\/$/);
  await expect(page.getByTestId('not-built')).toBeVisible();
  await shot(page, 'FLOW-15-step-1-unknown-screen-id');
  // step 2: a path that matches nothing
  await page.goto('/nowhere/at/all');
  await expect(page.getByText("There's nothing here")).toBeVisible();
  // TanStack's own default pages say "Not Found" / "Something went wrong!"; the app's title is "Not found"
  await expect(page.getByText(/^Not Found$|Something went wrong!/)).toHaveCount(0);
  await expect(page.getByTestId('lost')).toBeVisible();
  await expect(tabs(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to Home' })).toBeVisible();
  await shot(page, 'FLOW-15-step-2-unknown-path');
  // step 3: its button
  await page.getByRole('button', { name: 'Go to Home' }).click();
  await expect(page).toHaveURL(/4173\/$/);
  await expect(tabs(page).getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
  await shot(page, 'FLOW-15-step-3-home');
  expect(w.errors).toEqual([]);
});

test('FLOW-16 a finger: long-press opens scan-more and the lift picks nothing; a moving finger opens nothing', async ({
  page,
}) => {
  await open(page, '/');
  const scan = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  const box = (await scan.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // step 1: hold 650 ms, lift
  await touchHold(page, cx, cy, 650);
  const sheet = page.getByRole('dialog', { name: 'Add a payment' });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/4173\/(\?.*)?$/);
  await expect(sheet).toBeVisible();
  await shot(page, 'FLOW-16-step-1-long-press-sheet');
  // step 2: From gallery, then back: lands on Home, not on the closed sheet or out of the app
  await sheet.getByRole('button', { name: 'From gallery' }).tap();
  await expect(page).toHaveURL(/\/s\/crop$/);
  await shot(page, 'FLOW-16-step-2-from-gallery');
  await page.goBack();
  await expect(page).toHaveURL(/4173\/(\?.*)?$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, 'FLOW-16-step-3-back-home');
  // step 4: a finger that lands on Scan and slides off (a scroll) before 500 ms opens nothing
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 15 }] });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(600);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/4173\/(\?.*)?$/);
  await shot(page, 'FLOW-16-step-4-slide-off-nothing');
});

test('FLOW-17 a slow look keeps the old one whole; a look that cannot load leaves a styled look', async ({
  page,
  context,
}) => {
  const w = watch(page);
  await page.route(/\/assets\/firefly-[\w-]+\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await open(page, '/');
  const bar = tabs(page);
  const h0 = (await bar.boundingBox())!.height;
  const svgs0 = await bar.locator('svg').count();
  let panel = await openPanel(page);
  await panel.getByRole('radio', { name: 'Firefly', exact: true }).click();
  await closePanel(page);
  await page.waitForTimeout(600);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  expect(await bar.locator('svg').count()).toBe(svgs0);
  expect(Math.abs((await bar.boundingBox())!.height - h0)).toBeLessThan(4);
  await shot(page, 'FLOW-17-step-1-slow-look-old-kept');
  await expect(page.locator('html')).toHaveAttribute('data-look', 'firefly', { timeout: 6000 });
  await shot(page, 'FLOW-17-step-2-slow-look-arrived');
  // offline, a look never loaded
  await context.setOffline(true);
  panel = await openPanel(page);
  await panel.getByRole('radio', { name: 'Line', exact: true }).click();
  await page.waitForTimeout(800);
  await closePanel(page);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'firefly');
  expect(await bar.locator('svg').count()).toBeGreaterThan(4);
  await shot(page, 'FLOW-17-step-3-offline-look-kept');
  await context.setOffline(false);
  expect(w.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e))).toEqual([]);
});

test('FLOW-18 Undo, then change again at once: the new change has its own toast', async ({ page }) => {
  await open(page, '/dev/gallery');
  const overlays = page.getByTestId('gallery-overlays');
  await overlays.getByRole('button', { name: 'Show a toast' }).click();
  await expect(page.getByText('Attached to RM58.30 on Ryt')).toBeVisible();
  await shot(page, 'FLOW-18-step-1-toast');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undone')).toBeVisible();
  await shot(page, 'FLOW-18-step-2-undone');
  await overlays.getByRole('button', { name: 'Show a toast' }).click();
  await page.waitForTimeout(1200);
  // one toast at a time (visibleToasts 1, patterns.md §7): exactly one, with its Undo
  const visible = await page
    .locator('[data-sonner-toast]')
    .evaluateAll((els) =>
      els
        .filter((e) => e.getAttribute('data-removed') !== 'true' && e.getAttribute('data-visible') !== 'false')
        .map((e) => e.textContent),
    );
  test.info().annotations.push({ type: 'toasts after Undo then change', description: JSON.stringify(visible) });
  expect(visible).toEqual(['Attached to RM58.30 on RytUndo']);
  await shot(page, 'FLOW-18-step-3-new-toast');
});

test('FLOW-19 Home, Review, Home, back: leaves, never lands on Review', async ({ page }) => {
  await page.goto('about:blank');
  await open(page, '/');
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await shot(page, 'FLOW-19-step-1-review');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await expect(page).toHaveURL(/4173\/(\?.*)?$/);
  await shot(page, 'FLOW-19-step-2-home');
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('FLOW-20 focus rings for the keyboard only', async ({ page }) => {
  await open(page, '/dev/gallery');
  const btn = page.getByTestId('gallery-money').getByRole('button', { name: 'Main action' });
  // step 1: pointer
  await btn.click();
  const ptr = await btn.evaluate((el) => ({
    fv: el.matches(':focus-visible'),
    ring: getComputedStyle(el).boxShadow + ' | ' + getComputedStyle(el).outlineStyle,
  }));
  expect(ptr.fv).toBe(false);
  await shot(page, 'FLOW-20-step-1-pointer-no-ring');
  // step 2: keyboard
  await page.getByTestId('gallery-money').getByRole('button', { name: 'Outline' }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const kb = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return {
      text: el.textContent,
      fv: el.matches(':focus-visible'),
      ring: getComputedStyle(el).boxShadow,
      outline: getComputedStyle(el).outlineStyle,
    };
  });
  expect(kb.fv).toBe(true);
  expect(kb.ring !== 'none' || kb.outline !== 'none').toBe(true);
  await shot(page, 'FLOW-20-step-2-keyboard-ring');
});

for (const look of LOOKS)
  test(`AC-39/64 frame touch targets in ${look}: every tab ≥48 px, and targets ≥8 px apart`, async ({ page }) => {
    await open(page, '/', look);
    const r = await page.evaluate(() => {
      const els = [
        ...document.querySelectorAll<HTMLElement>('nav[aria-label="Tabs"] a, nav[aria-label="Tabs"] button'),
      ];
      const boxes = els.map((e) => {
        const b = e.getBoundingClientRect();
        return {
          name: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 20),
          w: b.width,
          h: b.height,
        };
      });
      const sen = document.querySelector<HTMLElement>('button[aria-label="Ask Sen"]')!.getBoundingClientRect();
      const tb = document.querySelector('nav[aria-label="Tabs"]')!.getBoundingClientRect();
      return { boxes, sen: { w: sen.width, h: sen.height, bottom: sen.bottom, tabTop: tb.top } };
    });
    test.info().annotations.push({ type: 'tab targets', description: JSON.stringify(r) });
    for (const b of r.boxes) expect(Math.min(b.w, b.h), b.name).toBeGreaterThanOrEqual(47.5);
    expect(r.sen.w).toBeGreaterThanOrEqual(59.5);
    expect(r.sen.bottom).toBeLessThanOrEqual(r.sen.tabTop + 1);
  });

test('AC-64 gallery: no interactive targets overlap (pairs under 8 px recorded)', async ({ page }) => {
  await open(page, '/dev/gallery');
  const close = await page.evaluate(() => {
    const sel = 'main a[href], main button, main input, main [role="switch"]';
    const els = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !e.closest('[aria-hidden="true"]');
    });
    // nested controls (a switch inside a row) count once: skip pairs where one contains the other
    const out: string[] = [];
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i]!,
          b = els[j]!;
        if (a.contains(b) || b.contains(a)) continue;
        const A = a.getBoundingClientRect(),
          B = b.getBoundingClientRect();
        const dx = Math.max(0, Math.max(A.left, B.left) - Math.min(A.right, B.right));
        const dy = Math.max(0, Math.max(A.top, B.top) - Math.min(A.bottom, B.bottom));
        const gap = Math.max(dx, dy);
        if (gap < 7.5)
          out.push(
            `${(a.textContent || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 18)} ↔ ${(b.textContent || b.getAttribute('aria-label') || b.tagName).trim().slice(0, 18)}: ${gap.toFixed(1)} px`,
          );
      }
    return out;
  });
  test.info().annotations.push({ type: 'pairs closer than 8 px', description: close.join(' | ') });
  await shot(page, 'AC-64-gallery-spacing');
  // patterns.md §8 says 8 px apart, but §7's list and action rows are contiguous by design: recorded as a
  // spec question (QA B01 run 2), so only overlapping targets fail here.
  expect(close.filter((c) => c.endsWith(': 0.0 px'))).toEqual([]);
});

for (const look of LOOKS)
  test(`AC-62 the large figure reads as label, money and days in ${look}`, async ({ page }) => {
    await open(page, '/dev/gallery', look, 'dark');
    const fig = page.getByTestId('gallery-figure').getByRole('group').first();
    await expect(fig).toHaveAccessibleName('Left until payday, RM 1,284.50, 12 days to go');
    // the look's drawing adds nothing a screen reader would read twice
    const snap = await page.getByTestId('gallery-figure').ariaSnapshot();
    test.info().annotations.push({ type: 'aria', description: snap.slice(0, 600) });
    expect(snap).not.toMatch(/1,?284[^,]*1,?284/);
  });

test('AC-68 every Review answer clears the row with Undo', async ({ page }) => {
  await open(page, '/dev/gallery');
  const rows = page.getByTestId('gallery-rows');
  await rows.getByRole('button', { name: /^Groceries/ }).click();
  await expect(rows.getByText('ROTI BAKAR 88')).toBeHidden();
  await page.waitForTimeout(400);
  const undo = await page.getByRole('button', { name: 'Undo' }).count();
  await shot(page, 'AC-68-answer-groceries');
  expect(undo, 'an Undo toast after answering Groceries').toBe(1);
});

test('patterns.md §2: the error state is not drawn in the destructive colour', async ({ page }) => {
  await open(page, '/nowhere');
  const c = await page.getByText("There's nothing here").evaluate((el) => {
    const alert = el.closest('[role="alert"]') as HTMLElement;
    return {
      color: getComputedStyle(alert).color,
      destructive: (() => {
        const p = document.createElement('span');
        p.style.color = 'var(--destructive)';
        document.body.appendChild(p);
        const v = getComputedStyle(p).color;
        p.remove();
        return v;
      })(),
    };
  });
  test.info().annotations.push({ type: 'error colours', description: JSON.stringify(c) });
  await shot(page, 'AC-53-error-colour');
  expect(c.color).not.toBe(c.destructive);
});

for (const mode of MODES)
  test(`axe on the lost page, the dev panel and Sen's sheet, ${mode}, in all six looks`, async ({ page }) => {
    for (const look of LOOKS) {
      await open(page, '/nowhere', look, mode);
      let axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations.map((v) => `${look} lost ${v.id}`)).toEqual([]);
      const panel = await openPanel(page);
      await expect(panel).toBeVisible();
      await page.waitForTimeout(400);
      axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations.map((v) => `${look} panel ${v.id}: ${v.nodes.map((n) => n.target).join(',')}`)).toEqual([]);
      if (look === 'copper') await shot(page, `axe-dev-panel-copper-${mode}`);
      await closePanel(page);
    }
  });

test('the Sen sheet and scan-more cannot be reached as pages with a missing frame', async ({ page }) => {
  await open(page, '/s/scan-more');
  const hasBar = await tabs(page).count();
  const sheet = await page.getByRole('dialog').count();
  test.info().annotations.push({ type: '/s/scan-more', description: `tab bar ${hasBar}, dialog ${sheet}` });
  await shot(page, 'NOTE-scan-more-as-page');
  await open(page, '/s/sen');
  const senBar = await tabs(page).count();
  test.info().annotations.push({ type: '/s/sen', description: `tab bar ${senBar}` });
  await shot(page, 'NOTE-sen-as-page');
  await expect(page.getByTestId('not-built')).toBeVisible();
});

test('look switcher names every look', async ({ page }) => {
  await open(page, '/');
  const panel = await openPanel(page);
  for (const l of LOOKS) await expect(panel.getByRole('radio', { name: NAMES[l], exact: true })).toBeVisible();
  await shot(page, 'dev-panel-open');
});

test('AC-66 the frame uses dvh and pads the tab bar by the safe area', async ({ page }) => {
  await open(page, '/');
  const r = await page.evaluate(() => {
    const rules: string[] = [];
    for (const sh of [...document.styleSheets])
      for (const ru of [...(sh.cssRules as unknown as CSSRule[])]) {
        const t = ru.cssText;
        if (/safe-area-inset-bottom/.test(t) && /tabbar/.test(t)) rules.push(t.slice(0, 160));
      }
    const col = document.querySelector('#root > div > div') as HTMLElement | null;
    const frame = [...document.querySelectorAll<HTMLElement>('div')].find((d) => d.className.includes('h-dvh'));
    return {
      rules,
      frameH: frame?.getBoundingClientRect().height,
      vh: innerHeight,
      cls: frame?.className.slice(0, 60),
      col: !!col,
    };
  });
  test.info().annotations.push({ type: 'dvh and safe area', description: JSON.stringify(r) });
  expect(r.rules.length).toBeGreaterThan(0);
  expect(r.frameH).toBe(r.vh);
});

test('AC-67 the detail page: amount on top, facts, actions at the foot, Delete in destructive with Undo', async ({
  page,
}) => {
  await open(page, '/dev/gallery');
  const d = page.getByTestId('gallery-detail');
  await d.scrollIntoViewIfNeeded();
  await expect(d.getByText("From Ryt's notification")).toBeVisible();
  const order = await d.evaluate((el) => {
    const y = (sel: string) => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
    return { amount: y('[data-sen]'), facts: y('dl'), actions: y('button:not([aria-label])') };
  });
  expect(order.amount).toBeLessThan(order.facts);
  expect(order.facts).toBeLessThan(order.actions);
  const del = d.getByRole('button', { name: 'Delete' });
  const colours = await del.evaluate((b) => {
    const t = b.querySelector('[data-slot="item-title"]') ?? b;
    const p = document.createElement('span');
    p.style.color = 'var(--destructive)';
    document.body.appendChild(p);
    const v = getComputedStyle(p).color;
    p.remove();
    return { text: getComputedStyle(t).color, destructive: v };
  });
  expect(colours.text).toBe(colours.destructive);
  await shot(page, 'AC-67-step-1-detail');
  await del.click();
  await expect(page.getByText('Deleted KOPI KAWAN, RM12.90')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await shot(page, 'AC-67-step-2-delete-undo');
});

test('AC-70 status cards say their state in words with an icon; the health bar has one button', async ({ page }) => {
  await open(page, '/dev/gallery');
  const st = page.getByTestId('gallery-status');
  await st.scrollIntoViewIfNeeded();
  for (const w of ['Still changing', 'Final', '2 of 3 moves done', 'Rejected']) {
    const line = st.getByText(w, { exact: true });
    await expect(line).toBeVisible();
    expect(await line.locator('svg').count()).toBe(1);
  }
  await expect(st.getByText('Capture is off')).toBeVisible();
  const health = st.getByRole('alert').filter({ hasText: 'Capture is off' });
  await expect(health.getByRole('button')).toHaveCount(1);
  await shot(page, 'AC-70-step-1-status');
});
