import { lazy, Suspense } from 'react';
import { Outlet, useMatches } from '@tanstack/react-router';
import { OfflineBanner } from '@/blocks/states';
import { Toaster } from '@/components/ui/sonner';
import { useAgentOn, useNeedsYouCount } from '@/data/hooks';
import { useOnline } from '@/lib/online';
import { cn } from '@/lib/utils';
import { screenById, showsSenButton, showsTabBar, type ScreenDef } from '@/screens/registry';
import { LookProvider } from '@/theme/look';
import { SenButton } from './sen-button';
import { useReceiptPicker } from './receipt-picker';
import { ScanMoreSheet, SenSheet } from './sheets';
import { TabBar } from './tab-bar';
import { useUi } from './ui-store';

// compared in place, so a production build leaves the dev panel's chunk out (sen-env.d.ts)
const DevPanel = __SEN_ENV__ !== 'production' ? lazy(() => import('@/dev/dev-panel')) : null;
// the guided journeys' bar, on the split link too, which has no dev panel; it reads no app data itself
const JourneyBar =
  __SEN_ENV__ !== 'production'
    ? lazy(() => import('@/dev/native/journeys-ui').then((m) => ({ default: m.JourneyOverlay })))
    : null;

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
  // a friend's split link (D47) gets a frame of its own, which reads nothing of the person's: no badge
  // count, no Sen, no outbox, no dev panel (B04's note; B18 serves it from its own route)
  return screen?.id === 'split-public' ? <PublicShell /> : <PersonShell screen={screen} />;
}

/** The split link's frame: the look and the column, and nothing else. */
function PublicShell() {
  const devOffline = useUi((s) => s.devState) === 'offline';
  const online = useOnline() && !devOffline;
  return (
    <LookProvider>
      <div className="safe-top safe-bottom relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background">
        {/* a friend's browser has no outbox: nothing waits to sync */}
        {online ? null : <OfflineBanner>You're offline. Ticks need a connection.</OfflineBanner>}
        <Outlet />
      </div>
      {JourneyBar ? (
        <Suspense>
          <JourneyBar />
        </Suspense>
      ) : null}
      <Toaster
        position="bottom-center"
        visibleToasts={1}
        offset={{ bottom: 16 }}
        mobileOffset={{ bottom: 16, left: 12, right: 12 }}
      />
    </LookProvider>
  );
}

function PersonShell({ screen }: { screen: ScreenDef | undefined }) {
  const lost = useLost();
  // the dev panel's offline state shows what offline looks like without cutting the connection
  const devOffline = useUi((s) => s.devState) === 'offline';
  const online = useOnline() && !devOffline;
  // a tap on Scan opens the camera straight away (D69)
  const pick = useReceiptPicker();
  const { reviewCount, senState, setSenOpen, setScanMoreOpen } = useUi();
  const needsYou = useNeedsYouCount();
  // Lost, the tab bar stays, with no tab active, so there's always a way back.
  const tabs = lost || showsTabBar(screen);
  const agentOn = useAgentOn();
  const sen = showsSenButton(screen) && agentOn;
  return (
    <LookProvider>
      <div
        className={cn(
          'safe-top relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background',
          !tabs && 'safe-bottom',
        )}
      >
        {online ? null : screen?.id === 'sign-in' ? (
          <OfflineBanner>You’re offline. Signing in needs a connection.</OfflineBanner>
        ) : (
          <OfflineBanner />
        )}
        {/* the part of the frame that moves when the screen changes (motion.css) */}
        <div className="screen-region flex min-h-0 flex-1 flex-col bg-background">
          <Outlet />
        </div>
        {tabs ? (
          <div className="relative z-[var(--z-index-tabbar)] shrink-0">
            {sen ? <SenButton state={senState} onOpen={() => setSenOpen(true)} /> : null}
            <TabBar
              active={screen?.tab ?? null}
              reviewCount={reviewCount ?? needsYou}
              onScan={pick.openCamera}
              onScanMore={() => setScanMoreOpen(true)}
            />
          </div>
        ) : null}
      </div>
      <SenSheet from={screen?.title ?? 'Home'} />
      <ScanMoreSheet onCamera={pick.openCamera} onGallery={pick.openGallery} />
      {pick.inputs}
      <Toaster
        position="bottom-center"
        visibleToasts={1}
        // above the tab bar, or on a task screen above its main button, so a toast never takes its tap
        // (QA B04 redesign run 3, 6)
        offset={{ bottom: tabs ? 96 : 88 }}
        mobileOffset={{ bottom: tabs ? 96 : 88, left: 12, right: sen ? 84 : 12 }}
      />
      {DevPanel ? (
        <Suspense>
          <DevPanel />
        </Suspense>
      ) : null}
    </LookProvider>
  );
}
