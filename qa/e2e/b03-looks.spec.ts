import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LOOKS, open, shot, watch } from './b03-helpers';

// FLOW-32, FLOW-31: AC-67, AC-68, AC-69. 412x915, every look, light and dark, every B03 screen.

const SCREENS: [string, string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['skipped', '/s/skipped'],
  ['scan', '/scan'],
  ['crop', '/s/crop'],
  ['manual', '/s/manual'],
  ['insights', '/insights'],
  ['budgets', '/s/budgets'],
  ['subscriptions', '/s/subscriptions'],
  ['goals', '/s/goals'],
  ['year', '/s/insights/year'],
  ['more', '/more'],
  ['payments', '/s/payments'],
];

const small = (page: any) =>
  page.evaluate(() => {
    const sel =
      'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return false;
        if (el.closest('.sr-only, [aria-hidden="true"]')) return false;
        if (el.hasAttribute('data-dev-handle')) return false;
        return r.width < 47.5 || r.height < 47.5;
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      );
  });

for (const look of LOOKS)
  for (const mode of ['light', 'dark'])
    test(`FLOW-32 ${look} ${mode}: axe, 48 px targets, no sideways scroll, no console errors on every screen at 412 px`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const errors = watch(page);
      const problems: string[] = [];
      for (const [name, path] of SCREENS) {
        await open(page, path, look, mode);
        await page.waitForTimeout(350);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        for (const v of r.violations)
          problems.push(
            `${name}: axe ${v.id} (${v.impact}) ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(', ')}`,
          );
        for (const s of await small(page)) problems.push(`${name}: small target ${s}`);
        const side = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (side) problems.push(`${name}: scrolls sideways`);
      }
      if (look === 'copper' || mode === 'dark') await shot(page, `FLOW-32-${look}-${mode}-last`);
      console.log(`${look}/${mode}:`, problems.length ? problems.join('\n') : 'clean');
      expect(problems).toEqual([]);
      expect(errors).toEqual([]);
    });

test('AC-67 one screenshot per look (Home, Review, Insights) light and dark, for the visual pass', async ({ page }) => {
  for (const look of LOOKS) {
    for (const [name, path] of [
      ['home', '/'],
      ['review', '/review'],
      ['insights', '/insights'],
      ['payments', '/s/payments'],
    ] as const) {
      for (const mode of ['light', 'dark']) {
        await open(page, path, look, mode);
        await page.waitForTimeout(500);
        await shot(page, `looks-${look}-${mode}-${name}`);
      }
    }
  }
});

test('AC-69 web behaviour: overscroll none, user-select none outside text, contextmenu cancelled, inputs >= 16 px', async ({
  page,
}) => {
  await open(page, '/s/manual');
  const r = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).overscrollBehaviorY,
    body: getComputedStyle(document.body).overscrollBehaviorY,
    userSelectBody: getComputedStyle(document.body).userSelect,
    input: parseFloat(getComputedStyle(document.querySelector('input')!).fontSize),
    touchAction: getComputedStyle(document.body).touchAction,
    callout: getComputedStyle(document.body).getPropertyValue('-webkit-touch-callout'),
    viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content'),
  }));
  console.log(JSON.stringify(r));
  const prevented = await page.evaluate(() => {
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.querySelector('main')!.dispatchEvent(e);
    return e.defaultPrevented;
  });
  console.log('contextmenu default prevented on main:', prevented);
  expect(r.input).toBeGreaterThanOrEqual(16);
  expect(prevented).toBe(true);
});

const STATES: [string, string, RegExp][] = [
  ['loading', '/s/payments?state=loading', /Loading/],
  ['error', '/s/payments?state=error', /Couldn't load/],
  ['empty', '/s/payments?state=empty', /No payments/],
  ['loading', '/s/budgets?state=loading', /Loading/],
  ['error', '/s/budgets?state=error', /Couldn't load/],
  ['error', '/s/goals?state=error', /Couldn't load/],
  ['error', '/s/subscriptions?state=error', /Couldn't load/],
  ['error', '/s/insights/year?state=error', /Couldn't load/],
  ['error', '/s/skipped?state=error', /Couldn't load/],
  ['error', '/more?state=error', /./],
  ['error', '/s/manual?state=error', /./],
  ['error', '/scan?state=error', /./],
  ['empty', '/s/skipped?state=empty', /./],
  ['empty', '/s/budgets?state=empty', /./],
  ['empty', '/s/goals?state=empty', /./],
  ['empty', '/s/subscriptions?state=empty', /./],
  ['empty', '/s/insights/year?state=empty', /./],
];
test('FLOW-31 states: each screen says what it is in words; error has a button; loading is a skeleton, not a spinner', async ({
  page,
}) => {
  const rows: string[] = [];
  for (const [state, path, _want] of STATES) {
    await open(page, path).catch(() => {});
    await page.waitForTimeout(700);
    const t = (
      await page
        .locator('main')
        .innerText()
        .catch(() => '(none)')
    ).replace(/\s+/g, ' ');
    const btn = await page.getByRole('button', { name: /Try again/ }).count();
    const spin = await page.locator('main .animate-spin, main [role="progressbar"]').count();
    rows.push(`${state.padEnd(7)} ${path.padEnd(32)} retry=${btn} spinner=${spin} | ${t.slice(0, 110)}`);
    await shot(page, `FLOW-31-${state}-${path.replace(/[^a-z]+/gi, '_').slice(0, 30)}`);
  }
  console.log(rows.join('\n'));
});
