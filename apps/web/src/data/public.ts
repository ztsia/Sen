import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicSplitView } from '@sen/core/views';
import { useUi } from '@/frame/ui-store';
import { donePublic, readPublicSplit, setPublicName, tickPublic } from './fake/public-split';

// `split-public` has its own little interface and its own query keys. It never goes through
// `backend()`, so the person's data can't reach a page a friend opens with no login (D47). B18 swaps
// the fake below for fetches to its own route; the screen keeps these two hooks.

export interface PublicSplitApi {
  read(token: string): Promise<PublicSplitView>;
  setName(token: string, name: string): Promise<void>;
  tick(token: string, itemId: string, on: boolean): Promise<void>;
  done(token: string, done: boolean): Promise<void>;
}

const later = <T>(fn: () => T): Promise<T> =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }, 150),
  );

const fake: PublicSplitApi = {
  read: (token) => later(() => readPublicSplit(token)),
  setName: (token, name) => later(() => setPublicName(token, name)),
  tick: (token, itemId, on) => later(() => tickPublic(token, itemId, on)),
  done: (token, done) => later(() => donePublic(token, done)),
};

const key = (token: string) => ['public-split', token] as const;

/** The dev panel's states (?state=), which the person's backend can't show on a page that never uses it. */
const devState = () => useUi.getState().devState;
const offline = () => devState() === 'offline' || !navigator.onLine;

export function usePublicSplit(token: string) {
  return useQuery({
    queryKey: key(token),
    queryFn: () => {
      if (devState() === 'loading') return new Promise<PublicSplitView>(() => {});
      if (devState() === 'error') return Promise.reject(new Error("This split couldn't load."));
      return fake.read(token);
    },
  });
}

/**
 * The page's three writes. A friend's browser has no outbox: offline, a write says so in words and
 * changes nothing. Each refreshes the view, and throws a message the screen shows.
 */
export function usePublicWrite(token: string) {
  const qc = useQueryClient();
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (offline()) throw new Error("You're offline. Try again when you're back.");
      await fn();
      await qc.invalidateQueries({ queryKey: key(token) });
    },
    [qc, token],
  );
  return {
    setName: (name: string) => run(() => fake.setName(token, name)),
    tick: (itemId: string, on: boolean) => run(() => fake.tick(token, itemId, on)),
    done: (done: boolean) => run(() => fake.done(token, done)),
  };
}
