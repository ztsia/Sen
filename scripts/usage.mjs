#!/usr/bin/env node
// What a session spent, by agent and by model, read from Claude Code's own transcripts, so the
// workflow can be tuned on measurements (D125). Run it before a handoff or a PR:
//
//   node scripts/usage.mjs                 the newest session in this project: a table on stdout
//   node scripts/usage.mjs --log B03       and upsert its row in docs/usage.md, tagged with the slice
//   node scripts/usage.mjs --session <id>  a given session
//
// Transcripts live in ~/.claude/projects/<project>/, one .jsonl per session and one per subagent
// under <session>/subagents/, with a .meta.json naming its type. They go when the cloud VM does,
// so a session that never ran this leaves no row.
//
// The dollar column is an API-price equivalent, a proxy for the share of the plan's quota a part of
// the work used, not a bill. Prices per million tokens; cache reads and writes are multiples of input.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const PRICE = {
  opus: { in: 4, out: 20 },
  sonnet: { in: 2, out: 10 },
  haiku: { in: 0.1, out: 0.5 },
};
const CACHE_READ = 0.1;
const CACHE_WRITE_5M = 1.25;
const CACHE_WRITE_1H = 2;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const repo = process.cwd();
const dir = join(homedir(), '.claude', 'projects', repo.replace(/[^A-Za-z0-9]/g, '-'));
if (!existsSync(dir)) {
  console.error(`No transcripts at ${dir}`);
  process.exit(1);
}
const session =
  flag('--session') ??
  readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ id: basename(f, '.jsonl'), t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.id;
if (!session) {
  console.error('No session found');
  process.exit(1);
}

const family = (model = '') => Object.keys(PRICE).find((k) => model.includes(k)) ?? 'other';

/** Totals for one transcript: one entry per API message (a streamed message is logged more than once). */
function read(file) {
  const byMessage = new Map();
  let first, last;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.timestamp) {
      first ??= d.timestamp;
      last = d.timestamp;
    }
    const m = d.message;
    if (d.type !== 'assistant' || !m?.usage || m.model === '<synthetic>') continue;
    // A message's blocks arrive as separate entries; a subagent's usage is the stream's start, whose
    // output count is a placeholder, so its output is estimated from what it wrote (about 4 chars a token)
    const key = m.id ?? d.uuid;
    const prev = byMessage.get(key);
    const chars = (m.content ?? []).reduce(
      (n, c) => n + (c.text?.length ?? 0) + (c.thinking?.length ?? 0) + (c.input ? JSON.stringify(c.input).length : 0),
      0,
    );
    byMessage.set(key, { model: m.model, u: m.usage, chars: (prev?.chars ?? 0) + chars });
  }
  const t = { estimated: false, turns: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, usd: 0, models: new Set() };
  for (const { model, u: raw, chars } of byMessage.values()) {
    const p = PRICE[family(model)] ?? { in: 0, out: 0 };
    const guess = Math.round(chars / 4);
    if (guess > (raw.output_tokens ?? 0)) t.estimated = true;
    const u = { ...raw, output_tokens: Math.max(raw.output_tokens ?? 0, guess) };
    const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const w5m = (u.cache_creation_input_tokens ?? 0) - w1h;
    t.turns++;
    t.models.add(model);
    t.input += u.input_tokens ?? 0;
    t.cacheRead += u.cache_read_input_tokens ?? 0;
    t.cacheWrite += u.cache_creation_input_tokens ?? 0;
    t.output += u.output_tokens ?? 0;
    t.usd +=
      ((u.input_tokens ?? 0) * p.in +
        (u.cache_read_input_tokens ?? 0) * p.in * CACHE_READ +
        w5m * p.in * CACHE_WRITE_5M +
        w1h * p.in * CACHE_WRITE_1H +
        (u.output_tokens ?? 0) * p.out) /
      1e6;
  }
  t.minutes = first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 60000) : 0;
  return t;
}

const rows = [{ who: 'main', what: 'the main session', ...read(join(dir, `${session}.jsonl`)) }];
const subs = join(dir, session, 'subagents');
if (existsSync(subs))
  for (const f of readdirSync(subs).filter((f) => f.endsWith('.jsonl'))) {
    const metaFile = join(subs, f.replace(/\.jsonl$/, '.meta.json'));
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
    rows.push({
      who: meta.agentType ?? 'agent',
      what: meta.description ?? basename(f, '.jsonl'),
      ...read(join(subs, f)),
    });
  }

const k = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}M` : `${Math.round(n / 1e3)}k`);
const usd = (n) => `$${Math.round(n * 100) / 100}`;
const short = (models) => [...models].map((m) => m.replace(/^claude-/, '')).join(', ');

console.log(`Session ${session}\n`);
console.log(
  '| Agent | Task | Model | Turns | Minutes | Input | Cache read | Cache write | Output | API-price equivalent |',
);
console.log('|---|---|---|--:|--:|--:|--:|--:|--:|--:|');
for (const r of rows)
  console.log(
    `| ${r.who} | ${r.what} | ${short(r.models)} | ${r.turns} | ${r.minutes} | ${k(r.input)} | ${k(r.cacheRead)} | ${k(r.cacheWrite)} | ${r.estimated ? '≈' : ''}${k(r.output)} | ${usd(r.usd)} |`,
  );

const byFamily = {};
for (const r of rows)
  for (const m of r.models) {
    const f = family(m);
    byFamily[f] = (byFamily[f] ?? 0) + r.usd / r.models.size;
  }
const total = rows.reduce((s, r) => s + r.usd, 0);
const split = Object.entries(byFamily)
  .sort((a, b) => b[1] - a[1])
  .map(([f, v]) => `${f} ${Math.round((v / total) * 100)}%`)
  .join(', ');
console.log(`\nTotal ${usd(total)}: ${split}. ≈ is output estimated from what the agent wrote.`);

const slice = flag('--log');
if (slice) {
  const log = join(repo, 'docs', 'usage.md');
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  });
  const agents = rows
    .slice(1)
    .map((r) => `${r.who} (${short(r.models)}) ${usd(r.usd)}`)
    .join('; ');
  const row = `| ${date} | ${slice} | \`${session.slice(0, 8)}\` | ${usd(rows[0].usd)} | ${agents || 'none'} | ${usd(total)} | ${split} |`;
  const lines = readFileSync(log, 'utf8').split('\n');
  const at = lines.findIndex((l) => l.includes(`\`${session.slice(0, 8)}\``));
  if (at >= 0) lines[at] = row;
  else {
    const end = lines.findLastIndex((l) => l.startsWith('|'));
    lines.splice(end + 1, 0, row);
  }
  writeFileSync(log, lines.join('\n'));
  console.log(`\n${at >= 0 ? 'Updated' : 'Added'} its row in docs/usage.md`);
}
