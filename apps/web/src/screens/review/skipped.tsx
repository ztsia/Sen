import { ItemGroup, ItemSeparator } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/blocks/states';
import { toastUndo } from '@/blocks/toast';
import { runCommand, useSkipped } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `skipped` (screens.md): did Sen throw a payment away by mistake? Notifications no template read and
 * that showed no sign of a payment (§6.2), each with *This was a payment*. The text is as the app wrote
 * it, with every digit outside an amount masked as stored (D121).
 */
export default function Skipped() {
  const q = useSkipped();
  return (
    <Screen bar={<AppBar title="Skipped notifications" />}>
      <p className="px-4 pt-2 text-sm text-muted-foreground">
        Notifications from your apps that didn't look like a payment. If one was, tell Sen.
      </p>
      <Loaded q={q} what="skipped notifications">
        {(s) =>
          s.events.length ? (
            <ItemGroup className="pt-2">
              {s.events.map((e, i) => (
                <div key={e.id}>
                  {i ? <ItemSeparator /> : null}
                  <article
                    className="flex flex-col gap-1 px-4 py-3"
                    aria-label={`${e.app}, ${momentLabel(new Date(e.at))}`}
                  >
                    <p className="text-sm text-muted-foreground">
                      {e.app} · {momentLabel(new Date(e.at))}
                    </p>
                    <p className="selectable font-medium whitespace-pre-line">{e.title}</p>
                    <p className="selectable whitespace-pre-line wrap-anywhere">{e.text}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-1 self-start"
                      onClick={() =>
                        void runCommand({ type: 'event.restore', eventId: e.id }).then((r) => toastUndo(r.said, r.undo))
                      }
                    >
                      This was a payment
                    </Button>
                  </article>
                </div>
              ))}
            </ItemGroup>
          ) : (
            <EmptyState line="Nothing skipped. Notifications Sen sets aside will show here." />
          )
        }
      </Loaded>
    </Screen>
  );
}
