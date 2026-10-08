#!/usr/bin/env node
// Writes src/styles/looks.gen.css: every look's tokens, scoped by data-look and data-mode, from the
// files the design track saved (B01; patterns.md §2). Change those, never this file's output:
//   docs/ui/directions/assets/<look>/theme.css   shadcn's, money, chart and icon tokens, in OKLCH
//   docs/ui/directions/assets/<look>/tokens.json the look's own extra variables (warn-bg and the like)
//   docs/ui/directions/src/<look>.css            the :root block: fonts, figure size, card radius
//   node scripts/looks-css.mjs           write it
//   node scripts/looks-css.mjs --check   fail if it is out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const dirs = path.join(repo, 'docs/ui/directions');
const out = path.resolve(here, '../src/styles/looks.gen.css');
export const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];

const blocks = (css, selector) => {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(re)].map((m) => m[1]);
};
const decls = (body) =>
  body
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d.startsWith('--'))
    .map((d) => {
      const i = d.indexOf(':');
      return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
    });

function lookCss(id) {
  const theme = fs.readFileSync(path.join(dirs, 'assets', id, 'theme.css'), 'utf8');
  const tokens = JSON.parse(fs.readFileSync(path.join(dirs, 'assets', id, 'tokens.json'), 'utf8'));
  const own = fs.readFileSync(path.join(dirs, 'src', `${id}.css`), 'utf8');
  const [shape, light] = blocks(theme, ':root');
  const [dark] = blocks(theme, '.dark');
  const [vars] = blocks(own, ':root');
  if (!shape || !light || !dark || !vars) throw new Error(`${id}: a token block is missing`);
  const lightDecls = decls(light);
  const known = new Set(lightDecls.map(([k]) => k.slice(2)));
  const extra = (mode) =>
    Object.entries(tokens[mode])
      .filter(([k]) => !known.has(k))
      .map(([k, v]) => [`--${k}`, v]);
  const fmt = (list) => list.map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return [
    `[data-look='${id}'] {`,
    fmt(decls(shape)),
    fmt(decls(vars)),
    fmt(lightDecls),
    fmt(extra('light')),
    '  color-scheme: light;',
    '}',
    `[data-look='${id}'][data-mode='dark'] {`,
    fmt(decls(dark)),
    fmt(extra('dark')),
    '  color-scheme: dark;',
    '}',
  ].join('\n');
}

export function render() {
  return `/* Written by apps/web/scripts/looks-css.mjs from docs/ui/directions/. Don't edit: change the source and run pnpm looks. */\n${LOOKS.map(lookCss).join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = render();
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (now !== css) {
      console.error('src/styles/looks.gen.css is out of date: run pnpm looks and commit it.');
      process.exit(1);
    }
    console.log('looks.gen.css is up to date.');
  } else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, css);
    console.log(`wrote ${path.relative(repo, out)} (${LOOKS.length} looks)`);
  }
}
