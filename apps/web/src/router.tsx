import { lazy, Suspense } from 'react';
import { createRootRoute, createRoute, createRouter, redirect, useParams } from '@tanstack/react-router';
import { AppShell } from './frame/app-shell';
import { Lost } from './screens/lost';
import { Placeholder } from './screens/placeholder';
import { REAL } from './screens/real';
import { ListSkeleton } from './blocks/states';
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
// (patterns.md §7, Error), never the router's own page. If the frame itself throws, its error shows in
// a column of its own, below the status bar like the frame's.
const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => <Lost kind="missing" />,
  errorComponent: () => (
    <div className="safe-top safe-bottom mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-background">
      <Lost kind="broken" />
    </div>
  ),
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
  const Real = REAL[_splat ?? ''];
  if (Real)
    return (
      <Suspense fallback={<ListSkeleton />}>
        <Real />
      </Suspense>
    );
  return <Placeholder screen={screenById.get(_splat ?? '')!} />;
}
const TAB_PATHS = { home: '/', review: '/review', insights: '/insights', more: '/more' } as const;

// An unknown id, from an old link or a typo, goes Home, replacing itself so back doesn't return to it.
// A sheet's id isn't a page: it goes to the screen the sheet opens over, its tab's or Home.
const anyScreen = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$',
  beforeLoad: ({ params }) => {
    const screen = screenById.get(params._splat ?? '');
    if (!screen) throw redirect({ to: '/', replace: true });
    if (screen.kind === 'sheet') throw redirect({ to: TAB_PATHS[screen.tab ?? 'home'], replace: true });
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
