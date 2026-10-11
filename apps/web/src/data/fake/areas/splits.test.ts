import { describe, expect, it } from 'vitest';
import { PublicSplitView, SharedView, SplitView } from '@sen/core/views';
import { Receipt, ReceiptItem, SplitMember } from '@sen/core/schema';
import type { Db } from '../db';
import { uid } from '../ids';
import { readPublicSplit, resetPublicSplits, setPublicName, tickPublic, donePublic } from '../public-split';
import { rm } from '../scenario';
import { buildScenario, SCENARIOS } from '../variants';
import { applyArea } from './index';
import { sharedView, splitView } from './splits';
import type { Cmd } from './ctx';

// The shared bills' made-up data and rules: shares are sums of items, a shared item divides by largest
// remainder, and a split locks when everyone is done and every item is claimed (spec §7, D71).

const ctx = { offline: false, later: () => {} };
const run = (db: Db, cmd: Cmd | { type: 'split.paid'; splitId: string; memberId: string; paid: boolean }) =>
  applyArea(db, cmd as Cmd, ctx);
const view = (db: Db, key: string) => splitView(db, uid(`split:${key}`))!;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const idOf = (key: string, who: string) => uid(`member:${key}:${who}`);
const itemId = (key: string, i: number) => uid(`item:${key}:${i}`);

describe('the made-up splits', () => {
  for (const id of SCENARIOS)
    it(`parse with the shared schemas in ${id}`, () => {
      const db = buildScenario(id, false);
      SharedView.parse(sharedView(db));
      for (const s of db.splits) SplitView.parse(splitView(db, s.id));
      for (const r of db.receipts) Receipt.parse(r);
      for (const i of db.items) ReceiptItem.parse(i);
      for (const m of db.members) SplitMember.parse(m);
    });

  const db = buildScenario('wei-ming', false);

  it('adds up: every split’s shares are its total, to the sen', () => {
    for (const key of ['bbq', 'haidilao', 'nk']) {
      const v = view(db, key);
      expect(
        sum(v.people.map((p) => p.share)) +
          (key === 'nk' ? v.items.filter((i) => !i.takers.length).reduce((a, i) => a + i.price, 0) : 0),
      ).toBe(v.total);
    }
  });

  it('BBQ PLACE is final, with RM48.80 each and the platter shared ÷3', () => {
    const v = view(db, 'bbq');
    expect(v.state).toBe('final');
    expect(v.people.map((p) => p.share)).toEqual([rm('48.80'), rm('48.80'), rm('48.80')]);
    const platter = v.items.find((i) => i.description.startsWith('BBQ platter'))!;
    expect(platter.takers).toHaveLength(3);
    expect(platter.myPart).toBe(rm('18.80'));
    expect(v.mySpending).toBe(rm('48.80'));
    expect(v.link).toBe('open'); // Kah Hoe hasn't paid
  });

  it('HAIDILAO: Mei paid and you owe RM24.40, not yet paid', () => {
    const v = view(db, 'haidilao');
    expect(v.paidBy).toBe('other');
    expect(v.owe).toEqual({ to: 'Mei', sen: rm('24.40'), paid: false });
    expect(v.mySpending).toBe(rm('24.40'));
  });

  it('NASI KANDAR ABC is still changing with one item nobody ticked', () => {
    const v = view(db, 'nk');
    expect(v.state).toBe('changing');
    expect(v.unclaimed).toBe(1);
    expect(v.waitingOn).toEqual(['You', 'Kah Hoe']);
    expect(v.lockWithout).toBeNull();
    // RM14.00 ÷3 by largest remainder: the first two get the odd sen
    expect(v.items.find((i) => i.description.startsWith('Teh'))!.myPart).toBe(rm('4.67'));
  });

  it('lists open splits first, in words', () => {
    const rows = sharedView(db).rows;
    expect(rows.map((r) => r.merchant)).toEqual(['NASI KANDAR ABC', 'HAIDILAO', 'BBQ PLACE']);
    expect(rows.find((r) => r.merchant === 'HAIDILAO')!.line).toBe('Mei paid · you owe RM24.40');
    expect(rows.find((r) => r.merchant === 'BBQ PLACE')!.line).toBe('You paid · 1 of 2 paid you back');
  });

  it('settles a stuck split: Everyone, Done, lock without waiting, and the bill becomes your share', () => {
    const d = structuredClone(db);
    const me = idOf('nk', 'me');
    const telur = itemId('nk', 2);
    run(d, { type: 'split.assign', splitId: uid('split:nk'), itemId: telur, to: 'everyone' });
    let v = view(d, 'nk');
    expect(v.unclaimed).toBe(0);
    expect(v.state).toBe('changing');
    expect(v.lockWithout).toBe('Kah Hoe');
    run(d, { type: 'split.done', splitId: v.id, memberId: me, done: true });
    run(d, { type: 'split.lock', splitId: v.id });
    v = view(d, 'nk');
    expect(v.state).toBe('final');
    expect(sum(v.people.map((p) => p.share))).toBe(v.total);
    expect(v.mySpending).toBe(v.myShare);
    expect(d.txns.find((t) => t.id === uid('txn:nasi-kandar'))!.myShare).toBe(v.myShare);
  });

  it('locks by itself once everyone is done and every item is claimed', () => {
    const d = structuredClone(db);
    const split = uid('split:nk');
    run(d, { type: 'split.assign', splitId: split, itemId: itemId('nk', 2), to: 'Mei' });
    run(d, { type: 'split.done', splitId: split, memberId: idOf('nk', 'kahhoe'), done: true });
    expect(view(d, 'nk').state).toBe('changing');
    run(d, { type: 'split.done', splitId: split, memberId: idOf('nk', 'me'), done: true });
    const v = view(d, 'nk');
    expect(v.state).toBe('final');
    // Mei was added by the payer and counts as done; her dish is hers alone
    expect(v.people.find((p) => p.name === 'Mei')!.share).toBe(rm('6.20'));
  });

  it('refuses to lock with an item nobody has', () => {
    const d = structuredClone(db);
    expect(() => run(d, { type: 'split.lock', splitId: uid('split:nk') })).toThrow(/nobody/);
  });

  it('ticking again undoes your Done until the lock; a Done can be undone', () => {
    const d = structuredClone(db);
    const split = uid('split:nk');
    const me = idOf('nk', 'me');
    run(d, { type: 'split.done', splitId: split, memberId: me, done: true });
    expect(view(d, 'nk').meDone).toBe(true);
    run(d, { type: 'split.tick', splitId: split, itemId: itemId('nk', 2), memberId: me, on: true });
    expect(view(d, 'nk').meDone).toBe(false);
    run(d, { type: 'split.done', splitId: split, memberId: me, done: true });
    run(d, { type: 'split.done', splitId: split, memberId: me, done: false });
    expect(view(d, 'nk').meDone).toBe(false);
  });

  it('after the lock only the payer changes a tick', () => {
    const d = structuredClone(db);
    // Mei paid HAIDILAO: your tick is refused
    expect(() =>
      run(d, {
        type: 'split.tick',
        splitId: uid('split:haidilao'),
        itemId: itemId('hd', 1),
        memberId: idOf('hd', 'me'),
        on: false,
      }),
    ).toThrow(/ask Mei/);
    // you paid BBQ PLACE: you may, and the shares follow
    run(d, {
      type: 'split.tick',
      splitId: uid('split:bbq'),
      itemId: itemId('bbq', 3),
      memberId: idOf('bbq', 'kahhoe'),
      on: false,
    });
    const v = view(d, 'bbq');
    expect(v.state).toBe('final');
    expect(sum(v.people.map((p) => p.share))).toBe(v.total);
    expect(v.people.find((p) => p.name === 'Kah Hoe')!.share).toBe(rm('30.00'));
  });

  it('ticks who paid you back, and closes the link a day after the last one', () => {
    const d = structuredClone(db);
    run(d, { type: 'split.paid', splitId: uid('split:bbq'), memberId: idOf('bbq', 'kahhoe'), paid: true });
    const v = view(d, 'bbq');
    expect(v.people.find((p) => p.name === 'Kah Hoe')!.paidHow).toBe('ticked by you');
    expect(v.link).toBe('closing');
    expect(v.closesOn).toBe('2026-10-19');
    // a matched payment isn't undone by a tick
    expect(() =>
      run(d, { type: 'split.paid', splitId: uid('split:bbq'), memberId: idOf('bbq', 'ali'), paid: false }),
    ).toThrow(/matched/);
  });

  it('I’ve paid ticks what you owe', () => {
    const d = structuredClone(db);
    run(d, { type: 'split.paid-them', splitId: uid('split:haidilao') });
    expect(view(d, 'haidilao').owe!.paid).toBe(true);
    expect(sharedView(d).rows.find((r) => r.merchant === 'HAIDILAO')!.open).toBe(false);
  });

  it('only the payer settles an item', () => {
    const d = structuredClone(db);
    expect(() =>
      run(d, { type: 'split.assign', splitId: uid('split:haidilao'), itemId: itemId('hd', 1), to: 'everyone' }),
    ).toThrow(/Only Mei/);
  });
});

describe('split-public, on its own state', () => {
  it('every token’s view parses', () => {
    resetPublicSplits();
    for (const t of ['demo-new', 'demo', 'demo-final', 'demo-closed', 'nobody-knows'])
      PublicSplitView.parse(readPublicSplit(t));
  });

  it('demo-new asks for a name, then joins, ticks, and locks when everyone is done', () => {
    resetPublicSplits();
    let v = readPublicSplit('demo-new');
    expect(v.you).toBeNull();
    expect(v.state).toBe('changing');
    expect(() => tickPublic('demo-new', v.items[2]!.id, true)).toThrow(/name/);
    setPublicName('demo-new', 'Mei');
    for (const i of readPublicSplit('demo-new').items)
      if (!i.takers.length || i.description.includes('share') || i.description.startsWith('Teh'))
        tickPublic('demo-new', i.id, true);
    donePublic('demo-new', true);
    v = readPublicSplit('demo-new');
    expect(v.state).toBe('final');
    expect(v.total).toBe(rm('64.13'));
    expect(v.pay).toEqual({ sen: v.yourShare, qr: true });
  });

  it('demo-final is read-only and asks Mei to pay RM22.14', () => {
    resetPublicSplits();
    const v = readPublicSplit('demo-final');
    expect(v.state).toBe('final');
    expect(v.pay).toEqual({ sen: rm('22.14'), qr: true });
    expect(() => tickPublic('demo-final', v.items[0]!.id, true)).toThrow('To change a tick, ask Wei Ming.');
  });

  it('demo remembers Mei; her ticks are shown at once', () => {
    resetPublicSplits();
    let v = readPublicSplit('demo');
    expect(v.you).toBe('Mei');
    expect(v.yourShare).toBe(rm('12.48'));
    tickPublic('demo', v.items.find((i) => i.description.startsWith('Teh'))!.id, true);
    v = readPublicSplit('demo');
    expect(v.yourShare).toBe(rm('12.48') + rm('2.67'));
    expect(v.pay).toBeNull();
  });

  it('a closed or unknown link shows nothing', () => {
    resetPublicSplits();
    const v = readPublicSplit('demo-closed');
    expect(v).toMatchObject({ state: 'closed', items: [], people: [], pay: null, you: null });
  });
});
