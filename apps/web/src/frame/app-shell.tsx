import { lazy, Suspense } from 'react';
import { Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { OfflineBanner } from '@/blocks/states';
import { Toaster } from '@/components/ui/sonner';
import { useNeedsYouCount } from '@/data/hooks';
import { useOnline } from '@/lib/online';
import { cn } from '@/lib/utils';
import { screenById, showsSenButton, showsTabBar, type ScreenDef } from '@/screens/registry';
import { LookProvider } from '@/theme/look';
import { SenButton } from './sen-button';
import { ScanMoreSheet, SenSheet } from './sheets';
import { TabBar } from './tab-bar';
import { useUi } from './ui-store';

// compared in place, so a production build leaves the dev panel's chunk out (sen-env.d.ts)
const DevPanel = __SEN_ENV__ !== 'production' ? lazy(() => import('@/dev/dev-panel')) : null;

/** The screen on show, from the route: its static screen id, or the id after /s/. */
function useCurrentScreen(): ScreenDef | undefined {
  return useMatches({
    select: (ms) => {
      const m = ms[ms.length - 1];
      const id = m?.staticData.screen ?? (m?.params as { _splat?: string } | undefined)?._splat;
      return id ? screenById.get(id) : undefined;
    },
  });
}

/** True when the path matched no route, so the root shows its not-found screen. */
function useLost(): boolean {
  return useMatches({ select: (ms) => ms.length === 1 || ms.some((m) => m.status === 'notFound') });
}

/**
 * One column, the width of a phone, centred on a wider screen. The tab bar and Sen's button show
 * where patterns.md §6 says; every screen scrolls inside the column, never the page. The shell draws
 * edge to edge, so the column starts below the status bar, and ends above the navigation bar when no
 * tab bar (which pads itself) is there to.
 */
export function AppShell() {
  const screen = useCurrentScreen();
  const lost = useLost();
  // the dev panel's offline state shows what offline looks like without cutting the connection
  const devOffline = useUi((s) => s.devState) === 'offline';
  const online = useOnline() && !devOffline;
  const navigate = useNavigate();
  const { reviewCount, senState, setSenOpen, setScanMoreOpen } = useUi();
  const needsYou = useNeedsYouCount();
  // Lost, the tab bar stays, with no tab active, so there's always a way back.
  const tabs = lost || showsTabBar(screen);
  const sen = showsSenButton(screen);
  return (
    <LookProvider>
      <div
        className={cn(
          'safe-top relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background',
          !tabs && 'safe-bottom',
        )}
      >
        {online ? null : <OfflineBanner />}
        <Outlet />
        {tabs ? (
          <div className="relative z-[var(--z-index-tabbar)] shrink-0">
            {sen ? <SenButton state={senState} onOpen={() => setSenOpen(true)} /> : null}
            <TabBar
              active={screen?.tab ?? null}
              reviewCount={reviewCount ?? needsYou}
              onScan={() => void navigate({ to: '/scan' })}
              onScanMore={() => setScanMoreOpen(true)}
            />
          </div>
        ) : null}
      </div>
      <SenSheet from={screen?.title ?? 'Home'} />
      <ScanMoreSheet />
      <Toaster
        position="bottom-center"
        visibleToasts={1}
        offset={{ bottom: tabs ? 96 : 16 }}
        mobileOffset={{ bottom: tabs ? 96 : 16, left: 12, right: sen ? 84 : 12 }}
      />
      {DevPanel ? (
        <Suspense>
          <DevPanel />
        </Suspense>
      ) : null}
    </LookProvider>
  );
}
