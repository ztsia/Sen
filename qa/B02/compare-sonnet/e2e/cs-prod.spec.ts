import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

const SHOTS = '/home/user/Sen/.claude/worktrees/agent-a4be4889e0dd8b315/qa-artifacts/B02-shell-listener/screens';
test.use({ baseURL: 'http://localhost:4311' });

test('FLOW-11/12: production has no simulator, no dev panel; capture screens say the app is needed', async ({
  page,
}) => {
  await page.goto('/s/settings/capture');
  await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/FLOW-11-step-1-prod-capture.png` });
  await page.goto('/s/settings/capture/captured');
  await expect(page.getByRole('button', { name: 'Post a notification' })).toHaveCount(0);
  const body = await page.locator('body').innerText();
  console.log('FLOW-12 prod captured screen text: ' + JSON.stringify(body.slice(0, 200)));
  await page.screenshot({ path: `${SHOTS}/FLOW-12-step-2-prod-captured.png` });
  // no stack trace
  expect(body).not.toMatch(/Error:|at .*\(.*:\d+:\d+\)|undefined/);
});

test('AC-45/49: the production bundle has no simulator and no secret-looking string', async () => {
  const dir = '/home/user/Sen/.claude/worktrees/agent-a4be4889e0dd8b315/apps/web/dist-cs-prod/assets';
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  let all = '';
  for (const f of files) all += readFileSync(`${dir}/${f}`, 'utf8');
  console.log(`prod bundle: ${files.length} js files, ${all.length} bytes`);
  expect(all).not.toContain('Simulated:');
  expect(all).not.toContain('Post a maybe-OTP');
  expect(all).not.toContain('482910');
  expect(all).not.toMatch(/AKIA[0-9A-Z]{16}|sk-ant-|ghp_[A-Za-z0-9]{20}|-----BEGIN [A-Z ]*PRIVATE KEY/);
  expect(files.some((f) => f.includes('capture-sim'))).toBe(false);
});
