import { test } from '@playwright/test';
import { dialog, open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('F17 canned replies', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  for (const q of ['What is my salary?', 'How much will I have saved by December?', 'Is my savings rate good?', 'Which card is best?', 'Hello']) {
    const before = (await d.innerText()).length;
    await d.getByLabel('Message to Sen').fill(q);
    await d.getByRole('button', { name: /Send/i }).click();
    await page.waitForTimeout(3300);
    const t = (await d.innerText()).split('\n').filter(Boolean);
    const i = t.lastIndexOf(q);
    console.log('Q', JSON.stringify(q), '=>', JSON.stringify(t.slice(i + 2, i + 4)).slice(0, 260));
  }
  await shot(page, 'R2-F17-step-1-made-up-answer');
});
