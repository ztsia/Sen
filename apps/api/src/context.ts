import type { MemberSwitches } from '@sen/core/views';
import type { Db } from './db';
import type { Pusher } from './jobs/push';
import type { Relay } from './jobs/relay';

/** The signed-in person, as Better Auth's session names them. */
export interface Person {
  id: string;
  email: string;
  name: string;
}

/** Their row of `user_access` (D52, D98), read as them. */
export interface Access {
  isAdmin: boolean;
  features: MemberSwitches;
  suspended: boolean;
}

/** What every signed-in route has: who, what they may use, and a way to run as them. */
export interface Env {
  Variables: {
    person: Person;
    access: Access;
    /** A short transaction as this person, under RLS (db.ts). */
    db: <T>(fn: (db: Db) => Promise<T>) => Promise<T>;
    /** Push and the realtime relay (B06), each off when unconfigured. */
    svc: { push: Pusher; relay: Relay };
  };
}

export const NO_SWITCHES: MemberSwitches = {
  shell: false,
  capture: false,
  agent: false,
  splits: false,
  email: false,
  calendar: false,
  claims: false,
};
