import { describe, expect, it } from 'vitest';
import { Command } from '@sen/core/commands';
import { SettingsView } from '@sen/core/views';
import { buildScenario } from '../variants';
import { apply } from '../apply';
import { applySettings, settingsView } from './settings';
import type { Ctx } from './ctx';

// Settings' made-up data parses with the shared schema, and setting.set changes the path it names.

const ctx: Ctx = { offline: false, later: () => undefined };

const set = (db: ReturnType<typeof buildScenario>, key: string, value: unknown) =>
  applySettings(db, Command.parse({ type: 'setting.set', key, value }) as never, ctx);

describe('settings seed', () => {
  it('parses with SettingsView', () => {
    const db = buildScenario('wei-ming', false);
    const view = { ...db.settings, switches: {}, sen: {} };
    expect(() => SettingsView.omit({ switches: true, sen: true }).parse(view)).not.toThrow();
  });

  it('keeps the made-up bank names, the last working day payday and the QR', () => {
    const db = buildScenario('wei-ming', false);
    expect(db.settings.you).toEqual({
      bankNames: ['TAN WEI MING', 'WEI MING TAN'],
      payday: { kind: 'last-working' },
      qr: true,
    });
  });

  it('counts each category’s rules, and includes one hawker', () => {
    const v = settingsView(buildScenario('wei-ming', false));
    const meals = v.categories.find((c) => c.name === 'Meals');
    expect(meals?.rules).toBeGreaterThan(0);
    expect(v.rules.some((r) => r.hawker)).toBe(true);
    for (const c of v.categories) expect(c.rules).toBe(v.rules.filter((r) => r.category === c.name).length);
  });

  it('lists a rule the moment an answer makes it, and counts it under its category', () => {
    const db = buildScenario('wei-ming', false);
    const before = settingsView(db);
    const t = db.txns.find(
      (x) => x.status === 'needs_attention' && x.merchantKey && !db.rules.some((r) => r.merchantKey === x.merchantKey),
    )!;
    const meals = db.categories.find((c) => c.name === 'Meals')!;
    apply(db, Command.parse({ type: 'txn.category', id: t.id, categoryId: meals.id, scope: 'once' }) as never);
    const after = settingsView(db);
    expect(after.rules.map((r) => r.merchant)).toContain(t.merchantKey);
    expect(after.rules.find((r) => r.merchant === t.merchantKey)).toMatchObject({ category: 'Meals', setBy: 'user' });
    expect(after.categories.find((c) => c.name === 'Meals')!.rules).toBe(
      before.categories.find((c) => c.name === 'Meals')!.rules + 1,
    );
  });

  it('keeps a hawker switch on a rule an answer made', () => {
    const db = buildScenario('wei-ming', false);
    const t = db.txns.find((x) => x.status === 'needs_attention' && x.merchantKey)!;
    const meals = db.categories.find((c) => c.name === 'Meals')!;
    apply(db, Command.parse({ type: 'txn.category', id: t.id, categoryId: meals.id, scope: 'once' }) as never);
    const id = db.rules.find((r) => r.merchantKey === t.merchantKey)!.id;
    set(db, `rules.${id}.hawker`, true);
    expect(settingsView(db).rules.find((r) => r.id === id)?.hawker).toBe(true);
  });

  it('shows the Gmail code and the backup from yesterday at 3 am', () => {
    const db = buildScenario('wei-ming', false);
    expect(db.settings.receiptsByEmail).toMatchObject({ address: 'weiming.7f3k@in.sen-my.app', code: '428913' });
    expect(db.settings.data.lastBackup).toBe('2026-10-17T03:00:00+08:00');
  });
});

describe('setting.set', () => {
  it('sets the payday, and rejects a day that is not in the month', () => {
    const db = buildScenario('wei-ming', false);
    set(db, 'you.payday', { kind: 'day', day: 25 });
    expect(db.settings.you.payday).toEqual({ kind: 'day', day: 25 });
    expect(() => set(db, 'you.payday', { kind: 'day', day: 32 })).toThrow();
  });

  it('splits bank names by line and drops blanks', () => {
    const db = buildScenario('wei-ming', false);
    set(db, 'you.bankNames', 'TAN WEI MING\n\n  WEI MING TAN  \n');
    expect(db.settings.you.bankNames).toEqual(['TAN WEI MING', 'WEI MING TAN']);
  });

  it('toggles a rule’s hawker flag by its id', () => {
    const db = buildScenario('wei-ming', false);
    const rule = db.settings.rules.find((r) => !r.hawker)!;
    set(db, `rules.${rule.id}.hawker`, true);
    expect(db.settings.rules.find((r) => r.id === rule.id)?.hawker).toBe(true);
  });

  it('turns the QR and the calendar on and off', () => {
    const db = buildScenario('wei-ming', false);
    set(db, 'you.qr', false);
    set(db, 'sen.calendar', true);
    expect(db.settings.you.qr).toBe(false);
    expect(db.settings.calendar).toBe(true);
  });

  it('refuses a key it does not know', () => {
    const db = buildScenario('wei-ming', false);
    expect(() => set(db, 'nope.nothing', true)).toThrow('Unknown setting');
  });
});

describe('bounds and ESS (QA B04 run 2, 15 and 20)', () => {
  it('takes a small record of plain values, and refuses a large or nested one', () => {
    const ok = Command.safeParse({ type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 25 } });
    expect(ok.success).toBe(true);
    const huge = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'x']));
    expect(Command.safeParse({ type: 'setting.set', key: 'x', value: huge }).success).toBe(false);
    expect(Command.safeParse({ type: 'setting.set', key: 'x', value: { a: { b: 1 } } }).success).toBe(false);
  });

  it("bounds Sen's answers and ids", () => {
    const long = 'x'.repeat(201);
    expect(Command.safeParse({ type: 'sen.answer', askId: 'ask:gap', answer: long }).success).toBe(false);
    expect(Command.safeParse({ type: 'memory.forget', id: 'x'.repeat(65) }).success).toBe(false);
    expect(Command.safeParse({ type: 'research.confirm', messageId: 'x'.repeat(65) }).success).toBe(false);
    expect(Command.safeParse({ type: 'proposal.answer', id: 'x'.repeat(65), answer: 'apply' }).success).toBe(false);
  });

  it('signs in to ESS and imports a recipe by key', () => {
    const db = buildScenario('wei-ming', false);
    set(db, 'claims.ess.signedIn', false);
    expect(db.settings.claims.ess.signedIn).toBe(false);
    set(db, 'claims.ess.signedIn', true);
    expect(db.settings.claims.ess.signedIn).toBe(true);
    const todo = db.settings.claims.ess.capabilities.find((c) => !c.recorded);
    if (todo) {
      set(db, 'claims.ess.recipe', todo.name);
      expect(todo.recorded).toBe(true);
    }
    expect(() => set(db, 'claims.ess.recipe', 'No such step')).toThrow();
  });
});
