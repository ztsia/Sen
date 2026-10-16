// Writes Vercel's Build Output (v3) after `vite build`: the web app as static files and the API as one
// Node function at /api, on one domain (spec §16). vercel.json stays the one source of the headers
// and rewrites, translated into routes here, because a build that writes .vercel/output is served
// from it as it is. Runs on Vercel only (VERCEL=1), or with --force to inspect it locally.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { bundle } from '../../api/scripts/bundle.mjs';

if (!process.env.VERCEL && !process.argv.includes('--force')) process.exit(0);

const web = fileURLToPath(new URL('..', import.meta.url));
const out = `${web}.vercel/output`;
const fn = `${out}/functions/api.func`;
const config = JSON.parse(await readFile(`${web}vercel.json`, 'utf8'));

await rm(out, { recursive: true, force: true });
await mkdir(fn, { recursive: true });
await cp(`${web}dist`, `${out}/static`, { recursive: true });
await bundle(`${fn}/index.mjs`);
// In Singapore (sin1), beside the Neon databases: Vercel's default, Washington, put a Pacific crossing
// in every query, and signing in took seconds (qa/escapes.md E2).
await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    maxDuration: 300,
    
  }),
);
await writeFile(`${fn}/package.json`, JSON.stringify({ type: 'module' }));

// vercel.json's sources are path-to-regexp patterns that are also plain regexes ("/(.*)"), kept so
const headers = config.headers.map((h) => ({
  src: h.source,
  headers: Object.fromEntries(h.headers.map((x) => [x.key, x.value])),
  continue: true,
}));
const rewrites = config.rewrites.map((r) => ({ src: r.source, dest: r.destination }));
const routes = [...headers, { src: '^/api(?:/.*)?$', dest: '/api' }, { handle: 'filesystem' }, ...rewrites];
await writeFile(`${out}/config.json`, JSON.stringify({ version: 3, routes }, null, 2));
console.log(`vercel-output: static, api.func and ${routes.length} routes in .vercel/output`);
