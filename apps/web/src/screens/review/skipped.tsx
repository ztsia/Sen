import { BellOffIcon, CircleCheckIcon } from 'lucide-react';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { toastUndo } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { runCommand, useSkipped } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded } from '../kit';
import { settled } from '@/lib/tap-guard';

/**
 * `skipped` (screens.md): did Sen throw a payment away by mistake? Notifications no template read and
 * that showed no sign of a payment (§6.2), one card each with *This was a payment*. The text is as the
 * app wrote it, with every digit outside an amount masked as stored (D121).
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
            <ul className="flex flex-col gap-3 px-4 pt-3 pb-8">
              {s.events.map((e) => (
                <li key={e.id}>
                  <Card
                    role="article"
                    aria-label={`${e.app}, ${momentLabel(new Date(e.at))}`}
                    className="gap-2 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <IconTile icon={BellOffIcon} />
                      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {e.app} · {momentLabel(new Date(e.at))}
                      </p>
                    </div>
                    <p className="selectable font-semibold whitespace-pre-line">{e.title}</p>
                    <p className="selectable line-clamp-2 text-sm whitespace-pre-line text-muted-foreground wrap-anywhere">
                      {e.text}
                    </p>
                    <Button
                      variant="secondary"
                      size="chip"
                      className="mt-1 self-start"
                      // the next notification slides into this place: a double tap restores one (QA B03 run 2, 21)
                      onClick={settled(
                        () =>
                          void runCommand({ type: 'event.restore', eventId: e.id }).then((r) =>
                            toastUndo(r.said, r.undo),
                          ),
                      )}
                    >
                      <CircleCheckIcon aria-hidden="true" />
                      This was a payment
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BellOffIcon}
              title="Nothing skipped"
              line="Notifications Sen sets aside will show here."
            />
          )
        }
      </Loaded>
    </Screen>
  );
}
