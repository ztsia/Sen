import type { AvatarState, Look, Mode } from '@sen/looks';
import { reducedMotionNow } from '@/theme/store';

// One loop draws every avatar on the page, ported from the design engine's (engine.js, AV). It draws
// at about 30 frames a second, skips canvases off screen, and under reduced motion draws each state
// once, as a still frame, and nothing loops (patterns.md §8).
export interface AvatarCanvas extends HTMLCanvasElement {
  _look?: Look;
  _state?: AvatarState;
  _mode?: Mode;
  _size?: number;
  _dpr?: number;
  _vis?: boolean;
  _dirty?: boolean;
}

const set = new Set<AvatarCanvas>();
let raf = 0;
let t0 = 0;
let last = 0;
const io =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            const c = e.target as AvatarCanvas;
            c._vis = e.isIntersecting;
            if (e.isIntersecting) c._dirty = true;
          }),
        { rootMargin: '80px' },
      )
    : null;

/** The still frame a state settles to under reduced motion: two seconds in, when every look's motion has shown its state. */
export const STILL_T = 2.2;

function draw(c: AvatarCanvas, t: number) {
  const s = c._size ?? 0;
  const ctx = c.getContext('2d');
  if (!ctx || !c._look || !c._state || !c._mode) return;
  const d = c._dpr ?? 1;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, s, s);
  c._look.avatar.draw(ctx, s, t, c._state, c._mode);
}

function loop(now: number) {
  const t = (now - t0) / 1000;
  if (now - last > 32) {
    last = now;
    const still = reducedMotionNow();
    for (const c of set) {
      if (!c.isConnected) {
        set.delete(c);
        continue;
      }
      if (c._vis === false) continue;
      if (still && !c._dirty) continue;
      draw(c, still ? STILL_T : t);
      c._dirty = false;
    }
  }
  raf = set.size ? requestAnimationFrame(loop) : 0;
}

export function addAvatar(c: AvatarCanvas) {
  set.add(c);
  io?.observe(c);
  c._dirty = true;
  if (!raf) {
    if (!t0) t0 = performance.now();
    raf = requestAnimationFrame(loop);
  }
}
export function removeAvatar(c: AvatarCanvas) {
  set.delete(c);
  io?.unobserve(c);
}
/** Redraw every avatar once, after a change the loop can't see (reduced motion turned on). */
export function dirtyAll() {
  for (const c of set) c._dirty = true;
  if (!raf && set.size) raf = requestAnimationFrame(loop);
}
