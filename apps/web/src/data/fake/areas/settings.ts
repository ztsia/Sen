import type { SettingsView } from '@sen/core/views';
import type { Db } from '../db';
import type { AreaApply } from './ctx';
import { seedAdmin } from './admin';

// Settings (B04): every section of screens.md's table on made-up data, and the setting.set command.
// What each section shows follows the person's switches (D52). Members, claims' schemes and ESS, and
// Sen's section are seeded by admin.ts, with the member.* commands.

export type SettingsState = Omit<SettingsView, 'switches' | 'sen'> & { calendar: boolean };

/** Settings before anything is set: the shape every scenario starts from. */
export function blankSettings(): SettingsState {
  return {
    email: 'weiming@example.com',
    admin: true,
    you: { bankNames: [], payday: { kind: 'last-working' }, qr: false },
    categories: [],
    rules: [],
    receiptsByEmail: { address: '', code: null, received: 0 },
    claims: { schemes: [], essSender: null, ess: { signedIn: false, capabilities: [], lastPayslip: null } },
    members: [],
    seats: { used: 0, of: 20 },
    data: { lastBackup: null, exportReady: false },
    calendar: false,
  };
}

export function seedSettings(db: Db): SettingsState {
  void db;
  // TODO(B04 settings batch): you, categories, rules, receipts by email, data
  return { ...blankSettings(), ...seedAdmin(db) };
}

export function settingsView(db: Db): SettingsView {
  const s = db.settings;
  return {
    ...s,
    switches: {
      shell: true,
      capture: db.capture,
      agent: db.agent,
      splits: true,
      email: true,
      calendar: s.calendar,
      claims: db.claims,
    },
    sen: {
      calendar: s.calendar,
      memories: db.sen.memory.length,
      credit: {
        owner: s.admin,
        unlimited: false,
        balance: 0,
        allowance: 0,
        allowanceLeft: 0,
        pausedUntil: db.aiPausedUntil,
        byUse: [],
        estimate: null,
      },
    },
  }; // TODO(B04 settings batch)
}

export const applySettings: AreaApply = (db, cmd) => {
  void db;
  switch (cmd.type) {
    case 'setting.set':
      return { said: 'Saved', touched: [] }; // TODO(B04 settings batch)
    default:
      return null;
  }
};
