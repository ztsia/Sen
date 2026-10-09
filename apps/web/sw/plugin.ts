import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Writes dist/sw.js from sw.template.js, listing every file this build emitted (source maps aside)
 * and the app shell, with a version made from their names, which carry content hashes. A new deploy
 * changes the list, so the worker's bytes change and the phone installs the new one.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'sen-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [
        '/index.html',
        ...Object.keys(bundle)
          .filter((f) => !f.endsWith('.map') && f !== 'index.html')
          .map((f) => '/' + f),
      ].sort();
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 16);
      const template = fs.readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace("'__SEN_VERSION__'", JSON.stringify(version))
          .replace('const FILES = __SEN_FILES__;', `const FILES = ${JSON.stringify(files)};`),
      });
    },
  };
}
