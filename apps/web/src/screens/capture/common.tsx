import { createContext, useContext, type ReactNode } from 'react';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { EmptyState, ErrorState } from '@/blocks/states';
import { captureReachable } from '@/shell/bridge';

/** Inside first run's step frame (B04, §9.5): a capture screen draws its body only, under first run's own bar. */
const Bare = createContext(false);
export function CaptureStep({ children }: { children: ReactNode }) {
  return <Bare.Provider value>{children}</Bare.Provider>;
}

/** A capture screen's frame. Outside the shell, in production, capture isn't there to show. */
export function CaptureScreen({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const bare = useContext(Bare);
  const body = captureReachable() ? (
    children
  ) : (
    <EmptyState line="Capture works in Sen's Android app, which reads your bank notifications on the phone." />
  );
  if (bare) return <>{body}</>;
  return <Screen bar={<AppBar title={title} action={action} />}>{body}</Screen>;
}

/** The shell didn't answer: say so, and offer to ask again. */
export function BridgeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4">
      <ErrorState
        title="Couldn't read capture's state"
        detail="The app's native side didn't answer. Try again; if it keeps failing, close Sen and open it again."
        action="Try again"
        onAction={onRetry}
      />
    </div>
  );
}

/** A section's heading inside a screen. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col pt-7" aria-label={title}>
      <h2 className="px-4 pb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** The screen's main action, in the bottom third, in reach of a thumb (patterns.md §7, Screens). */
export function BottomAction({ children }: { children: ReactNode }) {
  // in first run, the step frame's own actions hold the bottom
  const bare = useContext(Bare);
  if (bare) return <div className="flex flex-col gap-2 px-4 pt-3">{children}</div>;
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-background/95 px-4 pt-3 pb-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

/** An app's icon from the shell, or its initial on a muted disc when there's none. */
export function AppIcon({ icon, label }: { icon: string | null; label: string }) {
  return icon ? (
    <img src={icon} alt="" className="size-10" />
  ) : (
    <span className="flex size-10 items-center justify-center bg-muted text-base font-semibold text-icon">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}
