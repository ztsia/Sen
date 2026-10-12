import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { TXT, open, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
const PATHS = ['/', '/review', '/insights', '/s/payments', '/s/shared', '/s/accounts', '/s/claims', '/s/settings/members', '/s/settings/claims', '/s/settings/data', '/s/split-public?id=demo', '/s/agent/usage', '/s/agent/memory'];
async function grab(page: Page, tag: string) {
  const out: Record<string, string> = {};
  for (const p of PATHS) {
    await open(page, p);
    await page.waitForTimeout(300);
    out[p] = (await text(page)).replace(/EVERY SEN COUNTED[ •]*/g, '');
  }
  fs.writeFileSync(`${TXT}tz-${tag}.json`, JSON.stringify(out, null, 1));
  return out;
}
test('KL', async ({ page }) => { await grab(page, 'KL'); });
test.describe('Auckland', () => {
  test.use({ timezoneId: 'Pacific/Auckland' });
  test('AKL', async ({ page }) => { await grab(page, 'AKL'); });
});
test.describe('LA', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('LA', async ({ page }) => { await grab(page, 'LA'); });
});
test('compare', async () => {
  const a = JSON.parse(fs.readFileSync(`${TXT}tz-KL.json`, 'utf8'));
  for (const tag of ['AKL', 'LA']) {
    const b = JSON.parse(fs.readFileSync(`${TXT}tz-${tag}.json`, 'utf8'));
    for (const p of PATHS) if (a[p] !== b[p]) {
      const al = a[p].split('\n'), bl = b[p].split('\n');
      const diff = al.map((l: string, i: number) => (l !== bl[i] ? `${l}  ->  ${bl[i]}` : null)).filter(Boolean).slice(0, 6);
      console.log(tag, 'DIFF', p, JSON.stringify(diff));
    }
  }
});
