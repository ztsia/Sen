// Writes apps/shell/data/keep-running.json: each phone brand's steps to keep Sen running, from
// dontkillmyapp.com's API (spec §6.2, D86), as plain text the shell shows in Settings → Capture.
// Run when the shell is built (CI), and commit the result, so an offline build still has it.
// dontkillmyapp asks for credit when its API is used: the screen names it, and THIRD_PARTY_NOTICES.md.
//
//   node apps/shell/scripts/keep-running.mjs           fetch and write
//   node apps/shell/scripts/keep-running.mjs --check   exit 1 if the API's text differs from the file
import fs from 'node:fs';

const OUT = new URL('../data/keep-running.json', import.meta.url);
const API = 'https://dontkillmyapp.com/api/v2/';
// The brands spec §6.2 names, plus a few common in Malaysia. Only Xiaomi is tested on a phone.
const VENDORS = [
  'xiaomi',
  'samsung',
  'oppo',
  'realme',
  'oneplus',
  'vivo',
  'huawei',
  'honor',
  'motorola',
  'asus',
  'nokia',
  'sony',
  'google',
  'tecno',
];

// Settings pages a step can open directly. Hand-kept, and only what's tested: every step also falls
// back to the app's own info page, which every brand has.
const OPENS = {
  xiaomi: [
    {
      label: 'Autostart',
      component: 'com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity',
    },
    {
      label: 'Battery saver',
      component: 'com.miui.powerkeeper/com.miui.powerkeeper.ui.HiddenAppsConfigActivity',
      extras: { package_name: '{package}', package_label: '{label}' },
    },
  ],
};

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  ndash: '–',
  mdash: '—',
};
const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#')
      return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
const text = (html) =>
  decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim();

/** The HTML as sections: a heading and its paragraphs and list items, images dropped. */
export function sections(html) {
  const out = [];
  let cur = { heading: '', steps: [] };
  const re = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>|<(p|li)[^>]*>([\s\S]*?)<\/\2>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) {
      if (cur.heading || cur.steps.length) out.push(cur);
      cur = { heading: text(m[1]), steps: [] };
    } else {
      const t = text(m[3]);
      if (t && !/^\s*$/.test(t)) cur.steps.push(t);
    }
  }
  if (cur.heading || cur.steps.length) out.push(cur);
  return out.filter((s) => s.steps.length);
}

async function fetchAll() {
  const brands = [];
  for (const v of VENDORS) {
    const res = await fetch(API + v + '.json');
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`${v}: HTTP ${res.status}`);
    const j = await res.json();
    brands.push({
      id: v,
      name: j.name,
      manufacturers: (j.manufacturer ?? [v]).map((m) => String(m).toLowerCase()),
      sections: sections(j.user_solution ?? ''),
      opens: OPENS[v] ?? [],
      url: 'https://dontkillmyapp.com' + (j.url ?? '/' + v),
    });
  }
  return { source: 'https://dontkillmyapp.com (API v2), with credit', tested: ['xiaomi'], brands };
}

const data = await fetchAll();
const json = JSON.stringify(data, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (now !== json) {
    console.error('keep-running.json is out of date: run node apps/shell/scripts/keep-running.mjs');
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, json);
  console.log(`keep-running.json: ${data.brands.length} brands`);
}
