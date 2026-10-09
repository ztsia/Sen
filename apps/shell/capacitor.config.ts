import type { CapacitorConfig } from '@capacitor/cli';

// The shell around the web app (spec §5, §5.1, §17). It loads the web app from its Vercel address, and
// a service worker keeps it working offline (decided 9 Oct, docs/handoff.md). The address isn't here:
// MainActivity builds the config at launch from the build type's own address (sites.json), so the
// release, debug and e2e builds can't load each other's sites. What's here is what they share.
const config: CapacitorConfig = {
  appId: 'io.github.ztsia.sen',
  appName: 'Sen',
  // Only the offline fallback page, shown when the site can't load and isn't cached yet.
  webDir: 'www',
  android: {
    // Nothing loads over http, except the e2e build's localhost (its own network security config).
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#00000000', showSpinner: false },
    // Edge to edge: the bars draw over the app, and Capacitor sets --safe-area-inset-* on the page,
    // which the frame already reads (apps/web/src/styles/frame.css). Their style follows the app's theme.
    SystemBars: { insetsHandling: 'css', style: 'DEFAULT' },
  },
};

export default config;
