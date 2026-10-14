import { expect, test, type Page } from '@playwright/test';
import { runChecks, type CheckId } from './checks';

// D137: each scripted check is shown to fire on a page built to break it, and to stay quiet on the same
// page fixed. Every page is plain HTML at the phone's 390×844, so what fires is the check, not the app.

/** A page that is clean in every check, with `style` and `body` added to it. */
const html = (body: string, style = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Check fixture</title>
<style>
  body { margin: 0; font: 16px/24px sans-serif; color: #1a1a1a; background: #fff; }
  main { padding: 16px; }
  button { min-width: 48px; min-height: 48px; font: inherit; color: #1a1a1a; background: #e8e8e8; border: 0; border-radius: 8px; }
  input { box-sizing: border-box; height: 48px; width: 100%; font: inherit; color: #1a1a1a; background: #fff; border: 1px solid #767676; }
  button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid #0a3d91; outline-offset: 2px; }
  ${style}
</style>
</head>
<body>
${body}
</body>
</html>`;

async function findings(page: Page, content: string, check: CheckId) {
  await page.setContent(content);
  return (await runChecks(page)).filter((f) => f.check === check);
}

/** The page fixed reports nothing at all, so it stays a fair baseline for every other check too. */
async function quiet(page: Page, content: string) {
  await page.setContent(content);
  expect(await runChecks(page)).toEqual([]);
}

test.describe('axe', () => {
  const page1 = (colour: string) =>
    html(`<main><h1>Title</h1><p style="color: ${colour}">Pale grey on white</p></main>`);
  test('fires on text too pale to read', async ({ page }) => {
    const f = await findings(page, page1('#c8c8c8'), 'axe');
    expect(f.map((x) => x.detail).join('\n')).toContain('color-contrast');
  });
  test('is quiet once the text is dark enough', async ({ page }) => {
    await quiet(page, page1('#333'));
  });
});

test.describe('target', () => {
  const page1 = (size: number) =>
    html(`<main><button style="width: ${size}px; height: ${size}px; min-width: 0; min-height: 0">Go</button></main>`);
  test('fires on a button smaller than 48 px', async ({ page }) => {
    const f = await findings(page, page1(30), 'target');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('button "Go" 30×30');
  });
  test('is quiet at 48 px', async ({ page }) => {
    await quiet(page, page1(48));
  });
});

test.describe('clipped', () => {
  const cut = (extra: string) =>
    html(
      `<main><div style="width: 100px; overflow: hidden; white-space: nowrap; ${extra}">A caption longer than its box</div></main>`,
    );
  test('fires on text cut off by its own box', async ({ page }) => {
    const f = await findings(page, cut(''), 'clipped');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('div "A caption longer than its box"');
    expect(f[0]!.detail).toContain('cut off');
  });
  test('is quiet when it ends in an ellipsis on purpose', async ({ page }) => {
    await quiet(page, cut('text-overflow: ellipsis'));
  });
  test('is quiet when a line clamp cuts it on purpose', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><p style="width: 120px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden">One two three four five six seven eight nine ten eleven twelve thirteen</p></main>`,
      ),
    );
  });
  const edge = (width: string) =>
    html(
      `<main><p style="margin-left: 260px; width: ${width}">Past the right edge</p></main>`,
      `p { white-space: nowrap }`,
    );
  test('fires on text that runs past the screen edge', async ({ page }) => {
    const f = await findings(page, edge('auto'), 'clipped');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('right edge');
  });
  test('is quiet once the text fits', async ({ page }) => {
    await quiet(page, html(`<main><p>Inside the edge</p></main>`));
  });
  test('is quiet for a strip that scrolls sideways, whose far end is off screen by design', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><div tabindex="0" aria-label="Chips" style="display: flex; gap: 8px; align-items: center; height: 48px; overflow-x: auto"><span style="flex: none">A first chip</span><span style="flex: none">A second chip</span><span style="flex: none">A third chip</span><span style="flex: none">A fourth chip</span></div></main>`,
      ),
    );
  });
});

test.describe('overlap', () => {
  const buttons = (top: number) =>
    html(
      `<main style="position: relative; height: 300px"><button style="position: absolute; left: 20px; top: 20px">First</button><button style="position: absolute; left: 50px; top: ${top}px">Second</button></main>`,
    );
  test('fires on two targets drawn over each other', async ({ page }) => {
    const f = await findings(page, buttons(40), 'overlap');
    expect(f.length).toBeGreaterThan(0);
    expect(f[0]!.detail).toMatch(/button "First".*overlaps button "Second"/);
  });
  test('is quiet once the targets are apart', async ({ page }) => {
    await quiet(page, buttons(100));
  });
  const texts = (top: number) =>
    html(
      `<main style="position: relative; height: 100px"><span style="position: absolute; left: 20px; top: 20px">Overdue bills</span><span style="position: absolute; left: 40px; top: ${top}px">RM 1,284.00</span></main>`,
    );
  test('fires on two texts drawn over each other', async ({ page }) => {
    const f = await findings(page, texts(24), 'overlap');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('"Overdue bills"');
  });
  test('is quiet once the texts are apart', async ({ page }) => {
    await quiet(page, texts(60));
  });
  test('is quiet for a bar fixed over scrolling content: that is the cover check, not this one', async ({ page }) => {
    const f = await findings(
      page,
      html(
        `<main><div style="height: 1400px"><p style="margin-top: 770px">Under the bar</p></div></main><nav style="position: fixed; left: 0; right: 0; bottom: 0; height: 80px; background: #ddd">Bar</nav>`,
      ),
      'overlap',
    );
    expect(f).toEqual([]);
  });
  test('is quiet for tight line spacing, whose lines touch but whose letters do not', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><h2 style="margin: 0; font-size: 40px; line-height: 1">Big</h2><h2 style="margin: 0; font-size: 40px; line-height: 1">Bigger</h2></main>`,
      ),
    );
  });
});

test.describe('covered', () => {
  // the last control on a long page, with a bar fixed over the foot of the screen
  const longPage = (room: number) =>
    html(
      `<main style="padding-bottom: ${room}px"><div style="height: 1400px"></div><button>Save</button></main><nav style="position: fixed; left: 0; right: 0; bottom: 0; height: 80px; background: #ddd">Saved</nav>`,
    );
  test('fires on a button the bar still hides at the foot of the page', async ({ page }) => {
    const f = await findings(page, longPage(0), 'covered');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/^button "Save" 48×48 under nav/);
  });
  test('is quiet once the page has room to scroll it clear', async ({ page }) => {
    await quiet(page, longPage(96));
  });
  test('is quiet for a button the bar hides only until it is scrolled to', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><div style="height: 760px"></div><button>Save</button><div style="height: 1000px"></div></main><nav style="position: fixed; left: 0; right: 0; bottom: 0; height: 80px; background: #ddd">Bar</nav>`,
      ),
    );
  });
  test('puts the scroll back where it found it', async ({ page }) => {
    await page.setContent(longPage(0));
    await page.evaluate(() => window.scrollTo(0, 300));
    await runChecks(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(300);
  });
});

test.describe('keyboard', () => {
  // the form sits in a screen-high column that clips, so nothing in it scrolls when the screen shrinks
  const form = (column: string) =>
    html(
      `<div style="${column}"><form onsubmit="return false"><label for="n">Name</label><input id="n" type="text"><div style="height: 560px"></div><button type="submit">Save</button></form></div>`,
    );
  test('fires on a button the shrunk screen leaves out of reach', async ({ page }) => {
    const f = await findings(page, form('height: 100vh; overflow: clip'), 'keyboard');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/^button "Save" 48×48 out of reach/);
  });
  test('is quiet when the page scrolls to it', async ({ page }) => {
    await quiet(page, form(''));
  });
  test('fires on a field the shrunk screen leaves out of reach', async ({ page }) => {
    await page.setContent(
      html(
        `<div style="height: 100vh; overflow: clip"><div style="height: 700px"></div><input aria-label="Amount" type="text"></div>`,
      ),
    );
    const f = (await runChecks(page)).filter((x) => x.check === 'keyboard');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/^input "Amount" \d+×48 out of reach/);
  });
  test('puts the viewport back', async ({ page }) => {
    await page.setContent(form('height: 100vh; overflow: clip'));
    const was = page.viewportSize();
    await runChecks(page);
    expect(page.viewportSize()).toEqual(was);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});

test.describe('focus', () => {
  const field = (ring: string) =>
    html(`<main><input aria-label="Amount" type="text"><button>Save</button></main>`, ring);
  test('fires on controls that take focus with no ring', async ({ page }) => {
    const f = await findings(page, field('button:focus-visible, input:focus-visible { outline: none }'), 'focus');
    expect(f.map((x) => x.detail)).toEqual([
      expect.stringContaining('input "Amount"'),
      expect.stringContaining('button "Save"'),
    ]);
  });
  test('fires when only a shadow the control always has is there', async ({ page }) => {
    const f = await findings(
      page,
      field(
        'button:focus-visible, input:focus-visible { outline: none } button, input { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) }',
      ),
      'focus',
    );
    expect(f).toHaveLength(2);
  });
  test('fires on a ring the colour of its background', async ({ page }) => {
    const f = await findings(
      page,
      field('button:focus-visible, input:focus-visible { outline: 2px solid #fff }'),
      'focus',
    );
    expect(f).toHaveLength(2);
  });
  test('is quiet with an outline ring', async ({ page }) => {
    await quiet(page, field(''));
  });
  test('is quiet with a box-shadow ring', async ({ page }) => {
    await quiet(
      page,
      field(
        'button:focus-visible, input:focus-visible { outline: none; box-shadow: 0 0 0 3px #0a3d91 } button, input { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) }',
      ),
    );
  });
  test('is quiet with a ring drawn by ::after', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><button style="position: relative">Save</button></main>`,
        `button { outline: none } button:focus-visible::after { content: ""; position: absolute; inset: -4px; border-radius: 12px; outline: 2px solid #0a3d91 }`,
      ),
    );
  });
  test('is quiet for a field whose underline darkens, on the wrapper that holds it', async ({ page }) => {
    await quiet(
      page,
      html(
        `<main><div class="wrap"><input aria-label="Amount" type="text"></div></main>`,
        `.wrap { border-bottom: 2px solid #c8c8c8; width: 200px } .wrap:focus-within { border-bottom-color: #0a3d91 } input { border: 0; outline: none }`,
      ),
    );
  });
  test('stops when focus comes round again, and leaves nothing focused', async ({ page }) => {
    await page.setContent(field(''));
    await runChecks(page);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});
