import { useEffect, useRef } from 'react';
import type { AvatarState } from '@sen/looks';
import { useLook } from '@/theme/look';
import { useMode, useReducedMotion } from '@/theme/store';
import { addAvatar, dirtyAll, removeAvatar, type AvatarCanvas } from './avatar-loop';

/** Sen's avatar, drawn by the look in one of its eight states (D76). Decorative: what labels it is the button around it. */
export function Avatar({ state, size }: { state: AvatarState; size: number }) {
  const ref = useRef<AvatarCanvas>(null);
  const look = useLook();
  const mode = useMode();
  const reduced = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    c._size = size;
    c._dpr = dpr;
    addAvatar(c);
    return () => removeAvatar(c);
  }, [size]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c._look = look ?? undefined;
    c._state = state;
    c._mode = mode;
    c._dirty = true;
    dirtyAll();
  }, [look, state, mode, reduced]);
  return (
    <canvas ref={ref} className="av" data-state={state} style={{ width: size, height: size }} aria-hidden="true" />
  );
}
