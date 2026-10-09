import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * The screens a slice has built, by id. Each is its own chunk, loaded when shown. A screen listed here
 * is `real` in the registry; every other one is still a skeleton (registry.ts).
 */
export const REAL: Record<string, LazyExoticComponent<ComponentType>> = {
  'settings/capture': lazy(() => import('./capture/capture')),
  'settings/capture/apps': lazy(() => import('./capture/apps')),
  'settings/capture/access': lazy(() => import('./capture/access')),
  'settings/capture/running': lazy(() => import('./capture/running')),
  'settings/capture/captured': lazy(() => import('./capture/captured')),
  'settings/account': lazy(() => import('./account')),
};
