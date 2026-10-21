import { expect, test } from '@playwright/test';
import { open, shot } from './b05feel-lib';

// R2-11: a row that is a <label> around a checkbox (split.tsx, "Who has paid you back") is tappable;
// does a press on its text show the ripple?
import { uid } from '../../apps/web/src/data/fake/ids';

test('R2-11 a label row around a checkbox shows press feedback on its text', async ({ page }) => {
  await open(page, `/s/split?id=${uid('split:bbq')}`);
  await page.waitForTimeout(800);
  const hit = await page.evaluate(() => {
    const l = [...document.querySelectorAll('label')].find((x) => x.querySelector('[role=checkbox],[role=switch]'));
    if (!l) return null;
    const t = (l.querySelector('span') ?? l) as HTMLElement;
    const r = t.getBoundingClientRect();
    t.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        button: 0,
        clientX: r.left + 5,
        clientY: r.top + 5,
      }),
    );
    const rip = !!document.querySelector('.press');
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, button: 0 }));
    return {
      rip,
      text: (l.textContent ?? '').slice(0, 30),
      cursor: getComputedStyle(l).cursor,
      cls: String(l.className).slice(0, 40),
    };
  });
  console.log('LABEL ROW', JSON.stringify(hit));
  await shot(page, 'FLOW-R2-3', 1, 'label-row');
  expect(hit, 'no label row on the split').not.toBeNull();
  expect(hit!.rip).toBe(true);
});
