/**
 * Registers the service worker (sw/sw.template.js) in builds, never on the dev server. It keeps the
 * app opening offline, in the shell and in a browser (spec §5.1). A failure only means no offline.
 */
export function registerServiceWorker() {
  if (__SEN_ENV__ === 'development' || !('serviceWorker' in navigator)) return;
  const go = () =>
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}
