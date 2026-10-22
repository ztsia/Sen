import { test } from '@playwright/test';
import { open } from './b05feel-lib';
import { uid } from '../../apps/web/src/data/fake/ids';

test('R3-8 debug the label row', async ({ page }) => {
  await open(page, `/s/split?id=${uid('split:bbq')}`);
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const l = [...document.querySelectorAll('label')].find((x) =>
      x.querySelector('[role=checkbox],[role=switch]'),
    ) as HTMLElement;
    const t = (l.querySelector('span') ?? l) as HTMLElement;
    const T =
      'button, summary, a[href], label[for], label:has(input, [role=checkbox], [role=switch], [role=radio]), [role=button], [role=tab], [role=radio], [role=menuitem], [role=menuitemradio], [role=option]';
    const host = t.closest(T);
    return {
      html: l.outerHTML.slice(0, 400),
      hostTag: host?.tagName,
      hostRole: host?.getAttribute('role'),
      hostIsLabel: host === l,
      disabled: host?.matches(':disabled, [aria-disabled=true], [data-disabled]'),
      noPress: !!host?.closest('[data-no-press]'),
      skip: host?.matches('[data-slot=switch], [data-slot=checkbox], [data-no-press], input, textarea, select'),
      rect: JSON.stringify(host?.getBoundingClientRect()),
    };
  });
  console.log('LABELDBG', JSON.stringify(info, null, 1));
  // and a real pointer press on the label text
  const box = (await page
    .locator('label', { has: page.locator('[role=checkbox]') })
    .first()
    .boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(100);
  console.log('REAL PRESS ripple count', await page.locator('.press').count());
  await page.mouse.up();
});
