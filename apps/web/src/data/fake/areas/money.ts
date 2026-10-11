import type {
  AccountsView,
  AccountView,
  BalanceCheckView,
  ClaimRow,
  ClaimsView,
  ClaimView,
  PaydayView,
} from '@sen/core/views';
import type { Db } from '../db';
import type { AreaApply } from './ctx';

// Accounts, claims and payday (B04), on made-up data: `accounts`, `account`, `balance-check`,
// `claims`, `claim` and `payday`, and the balance.check, claim.* and payday.* commands. Claims use
// made-up schemes only: real claim values never enter the repo (CLAUDE.md).

export interface ClaimState {
  claims: ClaimRow[];
}

export function seedClaims(db: Db): ClaimState {
  void db;
  return { claims: [] }; // TODO(B04 money batch)
}

export function accountsView(db: Db): AccountsView {
  void db;
  return { total: 0, tracked: [], elsewhere: [], gap: null }; // TODO(B04 money batch)
}

export function accountView(db: Db, id: string): AccountView | null {
  void db;
  void id;
  return null; // TODO(B04 money batch)
}

export function balanceCheckView(db: Db): BalanceCheckView {
  void db;
  return { rows: [] }; // TODO(B04 money batch)
}

/** *Send to ESS* shows once the adapter is signed in (Settings → Claims → ESS), in the shell (D96). */
const essReady = (db: Db) => db.settings.claims.ess.signedIn;

export function claimsView(db: Db): ClaimsView {
  return { period: '', claims: db.claimState.claims, ess: essReady(db) }; // TODO(B04 money batch)
}

export function claimView(db: Db, id: string): ClaimView | null {
  void essReady;
  void db;
  void id;
  return null; // TODO(B04 money batch)
}

export function paydayView(db: Db): PaydayView | null {
  void db;
  return null; // TODO(B04 money batch)
}

export const applyMoney: AreaApply = (db, cmd) => {
  void db;
  switch (cmd.type) {
    case 'balance.check':
    case 'claim.submitted':
    case 'payday.claims':
    case 'payday.skip':
    case 'payday.plan':
      return { said: 'Done', touched: [] }; // TODO(B04 money batch)
    default:
      return null;
  }
};
