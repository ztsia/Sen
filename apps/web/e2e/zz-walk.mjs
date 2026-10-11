import { chromium, devices } from '@playwright/test';
import { uid } from '../src/data/fake/ids.ts';
const [, , start, ...acts] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
});
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.addInitScript(() =>
  document.addEventListener('securitypolicyviolation', (e) =>
    console.error('CSP: ' + e.violatedDirective + ' ' + e.blockedURI + ' ' + e.sourceFile + ':' + e.lineNumber),
  ),
);
const dump = async (label) => {
  const t = await p.evaluate(() => {
    const roots = [...document.querySelectorAll('[role=dialog]')];
    const m = roots.length ? roots.at(-1) : (document.querySelector('main') ?? document.body);
    const btns = [...m.querySelectorAll('button,a,input,textarea,[role=checkbox],[role=radio],[role=switch]')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map(
        (e) =>
          `${e.tagName.toLowerCase()}[${e.getAttribute('role') || e.type || ''}] "${(e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 40)}"`,
      );
    return (
      (roots.length ? '(dialog) ' : '') +
      m.innerText.replace(/\n+/g, ' | ').slice(0, 900) +
      '\n  CONTROLS: ' +
      btns.join(' ; ') +
      '\n  URL ' +
      location.pathname +
      location.search
    );
  });
  console.log('--- ' + label + '\n' + t);
};
await p.goto(
  'http://localhost:4173' +
    start.replace(/uid:([\w:.-]+)/g, (_, n) => uid(n)) +
    (start.includes('?') ? '&' : '?') +
    'look=minted&mode=light',
);
await p.waitForTimeout(1000);
await dump('start');
for (const a of acts) {
  const [kind, ...rest] = a.split('::');
  const arg = rest.join('::');
  try {
    if (kind === 'click') await p.getByRole('button', { name: arg }).first().click({ timeout: 3000 });
    else if (kind === 'link') await p.getByRole('link', { name: arg }).first().click({ timeout: 3000 });
    else if (kind === 'text') await p.getByText(arg).first().click({ timeout: 3000 });
    else if (kind === 'fill') {
      const [l, v] = arg.split('=>');
      await p.getByLabel(l).first().fill(v);
    } else if (kind === 'radio') await p.getByRole('radio', { name: arg }).first().click({ timeout: 3000 });
    else if (kind === 'goto') await p.goto('http://localhost:4173' + arg.replace(/uid:([\w:.-]+)/g, (_, n) => uid(n)));
    else if (kind === 'file')
      await p
        .getByTestId('scan-camera')
        .setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    else if (kind === 'wait') await p.waitForTimeout(+arg);
  } catch (e) {
    console.log('ACTION FAILED', a, e.message.split('\n')[0]);
  }
  await p.waitForTimeout(700);
  await dump(a);
}
await b.close();
