import { QueryClient } from '@tanstack/react-query';
import { DEV_TOOLS } from '@/lib/env';
import type { Backend } from './backend';

/**
 * Screens read through TanStack Query and never refetch on a timer: data changes when you write, or
 * when the backend says something changed (D100), and then every query is invalidated.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
  },
});

let backendP: Promise<Backend> | null = null;

/**
 * The backend this build reads and writes through. Previews and the dev server have the skeleton's
 * fake; production has none until B05, and its screens say *Not built yet* (modules.md rule 6), so a
 * production build never even holds the made-up data: the fake's chunk is left out.
 */
export function backend(): Promise<Backend> {
  // compared in place, so a production build leaves the fake's chunk out (sen-env.d.ts)
  backendP ??=
    __SEN_ENV__ !== 'production' && DEV_TOOLS
      ? import('./fake/connect').then((m) => m.connect(queryClient))
      : Promise.reject(new Error('Sen has no server yet. It arrives in B05.'));
  return backendP;
}
