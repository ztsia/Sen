import { describe, expect, it } from 'vitest';
import { Command } from '@sen/core/commands';
import { SettingsView } from '@sen/core/views';
import { buildScenario } from '../variants';
import { applySettings } from './settings';
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
    const db = buildScenario('wei-ming', false);
    const meals = db.settings.categories.find((c) => c.name === 'Meals');
    expect(meals?.rules).toBeGreaterThan(0);
    expect(db.settings.rules.some((r) => r.hawker)).toBe(true);
    for (const c of db.settings.categories)
      expect(c.rules).toBe(db.settings.rules.filter((r) => r.category === c.name).length);
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
