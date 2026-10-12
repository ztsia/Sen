import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Command } from '@sen/core/commands';
import type { PaymentFilters } from '@sen/core/views';
import { toastDone, toastUndo } from '@/blocks/toast';
import { DEV_TOOLS } from '@/lib/env';
import { SETTLE_MS } from '@/lib/tap-guard';
import type { Backend } from './backend';
import { backend, queryClient } from './index';

// The query hooks, one per screen (B03): each reads one shape from @sen/core/views through the backend.
// Later slices replace the fake behind them; a screen keeps its hook.

function useRead<T>(key: unknown[], fn: (b: Backend) => Promise<T>, enabled = true) {
  return useQuery({ queryKey: key, queryFn: async () => fn(await backend()), enabled });
}

export const useHome = () => useRead(['home'], (b) => b.home());
export const useCycle = (id?: string) => useRead(['cycle', id ?? 'current'], (b) => b.cycle(id));
export const useReview = () => useRead(['review'], (b) => b.review());
export const useSkipped = () => useRead(['skipped'], (b) => b.skipped());
export const usePayments = (filters: PaymentFilters) => useRead(['payments', filters], (b) => b.payments(filters));
export const useTxn = (id: string) => useRead(['txn', id], (b) => b.txn(id), !!id);
export const useReceipt = (id: string) => useRead(['receipt', id], (b) => b.receipt(id), !!id);
export const useInsights = (cycle?: string) => useRead(['insights', cycle ?? 'current'], (b) => b.insights(cycle));
export const useBudgets = (cycle?: string) => useRead(['budgets', cycle ?? 'current'], (b) => b.budgets(cycle));
export const useSubscriptions = () => useRead(['subscriptions'], (b) => b.subscriptions());
export const useGoals = () => useRead(['goals'], (b) => b.goals());
export const useGoal = (id: string) => useRead(['goal', id], (b) => b.goal(id), !!id);
export const useYear = (year?: number) => useRead(['year', year ?? 'current'], (b) => b.year(year));
export const useMe = () => useRead(['me'], (b) => b.me());
export const useCategories = (kind: 'spend' | 'income' = 'spend') =>
  useRead(['categories', kind], (b) => b.categories(kind));
export const useAccounts = () => useRead(['accounts'], (b) => b.accounts());
// B04
export const useSplit = (id: string) => useRead(['split', id], (b) => b.split(id), !!id);
export const useShared = () => useRead(['shared'], (b) => b.shared());
export const useAccountList = () => useRead(['account-list'], (b) => b.accountList());
export const useAccount = (id: string) => useRead(['account', id], (b) => b.account(id), !!id);
export const useBalanceCheck = () => useRead(['balance-check'], (b) => b.balanceCheck());
export const useClaims = () => useRead(['claims'], (b) => b.claimList());
export const useClaim = (id: string) => useRead(['claim', id], (b) => b.claim(id), !!id);
export const useSen = (from: string) => useRead(['sen', from], (b) => b.sen(from));
export const useMemory = () => useRead(['memory'], (b) => b.memory());
export const useResearch = () => useRead(['research'], (b) => b.research());
export const useUsage = () => useRead(['usage'], (b) => b.usage());
export const useSettings = () => useRead(['settings'], (b) => b.settings());
export const usePayday = () => useRead(['payday'], (b) => b.payday());
export const useDraft = (id: string) => useRead(['draft', id], (b) => b.draft(id), !!id);
export const useMatches = (total: number, at: string, enabled: boolean) =>
  useRead(['matches', total, at], (b) => b.matches(total, at), enabled);
export const useNearDuplicate = (amount: number | null, at: string) =>
  useRead(['near', amount, at], (b) => b.nearDuplicate(amount ?? 0, at), amount !== null && amount > 0);

/** Sen's button shows only with the agent switch on (D52). Production has no data to read yet: on. */
export function useAgentOn(): boolean {
  const q = useRead(['me'], (b) => b.me(), DEV_TOOLS);
  return q.data?.agent ?? true;
}

/** Review's badge: Needs you only (D72). Production has nothing real to count yet, so it reads none. */
export function useNeedsYouCount(): number {
  const q = useRead(['review'], (b) => b.review(), DEV_TOOLS);
  return q.data?.needsYou.length ?? 0;
}

/** Runs one command and refreshes every screen. Returns what happened and its Undo, for a row that raises its own toast. */
export async function runCommand(cmd: Command): Promise<{ said: string; undo: () => void; canUndo: boolean }> {
  const b = await backend();
  const r = await b.run(cmd);
  await queryClient.invalidateQueries();
  const undo = r.undo;
  return {
    said: r.said,
    // a write that changed nothing (*They are already invited*) has nothing to undo
    canUndo: !!undo,
    undo: () => {
      if (!undo) return;
      void b.run(undo).then((u) => {
        void queryClient.invalidateQueries();
        toastDone(u.said);
      });
    },
  };
}

/**
 * Every change happens at once, with Undo in a toast (§6.7, patterns.md §7). `quiet` leaves the toast
 * out, for a change the screen shows by itself.
 */
let lastWrite = { key: '', at: -Infinity };

export function useWrite() {
  return useCallback(async (cmd: Command, opts: { quiet?: boolean } = {}) => {
    // a double tap sends the same command twice: the second would answer with the no-op's words, and
    // its toast's Undo would undo nothing (QA B04 run 1, finding 1). The same command within the tap
    // guard's settle time is the same tap; a different one, or a deliberate repeat later, goes through.
    const key = JSON.stringify(cmd);
    const now = performance.now();
    if (key === lastWrite.key && now - lastWrite.at < SETTLE_MS) return null;
    lastWrite = { key, at: now };
    try {
      const r = await runCommand(cmd);
      if (!opts.quiet) {
        if (r.canUndo) toastUndo(r.said, r.undo);
        else toastDone(r.said);
      }
      return r;
    } catch (e) {
      toastDone(e instanceof Error ? e.message : "That didn't save. Try again.");
      return null;
    }
  }, []);
}

/** Starts reading a receipt, or entering one by hand: returns the draft's id. */
export async function startDraft(file: File | null, forTxnId: string | null, byHand = false): Promise<string> {
  const b = await backend();
  const id = byHand ? await b.byHand(forTxnId) : await b.upload(file, forTxnId);
  await queryClient.invalidateQueries({ queryKey: ['review'] });
  return id;
}
