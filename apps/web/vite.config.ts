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

// Where the build runs. Vercel sets VERCEL_ENV; SEN_ENV overrides it (Playwright builds production too).
// A dev server is 'development', and any other build is a 'preview' unless it says production.
export default defineConfig(({ command }) => ({
  define: {
    __SEN_ENV__: JSON.stringify(
      process.env.SEN_ENV ??
        (command === 'serve' ? 'development' : process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'),
    ),
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The fonts are self-hosted from docs/ui/directions/assets/fonts/, the one copy (spec §17).
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  preview: { headers: siteHeaders },
  build: { target: 'es2022', sourcemap: true },
}));
