import { devices, test, type Browser, type BrowserContext } from '@playwright/test';
import { NOW } from '../src/data/fake/scenario';
import { CATALOGUE } from './catalogue';
import { open } from './helpers';
import { METRICS_DIR, pageProbe, Probe, record, screenMetrics, warmUp } from './metrics';

// What opening each screen costs a person and a phone (D139): every catalogue entry, at its path, in
// Minted, light, the CPU 4× slower and the network a mobile one (metrics.ts). Each is opened as a phone
// opens Sen after the first time: a browser per worker, warmed once, unthrottled, until the service worker
// holds the build; then every open is a new page in it, so what the open fetches is only what isn't cached.
// Each open is recorded as it is (screens.jsonl, as `screen:<entry id>`); qa-diff.mjs takes the median of
// the opens. It takes no picture and checks nothing: catalogue.spec.ts does.
//   QA_RUNS=<n>       opens per entry (1)
//   QA_ONLY=<json>    only these entry ids, for the confirming pass
// qa-diff.mjs runs it on main's build and on this branch's, where only QA_METRICS makes it run.

const RUNS = Number(process.env.QA_RUNS ?? 1);
const ONLY = process.env.QA_ONLY ? new Set<string>(JSON.parse(process.env.QA_ONLY)) : undefined;
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'allow' as const,
};

test.skip(!METRICS_DIR, 'QA_METRICS names the folder the numbers go to');

// the worker's browser, warm: one per worker process, made by its first test
let warm: Promise<BrowserContext> | undefined;
const warmContext = (browser: Browser, baseURL: string | undefined) =>
  (warm ??= (async () => {
    const context = await browser.newContext({ ...phone, baseURL });
    // before any page fixes the clock, so the probe keeps the browser's own (metrics.ts)
    await context.addInitScript(pageProbe);
    const page = await context.newPage();
    await warmUp(page);
    await page.close();
    return context;
  })());

for (const e of CATALOGUE) {
  if (ONLY && !ONLY.has(e.id)) continue;
  test(`${e.id}`, async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const context = await warmContext(browser, baseURL);
    for (let i = 0; i < RUNS; i++) {
      const page = await context.newPage();
      try {
        // nothing an earlier open stored
        await page.addInitScript(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            // no storage to clear
          }
        });
        // the scenario's "today", as the catalogue has it, so each screen shows the same month
        await page.clock.setFixedTime(new Date(NOW));
        const probe = await Probe.start(page);
        if (e.ownLook) await page.goto(`${e.path}${e.path.includes('?') ? '&' : '?'}look=minted&mode=light`);
        else await open(page, e.path, 'minted', 'light');
        const sample = await probe.screen();
        await probe.stop();
        record('screens.jsonl', screenMetrics(e.id, sample));
      } finally {
        await page.close();
      }
    }
  });
}
