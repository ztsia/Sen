import { Sen } from '@sen/core/schema';
import { formatSen } from '@sen/core/money';
import type { SettingsView } from '@sen/core/views';
import type { Db } from '../db';
import { uid } from '../ids';
import { rm } from '../scenario';
import { newId } from '@/lib/uid';
import type { AreaApply } from './ctx';
import type { SettingsState } from './settings';

// Settings' admin and feature sections (B04): Claims (schemes, the ESS sender, ESS), Sen (Calendar,
// credit) and Members (D52, D98), seeded here, and the member.* commands. Made-up schemes only: real
// claim values never enter the repo (CLAUDE.md).

type Member = SettingsView['members'][number];
type Switches = Member['switches'];

export const SWITCH_KEYS = ['shell', 'capture', 'agent', 'splits', 'email', 'calendar', 'claims'] as const;
const isSwitch = (k: string): k is (typeof SWITCH_KEYS)[number] => (SWITCH_KEYS as readonly string[]).includes(k);

/** The shell seats a person holds one of while they use the shell (D52). */
const SEATS = 20;
const seatsUsed = (members: Member[]) => members.filter((m) => m.switches.shell).length;
const seatsOf = (members: Member[]) => ({ used: seatsUsed(members), of: SEATS });

export function seedAdmin(db: Db): Pick<SettingsState, 'claims' | 'members' | 'seats' | 'calendar'> {
  void db;
  const all: Switches = {
    shell: true,
    capture: true,
    agent: true,
    splits: true,
    email: true,
    calendar: true,
    claims: true,
  };
  const members: Member[] = [
    {
      id: uid('member:wei-ming'),
      name: 'Wei Ming',
      email: 'weiming@example.com',
      status: 'active',
      switches: all,
      // the owner pays for Sen directly, so there is no ledger to show (D98)
      balance: 0,
      allowance: 0,
      allowanceLeft: 0,
      unlimited: true,
      dailyCeiling: rm('5'),
      shellVersion: '0.2.7',
      captureConnected: true,
    },
    {
      id: uid('member:hui-min'),
      name: 'Hui Min',
      email: 'huimin@example.com',
      status: 'active',
      switches: { ...all, calendar: false, claims: false },
      balance: rm('3.40'),
      allowance: rm('2'),
      allowanceLeft: rm('1.10'),
      unlimited: false,
      dailyCeiling: rm('1'),
      shellVersion: '0.2.7',
      captureConnected: true,
    },
    {
      id: uid('member:farid'),
      name: 'Farid',
      email: 'farid@example.com',
      status: 'invited',
      switches: { ...all, shell: false, capture: false, calendar: false, claims: false },
      balance: rm('5'),
      allowance: rm('2'),
      allowanceLeft: rm('2'),
      unlimited: false,
      dailyCeiling: rm('1'),
      shellVersion: null,
      captureConnected: false,
    },
  ];
  return {
    claims: {
      schemes: [
        {
          id: uid('scheme:phone'),
          name: 'Phone bill',
          period: 'monthly',
          cap: rm('100'),
          deadlineDay: 25,
          source: 'tagged',
        },
        {
          id: uid('scheme:parking'),
          name: 'Parking',
          period: 'monthly',
          cap: rm('100'),
          deadlineDay: 20,
          source: 'evidence',
        },
      ],
      essSender: 'ess-noreply@example.com',
      ess: {
        signedIn: true,
        capabilities: [
          { name: 'Fetch payslip', recorded: true },
          { name: 'Submit claims', recorded: false },
        ],
        lastPayslip: '2026-09-30',
      },
    },
    members,
    seats: seatsOf(members),
    calendar: false,
  };
}

// no consecutive dots, no label starting or ending with a hyphen, and at most 254 characters
const validEmail = (a: string) =>
  a.length <= 254 &&
  !a.includes('..') &&
  /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(a);

const fail = (m: string): never => {
  throw new Error(m);
};

const nameOf = (email: string) => {
  const local = email.split('@')[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
};

const find = (db: Db, id: string): Member =>
  db.settings.members.find((m) => m.id === id) ?? fail('That person is gone.');
const isOwner = (db: Db, m: Member) => m.email === db.settings.email;

export const applyMembers: AreaApply = (db, cmd) => {
  const s = db.settings;
  // Members is the admin's alone (D52): a member.* command from anyone else is refused
  if (cmd.type.startsWith('member.') && !s.admin) return fail('Only the admin can do that.');
  switch (cmd.type) {
    case 'member.invite': {
      const email = cmd.email.trim().toLowerCase();
      if (!validEmail(email)) return fail('Type their email, like name@example.com.');
      if (s.members.some((m) => m.email.toLowerCase() === email))
        return { said: 'They are already invited', touched: [] };
      if (cmd.shell && seatsUsed(s.members) >= SEATS) return fail(`All ${SEATS} shell seats are taken.`);
      const m: Member = {
        id: newId(),
        name: nameOf(email),
        email,
        status: 'invited',
        // capture needs the shell (D52, D98)
        switches: { ...cmd.switches, shell: cmd.shell, capture: cmd.shell && cmd.switches.capture },
        balance: cmd.welcome,
        allowance: cmd.allowance,
        allowanceLeft: cmd.allowance,
        unlimited: cmd.unlimited,
        dailyCeiling: rm('1'),
        shellVersion: null,
        captureConnected: false,
      };
      s.members.push(m);
      s.seats = seatsOf(s.members);
      return { said: `Invited ${email}`, touched: [m.id] };
    }
    case 'member.set': {
      const m = find(db, cmd.id);
      const v = cmd.value;
      if (isSwitch(cmd.key)) {
        if (typeof v !== 'boolean') return fail('A switch is on or off.');
        if (isOwner(db, m) && (cmd.key === 'shell' || cmd.key === 'agent') && !v)
          return fail("You can't turn that off for yourself.");
        if (cmd.key === 'shell' && v && !m.switches.shell && seatsUsed(s.members) >= SEATS)
          return fail(`All ${SEATS} shell seats are taken.`);
        if (cmd.key === 'capture' && v && !m.switches.shell) return fail('Capture needs the Android shell.');
        m.switches[cmd.key] = v;
        if (cmd.key === 'shell' && !v) {
          m.switches.capture = false;
          m.shellVersion = null;
          m.captureConnected = false;
        }
        if (cmd.key === 'capture' && !v) m.captureConnected = false;
        s.seats = seatsOf(s.members);
        return { said: `${m.name}: ${cmd.key} ${v ? 'on' : 'off'}`, touched: [m.id] };
      }
      switch (cmd.key) {
        case 'allowance':
        case 'dailyCeiling': {
          if (typeof v !== 'number' || v < 0) return fail('Type an amount of zero or more.');
          if (cmd.key === 'allowance') {
            m.allowance = v;
            m.allowanceLeft = Math.min(m.allowanceLeft, v);
          } else m.dailyCeiling = v;
          return {
            said: `${m.name}: ${cmd.key === 'allowance' ? 'monthly allowance' : 'daily ceiling'} changed`,
            touched: [m.id],
          };
        }
        case 'unlimited':
          if (typeof v !== 'boolean') return fail('Unlimited is on or off.');
          m.unlimited = v;
          return { said: `${m.name}: unlimited ${v ? 'on' : 'off'}`, touched: [m.id] };
        case 'grant': {
          // a grant adds credit; a refund takes it back, never below nothing (D98)
          if (typeof v !== 'number' || v === 0) return fail('Type an amount.');
          const next = m.balance + v;
          if (next < 0) return fail(`${m.name} has only ${formatSen(m.balance)} of credit to refund.`);
          if (!Sen.safeParse(next).success) return fail('That is more credit than Sen can hold.');
          m.balance = next;
          return { said: v > 0 ? `Granted credit to ${m.name}` : `Refunded credit from ${m.name}`, touched: [m.id] };
        }
        case 'status': {
          if (v !== 'active' && v !== 'suspended') return fail('A person is active or suspended.');
          if (isOwner(db, m)) return fail("You can't suspend yourself.");
          m.status = v;
          return { said: v === 'suspended' ? `Suspended ${m.name}` : `${m.name} can use Sen again`, touched: [m.id] };
        }
        default:
          return fail('Sen does not know that setting.');
      }
    }
    case 'member.remove': {
      const m = find(db, cmd.id);
      if (isOwner(db, m)) return fail("You can't remove yourself.");
      s.members = s.members.filter((x) => x.id !== m.id);
      s.seats = seatsOf(s.members);
      return {
        said: cmd.exportFirst ? `Removed ${m.name}. Their data export goes to ${m.email}` : `Removed ${m.name}`,
        touched: [m.id],
      };
    }
    case 'member.resend': {
      const m = find(db, cmd.id);
      if (m.status !== 'invited') return fail('They have signed in already.');
      return { said: 'Invitation sent again', touched: [m.id] };
    }
    case 'member.revoke': {
      const m = find(db, cmd.id);
      if (m.status !== 'invited') return fail('They have signed in already. Remove them instead.');
      s.members = s.members.filter((x) => x.id !== m.id);
      s.seats = seatsOf(s.members);
      return { said: `Withdrew the invitation to ${m.email}`, touched: [m.id] };
    }
    default:
      return null;
  }
};
