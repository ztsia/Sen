import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { loadLook } from '@sen/looks';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar } from '@/components/look/avatar';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { LOOK_IDS, LOOK_NAMES, type LookId } from '@/looks/ids';
import { useReducedMotion, useTheme } from '@/theme/store';
import { useGo } from '../kit';
import { nextLook } from './logic';

/** The crossfade, in ms. Reduced motion gets exactly this (patterns.md §9); each look's own arrival is B14's. */
export const CROSSFADE_MS = 250;

/**
 * `new-look` (screens.md, patterns.md §9, D77, D84): the shared frame of the quarterly reveal. The old
 * look is the one on show when this opens; the new one is the next in the pool. It arrives in a
 * 250 ms crossfade (a view transition, so the old look fades into the new), then the card: the look’s
 * name, Sen’s new avatar, *Keep it*, *Go back* and *Change each quarter*. Either choice lands on Home.
 * The theme store has no “changes each quarter” flag yet, so the switch is local to this screen and
 * only says what would be pinned (B14 stores it).
 */
export default function NewLook() {
  const go = useGo();
  const setLook = useTheme((s) => s.setLook);
  const current = useTheme((s) => s.look);
  const reduced = useReducedMotion();
  // the look this screen was opened from, and the one it shows
  const [old] = useState<LookId>(current);
  const [fresh] = useState<LookId>(() => nextLook(LOOK_IDS, old));
  const [arrived, setArrived] = useState(false);
  const [quarterly, setQuarterly] = useState(true);
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    const arrive = () => {
      setLook(fresh);
      return new Promise<void>((done) => {
        // the store switches once the look's code has arrived; wait for it, then a frame to paint
        const off = useTheme.subscribe((s) => {
          if (s.look === fresh) {
            off();
            requestAnimationFrame(() => done());
          }
        });
        if (useTheme.getState().look === fresh) {
          off();
          done();
        }
      });
    };
    loadLook(fresh).then(
      () => {
        if (!live) return;
        const doc = document as Document & {
          startViewTransition?: (cb: () => Promise<void>) => unknown;
        };
        const done = () => {
          if (live) flushSync(() => setArrived(true));
        };
        if (doc.startViewTransition && !window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches) {
          doc.startViewTransition(async () => {
            await arrive();
            done();
          });
        } else void arrive().then(done);
      },
      () => setArrived(true), // offline and the look isn't here: the card still works on the old one
    );
    return () => {
      live = false;
    };
  }, [fresh, setLook]);

  useEffect(() => {
    if (arrived) keep.current?.focus();
  }, [arrived]);

  const land = (goBack: boolean) => {
    if (goBack) setLook(old);
    go('home', {}, { replace: true });
  };

  const name = LOOK_NAMES[fresh];
  return (
    <Screen bar={<AppBar title="A new look" onBack={() => land(false)} />}>
      <style>{`::view-transition-group(root){animation-duration:${CROSSFADE_MS}ms}`}</style>
      <div className="flex min-h-full flex-col items-center gap-6 px-4 pt-8 text-center">
        <p role="status" className="sr-only">
          {arrived ? `Sen has a new look: ${name}` : ''}
        </p>
        <div
          className="flex size-40 items-center justify-center"
          style={reduced ? undefined : { opacity: arrived ? 1 : 0, transition: `opacity ${CROSSFADE_MS}ms` }}
        >
          <Avatar state="resting" size={128} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Sen has a new look for this quarter</p>
          <h2 className="text-4xl font-semibold">{name}</h2>
        </div>
        <label className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-base">
          <span>
            Change each quarter
            <span className="block text-sm text-muted-foreground">
              {quarterly ? 'A new look every quarter.' : `Stays on ${name} or the one you keep.`}
            </span>
          </span>
          <Switch checked={quarterly} onCheckedChange={setQuarterly} />
        </label>
        <div className="mt-auto flex w-full flex-col gap-2 pb-4">
          <Button ref={keep} disabled={!arrived} onClick={() => land(false)}>
            Keep it
          </Button>
          <Button variant="outline" size="sm" disabled={!arrived} onClick={() => land(true)}>
            Go back
          </Button>
          <p className="pt-2 text-sm text-muted-foreground">You can change this any time in Settings → Appearance</p>
        </div>
      </div>
    </Screen>
  );
}
