// Builds docs/ui/claims-ess/design.html: Settings → Claims, the ESS section, redrawn two ways, each in
// every state, for the owner to choose by eye. One self-contained fragment for the Artifact tool (no
// doctype, no external requests: Minted's tokens, its tab bar and its font are inlined).
//   node docs/ui/claims-ess/design-src/build.mjs
// Reads, never writes: docs/ui/directions/assets/ (Minted's theme.css, tab bar, marks and font).
// The words are in screens.mjs; the phone's blocks in phone.css; the page around them in page.css.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPTIONS, WORDS, PICK } from './screens.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '..', '..', 'directions', 'assets');
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

// Minted's tokens, scoped to a phone's own mode so the page's theme never changes a phone
const theme = read(assets, 'minted', 'theme.css')
  .replace(/\/\*[\s\S]*?\*\//, '')
  .replace(/:root \{(\s*--radius)/, '.ph {$1')
  .replace(/:root \{/, '.ph.light {')
  .replace(/\.dark \{/, '.ph.dark {')
  .trim();
if (!/\.ph\.light \{/.test(theme) || !/\.ph\.dark \{/.test(theme)) throw new Error('theme.css changed shape');

// the one font the screen uses, as a data URI (SIL OFL 1.1, docs/ui/directions/assets/fonts/)
const font = fs.readFileSync(path.join(assets, 'fonts', 'schibstedgrotesk', 'schibstedgrotesk-normal-400-700-latin.woff2')).toString('base64');
const fontCss = `@font-face { font-family: "Schibsted Grotesk"; font-style: normal; font-weight: 400 700; font-display: swap; src: url(data:font/woff2;base64,${font}) format("woff2"); }`;

// the tab bar's drawings, with ids made unique per mode (light and dark draw different gradients)
const svg = (mode, ...p) => read(assets, 'minted', ...p).trim().replace(/\bid="([^"]+)"/g, `id="${mode[0]}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${mode[0]}-$1)`);
const TABS = [['home', 'Home'], ['review', 'Review'], ['scan', 'Scan'], ['insights', 'Insights'], ['more', 'More']];
function tabbar(mode) {
  const tabs = TABS.map(([k, label]) => {
    if (k === 'scan') return `<span class="tab"><span class="scanbtn">${svg(mode, 'tabs', mode, 'scan.svg')}</span><span>${label}</span></span>`;
    const on = k === 'more';
    const badge = k === 'review' ? `<span class="bdg">${svg(mode, 'tabs', mode, 'badge.svg').replace(/>5<\/text>/, '>12</text>')}</span>` : '';
    return `<span class="tab${on ? ' on' : ''}"><span class="ti">${svg(mode, 'tabs', mode, on ? `${k}-active.svg` : `${k}.svg`)}</span>${badge}<span>${label}</span></span>`;
  }).join('');
  return `<div class="tabbar" aria-hidden="true"><span class="micro">${svg(mode, 'marks', mode, 'microprint.svg')}</span><span class="bead">${svg(mode, 'marks', mode, 'bead.svg')}</span>${tabs}</div>`;
}

// ---- the building blocks, as markup (patterns.md §7) ----
const ICONS = JSON.parse(read(here, 'icons.json')).icons;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ic = (name, cls = '') => { if (!ICONS[name]) throw new Error(`no icon ${name}`); return `<svg class="lu${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; };
// Sen's avatar as an icon: in the app the look draws it live; here a still of Minted's rosette
const sen = () => '<svg class="sen" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="var(--sen-ink)"/><circle cx="10" cy="10" r="7.7" fill="var(--sen-lace)"/><circle cx="10" cy="10" r="5.7" fill="var(--sen-fill)" stroke="var(--sen-fill)" stroke-width="2" stroke-dasharray="1.2 1.19"/><circle cx="10" cy="10" r="1.5" fill="none" stroke="var(--sen-ink)" stroke-width="1"/></svg>';
const mark = (icon) => (icon === 'sen' ? sen() : ic(icon));
const button = (b) => `<span class="btn ${b.kind || ''}${b.pressed ? ' pressed' : ''}">${b.icon ? (b.icon === 'sen' ? sen() : ic(b.icon, 's20')) : ''}${b.label ? esc(b.label) : ''}</span>`;
const menu = (items) => `<div class="menu">${items.map((m) => (m === '-' ? '<hr>' : `<div class="mi${m.danger ? ' danger' : ''}">${mark(m.icon)}${esc(m.label)}</div>`)).join('')}</div>`;

function row(r) {
  const end = [];
  if (r.badge) end.push(`<span class="badge ${r.badge.tone || ''}">${esc(r.badge.label)}</span>`);
  if (r.button) end.push(button(r.button));
  if (r.more) end.push(button({ kind: 'icon', icon: 'ellipsis', pressed: r.more === 'open' }));
  if (r.chevron) end.push(ic('chevron-right', 's20 chev'));
  if (r.menu) end.push(menu(r.menu));
  return `<div class="row${r.off ? ' off' : ''}${r.danger ? ' danger' : ''}">${r.icon ? `<span class="tile ${r.tone || ''}">${mark(r.icon)}</span>` : ''}<div class="txt"><p class="t">${esc(r.title)}</p>${r.line ? `<p class="d">${esc(r.line)}</p>` : ''}</div>${end.length ? `<div class="end">${end.join('')}</div>` : ''}</div>`;
}
const status = (s) => `<div class="card status"><p class="st${s.idle ? ' idle' : ''}">${ic(s.icon)}${esc(s.state)}</p><p class="ti">${esc(s.title)}</p>${s.button ? button(s.button) : ''}</div>`;
function group(g) {
  const body = (g.status ? status(g.status) : '') + (g.rows ? `<div class="card">${g.rows.map(row).join('')}</div>` : '');
  return `<section class="grp${g.context ? ' context' : ''}">${g.label ? `<h2 class="lbl">${esc(g.label)}</h2>` : ''}${g.intro ? `<p class="note">${esc(g.intro)}</p>` : ''}${body}${g.footer ? `<p class="note">${esc(g.footer)}</p>` : ''}</section>`;
}
function overlay(o) {
  if (!o) return '';
  if (o.sheet) return `<div class="scrim"></div><div class="sheet"><div class="grab"></div><div class="head"><h2>${esc(o.sheet.title)}</h2>${button({ kind: 'icon', icon: 'x' })}</div><p class="about">${esc(o.sheet.about)}</p><div class="in"><div class="card">${o.sheet.rows.map(row).join('')}</div></div></div>`;
  return `<div class="scrim"></div><div class="dialog"><div><h2>${esc(o.dialog.title)}</h2><p>${esc(o.dialog.about)}</p></div><div class="acts">${button({ kind: 'destructive lg wide', label: o.dialog.action })}${button({ kind: 'outline lg wide', label: o.dialog.cancel })}</div></div>`;
}

// the Schemes card above the section, as it is today, dimmed: it's context, not part of the redesign
const SCHEMES = {
  context: true, label: 'Schemes',
  rows: [
    { icon: 'receipt-text', tone: 'accent', title: 'Phone bill', line: 'Up to RM100.00 a month, submit by the 25th, from spending you tag', button: { kind: 'ghost', icon: 'sen', label: 'Edit' } },
    { icon: 'receipt-text', tone: 'accent', title: 'Parking', line: 'Up to RM100.00 a month, submit by the 20th, from receipts kept as evidence', button: { kind: 'ghost', icon: 'sen', label: 'Edit' } },
  ],
  footer: 'Describe a scheme to Sen in your own words, and it sets it up for you to confirm.',
};

function phone(opt, s) {
  const mode = s.mode || 'light';
  const label = `Option ${opt.key}, ${s.name}${mode === 'dark' ? ', dark' : ''}`;
  return `<figure class="pw" id="${opt.key.toLowerCase()}-${s.id}"><div class="box"><div class="ph ${mode}" role="img" aria-label="${esc(label)}"><div class="scr">
<div class="bar">${button({ kind: 'icon', icon: 'arrow-left' })}<h1>Claims</h1>${button({ kind: 'outline', icon: 'sen', label: 'Add' })}</div>
<div class="body"><div class="flow">${[SCHEMES, ...s.groups].map(group).join('')}</div></div>
${tabbar(mode)}${overlay(s.overlay)}
</div></div></div><figcaption><i>${esc(s.n)}</i><b>${esc(s.name)}</b><span>${esc(s.says)}</span></figcaption></figure>`;
}

const option = (o) => `<section class="opt" id="option-${o.key.toLowerCase()}">
<span class="opt-key">${o.key}</span>
<h2>${esc(o.title)}</h2>
<p class="opt-idea">${esc(o.idea)}</p>
<p class="hint">${o.states.length} phones, at their real size. Scroll the row sideways.</p>
<div class="rail" tabindex="0" role="group" aria-label="Option ${o.key}, its states">${o.states.map((s) => phone(o, s)).join('\n')}</div>
<dl class="verdict">${o.verdict.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
</section>`;

const html = `<title>Claims, the ESS section</title>
<!-- Sen: Settings → Claims, the ESS section, two redesigns in every state (13 Nov). Built by
     docs/ui/claims-ess/design-src/build.mjs; edit the source, then rebuild. Written for the Artifact
     tool, which adds the doctype and head. Everyone and everything in it is made up. -->
<style>
${fontCss}
${read(here, 'page.css')}
${theme}
${read(here, 'phone.css')}</style>
<div class="pg">
<p class="pg-eyebrow">Sen · Settings · Claims</p>
<h1>The ESS section, redrawn two ways</h1>
<p class="pg-lede">Today the section never says what ESS is, and its rows come in five shapes. Both drawings below say what it is in one sentence, then answer the same three questions in the same order. They differ in how the answers are arranged, so pick the arrangement, not the colours.</p>
<ol class="pg-asks">
<li><span><b>Is Sen connected to ESS?</b> Signed in, or not.</span></li>
<li><span><b>What can Sen do there, and is each thing ready?</b> Fetch your payslip; submit your claims.</span></li>
<li><span><b>Which address do ESS's emails come from?</b> So Sen can tell them from the rest.</span></li>
</ol>
${OPTIONS.map(option).join('\n')}
<section class="words">
<h2>Words changed</h2>
<p>The same in both drawings. The old words appear in the decisions (D103 to D106), so they're listed for you to accept or change.</p>
<ul>${WORDS.map(([a, b]) => `<li><s>${esc(a)}</s><span>${esc(b)}</span></li>`).join('')}</ul>
</section>
<section class="pick">
<h2>Recommendation</h2>
<p>${esc(PICK)}</p>
</section>
<p class="pg-foot">Minted, at 390 by 844. The Schemes card is as it is today, dimmed, for context. The sheet and the dialog are drawn as they are now; the sheet's new drawing comes from the overlays page. The person, the schemes and the address are made up.</p>
</div>
<script>
(function () {
  // a phone is drawn at 390 by 844 and scaled down only where the page is narrower than one
  function fit() {
    document.querySelectorAll('.rail').forEach(function (r) {
      var z = Math.min(1, (r.clientWidth - 32) / 406);
      r.style.setProperty('--z', z.toFixed(4));
    });
  }
  fit();
  window.addEventListener('resize', fit);
})();
</script>
`;
const out = path.join(here, '..', 'design.html');
fs.writeFileSync(out, html);
console.log(`built design.html (${(html.length / 1024).toFixed(0)} KB), ${OPTIONS.reduce((n, o) => n + o.states.length, 0)} phones`);
