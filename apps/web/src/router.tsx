import { lazy, Suspense } from 'react';
import { createRootRoute, createRoute, createRouter, redirect, useParams } from '@tanstack/react-router';
import { AppShell } from './frame/app-shell';
import { Lost } from './screens/lost';
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

// A path that matches nothing, or a screen that throws, keeps the frame and offers a way home
// (patterns.md §7, Error), never the router's own page.
const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => <Lost kind="missing" />,
  errorComponent: () => <Lost kind="broken" />,
});

const screenRoute = (path: '/' | '/review' | '/insights' | '/more' | '/scan', id: string) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    staticData: { screen: id },
    component: () => <Placeholder screen={screenById.get(id)!} />,
  });

function AnyScreen() {
  const { _splat } = useParams({ from: '/s/$' });
  return <Placeholder screen={screenById.get(_splat ?? '')!} />;
}
// An unknown id, from an old link or a typo, goes Home, replacing itself so back doesn't return to it.
const anyScreen = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$',
  beforeLoad: ({ params }) => {
    if (!screenById.has(params._splat ?? '')) throw redirect({ to: '/', replace: true });
  },
  component: AnyScreen,
});

// Only development and previews build the gallery. In production its chunk doesn't exist, and its
// path goes Home.
// compared in place, so a production build leaves the chunk out (sen-env.d.ts)
const Gallery = __SEN_ENV__ !== 'production' ? lazy(() => import('./dev/gallery')) : null;
const gallery = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/gallery',
  staticData: { screen: 'dev/gallery' },
  beforeLoad: () => {
    if (!Gallery) throw redirect({ to: '/', replace: true });
  },
  component: () =>
    Gallery ? (
      <Suspense>
        <Gallery />
      </Suspense>
    ) : null,
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

export const router = createRouter({
  routeTree,
  defaultPreload: false,
  scrollRestoration: true,
  defaultNotFoundComponent: () => <Lost kind="missing" />,
  defaultErrorComponent: () => <Lost kind="broken" />,
});
