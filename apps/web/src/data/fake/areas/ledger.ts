import { nowIso } from '@/lib/clock';
import type { Db } from '../db';
import { categories as startingList } from '../scenario';
import type { AreaApply } from './ctx';

// The ledger's commands (B08) on made-up data, the way apps/api/src/ledger.ts answers them: first run's
// seed and finish, one account per app (D145), and the categories' rules (§8): Sen's own three can be
// renamed but never archived, Unaccounted takes no flags, money in takes no spending flags.

const live = (db: Db) => db.categories.filter((c) => !c.archivedAt);

/** seed_categories(): the starting list for a person with no categories yet; whether it made one. */
function seed(db: Db): boolean {
  if (db.categories.length) return false;
  db.categories = startingList().map((c) => ({ ...c, userId: db.userId }));
  return true;
}

export const applyLedger: AreaApply = (db, cmd) => {
  switch (cmd.type) {
    case 'setup.start':
      return { said: seed(db) ? 'Your categories are ready' : 'Setup continues', touched: [] };
    case 'setup.finish':
      db.setupDone = true;
      return { said: 'You’re all set', touched: [] };

    case 'account.add': {
      if (db.accounts.some((a) => a.id === cmd.id)) return { said: `${cmd.name} added`, touched: [] };
      if (cmd.kind === 'elsewhere' && (cmd.app || cmd.opening !== 0))
        throw new Error('An account kept elsewhere has no app and no balance in Sen.');
      if (cmd.app && db.accounts.some((a) => !a.archivedAt && a.notifierPackage === cmd.app!.package))
        throw new Error('That app already has an account in Sen. Each app has one.');
      db.accounts.push({
        id: cmd.id,
        userId: db.userId,
        name: cmd.name,
        kind: cmd.kind,
        notifierPackage: cmd.app?.package ?? null,
        notifierLabel: cmd.app?.label ?? null,
        openingBalance: cmd.opening,
        openingAt: nowIso(),
        currency: 'MYR',
        archivedAt: null,
      });
      return { said: `${cmd.name} added`, touched: [] };
    }
    case 'account.edit': {
      const a = db.accounts.find((x) => x.id === cmd.id);
      if (!a) throw new Error('That account is gone.');
      if (cmd.name !== undefined) a.name = cmd.name;
      // a corrected opening balance keeps the moment it was seen
      if (cmd.opening !== undefined) a.openingBalance = cmd.opening;
      return { said: cmd.opening !== undefined ? 'Opening balance saved' : 'Account renamed', touched: [] };
    }
    case 'account.archive': {
      const a = db.accounts.find((x) => x.id === cmd.id);
      if (!a) throw new Error('That account is gone.');
      if (
        !cmd.archived &&
        a.notifierPackage &&
        db.accounts.some((x) => x.id !== a.id && !x.archivedAt && x.notifierPackage === a.notifierPackage)
      )
        throw new Error('That app already has an account in Sen. Each app has one.');
      a.archivedAt = cmd.archived ? nowIso() : null;
      return { said: cmd.archived ? `${a.name} archived` : `${a.name} is back`, touched: [] };
    }

    case 'category.add': {
      if (db.categories.some((c) => c.id === cmd.id)) return { said: `${cmd.name} added`, touched: [] };
      seed(db);
      if (live(db).some((c) => c.name.toLowerCase() === cmd.name.toLowerCase()))
        throw new Error('You already have a category with that name.');
      db.categories.push({
        id: cmd.id,
        userId: db.userId,
        name: cmd.name,
        kind: cmd.kind,
        isMeal: false,
        isBeverage: false,
        isDiscretionary: false,
        systemKey: null,
        archivedAt: null,
      });
      return { said: `${cmd.name} added`, touched: [] };
    }
    case 'category.edit': {
      const c = db.categories.find((x) => x.id === cmd.id);
      if (!c) throw new Error('That category is gone.');
      const flags = cmd.meal || cmd.beverage || cmd.discretionary;
      if (flags && c.systemKey === 'unaccounted')
        throw new Error('Unaccounted is only for balance checks, so it takes no flags.');
      if (flags && c.kind === 'income') throw new Error('Money-in categories take no spending flags.');
      if (
        cmd.name !== undefined &&
        live(db).some((x) => x.id !== c.id && x.name.toLowerCase() === cmd.name!.toLowerCase())
      )
        throw new Error('You already have a category with that name.');
      const renamed = cmd.name !== undefined && cmd.name !== c.name;
      if (cmd.name !== undefined) c.name = cmd.name;
      if (cmd.meal !== undefined) c.isMeal = cmd.meal;
      if (cmd.beverage !== undefined) c.isBeverage = cmd.beverage;
      if (cmd.discretionary !== undefined) c.isDiscretionary = cmd.discretionary;
      return { said: renamed ? `Renamed to ${c.name}` : `${c.name} saved`, touched: [] };
    }
    case 'category.archive': {
      const c = db.categories.find((x) => x.id === cmd.id);
      if (!c) throw new Error('That category is gone.');
      if (cmd.archived && c.systemKey)
        throw new Error('Sen needs this category, so it can’t be archived. You can rename it.');
      if (!cmd.archived && live(db).some((x) => x.id !== c.id && x.name.toLowerCase() === c.name.toLowerCase()))
        throw new Error('You already have a category with that name.');
      c.archivedAt = cmd.archived ? nowIso() : null;
      return { said: cmd.archived ? `${c.name} archived` : `${c.name} is back`, touched: [] };
    }
    default:
      return null;
  }
};
