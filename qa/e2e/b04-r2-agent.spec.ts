import { test } from '@playwright/test';
import { open, shot, tabs } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const ask = (p: import('@playwright/test').Page) => p.getByRole('button', { name: 'Ask Sen', exact: true }).count();
// A scenario that sets the agent switch off, made by rewriting the served module (no source edit):
// the fake builds `month` with db.agent = false, as a scenario would.
async function agentOffScenario(page: import('@playwright/test').Page, off: boolean) {
  await page.route(/\/src\/data\/fake\/variants\.ts/, async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    if (off) {
      const before = body;
      body = body.replace('db.settings.admin = false;', 'db.settings.admin = false; db.agent = false;');
      if (before === body) console.log('PATCH DID NOT APPLY');
    }
    await route.fulfill({ response: res, body });
  });
}
test('F5: a scenario with the agent off has no Sen button', async ({ page }) => {
  await agentOffScenario(page, true);
  await open(page, '/?scenario=month');
  await page.waitForTimeout(1000);
  console.log('Home (agent off): button', await ask(page), '| me via UI -> Settings');
  await shot(page, 'R2-F5-step-1-home-agent-off');
  for (const t of [/^Review/, /^Insights/, /^More/]) {
    await tabs(page).getByRole('link', { name: t }).click();
    await page.waitForTimeout(500);
    console.log(String(t), 'button', await ask(page));
  }
  await page.getByText('Settings', { exact: true }).click();
  await page.waitForTimeout(600);
  console.log('Settings Sen row:', await page.getByRole('button', { name: /^Sen$/ }).count());
  await shot(page, 'R2-F5-step-2-settings-agent-off');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await page.waitForTimeout(500);
  console.log('Home note card with agent off:', await page.getByText(/Sen ·/).count(), '| Review suggestion bar:');
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await page.waitForTimeout(500);
  console.log('Review "Sen suggested" shown:', await page.getByText(/Sen suggested/).count());
});
test('F5 control: agent on in month', async ({ page }) => {
  await agentOffScenario(page, false);
  await open(page, '/?scenario=month');
  await page.waitForTimeout(800);
  console.log('Home (agent on): button', await ask(page));
});
