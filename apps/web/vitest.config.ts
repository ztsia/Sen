import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

// Component and unit tests for the web app, in jsdom. Journeys are Playwright's (e2e/).
export default defineProject({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { name: 'web', include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom' },
});
