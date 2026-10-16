// Bundles the API into one ES module for Vercel's Node runtime: the workspace packages export
// TypeScript source, which Node can't load from node_modules, so nothing is left to resolve at runtime.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export async function bundle(outfile) {
  await build({
    entryPoints: [fileURLToPath(new URL('../src/vercel.ts', import.meta.url))],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: 'linked',
    legalComments: 'none',
    // CommonJS dependencies (pg, nodemailer) call require() for Node's built-ins
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    logLevel: 'warning',
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await bundle(process.argv[2] ?? 'dist/index.mjs');
