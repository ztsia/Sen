// Builds docs/ui/sen-chat/design.html: Sen's chat, drawn at true size for the owner to approve and a
// builder to build from (docs/screens.md `sen`, patterns.md section 7, spec 12.3, D152, D153, D155, D157).
// One self-contained fragment for the Artifact tool, which adds the doctype and head: no scripts, no
// requests, fonts inline. The page is static HTML written here.
//   node docs/ui/sen-chat/design-src/build.mjs
// It takes each look's tokens and fonts from docs/ui/directions/ (read only), the lucide icons from
// icons.json (icons.mjs saves them), Sen's avatar from avatars.json (avatars.mjs saves a still of each
// state, drawn by the look's own code) and its own styles from page.css. The phone, the sheet, the menu
// and the keyboard stand-in follow docs/ui/overlays/design-src/. Every name and amount is made up.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = path.join(here, '../../directions');
const readDir = (f) => fs.readFileSync(path.join(dirs, f), 'utf8');
const ICONS = JSON.parse(fs.readFileSync(path.join(here, 'icons.json'), 'utf8'));
const AVATARS = JSON.parse(fs.readFileSync(path.join(here, 'avatars.json'), 'utf8'));
const svgUri = (svg) => `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;

const LOOKS = ['minted', 'copper']; // Minted, and the look least like it: warm, squared buttons, a coin for an avatar
const FONTS = [
  ['Schibsted Grotesk', '400 700', null, 'schibstedgrotesk/schibstedgrotesk-normal-400-700-latin.woff2'],
  ['Libre Caslon Display', '400', null, 'librecaslondisplay/librecaslondisplay-normal-400-latin.woff2'],
  ['Archivo', '100 900', '62% 125%', 'archivo/archivo-normal-100-900-62-125-latin.woff2'],
];

// ---------- the looks: tokens scoped to a class, fonts inline ----------
function lookCss(id) {
  const theme = readDir(`assets/${id}/theme.css`);
  const blocks = [...theme.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)].map((m) => [m[1], m[2].trim()]);
  const base = blocks.filter(([s]) => s === ':root')[0][1];
  const light = blocks.filter(([s]) => s === ':root')[1][1];
  const dark = blocks.find(([s]) => s === '.dark')[1];
  const own = (readDir(`src/${id}.css`).match(/:root\s*\{([^}]*)\}/) || [])[1] || '';
  const keep = [...own.matchAll(/(--(?:font-ui|font-display|font-num|radius-card|radius-btn)):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()};`).join(' ');
  return `.lk-${id} { ${base.replace(/\s+/g, ' ')} ${keep} }\n.lk-${id}.light { ${light.replace(/\s+/g, ' ')} }\n.lk-${id}.dark { ${dark.replace(/\s+/g, ' ')} }\n`;
}
const fontCss = FONTS.map(([family, weight, stretch, file]) => `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight};${stretch ? ` font-stretch: ${stretch};` : ''} font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(dirs, 'assets/fonts', file)).toString('base64')}) format("woff2"); }`).join('\n');

// the keyboard stand-in's keys, as a mask
function keys() {
  const W = 382, rh = 46, g = 6, r = []; const key = (x, y, w) => r.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rh}" rx="6"/>`);
  const kw = (W - 9 * g) / 10;
  for (let i = 0; i < 10; i++) key(i * (kw + g), 0, kw);
  for (let i = 0; i < 9; i++) key(kw / 2 + g / 2 + i * (kw + g), 54, kw);
  key(0, 108, 50); for (let i = 0; i < 7; i++) key(kw * 1.5 + g * 1.5 + i * (kw + g), 108, kw); key(W - 50, 108, 50);
  key(0, 162, 50); key(56, 162, kw); key(56 + kw + g, 162, W - 2 * (56 + kw + g)); key(W - 56 - kw, 162, kw); key(W - 50, 162, 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 208" preserveAspectRatio="none">${r.join('')}</svg>`;
}

// ---------- small parts ----------
const I = (name, cls = '') => { if (!ICONS[name]) throw new Error(`icon ${name} is not in icons.json: add it to icons.mjs`); return `<svg class="lu${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; };
const tile = (icon, tone = '') => `<span class="tile${tone ? ` ${tone}` : ''}">${I(icon)}</span>`;
const SBAR = `<div class="sbar"><span>20:41</span><span><svg viewBox="0 0 16 16"><path d="M1 12h2.4v3H1zM5.2 9h2.4v6H5.2zM9.4 6h2.4v9H9.4zM13.6 2H16v13h-2.4z"/></svg><svg viewBox="0 0 16 16"><path d="M8 14.2 5.6 11.4a3.4 3.4 0 0 1 4.8 0zM3.5 9a6.4 6.4 0 0 1 9 0l-1.2 1.4a4.6 4.6 0 0 0-6.6 0zM.9 6a10 10 0 0 1 14.2 0L13.9 7.4a8.2 8.2 0 0 0-11.8 0z"/></svg><svg viewBox="0 0 22 16" style="width:22px"><rect x="1" y="3.5" width="17" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="2.5" y="5" width="11" height="6" rx="1.2"/><rect x="19.2" y="6" width="1.8" height="4" rx=".9"/></svg></span></div>`;

// Sen's avatar. Every (state, size) drawn is noted, so only those stills go into the page.
const usedAv = new Set();
const av = (state, size = 24) => { usedAv.add(`${state}.${size}`); return `<span class="av s-${state} z${size}"></span>`; };
const COPPER_AV = ['resting.36', 'paused.24']; // the other look only shows these two
const avCss = () => [...usedAv].map((k) => { const [st, z] = k.split('.'); return `.lk-minted .av.s-${st}.z${z} { background-image: url(${AVATARS.minted[st][z]}); }`; }).join('\n')
  + '\n' + COPPER_AV.map((k) => { const [st, z] = k.split('.'); return `.lk-copper .av.s-${st}.z${z} { background-image: url(${AVATARS.copper[st][z]}); }`; }).join('\n');

// ---------- the pieces of a conversation ----------
const F = (t, cls = '', pop = '') => `<span class="f${cls ? ` ${cls}` : ''}">${t}${pop}</span>`;
const sep = (t) => `<p class="sep">${t}</p>`;
const you = (t, o = {}) => `<div class="you${o.wait ? ' wait' : ''}${o.lift ? ' lift' : ''}">${o.quote ? `<span class="qt">${I('reply', 's14')}<span>${o.quote}</span></span>` : ''}<div class="bb">${o.img ? `<span class="ph-img shot">${I('receipt-text', 's24')}</span>` : ''}${t}</div>${o.ver ? `<span class="ver">${I('chevron-left', 's16')}<b>${o.ver}</b>${I('chevron-right', 's16')}</span>` : ''}${o.wait ? `<span class="meta">${I('clock', 's14')}Waiting</span>` : ''}${o.after || ''}</div>`;
// Sen's head row: the name, and once the steps fold, the one line that is the answer's source
const hr = (src, o = {}) => `<div class="hr">${o.av ? av(o.av) : ''}<b>Sen</b>${src ? `<span class="src">· ${src}</span>${I(o.open ? 'chevron-up' : 'chevron-down', 's14')}` : ''}${o.right || ''}</div>`;
const steps = (list, cls = 'in') => `<div class="steps ${cls}">${list.map(([st, t, n]) => `<span class="${st}">${st === 'ok' ? I('check', 's14') : st === 'bad' ? I('circle-x', 's14') : I('loader-circle', 's14')}${t}${n ? `<small>${n}</small>` : ''}</span>`).join('')}</div>`;
const tx = (...ps) => `<div class="tx">${ps.map((p) => `<p>${p}</p>`).join('')}</div>`;
const sen = (...parts) => `<div class="sen">${parts.join('')}</div>`;
const chips = (list) => `<div class="chips">${list.map((c) => `<span class="chip">${c}</span>`).join('')}</div>`;
const saved = (icon, html, acts = [], cls = '') => `<div class="sv${cls ? ` ${cls}` : ''}">${I(icon, 's16')}<span class="g">${html}</span>${acts.map((a) => `<span class="a">${a}</span>`).join('')}</div>`;
const notice = (icon, html) => `<div class="nt">${I(icon, 's14')}<span>${html}</span></div>`;
const ASOF = 'As of today, 20:41';
const card = (title, right, body, asof = ASOF, cls = '') => `<div class="pc${cls ? ` ${cls}` : ''}"><div class="t"><b>${title}</b>${right ? `<span>${right}</span>` : ''}</div>${body}${asof ? `<div class="asof"><span>${asof}</span></div>` : ''}</div>`;

// the made-up month, the same as Home's and the overlays page's
const figures = () => card('Where do I stand?', 'This cycle', `<div class="figs"><span><i>Left until payday</i><b>RM1,931.27</b><small>12 days to go</small></span><span><i>Spent</i><b>RM3,873.53</b><small>of RM5,804.80 received</small></span></div>`);
function chart() {
  const sx = (x) => (2 + ((x - 52) / 232) * 324).toFixed(1), sy = (y) => (6 + ((y - 5) / 53) * 74).toFixed(1);
  const pts = (a) => a.map(([x, y]) => `${sx(x)} ${sy(y)}`).join(' ');
  const now = [[52, 58], [60, 36], [70, 35], [78, 30], [96, 28], [108, 24], [124, 24], [134, 21], [150, 20], [162, 16], [180, 15], [196, 12]];
  const last = [[52, 58], [60, 38], [70, 37], [80, 33], [96, 32], [110, 30], [124, 27], [136, 26], [152, 22], [166, 21], [182, 17], [196, 15], [212, 11], [230, 9], [250, 8], [270, 6], [284, 5]];
  const svg = `<svg class="ch" viewBox="0 0 328 100" aria-hidden="true"><path d="M2 ${sy(31)}H326M2 ${sy(5)}H326" stroke="var(--border)" stroke-dasharray="2 3"/><path d="M${pts(now)}V${sy(58)}H${sx(52)}Z" fill="var(--chart-accent)" opacity=".12"/><path d="M${pts(last)}" fill="none" stroke="var(--chart-context)" stroke-width="2" stroke-linejoin="round"/><path d="M${pts(now)}" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round"/><path d="M${sx(196)} ${sy(12)}V${sy(58)}" stroke="var(--muted-foreground)" stroke-dasharray="2 3"/><circle cx="${sx(196)}" cy="${sy(12)}" r="4.5" fill="var(--chart-accent)" stroke="var(--card)" stroke-width="2"/><path d="M2 ${sy(58)}H326" stroke="var(--border)"/><g fill="var(--muted-foreground)"><text x="2" y="97">30 Sept</text><text x="${sx(196)}" y="97" text-anchor="middle">Today</text><text x="326" y="97" text-anchor="end">29 Oct</text></g></svg>`;
  return `<div class="pc"><div class="t"><b>Am I spending faster than last cycle?</b></div><p class="take">RM273.53 more than last cycle by this day</p>${svg}<div class="asof"><span>${ASOF}</span><span class="lg"><span><i style="background:var(--chart-accent)"></i>This cycle</span><span><i style="background:var(--chart-context)"></i>Last</span></span></div></div>`;
}
const Q1 = 'How am I doing this cycle?';
const SRC1 = 'Read payments and budgets · 2 steps';
const VERDICT = `You’re on track. ${F('RM1,931.27')} is left for the 12 days until payday, though you’re spending a little faster than last cycle: ${F('RM273.53')} more by this day.`;
const FOLLOW = ['Where did it go?', 'Are my budgets holding?', 'What’s due before payday?'];
const answer = (o = {}) => sen(hr(SRC1, o.hr), tx(VERDICT), o.figures || figures(), o.chart || chart(), o.noChips ? '' : chips(FOLLOW));
const NOTE = `${sep('Yesterday, 21:00')}${sen(hr('Daily check-in'), tx(`Saturday came to ${F('RM135.40')}. Drinks &amp; desserts is at ${F('RM73.50')} of ${F('RM150.00')} with 12 days to go.`))}`;

// a table: a plain grid; a row that is a record opens it
const SAT = [['08:42', 'ZUS Coffee', 'RM13.90'], ['12:55', 'Nasi Kandar Pelita', 'RM18.50'], ['15:20', 'GrabFood', 'RM31.80'], ['19:10', 'Village Grocer', 'RM52.70'], ['21:30', 'Tealive', 'RM18.50']];
const table = () => card('What did Saturday cost?', 'Sat 17 Oct', `<p class="take">RM135.40 over 5 payments</p><div class="tb" style="--cols:44px 1fr auto 16px"><div class="h"><span>Time</span><span>Where</span><span class="r">Amount</span><span></span></div>${SAT.map(([t, w, a]) => `<div><span class="mut">${t}</span><span>${w}</span><span class="r num">${a}</span>${I('chevron-right', 's16')}</div>`).join('')}</div>`);
const POP_OK = `<span class="pop" style="left:-96px;--tip:132px"><i>Where this comes from</i><b>RM135.40</b><span>The sum of 5 payments on Saturday 17 Oct, read from your payments.</span><i>${ASOF}</i><span class="lnk">Open the 5 payments${I('chevron-right', 's16')}</span></span>`;
const POP_UN = `<span class="pop nolnk" style="left:-46px;--tip:76px"><b>${I('triangle-alert', 's18')}Not checked</b><span>Sen wrote this number itself. It isn’t in anything Sen read for this answer, and no sum was run for it.</span></span>`;
const satAnswer = (tap) => sen(hr('Read Saturday’s payments · 1 step'), tx(`Saturday came to ${F('RM135.40', tap === 'ok' ? 'on' : '', tap === 'ok' ? POP_OK : '')} over five payments. Groceries were the biggest part, and it works out to about ${F('RM27.08', tap === 'un' ? 'un on' : 'un', tap === 'un' ? POP_UN : '')} a payment.`), table(), chips(['Show it as a chart', 'Compare with last Saturday']));

// the proposal, field by field, and its states
const PTITLE = 'GrabFood always files under Meals';
const ppHead = (state, right = '') => `<div class="k">${state ? av(state) : I('list-filter', 's18')}<b>Proposal</b><span>· a new rule</span>${right}</div>`;
const ppFields = `<div class="fl"><div><label>When the merchant is</label><span class="v">GrabFood</span></div><div><label>File it under</label><span class="v">${I('utensils', 's16')}Meals</span></div><div><label>Starts</label><span class="v">With the next payment</span></div></div>`;
const ppEffect = `<div class="eff">${I('history', 's16')}<span class="g">Applies to <b>14 past payments</b> too</span>${I('chevron-right', 's16')}</div>`;
const proposal = (state = 'waiting') => {
  const acts = state === 'applying' ? `<div class="acts"><span class="btn busy">${I('loader-circle', 's18')}Applying to 14 payments…</span></div>`
    : state === 'failed' ? `<p class="err">${I('wifi-off', 's16')}<span>Sen couldn’t apply this: the connection dropped. Nothing was changed.</span></p><div class="acts"><span class="btn ghost">Dismiss</span><span class="btn">Try again</span></div>`
      : `<div class="acts"><span class="btn ghost">Dismiss</span><span class="btn out">Change…</span><span class="btn">Apply</span></div>`;
  return `<div class="pp">${ppHead(state === 'applying' ? 'thinking' : 'paused')}<h4>${PTITLE}</h4><p class="why">You asked for it. Nothing changes until you apply it.</p>${ppFields}${ppEffect}${acts}</div>`;
};
const ppActs = '<div class="acts"><span class="btn ghost">Dismiss</span><span class="btn out">Change…</span><span class="btn">Apply</span></div>';
const budgetProposal = () => `<div class="pp"><div class="k">${I('scale', 's18')}<b>Proposal</b><span>· a budget</span></div><h4>Drinks &amp; desserts: RM100.00 a cycle</h4><p class="why">You said RM150.00 is more than you want to spend on it.</p><div class="fl"><div><label>A cycle</label><span class="v"><span class="was">RM150.00</span>RM100.00<span class="badge">your words</span></span></div><div><label>Starts</label><span class="v">This cycle</span></div></div><div class="eff">${I('scale', 's16')}<span class="g">Drinks &amp; desserts would stand at <b>RM73.50 of RM100.00</b> now</span></div>${ppActs}</div>`;
const goalProposal = () => `<div class="pp"><div class="k">${I('banknote', 's18')}<b>Proposal</b><span>· a goal</span></div><h4>Save for the Japan trip</h4><p class="why">The monthly amount is a suggestion. Change it before you apply.</p><div class="fl"><div><label>Target</label><span class="v">RM6,000.00<span class="badge">your words</span></span></div><div><label>A month</label><span class="v">RM400.00<span class="badge">Sen’s suggestion</span></span></div><div><label>Kept in</label><span class="v">Ryt Bank</span></div></div><div class="eff">${I('calendar-check', 's16')}<span class="g">Reached in <b>15 months</b>, by January 2028</span></div>${ppActs}</div>`;

// a question: its answers as rows, the recommended one first
const question = (o = {}) => `<div class="pc qq"><div class="k">${o.av ? av(o.av) : I('circle-dashed', 's18')}<span>Sen asks</span></div><h4>Did you pay for anything on Tuesday?</h4><div class="opts"><div class="opt ${o.picked ? 'picked' : 'rec'}">${I(o.picked ? 'check' : 'sparkles', 's18')}<span class="g"><b>Yes, I’ll add it</b><small>Opens a new payment with Tuesday filled in</small></span></div><div class="opt${o.picked ? ' dimmed' : ''}"><span class="g"><b>No, nothing</b><small>Sen stops asking about that day</small></span></div><div class="opt${o.picked ? ' dimmed' : ''}"><span class="g"><b>Ask me later</b><small>It stays open in Review</small></span></div>${o.picked ? '' : `<div class="opt other">${I('pencil', 's16')}Something else…</div>`}</div></div>`;
const questionChips = () => `<div class="pc qq"><div class="k">${I('circle-dashed', 's18')}<span>Sen asks</span></div><h4>Did you pay for anything on Tuesday?</h4><p class="mut" style="font-size:13px;line-height:1.45"><b style="font-weight:500;color:var(--foreground)">Yes, I’ll add it.</b> Opens a new payment with Tuesday filled in. <b style="font-weight:500;color:var(--foreground)">No, nothing.</b> Sen stops asking about that day. <b style="font-weight:500;color:var(--foreground)">Ask me later.</b> It stays open in Review.</p><div class="chips"><span class="chip rec">${I('sparkles', 's14')}Yes, I’ll add it</span><span class="chip">No, nothing</span><span class="chip">Ask me later</span><span class="chip">${I('pencil', 's14')}Something else…</span></div></div>`;
const button = () => `<div class="pc rows"><div class="nrow">${tile('plus', 'ta')}<span class="g">Add a payment for Tue 13 Oct<small>Parking is filled in. You type the amount.</small></span>${I('chevron-right')}</div></div>`;

// findings from the web
const WEB_SRC = [['e-Saver: rates and fees', 'kijangbank.example'], ['Pocket: how interest is paid', 'tapir.example'], ['Savings accounts compared, October', 'ringgitnotes.example']];
const mk = (n) => `<span class="mk">${n}</span>`;
const web = (o = {}) => `<div class="wb"><div class="k">${I('globe', 's16')}<b>From the web</b><span>· 3 sources</span><span class="badge">Drafts</span></div><p class="rt">Kijang Bank’s e-Saver pays 3.20% a year on balances up to RM50,000.${mk(1)} Tapir’s Pocket pays 3.00% a year with no cap.${mk(2)} Neither charges a monthly fee.${mk(3)}</p><div class="wf"><div><span class="g"><b>3.20% a year</b><small>Kijang Bank e-Saver ${mk(1)}</small></span>${o.confirmed ? `<span class="ok">${I('badge-check', 's16')}Confirmed</span><span class="btn xs ghost">Undo</span>` : '<span class="btn xs out">Confirm</span>'}</div><div><span class="g"><b>3.00% a year</b><small>Tapir Pocket ${mk(2)}</small></span><span class="btn xs out">Confirm</span></div></div><div class="ws">${WEB_SRC.map(([t, s], i) => `<div>${mk(i + 1)}<span class="g"><b>${t}</b><small>${s} · checked 18 Oct 2026</small></span>${I('external-link', 's16')}</div>`).join('')}</div>${o.sugg ? `<div class="sugg"><span class="fine">Search suggestions</span><div class="chips"><span class="chip">${I('search', 's14')}best savings rate Malaysia</span><span class="chip">${I('search', 's14')}digital bank interest</span></div></div>` : ''}<p class="fine">Text from the pages, unedited. A figure counts only once you confirm it. Information, not advice.</p></div>`;
const webTurn = (o) => `${you('Where could my savings earn more?')}${sen(hr('Researched the web · 3 sources'), tx('I found two accounts. These are drafts from the web, not figures I’ve checked. Confirm the ones you trust and I’ll compare them.'), web(o))}`;

// ---------- the composer ----------
function composer(o = {}) {
  const send = o.send || (o.text ? 'on' : 'off');
  const btn = send === 'stop' ? `<span class="send">${I('square', 's16 fill')}</span>` : `<span class="send${send === 'off' ? ' off' : ''}">${I('arrow-up')}</span>`;
  return `<div class="cp${o.dis ? ' dis' : ''}">${o.above ? `<div class="above">${o.above}</div>` : ''}<div class="row"><span class="plus${o.plus ? ' open' : ''}"><span>${I(o.plus ? 'x' : 'plus')}</span></span><div class="in${o.text ? ' has' : ''}${o.focus ? ' focus' : ''}">${o.text || o.ph || 'Ask Sen'}${o.focus ? '<span class="car"></span>' : ''}</div>${btn}</div></div>`;
}
const replyChip = `<span class="rp">${I('reply', 's16')}<span class="g"><b>Sen</b> · Am I spending faster than last cycle?</span><span class="x">${I('x', 's16')}</span></span>`;
const photoChip = `<span class="at shot">${I('receipt-text', 's24')}<span class="x">${I('x')}</span></span>`;
const pdfChip = `<span class="at doc">${I('file-text')}<span>Statement.pdf<small>PDF · 3 pages</small></span><span class="x" style="position:absolute;right:-6px;top:-6px">${I('x')}</span></span>`;

// ---------- menus ----------
const menu = (items, style, cls = '') => `<div class="menu${cls ? ` ${cls}` : ''}" style="${style}">${items.map((m) => (m === '-' ? '<div class="msep"></div>' : m === 'thumbs' ? `<div class="mrow"><span>${I('thumbs-up')}</span><span>${I('thumbs-down')}</span></div><div class="msep"></div>` : `<div class="mi${m[2] ? ` ${m[2]}` : ''}">${I(m[0])}${m[1]}</div>`)).join('')}</div>`;
const MSG_SEN = ['thumbs', ['copy', 'Copy'], ['text-cursor', 'Select text'], ['reply', 'Reply'], ['pin', 'Pin to Insights'], ['rotate-ccw', 'Try again'], '-', ['trash-2', 'Delete', 'del']];
const MSG_YOU = [['copy', 'Copy'], ['text-cursor', 'Select text'], ['reply', 'Reply'], ['pencil', 'Edit'], '-', ['trash-2', 'Delete', 'del']];
const HEAD_MENU = menu([['brain', 'What Sen remembers'], ['bell-ring', 'Watches and reports'], ['globe', 'Research'], ['gauge', 'Usage']], 'right:52px;top:50px');
const PLUS_MENU = menu([['image', 'Photo'], ['camera', 'Camera'], ['file-text', 'PDF']], 'left:8px;bottom:86px');

// ---------- the sheet and the phone ----------
// seat: the avatar's state while it is at home in the header, or '' while it is away in the conversation
function chat({ seat = 'resting', cv, cvCls = '', comp = composer(), extra = '', ctx = 'Home', hdMenu = '', noSeat = false }) {
  return `<div class="scr"><div class="appbar"><span class="wm">Sen</span></div></div><div class="scrim"></div><div class="sheet"><div class="grab"></div><div class="hd">${noSeat ? '' : seat ? av(seat, 36) : '<span class="seat"></span>'}<div class="tt"${noSeat ? ' style="margin-left:0"' : ''}><h3>Sen</h3><p class="ctx">Looking at: ${ctx}</p></div><span class="ic${hdMenu ? ' open' : ''}">${I('ellipsis')}</span><span class="ic">${I('x')}</span>${hdMenu}</div><div class="cv${cvCls ? ` ${cvCls}` : ''}">${cv}</div>${comp}${extra}</div>`;
}
function phone({ look = 'minted', mode = 'light', inner, kb = false, cap, alt }) {
  const html = look === 'copper' ? inner.replace('<span class="wm">Sen</span>', '<span class="wm">sen</span>') : inner;
  return `<figure class="sc-pw"><div class="sc-fr"><div class="ph lk-${look} ${mode}${kb ? ' kbup' : ''}" role="img" aria-label="${(alt || cap).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">${SBAR}${html}${kb ? '<div class="kb"></div>' : ''}<div class="gest"></div></div></div><figcaption>${cap}</figcaption></figure>`;
}
const strip = (inner, cap, cls = '', look = 'minted', mode = 'light') => `<figure class="sc-pw sc-cw"><div class="strip lk-${look} ${mode}${cls ? ` ${cls}` : ''}">${inner}</div><figcaption>${cap}</figcaption></figure>`;
const row = (label, items, cls = '') => `${label ? `<p class="sc-rowlbl">${label} <span class="sc-swipe">· swipe sideways</span></p>` : ''}<div class="sc-row${cls ? ` ${cls}` : ''}">${items.join('')}</div>`;
const notes = (items, cls = '') => `<div class="sc-notes${cls ? ` ${cls}` : ''}">${items.map((x) => `<p>${x}</p>`).join('')}</div>`;
const section = (id, title, line, body) => `<section class="sc-sec" id="${id}"><h2>${title}<small>${line}</small></h2>\n${body}</section>`;

// ---------- the screens ----------
const P = {};
P.empty = () => chat({ cv: `<div class="intro"><h4>What would you like to know?</h4><p>Ask about your money, or send a receipt, a photo or a PDF. Sen answers from your own records.</p></div><p class="gl">Start with</p><div class="pc rows">${[['house', 'ta', Q1, 'You opened Sen from Home'], ['utensils', 't1', 'Will Meals last until payday?', 'Meals is at RM932.93 of RM1,200.00'], ['calendar-days', 't2', 'What happened on Saturday?', 'Saturday came to RM135.40'], ['calendar-clock', 't3', 'What’s due before payday?', '12 days to go']].map(([ic, tone, t, s]) => `<div class="nrow">${tile(ic, tone)}<span class="g">${t}<small>${s}</small></span>${I('arrow-up-right', 's18')}</div>`).join('')}</div>` });
P.sent = (helpers) => chat({ seat: '', comp: composer({ send: 'stop' }), cv: helpers
  ? `${NOTE}${sep('Today, 20:41')}${you('Where could my savings earn more?')}${sen(hr('', { av: 'helpers' }), steps([['ok', 'Read your accounts'], ['live', 'Researching the web…']]))}`
  : `${NOTE}${sep('Today, 20:41')}${you(Q1)}${sen(hr('', { av: 'thinking' }), steps([['ok', 'Read this cycle’s payments'], ['live', 'Reading budgets…']]))}` });
P.settled = (o = {}) => chat({ cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${answer()}`, ...o });
P.table = (tap) => chat({ cv: `${sep('Today, 20:44')}${you('What did Saturday cost?')}${satAnswer(tap)}` });
P.proposal = (state = 'waiting') => chat({ seat: '', cv: `${sep('Today, 20:47')}${you('Always put GrabFood under Meals')}${sen(hr('Read rules and payments · 2 steps'), tx('Here’s the rule, ready for you to check.'), proposal(state))}` });
P.question = () => chat({ seat: '', cv: `${sep('Yesterday, 21:00')}${notice('info', 'Capture was off on Tuesday, so that day may be missing.')}${sen(hr('Daily check-in'), tx('Nothing was captured on Tuesday, and you usually pay for something that day.'), question({ av: 'paused' }))}` });
P.lines = () => chat({ cv: `${sep('Today, 20:50')}${you('I paid cash for parking on Tuesday')}${sen(hr(''), tx('I can’t add a payment myself. This opens a new one for you to finish.'), button())}${you('Tell me when GrabFood passes RM200')}${sen(hr('Read GrabFood’s payments · 1 step'), saved('circle-check', '<b>Watching:</b> GrabFood over RM200', ['Open', 'Undo']), tx(`GrabFood stands at ${F('RM148.20')} this cycle. You’ll hear once when it passes, as a push and a line here.`), notice('info', 'Capture was off on Tuesday, so that day may be missing.'))}` });
P.web = (o) => chat({ cv: webTurn(o) });
const STREAM = sen(hr(SRC1), tx(`You’re on track. ${F('RM1,931.27')} is left for the 12 days until payday, though you’re spending a little faster<span class="cur"></span>`), `<div class="foot">${av('speaking')}</div>`);
P.typing = () => chat({ seat: 'listening', cv: `${you(Q1)}${answer()}`, comp: composer({ text: 'Was Saturday the grocer', focus: true }) });
P.plus = () => chat({ cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${answer()}`, comp: composer({ plus: true }), extra: PLUS_MENU });
P.stop = () => chat({ seat: '', cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${STREAM}`, comp: composer({ send: 'stop' }) });
P.versions = () => chat({ seat: '', cv: `${sep('Today, 20:41')}${you('How am I doing this cycle, against the last one?', { ver: '2/2' })}${STREAM}${you('And is Meals holding?', { wait: true })}`, comp: composer({ send: 'stop' }) });
P.pressChart = () => chat({ cvCls: 'top free', cv: `${sen(`<div style="margin-top:-74px">${figures()}</div>`, `<div class="lift">${chart()}${menu(MSG_SEN, 'left:0;top:calc(100% + 8px)')}</div>`, chips(FOLLOW))}`, extra: '<div class="dim"></div>' });
P.pressYou = () => chat({ cvCls: 'top free', cv: `${sep('Today, 20:41')}${you(Q1, { lift: true, after: menu(MSG_YOU, 'right:0;top:calc(100% + 8px)') })}${answer()}`, extra: '<div class="dim"></div>' });
P.jump = () => chat({ seat: '', cvCls: 'top', cv: `${sep('Today, 20:44')}${you('What did Saturday cost?')}${satAnswer()}${you('Always put GrabFood under Meals')}${sen(hr('Read rules and payments · 2 steps'), tx('Here’s the rule, ready for you to check.'))}`, comp: composer({ send: 'stop' }), extra: `<div class="jump">${av('speaking', 22)}${I('arrow-down', 's18')}</div>` });
P.headMenu = () => P.settled({ hdMenu: HEAD_MENU });
P.offline = () => chat({ seat: 'paused', cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${sen(hr(SRC1), tx(VERDICT), figures())}${notice('wifi-off', 'You’re offline. What you see is kept, and everything else in Sen still works.')}`, comp: composer({ dis: true, ph: 'Sen needs a connection' }) });
P.credit = () => chat({ seat: 'paused', cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${sen(hr(SRC1), tx(VERDICT), figures())}${you('And is Meals holding?')}<div style="margin-top:14px">${saved('circle-pause', 'Sen is paused until 1 Dec; everything else works.', ['Usage'])}</div>`, comp: composer({ dis: true, ph: 'Paused until 1 Dec' }) });
P.failed = () => chat({ seat: '', cv: `${NOTE}${sep('Today, 20:41')}${you('What did I eat most last month?')}${sen(hr('', { av: 'paused' }), steps([['ok', 'Read last month’s payments'], ['bad', 'Couldn’t read the receipts’ items']]), `<div class="sv">${I('info', 's16')}<span class="g">Sen couldn’t read that. Nothing was changed.</span><span class="a">Try again</span></div>`)}` });
P.done = () => chat({ seat: 'done', cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${answer()}` });
P.note = () => chat({ seat: 'note', cv: `${sep('Sat, 16:12')}${you(Q1)}${sen(hr(SRC1), tx(VERDICT))}${NOTE}`, cvCls: '' });
// the other way to seat the avatar (an either-or): it lives with the newest answer and the header keeps only the name
P.altRest = () => chat({ noSeat: true, cv: `${NOTE}${sep('Today, 20:41')}${you(Q1)}${answer({ hr: { av: 'resting' } })}` });
P.altType = () => chat({ noSeat: true, cv: `${you(Q1)}${answer({ hr: { av: 'listening' } })}`, comp: composer({ text: 'Was Saturday the grocer', focus: true }) });

// ---------- the catalogue: the parts not drawn above, at chat width ----------
const CAT = [
  ['File', 'A file code built from a result: Excel with real formulas, a CSV or a claim pack. A tap saves or shares it.',
    `<div class="pc rows"><div class="nrow">${tile('file-spreadsheet', 'ta')}<span class="g">Saturday’s payments.xlsx<small>Excel · 5 rows · formulas kept</small></span><span class="btn xs sec">${I('download', 's14')}Save</span></div><div class="asof"><span>Built from your payments · ${ASOF.toLowerCase()}</span></div></div>`],
  ['Playground', 'Sliders and a chart that code recomputes as you drag. The estimate is dashed. Its button makes a proposal; it changes nothing itself.',
    `<div class="pc"><div class="t"><b>What if I spend this much a day?</b><span>Money left</span></div><p class="take">About RM791.27 left on payday</p><div class="sl"><span class="lab"><span>A day</span><b>RM95.00</b></span><div class="tr"><i style="width:58%"></i><u style="left:58%"></u></div></div><svg class="ch" viewBox="0 0 328 64" aria-hidden="true"><path d="M2 52H326" stroke="var(--border)"/><path d="M2 6 14 18 40 20 80 24 120 27 160 31 199 35" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round"/><path d="M199 35 326 45" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-dasharray="5 4"/><circle cx="199" cy="35" r="4.5" fill="var(--chart-accent)" stroke="var(--card)" stroke-width="2"/><g fill="var(--muted-foreground)"><text x="199" y="63" text-anchor="middle">Today</text><text x="326" y="63" text-anchor="end">Payday</text></g></svg><div class="asof"><span>An estimate · ${ASOF.toLowerCase()}</span><span class="btn xs out">Apply</span></div></div>`],
  ['Checklist', 'The payday plan’s steps. Each ticks itself when the matching payment arrives; none is ticked by hand.',
    `<div class="pc rows"><div class="t"><b>Is the payday plan done?</b><span>2 of 3</span></div><div class="nrow"><span class="ck on">${I('check')}</span><span class="g done-t">Move RM500.00 to savings<small>Arrived Thu 1 Oct</small></span></div><div class="nrow"><span class="ck on">${I('check')}</span><span class="g done-t">Pay the rent, RM1,400.00<small>Arrived Fri 2 Oct</small></span></div><div class="nrow"><span class="ck"></span><span class="g">Top up Touch ’n Go, RM100.00<small>Waiting for the payment</small></span></div><div class="asof"><span>${ASOF}</span></div></div>`],
  ['What’s coming up', 'Bills, instalments and deadlines by day. A row opens what it names.',
    `<div class="pc rows"><div class="t"><b>What’s due before payday?</b><span>12 days</span></div><p class="take" style="padding:2px 14px 0">RM368.90 across 3 bills</p><div class="nrow">${tile('repeat', 't1')}<span class="g">Spotify<small>Tue 20 Oct · subscription</small></span><span class="amt">RM17.90</span></div><div class="nrow">${tile('house', 't2')}<span class="g">Unifi<small>Fri 23 Oct · bill</small></span><span class="amt">RM139.00</span></div><div class="nrow">${tile('receipt-text', 't3')}<span class="g">Medical claim<small>Sun 25 Oct · deadline, 1 receipt missing</small></span></div><div class="nrow">${tile('car', 't2')}<span class="g">Car insurance<small>Wed 28 Oct · instalment 3 of 6</small></span><span class="amt">RM212.00</span></div><div class="asof"><span>${ASOF}</span></div></div>`],
  ['Comparison', 'Products side by side with your own numbers. Code does the sums, from figures you confirmed only.',
    `<div class="pc"><div class="t"><b>Which would pay me more?</b><span>On RM14,650.87</span></div><p class="take">e-Saver, by RM2.44 a month</p><div class="tb cmp" style="--cols:1fr 84px 84px"><div class="h"><span></span><span class="r">e-Saver</span><span class="r">Pocket</span></div><div><span class="mut">Rate a year</span><span class="r num">3.20%</span><span class="r num">3.00%</span></div><div><span class="mut">A month, for you</span><span class="r num win">RM39.07</span><span class="r num">RM36.63</span></div><div><span class="mut">Monthly fee</span><span class="r num">RM0.00</span><span class="r num">RM0.00</span></div></div><div class="asof"><span>Rates you confirmed on 18 Oct</span></div></div>`],
  ['Figures, one to four', 'One number stands alone; three or four go two to a row. Each keeps its own change line.',
    `<div class="pc"><div class="t"><b>How are Meals doing?</b><span>This cycle</span></div><div class="figs"><span><i>Meals</i><b>RM932.93</b><small>of RM1,200.00</small></span><span><i>Drinks &amp; desserts</i><b>RM73.50</b><small>of RM150.00</small></span></div><div class="asof"><span>${ASOF}</span></div></div>`],
];

// ---------- the page ----------
const COPPER = 'Copper';
const S = [];
S.push(section('open', '1 · Opening and asking', 'The sheet is D157’s Quiet at full height: a handle, the avatar, <i>Sen</i>, where you came from, ⋯ and ✕, no rule. The conversation fades under the header and the composer.', row('Minted, light', [
  phone({ inner: P.empty(), cap: '<b>The empty chat</b> · Starters are rows in thumb reach: the first from the screen you came from, the rest from code’s signals, each saying why it’s offered.' }),
  phone({ inner: P.sent(), cap: '<b>Just sent</b> · Your bubble on the right. The avatar has left its seat for the head of the new answer; one line a step, the live one in ink. <i>Send</i> is <i>Stop</i>.' }),
  phone({ inner: P.sent(true), cap: '<b>With helpers</b> · The same place, while the researcher is out. The earlier answer above keeps no avatar.' }),
])));

const headOne = strip(sen(hr(SRC1), tx(VERDICT)), '<b>A · One line (my pick)</b> · The head row is the source line: <i>Sen</i>, then what was read. Times sit between turns. One 13 px line, then the verdict.');
const headTwo = strip(sen(`<div class="hr two"><b>Sen</b><span class="tm">20:41</span></div><div class="hr two">${I('chevron-down', 's14')}<span class="src">Read payments and budgets · 2 steps</span></div>`, tx(VERDICT)), '<b>B · Two lines</b> · A head row with the time, and the steps line under it. Clearer as two things, but two lines of grey before every verdict.');
const headOpen = strip(sen(hr(SRC1, { open: true }), steps([['ok', 'Read this cycle’s payments', '86 payments'], ['ok', 'Read budgets', '6 budgets']], ''), tx(VERDICT)), '<b>Unfolded by a tap</b> · The same steps again, each with what it read. A second tap folds it.');
S.push(section('answer', '2 · A settled answer', 'The verdict is the first thing in ink: everything above it is one small grey line. Then the evidence in cards that share section 4’s anatomy, then what you can do, as chips that wrap.', `${row(`Minted light and dark, and ${COPPER} <i>· the same answer on other tokens</i>`, [
  phone({ inner: P.settled(), cap: '<b>Minted, light</b> · Verdict, figures, a chart, follow-ups. The avatar is back in its seat; no answer keeps one.' }),
  phone({ mode: 'dark', inner: P.settled(), cap: '<b>Minted, dark</b> · Cards are told from the sheet by a hairline, not a shadow, so they hold.' }),
  phone({ look: 'copper', inner: P.settled(), cap: `<b>${COPPER}, light</b> · Squared chips and buttons, heavier icons, the coin for an avatar. Nothing moves.` }),
])}${row('Either-or 1 · the head row and the folded steps line', [headOne, headTwo, headOpen])}`));

S.push(section('figure', '3 · A table, and a figure’s source', 'A table is a plain grid in the same card. Every figure in Sen’s words can be tapped: a thin underline says so. One that code couldn’t trace is dotted in the warning colour.', row('Minted, light', [
  phone({ inner: P.table('ok'), cap: '<b>A figure tapped</b> · A small popover beside it: what it is the sum of, when, and a way into the records. Rows with a chevron open their payment.' }),
  phone({ inner: P.table('un'), cap: '<b>An untraced figure tapped</b> · Sen divided in its head. The popover says <i>Not checked</i> and why, and offers nothing to open.' }),
])));

S.push(section('proposal', '4 · A proposal', 'The one raised, outlined card in the chat, and the only one with a filled button. What will change, field by field; its effect in a tinted line; then <i>Dismiss</i>, <i>Change…</i> and <i>Apply</i> at the bottom of the card, just above the composer.', `${row(`Waiting · Minted light and dark, and ${COPPER}`, [
  phone({ inner: P.proposal(), cap: '<b>Waiting</b> · The avatar rests on the card, paused: <i>Sen needs your answer.</i> Its seat in the header is empty.' }),
  phone({ mode: 'dark', inner: P.proposal(), cap: '<b>Dark</b> · The shadow is lost on a dark sheet, so the outline carries it alone.' }),
  phone({ look: 'copper', inner: P.proposal(), cap: `<b>${COPPER}</b> · The avatar’s paused state is the look’s own: the coin gone green.` }),
])}${row('Its other states, and a proposal with amounts', [
  strip(proposal('applying'), '<b>Applying</b> · The buttons become one line that says what’s happening and takes no second tap. The avatar works.'),
  strip(`${saved('circle-check', `<b>Applied:</b> ${PTITLE} · 14 payments moved`, ['Undo'])}<div style="height:6px"></div>${saved('circle-x', `<b>Dismissed:</b> ${PTITLE}`, [], 'gone')}`, '<b>Applied, or dismissed</b> · Decided, it folds to one line of code’s, flat like a saved line. Applied keeps <i>Undo</i>.', 'gap'),
  strip(proposal('failed'), '<b>Failed</b> · Still raised, still open. What went wrong in words, in the text colour, and <i>Try again</i>.'),
  strip(saved('clock', `<b>Expired:</b> ${PTITLE}. Your records changed since it was made.`, ['Ask again'], 'gone'), '<b>Expired</b> · Folded and grey. Nothing can be applied from it; <i>Ask again</i> makes a fresh one.'),
  strip(budgetProposal(), '<b>A changed amount</b> · The old value struck, the new one beside it, and where it came from. The effect is code’s.'),
  strip(goalProposal(), '<b>Two sources</b> · Each amount says whose it is: <i>your words</i>, a tool’s result, or <i>Sen’s suggestion</i>.'),
])}`));

S.push(section('ask', '5 · A question, a button, and code’s own lines', 'A question is a flat card whose answers are rows. A saved line and a notice are code’s, not Sen’s words: smaller, with an icon, the saved one on a tinted strip with its actions.', `${row('Minted, light', [
  phone({ inner: P.question(), cap: '<b>A question</b> · The recommended answer first, outlined, with a sparkle. Each row says what it does. The avatar waits on the card. A notice sits above the turn.' }),
  phone({ inner: P.lines(), cap: '<b>A button, a saved line, a notice</b> · The button opens a screen, never with an amount. <i>Watching</i> is a receipt with <i>Open</i> and <i>Undo</i>. The notice is a plain grey line.' }),
])}${row('Either-or 2 · a question’s answers', [
  strip(question(), '<b>A · Rows (my pick)</b> · One answer a row, with what it does under it. Each is a full-width target.'),
  strip(questionChips(), '<b>B · Chips</b> · Shorter, and like Review’s. But what each does has to be read first, in a paragraph.'),
  strip(`${question({ picked: true })}${you('Yes, I’ll add it')}`, '<b>Answered</b> · Your tap becomes your bubble. The card keeps the pick and greys the rest.', 'gap'),
])}`));

S.push(section('web', '6 · Findings from the web', 'Not the ledger, and it mustn’t look like it: a tinted card with a dashed edge, as an estimate is dashed on a chart. The research text unedited, a marker by each figure, <i>Confirm</i> on each, then the numbered sources.', row('Minted, light and dark', [
  phone({ inner: P.web(), cap: '<b>Light</b> · Sen’s own comment is plain text above. Inside the card nothing is Sen’s: the pages’ words, the figures as drafts, each source with its site and date.' }),
  phone({ mode: 'dark', inner: P.web(), cap: '<b>Dark</b> · The tint is faint here, so the dashed edge and the <i>Drafts</i> mark do the work.' }),
  strip(web({ confirmed: true, sugg: true }), '<b>A figure confirmed, and search suggestions</b> · <i>Confirm</i> becomes <i>Confirmed</i> with <i>Undo</i>. Suggestions sit at the foot only if Google’s terms require them.'),
])));

S.push(section('parts', '7 · The other parts', 'Every remaining part of an answer (spec 12.3), at chat width. Each is the same card: a title that is the question, the takeaway, the view, <i>As of</i> last.', row('', CAT.map(([n, line, html]) => strip(html, `<b>${n}</b> · ${line}`)))));

S.push(section('composer', '8 · The composer', 'One row, pinned to the bottom of the sheet above the keyboard: a plus, the field, <i>Send</i>. No rule above it; what scrolls under fades.', `${row('Minted, light', [
  phone({ kb: true, inner: P.typing(), cap: '<b>Typing</b> · The keyboard is up and the avatar, in its seat, listens. <i>Send</i> fills in once there’s text.' }),
  phone({ inner: P.plus(), cap: '<b>The plus</b> · A menu, not a sheet: <i>Photo</i>, <i>Camera</i>, <i>PDF</i>. The plus turns to a ✕.' }),
  phone({ inner: P.stop(), cap: '<b>Stop, while Sen answers</b> · The avatar rides down with the text, at its foot. <i>Stop</i> keeps what was shown.' }),
  phone({ inner: P.versions(), cap: '<b>An edited question, and one waiting</b> · ‹ 2/2 › under your bubble moves between versions. A question sent meanwhile is outlined and marked <i>Waiting</i>.' }),
])}${row('The row by itself', [
  strip(composer(), '<b>Empty</b> · <i>Send</i> is grey until there’s something to send.', 'bare'),
  strip(composer({ above: replyChip, text: 'Why the jump on the 8th?', focus: true }), '<b>Replying</b> · A swipe on a message puts it above the field as a chip, with ✕.', 'bare'),
  strip(composer({ above: photoChip + pdfChip, text: 'Is this on my statement?', focus: true }), '<b>With a photo and a PDF</b> · Each attached file sits above the field with its own ✕.', 'bare'),
  strip(`<div style="padding:0 16px 4px;display:grid">${you('Is this on my statement?', { img: true, quote: 'Sen · Am I spending faster than last cycle?' })}</div>${composer()}`, '<b>Sent</b> · The bubble carries the photo, and a grey line naming what it replies to.', 'bare'),
  strip(`<div style="padding:0 16px 8px">${notice('square', 'Stopped. What was shown is kept.').replace('lu s14', 'lu s14 fill')}</div>${composer()}`, '<b>After Stop</b> · A notice line, code’s, under what was kept.', 'bare'),
])}`));

S.push(section('press', '9 · A long-press on a message', 'The message lifts, everything else dims, and a menu floats beside it, below or above as room allows. Never a sheet.', row('Minted, light and dark', [
  phone({ inner: P.pressChart(), cap: '<b>On one of Sen’s charts</b> · Thumbs up and down share a row, then <i>Copy</i>, <i>Select text</i>, <i>Reply</i>, <i>Pin to Insights</i>, <i>Try again</i>; <i>Delete</i> is set apart.' }),
  phone({ inner: P.pressYou(), cap: '<b>On your own message</b> · <i>Copy</i>, <i>Select text</i>, <i>Reply</i>, <i>Edit</i>, <i>Delete</i>. <i>Edit</i> is where a new version starts.' }),
  phone({ mode: 'dark', inner: P.pressChart(), cap: '<b>Dark</b> · The lifted card and the menu are the brightest things on the screen.' }),
])));

S.push(section('away', '10 · Scrolled away, and the header’s menu', 'When the avatar’s place is out of view, it rides in the jump-to-latest button, in its state. At rest the button is only an arrow.', row('Minted, light', [
  phone({ inner: P.jump(), cap: '<b>Scrolled up while Sen answers</b> · The button carries the answering avatar and an arrow. A tap goes to the newest line.' }),
  phone({ inner: P.headMenu(), cap: '<b>The ⋯ menu</b> · Under the button that opened it: <i>What Sen remembers</i>, <i>Watches and reports</i>, <i>Research</i>, <i>Usage</i>.' }),
])));

S.push(section('varies', '11 · What varies', 'Each is said in words in the chat, and where the composer is off the field says why. The avatar is paused.', row('Minted, light', [
  phone({ inner: P.offline(), cap: '<b>Offline</b> · A notice line, and the field reads <i>Sen needs a connection</i>. What was said stays readable.' }),
  phone({ inner: P.credit(), cap: '<b>Out of credit</b> · <i>Sen is paused until 1 Dec; everything else works</i>, with a way to <i>Usage</i>. The question you sent is kept.' }),
  phone({ inner: P.failed(), cap: '<b>A step failed</b> · The steps stay open on the one that failed. <i>Sen couldn’t read that</i>, and <i>Try again</i>. The avatar waits there.' }),
])));

const STATES = [['resting', 'Resting', 'Nothing running', 'Sen is ready.'], ['note', 'A new note', 'Sen posted while you were away', 'Sen has a note for you.'], ['listening', 'Listening', 'You’re typing', 'You’re typing. Sen is ready.'], ['thinking', 'Working', 'From Send until the text starts, and while a proposal is applied', 'Sen is reading your payments…'], ['helpers', 'With helpers', 'A subagent is running', 'Sen is researching…'], ['speaking', 'Answering', 'Text and parts are streaming', 'Sen is answering…'], ['paused', 'Paused', 'Waiting on you; stopped; offline; out of credit; a step failed', 'Sen needs your answer.'], ['done', 'Done', 'The answer settled; 1.5 s, then resting', 'Sen has answered.']];
S.push(section('avatar', '12 · The avatar’s journey', 'One avatar with one home, its seat in the header. It leaves only for work or to wait on you, and it is never in two places. These are Minted’s own drawings, a still of each state.', `<div class="sc-states">${STATES.map(([st, n, when, tb]) => `<div>${`<span class="lk-minted">${av(st, 56)}</span>`}<b>${n}</b><span>${when}</span><i>${tb}</i></div>`).join('')}</div>
${row('The journey of one answer, as a filmstrip', [
  phone({ inner: P.settled(), cap: '<b>1 · Resting</b> · At home in the header. The rope turns slowly.' }),
  phone({ kb: true, inner: P.typing(), cap: '<b>2 · Listening</b> · Still at home. It brightens and swells a little while you type.' }),
  phone({ inner: P.sent(), cap: '<b>3 · Working</b> · On <i>Send</i>, one glide (200 ms) from its seat to the head of the new answer. The seat keeps a ring.' }),
  phone({ inner: P.sent(true), cap: '<b>4 · With helpers</b> · In place. Two small beads circle it while a subagent is out.' }),
  phone({ inner: P.stop(), cap: '<b>5 · Answering</b> · It drops to the foot of the text and moves down as each part lands, with the layout, not on its own.' }),
  phone({ inner: P.proposal(), cap: '<b>6 · Paused</b> · If the answer ends in a proposal or a question, it rests on that card until you decide.' }),
  phone({ inner: P.done(), cap: '<b>7 · Done</b> · It fades at the foot and is back in its seat, where it flashes once for 1.5 s, then rests.' }),
  phone({ inner: P.note(), cap: '<b>A new note</b> · Opened after a check-in: at home, with a bead circling until you’ve seen the note.' }),
], 'sc-film')}
${notes(['<b>What moves:</b> one glide out, on <i>Send</i>. After that the avatar only follows the layout: down as parts land, onto a card that waits. Going home it doesn’t fly back over what you’re reading: it fades out there and in at its seat.', '<b>Reduced motion:</b> no glide and no fade. The avatar cuts from place to place and holds one still frame per state, as drawn here.', '<b>Scrolled out of view,</b> it shows in the jump-to-latest button instead (section 10), so it is still one avatar.'])}
${row('Either-or 3 · where the avatar rests', [
  phone({ inner: P.settled(), cap: '<b>A · At home in the header (my pick)</b> · One place to look for what Sen is doing. The header is always headed by it, except while it works.' }),
  phone({ inner: P.altRest(), cap: '<b>B · With the newest answer</b> · It never leaves the conversation and only hops a short way. But the header loses it for good, against patterns section 7.' }),
  phone({ kb: true, inner: P.altType(), cap: '<b>B, typing</b> · It listens just above the field, close to the thumb, but scrolls away with the answer it sits on.' }),
], 'sc-film')}`));

const MAP = [
  ['The sheet, its handle and header', 'The Quiet sheet of D157 (shadcn <code>Drawer</code>, as the overlays slice builds it), at full height', 'Header: the avatar’s seat, title, context line, two icon buttons'],
  ['The conversation, the fades, jump-to-latest', 'AI Elements <code>Conversation</code>, <code>ConversationContent</code>, <code>ConversationScrollButton</code>', 'The scroll button takes the avatar when its place is out of view'],
  ['The empty chat and starters', '<code>ConversationEmptyState</code> holding a <code>GroupCard</code> of <code>NavRow</code>s (patterns section 7)', 'Rows, not <code>Suggestion</code> chips'],
  ['Your bubble; versions ‹ 1/2 ›', '<code>Message</code> (from user), <code>MessageContent</code>; <code>MessageBranch</code> with its selector, previous, next and page', ''],
  ['Sen’s turn and its head row', '<code>Message</code> (from assistant) with no bubble; the head row is its own small part', ''],
  ['The steps line, open and folded', '<code>ChainOfThought</code> (header, steps), or <code>Task</code> if it fits better: a collapsible whose trigger is the head row', 'Folds by itself when the text starts'],
  ['Text and its figures', '<code>MessageResponse</code> (the <code>Response</code> renderer) with a figure component; the source is a shadcn <code>Popover</code>', ''],
  ['Figures, a chart, a table', 'The section 4 card: <code>StatTiles</code>; the one chart component on shadcn <code>Chart</code>; shadcn <code>Table</code>', 'Shared with Insights'],
  ['The proposal and its states', 'AI Elements <code>Confirmation</code> (request, accepted, rejected, actions) restyled as the raised card; its folded line is the saved line', '<code>FactGrid</code>’s label and value for the fields'],
  ['A question', 'A card of shadcn <code>Button</code> rows, as a <code>RadioGroup</code> for TalkBack', 'No AI Element fits'],
  ['A button part; what’s coming up; a file', '<code>NavRow</code>s in a <code>GroupCard</code>, with <code>IconTile</code>', ''],
  ['Follow-ups', 'AI Elements <code>Suggestions</code>, <code>Suggestion</code>, changed from a sideways scroll to wrap', 'shadcn <code>Button</code> size <code>chip</code>'],
  ['Findings from the web', 'AI Elements <code>InlineCitation</code> for the markers and <code>Sources</code> for the list, inside Sen’s own dashed card', ''],
  ['A playground; a checklist; a comparison', 'shadcn <code>Slider</code> with the chart component; the <code>Steps</code> block with shadcn <code>Checkbox</code> (read-only); shadcn <code>Table</code>', ''],
  ['Saved and notice lines', 'shadcn <code>Item</code> (or <code>Alert</code>) in two small variants', 'Code’s, never the model’s'],
  ['The composer, Send and Stop', 'AI Elements <code>PromptInput</code>: textarea, submit (its status makes it Stop), attachments', ''],
  ['The plus menu; the reply chip; Waiting', '<code>PromptInputActionMenu</code> on shadcn <code>DropdownMenu</code>; a chip in the input’s header; AI Elements <code>Queue</code> for a waiting question', ''],
  ['The long-press menu', 'shadcn <code>ContextMenu</code> (it opens on a long-press), with the overlay’s dim; AI Elements <code>MessageActions</code> for TalkBack’s actions', 'The menu of D155'],
  ['The ⋯ menu', 'shadcn <code>DropdownMenu</code>', ''],
  ['Sen’s avatar', 'The look’s <code>avatar.draw</code> on a canvas, one element moved between its seats with a shared-layout glide', 'Not AI Elements’ <code>Loader</code> or <code>Shimmer</code>'],
];
S.push(section('build', '13 · What each piece is built from', 'For the builder. The AI Elements names are the registry’s; check each with the <code>shadcn</code> skill before using it, and restyle in place with a <code>// Sen:</code> note.', `<div class="sc-tw"><table class="sc-table"><thead><tr><th>Drawn piece</th><th>Built from</th><th>Note</th></tr></thead><tbody>${MAP.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>
${notes(['<b>The three either-ors, and my picks</b>', '<b>1 · The head row</b> (section 2): one line that is both the name and the source, over two lines. It keeps the verdict first.', '<b>2 · A question’s answers</b> (section 5): rows that each say what they do, over chips with a paragraph.', '<b>3 · Where the avatar rests</b> (section 12): at home in the header, over staying with the newest answer.'], 'sc-pick')}
<div class="sc-notes"><p><b>What I couldn’t make work as written, and what I drew instead</b></p><ol>
<li><b>Text in its own card.</b> <code>screens.md</code> lists text among the parts that each get a card, and also says Sen’s turn has no bubble. A card round the words is a bubble, so Sen’s words are bare and only what code builds is carded. That is also what tells Sen’s words from code’s.</li>
<li><b>An avatar in the header and one that travels.</b> Both are decided, and only one avatar may exist. So the header is its home: it leaves for the conversation and its seat keeps a ring until it’s back.</li>
<li><b>Jump-to-latest carrying the avatar’s state.</b> Carrying it always would make a second avatar while Sen rests in the header. It carries the avatar only when the avatar’s place is out of view; otherwise it is an arrow.</li>
<li><b>Done.</b> The table has it play where the answer settled. Drawn at home instead, so the follow-ups don’t shift to make room for it.</li>
<li><b>No way to edit a question is named,</b> though an edited question makes a version. I added <i>Edit</i> to the long-press menu on your own message, where thumbs, <i>Try again</i> and <i>Pin</i> don’t apply.</li>
<li><b>A menu holds two to five actions (D155),</b> and a message’s has eight. The thumbs share one row and <i>Delete</i> is set apart, which leaves six rows.</li>
<li><b>Chips are 32 px with a 48 px target.</b> Wrapped onto two lines they need 16 px between the lines, not 8, or the targets overlap. Drawn at 16.</li>
<li><b>The playground’s <i>Apply</i></b> (spec 12.3) shares a word with the proposal’s, but it only makes a proposal. Drawn small and outlined; I’d rename it <i>Propose this</i>.</li>
</ol></div>`));

const NAV = [['open', 'Opening'], ['answer', 'An answer'], ['figure', 'Figures'], ['proposal', 'A proposal'], ['ask', 'Questions and lines'], ['web', 'From the web'], ['parts', 'Other parts'], ['composer', 'The composer'], ['press', 'Long-press'], ['away', 'Scrolled away'], ['varies', 'What varies'], ['avatar', 'The avatar'], ['build', 'Built from']];
const body = S.join('\n');
const html = `<title>Sen's chat</title>
<!-- Sen's chat: the design page (docs/screens.md sen, D152, D153, D155, D157). Built by docs/ui/sen-chat/design-src/build.mjs;
     edit the source, then rebuild. Written for the Artifact tool, which adds the doctype and head. Every name and amount is made up. -->
<style>
${fontCss}
${LOOKS.map(lookCss).join('')}.ph { --keys: ${svgUri(keys())}; }
${avCss()}
${fs.readFileSync(path.join(here, 'page.css'), 'utf8')}</style>
<div class="sc">
<header class="sc-top"><h1>Sen’s chat</h1>
<p class="sc-lede">The chat as it should be built: a full-height sheet over the screen it was opened from, drawn at true size in Minted, with dark and ${COPPER} where a second look matters. Your turn is a bubble; Sen’s is full width under one small line; what code builds sits in cards; the proposal is the one raised card.</p>
<nav class="sc-nav" aria-label="On this page">${NAV.map(([id, n]) => `<a href="#${id}">${n}</a>`).join('')}</nav></header>
${body}
<p class="sc-foot">Every phone is 390 × 844, scaled to fit the page; a strip is a piece of the chat at its true width. Inside them every colour, radius and font is the look’s token; the scrim, the shadows and the keyboard stand-in are plain black and grey, since a look has no token for them. The avatar is each look’s own drawing, saved as a still of each state. Names, amounts, banks and web pages are made up, on the same month the app’s screenshots use. Source: <code>docs/ui/sen-chat/design-src/</code>.</p>
</div>
`;
fs.writeFileSync(path.join(here, '../design.html'), html);
console.log(`built design.html (${(html.length / 1024).toFixed(0)} KB)`);
