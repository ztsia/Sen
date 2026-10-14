import type { SettingsView } from '@sen/core/views';
import type { Db } from '../db';
import type { AreaApply } from './ctx';
import { uid } from '../ids';
import { seedAdmin } from './admin';
import { usageView } from './sen';

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

/** Yesterday at 3:00 am in Kuala Lumpur (now is Sun 18 Oct 2026, 8:40 pm). */
const LAST_BACKUP = '2026-10-17T03:00:00+08:00';

/** Made-up merchant rules on top of the scenario's own. Invented names, one hawker (D70). */
const MADE_UP_RULES: { merchant: string; category: string; hawker: boolean; setBy: 'user' | 'agent' }[] = [
  { merchant: 'WARUNG PAK HAMID', category: 'Meals', hawker: true, setBy: 'user' },
  { merchant: 'KEDAI KOPI TAMAN BAYU', category: 'Drinks & desserts', hawker: true, setBy: 'user' },
  { merchant: 'DAPUR BIBI DELIVERY', category: 'Meals', hawker: false, setBy: 'agent' },
  { merchant: 'PASAR MALAM SEKSYEN 9', category: 'Groceries', hawker: true, setBy: 'user' },
];

export function seedSettings(db: Db): SettingsState {
  const categories = db.categories
    .filter((c) => !c.archivedAt)
    .map((c) => ({ id: c.id, name: c.name, kind: c.kind, rules: 0 }));
  // only the made-up rules are kept here; the scenario's own are read live from db.rules (settingsView)
  const rules = MADE_UP_RULES.map((r) => ({ id: uid(`rule:${r.merchant}`), ...r }));
  return {
    ...blankSettings(),
    ...seedAdmin(db),
    you: { bankNames: ['TAN WEI MING', 'WEI MING TAN'], payday: { kind: 'last-working' }, qr: true },
    categories,
    rules,
    receiptsByEmail: { address: 'weiming.7f3k@in.sen-my.app', code: '428913', received: 3 },
    data: { lastBackup: LAST_BACKUP, exportReady: false },
  };
}

export function settingsView(db: Db): SettingsView {
  const s = db.settings;
  // Rules are read live, so one made by answering in Review shows at once (QA B04 redesign run 2, 7).
  // A rule's hawker flag lives in s.rules, by id; the made-up rules live there whole.
  const names = new Map(db.categories.map((c) => [c.id, c.name]));
  const fromDb = db.rules.map((r) => ({
    id: r.id,
    merchant: r.merchantKey,
    category: r.categoryId ? (names.get(r.categoryId) ?? 'Unknown') : 'Ask each time',
    hawker: s.rules.find((x) => x.id === r.id)?.hawker ?? false,
    setBy: r.setBy,
  }));
  const made = s.rules.filter((x) => !db.rules.some((r) => r.id === x.id));
  const rules = [...fromDb, ...made];
  const categories = s.categories.map((c) => ({ ...c, rules: rules.filter((r) => r.category === c.name).length }));
  return {
    ...s,
    categories,
    rules,
    // the member list is the admin's alone (D52); nobody else's reads carry it
    members: s.admin ? s.members : [],
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
      // the same figures agent/usage shows (D98)
      credit: usageView(db),
    },
  };
}

/** A payday as the form sends it: the last working day, a day of the month, or none (D14). */
function payday(value: unknown): SettingsState['you']['payday'] {
  const v = value as { kind?: unknown; day?: unknown } | null;
  if (v?.kind === 'last-working' || v?.kind === 'none') return { kind: v.kind };
  if (v?.kind === 'day' && Number.isInteger(v.day) && (v.day as number) >= 1 && (v.day as number) <= 31)
    return { kind: 'day', day: v.day as number };
  throw new Error('That payday is not a day of the month.');
}

export const applySettings: AreaApply = (db, cmd) => {
  if (cmd.type !== 'setting.set') return null;
  const s = db.settings;
  const { key, value } = cmd;
  const hawker = /^rules\.([^.]+)\.hawker$/.exec(key);
  if (hawker) {
    let rule = s.rules.find((r) => r.id === hawker[1]);
    if (!rule) {
      // a rule from db.rules: its hawker flag is kept here, by id
      const r = db.rules.find((x) => x.id === hawker[1]);
      if (!r) throw new Error('That rule is gone.');
      rule = { id: r.id, merchant: r.merchantKey, category: '', hawker: false, setBy: r.setBy };
      s.rules.push(rule);
    }
    rule.hawker = value === true;
    return { said: rule.hawker ? `${rule.merchant} is a hawker` : `${rule.merchant} is not a hawker`, touched: [] };
  }
  switch (key) {
    case 'you.payday':
      s.you.payday = payday(value);
      return { said: 'Payday saved', touched: [] };
    case 'you.bankNames':
      // Names as banks print them, one to a line: the form keeps them as text (the value is a string).
      s.you.bankNames = String(value ?? '')
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean);
      return { said: 'Names saved', touched: [] };
    case 'you.qr':
      s.you.qr = value === true;
      return { said: value ? 'DuitNow QR set' : 'DuitNow QR removed', touched: [] };
    case 'receiptsByEmail.code':
      s.receiptsByEmail.code = typeof value === 'string' ? value : null;
      return { said: 'Saved', touched: [] };
    case 'claims.essSender':
      s.claims.essSender = typeof value === 'string' && value.trim() ? value.trim() : null;
      return { said: 'ESS sender saved', touched: [] };
    // ESS (the shell holds it natively from B25): signed in or not, and a recipe imported
    case 'claims.ess.signedIn':
      if (typeof value !== 'boolean') throw new Error('That ESS state is not valid.');
      s.claims.ess.signedIn = value;
      return { said: value ? 'Saved' : 'ESS password forgotten', touched: [] };
    case 'claims.ess.recipe': {
      const cap = s.claims.ess.capabilities.find((c) => c.name === value);
      if (!cap) throw new Error('Sen has no step by that name.');
      cap.recorded = true;
      return { said: 'Recipe imported', touched: [] };
    }
    case 'calendar':
    case 'sen.calendar':
      s.calendar = value === true;
      return { said: s.calendar ? 'Calendar on' : 'Calendar off', touched: [] };
    default:
      throw new Error(`Unknown setting: ${key}`);
  }
};
