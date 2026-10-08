import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The production headers live in vercel.json, the one source. `vite preview` serves the same ones,
// so Playwright tests the built app under the real content security policy.
type Header = { key: string; value: string };
const vercel = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: Header[] }[];
};
const siteHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
);

// Where the build runs. Vercel sets VERCEL_ENV; SEN_ENV overrides it (Playwright builds both).
// A dev server is 'development'. A build is 'production' unless it says it's a preview, so a build
// that forgets to say never ships the dev tools (QA B01, finding 9).
const ENVS = ['development', 'preview', 'production'] as const;
function senEnv(command: 'serve' | 'build'): (typeof ENVS)[number] {
  const asked = process.env.SEN_ENV;
  if (asked !== undefined) {
    const known = ENVS.find((e) => e === asked);
    if (!known) throw new Error(`SEN_ENV must be one of ${ENVS.join(', ')}, not "${asked}"`);
    return known;
  }
  if (command === 'serve') return 'development';
  return process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development' ? 'preview' : 'production';
}

export default defineConfig(({ command }) => ({
  define: { __SEN_ENV__: JSON.stringify(senEnv(command)) },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The fonts are self-hosted from docs/ui/directions/assets/fonts/, the one copy (spec §17).
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  preview: { headers: siteHeaders },
  build: { target: 'es2022', sourcemap: true },
}));
