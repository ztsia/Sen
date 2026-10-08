import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LOOKS, MODES, open, smallTargets, watchErrors } from './helpers';

// B01 done-when 1, 2 and 5: the gallery shows every building block in all six looks, light and dark;
// axe passes contrast and labels in all twelve; every interactive element is at least 48 px; and at
// text scale 1.5× nothing clips and no amount is truncated.

const SECTIONS = ['figure', 'sen', 'money', 'rows', 'detail', 'forms', 'overlays', 'status', 'states', 'charts'];

for (const look of LOOKS)
  for (const mode of MODES) {
    test.describe(`${look}, ${mode}`, () => {
      test('the gallery shows every building block, and axe finds nothing', async ({ page }) => {
        const errors = watchErrors(page);
        await open(page, '/dev/gallery', look, mode);
        for (const s of SECTIONS) await expect(page.getByTestId(`gallery-${s}`)).toBeVisible();
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const report = axe.violations.map(
          (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        );
        expect(report, report.join('\n')).toEqual([]);
        expect(errors).toEqual([]);
      });

      test('every interactive element is at least 48 px', async ({ page }) => {
        await open(page, '/dev/gallery', look, mode);
        const small = await smallTargets(page);
        expect(small, small.join('\n')).toEqual([]);
      });
    });
  }

test('at text scale 1.5×, nothing in the gallery clips and amounts wrap rather than truncate', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  for (const look of LOOKS) {
    await open(page, '/dev/gallery', look, 'light');
    await expect(page.locator('html')).toHaveAttribute('style', /--text-scale: 1\.5/);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 1)
        out.push(`the page scrolls sideways: ${doc.scrollWidth} > ${doc.clientWidth}`);
      // an amount is never truncated: no ellipsis on it or its parents, and it isn't cut by overflow
      for (const el of document.querySelectorAll<HTMLElement>('[data-sen]')) {
        let p: HTMLElement | null = el;
        while (p && p !== document.body) {
          const cs = getComputedStyle(p);
          if (cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible')
            out.push(`an amount is inside an ellipsis: ${el.textContent}`);
          p = p.parentElement;
        }
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
          out.push(`an amount is cut off: ${el.textContent}`);
      }
      // text in headings, labels and buttons isn't cut off
      for (const el of document.querySelectorAll<HTMLElement>('main h2, main h3, main button, main label, main p')) {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis') continue; // a merchant name may truncate, by design
        if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2))
          out.push(`clipped: ${el.tagName} "${el.textContent?.slice(0, 40)}"`);
      }
      return out;
    });
    expect(problems, `${look}: ${problems.join('\n')}`).toEqual([]);
  }
});
