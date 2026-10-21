import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { open } from './b05feel-lib';

// R2-11 survey: what looks tappable (cursor: pointer) on every screen, and has no ripple host.
const reg = readFileSync('../../apps/web/src/screens/registry.ts', 'utf8');
const ids = [...reg.matchAll(/^\s*s\('([^']+)',\s*'[^']*',\s*'(tab|pushed|task|outside)'/gm)].map((m) => m[1]!);

test('R2-11 survey: nothing that looks tappable lacks a ripple host', async ({ page }) => {
  test.setTimeout(600_000);
  const missing: Record<string, string[]> = {};
  const paths = ['/', '/review', '/insights', '/more', ...ids.map((i) => `/s/${i}`)];
  for (const p of paths) {
    await open(page, p).catch(() => undefined);
    const miss = await page.evaluate(() => {
      const TAPPABLE =
        'button, summary, a[href], label[for], [role=button], [role=tab], [role=radio], [role=menuitem], [role=menuitemradio], [role=option]';
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        if (el.closest(TAPPABLE) || el.closest('[data-no-press],[data-slot=switch],[data-slot=checkbox]')) continue;
        if (
          el.matches('input,textarea,select') ||
          el.closest('label')?.querySelector('[role=checkbox],[role=switch]')
        ) {
          out.push(
            `LABEL-WITH-CONTROL ${el.tagName}.${String(el.className).slice(0, 50)}|${(el.textContent ?? '').slice(0, 24)}`,
          );
          continue;
        }
        out.push(`${el.tagName}.${String(el.className).slice(0, 50)}|${(el.textContent ?? '').slice(0, 24)}`);
      }
      return [...new Set(out)];
    });
    if (miss.length) missing[p] = miss;
  }
  console.log('SURVEY', ids.length, JSON.stringify(missing, null, 1));
  expect(Object.keys(missing)).toEqual([]);
});
