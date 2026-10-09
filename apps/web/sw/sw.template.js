// Sen's service worker (spec §5.1, B02): the app opens offline, in the Android shell and in a browser.
// Written into dist/sw.js at build time by sw/plugin.ts, which fills in this build's files and version.
//
// Every file of the build is cached when the worker installs, the six looks included, so a quarter's
// new look works offline too (B14). Navigations get the cached app shell, so a launch never waits on
// the network. A new deploy installs alongside and waits: it takes over at the next launch, never
// mid-session, because Android's WebView activates a waiting worker only once no page uses the old one.
// API calls (B05) always go to the network; this worker never caches data.

/* global __SEN_FILES__ */

const VERSION = '__SEN_VERSION__';
const FILES = __SEN_FILES__;
const CACHE = 'sen-' + VERSION;
const SHELL = '/index.html';
const CACHED = new Set(FILES);
// Paths that are never the app: the API and its kin (spec §5), served by Vercel Functions.
const NETWORK = ['/api/', '/jobs/', '/health/', '/integrations/', '/realtime/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))),
  );
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
