import { devices, test } from '@playwright/test';
import { NOW } from '../src/data/fake/scenario';
import { CATALOGUE } from './catalogue';
import { open } from './helpers';
import { METRICS_DIR, Probe, record, screenMetrics, type ScreenSample } from './metrics';

// What opening each screen costs a person and a phone (D139): every catalogue entry, at its path, in
// Minted, light, the CPU 4× slower and the network a mobile one (metrics.ts). Opened three times, each
// in a browser of its own so nothing is cached, and the median of each metric is what's recorded
// (screens.jsonl, as `screen:<entry id>`). It takes no picture and checks nothing: catalogue.spec.ts
// does. qa-diff.mjs runs it on main's build and on this branch's, where only QA_METRICS makes it run.

const RUNS = 3;
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block' as const,
};

test.skip(!METRICS_DIR, 'QA_METRICS names the folder the numbers go to');

for (const e of CATALOGUE)
  test(`${e.id}`, async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const runs: ScreenSample[] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await browser.newContext({ ...phone, baseURL });
      try {
        const page = await context.newPage();
        // the scenario's "today", as the catalogue has it, so each screen shows the same month
        await page.clock.setFixedTime(new Date(NOW));
        const probe = await Probe.start(page);
        if (e.ownLook) await page.goto(`${e.path}${e.path.includes('?') ? '&' : '?'}look=minted&mode=light`);
        else await open(page, e.path, 'minted', 'light');
        runs.push(await probe.screen());
        await probe.stop();
      } finally {
        await context.close();
      }
    }
    record('screens.jsonl', screenMetrics(e.id, runs));
  });
