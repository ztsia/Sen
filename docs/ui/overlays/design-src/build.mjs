// Builds docs/ui/overlays/design.html: three anatomies of Sen's bottom sheet side by side, with the
// menu and the dialog (D155, D156). One self-contained fragment for the Artifact tool, which adds the
// doctype and head: no scripts, no requests, fonts inline. The page is static HTML written here.
//   node docs/ui/overlays/design-src/build.mjs
// It takes each look's tokens, fonts, tab bar and marks from docs/ui/directions/ (read only), the
// lucide icons from icons.json (icons.mjs saves them), and its own styles from page.css.
// All names and amounts are the made-up person's month, as in shots/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = path.join(here, '../../directions');
const readDir = (f) => fs.readFileSync(path.join(dirs, f), 'utf8');
const ICONS = JSON.parse(fs.readFileSync(path.join(here, 'icons.json'), 'utf8'));
const b64 = (s) => Buffer.from(s).toString('base64');
const svgUri = (svg) => `url("data:image/svg+xml;base64,${b64(svg)}")`;

const LOOKS = ['minted', 'copper']; // Minted, and the look least like it: warm, squared buttons, heavier icons
const MODES = ['light', 'dark'];
const FONTS = [
  ['Schibsted Grotesk', '400 700', null, 'schibstedgrotesk/schibstedgrotesk-normal-400-700-latin.woff2'],
  ['Libre Caslon Display', '400', null, 'librecaslondisplay/librecaslondisplay-normal-400-latin.woff2'],
  ['Archivo', '100 900', '62% 125%', 'archivo/archivo-normal-100-900-62-125-latin.woff2'],
];

// ---------- the looks: tokens scoped to a class, fonts inline, tab bar and marks as CSS images ----------
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
    const img = { home: tab('home'), 'home-on': tab('home-active'), review: tab('review'), insights: tab('insights'), more: tab('more'), 'more-on': tab('more-active'), scan: tab('scan'), badge: tab('badge').replace(/>5<\/text>/, '>12</text>') };
    for (const [k, svg] of Object.entries(img)) css += `.lk-${id}.${mode} .ti-${k} { background-image: ${svgUri(svg)}; }\n`;
    if (id === 'minted') css += `.lk-minted.${mode} { --strip: ${svgUri(readDir(`assets/minted/marks/${mode}/strip.svg`))}; --rosette: ${svgUri(readDir('assets/minted/marks/rosette.svg'))}; }\n`;
  }
  return css;
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
const tile = (icon, tone = '', lg = false) => `<span class="tile${lg ? ' lg' : ''}${tone ? ` ${tone}` : ''}">${I(icon)}</span>`;
const SBAR = `<div class="sbar"><span>20:41</span><span><svg viewBox="0 0 16 16"><path d="M1 12h2.4v3H1zM5.2 9h2.4v6H5.2zM9.4 6h2.4v9H9.4zM13.6 2H16v13h-2.4z"/></svg><svg viewBox="0 0 16 16"><path d="M8 14.2 5.6 11.4a3.4 3.4 0 0 1 4.8 0zM3.5 9a6.4 6.4 0 0 1 9 0l-1.2 1.4a4.6 4.6 0 0 0-6.6 0zM.9 6a10 10 0 0 1 14.2 0L13.9 7.4a8.2 8.2 0 0 0-11.8 0z"/></svg><svg viewBox="0 0 22 16" style="width:22px"><rect x="1" y="3.5" width="17" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="2.5" y="5" width="11" height="6" rx="1.2"/><rect x="19.2" y="6" width="1.8" height="4" rx=".9"/></svg></span></div>`;
function tabbar(on, press = false) {
  const t = (k, label) => `<span${on === k ? ' class="on"' : ''}><i class="ti-${k}${on === k ? '-on' : ''}"></i>${k === 'review' ? '<i class="bdg ti-badge"></i>' : ''}${label}</span>`;
  return `<div class="tabbar">${t('home', 'Home')}${t('review', 'Review')}<span class="sc${press ? ' press' : ''}"><i class="ti-scan"></i>Scan</span>${t('insights', 'Insights')}${t('more', 'More')}</div>`;
}
const appbar = (title) => `<div class="appbar"><span class="bk">${I('arrow-left', 's24')}</span><h1>${title}</h1></div>`;
const SEN = '<span class="rb sen"></span>';

// ---------- the screens behind ----------
const CATS = [['Meals', 'utensils', 1], ['Car', 'car', 2], ['Drinks &amp; desserts', 'coffee', 2], ['Subscriptions', 'repeat', 1], ['Groceries', 'shopping-basket', 3], ['Shopping', 'shopping-bag', 2], ['Transport', 'bus', 1], ['Personal care', 'scissors', 3], ['Phone &amp; internet', 'smartphone', 3], ['Home &amp; bills', 'house', 1], ['Entertainment', 'clapperboard', 3], ['Health', 'heart-pulse', 2], ['Gifts &amp; treats', 'gift', 1], ['Family', 'users', 2], ['Travel', 'plane', 3], ['Fees &amp; charges', 'landmark', 1], ['Cash', 'banknote', 2]];

const menuOut = `<div class="menu" style="right:0;top:calc(100% + 8px);z-index:5"><div class="mi">${I('arrow-left-right')}Mark as transfer</div><div class="mi">${I('receipt-text')}No receipt: enter the items</div><div class="msep"></div><div class="mi del">${I('trash-2')}Delete</div></div>`;
const menuIn = `<div class="menu" style="right:0;top:calc(100% + 8px);z-index:5"><div class="mi">${I('arrow-down-left')}Mark as income</div><div class="mi">${I('arrow-left-right')}Mark as transfer</div><div class="mi">${I('undo-2')}Refund of…</div><div class="msep"></div><div class="mi del">${I('trash-2')}Delete</div></div>`;

const screens = {
  payment: (menu = '') => `<div class="scr">${appbar('Payment')}<div class="pad">
<div class="card hc">${tile('utensils', 't1', true)}<p class="nm">Sate Kajang Hj Samuri</p><p class="fig num">RM64.13${I('copy')}</p><p class="meta">Today, 19:58 · Ryt Bank</p><p class="src">From Ryt Bank’s notification</p></div>
<div class="ab" style="position:relative"><span><span class="rb">${I('scan-line')}</span>Scan receipt</span><span><span class="rb">${I('split')}</span>Split</span><span>${SEN}Ask Sen</span><span><span class="rb${menu ? ' open' : ''}">${I('ellipsis')}</span>More</span>${menu}</div>
<div class="card fg"><span><i>Category</i><b>${I('utensils', 's18')}Meals${I('chevron-right', 's16')}</b></span><span><i>Note</i><b class="mut">Add a note${I('chevron-right', 's16')}</b></span></div>
<p class="gl">What the bank said</p>
<div class="card"><div class="said"><i>Ryt Bank</i><b>Card payment completed</b><p>RM64.13 paid at SATE KAJANG HJ SAMURI using your Main Account.</p></div><div class="nrow">${tile('pencil')}<span class="g">Correct amount, time or account</span>${I('chevron-right')}</div></div>
<p class="gl">Changes</p><div class="card"><div class="nrow"><span class="g">Captured from Ryt Bank<small>Today, 19:58</small></span></div></div>
</div>${tabbar('more')}</div>`,
  paymentIn: (menu = '') => `<div class="scr">${appbar('Payment')}<div class="pad">
<div class="card hc">${tile('circle-dashed', '', true)}<p class="nm">Lim K H</p><p class="fig num in">+RM48.80${I('copy')}</p><p class="meta">Yesterday, 22:10 · Ryt Bank</p><p class="src">From Ryt Bank’s notification</p></div>
<div class="ab" style="position:relative"><span>${SEN}Ask Sen</span><span><span class="rb${menu ? ' open' : ''}">${I('ellipsis')}</span>More</span>${menu}</div>
<div class="card fg"><span><i>Category</i><b class="mut">${I('circle-dashed', 's18')}Choose one${I('chevron-right', 's16')}</b></span><span><i>Note</i><b class="mut">Add a note${I('chevron-right', 's16')}</b></span></div>
<p class="gl">What the bank said</p>
<div class="card"><div class="said"><i>Ryt Bank</i><b>Your money is in!</b><p>You’ve received RM48.80 from LIM K H on ••/••/••••. Tap to view your balance.</p></div><div class="nrow">${tile('pencil')}<span class="g">Correct amount, time or account</span>${I('chevron-right')}</div></div>
<p class="gl">Changes</p><div class="card"><div class="nrow"><span class="g">Captured from Ryt Bank<small>Yesterday, 22:10</small></span></div></div>
</div>${tabbar('more')}</div>`,
  account: () => `<div class="scr">${appbar('Account')}<div class="pad">
<div class="card hc">${tile('wallet', '', true)}<p class="nm">Ryt Bank</p><p class="fig num">RM14,650.87</p><p class="meta">Balance now</p><p class="src">Computed from your notifications since 31 Oct. Not the bank’s own figure.</p></div>
<div class="ab"><span><span class="rb">${I('scale')}</span>Check</span><span><span class="rb">${I('list')}</span>Payments</span><span><span class="rb">${I('pencil')}</span>Edit</span><span>${SEN}Ask Sen</span></div>
<div class="card fg"><span><i>Opening balance</i><b class="num">RM3,200.00</b></span><span><i>Counted from</i><b>31 Oct</b></span></div>
</div>${tabbar('more')}</div>`,
  home: (press = false) => `<div class="scr"><div class="appbar"><span class="wm">Sen</span></div><div class="pad" style="gap:12px">
<div class="card"><div class="nrow">${tile('calendar-check')}<span class="g">Payday plan · 2 of 3</span>${I('chevron-right')}</div></div>
<div class="hero"><span class="ros"></span><span class="l">Left until payday</span><span class="f"><small>RM</small>1,931.27</span><span class="l">12 days to go</span><span class="strip"></span></div>
<div class="card spent"><span>Spent <b class="num">RM3,873.53</b> this cycle</span><svg viewBox="0 8 326 52" aria-hidden="true"><path d="M52 58 60 36 70 35 78 30 96 28 108 24 124 24 134 21 150 20 162 16 180 15 196 12V58Z" fill="var(--chart-accent)" opacity=".14"/><path d="M52 58 60 38 70 37 80 33 96 32 110 30 124 27 136 26 152 22 166 21 182 17 196 15 212 11 230 9 250 8 270 6 284 5" fill="none" stroke="var(--chart-context)" stroke-width="2"/><path d="M52 58 60 36 70 35 78 30 96 28 108 24 124 24 134 21 150 20 162 16 180 15 196 12" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round"/><circle cx="196" cy="12" r="4" fill="var(--chart-accent)" stroke="var(--card)" stroke-width="2"/><path d="M52 58.5H284" stroke="var(--border)"/></svg><span>RM273.53 more than last cycle by this day</span><span class="lg"><span><i style="background:var(--chart-accent)"></i>This cycle</span><span><i style="background:var(--chart-context)"></i>Last</span></span></div>
<div class="card note"><span class="av"></span><span><small>Sen · Yesterday, 21:00</small>Saturday came to RM135.40. Drinks are at RM73.50 of RM150 with 12 days to go.</span></div>
</div><span class="fab"></span>${tabbar('home', press)}</div>`,
  receipt: () => { const it = (n, a, warn) => `<div class="nrow">${tile('utensils', 't1')}<span class="g">${n}${warn ? `<small>${I('triangle-alert', 's16')}Check this price</small>` : ''}</span><span class="num">${a}</span>${I('chevron-right')}</div>`;
    return `<div class="scr">${appbar('Check the receipt')}<div class="pad">
<div class="card"><div class="nrow" style="align-items:flex-start;padding:16px"><span class="photo">${I('image', 's24')}</span><span class="g" style="gap:2px"><b style="font:600 17px/1.35 var(--font-ui)">Sate Kajang Hj Samuri</b><small>Today, 20:40</small><span class="sm-btn" style="margin-top:6px">${I('image', 's18')}View photo</span></span></div></div>
<p class="gl">Category</p><div class="card"><div class="nrow">${tile('utensils', 't1')}<span class="g">Meals</span>${I('chevron-right')}</div></div>
<p class="gl">Items</p><div class="card">${it('Sate ayam (20)', 'RM29.72')}${it('Sate daging (10)', 'RM17.15')}${it('Nasi impit', 'RM5.14', true)}${it('Teh o ais (3)', 'RM9.60')}${it('Kuah kacang (extra)', 'RM2.52')}</div>
<p class="gl">Total</p><div class="card"><div class="nrow"><span class="g">5 items</span><span class="num" style="font-weight:600">RM64.13</span></div></div>
</div></div>`; },
  member: () => `<div class="scr">${appbar('Member')}<div class="pad">
<div class="card"><div class="nrow" style="padding:14px 16px"><span class="pav">HM</span><span class="g"><b style="font-weight:600">Hui Min</b><small>huimin@example.com · joined 12 Oct</small></span></div></div>
<p class="gl">What Sen may spend for them</p>
<div class="card" style="padding:16px;display:grid;gap:14px"><div class="fld"><label>Monthly allowance</label><div class="amt"><span class="cur">RM</span><span class="v num">2.00</span></div></div><span class="sm-btn">Save allowance</span><div class="fld"><label>Daily ceiling</label><div class="amt"><span class="cur">RM</span><span class="v num">1.00</span></div><span class="hint">The most Sen spends for them in a day.</span></div><span class="sm-btn">Save ceiling</span></div>
<p class="gl">Their account</p>
<div class="card"><div class="nrow">${tile('download')}<span class="g">Export their data</span></div><div class="nrow" style="color:var(--destructive)"><span class="tile" style="--tone:var(--destructive)">${I('trash-2')}</span><span class="g">Remove Hui Min</span></div></div>
</div>${tabbar('more')}</div>`,
};

// ---------- the sheet's three bodies, the same inside every option ----------
const CTX = 'Sate Kajang Hj Samuri · RM64.13';
const bodies = {
  pick: `<div class="search">${I('search')}Search categories</div><div class="grid">${CATS.map(([n, ic, t], i) => `<span class="ct${i === 0 ? ' on' : ''}">${tile(ic, `t${t}`)}${n}${i === 0 ? `<span class="ck">${I('check')}</span>` : ''}</span>`).join('')}</div>`,
  form: `<div class="fld"><label>Name</label><div class="inp focus">Ryt Bank</div></div><div class="fld"><label>Opening balance</label><div class="amt"><span class="cur">RM</span><span class="v num">3,200.00</span></div><span class="hint">Fix a typo. Sen still counts from 31 Oct.</span></div>`,
  read: `<div class="card sum"><div><i></i><span>Income received</span><span class="num in">+RM5,804.80</span></div><div><i>−</i><span>Spending</span><span class="num">RM3,873.53</span></div><div class="tot"><i>=</i><span>Left until payday</span><span class="num">RM1,931.27</span></div></div><p class="est">${I('trending-up', 's16')}<span><b>An estimate:</b> at this pace, about RM740.53 left on payday. It assumes you keep spending as you have so far.</span></p>`,
  who: `<div class="cc2"><span class="cc">${tile('wallet', 'ta', true)}I paid</span><span class="cc">${tile('users', 'ta', true)}A friend paid</span></div>`,
  how: `<div class="ccs"><span class="cc wide">${tile('link', 'ta', true)}<span>Share a link<small>Everyone ticks their own items on their phone.</small></span></span><span class="cc wide">${tile('list-checks', 'ta', true)}<span>Just my part<small>You tick yours; the rest becomes Others’ items.</small></span></span></div>`,
};
const SHEETS = {
  pick: { title: 'Which category?', ctx: CTX, body: bodies.pick, behind: () => screens.payment() },
  form: { title: 'Edit this account', body: bodies.form, main: 'Save', quiet: ['Archive', 'Archive this account'], kb: true, behind: () => screens.account() },
  read: { title: 'This cycle', ctx: 'October: 30 Sept to 29 Oct. Payday expected Fri, 30 Oct', body: bodies.read, behind: () => screens.home() },
  who: { title: 'Who paid?', ctx: CTX, body: bodies.who, behind: () => screens.receipt() },
  how: { title: 'How do you split it?', ctx: CTX, body: bodies.how, back: true, behind: () => screens.receipt() },
};

// ---------- the three anatomies ----------
function sheet(opt, s) {
  const ctx = s.ctx ? `<p class="ctx">${s.ctx}</p>` : '';
  if (opt === 'a') return `<div class="sheet a"><div class="grab"></div><div class="hd${s.back ? ' back' : ''}">${s.back ? `<span class="ic">${I('arrow-left')}</span>` : ''}<h3>${s.title}</h3>${s.quiet ? `<span class="btn sm quiet">${I('archive', 's16')}${s.quiet[0]}</span>` : ''}<span class="ic">${I('x')}</span></div>${ctx}<div class="bd">${s.body}</div>${s.main ? `<div class="ft"><span class="btn">${s.main}</span></div>` : ''}</div>`;
  if (opt === 'b') return `<div class="sheet b"><div class="hd${s.back ? ' back' : ''}">${s.back ? `<span class="ic circ"><span>${I('arrow-left', 's18')}</span></span>` : ''}<h3>${s.title}</h3><span class="ic circ"><span>${I('x', 's18')}</span></span></div>${ctx}<div class="bd">${s.body}</div>${s.main ? `<div class="ft">${s.quiet ? `<span class="btn quiet">${I('archive', 's16')}${s.quiet[0]}</span>` : ''}<span class="btn">${s.main}</span></div>` : ''}</div>`;
  const left = s.main ? '<span class="txt">Cancel</span>' : s.back ? `<span class="txt bk">${I('chevron-left')}Back</span>` : '';
  const right = s.main ? `<span class="btn sm">${s.main}</span>` : `<span class="ic">${I('x')}</span>`;
  return `<div class="sheet c"><div class="bar"><div class="grab"></div><div class="rw"><span class="l">${left}</span><h3>${s.title}</h3><span class="r">${right}</span></div>${ctx}</div><div class="bd">${s.body}${s.quiet ? `<div class="qrow">${I('archive', 's18')}${s.quiet[1]}</div>` : ''}</div></div>`;
}

// ---------- a phone ----------
function phone({ look = 'minted', mode = 'light', inner, kb = false, cap, alt }) {
  return `<figure class="ov-pw"><div class="ov-fr"><div class="ph lk-${look} ${mode}${kb ? ' kbup' : ''}" role="img" aria-label="${alt || cap.replace(/<[^>]+>/g, '')}">${SBAR}${inner}${kb ? '<div class="kb"></div>' : ''}<div class="gest"></div></div></div><figcaption>${cap}</figcaption></figure>`;
}
const sheetPhone = (opt, key, look, mode, cap) => { const s = SHEETS[key]; return phone({ look, mode, kb: s.kb, cap, inner: `${s.behind()}<div class="scrim"></div>${sheet(opt, s)}` }); };

const OPTS = [
  { id: 'a', name: 'A · Quiet', line: 'On the bottom edge, top corners rounded. A small handle, the title, a quiet ✕ and no rule: content starts under the title. The main button is pinned to the bottom of the sheet, above the keyboard.',
    caps: { pick: 'Tap a tile: it picks and closes. Meals, the current one, has the ring and the tick.', form: 'Save stays on the keyboard’s top edge. <i>Archive</i> has the top right, beside ✕.', read: 'Facts only, so no button at all.', who: 'Two choice cards; a tap goes on to step two.', how: 'The arrow goes back to <i>Who paid?</i>. The sheet eased up to this height.' },
    notes: [['Good at', 'the least chrome, so the content is the sheet. The one filled button sits under the thumb and stays put, and it looks the same in all six looks.'], ['Costs', 'the pinned button takes 64 px from a form while the keyboard is up. ✕ and <i>Archive</i> are neighbours at the top, out of the thumb’s reach. In dark only the scrim and a hairline part it from the screen.'], ['Motion', 'rises from the bottom edge in 200 ms and falls the same way. On a step the top edge eases to the new height while the button holds the bottom; content scrolling under the button fades.']] },
  { id: 'b', name: 'B · Floating card', line: 'Inset 8 px from the sides and the bottom, all four corners rounded from the look’s card radius, lifted on a shadow. No handle: the whole header drags. ✕ sits in a filled circle, and the main button is inside the card at its bottom.',
    caps: { pick: 'The same grid, 16 px narrower. A strip of the tab bar shows under the card.', form: 'The card floats 8 px above the keyboard. <i>Archive</i> sits left of Save, outlined and quiet.', read: 'The tab bar shows around the card’s edges.', who: 'Two choice cards; a tap goes on to step two.', how: 'Back is a second circle, mirroring ✕. The card grew upward from its bottom edge.' },
    notes: [['Good at', 'reading as one object, with the clearest ✕ of the three. Both of a form’s actions sit at the thumb, and each look shows in its corners (18 px in Mercury, 12 in Copper).'], ['Costs', '16 px of width and of height. No handle says it can be swiped down. The screen and the tab bar show around it, and with the keyboard up a strip shows between. In dark the shadow is lost. <i>Archive</i> beside Save can be hit by mistake.'], ['Motion', 'rises and settles clear of the edges in 200 ms, and falls back. On a step it grows upward from its bottom edge. A drag anywhere on the header moves the whole card.']] },
  { id: 'c', name: 'C · Action bar', line: 'On the bottom edge, with a handle and one bar: Cancel on the left, the title centred, the main action on the right. Nothing is hidden by the keyboard and there’s no bottom button. A Pick or Read sheet has only the title and ✕ in the bar.',
    caps: { pick: 'Only the title and ✕ in the bar; the context line sits under the title.', form: 'Save is in the bar, where the keyboard can’t reach it. <i>Archive this account</i> has the bottom to itself.', read: 'The bar holds nothing to press but ✕.', who: 'Two choice cards; a tap goes on to step two.', how: 'Cancel’s place becomes <i>Back</i>. The content under the bar eased to this height.' },
    notes: [['Good at', 'the keyboard: Cancel and Save are always in the same two places and can’t be covered. The destructive action has the bottom of the form to itself, in full words.'], ['Costs', 'Save is about 590 px up from the bottom edge here, a stretch for one thumb, so the keyboard’s Done key must save too. The title shares its row and must stay under about 22 characters. The tinted bar is a layer the others don’t have, and in a Pick or Read sheet it holds only ✕.'], ['Motion', 'rises and falls like A. The bar stays still while the content under it eases to the new height, and Cancel cross-fades to <i>Back</i> on a step.']] },
];
const LABELS = { pick: 'Pick', form: 'Form', read: 'Read', who: 'Steps, 1 of 2', how: 'Steps, 2 of 2' };
const row = (label, phones, cls = '') => `<p class="ov-rowlbl">${label} <span class="ov-swipe">· swipe sideways</span></p><div class="ov-row${cls}">${phones.join('')}</div>`;
const set = (o, look, mode, keysOf) => keysOf.map((k) => sheetPhone(o.id, k, look, mode, `<b>${LABELS[k]}</b> · ${o.caps[k]}`));

function optionSection(o) {
  const all = ['pick', 'form', 'read', 'who', 'how'];
  return `<section class="ov-sec" id="opt-${o.id}"><h2>${o.name}<small>${o.line}</small></h2>
${row('Minted, light', set(o, 'minted', 'light', all))}
${row('Minted, dark', set(o, 'minted', 'dark', all))}
${row('Copper <i>· the same sheet on another look’s tokens: Pick in light, Form in dark</i>', [...set(o, 'copper', 'light', ['pick']), ...set(o, 'copper', 'dark', ['form'])])}
<div class="ov-notes">${o.notes.map(([k, v]) => `<p><b>${k}:</b> ${v}</p>`).join('')}</div></section>`;
}

function shared(mode) {
  const dlg = `<div class="dlg"><h3>Remove Hui Min?</h3><p>They can’t sign in any more and their data is deleted. This can’t be undone.</p><div class="acts"><span class="btn sec">${I('download', 's18')}Export their data first</span><span class="btn out">Keep them</span><span class="btn del">Remove</span></div></div>`;
  const scan = `<div class="menu up" style="left:50%;transform:translateX(-50%);bottom:106px"><div class="mi">${I('camera')}Scan</div><div class="mi">${I('image')}From gallery</div><div class="mi">${I('pencil-line')}Add manually</div></div>`;
  return [
    phone({ mode, inner: screens.payment(menuOut), cap: '<b>Payment’s ⋯ menu</b> · It opens under the button that was tapped. <i>Mark as…</i> and <i>No receipt?</i> were sheets; now each is one item. Delete is last and set apart.' }),
    phone({ mode, inner: screens.paymentIn(menuIn), cap: '<b>The same menu, money in</b> · The three kinds are items, not a sheet of rows. <i>Refund of…</i> goes on to a Pick sheet of payments.' }),
    phone({ mode, inner: `${screens.home(true)}${scan}`, cap: '<b>Scan’s long-press</b> · A menu rising from the Scan button, where the thumb already is, in place of the <i>Add a payment</i> sheet.' }),
    phone({ mode, inner: `${screens.member()}<div class="scrim"></div>${dlg}`, cap: '<b>The dialog</b> · Centred, for what can’t be undone. <i>Keep them</i> and <i>Remove</i> are the same size, side by side; exporting first is the wide one above.' }),
  ];
}

const glance = (key, mode) => OPTS.map((o) => sheetPhone(o.id, key, 'minted', mode, `<b>${o.name}</b>`));

const html = `<title>Sen's overlays, three options</title>
<!-- Sen's overlays: three anatomies of the bottom sheet, with the menu and the dialog (D155, D156).
     Built by docs/ui/overlays/design-src/build.mjs; edit the source, then rebuild. Written for the Artifact tool,
     which adds the doctype and head. Every name and amount is made up. -->
<style>
${fontCss}
${LOOKS.map(lookCss).join('')}.ph { --keys: ${svgUri(keys())}; }
${fs.readFileSync(path.join(here, 'page.css'), 'utf8')}</style>
<div class="ov">
<header class="ov-top"><h1>Sen’s overlays, three options</h1>
<p class="ov-lede">Three ways to build Sen’s bottom sheet, each drawn with the same four sheets at true size: pick the one you’d rather hold, by eye. The menu and the dialog further down go with any of them.</p>
<nav class="ov-nav" aria-label="On this page">${OPTS.map((o) => `<a href="#opt-${o.id}">${o.name}</a>`).join('')}<a href="#shared">Menus and the dialog</a><a href="#rec">Recommendation</a></nav></header>
<section class="ov-sec" id="glance"><h2>At a glance<small>The same two sheets in each option: a form with the keyboard up, where they differ most, and the category picker.</small></h2>
<div class="ov-row ov-glance">${glance('form', 'light').join('')}</div>
<div class="ov-row ov-glance">${glance('pick', 'light').join('')}</div></section>
${OPTS.map(optionSection).join('\n')}
<section class="ov-sec" id="shared"><h2>Menus and the dialog<small>The same whichever sheet you choose (D155). A menu opens beside what was tapped and holds two to five actions; a dialog is only for something that can’t be undone.</small></h2>
${row('Minted, light', shared('light'))}
${row('Minted, dark', shared('dark'))}</section>
<section class="ov-sec" id="rec"><h2>Recommendation</h2>
<p class="ov-rec">I’d take <b>A · Quiet</b>: it removes the most chrome, keeps the one filled button under the thumb whether or not the keyboard is up, and looks the same in all six looks because it asks nothing of them but a colour and a radius. Its weak spot is <i>Archive</i> beside ✕, and if that bothers you, C’s answer (the last row of the form) drops into A without changing anything else.</p></section>
<p class="ov-foot">Every phone is 390 × 844, scaled to fit the page. Inside a sheet every colour, radius and font is the look’s token; the scrim, the shadow and the keyboard stand-in are plain black and grey, since a look has no token for them. Names and amounts are the made-up month the app’s own screenshots use. Source: <code>docs/ui/overlays/design-src/</code>.</p>
</div>
`;
fs.writeFileSync(path.join(here, '../design.html'), html);
console.log(`built design.html (${(html.length / 1024).toFixed(0)} KB)`);
