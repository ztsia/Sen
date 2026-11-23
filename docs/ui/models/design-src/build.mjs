// Builds docs/ui/models/design.html: the design page for admin's Models screen (docs/screens.md settings/models;
// spec 12.6, 12.9; docs/briefs/B10-models-admin.md; D153, D157). Run: node docs/ui/models/design-src/build.mjs
// It reads the looks' tokens and fonts from docs/ui/directions/assets (never writes there) and the icons
// (icons.mjs -> icons.json). Every figure drawn comes from the tables below, and the asserts check them to the
// sen before anything is written. Method and frames adapted from docs/ui/insights/design-src/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = path.join(here, '../../directions');
const readDir = (f) => fs.readFileSync(path.join(dirs, f), 'utf8');
const ICONS = JSON.parse(fs.readFileSync(path.join(here, 'icons.json'), 'utf8'));
const svgUri = (svg) => `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;

const LOOKS = ['minted', 'copper'];
const MODES = ['light', 'dark'];
const FONTS = [
  ['Schibsted Grotesk', '400 700', null, 'schibstedgrotesk/schibstedgrotesk-normal-400-700-latin.woff2'],
  ['Libre Caslon Display', '400', null, 'librecaslondisplay/librecaslondisplay-normal-400-latin.woff2'],
  ['Archivo', '100 900', '62% 125%', 'archivo/archivo-normal-100-900-62-125-latin.woff2'],
];

// ---------- the looks: tokens scoped to a class, fonts inline, the tab bar as CSS images ----------
function lookCss(id) {
  const theme = readDir(`assets/${id}/theme.css`);
  const blocks = [...theme.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)].map((m) => [m[1], m[2].trim()]);
  const base = blocks.filter(([s]) => s === ':root')[0][1];
  const light = blocks.filter(([s]) => s === ':root')[1][1];
  const dark = blocks.find(([s]) => s === '.dark')[1];
  const own = (readDir(`src/${id}.css`).match(/:root\s*\{([^}]*)\}/) || [])[1] || '';
  const keep = [...own.matchAll(/(--(?:font-ui|font-display|font-num|radius-card|radius-btn)):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()};`).join(' ');
  let css = `.lk-${id} { ${base.replace(/\s+/g, ' ')} ${keep} }\n.lk-${id}.light { ${light.replace(/\s+/g, ' ')} }\n.lk-${id}.dark { ${dark.replace(/\s+/g, ' ')} }\n`;
  for (const mode of MODES) {
    const tab = (f) => readDir(`assets/${id}/tabs/${mode}/${f}.svg`);
    const img = { home: tab('home'), review: tab('review'), insights: tab('insights'), 'more-on': tab('more-active'), scan: tab('scan'), badge: tab('badge') };
    for (const [k, svg] of Object.entries(img)) css += `.lk-${id}.${mode} .ti-${k} { background-image: ${svgUri(svg)}; }\n`;
  }
  return css;
}
const fontCss = FONTS.map(([family, weight, stretch, file]) => `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight};${stretch ? ` font-stretch: ${stretch};` : ''} font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(dirs, 'assets/fonts', file)).toString('base64')}) format("woff2"); }`).join('\n');

function keys() {
  const W = 382, rh = 46, g = 6, r = []; const key = (x, y, w) => r.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rh}" rx="6"/>`);
  const kw = (W - 9 * g) / 10;
  for (let i = 0; i < 10; i++) key(i * (kw + g), 0, kw);
  for (let i = 0; i < 9; i++) key(kw / 2 + g / 2 + i * (kw + g), 54, kw);
  key(0, 108, 50); for (let i = 0; i < 7; i++) key(kw * 1.5 + g * 1.5 + i * (kw + g), 108, kw); key(W - 50, 108, 50);
  key(0, 162, 50); key(56, 162, kw); key(56 + kw + g, 162, W - 2 * (56 + kw + g)); key(W - 56 - kw, 162, kw); key(W - 50, 162, 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 208" preserveAspectRatio="none">${r.join('')}</svg>`;
}

// ---------- money: integer sen in, text out; and the figures every drawing must agree with ----------
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ${a} ≠ ${b}`); };
const rm = (s) => { if (!Number.isInteger(s) || s < 0) throw new Error(`not sen: ${s}`); return `RM${String(Math.floor(s / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(s % 100).padStart(2, '0')}`; };
const plain = (s) => { if (!Number.isInteger(s) || s < 0) throw new Error(`not sen: ${s}`); return `${Math.floor(s / 100)}.${String(s % 100).padStart(2, '0')}`; }; // the digits in a price field
const secs = (t) => `${Math.floor(t / 10)}.${t % 10} s`; // speed is kept in tenths of a second

// Made-up prices per million tokens, in sen: in, cached in, out (the brief's rate card).
const MODELS = {
  haiku: { name: 'Claude Haiku 5.5', provider: 'Anthropic', price: [440, 44, 2200], levels: ['Low', 'Medium', 'High'] },
  sonnet: { name: 'Claude Sonnet 5.5', provider: 'Anthropic', price: [1320, 132, 6600], levels: ['Low', 'Medium', 'High', 'Max'] },
  opus: { name: 'Claude Opus 5.5', provider: 'Anthropic', price: [2200, 220, 11000], levels: ['Low', 'Medium', 'High', 'Max'] },
  flash: { name: 'Gemini 3 Flash', provider: 'Google', price: [220, 22, 1320], levels: ['Low', 'High'] },
  pro: { name: 'Gemini 3 Pro', provider: 'Google', price: [880, 88, 5280], levels: ['Low', 'High'] },
};
const M = MODELS;
const TYPED = 'gemini-3.5-flash-preview';
const LEVELS = ['Low', 'Medium', 'High', 'Max'];
for (const m of Object.values(M)) for (const p of m.price) if (!Number.isInteger(p) || p <= 0) throw new Error('a price is not integer sen');
M.sonnet.price.forEach((p, i) => eq(p, 3 * M.haiku.price[i], `Sonnet price ${i} is 3× Haiku's`));
eq(rm(M.haiku.price[0]), 'RM4.40', 'Haiku in'); eq(rm(M.sonnet.price[2]), 'RM66.00', 'Sonnet out'); eq(rm(M.pro.price[2]), 'RM52.80', 'Pro out');

// Cost per 100 answers, from one typical answer's tokens (600 in, 6,000 cached in, 151 out), rounded to the sen.
const MIX = [600, 6000, 151];
const cost100 = (m) => Math.floor((100 * m.price.reduce((a, p, i) => a + p * MIX[i], 0) + 500000) / 1000000);
eq(cost100(M.haiku), 86, 'Haiku cost per 100 answers'); eq(cost100(M.sonnet), 258, 'Sonnet cost per 100 answers'); eq(cost100(M.sonnet), 3 * cost100(M.haiku), 'Sonnet costs exactly 3× Haiku');
eq(cost100(M.flash), 46, 'Flash cost per 100 answers');

// The test: Sen’s chat's golden set is 60 cases. Speed in tenths of a second.
const CASES = 60;
const T = {
  now: { score: 52, cost: cost100(M.haiku), speed: 21 },
  sonnet: { score: 57, cost: cost100(M.sonnet), speed: 34 },
  flash: { score: 47, cost: cost100(M.flash), speed: 13 },
};
eq(T.sonnet.score - T.now.score, 5, 'Sonnet is 5 right ahead'); eq(T.now.score - T.flash.score, 5, 'Flash is 5 right behind');
eq(secs(T.now.speed), '2.1 s', 'now speed'); eq(secs(T.sonnet.speed), '3.4 s', 'candidate speed');
const DONE = 32, FAILED_AT = 18; eq(Math.round((100 * DONE) / CASES), 53, 'progress');

// The jobs, in the order of the brief: group, current model, effort, fallback, and one line on what each does.
const JOBS = [
  { id: 'chat', name: 'Sen’s chat', icon: 'message-square-text', model: 'haiku', effort: 'Medium', fb: 'sonnet', does: 'Answers your questions in Sen’s chat.' },
  { id: 'researcher', name: 'The researcher', icon: 'search', model: 'flash', effort: 'Low', fb: 'pro', does: 'Looks things up on the web for Sen and keeps the sources.' },
  { id: 'background', name: 'Background runs', icon: 'refresh-cw', model: 'sonnet', effort: 'Medium', fb: 'haiku', does: 'Does Sen’s jobs when you’re not in the chat, like the evening note.' },
  { id: 'receipts', name: 'Receipts', icon: 'receipt-text', model: 'flash', effort: 'Low', fb: 'haiku', does: 'Reads a receipt’s photo into its lines and total.' },
  { id: 'wordings', name: 'Notification wordings', icon: 'bell-ring', model: 'haiku', effort: 'Low', fb: 'flash', does: 'Drafts a template when a bank app words a payment in a new way.' },
  { id: 'emails', name: 'Emails', icon: 'mail', model: 'flash', effort: 'Low', fb: 'haiku', does: 'Reads receipts that arrive by email.' },
  { id: 'files', name: 'Files in chat', icon: 'file-text', model: 'haiku', effort: 'Medium', fb: 'sonnet', does: 'Reads a file you send in Sen’s chat.' },
  { id: 'topic', name: 'Topic writer', icon: 'notebook-pen', model: 'haiku', effort: 'Low', fb: 'sonnet', does: 'Files what a chat left under its topics, once it goes quiet.' },
  { id: 'sorter', name: 'Review sorter', icon: 'list-checks', model: 'flash', effort: 'Low', fb: 'haiku', does: 'Suggests an answer for each question in Review.' },
  { id: 'lessons', name: 'Lesson folder', icon: 'layers', model: 'opus', effort: 'High', fb: 'sonnet', does: 'Folds Sen’s lessons into a skill.' },
];
const J = Object.fromEntries(JOBS.map((j) => [j.id, j]));
const GROUPS = [['Sen', ['chat', 'researcher', 'background']], ['Readers', ['receipts', 'wordings', 'emails', 'files']], ['Behind the scenes', ['topic', 'sorter', 'lessons']]];
eq(GROUPS.reduce((n, [, ids]) => n + ids.length, 0), JOBS.length, 'every job is in a group'); eq(JOBS.length, 10, 'ten jobs');
for (const j of JOBS) {
  const m = M[j.model];
  if (!m.levels.includes(j.effort)) throw new Error(`${j.name}: ${m.name} has no ${j.effort}`);
  if (j.fb === j.model) throw new Error(`${j.name}: its own fallback`);
}
eq(J.researcher.model, 'flash', 'the researcher stays on Google'); eq(M[J.researcher.fb].provider, 'Google', 'the researcher’s fallback stays on Google');
eq(M.flash.levels.join(), 'Low,High', 'Gemini 3 Flash has Low and High');

// Sen’s chat's log, newest first (today is 23 Nov). A revert is itself a new row.
const CHAT_LOG = [
  { to: 'haiku', was: 'sonnet', when: '3 Nov', score: `${T.now.score} of ${CASES}` },
  { to: 'sonnet', was: 'haiku', when: '28 Oct', score: `55 of ${CASES}` },
  { to: 'haiku', def: true, when: '12 Oct' },
];
const USED = { to: 'sonnet', was: 'haiku', when: 'Today 14:02', score: `${T.sonnet.score} of ${CASES}` };
const REVERTED = { to: 'haiku', was: 'sonnet', when: 'Today 14:05', score: `${T.now.score} of ${CASES}`, tag: 'a revert' };
const LOG_AFTER_USE = [USED, ...CHAT_LOG];
const LOG_AFTER_REVERT = [REVERTED, USED, ...CHAT_LOG];
eq(LOG_AFTER_USE.length, 4, 'four rows after Use it'); eq(LOG_AFTER_REVERT.length, 5, 'five rows after Revert');
const LOG_LONG = [{ to: 'sonnet', was: 'haiku', when: 'Today 14:09', score: `${T.sonnet.score} of ${CASES}` }, REVERTED, USED, CHAT_LOG[0], CHAT_LOG[1]];
const LOG_LONG_TOTAL = LOG_LONG.length + 1; // and the default row below them
eq(LOG_LONG_TOTAL, 6, 'a log of six');

// Lessons (made up): a fold goes live only if the test score doesn't drop.
const LESSONS = [
  { skill: 'Spending questions', status: 'live', before: 48, after: 50, of: 50, line: 'live since 20 Nov', when: 'Folded 20 Nov', rows: ['When asked about a merchant, search notes and payee names together.', 'When a question says last month, use the pay cycle, not the calendar month.', 'When a total looks odd, say which payments were left out.'] },
  { skill: 'Claims', status: 'reverted', before: 46, after: 48, of: 50, line: 'undone 19 Nov', when: 'Live 17 to 19 Nov', rows: ['Say which month a claim is for before saying what is left to claim.'] },
  { skill: 'Subscriptions', status: 'held', before: 49, after: 47, of: 50, line: 'held, scored lower', when: 'Tried 18 Nov', rows: ['Show a yearly charge as one renewal, not as a monthly cost.', 'When a price changed, say when it changed.'] },
];
for (const l of LESSONS) { if (l.status === 'live') if (l.after < l.before) throw new Error('a live fold scored lower'); if (l.status === 'held') if (l.after >= l.before) throw new Error('a held fold didn’t score lower'); }
// Questions Sen couldn't answer (made up): shapes only.
const GAPS = [
  { set: 'Payments', missing: 'no tool to group by weekday', n: 4, last: '21 Nov' },
  { set: 'Subscriptions', missing: 'no price history', n: 2, last: '14 Nov' },
  { set: 'Accounts', missing: 'no balance for a past date', n: 1, last: '9 Nov' },
];
const GAPS_N = GAPS.reduce((a, g) => a + g.n, 0); eq(GAPS_N, 7, 'seven this month'); eq(GAPS[0].last, '21 Nov', 'the last one');

// ---------- small pieces ----------
const I = (name, cls = '') => { if (!ICONS[name]) throw new Error(`icon ${name} is not in icons.json: add it to icons.mjs`); return `<svg class="lu${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; };
const tile = (icon, tone = '') => `<span class="tile${tone ? ` ${tone}` : ''}">${I(icon)}</span>`;
const SBAR = (time) => `<div class="sbar"><span>${time}</span><span><svg viewBox="0 0 16 16"><path d="M1 12h2.4v3H1zM5.2 9h2.4v6H5.2zM9.4 6h2.4v9H9.4zM13.6 2H16v13h-2.4z"/></svg><svg viewBox="0 0 16 16"><path d="M8 14.2 5.6 11.4a3.4 3.4 0 0 1 4.8 0zM3.5 9a6.4 6.4 0 0 1 9 0l-1.2 1.4a4.6 4.6 0 0 0-6.6 0zM.9 6a10 10 0 0 1 14.2 0L13.9 7.4a8.2 8.2 0 0 0-11.8 0z"/></svg><svg viewBox="0 0 22 16" style="width:22px"><rect x="1" y="3.5" width="17" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="2.5" y="5" width="11" height="6" rx="1.2"/><rect x="19.2" y="6" width="1.8" height="4" rx=".9"/></svg></span></div>`;
// Settings is pushed from More, so the tab bar stays, with More marked (patterns 6). Sen's button is on the five tab screens only.
const tabbar = () => `<div class="tabbar"><span><i class="ti-home"></i>Home</span><span><i class="ti-review"></i><i class="bdg ti-badge"></i>Review</span><span class="scan"><i class="ti-scan"></i>Scan</span><span><i class="ti-insights"></i>Insights</span><span class="on"><i class="ti-more-on"></i>More</span></div>`;
const BACK = (title) => `<div class="appbar bk"><span class="ic back">${I('arrow-left', 's24')}</span><h1>${title}</h1></div>`;
const nrow = (icon, title, sub, right = '', cls = '') => `<div class="nrow${cls ? ` ${cls}` : ''}">${icon}<span class="g">${title}${sub ? `<small>${sub}</small>` : ''}</span>${right}</div>`;
const grp = (label, rows, foot = '', cls = '') => `<div class="grp">${label ? `<p class="gl2">${label}</p>` : ''}<div class="gc${cls ? ` ${cls}` : ''}">${rows.join('')}</div>${foot}</div>`;
const sk = (w, h, r = 6) => `<span class="sk" style="width:${w};height:${h}px;border-radius:${r}px"></span>`;
const toast = (text) => `<div class="toast"><span class="g">${text}</span><span class="u">Undo</span></div>`;
const chev = I('chevron-right');
const ST = {
  test: `<span class="st">${I('loader-circle', 's16')}Testing…</span>`,
  today: '<span class="st">Changed today</span>',
  off: `<span class="st warn">${I('triangle-alert', 's16')}Provider off</span>`,
};

// ---------- the list: settings/models ----------
const jobRow = (j, st = '') => nrow(tile(j.icon), j.name, `${M[j.model].name} · ${j.effort}`, `${st}${chev}`);
const lessonRows = () => LESSONS.map((l) => nrow(tile('book-open-text'), l.skill, `${l.rows.length} ${l.rows.length === 1 ? 'lesson' : 'lessons'} · ${l.line}`, chev));
const LATER = () => `${grp('Lessons', lessonRows())}${grp('Questions Sen couldn’t answer', [nrow(tile('circle-help'), `${GAPS_N} this month`, `The last one was ${GAPS[0].last}`, chev)])}`;
const INTRO = '<p class="intro">Each job’s model. A change reaches its next call.</p>';
function listBody({ only = null, status = {}, later = true, foot = '' } = {}) {
  const groups = GROUPS.map(([label, ids]) => [label, ids.filter((id) => !only || only.includes(id))]).filter(([, ids]) => ids.length);
  return `${INTRO}${groups.map(([label, ids], gi) => grp(label, ids.map((id) => jobRow(J[id], status[id] || '')), gi === groups.length - 1 ? foot : '')).join('')}${later ? LATER() : ''}`;
}
const listScreen = (o = {}) => `<div class="scr"><div class="in">${BACK('Models')}${o.banner || ''}<div class="pg${o.cls ? ` ${o.cls}` : ''}">${o.body ?? listBody(o)}</div></div></div>${tabbar()}${o.over || ''}`;
const SKROW = `<div class="nrow skr"><span class="sk" style="width:32px;height:32px;border-radius:8px"></span><span class="g">${sk('52%', 15)}${sk('38%', 12)}</span></div>`;
const listSkeleton = () => `<div class="scr"><div class="in">${BACK('Models')}<div class="pg">${sk('72%', 15)}${[3, 4, 3].map((n) => `<div class="grp">${sk('22%', 13)}<div class="gc">${SKROW.repeat(n)}</div></div>`).join('')}</div></div></div>${tabbar()}`;
const OFFLINE = `<div class="bn">${I('wifi-off', 's16')}<span>You’re offline. Changes wait until you’re back.</span></div>`;

// ---------- a job's page: settings/models/<job> ----------
const kv = (k, v, n = '') => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span>${n ? `<span class="n">${n}</span>` : ''}</div>`;
const priceBlock = (m) => `<div class="kv blk"><span class="k">Price per million tokens</span><div class="pr">${['In', 'Cached in', 'Out'].map((l, i) => `<div class="pc"><small>${l}</small><b>${rm(m.price[i])}</b></div>`).join('')}</div><span class="n">In is what Sen sends, Out is what comes back. Cached in is a repeat, and costs less.</span></div>`;
function nowCard(j, o = {}) {
  const m = M[j.model];
  const prov = o.provOff ? `${m.provider}<span class="st warn">${I('triangle-alert', 's16')}Off</span>` : m.provider;
  const fbNote = o.provOff ? `in use now, while ${m.provider} is off` : 'for a turn the first refuses or fails';
  return `${kv('Provider', prov)}${kv('Model', m.name)}${kv('Effort', j.effort, 'How hard the model thinks before it answers.')}${kv('Fallback', M[j.fb].name, fbNote)}${priceBlock(m)}${kv('Last tested', o.tested || 'Not tested yet')}<div class="cact"><span class="btn${o.main ? '' : ' sm'} out${o.dis ? ' dis' : ''}">Change…</span></div>`;
}
// A log row: what it became and what it replaced, when, the score it had; Revert on the newest row only.
const logRow = (r, revert, dis = false) => nrow('', M[r.to].name, r.def ? `the default · ${r.when}` : `was ${M[r.was].name}<br>${r.when}${r.tag ? ` · ${r.tag}` : ''}${r.score ? ` · ${r.score}` : ''}`, revert ? `<span class="tb${dis ? ' dis' : ''}">${I('undo-2', 's16')}Revert</span>` : '', 'log');
const logCard = (rows, { dis = false, more = 0 } = {}) => `${rows.map((r, i) => logRow(r, i === 0 && !r.def, dis)).join('')}${more ? `<div class="nrow"><span class="g">All changes<small>${more} in all</small></span>${chev}</div>` : ''}`;

// The Trying card. Candidates: Sonnet (better, running), Flash (worse on score), a typed model (failed).
const arrow = (up) => I(up ? 'arrow-up' : 'arrow-down', 's14');
function tryCard(kind, { dis = false } = {}) {
  const cand = kind === 'worse' ? { m: M.flash, name: M.flash.name, t: T.flash } : kind === 'failed' ? { m: null, name: TYPED, t: null } : { m: M.sonnet, name: M.sonnet.name, t: T.sonnet };
  const now = T.now;
  const ch = (cls, cap, nm, o) => `<div class="ch ${cls}" style="--o:${o}"><span class="cap">${cap}</span><span class="nm">${nm}</span></div>`;
  const rl = (t) => `<p class="rl">${t}</p>`;
  const cell = (cls, il, html, o) => `<div class="${cls}" style="--o:${o}"><span class="il">${il}</span>${html}</div>`;
  const nv = (il, v, o) => cell('a', il, `<p class="v num">${v}</p>`, o);
  const SC = 'Score', CO = 'Cost · per 100 answers', SP = 'Speed · median per answer';
  const nowCells = [nv(SC, `${now.score} of ${CASES}`, 1), nv(CO, rm(now.cost), 2), nv(SP, secs(now.speed), 3)];
  let candCells;
  if (kind === 'running') {
    candCells = [
      cell('b', SC, `<p class="v num">${DONE} of ${CASES} cases</p><div class="pbar" role="progressbar" aria-valuenow="${DONE}" aria-valuemax="${CASES}" aria-label="Test progress"><i style="width:${Math.round((100 * DONE) / CASES)}%"></i></div>`, 11),
      cell('b', CO, '<p class="v mut2">Not yet</p>', 12), cell('b', SP, '<p class="v mut2">Not yet</p>', 13),
    ];
  } else if (kind === 'failed') {
    candCells = [cell('b', SC, '<p class="v mut2">No result</p>', 11), cell('b', CO, '<p class="v mut2">No result</p>', 12), cell('b', SP, '<p class="v mut2">No result</p>', 13)];
  } else {
    const t = cand.t, d = t.score - now.score;
    const scoreD = d > 0 ? `<p class="d up">${arrow(true)}<span>${d} more right than now</span></p>` : `<p class="d">${arrow(false)}<span>${-d} fewer right than now</span></p>`;
    candCells = [
      cell('b', SC, `<p class="v num">${t.score} of ${CASES}</p>${scoreD}`, 11),
      cell('b', CO, `<p class="v num">${rm(t.cost)}</p><p class="d"><span>${t.cost > now.cost ? 'more' : 'less'}</span></p>`, 12),
      cell('b', SP, `<p class="v num">${secs(t.speed)}</p><p class="d"><span>${t.speed > now.speed ? 'slower' : 'faster'}</span></p>`, 13),
    ];
  }
  const grid = `<div class="cmp">${ch('a', 'Now', M.haiku.name, 0)}${ch('b', 'Trying', cand.name, 10)}${rl(SC)}${nowCells[0]}${candCells[0]}${rl(CO)}${nowCells[1]}${candCells[1]}${rl(SP)}${nowCells[2]}${candCells[2]}</div>`;
  const d = dis ? ' dis' : '';
  let acts;
  if (kind === 'running') acts = `<div class="tacts"><span class="btn sm sec${d}">Discard</span><p class="note">Discard stops the test.</p></div>`;
  else if (kind === 'failed') acts = `<div class="fail">${I('circle-alert', 's16')}<span>The test stopped at case ${FAILED_AT}: Google said the model doesn’t exist.</span></div><div class="tacts"><span class="btn${d}">Try again</span><span class="btn sm sec${d}">Discard</span></div>`;
  else acts = `<div class="tacts"><span class="btn${d}">Use it</span><div class="r2"><span class="btn sm sec${d}">Test again</span><span class="btn sm sec${d}">Discard</span></div></div>`;
  return `${grid}${acts}`;
}

function jobScreen(j, o = {}) {
  if (o.skeleton) {
    return `<div class="scr"><div class="in">${BACK(j.name)}<div class="pg tight">${sk('68%', 15)}<div class="grp">${sk('14%', 13)}<div class="gc" style="padding:14px;display:grid;gap:14px">${[0, 1, 2, 3, 4].map(() => `<div style="display:flex;justify-content:space-between">${sk('26%', 15)}${sk('34%', 15)}</div>`).join('')}${sk('100%', 48, 24)}</div></div><div class="grp">${sk('18%', 13)}<div class="gc">${SKROW.repeat(3)}</div></div></div></div></div>${tabbar()}`;
  }
  const inUse = o.now || j;
  const status = o.provOff ? `<div class="stc">${tile('triangle-alert', 'warn')}<span class="g"><b>Provider off</b><p>${o.provOffText || 'Anthropic’s key isn’t set. This job uses its fallback until it is.'}</p></span></div>` : '';
  const trying = o.state && o.state !== 'none' ? grp('Trying', [tryCard(o.state, { dis: o.dis })], '', 'try') : '';
  const log = o.log || (j.id === 'chat' ? CHAT_LOG : [{ to: j.model, def: true, when: '12 Oct' }]);
  const logHtml = logCard(log, { dis: o.dis, more: o.more || 0 });
  const main = !(o.state && o.state !== 'none');
  return `<div class="scr"><div class="in">${BACK(j.name)}${o.banner || ''}<div class="pg${o.cls ? ` ${o.cls}` : ''}"><p class="intro">${j.does}</p>${status}${trying}${grp('Now', [nowCard(inUse, { tested: o.tested, main, dis: o.dis, provOff: o.provOff })])}${grp('Changes', [logHtml])}</div></div></div>${tabbar()}${o.over || ''}`;
}

// ---------- the change sheet (Quiet, D157) ----------
const sheetX = ({ title, ctx = '', back = false, list = false, action = '', body, btn = '' }) => `<div class="sheet"><div class="grab"></div><div class="hd${back ? ' bk' : ''}">${back ? `<span class="ic back">${I('arrow-left', 's24')}</span>` : ''}<h3>${title}</h3>${action ? `<span class="hdact">${action}</span>` : ''}<span class="ic">${I('x')}</span></div>${ctx ? `<p class="ctx">${ctx}</p>` : ''}<div class="bd${list ? ' list' : ''}">${body}</div>${btn ? `<div class="ft"><span class="btn">${btn}</span></div>` : ''}</div>`;
const OFFS = { OpenAI: 'Off until its data terms are checked' };
function provBlock({ sel = 'Anthropic', off = OFFS, locked = false } = {}) {
  if (locked) return `<div class="fld"><span class="fl">Provider</span><div class="sel lockd">${I('lock', 's16')}<span class="g">Google only: its search with sources is a Vertex feature</span></div></div>`;
  const seg = ['Anthropic', 'Google', 'OpenAI'].map((p) => `<span class="${p === sel ? 'on' : off[p] ? 'off' : ''}">${p}</span>`).join('');
  const why = Object.entries(off).map(([p, r]) => `<p class="note">${p} · ${r}</p>`).join('');
  return `<div class="fld"><span class="fl">Provider</span><div class="sg" role="radiogroup">${seg}</div>${why}</div>`;
}
const effortBlock = (sel, levels, note = '') => `<div class="fld"><span class="fl">Effort</span><div class="sg">${LEVELS.map((l) => `<span class="${l === sel ? 'on' : levels.includes(l) ? '' : 'off'}">${l}</span>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}</div>`;
const selRow = (label, value, { bad = false, err = '', sub = '' } = {}) => `<div class="fld${bad ? ' bad' : ''}"><span class="fl">${label}</span><div class="sel${bad ? ' bad' : ''}"><span class="g">${value}${sub ? `<small>${sub}</small>` : ''}</span>${I('chevron-right')}</div>${err ? `<p class="err">${I('circle-alert', 's16')}<span>${err}</span></p>` : ''}</div>`;
function pricesBlock(m, { err = '', focus = false } = {}) {
  const cell = (l, i) => `<div><small>${l}</small><div class="mf${err ? ' bad' : ''}${focus && i === 0 ? ' focus' : ''}"><span class="pre">RM</span>${m ? `<span>${plain(m.price[i])}</span>` : `<span class="e">0.00</span>`}</div></div>`;
  return `<div class="fld${err ? ' bad' : ''}"><span class="fl">Price per million tokens</span><div class="prices">${['In', 'Cached in', 'Out'].map((l, i) => cell(l, i)).join('')}</div>${err ? `<p class="err">${I('circle-alert', 's16')}<span>${err}</span></p>` : ''}</div>`;
}
function changeForm(o) {
  const m = o.typed ? null : M[o.model];
  const body = `<div class="bdi"${o.scroll ? ` style="margin-top:-${o.scroll}px"` : ''}>${provBlock({ sel: o.prov, off: o.off, locked: o.locked })}${selRow('Model', o.typed ? TYPED : M[o.model].name, { sub: o.typed ? 'Typed, so its prices are yours to enter' : '' })}${effortBlock(o.effort, o.levels || (m ? m.levels : LEVELS), o.effortNote || '')}${selRow('Fallback', M[o.fb].name, { bad: !!o.fbErr, err: o.fbErr || '' })}${pricesBlock(m, { err: o.priceErr || '', focus: o.focus })}</div>`;
  return sheetX({ title: o.title, action: 'Use without testing', body, btn: 'Test it' });
}
const modelList = ({ provider, sel, list, q = '' }) => sheetX({
  back: true, list: true, title: 'Model', ctx: provider,
  body: `<div class="srch"><div class="inp${q ? ' focus' : ''}">${I('search', 's18')}${q ? `<span>${q}</span>` : '<span class="e">Search models</span>'}</div></div>${list.map((id) => nrow('', M[id].name, `${rm(M[id].price[0])} in · ${rm(M[id].price[2])} out`, id === sel ? `${I('check')}`.replace('class="lu"', 'class="lu ck"') : '')).join('')}${nrow(tile('keyboard'), 'Type a model name', 'For a model that isn’t in the list', chev)}`,
});
const typeName = () => sheetX({
  back: true, title: 'Type a model name', ctx: 'Google',
  body: `<div class="bdi"><div class="fld"><span class="fl">Model name</span><div class="inp focus"><span>${TYPED}</span></div><p class="note">Type it exactly as Google writes it. Its prices are next.</p></div></div>`,
  btn: 'Use this name',
});

// ---------- the page's frames ----------
function phone({ look = 'minted', mode = 'light', inner, cap, tall = false, w = 390, h = 844, ts = 1, kb = false, alt, time = '14:06' }) {
  const sz = w !== 390 || h !== 844 ? ` style="--w:${w}px;--h:${h}px"` : '';
  return `<figure class="sc-pw"${sz}><div class="sc-fr"><div class="ph lk-${look} ${mode}${tall ? ' tall' : ''}${ts !== 1 ? ' t15' : ''}${kb ? ' kbup' : ''}" role="img" aria-label="${(alt || cap).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">${SBAR(time)}${inner}${kb ? '<div class="kb"></div>' : ''}<div class="gest"></div></div></div><figcaption>${cap}</figcaption></figure>`;
}
const strip = (inner, cap, cls = '', look = 'minted', mode = 'light') => `<figure class="sc-pw sc-cw"><div class="strip lk-${look} ${mode}${cls ? ` ${cls}` : ''}">${inner}</div><figcaption>${cap}</figcaption></figure>`;
const row = (label, items, cls = '') => `${label ? `<p class="sc-rowlbl">${label} <span class="sc-swipe">· swipe sideways</span></p>` : ''}<div class="sc-row${cls ? ` ${cls}` : ''}">${items.join('')}</div>`;
const notes = (items, cls = '') => `<div class="sc-notes${cls ? ` ${cls}` : ''}">${items.map((i) => `<p>${i}</p>`).join('')}</div>`;
const section = (id, title, line, body) => `<section class="sc-sec" id="${id}"><h2>${title}<small>${line}</small></h2>\n${body}</section>`;
const capT = (t, l) => `<b>${t}</b> · ${l}`;
const scrim = '<div class="scrim"></div>';
const under = (id = 'chat', o = {}) => jobScreen(J[id], { state: 'none', ...o });

const S = [];

// 1 · Settings
const acct = (admin) => `<div class="gc"><div class="nrow"><span class="av2">W</span><span class="g"><span><b style="font-weight:600;font-size:var(--f17)">weiming</b>${admin ? ' <span class="bdg2 live">Admin</span>' : ''}</span><small>weiming@example.com</small></span>${chev}</div></div>`;
const featRows = (admin) => [nrow(tile('clipboard-check'), 'Claims', '', `<span class="val">2 schemes</span>${chev}`), nrow(tile('sparkles'), 'Sen', '', `<span class="val">${admin ? '~RM3.80 this month' : 'RM2.40 left'}</span>${chev}`), ...(admin ? [nrow(tile('users'), 'Members', '', `<span class="val">3 of 5</span>${chev}`), nrow(tile('cpu', 'ta'), 'Models', '', `<span class="val">${JOBS.length} jobs</span>${chev}`)] : [])];
const settingsStrip = (admin) => `${BACK('Settings').replace('bk"', 'bk"')}<div class="pg tight" style="padding-bottom:16px">${acct(admin)}<p class="note" style="text-align:center">⋯ Appearance and Setup ⋯</p>${grp('Features', featRows(admin))}${grp('Data', [nrow(tile('database'), 'Export and backups', '', `<span class="val">22 Nov</span>${chev}`)])}</div>`;
S.push(section('settings', '1 · The way in', 'Models is a row in Settings’ Features group, after Members, and only the admin has it. Settings is pushed from More, so the tab bar stays.', row('', [
  strip(settingsStrip(true), capT('The admin', 'The account card shows <i>Admin</i>. Models has the one accent tile, the way Claims and Sen are the features; its value is how many jobs exist.'), 'top'),
  strip(settingsStrip(false), capT('A member', 'No Members, no Models, and no trace that either exists. The row isn’t drawn disabled.'), 'top'),
])));

// 2 · The list
const LIST_STATUS = { chat: ST.test, emails: ST.today };
const listCap = (t) => capT(t, 'Three groups, then Lessons and the unanswered questions. Name first, the model and effort under it, a status only where there is one.');
S.push(section('list', '2 · The list', '<code>settings/models</code>: every job and the model it runs on, readable in one pass. Drawn whole, so each phone is as tall as the screen.', row('', [
  phone({ tall: true, inner: listScreen({ status: LIST_STATUS }), cap: capT('Minted, light', 'Three groups, then <i>Lessons</i> and the unanswered questions, which arrive with B33. Name first, the model and effort under it, a status only where there is one.') }),
  phone({ tall: true, mode: 'dark', inner: listScreen({ status: LIST_STATUS }), cap: capT('Minted, dark', 'The same screen. Nothing here is a raw colour, so it turns with the look’s tokens.') }),
  phone({ tall: true, look: 'copper', inner: listScreen({ status: LIST_STATUS }), cap: capT('Copper, light', 'Copper’s fonts and squarer buttons and tiles. Rows keep the same height and order.') }),
])));

// 3 · At B10
S.push(section('b10', '3 · The list at B10', 'Only one job exists in code then. The screen is the same, with one row, a line saying more will come, and no Lessons or Questions cards.', row('', [
  phone({ inner: listScreen({ only: ['wordings'], later: false, foot: '<p class="note">More jobs appear here as Sen gains them.</p>' }), cap: capT('Notification wordings only', 'It stays under <i>Readers</i>, so the row doesn’t move when other jobs arrive.') }),
])));

// 4 · A job's page
S.push(section('job', '4 · A job’s page', '<code>settings/models/&lt;job&gt;</code>: what it is on now, what is being tried, and every change. Sen’s chat is the worked example throughout.', row('', [
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'none', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('No candidate', 'The Now card and its one action, <i>Change…</i>, an outlined button: the page has no filled one until something is being tried. Prices, scores and times on this page are made up for the drawing.') }),
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'running', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('Testing Claude Sonnet 5.5', 'The Trying card appears above Now, running, so the test is the first thing seen. <i>Change…</i> stays outlined, and smaller.') }),
])));

// 5 · The sheet
const chatTitle = 'Change Sen’s chat';
const sonnetForm = { title: chatTitle, prov: 'Anthropic', model: 'sonnet', effort: 'Medium', fb: 'haiku' };
const sheetOver = (html) => `${scrim}${html}`;
S.push(section('sheet', '5 · Change…', 'A Quiet sheet (D157): <i>Use without testing</i> small in the header beside the ✕, <i>Test it</i> pinned at the foot. Steps stay inside the one sheet.', `${row('', [
  phone({ inner: under('chat') + sheetOver(changeForm(sonnetForm)), cap: capT('Filled for Sonnet', 'The first step. A known model fills its prices in. Sonnet’s fallback is set to Haiku, because the old fallback was Sonnet itself.') }),
  phone({ inner: under('chat') + sheetOver(modelList({ provider: 'Anthropic', sel: 'sonnet', list: ['haiku', 'sonnet', 'opus'] })), cap: capT('Model, the second step', 'The provider’s own models with a search field above; back arrow in the header. <i>Type a model name</i> sits last. The fallback row opens this same list.') }),
  phone({ kb: true, inner: under('chat') + sheetOver(typeName()), cap: capT('Type a model name', 'For the day a new generation is out. The name is yours; the provider is still the one chosen above.') }),
  phone({ kb: true, inner: under('chat') + sheetOver(changeForm({ title: chatTitle, prov: 'Google', typed: true, effort: 'Medium', fb: 'sonnet', priceErr: 'Type all three prices', focus: true, scroll: 100, effortNote: 'Levels for a typed model aren’t known, so all four are offered.' })), cap: capT('A typed model', 'Its three prices are empty and required, with the error under them. The sheet scrolls under the keyboard; <i>Test it</i> stays above it, still tappable, and says what’s missing.') }),
])}${row('', [
  phone({ inner: under('chat') + sheetOver(changeForm({ title: chatTitle, prov: 'Google', model: 'flash', effort: 'Low', fb: 'sonnet', effortNote: 'Gemini 3 Flash has Low and High.' })), cap: capT('Gemini 3 Flash chosen', 'Medium and Max are disabled, with one muted line saying why. Medium was chosen, so the control moved to Low, the nearer cheap one.') }),
  phone({ inner: under('researcher') + sheetOver(changeForm({ title: 'Change the researcher', prov: 'Google', locked: true, model: 'flash', effort: 'Low', fb: 'pro', effortNote: 'Gemini 3 Flash has Low and High.' })), cap: capT('The researcher', 'No provider control: a locked line says why. Its models are Google’s. A long job name wraps the title to two lines; the header action stays beside the ✕.') }),
  phone({ inner: under('chat') + sheetOver(changeForm({ ...sonnetForm, fb: 'sonnet', fbErr: 'A model can’t be its own fallback' })), cap: capT('Fallback is the model', 'The error shows once, under the field, in the form-error colour. <i>Test it</i> stays enabled and the error stays until it’s fixed.') }),
  phone({ mode: 'dark', inner: under('chat', { }) + sheetOver(changeForm(sonnetForm)), cap: capT('Minted, dark', 'The sheet’s first step in dark: popover on card, the segmented control a step lighter.') }),
])}${row('Provider control', [
  strip(`${provBlock({ sel: 'Anthropic' })}`, capT('OpenAI', 'Disabled, with its reason under the control. The same line is in every sheet above.'), 'pop'),
  strip(`${provBlock({ sel: 'Google', off: { Anthropic: 'No key set in Vercel', ...OFFS } })}`, capT('A provider without its key', 'Anthropic’s key isn’t set, so it is disabled with its own reason. Each reason is in the muted line, not only in the control’s colour.'), 'pop'),
])}`));

// 6 · The Trying card
const tryStrip = (kind, cap, o = {}) => strip(`<div class="pg tight" style="padding-bottom:16px">${grp('Trying', [tryCard(kind, o)], '', 'try')}</div>`, cap, 'top');
S.push(section('trying', '6 · The Trying card', 'Now beside the candidate, in one look: name, then Score, Cost and Speed, a row each. The words carry the meaning; colour only marks the score’s change.', `${row('', [
  tryStrip('running', capT('Running', 'A determinate line and <i>32 of 60 cases</i>. Now already shows its last scores. <i>Discard</i> stops it.')),
  tryStrip('better', capT('Done, candidate better', '57 of 60 against 52, in the accent with an arrow and words. Cost and speed say <i>more</i> and <i>slower</i> in plain grey. <i>Use it</i> is the main button.')),
  tryStrip('worse', capT('Done, candidate worse on score', 'Not a warning, just information, in grey: <i>5 fewer right than now</i>. <i>Use it</i> is still offered.')),
  tryStrip('failed', capT('Failed', 'What stopped it, in words. The last good scores stay in Now. <i>Try again</i> is the main button.')),
])}
${row('The page with a better candidate, light and dark', [
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'better', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('Done, candidate better · Minted light', 'Trying sits first, so the result is what the owner lands on. <i>Use it</i> is the only filled button.') }),
  phone({ tall: true, mode: 'dark', inner: jobScreen(J.chat, { state: 'better', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('The same · Minted dark', 'The accent pale on dark, the score’s arrow and words unchanged. <i>Change…</i> keeps its outline.') }),
])}`));

// 7 · After Use it, and after Revert
S.push(section('after', '7 · After Use it, and after Revert', 'One tap each, no dialog. The change shows at once on the page, and a toast offers Undo.', `${row('', [
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'none', now: { ...J.chat, model: 'sonnet', fb: 'haiku' }, tested: `${T.sonnet.score} of ${CASES} · Today`, log: LOG_AFTER_USE, cls: 'toastroom', over: toast('Sen’s chat now uses Claude Sonnet 5.5') }), cap: capT('After Use it', 'Now shows Sonnet, with its prices and its score. The log gains its row on top with <i>Revert</i>, and the row it replaced loses its own. The Trying card is gone.') }),
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'none', tested: `${T.now.score} of ${CASES} · 3 Nov`, log: LOG_AFTER_REVERT, cls: 'toastroom', over: toast('Back to Claude Haiku 5.5') }), cap: capT('After Revert', 'A revert is a row of its own, marked as one, and it carries <i>Revert</i> too, so it can be reverted. Five rows is all the log shows.') }),
])}${row('', [
  strip(`<div class="pg tight" style="padding-bottom:16px">${grp('Changes', [logCard(LOG_LONG, { more: LOG_LONG_TOTAL })])}</div>`, capT('More than five rows', `The log shows five, then <i>All changes</i>. None of the brief’s rows gets there, so this is a made-up afternoon of ${LOG_LONG_TOTAL} changes.`), 'top'),
])}`));

// 8 · States
const wordingsOff = { provOff: true, tested: '' };
const STRIPP = (st) => `<div class="pg tight" style="padding-bottom:16px">${st}</div>`;
S.push(section('states', '8 · States', 'First load, offline, and a provider that went off. Nothing is lost, and the screen never turns into an error page.', `${row('', [
  phone({ inner: listSkeleton(), cap: capT('The list, first load', 'Skeletons the shape of the rows, in <code>muted</code>, with the app bar real. No spinner.') }),
  phone({ inner: jobScreen(J.chat, { skeleton: true }), cap: capT('A job, first load', 'The same: Now’s rows, the button, the log’s rows.') }),
  phone({ inner: listScreen({ status: LIST_STATUS, banner: OFFLINE }), cap: capT('The list, offline', 'A banner, not an error. What was read stays readable and the rows still open.') }),
  phone({ tall: true, inner: jobScreen(J.chat, { state: 'better', banner: OFFLINE, dis: true, tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('A job, offline', 'Every action is drawn disabled: <i>Change…</i>, <i>Use it</i>, <i>Test again</i>, <i>Discard</i> and <i>Revert</i>. The words are the brief’s.') }),
])}${row('', [
  phone({ tall: true, inner: jobScreen(J.wordings, { provOff: true, tested: '', now: J.wordings }), cap: capT('A job whose provider went off', 'A status card first, in words, with the warning icon. Provider says <i>Off</i>; the fallback says it is in use. Only Notification wordings can say this: its fallback is Google.') }),
  strip(STRIPP(grp('Sen', ['chat', 'researcher', 'background'].map((id) => jobRow(J[id], M[J[id].model].provider === 'Anthropic' ? ST.off : ''))) + grp('Readers', ['receipts', 'wordings', 'emails', 'files'].map((id) => jobRow(J[id], M[J[id].model].provider === 'Anthropic' ? ST.off : '')))), capT('The list, Anthropic off', 'Every job on Anthropic says <i>Provider off</i>, six of ten (two groups shown). The other four don’t.'), 'top'),
  strip(`<div class="pg tight" style="padding-bottom:16px"><div class="stc">${tile('triangle-alert', 'warn')}<span class="g"><b>Provider off</b><p>Anthropic’s key isn’t set, and this job’s fallback is Anthropic too, so it can’t run until it is.</p></span></div></div>`, capT('The same, where the fallback is on the same provider', 'Five of the six jobs on Anthropic. The brief’s sentence would be untrue for them, so this is the one I’d use. My words, for you to settle.'), 'top'),
])}${row('', [
  strip(`<div class="grp"><div class="gc"><div class="es">${tile('book-open-text', 'lg')}<b>No lessons yet</b><p>A lesson is folded in once Sen has learned enough to test it.</p></div></div></div>`.replace('<div class="grp">', '<div class="pg tight" style="padding:0 16px"><div class="grp">') + '</div>', capT('Lessons, empty', 'An icon, a title, one line. Nothing to press, since only Sen fills it.'), 'top'),
  strip(`<div class="pg tight" style="padding:0 16px"><div class="grp"><div class="gc"><div class="es">${tile('circle-help', 'lg')}<b>Nothing unanswered</b><p>Questions Sen can’t answer are listed here, by shape only.</p></div></div></div></div>`, capT('Questions, empty', 'The same, for a month with none.'), 'top'),
])}`));

// 9 · Lessons, and the questions Sen couldn't answer
const lessonCard = (l) => {
  const badge = l.status === 'live' ? `<span class="bdg2 live">${I('check')}Live</span>` : l.status === 'held' ? `<span class="bdg2 held">${I('info')}Held: scored lower</span>` : `<span class="bdg2 rev">${I('undo-2')}Reverted</span>`;
  const sc = `${l.before} → ${l.after} of ${l.of}`;
  return `<div class="ls"><div class="top"><span class="nm">${l.skill}</span>${badge}</div><p class="sc2">${sc} · ${l.when}</p>${l.rows.map((r) => `<p class="ln${l.status === 'live' ? '' : ' dim2'}">${r}</p>`).join('')}${l.status === 'live' ? `<div class="ft2"><span>${l.rows.length} ${l.rows.length === 1 ? 'lesson' : 'lessons'} in use</span><span class="tb">${I('undo-2', 's16')}Undo</span></div>` : `<div class="ft2"><span>${l.status === 'held' ? 'Not in use. Sen’s test questions scored lower with it.' : 'Not in use. You undid it.'}</span></div>`}</div>`;
};
const lessonsScreen = () => `<div class="scr"><div class="in">${BACK('Lessons')}<div class="pg"><p class="intro">What Sen learned, folded into its skills. A fold goes live only if Sen’s test questions score no worse.</p>${LESSONS.map(lessonCard).join('')}</div></div></div>${tabbar()}`;
const gapsScreen = () => `<div class="scr"><div class="in">${BACK('Questions Sen couldn’t answer')}<div class="pg"><p class="intro">Only the shape of each question is kept, never its words.</p>${grp(`${GAPS_N} this month`, GAPS.map((g) => nrow('', `${g.set} · ${g.missing}`, `${g.n} ${g.n === 1 ? 'time' : 'times'} this month · last ${g.last}`, '', 'info')))}</div></div></div>${tabbar()}`;
S.push(section('lessons', '9 · Lessons, and Questions Sen couldn’t answer', 'Both arrive with B33. Pushed from the list’s two last cards. Skills, lessons and counts are made up.', row('', [
  phone({ tall: true, inner: lessonsScreen(), cap: capT('Lessons', 'A card a skill: its status in words, the score before and after, when, and its lessons as plain rows. <i>Undo</i> only on the live one. No names, no amounts.') }),
  phone({ tall: true, inner: gapsScreen(), cap: capT('Questions Sen couldn’t answer', 'The dataset and what was missing, how often this month, and when last. Information rows: no tile, no chevron. The counts add up to the 7 on the list.') }),
])));

// 10 · Smaller phone, bigger text
S.push(section('fit', '10 · Smaller phone, bigger text', 'Sen’s chat’s page with a finished test, the fullest it gets. Drawn whole.', row('', [
  phone({ w: 360, h: 640, tall: true, inner: jobScreen(J.chat, { state: 'better', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('360 × 640', 'The two columns still fit: names wrap, numbers don’t. Prices stay three across.') }),
  phone({ ts: 1.5, tall: true, inner: jobScreen(J.chat, { state: 'better', tested: `${T.now.score} of ${CASES} · 3 Nov` }), cap: capT('1.5× text', 'The two columns no longer fit, so Trying and Now stack, each with its own rows. Prices go one to a row. Nothing is cut off.') }),
])));

// 11 · Built from
const MAP = [
  ['Models row in Settings', '<code>NavRow</code> with an accent <code>IconTile</code> (<code>cpu</code>) in the Features <code>GroupCard</code>, after Members; value is the job count; rendered only when <code>v.admin</code>', 'Real Settings has no Models row yet'],
  ['The list screen', '<code>Screen</code> + <code>AppBar</code> (back, title), one intro line, then <code>GroupCard</code>s each with a <code>GroupLabel</code>', 'Patterns 7, calm screens'],
  ['A job row', '<code>NavRow</code>: <code>IconTile</code>, title, a second line (model · effort), a state on the right, chevron', 'The state is a small text with an icon, not a <code>Badge</code>'],
  ['Testing…, Changed today, Provider off', 'Muted text (<code>Spinner</code> before Testing…); Provider off is <code>money-warning</code> with the <code>triangle-alert</code> icon', 'Colour is never alone'],
  ['Lessons and Questions rows', '<code>NavRow</code> in a <code>GroupCard</code>', 'B33'],
  ['A job’s page', '<code>Screen</code> with a back title, an intro line, then three labelled <code>GroupCard</code>s', 'No <code>HeaderCard</code> or <code>ActionBar</code>: see the list below'],
  ['The Now card', '<code>GroupCard</code> of information rows (<code>NavRow</code>’s form with no tile and no chevron), the value right-aligned, a muted note under it where needed', 'Not <code>FactGrid</code>: long values need a note'],
  ['Price per million tokens', '<code>FactGrid</code> in three columns', 'One column at 1.5× text'],
  ['Change…', '<code>Button variant="outline"</code>: <code>size="default"</code> (48) with no candidate, <code>size="sm"</code> when the Trying card is present', 'At most one filled button a screen: <i>Use it</i> or <i>Try again</i> while trying, none otherwise'],
  ['The Trying card', '<code>Card</code> with a two-column grid (CSS grid, one column at 1.5× text), <code>Progress</code>, and <code>Button</code>s', 'Rows aligned across the columns'],
  ['Use it, Try again', '<code>Button</code> 48, the screen’s one filled button', ''],
  ['Test again, Discard', '<code>Button size="sm" variant="secondary"</code>', ''],
  ['The Changes log', '<code>GroupCard</code> of <code>NavRow</code>s (no tile); <i>Revert</i> is a <code>Button variant="ghost" size="sm"</code> with <code>undo-2</code>', 'Whole row isn’t a link'],
  ['The status card', 'Patterns 7 <i>Status cards</i>: <code>Alert</code> with an <code>IconTile</code>, words first', ''],
  ['Offline banner', '<code>Alert</code> with <code>wifi-off</code>, in <code>muted</code>', 'Patterns 7, offline'],
  ['Skeletons', '<code>Skeleton</code>, shaped like the rows', ''],
  ['The change sheet', 'shadcn <code>Sheet</code> (bottom), Quiet (D157); steps are state inside it', 'Customised in place with a <code>// Sen:</code> note'],
  ['Provider, Effort', '<code>Segmented</code> (<code>ToggleGroup type="single"</code>), disabled items, a muted line with the reason', ''],
  ['Model and Fallback rows', 'A <code>Button</code> in the look of a select, opening the second step; the list is <code>Command</code> (<code>CommandInput</code>, <code>CommandItem</code>), a last item <i>Type a model name</i>', 'Not a <code>Select</code>: it can’t hold a search and a free field'],
  ['Type a model name', '<code>Field</code> + <code>Input</code>', ''],
  ['Price fields', '<code>Field</code> + the amount input of D132 (digits, entered from the right, two decimals), parsed to sen as text', 'No float'],
  ['Field errors', '<code>Field</code> message in <code>destructive</code> with an icon', 'D150'],
  ['The toast', '<code>Sonner</code> with an <i>Undo</i> action', 'Patterns 7, toasts'],
  ['Lessons cards', '<code>Card</code> with a <code>Badge</code> (accent, outline, muted), plain rows, a <code>Button variant="ghost"</code>', ''],
  ['Questions rows', 'Information rows in a <code>GroupCard</code>', 'No tile, no chevron'],
  ['Empty states', '<code>EmptyState</code>', ''],
];
S.push(section('build', '11 · What each piece is built from', 'For the builder. Restyle shadcn in place with a <code>// Sen:</code> note.', `<div class="sc-tw"><table class="sc-table"><thead><tr><th>Drawn piece</th><th>Built from</th><th>Note</th></tr></thead><tbody>${MAP.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>
<div class="sc-notes"><p><b>What I couldn’t make work as written, and what I drew instead</b></p><ol>
<li><b>The brief’s sentence for a provider that went off</b> (<i>This job uses its fallback until it is</i>) is true only for Notification wordings. Five of the six jobs on Anthropic have an Anthropic fallback. I drew it on that job, and added a second sentence for the other five.</li>
<li><b>The offline words</b> (<i>Changes wait until you’re back</i>) with every action disabled: nothing waits, because nothing can be changed. I used the words as given. <i>You’re offline. Changes are off until you’re back</i> would be true.</li>
<li><b>An all-changes link</b> never appears with the rows the brief gives: the most they reach is five. I drew <i>All changes</i> on a made-up longer log, once.</li>
<li><b>A typed model’s effort levels</b> are unknown, so “offering only the levels the model has” can’t apply. I drew all four, with a muted line saying so.</li>
<li><b>Green for a better score</b> is the money-in colour, which patterns 3 keeps for money. I used the look’s accent, with an arrow and words.</li>
<li><b>A detail page</b> in patterns 7 is a header card, an action bar and a fact grid. The brief’s order (an intro line, Now, Trying, Changes) is a different shape. I drew the brief’s, with the main session’s change: Trying goes above Now when a candidate exists. The job’s name is the app bar’s title, and the one action sits inside the Now card.</li>
<li><b>The toast after Use it</b>: patterns 7 says a toast appears only when the change isn’t visible. Here the Now card shows it, but Undo is the point, so I drew it as decided.</li>
<li><b>Long job names</b> don’t fit beside <i>Use without testing</i> and the ✕ in the sheet’s header (<i>Change the researcher</i> is already two lines). The title wraps and the action stays.</li>
<li><b>At 1.5× text</b> the Trying card’s two columns don’t fit, so they stack: Now, then the candidate. At 360 px they still fit.</li>
<li><b>The words <i>less</i> and <i>faster</i></b> are drawn as well as <i>more</i> and <i>slower</i>, in the same grey, so a column reads the same way whichever way it goes.</li>
<li><b>Sen’s button</b> is not drawn on any of these: patterns 6 puts it on the five tab screens only.</li>
</ol>
<p><b>Decided by the main session, after this page was first drawn:</b> with a candidate, the Trying card goes above Now, so after <i>Test it</i> the owner sees the test without scrolling; with no candidate the order is intro, Now, Changes. <i>Change…</i> is an outlined button, so the page never has more than one filled button.</p></div>`));

const NAV = [['settings', 'The way in'], ['list', 'The list'], ['b10', 'At B10'], ['job', 'A job'], ['sheet', 'Change…'], ['trying', 'Trying'], ['after', 'Use it, Revert'], ['states', 'States'], ['lessons', 'Lessons'], ['fit', 'Small and big'], ['build', 'Built from']];
const html = `<title>Models</title>
<!-- Sen's admin Models screen: the design page (docs/screens.md settings/models; spec 12.6, 12.9; docs/briefs/B10-models-admin.md; D153, D157).
     Built by docs/ui/models/design-src/build.mjs; edit the source, then rebuild. Written for the Artifact tool,
     which adds the doctype and head. Every name, price and score is made up. -->
<style>
${fontCss}
${LOOKS.map(lookCss).join('')}.ph { --keys: ${svgUri(keys())}; }
${fs.readFileSync(path.join(here, 'page.css'), 'utf8')}</style>
<div class="sc">
<header class="sc-top"><h1>Models</h1>
<p class="sc-lede">Where the owner picks each AI job’s model, from the phone, with no release. A list of every job and what it runs on; a page a job, with what it uses now, a test of something else beside it, and every change; one sheet to change it. Drawn at true size in Minted, with dark and Copper where a second look matters.</p>
<nav class="sc-nav" aria-label="On this page">${NAV.map(([id, n]) => `<a href="#${id}">${n}</a>`).join('')}</nav></header>
${S.join('\n')}
<p class="sc-foot">Every phone is 390 × 844 unless it says otherwise, scaled to fit the page; a screen taller than the phone is drawn whole. A strip is a piece of a screen at its true width. Inside them every colour, radius and font is the look’s token; the scrim, the shadows and the keyboard stand-in are plain black and grey. Source: <code>docs/ui/models/design-src/</code>.</p>
</div>
`;
fs.writeFileSync(path.join(here, '../design.html'), html);
console.log(`built design.html (${(html.length / 1024).toFixed(0)} KB)`);
