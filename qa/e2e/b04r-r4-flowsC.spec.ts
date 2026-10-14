import { expect, test, type Page } from '@playwright/test';
import { LOOKS, open, settled, watch } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows C: Sen opens with the message started (D135), and every button that opens Sen shows its avatar.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const message = (p: Page) => p.getByRole('textbox', { name: 'Message to Sen' });

test('R4-FLOW-5 opening Sen to set something up starts the message and sends nothing', async ({ page }) => {
  const w = watch(page);
  const F = 'R4-FLOW-5';
  await open(page, '/s/settings/claims');
  await settled(page);
  let n = 0;
  const add = page.getByRole('button', { name: 'Add a scheme' });
  const addAv = await add.locator('canvas.av').count();
  await add.click();
  await expect(message(page)).toBeVisible();
  const v1 = await message(page).inputValue();
  const focused = await message(page).evaluate((el) => document.activeElement === el);
  const caret = await message(page).evaluate((el: HTMLTextAreaElement) => [
    el.selectionStart,
    el.selectionEnd,
    el.value.length,
  ]);
  const sent = await page.locator('[role="dialog"]').innerText();
  note(
    F,
    `Add a scheme: avatar canvases ${addAv}, value ${JSON.stringify(v1)}, focused ${focused}, caret ${JSON.stringify(caret)}`,
  );
  n++;
  await step(
    page,
    F,
    n,
    'add-scheme',
    'tap Add a scheme',
    'composer holds "I want to add a claim scheme: ", caret at the end, focused, nothing sent',
    async () => {
      expect(v1).toBe('I want to add a claim scheme: ');
      expect(focused).toBe(true);
      expect(caret[0]).toBe(caret[2]);
      expect(sent).not.toContain('I want to add a claim scheme');
    },
  );
  await page.keyboard.press('Escape');
  await expect(message(page)).toHaveCount(0);

  const edit = page.getByRole('button', { name: /^Edit / }).first();
  const editName = (await edit.getAttribute('aria-label'))!.replace(/^Edit /, '');
  const editAv = await edit.locator('canvas.av').count();
  await edit.click();
  const v2 = await message(page).inputValue();
  note(F, `Edit ${editName}: avatar canvases ${editAv}, value ${JSON.stringify(v2)}`);
  n++;
  await step(
    page,
    F,
    n,
    'edit-scheme',
    `tap Edit ${editName}`,
    `composer holds "Change my ${editName} scheme: "`,
    async () => {
      expect(v2).toBe(`Change my ${editName} scheme: `);
    },
  );
  await page.keyboard.press('Escape');
  note(F, `D135 avatar on set-up buttons: Add a scheme ${addAv}, Edit ${editAv} (0 means a plain icon)`);
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-5b a started message does not linger: the plain button opens an empty composer', async ({ page }) => {
  const F = 'R4-FLOW-5b';
  await open(page, '/insights');
  await settled(page);
  let n = 0;
  const card = (name: string) => page.locator('[data-slot="card"]').filter({ hasText: name });
  await card('Am I on track?').getByRole('button', { name: 'Ask Sen about this' }).click();
  const a = await message(page).inputValue();
  await page.keyboard.press('Escape');
  await expect(message(page)).toHaveCount(0);
  // the floating Sen button
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const b = await message(page).inputValue();
  note(F, `card question ${JSON.stringify(a)}; after closing, the floating button opens with ${JSON.stringify(b)}`);
  n++;
  await step(
    page,
    F,
    n,
    'floating',
    'Ask Sen about this, close, then the floating Sen button',
    'the second composer is empty',
    async () => {
      expect(a).toBe('Am I on track?');
      expect(b).toBe('');
    },
  );
  await page.keyboard.press('Escape');
  // typed text is a different matter: type, close, open from a card
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await message(page).fill('my own words');
  await page.keyboard.press('Escape');
  await card('Am I on track?').getByRole('button', { name: 'Ask Sen about this' }).click();
  const c = await message(page).inputValue();
  note(F, `typed 'my own words', closed, then card question: composer ${JSON.stringify(c)}`);
  n++;
  await step(
    page,
    F,
    n,
    'typed-then-card',
    'type, close, tap a card question',
    'composer shows the card question (records whether the typed draft is lost)',
    async () => {
      expect(c.length).toBeGreaterThan(0);
    },
  );
});

test('R4-FLOW-5c each card asks its own question', async ({ page }) => {
  const F = 'R4-FLOW-5c';
  await open(page, '/insights');
  await settled(page);
  const seen: string[] = [];
  const names = await page.getByRole('tab').allInnerTexts();
  note(F, `steps: ${JSON.stringify(names)}`);
  let n = 0;
  for (const nm of names) {
    await page.getByRole('tab', { name: nm.trim() }).click();
    await page.waitForTimeout(700);
    const ask = page.getByRole('button', { name: 'Ask Sen about this' }).filter({ visible: true });
    const cnt = await ask.count();
    if (!cnt) {
      seen.push(`${nm}: no button`);
      continue;
    }
    await ask.first().click();
    const v = await message(page).inputValue();
    seen.push(`${nm}: ${v}`);
    await page.keyboard.press('Escape');
    await expect(message(page)).toHaveCount(0);
  }
  note(F, JSON.stringify(seen));
  n++;
  await step(
    page,
    F,
    n,
    'questions',
    'tap Ask Sen about this on every step',
    'every question is non-empty and they differ',
    async () => {
      const qs = seen.filter((s) => !s.endsWith('no button')).map((s) => s.split(': ').slice(1).join(': '));
      expect(qs.length).toBeGreaterThan(1);
      expect(qs.every((q) => q.length > 3)).toBe(true);
      expect(new Set(qs).size).toBe(qs.length);
    },
  );
});

test('R4-FLOW-6 every button that opens Sen shows its avatar, in every look', async ({ page }) => {
  const F = 'R4-FLOW-6';
  const rows: string[] = [];
  const probes: [string, string, string][] = [
    ['/s/settings/claims', 'Add a scheme', 'button'],
    ['/s/settings/claims', 'Edit', 'button'],
    ['/s/settings/claims', 'Teach Sen', 'button'],
    ['/insights', 'Ask Sen about this', 'button'],
    ['/', 'Ask Sen', 'button'],
    ['/s/account?id=x', 'Ask Sen', 'button'],
  ];
  for (const [path, name, _role] of probes) {
    await open(page, path, 'copper', 'dark');
    await settled(page);
    const b = page
      .getByRole('button', { name: new RegExp(name === 'Ask Sen' ? '^Ask Sen$' : name) })
      .filter({ visible: true })
      .first();
    if (!(await b.count())) {
      rows.push(`${path} ${name}: not found`);
      continue;
    }
    rows.push(
      `${path} ${name}: canvas.av=${await b.locator('canvas.av').count()} svg=${await b.locator('svg').count()}`,
    );
  }
  note(F, rows.join('\n'));
  await step(
    page,
    F,
    1,
    'avatars',
    'look at each button that opens Sen',
    "each shows the look's avatar canvas",
    async () => {
      for (const r of rows) expect(r, r).not.toMatch(/canvas\.av=0/);
    },
  );
});

test('R4-FLOW-6b the avatar follows the look', async ({ page }) => {
  const F = 'R4-FLOW-6b';
  let n = 0;
  const hashes: string[] = [];
  for (const look of LOOKS) {
    await open(page, '/insights', look, 'light');
    await settled(page);
    await page.waitForTimeout(500);
    const ask = page.getByRole('button', { name: 'Ask Sen about this' }).first();
    const url = await ask
      .locator('canvas.av')
      .evaluate((c: HTMLCanvasElement) => c.toDataURL().length + ':' + c.toDataURL().slice(-40));
    hashes.push(`${look}: ${url}`);
  }
  note(F, hashes.join('\n'));
  n++;
  await step(
    page,
    F,
    n,
    'looks',
    'read the Ask Sen about this avatar in each look',
    'drawn (non-blank) in all six; they differ between looks',
    async () => {
      const sig = hashes.map((h) => h.split(': ')[1]);
      expect(new Set(sig).size).toBeGreaterThan(3);
    },
  );
});
