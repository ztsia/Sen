// Press feedback (patterns.md §8, D140): a ripple from the finger on everything tappable, in the first
// frame. One listener on the document, on pointerdown, since :active can come late on Android. The
// ripple is the pressed thing's own text colour, faint, clipped to its corners; under reduced motion it
// shows as a tint, with no spread. The CSS is in styles/motion.css.

const TAPPABLE =
  'button, summary, a[href], label[for], label:has(input, [role=checkbox], [role=switch], [role=radio]), [role=button], [role=tab], [role=radio], [role=menuitem], [role=menuitemradio], [role=option]';
// these draw their own response (a switch's thumb, a box's tick), or aren't a tap at all
const SKIP = '[data-slot=switch], [data-slot=checkbox], [data-no-press], input, textarea, select';

function host(target: EventTarget | null): HTMLElement | null {
  const el = (target as Element | null)?.closest?.<HTMLElement>(TAPPABLE);
  if (!el || el.matches(SKIP) || el.closest('[data-no-press]')) return null;
  if (el.matches(':disabled, [aria-disabled=true], [data-disabled]')) return null;
  return el;
}

function press(e: PointerEvent) {
  if (e.button !== 0 || !e.isPrimary) return;
  const el = host(e.target);
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  el.dataset.pressed = '';
  const clip = document.createElement('span');
  clip.className = 'press';
  clip.setAttribute('aria-hidden', 'true');
  const dot = document.createElement('span');
  // from the finger, big enough to reach the farthest corner
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const size = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
  dot.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
  clip.append(dot);
  el.append(clip);

  const shown = performance.now();
  const release = (ev: PointerEvent) => {
    window.removeEventListener('pointerup', release, true);
    window.removeEventListener('pointercancel', release, true);
    delete el.dataset.pressed;
    // a scroll that began on the row cancels the press: the ripple goes at once, so scrolling never flashes
    if (ev.type === 'pointercancel') {
      clip.remove();
      return;
    }
    // a quick tap still shows the spread for a moment before it fades
    const wait = Math.max(0, 120 - (performance.now() - shown));
    setTimeout(() => {
      clip.dataset.up = '';
      setTimeout(() => {
        clip.remove();
      }, 300);
    }, wait);
  };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
}

let installed = false;
/** Installs press feedback for the whole app, once. */
export function installPress() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerdown', press, { capture: true, passive: true });
}
