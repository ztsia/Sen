import { chromium } from '@playwright/test';
const S = process.argv[2];
const b = await chromium.launch();
const jobs = [];
for (const look of ['minted', 'firefly']) {
  const mode = look === 'firefly' ? 'dark' : 'light';
  const q = `look=${look}&mode=${mode}`;
  jobs.push([`insights-${look}`, `/insights?${q}`, 3600]);
  for (const id of ['budgets', 'subscriptions', 'goals', 'insights/year']) jobs.push([`${id.replace('/', '-')}-${look}`, `/s/${id}?${q}`, 1100]);
  jobs.push([`goal-${look}`, 'GOAL:' + q, 1100]);
}
jobs.push(['insights-empty', '/insights?look=minted&mode=light&state=empty', 844]);
jobs.push(['insights-month', '/insights?look=minted&mode=light&scenario=month', 3600]);
for (const [name, url, h] of jobs) {
  const p = await b.newPage({ viewport: { width: 390, height: h } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  if (url.startsWith('GOAL:')) {
    await p.goto('http://localhost:5181/s/goals?' + url.slice(5));
    await p.waitForTimeout(1500);
    await p.locator('main ul button').first().click();
  } else await p.goto('http://localhost:5181' + url);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${S}/${name}.png` });
  if (errs.length) console.log(name, errs.slice(0, 3));
  await p.close();
}
await b.close();
