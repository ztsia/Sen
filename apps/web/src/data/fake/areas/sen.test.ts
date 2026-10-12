import { describe, expect, it } from 'vitest';
import { Command } from '@sen/core/commands';
import { MemoryView, ResearchView, SenView, UsageView } from '@sen/core/views';
import { buildScenario } from '../variants';
import type { Db } from '../db';
import type { Ctx } from './ctx';
import { applySen, memoryView, researchView, senView, usageView } from './sen';

// Sen's made-up conversation parses with the shared schemas, and its commands do what the chat shows.

/** A ctx that keeps what Sen would do later, so a test can run it at once. */
function ctxFor(db: Db, offline = false) {
  const queue: ((d: Db) => void)[] = [];
  const ctx: Ctx = { offline, later: (_ms, fn) => void queue.push(fn) };
  return { ctx, flush: () => queue.splice(0).forEach((fn) => fn(db)), queue };
}
const run = (db: Db, ctx: Ctx, cmd: unknown) => applySen(db, Command.parse(cmd) as never, ctx);
const send = (id: string, text = 'How is my week?') => ({
  type: 'sen.send',
  id,
  text,
  file: null,
  from: 'Home',
});

describe('the seeded conversation', () => {
  const db = buildScenario('wei-ming', false);

  it('parses with SenView, MemoryView, ResearchView and UsageView', () => {
    for (const from of ['Home', 'Review', 'Insights', 'More', 'Scan', 'Unknown'])
      expect(() => SenView.parse(senView(db, from, false))).not.toThrow();
    expect(() => MemoryView.parse(memoryView(db))).not.toThrow();
    expect(() => ResearchView.parse(researchView(db))).not.toThrow();
    expect(() => UsageView.parse(usageView(db))).not.toThrow();
  });

  it('has every part type once, with a check-in first', () => {
    const parts = db.sen.messages.flatMap((m) => m.parts);
    for (const type of ['text', 'file', 'proposal', 'research', 'ask', 'open'])
      expect(parts.map((p) => p.type)).toContain(type);
    expect(db.sen.messages[0]!.checkin).toBe(true);
    const marks = parts.flatMap((p) => (p.type === 'text' ? p.runs.map((r) => r.mark) : []));
    expect(marks).toContain('unchecked');
    expect(marks).toContain('file');
  });

  it('puts the recommended option first, and numbers every finding to a source', () => {
    const ask = db.sen.messages.flatMap((m) => m.parts).find((p) => p.type === 'ask');
    expect(ask?.type === 'ask' && ask.options[0]!.recommended).toBe(true);
    const r = db.sen.messages.flatMap((m) => m.parts).find((p) => p.type === 'research');
    if (r?.type !== 'research') throw new Error('no research part');
    for (const f of r.findings) expect(r.sources.some((s) => s.n === f.source)).toBe(true);
    expect(r.confirmed).toBe(false);
  });

  it('suggests questions that fit the screen it was opened from', () => {
    expect(senView(db, 'Review', false).suggestions).not.toEqual(senView(db, 'Insights', false).suggestions);
  });

  it('says offline or paused instead of ready', () => {
    expect(senView(db, 'Home', true).state).toBe('offline');
    const cap = buildScenario('cap', false);
    expect(senView(cap, 'Home', false)).toMatchObject({ state: 'paused', pausedUntil: '2026-11-01' });
  });
});

describe('sen.send', () => {
  it('reads a copy of the messages, so a change in place reaches the screen', () => {
    const db = buildScenario('wei-ming', false);
    expect(senView(db, 'Home', false).messages).not.toBe(db.sen.messages);
  });

  it('adds your message at once, then streams the reply, then finishes it', () => {
    const db = buildScenario('wei-ming', false);
    const { ctx, flush, queue } = ctxFor(db);
    const n = db.sen.messages.length;
    run(db, ctx, send('u1'));
    expect(db.sen.messages).toHaveLength(n + 1);
    expect(queue).toHaveLength(2);
    queue[0]!(db);
    expect(db.sen.messages.at(-1)).toMatchObject({ id: 'u1:reply', role: 'sen', streaming: true });
    flush();
    const done = db.sen.messages.filter((m) => m.id === 'u1:reply');
    expect(done).toHaveLength(1);
    expect(done[0]!.streaming).toBe(false);
  });

  it('is a no-op when the same id arrives twice (§12.5)', () => {
    const db = buildScenario('wei-ming', false);
    const { ctx, flush } = ctxFor(db);
    run(db, ctx, send('u1'));
    run(db, ctx, send('u1'));
    flush();
    expect(db.sen.messages.filter((m) => m.id === 'u1')).toHaveLength(1);
  });

  it('keeps a file you sent with its message', () => {
    const db = buildScenario('wei-ming', false);
    const { ctx } = ctxFor(db);
    run(db, ctx, { ...send('u2', ''), file: { name: 'bill.pdf', kind: 'pdf' } });
    expect(db.sen.messages.at(-1)!.parts[0]).toMatchObject({ type: 'file', name: 'bill.pdf' });
  });

  it('refuses offline and when paused, and sends no reply to an undone message', () => {
    const db = buildScenario('wei-ming', false);
    expect(() => run(db, ctxFor(db, true).ctx, send('u3'))).toThrow('connection');
    const cap = buildScenario('cap', false);
    expect(() => run(cap, ctxFor(cap).ctx, send('u4'))).toThrow('paused');
    const { ctx, flush } = ctxFor(db);
    run(db, ctx, send('u5'));
    db.sen.messages = db.sen.messages.filter((m) => m.id !== 'u5');
    flush();
    expect(db.sen.messages.some((m) => m.id === 'u5:reply')).toBe(false);
  });
});

describe('answers', () => {
  it('records the option tapped on an ask_user', () => {
    const db = buildScenario('wei-ming', false);
    run(db, ctxFor(db).ctx, { type: 'sen.answer', askId: 'ask:gap', answer: 'Yes, I did' });
    const ask = db.sen.messages.flatMap((m) => m.parts).find((p) => p.type === 'ask');
    expect(ask?.type === 'ask' && ask.answer).toBe('Yes, I did');
  });

  it('the gap carries the day it is about, for manual to start on', () => {
    const db = buildScenario('wei-ming', false);
    const gap = db.sen.messages.find((m) => m.parts.some((p) => p.type === 'ask' && p.id === 'ask:gap'))!;
    const open = gap.parts.find((p) => p.type === 'open');
    expect(open).toMatchObject({ screen: 'manual', id: '2026-10-04' });
  });

  it('answers the proposal in the chat and in Review together', () => {
    for (const answer of ['apply', 'dismiss'] as const) {
      const db = buildScenario('wei-ming', false);
      expect(db.review.some((r) => r.id === 'r:zus')).toBe(true);
      const r = run(db, ctxFor(db).ctx, { type: 'proposal.answer', id: 'r:zus', answer });
      expect(r!.said).toBe(answer === 'apply' ? 'Applied. 14 past payments stay as they are' : 'Dismissed');
      expect(db.review.some((x) => x.id === 'r:zus')).toBe(false);
      const p = db.sen.messages.flatMap((m) => m.parts).find((x) => x.type === 'proposal');
      expect(p?.type === 'proposal' && p.status).toBe(answer === 'apply' ? 'applied' : 'dismissed');
    }
  });

  it('confirms a research draft, which the briefs list then shows', () => {
    const db = buildScenario('wei-ming', false);
    const before = researchView(db).briefs.find((b) => b.id === 'm:r1');
    expect(before?.confirmed).toBe(false);
    run(db, ctxFor(db).ctx, { type: 'research.confirm', messageId: 'm:r1' });
    expect(researchView(db).briefs.find((b) => b.id === 'm:r1')?.confirmed).toBe(true);
  });

  it('forgets a note', () => {
    const db = buildScenario('wei-ming', false);
    const n = memoryView(db).notes.length;
    run(db, ctxFor(db).ctx, { type: 'memory.forget', id: 'mem:1' });
    expect(memoryView(db).notes).toHaveLength(n - 1);
  });
});

describe('usage', () => {
  it("shows the owner tokens with a labelled estimate, and a friend's credit", () => {
    const db = buildScenario('wei-ming', false);
    expect(usageView(db)).toMatchObject({ owner: true, unlimited: true });
    expect(usageView(db).estimate).toBeGreaterThan(0);
    db.settings.admin = false;
    const friend = usageView(db);
    expect(friend).toMatchObject({ owner: false, estimate: null });
    expect(friend.allowanceLeft).toBeLessThanOrEqual(friend.allowance);
    // what the allowance has paid for adds up to what's gone from it
    expect(friend.byUse.reduce((a, x) => a + x.sen, 0)).toBe(friend.allowance - friend.allowanceLeft);
  });

  it('shows nothing left at the cap', () => {
    const db = buildScenario('cap', false);
    db.settings.admin = false;
    expect(usageView(db)).toMatchObject({ balance: 0, allowanceLeft: 0, pausedUntil: '2026-11-01' });
  });
});
