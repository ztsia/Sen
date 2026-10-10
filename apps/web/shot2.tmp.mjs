import { chromium } from '@playwright/test';
const [,, path, out, look='minted', mode='light'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto(`http://localhost:5173${path}${path.includes('?')?'&':'?'}look=${look}&mode=${mode}`);
await p.waitForTimeout(2500);
// stitch: screenshot main fully by expanding it
await p.evaluate(() => { const m = document.querySelector('main'); if (m) { m.style.overflow='visible'; m.style.flex='none'; } document.querySelectorAll('div').forEach(d=>{ if (getComputedStyle(d).overflow==='hidden' && d.classList.contains('h-dvh')) { d.style.height='auto'; d.style.overflow='visible'; } }); });
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
console.log(errs.join('\n') || 'no errors');
await b.close();
