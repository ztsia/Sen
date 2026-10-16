// Sen's service worker (spec §5.1, B02): the app opens offline, in the Android shell and in a browser.
// Written into dist/sw.js at build time by sw/plugin.ts, which fills in this build's files and version.
//
// Every file of the build is cached when the worker installs, the six looks included, so a quarter's
// new look works offline too (B14). Navigations get the cached app shell, so a launch never waits on
// the network. A new deploy installs alongside and waits until the page tells it to take over
// (src/shell/service-worker.ts, D138): at once if Sen was only just opened, otherwise when the person
// taps *Update*. Android's WebView keeps the page alive, so waiting for no page to use the old worker
// could take days (qa/escapes.md E3).
// API calls (B05) always go to the network; this worker never caches data.

/* global __SEN_FILES__ */

const VERSION = '__SEN_VERSION__';
const FILES = __SEN_FILES__;
const CACHE = 'sen-' + VERSION;
const SHELL = '/index.html';
const CACHED = new Set(FILES);
// Paths that are never the app: the API and its kin (spec §5), served by Vercel Functions.
const NETWORK = ['/api/', '/jobs/', '/health/', '/integrations/', '/realtime/'];

// A file under /assets/ carries its content's hash in its name (Vite), so one an older version already
// cached is the same file: an update downloads only what changed, not all 3.7 MB again (D138).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        FILES.map(async (f) => {
          const kept = f.startsWith('/assets/') ? await caches.match(f) : undefined;
          const res = kept || (await fetch(new Request(f, { cache: 'reload' })));
          if (!res.ok) throw new Error(`${f}: ${res.status}`);
          await cache.put(f, res);
        }),
      ),
    ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'sen:update') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('sen-') && key !== CACHE) await caches.delete(key);
      }
      // The first install takes the page it was registered from, so that page's later loads are cached.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NETWORK.some((p) => url.pathname.startsWith(p))) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match(SHELL, { cacheName: CACHE }).then((hit) => hit || fetch(req)));
    return;
  }
  if (CACHED.has(url.pathname)) {
    event.respondWith(caches.match(url.pathname, { cacheName: CACHE }).then((hit) => hit || fetch(req)));
  }
});
