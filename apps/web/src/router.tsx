import { lazy, Suspense } from 'react';
import { createRootRoute, createRoute, createRouter, redirect, useParams } from '@tanstack/react-router';
import { AppShell } from './frame/app-shell';
import { DEV_TOOLS } from './lib/env';
import { Placeholder } from './screens/placeholder';
import { screenById } from './screens/registry';

// The routes: the four tab screens, Scan's task screen, every other screen by its id from
// docs/screens.md under /s/<id>, and, in development and previews only, the gallery. TanStack Router,
// confirmed by B01 (spec §5.1).

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    /** The screen id from docs/screens.md that this route shows. */
    screen?: string;
  }
}

const rootRoute = createRootRoute({ component: AppShell });

const screenRoute = (path: '/' | '/review' | '/insights' | '/more' | '/scan', id: string) =>
  createRoute({ getParentRoute: () => rootRoute, path, staticData: { screen: id }, component: () => <Placeholder screen={screenById.get(id)!} /> });

function AnyScreen() {
  const { _splat } = useParams({ from: '/s/$' });
  const screen = screenById.get(_splat ?? '');
  if (!screen) throw redirect({ to: '/' });
  return <Placeholder screen={screen} />;
}
const anyScreen = createRoute({ getParentRoute: () => rootRoute, path: '/s/$', component: AnyScreen });

const Gallery = lazy(() => import('./dev/gallery'));
const gallery = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/gallery',
  staticData: { screen: 'dev/gallery' },
  beforeLoad: () => {
    if (!DEV_TOOLS) throw redirect({ to: '/' });
  },
  component: () => (
    <Suspense>
      <Gallery />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([
  screenRoute('/', 'home'),
  screenRoute('/review', 'review'),
  screenRoute('/insights', 'insights'),
  screenRoute('/more', 'more'),
  screenRoute('/scan', 'scan'),
  anyScreen,
  gallery,
]);

export const router = createRouter({ routeTree, defaultPreload: false, scrollRestoration: true });
