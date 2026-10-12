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

const invite = (email: string, shell: boolean) =>
  ({
    type: 'member.invite',
    email,
    shell,
    switches: { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false },
    welcome: 500,
    allowance: 200,
    unlimited: false,
  }) as const;

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
    run(db, invite(' New@Example.com ', false));
    const m = db.settings.members.find((x) => x.email === 'new@example.com')!;
    expect(m.status).toBe('invited');
    expect(m.switches.capture).toBe(false);
    expect(db.settings.seats.used).toBe(2);
    const n = db.settings.members.length;
    run(db, invite('new@example.com', true));
    expect(db.settings.members).toHaveLength(n);
  });

  it('refuses a bad email and a full house', () => {
    const db = buildScenario('wei-ming', false);
    expect(() => run(db, invite('nope', false))).toThrow();
    for (let i = 0; i < 18; i++) run(db, invite(`p${i}@example.com`, true));
    expect(db.settings.seats.used).toBe(20);
    expect(() => run(db, invite('late@example.com', true))).toThrow(/seats/);
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
    // grants can't pile up past what Sen can hold (QA B04 run 1, finding 11)
    run(db, { type: 'member.set', id, key: 'grant', value: 9_000_000_000_000 });
    expect(() => run(db, { type: 'member.set', id, key: 'grant', value: 9_000_000_000_000 })).toThrow(/more credit/);
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

  it('invites with Unlimited, and rejects emails with double dots or hyphen-edged labels', () => {
    const db = buildScenario('wei-ming', false);
    run(db, { ...invite('free@example.com', false), unlimited: true });
    expect(db.settings.members.find((m) => m.email === 'free@example.com')!.unlimited).toBe(true);
    for (const bad of ['a..b@x.co', 'a@-b.co', 'a@b-.co', `${'a'.repeat(250)}@x.co`])
      expect(() => run(db, invite(bad, false)), bad).toThrow();
    run(db, invite('a.b-c@x-y.co', false));
  });

  it('resends and revokes an invitation, only an invited one, only for the admin', () => {
    const db = buildScenario('wei-ming', false);
    const farid = db.settings.members.find((m) => m.name === 'Farid')!;
    expect(run(db, { type: 'member.resend', id: farid.id })!.said).toBe('Invitation sent again');
    expect(() => run(db, { type: 'member.resend', id: hui(db).id })).toThrow();
    expect(() => run(db, { type: 'member.revoke', id: hui(db).id })).toThrow();
    run(db, { type: 'member.revoke', id: farid.id });
    expect(db.settings.members.some((m) => m.name === 'Farid')).toBe(false);
    db.settings.admin = false;
    expect(() => run(db, { type: 'member.resend', id: hui(db).id })).toThrow(/admin/);
    expect(() => run(db, { type: 'member.revoke', id: hui(db).id })).toThrow(/admin/);
  });

  it('remove can offer the export first', () => {
    const db = buildScenario('wei-ming', false);
    const r = run(db, { type: 'member.remove', id: hui(db).id, exportFirst: true });
    expect(r!.said).toMatch(/export goes to huimin@example.com/);
  });

  it('leaves other commands alone', () => {
    const db = buildScenario('wei-ming', false);
    expect(run(db, { type: 'memory.forget', id: 'x' })).toBeNull();
  });
});
