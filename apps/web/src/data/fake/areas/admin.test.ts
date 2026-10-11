import { describe, expect, it } from 'vitest';
import { SettingsView } from '@sen/core/views';
import { rm } from '../scenario';
import { buildScenario } from '../variants';
import { applyMembers } from './admin';
import { settingsView } from './settings';

const ctx = { offline: false, later: () => undefined };
const run = (db: ReturnType<typeof buildScenario>, cmd: Parameters<typeof applyMembers>[1]) =>
  applyMembers(db, cmd, ctx);
const hui = (db: ReturnType<typeof buildScenario>) => db.settings.members.find((m) => m.name === 'Hui Min')!;

describe('Settings admin area', () => {
  it('seeds a view that parses, with made-up schemes and ESS half set up', () => {
    const db = buildScenario('wei-ming', false);
    const v = SettingsView.parse(settingsView(db));
    expect(v.claims.schemes.map((s) => s.name)).toEqual(['Phone bill', 'Parking']);
    expect(v.claims.ess.capabilities).toEqual([
      { name: 'Fetch payslip', recorded: true },
      { name: 'Submit claims', recorded: false },
    ]);
    expect(v.claims.ess.lastPayslip).toBe('2026-09-30');
    expect(v.seats).toEqual({ used: 2, of: 20 });
  });

  it('invites a browser friend without capture, and a duplicate is a no-op', () => {
    const db = buildScenario('wei-ming', false);
    run(db, { type: 'member.invite', email: ' New@Example.com ', shell: false });
    const m = db.settings.members.find((x) => x.email === 'new@example.com')!;
    expect(m.status).toBe('invited');
    expect(m.switches.capture).toBe(false);
    expect(db.settings.seats.used).toBe(2);
    const n = db.settings.members.length;
    run(db, { type: 'member.invite', email: 'new@example.com', shell: true });
    expect(db.settings.members).toHaveLength(n);
  });

  it('refuses a bad email and a full house', () => {
    const db = buildScenario('wei-ming', false);
    expect(() => run(db, { type: 'member.invite', email: 'nope', shell: false })).toThrow();
    for (let i = 0; i < 18; i++) run(db, { type: 'member.invite', email: `p${i}@example.com`, shell: true });
    expect(db.settings.seats.used).toBe(20);
    expect(() => run(db, { type: 'member.invite', email: 'late@example.com', shell: true })).toThrow(/seats/);
  });

  it('turning the shell off takes capture and the seat with it', () => {
    const db = buildScenario('wei-ming', false);
    const id = hui(db).id;
    run(db, { type: 'member.set', id, key: 'shell', value: false });
    expect(hui(db).switches.capture).toBe(false);
    expect(hui(db).captureConnected).toBe(false);
    expect(db.settings.seats.used).toBe(1);
    expect(() => run(db, { type: 'member.set', id, key: 'capture', value: true })).toThrow();
  });

  it('grants and refunds credit in sen, never below nothing', () => {
    const db = buildScenario('wei-ming', false);
    const id = hui(db).id;
    run(db, { type: 'member.set', id, key: 'grant', value: rm('2.10') });
    expect(hui(db).balance).toBe(rm('5.50'));
    run(db, { type: 'member.set', id, key: 'grant', value: -rm('5.50') });
    expect(hui(db).balance).toBe(0);
    expect(() => run(db, { type: 'member.set', id, key: 'grant', value: -1 })).toThrow();
  });

  it('suspends and removes others, never the admin', () => {
    const db = buildScenario('wei-ming', false);
    const admin = db.settings.members.find((m) => m.email === db.settings.email)!;
    expect(() => run(db, { type: 'member.remove', id: admin.id })).toThrow();
    expect(() => run(db, { type: 'member.set', id: admin.id, key: 'status', value: 'suspended' })).toThrow();
    run(db, { type: 'member.set', id: hui(db).id, key: 'status', value: 'suspended' });
    expect(hui(db).status).toBe('suspended');
    run(db, { type: 'member.remove', id: hui(db).id });
    expect(db.settings.members.some((m) => m.name === 'Hui Min')).toBe(false);
    expect(db.settings.seats.used).toBe(1);
  });

  it('leaves other commands alone', () => {
    const db = buildScenario('wei-ming', false);
    expect(run(db, { type: 'memory.forget', id: 'x' })).toBeNull();
  });
});
