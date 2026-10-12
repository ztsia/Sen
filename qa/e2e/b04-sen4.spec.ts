import { test } from '@playwright/test';
import { dialog, open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('free-form question to the fake Sen', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  for (const q of [
    'How much will I have saved by December?',
    'What is my salary?',
    '<script>alert(1)</script>' + 'x'.repeat(2000),
  ]) {
    await d.getByLabel('Message to Sen').fill(q);
    await d.getByRole('button', { name: /Send/i }).click();
    await page.waitForTimeout(3200);
    const t = await d.innerText();
    console.log(
      'Q',
      JSON.stringify(q.slice(0, 50)),
      '=> last lines:',
      JSON.stringify(t.split('\n').filter(Boolean).slice(-6)).slice(0, 600),
    );
  }
  await shot(page, 'FLOW-5-step-9-free-form');
});
