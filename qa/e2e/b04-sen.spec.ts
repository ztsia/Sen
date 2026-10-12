import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { expect, test } from '@playwright/test';
import { db, dialog, dump, open, shot, text, tabs, toast, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });

test('sen sheet content', async ({ page }) => {
  const w = watch(page);
  await open(page, '/insights');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  await expect(d).toBeVisible();
  await page.waitForTimeout(600);
  require('node:fs').writeFileSync(require('node:path').join(process.cwd(),'../../qa-artifacts/B04-skeleton-rest/text/sen-insights.txt'), await d.innerText());
  await shot(page, 'FLOW-5-step-1-sen-insights');
  await expect(d).toContainText('Looking at: Insights');
  console.log('buttons:', (await d.getByRole('button').allInnerTexts()).map((s) => s.replace(/\n/g, ' ')).join(' | '));
  console.log(w.errors.join('\n'));
});
