#!/usr/bin/env node
/**
 * What a build costs a phone (D139), as the metrics qa/limits.ts judges. Reads a built folder, not the source:
 *
 *   node scripts/build-metrics.mjs <distDir>        prints the metrics as JSON
 *
 *   build:install          what a first install downloads: every file in the service worker's precache list
 *                          (the FILES array in sw.js), gzipped
 *   build:first-screen     the JS index.html loads: its module script and its modulepreload links, gzipped
 *   build:chunk/<name>     the 8 largest JS files, gzipped, by name without the hash
 *
 * Nothing here names a cause: the numbers are what a phone downloads, and main's are beside them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const CHUNKS = 8;

const gzipped = (file) => {
  try {
    return gzipSync(readFileSync(file)).length;
  } catch {
    return 0;
  }
};

/** Every file under `dir`, as paths relative to it. */
function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1)],
  );
}

/** The files the service worker caches when it installs; every file of the build, bar maps, if it lists none. */
function precached(distDir) {
  try {
    const sw = readFileSync(join(distDir, 'sw.js'), 'utf8');
    const m = sw.match(/const FILES = (\[[^\]]*\])/);
    if (m) return JSON.parse(m[1]).map((p) => p.replace(/^\//, ''));
  } catch {
    // no worker in this build
  }
  return walk(distDir).filter((f) => !f.endsWith('.map'));
}

/** The scripts index.html loads before the first screen: its module scripts and modulepreload links. */
function firstScreenScripts(distDir) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const urls = new Set();
  for (const tag of html.match(/<(script|link)\b[^>]*>/g) ?? []) {
    const isScript = tag.startsWith('<script') && /type=["']module["']/.test(tag);
    const isPreload = tag.startsWith('<link') && /rel=["']modulepreload["']/.test(tag);
    if (!isScript && !isPreload) continue;
    const url = tag.match(/(?:src|href)=["']([^"']+)["']/)?.[1];
    if (url && !/^https?:/.test(url)) urls.add(url.split(/[?#]/)[0].replace(/^\//, ''));
  }
  return [...urls];
}

/** `assets/sign-in-6y8_kYfy.js` is `sign-in`: Vite's hash is the last eight characters. */
const chunkName = (file) => basename(file).replace(/-[\w-]{8}\.js$/, '');

export function buildMetrics(distDir) {
  const out = [];
  const install = precached(distDir).reduce((n, f) => n + gzipped(join(distDir, f)), 0);
  out.push({ key: 'build:install', metric: 'build.installBytes', value: install, n: 1 });
  const first = firstScreenScripts(distDir).reduce((n, f) => n + gzipped(join(distDir, f)), 0);
  out.push({ key: 'build:first-screen', metric: 'build.firstScreenJsBytes', value: first, n: 1 });
  const chunks = walk(join(distDir, 'assets'), distDir)
    .filter((f) => f.endsWith('.js') && statSync(join(distDir, f)).isFile())
    .map((f) => ({ name: chunkName(f), bytes: gzipped(join(distDir, f)) }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
    .slice(0, CHUNKS);
  const seen = new Map();
  for (const c of chunks) {
    // two chunks can share a name once the hash is gone: the second is `name~2`
    const nth = (seen.get(c.name) ?? 0) + 1;
    seen.set(c.name, nth);
    out.push({
      key: `build:chunk/${nth > 1 ? `${c.name}~${nth}` : c.name}`,
      metric: 'build.chunkBytes',
      value: c.bytes,
      n: 1,
    });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/build-metrics.mjs <distDir>');
    process.exit(2);
  }
  console.log(JSON.stringify(buildMetrics(dir), null, 2));
}
