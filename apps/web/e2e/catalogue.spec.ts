import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { NOW } from '../src/data/fake/scenario';
import { SCREENS } from '../src/screens/registry';
import { CATALOGUE, UNEXPLORED } from './catalogue';
import { runChecks } from './checks';
import { LOOKS, MODES, open, settled, watchErrors } from './helpers';

// D137: every screen in the registry, on Wei Ming's month at its NOW, in each look and mode named by
// E2E_LOOKS. Per entry and pair: the accessibility tree (Minted, light, committed in e2e/trees/), the
// whole screen as one image when E2E_SHOTS names a folder (qa-diff.mjs compares them with main's), the
// scripted checks (checks.ts), and nothing thrown. Behaviour is not run here: the journeys do that, in one look.

// The scroll sits inside an h-dvh column (frame/app-shell.tsx), so a screenshot of the viewport shows
// one screen's worth; growing the viewport by what the column hides shows all of it.
const PHONE = { width: 390, height: 844 };
const MAX_HEIGHT = 4000;

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const safeId = (id: string) => id.replace(/[/@]/g, '_');
const only = process.env.E2E_CATALOGUE;
const shots = process.env.E2E_SHOTS;

test('every registry screen is in the catalogue or unexplored, and nothing else is', () => {
  const ids = new Set(SCREENS.map((s) => s.id));
  const covered = new Set(CATALOGUE.map((e) => e.screen));
  expect(
    SCREENS.map((s) => s.id).filter((id) => !covered.has(id) && !(id in UNEXPLORED)),
    'a screen with no entry and no reason',
  ).toEqual([]);
  expect(
    [...covered, ...Object.keys(UNEXPLORED)].filter((id) => !ids.has(id)),
    'an entry or reason for a screen the registry does not have',
  ).toEqual([]);
  expect(
    Object.keys(UNEXPLORED).filter((id) => covered.has(id)),
    'a screen both catalogued and unexplored',
  ).toEqual([]);
  const entryIds = CATALOGUE.map((e) => e.id);
  expect(entryIds.filter((id, i) => entryIds.indexOf(id) !== i)).toEqual([]);
  // qa-diff.mjs reads the catalogue from here: it is TypeScript, and the script is not
  if (shots) {
    mkdirSync(shots, { recursive: true });
    const entries = CATALOGUE.map((e) => ({ id: e.id, screen: e.screen, path: e.path, file: safeId(e.id) }));
    writeFileSync(join(shots, 'catalogue.json'), JSON.stringify({ entries, unexplored: UNEXPLORED }, null, 2));
  }
});

/**
 * Waits until the page has stopped changing: no element added, removed or edited for 300 ms. A count
 * (the Review badge) or a list can arrive a moment after the screen's own loading state has gone.
 */
const quiet = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        let timer = setTimeout(finish, 300);
        const watch = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(finish, 300);
        });
        // a page that never rests (a ticking clock) is photographed after 4 s
        const cap = setTimeout(finish, 4000);
        function finish() {
          watch.disconnect();
          clearTimeout(timer);
          clearTimeout(cap);
          done();
        }
        watch.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
      }),
  );

/** The viewport grown to show the whole screen, photographed, and put back. */
async function wholeScreen(page: Page, file: string) {
  const hidden = await page.evaluate(() => {
    let most = 0;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!/auto|scroll/.test(getComputedStyle(el).overflowY) || el.closest('[role="dialog"]')) continue;
      most = Math.max(most, el.scrollHeight - el.clientHeight);
    }
    return most;
  });
  await page.setViewportSize({ width: PHONE.width, height: Math.min(PHONE.height + hidden, MAX_HEIGHT) });
  // two frames for the layout to settle at the new height, then whatever it sets off: a virtual list
  // measures and draws its rows again
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await quiet(page);
  mkdirSync(join(file, '..'), { recursive: true });
  await page.screenshot({ path: file, animations: 'disabled' });
  await page.setViewportSize(PHONE);
}

for (const e of CATALOGUE)
  for (const look of LOOKS)
    for (const mode of MODES)
      test(`${e.id} in ${look}, ${mode}`, async ({ page }) => {
        // the clock is fixed before the page loads, so "today" and every relative date are the scenario's
        await page.clock.setFixedTime(new Date(NOW));
        const errors = watchErrors(page);
        await open(page, e.path, look, mode);
        await settled(page);
        await quiet(page);
        await e.open?.(page);
        await quiet(page);
        await page.evaluate(() => document.fonts.ready);

        // the tree is the same in every look; one look records it
        if (only !== 'shots' && look === 'minted' && mode === 'light')
          await expect(page.locator('body')).toMatchAriaSnapshot({ name: `${safeId(e.id)}.aria.yml` });

        if (shots) await wholeScreen(page, join(shots, 'catalogue', `${safeId(e.id)}--${look}-${mode}.png`));

        if (only !== 'shots') {
          const findings = await runChecks(page);
          const lines = findings.map((f) => `${f.check}: ${f.detail}`);
          expect.soft(lines, `${e.id} in ${look}, ${mode}`).toEqual([]);
          const file = process.env.E2E_CHECKS;
          if (file && findings.length) {
            mkdirSync(join(file, '..'), { recursive: true });
            appendFileSync(
              file,
              findings
                .map((f) => JSON.stringify({ entry: e.id, look, mode, check: f.check, detail: f.detail }) + '\n')
                .join(''),
            );
          }
        }

        expect(errors).toEqual([]);
      });
