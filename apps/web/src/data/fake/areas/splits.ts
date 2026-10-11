import type { SharedView, SplitView } from '@sen/core/views';
import type { Db } from '../db';
import type { AreaApply } from './ctx';

// Shared bills (B04): `split` and `shared` on the person's own rows (db.splits, db.members, db.items,
// db.picks, db.bills), and the split.* commands. `split-public` is not here: it never reads the
// person's state (public-split.ts).

/** Adds the splits the skeleton needs beyond B03's two: a split still changing, with items. */
export function seedSplits(db: Db): void {
  void db; // TODO(B04 splits batch)
}

export function splitView(db: Db, id: string): SplitView | null {
  void db;
  void id;
  return null; // TODO(B04 splits batch)
}

export function sharedView(db: Db): SharedView {
  void db;
  return { rows: [] }; // TODO(B04 splits batch)
}

export const applySplits: AreaApply = (db, cmd) => {
  void db;
  switch (cmd.type) {
    case 'split.tick':
    case 'split.assign':
    case 'split.done':
    case 'split.lock':
    case 'split.paid-them':
      return { said: 'Done', touched: [] }; // TODO(B04 splits batch)
    default:
      return null;
  }
};
