import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// The eyes pass (run 3) read filmstrips taken at 4x CPU with video on. For each "wrong" or doubtful
// strip: measure it without the video, head against main, motion on.
const SIDES = [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const;
async function ctxFor(browser: any, base: string, rate: number) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    baseURL: base,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  return {
    ctx,
    page,
    throttle: async () => (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate }),
  };
}

for (const [name, base] of SIDES) {
  test(`E-A Home to Insights tab: tap to content (${name}, 4x)`, async ({ browser }) => {
    test.setTimeout(120_000);
    const out: number[][] = [];
    for (let i = 0; i < 5; i++) {
      const { ctx, page, throttle } = await ctxFor(browser, base, 4);
      await open(page, '/');
      await page.waitForTimeout(1500);
      await throttle();
      await page.evaluate(() => {
        const w = window as any;
        w.__a = { down: 0, skel: -1, content: -1, path: -1 };
        addEventListener(
          'pointerdown',
          (e) => {
            w.__a.down = e.timeStamp;
            const iv = setInterval(() => {
              const t = Math.round(performance.now() - e.timeStamp);
              if (location.pathname === '/insights' && w.__a.path < 0) w.__a.path = t;
              const sk = document.querySelectorAll('main [data-slot=skeleton], main [role=status]').length;
              if (w.__a.path >= 0 && sk > 0 && w.__a.skel < 0) w.__a.skel = t;
              if (w.__a.path >= 0 && sk === 0 && w.__a.content < 0 && document.body.innerText.includes('Am I on track'))
                w.__a.content = t;
              if (t > 4000) clearInterval(iv);
            }, 10);
          },
          { capture: true },
        );
      });
      await page.locator('[data-k=insights]').click();
      await page.waitForTimeout(4200);
      const a = await page.evaluate(() => (window as any).__a);
      out.push([a.path, a.skel, a.content]);
      await ctx.close();
    }
    console.log(`TABINSIGHTS ${name}: [path changed, skeleton seen, content (ms after tap)] ${JSON.stringify(out)}`);
  });

  test(`E-B Review hawker: tap Groceries to row cleared and toast (${name}, 4x)`, async ({ browser }) => {
    test.setTimeout(120_000);
    const out: any[] = [];
    for (let i = 0; i < 4; i++) {
      const { ctx, page, throttle } = await ctxFor(browser, base, 4);
      await open(page, '/review');
      await page.waitForFunction(() => document.querySelector('[data-review]'));
      await page.waitForTimeout(1500);
      await page
        .locator('[data-review]', { hasText: 'SITI AMINAH BT YUSOF' })
        .getByRole('button', { name: 'Other…' })
        .click();
      await page.getByRole('dialog').getByRole('button', { name: 'Groceries' }).waitFor();
      await page.waitForTimeout(1500);
      await throttle();
      await page.evaluate(() => {
        const w = window as any;
        w.__b = { titles: [] as any[], toast: -1, rowGone: -1, dialogGone: -1 };
        addEventListener(
          'pointerdown',
          (e) => {
            const iv = setInterval(() => {
              const t = Math.round(performance.now() - e.timeStamp);
              const d = document.querySelector('[role=dialog]');
              const title = d?.querySelector('h2')?.textContent ?? null;
              const last = w.__b.titles[w.__b.titles.length - 1];
              if (!last || last[1] !== title) w.__b.titles.push([t, title]);
              if (w.__b.toast < 0 && document.querySelector('[data-sonner-toast]')) w.__b.toast = t;
              if (
                w.__b.rowGone < 0 &&
                ![...document.querySelectorAll('[data-review]')].some((r) => r.textContent!.includes('SITI AMINAH'))
              )
                w.__b.rowGone = t;
              if (w.__b.dialogGone < 0 && !d) w.__b.dialogGone = t;
              if (t > 3000) clearInterval(iv);
            }, 10);
          },
          { capture: true },
        );
      });
      await page.getByRole('dialog').getByRole('button', { name: 'Groceries' }).click();
      await page.waitForTimeout(3200);
      out.push(await page.evaluate(() => (window as any).__b));
      await ctx.close();
    }
    console.log(`HAWKER2 ${name}: ${JSON.stringify(out)}`);
  });

  test(`E-C Undo lag on a payment's category (${name}, 4x)`, async ({ browser }) => {
    test.setTimeout(120_000);
    const out: any[] = [];
    for (let i = 0; i < 3; i++) {
      const { ctx, page, throttle } = await ctxFor(browser, base, 4);
      await open(page, '/s/payments');
      await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
      await page.getByRole('searchbox', { name: 'Search payments' }).fill('NASI KANDAR ABC');
      await page
        .getByRole('button', { name: /^NASI KANDAR ABC/i })
        .first()
        .click();
      await page.waitForURL(/\/s\/txn/);
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: 'Meals' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Drinks & desserts' }).click();
      await page.getByRole('button', { name: 'From now on' }).click();
      await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).waitFor();
      await page.waitForTimeout(1500);
      await throttle();
      await page.evaluate(() => {
        const w = window as any;
        w.__c = { toastGone: -1, meals: -1 };
        addEventListener(
          'pointerdown',
          (e) => {
            const iv = setInterval(() => {
              const t = Math.round(performance.now() - e.timeStamp);
              const has = [...document.querySelectorAll('main button')].some((b) =>
                /^Meals/.test(b.textContent!.trim()),
              );
              if (w.__c.meals < 0 && has) w.__c.meals = t;
              if (
                w.__c.toastGone < 0 &&
                ![...document.querySelectorAll('[data-sonner-toast]')].some((x) =>
                  x.textContent!.includes('from now on'),
                )
              )
                w.__c.toastGone = t;
              if (t > 3000) clearInterval(iv);
            }, 10);
          },
          { capture: true },
        );
      });
      await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).click();
      await page.waitForTimeout(3200);
      out.push(await page.evaluate(() => (window as any).__c));
      await ctx.close();
    }
    console.log(`UNDOLAG ${name}: ${JSON.stringify(out)}`);
  });

  test(`E-D a toast over an opened sheet (${name})`, async ({ browser }) => {
    const { ctx, page } = await ctxFor(browser, base, 1);
    await open(page, '/review');
    await page.waitForFunction(() => document.querySelector('[data-review]'));
    await page
      .getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ })
      .first()
      .click();
    await page.locator('[data-sonner-toast]').waitFor();
    await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-sonner-toast]');
      const d = document.querySelector('[role=dialog]')!;
      const tb = t?.getBoundingClientRect();
      const db = d.getBoundingClientRect();
      const overlap = tb ? Math.max(0, Math.min(tb.bottom, db.bottom) - Math.max(tb.top, db.top)) : 0;
      const btns = [...d.querySelectorAll('button')].map((b) => {
        const r = b.getBoundingClientRect();
        const top = document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)[0];
        return {
          label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24),
          covered: !!top && !b.contains(top) && !!t && t.contains(top),
        };
      });
      return { toast: !!t, overlapPx: Math.round(overlap), covered: btns.filter((b) => b.covered) };
    });
    console.log(`TOASTOVERSHEET ${name}: ${JSON.stringify(r)}`);
    await page.screenshot({ path: `${process.env.QA_SCREENS}/FLOW-R3-8-step-1-toast-over-sheet-${name}.png` });
    await ctx.close();
  });
}
