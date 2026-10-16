// Set by vite.config.ts at build time: where this build runs. Compare it to 'production' right where a
// dev-only chunk is imported, so a production build leaves the chunk out entirely; through an
// imported constant, Rollup still emits it.
declare const __SEN_ENV__: 'development' | 'preview' | 'production';

// Set by vite.config.ts: which backend this build reads through (data/index.ts). `api` on Vercel, or
// with SEN_BACKEND=api against the local API; `fake` for the dev server and e2e previews; `none` for
// the e2e production build. Compared in place, like __SEN_ENV__.
declare const __SEN_BACKEND__: 'api' | 'fake' | 'none';
