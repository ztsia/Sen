import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/blocks/states';
import { useDraft, useMe } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { longDay } from '@/lib/dates';
import { Loaded, useGo, useScreenSearch } from '../kit';

/**
 * Reading (screens.md `reading`): the image and *Reading receipt…*. You can leave; it waits in Review.
 * Nothing polls: the draft refreshes when the (made-up) reader says it changed.
 */
export default function Reading() {
  const go = useGo();
  const { id } = useScreenSearch();
  const q = useDraft(id ?? '');
  const me = useMe();
  const status = q.data?.status;
  useEffect(() => {
    if (id && status === 'read') go('confirm', { id }, { replace: true });
  }, [id, status]); // eslint-disable-line react-hooks/exhaustive-deps -- go is rebuilt each render
  const paused = me.data?.aiPausedUntil ?? null;
  const byHand = () => go('manual', { id }, { replace: true });

  return (
    <Screen bar={<AppBar title="Reading" />}>
      {/* no id: nothing to read, so say so rather than wait for ever (QA B03 run 2, finding 22) */}
      {!id ? (
        <EmptyState
          line="Sen can't find this receipt."
          action={{ label: 'Go Home', onSelect: () => go('home', {}, { replace: true }) }}
        />
      ) : (
        <Loaded q={q} what="the receipt">
          {(d) => {
            if (!d)
              return (
                <EmptyState
                  line="Sen can't find this receipt."
                  action={{ label: 'Go Home', onSelect: () => go('home', {}, { replace: true }) }}
                />
              );
            if (d.status === 'read') return <ReadingBody />;
            if (paused)
              return (
                <div className="px-4 pt-4">
                  <ErrorState
                    title="Reading is paused"
                    detail={`Sen can't read receipts until ${longDay(paused)}. Everything else works, and your photo is kept.`}
                    action="Enter it by hand"
                    onAction={byHand}
                  />
                </div>
              );
            if (d.status === 'failed')
              return (
                <div className="px-4 pt-4">
                  <ErrorState
                    title="Sen couldn't read this receipt"
                    detail="The photo is kept. You can type it in instead."
                    action="Enter it by hand"
                    onAction={byHand}
                  />
                </div>
              );
            return <ReadingBody leave={() => go('review')} />;
          }}
        </Loaded>
      )}
    </Screen>
  );
}

function ReadingBody({ leave }: { leave?: () => void }) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-2" role="status" aria-live="polite">
      <Skeleton className="mx-auto aspect-[3/4] w-full max-w-72" aria-hidden="true" />
      <p className="text-center text-lg font-semibold">Reading receipt…</p>
      <p className="text-center text-muted-foreground">You can leave. It waits in Review once it&rsquo;s read.</p>
      {leave ? (
        <Button variant="secondary" size="lg" onClick={leave}>
          Leave it in Review
        </Button>
      ) : null}
    </div>
  );
}
