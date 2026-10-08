import { useRouter } from '@tanstack/react-router';
import { ErrorState } from '@/blocks/states';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';

/**
 * A path that leads nowhere, or a screen that broke, inside the frame: the tab bar stays, and the
 * shared error state offers the way out (patterns.md §7, Error).
 */
export function Lost({ kind }: { kind: 'missing' | 'broken' }) {
  const router = useRouter();
  const goHome = () => void router.navigate({ to: '/', replace: true });
  return (
    <Screen bar={<AppBar title={kind === 'missing' ? 'Not found' : 'Something went wrong'} onBack={goHome} />}>
      <div className="px-4 pt-4" data-testid="lost">
        {kind === 'missing' ? (
          <ErrorState
            title="There's nothing here"
            detail="This link doesn't lead to a screen in Sen. Nothing of yours has changed."
            action="Go to Home"
            onAction={goHome}
          />
        ) : (
          <ErrorState
            title="This screen didn't open"
            detail="Something went wrong while showing it. Nothing of yours has changed."
            action="Go to Home"
            onAction={goHome}
          />
        )}
      </div>
    </Screen>
  );
}
