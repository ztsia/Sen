import { expect, test, type Page } from '@playwright/test';

const SHOTS = '/home/user/Sen/.claude/worktrees/agent-a4be4889e0dd8b315/qa-artifacts/B02-shell-listener/screens';
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function sim(page: Page, button: string, times = 1) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  for (let i = 0; i < times; i++) await page.getByRole('button', { name: button }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(700);
}
const evLi = (page: Page) => page.locator('li').filter({ has: page.locator('.selectable') });

test('FLOW-10b: 23:30 KL on 31 Oct, browser in New_York: Today 23:30, then Yesterday after KL midnight', async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    timezoneId: 'America/New_York',
    baseURL: 'http://localhost:4310',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  // 2026-10-31 23:30 KL is 15:30 UTC and 11:30 in New York (same day there)
  await page.clock.install({ time: new Date('2026-10-31T15:30:00Z') });
  await page.goto('/more?look=minted&mode=light');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Capture' }).click();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await sim(page, 'Grant access');
  await page.getByRole('button', { name: 'Choose your apps' }).click();
  await page.getByRole('switch', { name: 'Ryt Bank' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await sim(page, 'Post a notification', 3);
  await expect(page.getByText('1 notification', { exact: false })).toBeVisible();
  let r = (await evLi(page).allInnerTexts())[0]!;
  console.log('FLOW-10b at 23:30 KL:', JSON.stringify(r));
  expect(r).toContain('Today, 23:3');
  await shot(page, 'FLOW-10b-step-1-2330-kl-today');
  // 40 minutes later: 00:10 KL on 1 Nov (still 31 Oct 12:10 in New York). Reopen the screen to re-render.
  await page.clock.fastForward('00:40:00');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('1 notification', { exact: false })).toBeVisible();
  r = (await evLi(page).allInnerTexts())[0]!;
  console.log('FLOW-10b after KL midnight:', JSON.stringify(r));
  expect(r).toContain('Yesterday, 23:3');
  await shot(page, 'FLOW-10b-step-2-after-kl-midnight-yesterday');
  await ctx.close();
});
