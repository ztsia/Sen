import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// The deploy journey's two builds and the server that moves from one to the other (lived.spec.ts).
// A phone that has Sen open meets a new deploy as its origin starting to serve different files, so the
// server here switches folders under an open page, sends the headers Vercel sends, compresses as Vercel
// does, and counts the bytes it serves per path: what an update costs a phone on mobile data.

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface Header {
  key: string;
  value: string;
}
/** vercel.json's headers, the one source (vite.config.ts reads the same ones for `vite preview`). */
const vercel = JSON.parse(fs.readFileSync(path.join(WEB, 'vercel.json'), 'utf8')) as {
  headers: { source: string; headers: Header[] }[];
};
const SITE_HEADERS = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);

export type Which = 'a' | 'b';

export interface DeployServer {
  /** Which build the origin serves from now on. */
  serve(which: Which): void;
  /** Bytes served per request path since the last `reset`, as they went over the wire (compressed). */
  served(): Record<string, number>;
  /** The total of `served`. */
  total(): number;
  reset(): void;
  close(): Promise<void>;
}

/**
 * Serves `a` or `b` on `port`, whichever was last chosen (A at first). Like Vercel: `/sw.js` is
 * `no-cache`, `/assets/` is immutable, any other path is the app's `index.html`, and a file that is not
 * there is a 404 (never the app, so a deleted chunk shows as the failure it is).
 */
export function startDeployServer(opts: { a: string; b: string; port: number }): Promise<DeployServer> {
  let which: Which = 'a';
  let bytes: Record<string, number> = {};
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const dir = which === 'a' ? opts.a : opts.b;
    let file = path.join(dir, pathname);
    const inside = file.startsWith(dir + path.sep);
    let status = 200;
    let body: Buffer | undefined;
    if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) body = fs.readFileSync(file);
    else if (!pathname.startsWith('/assets/') && pathname !== '/sw.js') {
      file = path.join(dir, 'index.html');
      body = fs.readFileSync(file);
    } else {
      status = 404;
      body = Buffer.from('Not found');
      file = '404.txt';
    }
    const ext = path.extname(file);
    const headers: Record<string, string> = { ...SITE_HEADERS, 'Content-Type': TYPES[ext] ?? 'text/plain' };
    if (status === 200) {
      if (pathname === '/sw.js') headers['Cache-Control'] = 'no-cache';
      else if (pathname.startsWith('/assets/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      else headers['Cache-Control'] = 'no-cache';
    }
    if (status === 200 && COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }
    headers['Content-Length'] = String(body.length);
    // the app's own pages (any path that isn't a file) count together
    const key = pathname === '/sw.js' || pathname.startsWith('/assets/') ? pathname : '(app)';
    bytes[key] = (bytes[key] ?? 0) + body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, '127.0.0.1', () =>
      resolve({
        serve: (w) => {
          which = w;
        },
        served: () => ({ ...bytes }),
        total: () => Object.values(bytes).reduce((a, b) => a + b, 0),
        reset: () => {
          bytes = {};
        },
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      }),
    );
  });
}

const HASHED = /^(.*)-([A-Za-z0-9_-]{8})(\.[a-z0-9]+)$/;

/** A file's name with its content's hash in it, as Vite names a chunk. */
function hashedName(name: string, content: string | Buffer): string {
  const m = HASHED.exec(name);
  const base = m ? m[1]! : name.replace(/\.[^.]+$/, '');
  const ext = m ? m[3]! : path.extname(name);
  const hash = createHash('sha256')
    .update(content)
    .digest('base64url')
    .replace(/[^A-Za-z0-9]/g, 'x')
    .slice(0, 8);
  return `${base}-${hash}${ext}`;
}

/** What building B changed, for a failure message. */
export interface BuildB {
  /** The chunk whose code changed, and how many files its change renamed (every file that names it, and so on up). */
  leaf: string;
  renamed: number;
  versionA: string;
  versionB: string;
  /** The entry script's path in each build, as index.html names it. */
  entryA: string;
  entryB: string;
}

const entryOf = (dir: string) =>
  /src="(\/assets\/index-[^"]+\.js)"/.exec(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'))![1]!;
const versionOf = (dir: string) =>
  /const VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'))![1]!;

/**
 * Makes build B from build A, as a new deploy that changed one small script would: that chunk gets a
 * comment appended and a new hash in its name, every file that names it (and every file that names
 * those) is renamed in turn, up to the entry script, and `sw.js` lists the new files under a new version,
 * the way sw/plugin.ts writes it. Source maps are left out of B; nothing downloads them.
 */
export function makeBuildB(aDir: string, bDir: string): BuildB {
  fs.rmSync(bDir, { recursive: true, force: true });
  fs.cpSync(aDir, bDir, { recursive: true });
  const assets = path.join(bDir, 'assets');
  for (const f of fs.readdirSync(assets)) if (f.endsWith('.map')) fs.rmSync(path.join(assets, f));

  const text = (f: string) =>
    fs.readFileSync(path.join(assets, f), 'utf8').replace(/\n?\/\/# sourceMappingURL=.*$/m, '');
  const code = fs.readdirSync(assets).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
  const orig = new Map(code.map((f) => [f, text(f)]));
  const indexHtml = fs.readFileSync(path.join(bDir, 'index.html'), 'utf8');

  // the smallest script that another one names: a leaf of the app, not its entry
  const entry = path.basename(entryOf(aDir));
  const named = (f: string) => [...orig].some(([g, t]) => g !== f && t.includes(f));
  const leaf = code
    .filter((f) => f.endsWith('.js') && f !== entry && named(f) && orig.get(f)!.length > 400)
    .sort((x, y) => orig.get(x)!.length - orig.get(y)!.length)[0];
  if (!leaf) throw new Error('no chunk to change in build A');

  // A bundler names a chunk after its content and those of the chunks it names, so one changed chunk
  // renames every chunk that names it, and every chunk that names those: here the entry script too, and
  // the chunks that import from it (Rolldown does the same, cycles included). Names come from the
  // original contents, so a cycle of imports still settles.
  const dirty = new Set([leaf]);
  for (let grew = true; grew;) {
    grew = false;
    for (const f of code) {
      if (!dirty.has(f) && [...dirty].some((d) => orig.get(f)!.includes(d))) {
        dirty.add(f);
        grew = true;
      }
    }
  }
  const current = new Map(code.map((f) => [f, dirty.has(f) ? hashedName(f, orig.get(f)! + '/* build B */') : f]));
  const content = new Map<string, string>();
  for (const f of code) {
    let t = orig.get(f)!;
    for (const g of dirty) t = t.split(g).join(current.get(g)!);
    if (f === leaf) t += '\n/* a new deploy changed this file */\n';
    content.set(f, t);
  }
  const renamed = [...current].filter(([f, now]) => f !== now);
  for (const [f] of renamed) fs.rmSync(path.join(assets, f));
  for (const f of code) fs.writeFileSync(path.join(assets, current.get(f)!), content.get(f)!);
  let html = indexHtml;
  for (const [g, now] of renamed) html = html.split(g).join(now);
  fs.writeFileSync(path.join(bDir, 'index.html'), html);

  // sw.js: the new list and the version made from it (sw/plugin.ts)
  const sw = fs.readFileSync(path.join(bDir, 'sw.js'), 'utf8');
  const filesA = JSON.parse(/const FILES = (\[.*\]);/.exec(sw)![1]!) as string[];
  const map = new Map(renamed.map(([g, now]) => ['/assets/' + g, '/assets/' + now]));
  const filesB = filesA.map((f) => map.get(f) ?? f).sort();
  const versionB = createHash('sha256').update(filesB.join('\n')).digest('hex').slice(0, 16);
  fs.writeFileSync(
    path.join(bDir, 'sw.js'),
    sw
      .replace(/const VERSION = "[^"]*";/, `const VERSION = ${JSON.stringify(versionB)};`)
      .replace(/const FILES = \[.*\];/, `const FILES = ${JSON.stringify(filesB)};`),
  );
  return {
    leaf,
    renamed: renamed.length,
    versionA: versionOf(aDir),
    versionB,
    entryA: entryOf(aDir),
    entryB: entryOf(bDir),
  };
}
