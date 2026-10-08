import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LOOKS, MODES, PROD, openPanel, closePanel, shot, tabs, watch } from './helpers';

// QA B01, flows 8 and 10 to 14 (qa/B01/flows.md), at 412×915.

test('FLOW-8 production opens on Not built yet, pinned, with no dev tools', async ({ page }) => {
  const w = watch(page, PROD);
  await page.goto(`${PROD}/?look=copper&mode=dark`);
  await expect(page.getByTestId('not-built')).toHaveText('Not built yet');
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
  await expect(page.getByText(/is a skeleton/)).toHaveCount(0);
  await expect(page.getByTestId('review-badge')).toHaveCount(0);
  await shot(page, 'FLOW-8-step-1-production-home');

  await page.goto(`${PROD}/dev/gallery`);
  await expect(page).toHaveURL(`${PROD}/`);
  await expect(page.getByTestId('gallery-figure')).toHaveCount(0);
  await shot(page, 'FLOW-8-step-2-gallery-redirects');

  for (const id of ['payments', 'txn', 'claims', 'split-public', 'first-run']) {
    await page.goto(`${PROD}/s/${id}`);
    await expect(page.getByTestId('not-built'), id).toBeVisible();
    await expect(page.locator('[data-sen]'), `${id} shows no amount`).toHaveCount(0);
  }
  await shot(page, 'FLOW-8-step-3-pushed-not-built');

  const devChunks = w.requests.filter((u) => /\/assets\/(gallery|dev-panel)-/.test(u));
  expect(devChunks, 'dev chunks fetched in production').toEqual([]);
  expect(w.external).toEqual([]);
  expect(w.errors).toEqual([]);
});

test('FLOW-8b production bundle carries the gallery and dev panel as chunks', async ({ request }) => {
  const html = await (await request.get(`${PROD}/`)).text();
  const entry = html.match(/assets\/index-[\w-]+\.js/)![0];
  const js = await (await request.get(`${PROD}/${entry}`)).text();
  const refs = [...new Set(js.match(/(gallery|dev-panel)-[\w-]+\.js/g) ?? [])];
  test.info().annotations.push({ type: 'dev chunks referenced from production entry', description: refs.join(', ') });
  for (const r of refs) {
    const res = await request.get(`${PROD}/assets/${r}`);
    test.info().annotations.push({ type: r, description: `${res.status()} ${res.headers()['content-type']}` });
  }
  expect(refs, 'production entry references dev-only chunks').toEqual([]);
});

test('FLOW-10 text scale 1.5×: text really grows, nothing clips, amounts wrap', async ({ page }) => {
  await page.goto('/dev/gallery');
  const rowTitle = page.getByTestId('gallery-rows').getByText('KOPI KAWAN');
  await rowTitle.scrollIntoViewIfNeeded();
  const before = await rowTitle.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const bodyBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  await shot(page, 'FLOW-10-step-0-rows-1x');
  const p = await openPanel(page);
  await p.getByRole('radio', { name: '1.5×' }).click();
  await closePanel(page);
  await expect(page.locator('html')).toHaveAttribute('style', /--text-scale: 1\.5/);
  const after = await rowTitle.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const bodyAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  test
    .info()
    .annotations.push({ type: 'font sizes', description: `row ${before}→${after}, body ${bodyBefore}→${bodyAfter}` });
  expect(after / before).toBeCloseTo(1.5, 1);

  for (const look of LOOKS) {
    const pp = await openPanel(page);
    await pp.getByRole('radio', { name: look[0]!.toUpperCase() + look.slice(1), exact: true }).click();
    await closePanel(page);
    await expect(page.locator('html')).toHaveAttribute('data-look', look);
    await page.waitForTimeout(300);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page scrolls sideways ${doc.scrollWidth}`);
      for (const el of document.querySelectorAll<HTMLElement>('[data-sen]')) {
        let q: HTMLElement | null = el;
        while (q && q !== document.body) {
          const cs = getComputedStyle(q);
          if (cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' && q.scrollWidth > q.clientWidth)
            out.push(`amount ellipsised: ${el.textContent}`);
          q = q.parentElement;
        }
        const r = el.getBoundingClientRect();
        const main = document.querySelector('main')!.getBoundingClientRect();
        if (r.right > main.right + 1)
          out.push(`amount runs off the column: ${el.textContent} ${r.right} > ${main.right}`);
      }
      for (const el of document.querySelectorAll<HTMLElement>('main *')) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
          continue;
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' || el.closest('.sr-only')) continue;
        if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 2)
          out.push(`clipped: ${el.tagName} "${el.textContent?.trim().slice(0, 40)}"`);
      }
      return out;
    });
    expect(problems, `${look}: ${problems.join('\n')}`).toEqual([]);
  }
  await page.getByTestId('gallery-rows').scrollIntoViewIfNeeded();
  await shot(page, 'FLOW-10-step-1-rows-1-5x');
  await page.getByTestId('gallery-figure').scrollIntoViewIfNeeded();
  await shot(page, 'FLOW-10-step-2-figure-1-5x');
  await page.goto('/');
  await shot(page, 'FLOW-10-step-3-tabbar-1-5x');
  // the tab labels still fit at 1.5×
  const clipped = await tabs(page).evaluate((n) =>
    [...n.querySelectorAll<HTMLElement>('.tl')]
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.textContent),
  );
  expect(clipped).toEqual([]);
});

for (const tz of ['Asia/Kuala_Lumpur', 'America/Los_Angeles'])
  test.describe(`FLOW-11 timezone ${tz}`, () => {
    test.use({ timezoneId: tz });
    test('the day header shows the KL date', async ({ page }) => {
      await page.goto('/dev/gallery');
      const head = page.getByTestId('gallery-rows').locator('h3').first();
      await head.scrollIntoViewIfNeeded();
      const local = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
      expect(local).toBe(tz);
      await expect(head).toHaveText('Thu, 8 Oct');
      await shot(page, `FLOW-11-step-1-day-header-${tz.replace('/', '-')}`);
    });
  });

test('FLOW-12 going offline', async ({ page, context }) => {
  const w = watch(page);
  await page.goto('/');
  await expect(page.getByTestId('not-built')).toBeVisible();
  await context.setOffline(true);
  await page.waitForTimeout(500);
  const banner = await page.getByText(/You're offline/).count();
  test.info().annotations.push({ type: 'offline banner on Home while offline', description: String(banner) });
  await shot(page, 'FLOW-12-step-1-offline-home');

  // a look not loaded yet, chosen while offline
  const p = await openPanel(page);
  await p.getByRole('radio', { name: 'Copper', exact: true }).click();
  await closePanel(page);
  await page.waitForTimeout(800);
  const tabbarSvgs = await tabs(page).locator('svg').count();
  test.info().annotations.push({ type: 'offline: copper chosen, tab svgs', description: String(tabbarSvgs) });
  test.info().annotations.push({ type: 'offline errors', description: w.errors.join(' | ') });
  await shot(page, 'FLOW-12-step-2-offline-switch-look');
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .tap();
  await expect(page).toHaveURL(/\/review$/);
  await shot(page, 'FLOW-12-step-3-offline-tab-still-works');

  await context.setOffline(false);
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-12-step-4-online-again');
  expect(banner, 'no offline banner appears when the connection drops').toBeGreaterThan(0);
});

test.describe('FLOW-14 accessibility beyond the gallery', () => {
  for (const look of LOOKS)
    for (const mode of MODES)
      test(`${look} ${mode}: axe on Home, Review, More, a pushed screen, Scan, and the open sheets`, async ({
        page,
      }) => {
        const report: string[] = [];
        const scan = async (where: string) => {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          for (const v of r.violations)
            report.push(`${where}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
        };
        for (const path of ['/', '/review', '/more', '/s/payments', '/scan']) {
          await page.goto(`${path}?look=${look}&mode=${mode}`);
          await expect(page.locator('html')).toHaveAttribute('data-look', look);
          await page.waitForTimeout(250);
          await scan(path);
        }
        await page.goto(`/?look=${look}&mode=${mode}`);
        await page.getByRole('button', { name: 'Ask Sen' }).tap();
        await expect(page.getByRole('dialog', { name: 'Sen' })).toBeVisible();
        await page.waitForTimeout(400);
        await scan('sen sheet');
        await page.goBack();
        const p = await openPanel(page);
        await page.waitForTimeout(400);
        await scan('dev panel');
        void p;
        await closePanel(page);
        if (look === 'copper' || look === 'firefly') await shot(page, `FLOW-14-step-1-${look}-${mode}-home`);
        expect(report, report.join('\n')).toEqual([]);
      });

  test('48 px targets on the frame, the sheets and the dev panel', async ({ page }) => {
    const small: string[] = [];
    const measure = async (where: string) => {
      const r = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            'a[href], button, input, [role="switch"], [role="radio"], [role="button"], [tabindex]:not([tabindex="-1"])',
          ),
        ]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
            if (el.closest('[aria-hidden="true"], .sr-only')) return false;
            return r.width < 47.5 || r.height < 47.5;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`;
          }),
      );
      small.push(...r.map((s) => `${where}: ${s}`));
    };
    await page.goto('/');
    await measure('home');
    await page.getByRole('button', { name: 'Ask Sen' }).tap();
    await page.waitForTimeout(400);
    await measure('sen sheet');
    await page.goBack();
    await openPanel(page);
    await page.waitForTimeout(400);
    await measure('dev panel');
    await shot(page, 'FLOW-14-step-2-dev-panel-targets');
    expect([...new Set(small)], [...new Set(small)].join('\n')).toEqual([]);
  });
});

test('web behaviour (patterns.md §10)', async ({ page }) => {
  await page.goto('/dev/gallery');
  await expect(page.getByTestId('gallery-forms')).toBeVisible();
  const got = await page.evaluate(() => {
    const h = getComputedStyle(document.documentElement);
    const b = getComputedStyle(document.body);
    const input = document.querySelector('input')!;
    const ev = (t: Element) => {
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      t.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const p = document.querySelector('main h2, main h3, main p, p')!;
    return {
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
      htmlOverscroll: h.overscrollBehaviorY,
      bodyOverscroll: b.overscrollBehaviorY,
      callout: b.getPropertyValue('-webkit-touch-callout'),
      tapHighlight: b.getPropertyValue('-webkit-tap-highlight-color'),
      touchAction: b.touchAction,
      bodyUserSelect: b.userSelect || b.getPropertyValue('-webkit-user-select'),
      inputUserSelect:
        getComputedStyle(input).userSelect || getComputedStyle(input).getPropertyValue('-webkit-user-select'),
      ctxOnText: ev(p),
      ctxOnInput: ev(input),
      mainOverscroll: getComputedStyle(document.querySelector('main')!).overscrollBehaviorY,
    };
  });
  test.info().annotations.push({ type: 'web behaviour', description: JSON.stringify(got) });
  expect(got.viewport).toBe(
    'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
  );
  expect(got.htmlOverscroll).toBe('none');
  expect(got.bodyOverscroll).toBe('none');
  expect(got.mainOverscroll).toBe('contain');
  expect(got.tapHighlight).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(got.touchAction).toBe('manipulation');
  expect(got.bodyUserSelect).toBe('none');
  expect(got.inputUserSelect).not.toBe('none');
  expect(got.ctxOnText).toBe(true);
  expect(got.ctxOnInput).toBe(false);
});

test('CSP blocks a planted inline script, in production', async ({ page }) => {
  await page.goto(`${PROD}/`);
  await expect(page.getByTestId('not-built')).toBeVisible();
  // page.evaluate itself runs outside the page's CSP, so plant a <script> and see whether it runs
  const ran = await page.evaluate(async () => {
    const s = document.createElement('script');
    s.textContent = 'window.__planted = 1';
    document.head.appendChild(s);
    await new Promise((r) => setTimeout(r, 200));
    return (window as unknown as { __planted?: number }).__planted === 1;
  });
  expect(ran, 'a planted inline script ran').toBe(false);
  await shot(page, 'CSP-step-1-inline-script-blocked');
});
