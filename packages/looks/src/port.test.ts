// Each look in the app is a port of docs/ui/directions/src/<look>.js (B01). This test runs the original
// source the way build.mjs does and checks the port draws exactly the same SVG: the tab bar in both
// modes, the launcher and notification icons, the wordmark and the cycle strip. Where the port changed
// a look on purpose, the source was changed too and rebuilt (the brief's rule), so they still match.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { LOOK_IDS, loadLook } from './index';
import type { IconTab, Look, Mode } from './types';

const src = path.resolve(__dirname, '../../../docs/ui/directions/src');
const read = (f: string) => fs.readFileSync(path.join(src, f), 'utf8');

interface SourceLook {
  tabs: {
    icon(k: string, on: boolean, mode: Mode, u: string): string;
    scan(mode: Mode, u: string): string;
    badge?(n: string, mode: Mode, u: string): string;
    ind?(mode: Mode, u: string): string;
    bar?(mode: Mode, u: string): string;
  };
  icon: Look['icon'];
  wordmark(mode: Mode): string;
  strip(day: number, days: number, mode: Mode, st: unknown): string;
}
function source(id: string): { DIR: SourceLook; $: (name: string) => unknown } {
  const ctx = vm.createContext({ console });
  vm.runInContext(
    `${read('engine.js')}\n${read(`${id}.js`)}\n${read('charts.js')}\nthis.DIR = DIR; this.$ = (name) => eval(name);`,
    ctx,
  );
  return ctx as unknown as { DIR: SourceLook; $: (name: string) => unknown };
}

const MODES: Mode[] = ['light', 'dark'];
const ICON_TABS: IconTab[] = ['home', 'review', 'insights', 'more'];

describe.each(LOOK_IDS)('%s, ported', (id) => {
  it('draws the tab bar as the design does', async () => {
    const look = await loadLook(id);
    const { DIR } = source(id);
    for (const mode of MODES) {
      for (const k of ICON_TABS)
        for (const on of [false, true])
          expect(look.tabs.icon(k, on, mode, 'u'), `${k} ${on ? 'active' : 'idle'} ${mode}`).toBe(
            DIR.tabs.icon(k, on, mode, 'u'),
          );
      expect(look.tabs.scan(mode, 's')).toBe(DIR.tabs.scan(mode, 's'));
      if (DIR.tabs.ind) expect(look.tabs.ind?.(mode, 'i')).toBe(DIR.tabs.ind(mode, 'i'));
      if (DIR.tabs.bar) expect(look.tabs.bar?.(mode, 'b')).toBe(DIR.tabs.bar(mode, 'b'));
    }
  });

  it('draws the badge as the design does, for a one-digit count', async () => {
    const look = await loadLook(id);
    const { DIR } = source(id);
    for (const mode of MODES) expect(look.tabs.badge?.('5', mode, 'b')).toBe(DIR.tabs.badge?.('5', mode, 'b'));
  });

  it('draws the launcher and notification icons as the design does', async () => {
    const look = await loadLook(id);
    const { DIR } = source(id);
    expect(look.icon.background('p')).toBe(DIR.icon.background('p'));
    expect(look.icon.foreground('p')).toBe(DIR.icon.foreground('p'));
    expect(look.icon.monochrome('p')).toBe(DIR.icon.monochrome('p'));
    expect(look.icon.small()).toBe(DIR.icon.small());
  });

  it('matches the saved launcher and notification files', async () => {
    const look = await loadLook(id);
    const saved = (f: string) => fs.readFileSync(path.resolve(src, '../assets', id, f), 'utf8');
    expect(saved('launcher/foreground.svg')).toContain(look.icon.foreground('f').slice(0, 200).replace(/\s+</g, '<'));
    expect(saved('notification.svg')).toContain(look.icon.small());
  });

  it('draws the cycle strip as the design does', async () => {
    const look = await loadLook(id);
    const { DIR, $ } = source(id);
    if (id === 'copper' || id === 'firefly' || id === 'line' || id === 'mercury') return; // their ids count up per call; compared below
    const st = ($('STATE_VIEW') as Record<string, unknown>).normal;
    for (const mode of MODES) expect(look.strip(19, 31, mode, {})).toBe(DIR.strip(19, 31, mode, st));
  });
});

describe('strips with numbered ids', () => {
  // these looks number each strip's gradient ids; the first call in a fresh module is number 1 in both
  it.each(['firefly', 'line', 'mercury'] as const)('%s', async (id) => {
    const { DIR } = source(id);
    const look = await loadLook(id);
    const strip = (s: string) => s.replace(/(ffs-|wet|mq)\d+/g, '$1N');
    expect(strip(look.strip(19, 31, 'light', {}))).toBe(strip(DIR.strip(19, 31, 'light', {})));
  });

  it('copper keeps each day patina from what was spent by then', async () => {
    const { DIR, $ } = source('copper');
    const look = await loadLook('copper');
    const data = $('DATA') as { thisCycle: number[]; income: number };
    const st = ($('STATE_VIEW') as Record<string, { spent: number }>).normal;
    const last = data.thisCycle[data.thisCycle.length - 1];
    const spentByDay = data.thisCycle.map((v) => Math.round((v * st.spent) / last));
    const strip = (s: string) => s.replace(/cu\d+/g, 'cuN');
    expect(strip(look.strip(19, 31, 'light', { spent: st.spent, income: data.income, spentByDay }))).toBe(
      strip(DIR.strip(19, 31, 'light', st)),
    );
  });
});

describe('the wordmark', () => {
  it.each(['minted', 'firefly', 'copper', 'instrument'] as const)('%s matches the design', async (id) => {
    const { DIR } = source(id);
    const look = await loadLook(id);
    expect(look.wordmark('light')).toBe(DIR.wordmark('light'));
  });
});
