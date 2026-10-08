// Set by vite.config.ts at build time: where this build runs. Compare it to 'production' right where a
// dev-only chunk is imported, so a production build leaves the chunk out entirely; through an
// imported constant, Rollup still emits it.
declare const __SEN_ENV__: 'development' | 'preview' | 'production';
