import { test } from '@playwright/test';

// own-transfer's "covered" failure (apps/web/e2e/journeys.spec.ts): 3 of 40 on head, 0 of 40 on main.
// What covers the Public Bank -> Ryt Bank row after the search is filled?
test('own-transfer step 2, repeated, with the cover dumped', async ({ browser }) => {
  test.setTimeout(500_000);
  let bad = 0;
  const N = Number(process.env.N ?? 40);
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      serviceWorkers: 'block',
      baseURL: process.env.BASE ?? 'http://localhost:4181',
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto('/review?look=minted&mode=light');
    const row = page.locator('[data-review="transfer-missing"]').filter({ hasText: 'from your own name' });
    await row.waitFor();
    await row.getByRole('button', { name: /Public Bank/ }).click();
    await page.locator('[data-sonner-toast]').first().waitFor();
    await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /^More/ }).click();
    await page.getByText('Payments', { exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
    await page
      .getByRole('button', { name: /^Public Bank → Ryt Bank/ })
      .first()
      .waitFor();
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button')].find((b) =>
        /^Public Bank → Ryt Bank/.test(b.textContent ?? ''),
      ) as HTMLElement;
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!top || top === el || el.contains(top)) return null;
      const path = (e: Element | null) => {
        const p: string[] = [];
        while (e && p.length < 8) {
          p.push(
            e.tagName.toLowerCase() +
              (e.getAttribute('data-slot') ? `[${e.getAttribute('data-slot')}]` : '') +
              (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''),
          );
          e = e.parentElement;
        }
        return p.join(' < ');
      };
      const same = [...document.querySelectorAll('button')]
        .filter((b) => /^Public Bank → Ryt Bank/.test(b.textContent ?? ''))
        .map((b) => {
          const q = b.getBoundingClientRect();
          return [Math.round(q.top), Math.round(q.height), b === el];
        });
      const rows = [...document.querySelectorAll('main [data-index], main [data-slot=item]')].length;
      return {
        cover: path(top),
        coverText: top.textContent?.slice(0, 40),
        buttons: same,
        rect: [Math.round(r.top), Math.round(r.height)],
        topRect: (() => {
          const q = top.getBoundingClientRect();
          return [Math.round(q.top), Math.round(q.height)];
        })(),
        rows,
        anims: document
          .getAnimations()
          .map((a) => (a.effect as any)?.target?.tagName + ':' + (a as any).animationName + ':' + a.playState),
      };
    });
    if (info) {
      bad++;
      console.log('COVERED', i, JSON.stringify(info));
    }
    await ctx.close();
  }
  console.log('covered', bad, 'of', N);
});
