import { chromium, devices } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
for (const u of ['/?state=loading', '/']) {
  await p.goto('http://localhost:4173' + u + (u.includes('?') ? '&' : '?') + 'look=minted&mode=light');
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await p.waitForTimeout(1200);
  console.log(u, await p.evaluate(() => {
    const out = [];
    for (const k of ['home', 'review', 'insights']) {
      let a = document.querySelector(`a[data-k=${k}]`); const chain = [];
      for (let e = a; e; e = e.parentElement) if (e.getAttribute('aria-hidden') || e.hasAttribute('inert')) chain.push(e.tagName + '#' + e.id + ':' + e.getAttribute('aria-hidden'));
      out.push(k + ' ' + (a ? chain.join(',') || 'NOT HIDDEN' : 'missing'));
    }
    return out.join(' | ');
  }));
}
await p.goto('http://localhost:4173/?state=loading&look=minted&mode=light');
await p.waitForTimeout(800);
console.log('before', await p.evaluate(() => { const a=document.querySelector('a[data-k=review]'); const tl=a.querySelector('.tl'); const cs=getComputedStyle(tl); return [cs.display, cs.visibility, cs.opacity, cs.position, cs.fontSize, tl.getBoundingClientRect().width, tl.getAttribute('aria-hidden')].join(' '); }));
await p.getByRole('button', { name: 'Ask Sen', exact: true }).click();
await p.waitForTimeout(1200);
console.log('open', await p.evaluate(() => { const a=document.querySelector('a[data-k=review]'); const tl=a.querySelector('.tl'); const cs=getComputedStyle(tl); let hid=[]; for (let e=a;e;e=e.parentElement) if (e.getAttribute('aria-hidden')) hid.push(e.tagName); return [cs.display, cs.visibility, cs.opacity, tl.getBoundingClientRect().width, a.parentElement.tagName, a.parentElement.getAttribute('aria-hidden'), hid.join()].join(' '); }));
await b.close();
