import { expect, test } from '@playwright/test';
import { step } from './b04r-r2-lib';
import { watch } from './b04r-helpers';
import fs from 'node:fs';
import path from 'node:path';

// R2-FLOW-30: the production build (5293) and the preview build's bundle, with hostile query strings.
test.use({ baseURL: 'http://127.0.0.1:5293' });

test('R2-FLOW-30 Production build: no dev tools, hostile queries, no secrets in the bundle', async ({ page, request }) => {
  const w = watch(page);
  const F = 'R2-FLOW-30';
  await page.goto('/?look=copper&mode=dark&scenario=payday&state=error');
  await expect(page.getByTestId('not-built')).toBeVisible();
  await step(page, F, 1, 'no-dev-tools', 'Open the production build with ?scenario=payday&state=error&look=copper', 'Not built yet; no dev panel; the dev look and scenario parameters are ignored (look stays minted)', async () => {
    await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
    await expect(page.getByTestId('review-badge')).toHaveCount(0);
  });
  const hostile = ['/?scenario=<script>alert(1)</script>', '/?state=../../etc/passwd', '/s/txn?id=' + 'A'.repeat(5000), "/s/split-public?id='%20OR%201=1--", '/s/%2e%2e%2f%2e%2e%2fadmin', '/dev/gallery'];
  let ok = true;
  for (const u of hostile) {
    await page.goto(u);
    await page.waitForTimeout(250);
    const t = await page.locator('body').innerText();
    if (/Error:|at \w+ \(|TypeError|stack/i.test(t)) ok = false;
  }
  await page.goto('/?scenario=<script>alert(1)</script>');
  await step(page, F, 2, 'hostile-queries', 'Open six hostile addresses (script tag, ../, 5000 chars, SQL, encoded ../, /dev/gallery)', 'each renders the page or Not built yet: no stack trace, no injected script, no gallery', async () => {
    expect(ok, 'no stack text on any of them').toBe(true);
    await expect(page).not.toHaveURL(/gallery/);
  });
  // bundle: production has no source maps and no secret-looking strings
  const dir = '/tmp/claude-0/-home-user/a62b07c1-1615-5d24-927b-6ca9e26dcd42/scratchpad/dist-prod';
  const files: string[] = [];
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))));
  walk(dir);
  const hits: string[] = [];
  for (const f of files.filter((f) => /\.(js|css|html)$/.test(f))) {
    const t = fs.readFileSync(f, 'utf8');
    for (const re of [/sk-ant-[A-Za-z0-9_-]{10,}/, /AIza[0-9A-Za-z_-]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /ghp_[A-Za-z0-9]{20,}/, /xox[bap]-[A-Za-z0-9-]{10,}/, /postgres(ql)?:\/\/[^\s"']+/, /(secret|api[_-]?key|token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["']/i])
      if (re.test(t)) hits.push(`${path.basename(f)} ${re}`);
  }
  const maps = files.filter((f) => f.endsWith('.map'));
  await step(page, F, 3, 'bundle', 'Grep the built production bundle', 'no key, token, private key or database URL; no source maps shipped', async () => {
    console.log('bundle files', files.length, 'hits', hits.join(', ') || 'none', 'maps', maps.length);
    expect(hits).toEqual([]);
    expect(maps).toEqual([]);
  });
  const r = await request.get('/');
  await step(page, F, 4, 'headers', 'Read the response headers', 'CSP with script-src self only; no-referrer', async () => {
    const csp = r.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(r.headers()['referrer-policy']).toBe('no-referrer');
  });
  expect(w.errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
});
