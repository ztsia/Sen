import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

export const SHOTS = process.env.QA_SCREENS ?? '../../qa-artifacts/B05_feel/screens';
mkdirSync(SHOTS, { recursive: true });

/** Screenshot named for its flow and step; the assertion comes first. */
export async function shot(page: Page, flow: string, n: number, what: string) {
  await page.screenshot({ path: `${SHOTS}/${flow}-step-${n}-${what}.png` });
}

export async function open(page: Page, path: string, look = 'minted', mode = 'light') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  await page.waitForTimeout(300);
}

/** Console errors and page errors, plus unhandled rejections. */
export function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Records each view transition: its types, and (when `detail`) the animations it ran. */
export async function recordVT(page: Page, detail = true) {
  await page.addInitScript((detail) => {
    const w = window as any;
    w.__vt = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    (document as any).startViewTransition = (arg: any) => {
      const rec: any = { types: arg?.types?.length ? arg.types.join(',') : 'untyped', t0: performance.now(), anims: [] };
      w.__vt.push(rec);
      const vt = start(arg);
      if (detail) {
        vt.ready.then(
          () => {
            rec.ready = performance.now() - rec.t0;
            rec.anims = document
              .getAnimations()
              .filter((a: any) => a.effect?.pseudoElement)
              .map((a: any) => ({
                p: a.effect.pseudoElement,
                d: a.effect.getTiming().duration,
                e: a.effect.getTiming().easing,
                kf: a.effect.getKeyframes().map((k: any) => ({ tx: k.transform, op: k.opacity, ease: k.easing })),
              }));
          },
          (e: unknown) => (rec.skipped = String(e)),
        );
        vt.finished.then(
          () => (rec.fin = performance.now() - rec.t0),
          () => undefined,
        );
      }
      return vt;
    };
  }, detail);
}
export const vts = (page: Page) => page.evaluate(() => (window as any).__vt as any[]);
