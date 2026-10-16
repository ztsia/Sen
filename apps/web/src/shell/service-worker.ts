import { toastUpdate } from '@/blocks/toast';

/**
 * Registers the service worker (sw/sw.template.js) in builds, never on the dev server. It keeps the
 * app opening offline, in the shell and in a browser (spec §5.1). A failure only means no offline.
 *
 * It also brings each deploy in (D138). Android's WebView keeps the page alive in the background, so a
 * waiting worker could wait for days; instead Sen looks for a new version when it opens, when it comes
 * back to the front and every minute while it's in front. A version ready while the person has only
 * just opened Sen, before they've touched anything and with no form or sheet open, takes over at once;
 * otherwise a toast offers it, and nothing reloads under them (qa/escapes.md E3).
 */
export function registerServiceWorker() {
  if (__SEN_ENV__ === 'development' || !('serviceWorker' in navigator)) return;
  const go = () =>
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(watchForUpdates)
      .catch(() => undefined);
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

/** How long after opening or coming back a new version may still take over by itself. */
export const OPEN_MS = 10_000;
/** How often Sen asks for a new version while it's in front. */
export const CHECK_MS = 60_000;

/** Whether a ready version takes over now or is offered in a toast. */
export function whenReady(m: { sinceOpen: number; touched: boolean; formOpen: boolean }): 'switch' | 'offer' {
  return m.sinceOpen < OPEN_MS && !m.touched && !m.formOpen ? 'switch' : 'offer';
}

/** A form or a sheet on screen: something the person may be in the middle of. */
function formOpen() {
  return document.querySelector('form, [role="dialog"], [role="alertdialog"]') !== null;
}

function watchForUpdates(reg: ServiceWorkerRegistration) {
  const sw = navigator.serviceWorker;
  let openedAt = performance.now();
  let touched = false;
  let switching = false;

  const switchTo = (worker: ServiceWorker) => {
    if (switching) return;
    switching = true;
    sw.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    worker.postMessage('sen:update');
  };
  const ready = (worker: ServiceWorker | null) => {
    // The first install has no old version to leave: it just takes the page (sw.template.js).
    if (!worker || !sw.controller) return;
    const now = { sinceOpen: performance.now() - openedAt, touched, formOpen: formOpen() };
    if (whenReady(now) === 'switch') switchTo(worker);
    else toastUpdate(() => switchTo(worker));
  };
  const check = () => void reg.update().catch(() => undefined);

  ready(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') ready(worker);
    });
  });

  const opened = () => {
    if (document.visibilityState !== 'visible') return;
    openedAt = performance.now();
    touched = false;
    ready(reg.waiting);
    check();
  };
  document.addEventListener('visibilitychange', opened);
  // The shell's own event when Android brings Sen back (Capacitor's `resume`).
  document.addEventListener('resume', opened);
  const touch = () => {
    touched = true;
  };
  window.addEventListener('pointerdown', touch, { capture: true, passive: true });
  window.addEventListener('keydown', touch, { capture: true, passive: true });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') check();
  }, CHECK_MS);
}
