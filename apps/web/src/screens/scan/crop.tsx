import { Button } from '@/components/ui/button';
import { EmptyState } from '@/blocks/states';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useGo, useScreenSearch } from '../kit';

const CORNERS = ['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'];

/**
 * Crop (screens.md `scan`, browser path): a stand-in. The picked image isn't kept by the made-up data,
 * so a fixed frame shows where the corners go; B15 makes them draggable.
 */
export default function Crop() {
  const go = useGo();
  const { id } = useScreenSearch();
  if (!id)
    return (
      <Screen bar={<AppBar title="Adjust the photo" />}>
        <EmptyState
          line="Pick a photo first."
          action={{ label: 'Scan a receipt', onSelect: () => go('scan', {}, { replace: true }) }}
        />
      </Screen>
    );
  return (
    <Screen bar={<AppBar title="Adjust the photo" />} className="flex flex-col pb-0">
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
        <div
          className="relative mx-auto aspect-[3/4] w-full max-w-72 rounded-md bg-muted"
          role="img"
          aria-label="Your photo, with a handle on each corner"
        >
          {CORNERS.map((c) => (
            <span
              key={c}
              aria-hidden="true"
              className={`absolute ${c} m-2 size-6 rounded-full border-2 border-background bg-primary shadow`}
            />
          ))}
          <span aria-hidden="true" className="absolute inset-5 rounded-sm border-2 border-dashed border-primary/60" />
        </div>
        <p className="text-center text-sm text-muted-foreground">Adjusting the corners arrives with the scanner.</p>
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2 bg-background px-4 py-3">
        <Button size="lg" onClick={() => go('reading', { id }, { replace: true })}>
          Use this
        </Button>
        <Button size="lg" variant="ghost" onClick={() => go('scan', {}, { replace: true })}>
          Take another
        </Button>
      </div>
    </Screen>
  );
}
