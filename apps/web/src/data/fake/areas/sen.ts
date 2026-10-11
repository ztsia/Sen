import type { MemoryView, ResearchView, SenMessage, SenView, UsageView } from '@sen/core/views';
import type { Db } from '../db';
import type { AreaApply } from './ctx';

// Sen (B04): the one conversation, what Sen remembers, research briefs and AI credit, on made-up data,
// and the sen.*, proposal.*, research.* and memory.* commands. Every figure in Sen's text is written
// here as it would come from a tool; a figure marked `unchecked` shows what code does with one it
// couldn't trace (D108).

export interface SenState {
  messages: SenMessage[];
  memory: { id: string; text: string; at: string }[];
}

export function seedSen(db: Db): SenState {
  void db;
  return { messages: [], memory: [] }; // TODO(B04 Sen batch)
}

export function senView(db: Db, from: string, offline: boolean): SenView {
  void from;
  return {
    messages: db.sen.messages,
    state: offline ? 'offline' : db.aiPausedUntil ? 'paused' : 'ready',
    pausedUntil: db.aiPausedUntil,
    suggestions: [], // TODO(B04 Sen batch)
  };
}

export function memoryView(db: Db): MemoryView {
  return { notes: db.sen.memory };
}

export function researchView(db: Db): ResearchView {
  void db;
  return { briefs: [] }; // TODO(B04 Sen batch)
}

export function usageView(db: Db): UsageView {
  return {
    owner: true,
    unlimited: false,
    balance: 0,
    allowance: 0,
    allowanceLeft: 0,
    pausedUntil: db.aiPausedUntil,
    byUse: [],
    estimate: null,
  }; // TODO(B04 Sen batch)
}

export const applySen: AreaApply = (db, cmd) => {
  void db;
  switch (cmd.type) {
    case 'sen.send':
    case 'sen.answer':
    case 'proposal.answer':
    case 'research.confirm':
    case 'memory.forget':
      return { said: 'Done', touched: [] }; // TODO(B04 Sen batch)
    default:
      return null;
  }
};
