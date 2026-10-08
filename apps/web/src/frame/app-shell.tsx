import { lazy, Suspense } from 'react';
import { Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { DEV_TOOLS } from '@/lib/env';
import { screenById, showsSenButton, showsTabBar, type ScreenDef } from '@/screens/registry';
import { LookProvider } from '@/theme/look';
import { SenButton } from './sen-button';
import { ScanMoreSheet, SenSheet } from './sheets';
import { TabBar } from './tab-bar';
import { useUi } from './ui-store';

const DevPanel = DEV_TOOLS ? lazy(() => import('@/dev/dev-panel')) : null;

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

/**
 * One column, the width of a phone, centred on a wider screen. The tab bar and Sen's button show
 * where patterns.md §6 says; every screen scrolls inside the column, never the page.
 */
export function AppShell() {
  const screen = useCurrentScreen();
  const navigate = useNavigate();
  const { reviewCount, senState, setSenOpen, setScanMoreOpen } = useUi();
  const tabs = showsTabBar(screen);
  const sen = showsSenButton(screen);
  return (
    <LookProvider>
      <div className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background">
        <Outlet />
        {tabs ? (
          <div className="relative z-[var(--z-index-tabbar)] shrink-0">
            {sen ? <SenButton state={senState} onOpen={() => setSenOpen(true)} /> : null}
            <TabBar
              active={screen?.tab ?? null}
              reviewCount={reviewCount}
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
