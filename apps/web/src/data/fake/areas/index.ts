import type { Db } from '../db';
import type { Applied } from '../apply';
import type { Cmd, Ctx } from './ctx';
import { applyMoney } from './money';
import { applySen } from './sen';
import { applySettings } from './settings';
import { applySplits } from './splits';

/** B04's commands, each to its area. Null for a command B03's apply() owns. */
export function applyArea(db: Db, cmd: Cmd, ctx: Ctx): Applied | null {
  return applySplits(db, cmd, ctx) ?? applySen(db, cmd, ctx) ?? applyMoney(db, cmd, ctx) ?? applySettings(db, cmd, ctx);
}

export type { Ctx } from './ctx';
