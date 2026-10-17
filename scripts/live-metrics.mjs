#!/usr/bin/env node
/**
 * Live timings of a deployed API (D139): times the routes a person waits for, from the runner, against a
 * Vercel preview or any origin, and says which numbers break a human limit (qa/limits.ts).
 *
 *   node scripts/live-metrics.mjs --url <origin> [--out <file.json>] [--summary]
 *
 * Each request is timed around its fetch, and its Server-Timing header is read for the server's own share.
 *   - GET /api/health: once cold (the first request of the run), then five times warm
 *   - signed out, POST /api/auth/email-otp/send-verification-otp for a stranger: three times warm, 403 not_invited
 *   - then, on any origin but production, the previews' made-up person signs in (weiming@example.com,
 *     code 123456) and GET /api/me and /api/settings run three times warm each, and the session signs out.
 *     Production is never signed in to: the script says so and runs the signed-out routes only.
 *
 * Output: a Markdown table on stdout, the flags first, one line each. --out writes the JSON (url, at,
 * metrics, flags, standing, rows, skipped). --summary appends the same Markdown to $GITHUB_STEP_SUMMARY.
 * A flag never fails the run, and nor does a request that fails: it's listed in the table. Exit 1 only on a
 * usage error.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { judgeAll, median, METRICS, serverTiming } from '../qa/limits.ts';

const PRODUCTION = 'https://sen-my.vercel.app';
const SEND = '/api/auth/email-otp/send-verification-otp';
const NOBODY = 'nobody-live-metrics@example.com';
const MADE_UP = 'weiming@example.com';
const CODE = '123456';
const TIMEOUT_MS = 30_000;

/* ---------- arguments ---------------------------------------------------------- */

const USAGE = 'usage: node scripts/live-metrics.mjs --url <origin> [--out <file.json>] [--summary]';
const usage = (msg) => {
  console.error(msg ? `${msg}\n${USAGE}` : USAGE);
  process.exit(1);
};

const argv = process.argv.slice(2);
const KNOWN = ['--url', '--out', '--summary', '--help'];
if (argv.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}
const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN.includes(a));
if (unknown.length) usage(`unknown option ${unknown.join(' ')}`);
const valueOf = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) usage(`${name} needs a value`);
  return v;
};
const urlArg = valueOf('--url');
if (urlArg === undefined) usage('--url is required');
const outArg = valueOf('--out');
const summary = argv.includes('--summary');

let base;
try {
  base = new URL(urlArg);
} catch {
  usage(`--url is not a URL: ${urlArg}`);
}
if (base.protocol !== 'http:' && base.protocol !== 'https:') usage('--url needs http or https');
const origin = base.origin;
const isProduction = origin === new URL(PRODUCTION).origin;

/* ---------- requests ------------------------------------------------------------ */

const isHealthy = (s) => s.status === 200 && s.json?.ok === true;
const isNotInvited = (s) => s.status === 403 && s.json?.code === 'not_invited';
const isSent = (s) => s.status === 200 && s.json?.success === true;
const is200 = (s) => s.status === 200;

/** Why a sample didn't answer as expected, as the table says it. */
function problem(s) {
  if (s.error) return s.error;
  if (s.status === 200) return 'unexpected body';
  return `HTTP ${s.status}${s.json?.code ? ` ${s.json.code}` : ''}`;
}

/** One request, timed around its fetch and its body's read. Never throws: a failure is a sample too. */
async function once(method, path, { body, cookie, ok }) {
  const headers = {};
  if (body !== undefined) Object.assign(headers, { 'content-type': 'application/json', origin });
  if (cookie) headers.cookie = cookie;
  const t0 = performance.now();
  try {
    const res = await fetch(origin + path, {
      method,
      headers,
      redirect: 'manual',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    const totalMs = performance.now() - t0;
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    const sample = {
      status: res.status,
      json,
      totalMs,
      timing: serverTiming(res.headers.get('server-timing')),
      setCookie: res.headers.getSetCookie(),
      error: null,
    };
    return { ...sample, ok: ok(sample) };
  } catch (e) {
    const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    const reason = timedOut
      ? `no answer in ${TIMEOUT_MS / 1000} s`
      : `network error: ${e?.cause?.code ?? e?.message ?? e}`;
    return {
      status: null,
      json: undefined,
      totalMs: performance.now() - t0,
      timing: {},
      setCookie: [],
      error: reason,
      ok: false,
    };
  }
}

/** The same request, n times in a row. */
async function timed(method, path, n, opts) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(await once(method, path, opts));
  return out;
}

/** The session cookie as a Cookie header: name=value pairs only, and not the ones the server cleared. */
function sessionCookie(setCookie) {
  return setCookie
    .filter((c) => !/max-age=0\b/i.test(c))
    .map((c) => c.split(';')[0].trim())
    .filter((pair) => pair.indexOf('=') > 0 && pair.slice(pair.indexOf('=') + 1) !== '')
    .join('; ');
}

/* ---------- the rows ----------------------------------------------------------- */

const med = (xs) => (xs.length ? Math.round(median(xs) * 10) / 10 : undefined);

/** A route's samples at one phase, as the table and the metrics read them. */
function rowOf(route, phase, samples) {
  const answered = samples.filter((s) => s.ok);
  const timedOk = answered.filter((s) => s.timing.app !== undefined);
  const counts = new Map();
  for (const s of samples.filter((s) => !s.ok)) counts.set(problem(s), (counts.get(problem(s)) ?? 0) + 1);
  const problems = [...counts].map(([p, c]) => (c > 1 ? `${p} ×${c}` : p));
  if (answered.length && timedOk.length < answered.length) problems.push('no Server-Timing');
  return {
    route,
    phase,
    // only the cold and warm rows are judged; a sign-in step happens once a run, so its numbers are shown only
    judged: phase === 'cold' || phase === 'warm',
    asked: samples.length,
    answered: answered.length,
    totalMs: med(answered.map((s) => s.totalMs)),
    serverMs: med(timedOk.map((s) => s.timing.app)),
    dbMs: med(timedOk.map((s) => s.timing.db)),
    queries: med(timedOk.map((s) => s.timing['db-queries'])),
    problems,
  };
}

const keyOf = (row) => `live:${row.route} ${row.phase}`;

/** A judged row's numbers as metrics. Only the server's own share has a limit: the trip from the runner doesn't. */
function metricsOf(row) {
  if (!row.judged || row.answered === 0) return [];
  const key = keyOf(row);
  const out = [{ key, metric: 'live.totalMs', value: row.totalMs, n: row.answered }];
  if (row.serverMs !== undefined) out.push({ key, metric: 'api.serverMs', value: row.serverMs, n: row.answered });
  if (row.dbMs !== undefined) out.push({ key, metric: 'api.dbMs', value: row.dbMs, n: row.answered });
  if (row.queries !== undefined) out.push({ key, metric: 'api.queries', value: row.queries, n: row.answered });
  return out;
}

const showValue = (metric, v) => (METRICS[metric].unit === 'ms' ? `${v} ms` : String(v));

/* ---------- the run ------------------------------------------------------------ */

const at = new Date().toISOString();
const rows = [];
const skipped = [];

rows.push(rowOf('GET /api/health', 'cold', await timed('GET', '/api/health', 1, { ok: isHealthy })));
rows.push(rowOf('GET /api/health', 'warm', await timed('GET', '/api/health', 5, { ok: isHealthy })));
rows.push(
  rowOf(
    `POST ${SEND}`,
    'warm',
    await timed('POST', SEND, 3, { body: { email: NOBODY, type: 'sign-in' }, ok: isNotInvited }),
  ),
);

if (isProduction) {
  skipped.push(
    `Sign-in skipped: ${origin} is production. The made-up person signs in only on previews, so only the signed-out routes ran here.`,
  );
} else {
  const sent = await timed('POST', SEND, 1, { body: { email: MADE_UP, type: 'sign-in' }, ok: isSent });
  rows.push(rowOf(`POST ${SEND}`, 'once', sent));
  if (!sent[0].ok) {
    skipped.push(`Sign-in skipped: asking for the made-up person's code failed (${problem(sent[0])}).`);
  } else {
    const signIn = await timed('POST', '/api/auth/sign-in/email-otp', 1, {
      body: { email: MADE_UP, otp: CODE },
      ok: is200,
    });
    rows.push(rowOf('POST /api/auth/sign-in/email-otp', 'once', signIn));
    const cookie = signIn[0].ok ? sessionCookie(signIn[0].setCookie) : '';
    if (!cookie) {
      skipped.push(
        `Sign-in skipped: the code didn't sign the made-up person in (${signIn[0].ok ? 'no session cookie came back' : problem(signIn[0])}).`,
      );
    } else {
      rows.push(rowOf('GET /api/me', 'warm', await timed('GET', '/api/me', 3, { cookie, ok: is200 })));
      rows.push(rowOf('GET /api/settings', 'warm', await timed('GET', '/api/settings', 3, { cookie, ok: is200 })));
      rows.push(
        rowOf(
          'POST /api/auth/sign-out',
          'once',
          await timed('POST', '/api/auth/sign-out', 1, { body: {}, cookie, ok: is200 }),
        ),
      );
    }
  }
}

const metrics = rows.flatMap(metricsOf);
const { flags, standing } = judgeAll(metrics, []);

for (const row of rows) {
  const mine = flags.filter((f) => f.key === keyOf(row));
  const parts = [];
  if (row.answered === 0) parts.push(`failed: ${row.problems.join('; ')}`);
  else if (!row.judged) parts.push('not judged (one request per run)');
  else if (mine.length)
    parts.push(...mine.map((f) => `over ${showValue(f.metric, f.verdict.limit)}: ${METRICS[f.metric].says}`));
  else parts.push('ok');
  if (row.answered > 0 && row.answered < row.asked) parts.push(`${row.answered} of ${row.asked} answered`);
  if (row.answered > 0 && row.problems.length) parts.push(...row.problems);
  row.verdict = parts.join('; ');
}

/* ---------- the output --------------------------------------------------------- */

const cell = (v) => (v === undefined ? '-' : String(v));
const lines = [];
lines.push(`## Live preview timings: ${origin}`, '');
lines.push(
  `Measured ${at} from the runner. Server ms is the function's own time (Server-Timing); total ms also carries the trip from the runner, so only server ms has a limit (D139).`,
  '',
);
if (flags.length) {
  for (const f of flags) {
    lines.push(
      `- **Flag** \`${f.key}\`, ${f.metric}: ${showValue(f.metric, f.value)}, over the ${showValue(f.metric, f.verdict.limit)} limit (${METRICS[f.metric].says})`,
    );
  }
  lines.push('');
} else {
  lines.push('No number is over a human limit.', '');
}
lines.push('| Route | Phase | Total ms | Server ms | DB ms | Queries | Verdict |');
lines.push('|---|---|---:|---:|---:|---:|---|');
for (const r of rows) {
  lines.push(
    `| \`${r.route}\` | ${r.phase} | ${cell(r.totalMs)} | ${cell(r.serverMs)} | ${cell(r.dbMs)} | ${cell(r.queries)} | ${r.verdict} |`,
  );
}
lines.push('');
for (const s of skipped) lines.push(s, '');
const md = lines.join('\n');

const report = { url: origin, at, metrics, flags, standing, rows, skipped };

if (outArg !== undefined) {
  const file = resolve(outArg);
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  } catch (e) {
    console.error(`could not write ${file}: ${e.message}`);
  }
}

console.log(md);

if (summary) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) console.error('GITHUB_STEP_SUMMARY is not set, so the summary was not written');
  else {
    try {
      appendFileSync(file, `${md}\n`);
    } catch (e) {
      console.error(`could not append to ${file}: ${e.message}`);
    }
  }
}
