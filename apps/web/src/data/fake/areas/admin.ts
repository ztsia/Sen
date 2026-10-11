import type { Db } from '../db';
import type { AreaApply } from './ctx';
import type { SettingsState } from './settings';

// Settings' admin and feature sections (B04): Claims (schemes, the ESS sender, ESS), Sen (Calendar,
// credit) and Members (D52, D98), seeded here, and the member.* commands. Made-up schemes only: real
// claim values never enter the repo (CLAUDE.md).

export function seedAdmin(db: Db): Pick<SettingsState, 'claims' | 'members' | 'seats' | 'calendar'> {
  void db;
  return {
    claims: { schemes: [], essSender: null, ess: { signedIn: false, capabilities: [], lastPayslip: null } },
    members: [],
    seats: { used: 0, of: 20 },
    calendar: false,
  }; // TODO(B04 settings-admin batch)
}

export const applyMembers: AreaApply = (db, cmd) => {
  void db;
  switch (cmd.type) {
    case 'member.invite':
    case 'member.set':
    case 'member.remove':
      return { said: 'Saved', touched: [] }; // TODO(B04 settings-admin batch)
    default:
      return null;
  }
};
