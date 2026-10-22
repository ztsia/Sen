import base from './b05feel2.config';
import { defineConfig } from '@playwright/test';
// Runs run 1 and 2's motion specs against a probe build served on :4184
export default defineConfig({
  ...base,
  testMatch: /b05feel2?-.*\.spec\.ts/,
  use: { ...base.use, baseURL: 'http://localhost:4184' },
});
