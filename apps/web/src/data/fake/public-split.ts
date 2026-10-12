import { apportion, parseSen } from '@sen/core/money';
import type { PublicSplitView } from '@sen/core/views';
import { uid } from './ids';

// The fake for `split-public` (D47, D64, D71): a friend's browser, no login. It holds its own state,
// keyed by the link's token, and imports nothing from the person's `Db` or the app's backend, so no
// code path can ever show the app's data on this page. B18 serves the same view from its own route.
// Money is integer sen throughout.

const rm = (text: string): number => {
  const r = parseSen(text);
  if (!r.ok) throw new Error(`Not an amount: ${text}`);
  return r.sen;
};

interface Member {
  name: string;
  done: boolean;
}
interface Item {
  id: string;
  description: string;
  price: number;
  takers: string[];
}
interface PublicSplit {
  closed: boolean;
  locked: boolean;
  merchant: string;
  at: string;
  payer: string;
  /** The payer's DuitNow QR is set. */
  qr: boolean;
  /** Who this browser remembers (the random token Sen keeps in it, D64). */
  you: string | null;
  members: Member[];
  items: Item[];
}

/** The bill the demo links share: KEDAI MEE ABC, RM64.13 (flows.md `split-mine`). */
function bill(token: string): PublicSplit {
  const item = (id: string, description: string, price: string, takers: string[]): Item => ({
    id: uid(`public-split:${token}:${id}`),
    description,
    price: rm(price),
    takers,
  });
  const base = {
    closed: false,
    locked: false,
    merchant: 'KEDAI MEE ABC',
    at: '2026-10-17T20:05:00+08:00',
    payer: 'Wei Ming',
    qr: true,
    you: null as string | null,
  };
  const everyone = ['Wei Ming', 'Ali'];
  const items = (mei: { kt: boolean; shared: boolean }): Item[] => [
    item('mee-goreng', 'Mee goreng', '11.65', ['Wei Ming']),
    item('mee-hoon', 'Mee hoon sup', '11.00', ['Ali']),
    item('kuey-teow', 'Kuey teow goreng', '12.48', mei.kt ? ['Mei'] : []),
    item('ayam', 'Ayam goreng (to share)', '20.99', mei.shared ? [...everyone, 'Mei'] : everyone),
    item('teh-ais', 'Teh ais (3)', '8.01', mei.shared ? [...everyone, 'Mei'] : everyone),
  ];
  const wmAli = [
    { name: 'Wei Ming', done: true },
    { name: 'Ali', done: true },
  ];
  switch (token) {
    case 'demo-new':
      return { ...base, members: wmAli, items: items({ kt: false, shared: false }) };
    case 'demo':
      return {
        ...base,
        you: 'Mei',
        members: [...wmAli, { name: 'Mei', done: false }],
        items: items({ kt: true, shared: false }),
      };
    case 'demo-final':
      return {
        ...base,
        you: 'Mei',
        locked: true,
        members: [...wmAli, { name: 'Mei', done: true }],
        items: items({ kt: true, shared: true }),
      };
    default:
      // demo-closed, and any link Sen doesn't know: nothing to show
      return { ...base, closed: true, you: null, members: [], items: [] };
  }
}

const store = new Map<string, PublicSplit>();
const stateOf = (token: string): PublicSplit => {
  let s = store.get(token);
  if (!s) {
    s = bill(token);
    store.set(token, s);
  }
  return s;
};

/** Tests only: forget every change. */
export const resetPublicSplits = () => store.clear();

/** Each person's share: the sum of their items, a shared one divided by largest remainder (D71). */
function sharesOf(s: PublicSplit): Map<string, number> {
  const out = new Map(s.members.map((m) => [m.name, 0]));
  for (const item of s.items) {
    const who = s.members.filter((m) => item.takers.includes(m.name)).map((m) => m.name);
    if (!who.length) continue;
    apportion(
      item.price,
      who.map(() => 1),
    ).forEach((part, i) => out.set(who[i]!, (out.get(who[i]!) ?? 0) + part));
  }
  return out;
}

export function readPublicSplit(token: string): PublicSplitView {
  const s = stateOf(token);
  if (s.closed)
    return {
      merchant: '',
      total: 0,
      at: s.at,
      // a closed link shows nothing of the bill, not even who paid (screens.md)
      payer: '',
      state: 'closed',
      you: null,
      people: [],
      items: [],
      yourShare: 0,
      youDone: false,
      pay: null,
    };
  const shares = sharesOf(s);
  const me = s.you;
  const yourShare = me ? (shares.get(me) ?? 0) : 0;
  return {
    merchant: s.merchant,
    total: s.items.reduce((a, i) => a + i.price, 0),
    at: s.at,
    payer: s.payer,
    state: s.locked ? 'final' : 'changing',
    you: me,
    people: s.members.map((m) => ({ name: m.name, done: m.done })),
    items: s.items.map((item) => {
      const who = s.members.filter((m) => item.takers.includes(m.name)).map((m) => m.name);
      const mine = !!me && who.includes(me);
      const parts = who.length
        ? apportion(
            item.price,
            who.map(() => 1),
          )
        : [];
      return {
        id: item.id,
        description: item.description,
        price: item.price,
        takers: who,
        mine,
        myPart: mine ? (parts[who.indexOf(me!)] ?? null) : null,
      };
    }),
    yourShare,
    youDone: !!me && !!s.members.find((m) => m.name === me)?.done,
    // the payer's QR and the amount appear only once it's final (D71)
    pay: s.locked && me ? { sen: yourShare, qr: s.qr } : null,
  };
}

function lockIfReady(s: PublicSplit) {
  if (s.locked) return;
  if (s.members.every((m) => m.done) && s.items.every((i) => i.takers.length)) s.locked = true;
}

/** The first time, a friend types a name; Sen then remembers this browser (D64). */
export function setPublicName(token: string, name: string): void {
  const s = stateOf(token);
  const n = name.trim().replace(/\s+/g, ' ');
  if (s.closed) throw new Error('This split is closed.');
  if (!n) throw new Error('Type your first name.');
  if (n.length > 40) throw new Error('That name is too long.');
  if (s.members.some((m) => m.name.toLowerCase() === n.toLowerCase()))
    throw new Error(`Someone here is already called ${n}. Add your initial, like ${n} T.`);
  if (s.locked) throw new Error(`It's locked. To join in, ask ${s.payer}.`);
  s.members.push({ name: n, done: false });
  s.you = n;
}

export function tickPublic(token: string, itemId: string, on: boolean): void {
  const s = stateOf(token);
  const me = s.members.find((m) => m.name === s.you);
  const item = s.items.find((i) => i.id === itemId);
  if (s.closed || !me || !item) throw new Error('Type your name first.');
  // after the lock only the payer changes a tick (D71)
  if (s.locked) throw new Error(`To change a tick, ask ${s.payer}.`);
  item.takers = item.takers.filter((n) => n !== me.name);
  if (on) item.takers.push(me.name);
  // ticking again undoes your Done
  me.done = false;
}

export function donePublic(token: string, done: boolean): void {
  const s = stateOf(token);
  const me = s.members.find((m) => m.name === s.you);
  if (s.closed || !me) throw new Error('Type your name first.');
  if (s.locked) throw new Error(`To change a tick, ask ${s.payer}.`);
  me.done = done;
  if (done) lockIfReady(s);
}
