import { expect, test } from '@playwright/test';
import { open } from './b05feel-lib';

// Does any Sheet block ever get its scroll area observed (useSheetResize)? (AC-17)
for (const [name, path, act] of [
  ['ask-sen', '/', async (page: any) => page.getByRole('button', { name: 'Ask Sen' }).click()],
  ['scan-more', '/', async (page: any) => { const b = page.locator('[data-k=scan]'); const bb = await b.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); }],
] as const) {
  test(`sheet ${name}: its scroll area is observed`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any;
      w.__ro = [];
      const o = ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe = function (t: Element, ...a: any[]) { w.__ro.push((t as HTMLElement).className.toString()); return o.call(this, t, ...a); };
    });
    await open(page, path);
    await act(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(600);
    const ro = await page.evaluate(() => (window as any).__ro.filter((c: string) => c.includes('scroll-area')));
    const area = await page.evaluate(() => document.querySelector('[role=dialog] .scroll-area')?.className ?? 'none');
    console.log(name, 'area class:', area.slice(0, 60), '| observed scroll-areas:', JSON.stringify(ro.map((c: string) => c.slice(0, 50))));
  });
}
