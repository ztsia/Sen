// The emulator tests' site (apps/shell/android/app/src/androidTest): the web app's build, served as
// Vercel serves it (vercel.json's headers, the app shell for every path), on the runner, and reached
// from the emulator as localhost:4173 through `adb reverse`.
//
//   node apps/shell/e2e/serve.mjs <dist> [port]
//
// GET /__sen_offline?on=1 makes it drop every other connection, which is what airplane mode looks like
// to the WebView; ?on=0 brings it back.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'apps/web/dist');
const port = Number(process.argv[3] ?? 4173);
const vercel = JSON.parse(fs.readFileSync(new URL('../../web/vercel.json', import.meta.url), 'utf8'));
const headersFor = (p) =>
  Object.fromEntries(
    vercel.headers
      .filter((h) => new RegExp('^' + h.source.replace('(.*)', '.*') + '$').test(p))
      .flatMap((h) => h.headers.map((x) => [x.key, x.value])),
  );
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.png': 'image/png',
};

let offline = false;
http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/__sen_offline') {
      offline = url.searchParams.get('on') === '1';
      res.writeHead(204).end();
      return;
    }
    if (offline) {
      req.socket.destroy();
      return;
    }
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(dist, 'index.html');
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      ...headersFor(url.pathname),
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`serving ${dist} on :${port}`));
