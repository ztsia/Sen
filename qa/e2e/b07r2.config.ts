import base from './b07.config';

// QA B07 run 2 (scoped): b07r2-flows.spec.ts, with b07.config.ts' servers. Rebuild both builds first
// (apps/web: `SEN_ENV=preview vite build --outDir dist-qa`, and with `SEN_BACKEND=api SEN_API_PORT=8788`
// into dist-server), then from qa/e2e: ./node_modules/.bin/playwright test -c b07r2.config.ts
export default { ...base, testMatch: /b07r2-flows\.spec\.ts/ };
