import type { Command } from '@sen/core/commands';
import type { Db } from '../db';
import type { Applied } from '../apply';

/**
 * What an area's write side gets besides the state (B04): whether the made-up connection is down, and
 * a way to change the state a moment later, as a server would (Sen's reply arriving, ESS answering).
 * `later` mutates the state as it is then and tells every screen to refetch.
 */
export interface Ctx {
  offline: boolean;
  later(ms: number, fn: (db: Db) => void): void;
}

export type Cmd = Exclude<Command, { type: 'undo' }>;
/** An area's commands: null when the command isn't its own. */
export type AreaApply = (db: Db, cmd: Cmd, ctx: Ctx) => Applied | null;
