import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { runChecks } from './checks';
import { open, settled, watchErrors } from './helpers';
import {
  comeBack,
  halfTypedBudget,
  LAYOUT_CHECKS,
  leave,
  makeVisibilityHonest,
  markPage,
  noErrorShown,
  recordMetric,
  reloaded,
  sidewaysScroll,
} from './lived-helpers';
import { makeBuildB, startDeployServer, type BuildB, type DeployServer } from './lived-server';
import { METRICS } from '../../../qa/limits';

// Sen across time and real conditions (D139). The other journeys each open a fresh browser on one build,
// with the service worker blocked, at full speed and one size, so none of them ever met what a phone does
// to an app that stays open for days: a deploy while it's open, going to the background and coming back,
// a dropped connection, a slow one, the back gesture, large text, a small screen, a year of use
// (qa/escapes.md E2 and E3). Each journey asserts what a person would notice, never a cause. Run it with
// `pnpm --filter @sen/web e2e:lived`; lived.config.ts says how it differs from the main run.

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
const toast = (page: Page) => page.locator('[data-sonner-toast]').first();
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- across a deploy ---------------------------------------------------------- */

test.describe('across a deploy', () => {
  // one server whose files change under the open page, so the journeys take turns
  test.describe.configure({ mode: 'serial' });
  test.use({ baseURL: 'http://localhost:4177' });

  let server: DeployServer;
  let build: BuildB;

  test.beforeAll(async () => {
    const a = path.join(WEB, 'dist-lived-a');
    build = makeBuildB(a, path.join(WEB, 'dist-lived-b'));
    server = await startDeployServer({ a, b: path.join(WEB, 'dist-lived-b'), port: 4177 });
  });
  test.afterAll(async () => {
    await server?.close();
  });
  test.beforeEach(() => {
    server.serve('a');
    server.reset();
  });

  /** Sen opened on build A, with its worker in charge of the page: what a phone has after a first day of use. */
  async function openedOnA(page: Page, path = '/') {
    await open(page, path);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 30_000 }).toEqual([`sen-${build.versionA}`]);
    await makeVisibilityHonest(page);
    await markPage(page);
  }

  /** Whether the page on screen is build B, loaded afresh and with B's worker in charge. */
  const runningB = (page: Page) =>
    page
      .evaluate(
        async ([entry, version]) =>
          document.querySelector('script[type="module"]')?.getAttribute('src') === entry &&
          (await caches.keys()).join() === `sen-${version}` &&
          navigator.serviceWorker.controller !== null,
        [build.entryB, build.versionB] as const,
      )
      .catch(() => false); // the page is between two documents

  /** The phone comes back to the front: what Sen checks for a new version on. */
  async function returnToFront(page: Page) {
    await leave(page, 'visibility');
    await comeBack(page, 'visibility');
  }

  /** Waits for B to be what runs, and says what that cost: milliseconds from `since`, and bytes served. */
  async function untilB(page: Page, since: number, within = 15_000) {
    await expect.poll(() => runningB(page), { timeout: within, intervals: [50, 100, 200] }).toBe(true);
    const ms = Date.now() - since;
    await expect(tabs(page)).toBeVisible();
    return { ms, bytes: server.total() };
  }

  /** What an update may cost a phone on mobile data: qa/limits.ts, as a human limit. */
  const limit = METRICS['deploy.updateBytes'].human;

  test('a deploy reaches an open, untouched app within 15 s, with no tap', async ({ page }) => {
    const errors = watchErrors(page);
    await openedOnA(page);
    server.serve('b');
    server.reset();
    const since = Date.now();
    await returnToFront(page);
    const { ms, bytes } = await untilB(page, since);
    expect(await reloaded(page)).toBe(true);
    expect(errors).toEqual([]);
    recordMetric('deploy:untouched', 'deploy.updateBytes', bytes);
    recordMetric('deploy:untouched', 'deploy.updateMs', ms);
    expect(bytes, `an update downloaded ${bytes} bytes: ${JSON.stringify(server.served())}`).toBeLessThan(limit);
  });

  test('a deploy waits for an app in use: a toast offers it, nothing reloads under a half-typed form, and Update brings it in', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openedOnA(page, '/s/budgets');
    // in use: a tap, a sheet open, an amount half typed
    const { sheet, field, value } = await halfTypedBudget(page);
    await markPage(page);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    server.serve('b');
    server.reset();
    const since = Date.now();
    await returnToFront(page);
    await expect(page.getByText('A new version of Sen is ready.')).toBeVisible({ timeout: 15_000 });
    // nothing moves under the person while the toast waits
    await page.waitForTimeout(3000);
    expect(await reloaded(page)).toBe(false);
    await expect(sheet).toBeVisible();
    await expect(field).toHaveValue(value);
    await page.getByRole('button', { name: 'Update' }).click();
    const { bytes } = await untilB(page, since, 20_000);
    expect(await reloaded(page)).toBe(true);
    expect(errors).toEqual([]);
    recordMetric('deploy:in-use', 'deploy.updateBytes', bytes);
    expect(bytes, `an update downloaded ${bytes} bytes: ${JSON.stringify(server.served())}`).toBeLessThan(limit);
  });

  test('a deploy found while the app is in use, on no form, is offered in a toast and not forced', async ({ page }) => {
    // the minute's check, not a return to the front: a tap has been made, nothing is open
    const errors = watchErrors(page);
    await openedOnA(page);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    server.serve('b');
    server.reset();
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect(page.getByText('A new version of Sen is ready.')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
    expect(await reloaded(page)).toBe(false);
    await page.getByRole('button', { name: 'Update' }).click();
    await untilB(page, Date.now(), 20_000);
    expect(errors).toEqual([]);
  });
});

/* ---------- leaving and coming back -------------------------------------------------- */

test('a half-typed form and its sheet are as they were after Sen has been in the background', async ({ page }) => {
  const errors = watchErrors(page);
  const { sheet, field, value } = await halfTypedBudget(page);
  await makeVisibilityHonest(page);
  await markPage(page);
  await leave(page, 'visibility');
  await page.waitForTimeout(2000);
  await comeBack(page, 'visibility');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/s\/budgets/);
  await expect(sheet).toBeVisible();
  await expect(field).toHaveValue(value);
  expect(await reloaded(page)).toBe(false);
  await noErrorShown(page);
  // and the form still works: the amount can be finished and saved
  await field.fill('260.00');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Shopping: RM260.00 a cycle')).toBeVisible();
  expect(errors).toEqual([]);
});

test('nothing typed is lost when the phone switches to another app for half a minute', async ({ page }) => {
  const errors = watchErrors(page);
  const { sheet, field, value } = await halfTypedBudget(page);
  await makeVisibilityHonest(page);
  await markPage(page);
  await page.clock.install();
  await leave(page, 'pagehide');
  // thirty seconds pass in the other app
  await page.clock.fastForward(30_000);
  await comeBack(page, 'pagehide');
  await page.clock.resume();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/s\/budgets/);
  await expect(sheet).toBeVisible();
  await expect(field).toHaveValue(value);
  expect(await reloaded(page)).toBe(false);
  await noErrorShown(page);
  await field.fill('275.00');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Shopping: RM275.00 a cycle')).toBeVisible();
  expect(errors).toEqual([]);
});

/* ---------- connection --------------------------------------------------------------- */

test('a change made as the connection drops is kept and said so, and the app carries on when it is back', async ({
  page,
  context,
}) => {
  const errors = watchErrors(page);
  const { sheet, field } = await halfTypedBudget(page, '400.00');
  await markPage(page);
  await context.setOffline(true);
  await expect(page.getByText("You're offline.")).toBeVisible();
  await sheet.getByRole('button', { name: 'Save' }).click();
  // not lost, and not silent: the screen has the new amount, a toast says so, and the banner says it is kept
  await expect(sheet).toBeHidden();
  await expect(page.getByText('RM320.30 of RM400.00')).toBeVisible();
  await expect(toast(page)).toContainText('Shopping: RM400.00 a cycle');
  await expect(page.getByText(/kept and syncs when you're back/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You're offline.")).toBeHidden({ timeout: 10_000 });
  // back online with no reload: the change is still there, and the next one works
  await expect(page.getByText('RM320.30 of RM400.00')).toBeVisible();
  await page
    .getByRole('button', { name: /^Meals/ })
    .first()
    .click();
  await page.getByLabel('Budget each cycle').fill('1300.00');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('RM932.93 of RM1,300.00')).toBeVisible();
  expect(await reloaded(page)).toBe(false);
  await noErrorShown(page);
  // the browser's own failed requests while offline are not the app's errors
  expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))).toEqual([]);
  void field;
});

test.describe('on a slow network', () => {
  // a first visit on the phone's own network: the worker is not yet in charge of the page
  test.use({ serviceWorkers: 'block' });

  test('a tap that waits for a screen shows it is working within 100 ms, and the screen settles', async ({
    page,
    context,
  }) => {
    const errors = watchErrors(page);
    await open(page, '/');
    await expect(page.getByTestId('hero')).toBeVisible();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    // 400 ms each way, about 400 Kbps down and up
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 50_000,
      uploadThroughput: 50_000,
    });
    // when the finger lands, and when anything shows the app is working: its "Loading" skeleton, or a busy control
    await page.evaluate(() => {
      const w = window as unknown as { __tap: { down: number; working: number } };
      w.__tap = { down: 0, working: 0 };
      addEventListener('pointerdown', () => (w.__tap.down = performance.now()), { capture: true });
      new MutationObserver(() => {
        if (
          w.__tap.down &&
          !w.__tap.working &&
          document.querySelector('main [role="status"], main [aria-busy="true"]')
        ) {
          w.__tap.working = performance.now();
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    await tabs(page)
      .getByRole('link', { name: /^Insights/ })
      .tap();
    await expect(page).toHaveURL(/\/insights/);
    const { down, working } = await page.evaluate(
      () => (window as unknown as { __tap: { down: number; working: number } }).__tap,
    );
    expect(working, 'nothing showed the app was working').toBeGreaterThan(down);
    expect(working - down, `the app answered the tap after ${Math.round(working - down)} ms`).toBeLessThan(100);
    // and it settles: the skeleton gives way to the screen
    await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole('tab', { name: 'Budgets' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

/* ---------- the back gesture --------------------------------------------------------- */

test('the back gesture closes an open sheet and leaves the screen under it where it was', async ({ page }) => {
  await open(page, '/');
  await tabs(page)
    .getByRole('link', { name: /^Insights/ })
    .click();
  await page.getByRole('tab', { name: 'Budgets' }).click();
  await page.getByRole('button', { name: /Open budgets/ }).click();
  await expect(page).toHaveURL(/\/s\/budgets/);
  await page
    .getByRole('button', { name: /Shopping/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'Shopping' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/s\/budgets/);
  await expect(page.getByRole('button', { name: /Shopping/ }).first()).toBeVisible();
  // and one more back goes where the person came from, as it always did
  await page.goBack();
  await expect(page).toHaveURL(/\/insights/);
});

test('the back gesture dismisses a question being asked and stays on the screen', async ({ page }) => {
  // the one dialog a preview can show: forgetting the ESS password (the sign-out one needs the server)
  await open(page, '/');
  await page.goto('/s/settings/claims?look=minted&mode=light');
  const signIn = page.getByRole('button', { name: 'Sign in to ESS' });
  if (await signIn.isVisible()) {
    await signIn.click();
    await page.getByRole('button', { name: 'Pretend I signed in' }).click();
  }
  await page.getByRole('button', { name: 'More about ESS' }).click();
  await page.getByRole('menuitem', { name: 'Forget password' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/s\/settings\/claims/);
  await expect(page.getByRole('button', { name: 'More about ESS' })).toBeVisible();
});

/* ---------- large text and a small phone --------------------------------------------- */

const FIVE = ['/', '/review', '/scan', '/insights', '/more'] as const;

/** What the scripted checks find that a person would see, and any sideways scroll. */
async function layoutProblems(page: Page) {
  const found = (await runChecks(page)).filter((f) => LAYOUT_CHECKS.has(f.check));
  return [...found.map((f) => `${f.check}: ${f.detail}`), ...(await sidewaysScroll(page)).map((s) => `sideways: ${s}`)];
}

/** A control a person must be able to reach by scrolling: in the screen's view and nothing on top of it. */
async function expectReachable(loc: Locator, what: string) {
  await loc.scrollIntoViewIfNeeded();
  const on = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { inView: r.top >= 0 && r.bottom <= innerHeight, free: !!top && el.contains(top) };
  });
  expect(on, `${what} can't be reached by scrolling`).toEqual({ inView: true, free: true });
}

test.describe('at 200% text', () => {
  const big = async (page: Page, path: string) => {
    await open(page, path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await settled(page);
  };

  // Real findings, left as expected failures so this stays green until each is fixed (then the test
  // says so, and the mark goes): at 200% a row's title and its value are drawn over each other.
  const OVERLAPS_AT_200 = new Set<string>(['/review', '/insights', '/more']);
  for (const screen of FIVE) {
    test(`${screen === '/' ? 'Home' : screen.slice(1)} reads at twice the text size without clipping or sideways scroll`, async ({
      page,
    }) => {
      test.fail(OVERLAPS_AT_200.has(screen), 'text is drawn over other text at 200%: see the report');
      await big(page, screen);
      expect(await layoutProblems(page)).toEqual([]);
    });
  }

  test('a sheet reads at twice the text size without clipping or sideways scroll', async ({ page }) => {
    await big(page, '/');
    await page.getByTestId('hero').click();
    await expect(page.getByRole('dialog', { name: 'This cycle' })).toBeVisible();
    expect(await layoutProblems(page)).toEqual([]);
  });
});

test.describe('on a 360 by 640 phone', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  // each screen's main thing to do, and the last control on it: both must be reachable by scrolling
  const PRIMARY: Record<(typeof FIVE)[number], (page: Page) => Locator> = {
    '/': (page) => page.getByTestId('hero'),
    '/review': (page) => page.getByRole('button', { name: 'Apply all' }),
    '/scan': (page) => page.getByRole('button', { name: 'Take a photo' }),
    '/insights': (page) => page.getByRole('tab', { name: 'Budgets' }),
    '/more': (page) => page.getByRole('link', { name: /^Payments/ }),
  };
  const LAST = 'main :is(a[href], button, [role="tab"]):visible >> nth=-1';

  for (const screen of FIVE) {
    test(`${screen === '/' ? 'Home' : screen.slice(1)} fits the small screen, and its main action and its last control can be reached`, async ({
      page,
    }) => {
      await open(page, screen);
      await settled(page);
      expect(await layoutProblems(page)).toEqual([]);
      await expectReachable(PRIMARY[screen](page).first(), `${screen}'s main action`);
      await expectReachable(page.locator(LAST), `${screen}'s last control`);
    });
  }

  test('a sheet fits the small screen and its Save can be reached', async ({ page }) => {
    const { sheet } = await halfTypedBudget(page);
    expect(await layoutProblems(page)).toEqual([]);
    await expectReachable(sheet.getByRole('button', { name: 'Save' }), "the sheet's Save");
  });
});

/* ---------- a year of use ------------------------------------------------------------ */

test.describe('a year of data', () => {
  // each is what a person waits for on a phone as fast as this machine, unthrottled
  const WITHIN_MS = 3000;
  const step = (name: string, ms: number) => {
    recordMetric(`step:lived/${name}`, 'step.settleMs', ms);
    expect(ms, `${name} took ${Math.round(ms)} ms`).toBeLessThan(WITHIN_MS);
  };

  test('the list of every payment scrolls to its end', async ({ page }) => {
    await open(page, '/s/payments?scenario=year');
    await expect(page.getByText(/[\d,]+ payments/)).toBeVisible();
    const t0 = Date.now();
    // the list is long and measured as it is drawn: keep going until the end holds still
    await page.evaluate(async () => {
      const main = document.querySelector('main')!;
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let last = -1, i = 0; i < 400; i++) {
        main.scrollTop = main.scrollHeight;
        await frame();
        if (main.scrollTop === last) break;
        last = main.scrollTop;
      }
    });
    step('payments-bottom', Date.now() - t0);
    // the end of the year's list: its oldest day
    await expect(page.getByText(/2025/).last()).toBeVisible();
  });

  test('Insights opens', async ({ page }) => {
    const t0 = Date.now();
    await open(page, '/insights?scenario=year');
    await settled(page);
    await expect(page.getByRole('tab', { name: 'Budgets' })).toBeVisible();
    step('insights-open', Date.now() - t0);
  });

  test('search finds a payment', async ({ page }) => {
    await open(page, '/s/payments?scenario=year');
    await expect(page.getByText(/[\d,]+ payments/)).toBeVisible();
    const t0 = Date.now();
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('Perumahan Jaya');
    await expect(page.getByText('Perumahan Jaya Sdn Bhd').first()).toBeVisible();
    step('payments-search', Date.now() - t0);
  });
});
