import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/blocks/sheet';
import { toastDone } from '@/blocks/toast';
import { SURFACES, SURFACE_GROUPS, Surface } from './surfaces';
import { Widgets } from './widgets';
import { JourneyOverlay, JourneysSheet } from './journeys-ui';
import { useCtx } from './use-ctx';
import { useNative } from './store';
import { useUi } from '@/frame/ui-store';

/** Everything the native stand-ins and journeys draw: the sheets, the shade over the app, the journey bar. */
export function NativeLayer() {
  const { sheet, shade, setSheet, setShade } = useNative();
  const ctx = useCtx();
  const go = ctx.go;
  return (
    <>
      <Sheet
        open={sheet === 'native'}
        onOpenChange={(o) => setSheet(o ? 'native' : null)}
        title="Native stand-ins"
        description="Android draws these outside the app. Each one here is a stand-in; tap it to do what the real one does."
      >
        <div className="flex flex-col gap-4 pb-4">
          <Button variant="outline" onClick={() => setSheet('widgets')}>
            Widgets S, M and L
          </Button>
          {SURFACE_GROUPS.map((g) => (
            <section key={g} aria-label={g} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{g}</h3>
              {SURFACES.filter((s) => s.group === g).map((s) => (
                <div key={s.id} className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">
                    {s.name}. {s.does}
                  </p>
                  <Surface id={s.id} ctx={ctx} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'widgets'}
        onOpenChange={(o) => setSheet(o ? 'widgets' : null)}
        title="Widgets"
        description="Small, Medium and Large, in each look, light and dark."
      >
        <Widgets ctx={ctx} />
      </Sheet>
      <JourneysSheet />
      {shade ? (
        <div className="safe-top fixed inset-x-0 top-0 z-[var(--z-index-dev)] mx-auto flex max-w-[480px] flex-col gap-2 p-2">
          <Surface id={shade} ctx={ctx} />
          <Button
            variant="secondary"
            size="sm"
            className="self-end"
            onClick={() => {
              setShade(null);
              // swiped away, a new merchant waits in Review (D22)
              if (shade === 'prompt-category') {
                useUi.getState().setSenOpen(false);
                go('review');
                toastDone('Swiped away: it waits in Review');
              }
            }}
          >
            <XIcon /> Swipe away
          </Button>
        </div>
      ) : null}
      <JourneyOverlay />
    </>
  );
}
