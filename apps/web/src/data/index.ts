import { QueryClient } from '@tanstack/react-query';
import { DEV_TOOLS } from '@/lib/env';
import type { Backend } from './backend';

/**
 * Screens read through TanStack Query and never refetch on a timer: data changes when you write, or
 * when the backend says something changed (D100), and then every query is invalidated.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    // 'always': a read never waits for the network, because the backend works offline (the fake now,
    // the shell's outbox from B07); offline, the screens still show what was just written (QA B03, F1)
    queries: {
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'always',
    },
    mutations: { networkMode: 'always' },
  },
});

let backendP: Promise<Backend> | null = null;

/**
 * The backend this build reads and writes through (__SEN_BACKEND__, vite.config.ts):
 * - `api` on Vercel (B05): the server for what it holds, around the skeleton's fake in a preview, and
 *   nothing else in production, whose other screens say *Not built yet* (modules.md rule 6)
 * - `fake` for the dev server and the e2e preview build: the skeleton's made-up person, no server
 * - `none` for the e2e production build: no server, no made-up data
 * A production build never even holds the made-up data: the fake's chunk is left out.
 */
export function backend(): Promise<Backend> {
  // compared in place, so a production build leaves the fake's chunk out (sen-env.d.ts)
  const fake = () =>
    __SEN_ENV__ !== 'production' && DEV_TOOLS
      ? import('./fake/connect').then((m) => m.connect(queryClient))
      : Promise.resolve(null);
  backendP ??=
    __SEN_BACKEND__ === 'api'
      ? Promise.all([import('./api/backend'), fake()]).then(([m, rest]) => {
          const b = m.createApiBackend(rest);
          b.subscribe(() => void queryClient.invalidateQueries());
          return b;
        })
      : __SEN_BACKEND__ === 'fake' && __SEN_ENV__ !== 'production' && DEV_TOOLS
        ? import('./fake/connect').then((m) => m.connect(queryClient))
        : Promise.reject(new Error('Sen has no server in this build.'));
  return backendP;
}
