import { useEffect, useMemo, useState } from 'react';
import { HeartPulseIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { momentLabel } from '@/lib/dates';
import { SenCapture, type Beat, type CapturedEvent } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BottomAction, BridgeError, CaptureScreen } from './common';

const PAGE = 50;

const BEATS: Record<Beat['kind'], string> = {
  connected: 'Listener connected',
  disconnected: 'Listener disconnected',
  beat: 'Hourly check',
  boot: 'Phone started',
  updated: 'Sen updated',
  otp: 'Dropped a one-time code',
  unread: 'Skipped a notification Sen couldn’t read',
};

/**
 * Captured on this phone (brief B02, for the soak only; B07 replaces it): the outbox's raw events,
 * newest first, exactly as the bank apps wrote them. Real data, on the phone only. *Share samples*
 * sends the ones chosen as text through Android's share sheet, for a session to anonymise into
 * docs/notifications.md.
 */
export default function CapturedOnPhone() {
  const navigate = useNavigate();
  const first = useBridge(() =>
    Promise.all([SenCapture.events({ limit: PAGE }), SenCapture.apps({ icons: false }), SenCapture.status()]),
  );
  const [older, setOlder] = useState<CapturedEvent[]>([]);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const [first0, apps0, status] = first.data ?? [];
  // a fresh first page (after a resume) starts the list over
  useEffect(() => setOlder([]), [first0]);
  const events = useMemo(() => [...(first0?.events ?? []), ...older], [first0, older]);
  const total = first0?.total ?? 0;
  const label = useMemo(() => new Map(apps0?.apps.map((a) => [a.package, a.label])), [apps0]);

  const more = async () => {
    const last = events[events.length - 1];
    if (!last) return;
    const r = await SenCapture.events({ limit: PAGE, before: last.id });
    setOlder((o) => [...o, ...r.events]);
  };
  const share = async () => {
    if (!picked.size) {
      toastDone('Tick the notifications to share first.');
      return;
    }
    try {
      await SenCapture.shareSamples({ ids: [...picked] });
      setPicking(false);
      setPicked(new Set());
    } catch {
      toastDone("Couldn't open the share sheet. Try again.");
    }
  };
  const openBeats = async () => setBeats((await SenCapture.heartbeats({ limit: 200 })).beats);

  return (
    <CaptureScreen
      title="Captured on this phone"
      action={
        <Button variant="ghost" size="icon" aria-label="Heartbeat" onClick={() => void openBeats()}>
          <HeartPulseIcon />
        </Button>
      }
    >
      {first.error ? <BridgeError onRetry={first.reload} /> : null}
      {!first.data && !first.error ? <ListSkeleton rows={5} /> : null}
      {first.data ? (
        <div className="flex min-h-full flex-col">
          <p className="px-4 pt-2 pb-2 text-sm text-muted-foreground">
            {total === 1 ? '1 notification' : `${total} notifications`}, newest first, as the apps wrote them. They stay
            on this phone.
          </p>
          {events.length === 0 ? (
            <EmptyState
              line="Notifications from your chosen apps appear here as they arrive."
              action={
                status?.chosen.length
                  ? undefined
                  : {
                      label: 'Choose your apps',
                      onSelect: () => void navigate({ to: '/s/$', params: { _splat: 'settings/capture/apps' } }),
                    }
              }
            />
          ) : (
            <ul className="flex flex-col">
              {events.map((e) => (
                <EventRow
                  key={e.id}
                  e={e}
                  app={label.get(e.package) ?? e.package}
                  picking={picking}
                  picked={picked.has(e.id)}
                  onPick={(on) =>
                    setPicked((p) => {
                      const n = new Set(p);
                      if (on) n.add(e.id);
                      else n.delete(e.id);
                      return n;
                    })
                  }
                />
              ))}
            </ul>
          )}
          {events.length < total ? (
            <div className="px-4 pt-2">
              <Button variant="outline" onClick={() => void more()}>
                Show older
              </Button>
            </div>
          ) : null}
          {events.length ? (
            <BottomAction>
              {picking ? (
                <>
                  <Button size="lg" onClick={() => void share()}>
                    {picked.size
                      ? `Share ${picked.size} ${picked.size === 1 ? 'sample' : 'samples'}`
                      : 'Tick the ones to share'}
                  </Button>
                  <Button variant="ghost" onClick={() => (setPicking(false), setPicked(new Set()))}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="lg" variant="secondary" onClick={() => setPicking(true)}>
                  Share samples
                </Button>
              )}
            </BottomAction>
          ) : null}
        </div>
      ) : null}
      <Sheet
        open={beats !== null}
        onOpenChange={(o) => (o ? undefined : setBeats(null))}
        title="Heartbeat"
        description="When the listener connected, each hourly check, each restart, and each one-time code it dropped, newest first."
      >
        <div className="-mx-4 flex flex-col">
          {(beats ?? []).map((b, i) => (
            <SettingsRow
              key={`${b.at}-${i}`}
              label={
                (b.kind === 'otp' || b.kind === 'unread') && b.package
                  ? `${BEATS[b.kind]} from ${label.get(b.package) ?? b.package}`
                  : BEATS[b.kind]
              }
              value={`${momentLabel(new Date(b.at))}${b.kind === 'beat' ? (b.connected ? ' · listening' : ' · not connected') : ''}`}
            />
          ))}
        </div>
      </Sheet>
    </CaptureScreen>
  );
}

function EventRow({
  e,
  app,
  picking,
  picked,
  onPick,
}: {
  e: CapturedEvent;
  app: string;
  picking: boolean;
  picked: boolean;
  onPick: (on: boolean) => void;
}) {
  const id = `ev-${e.id}`;
  const body = (
    <ItemContent className="min-w-0 gap-1">
      <ItemDescription className="flex justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{app}</span>
        <span className="shrink-0">{momentLabel(new Date(e.postTime))}</span>
      </ItemDescription>
      {e.title ? <ItemTitle className="selectable w-full text-base wrap-anywhere">{e.title}</ItemTitle> : null}
      {e.text ? <p className="selectable text-base wrap-anywhere">{e.text}</p> : null}
      {e.bigText && e.bigText !== e.text ? (
        <p className="selectable text-sm wrap-anywhere text-muted-foreground">{e.bigText}</p>
      ) : null}
      {false ? (
        <p className="text-sm text-muted-foreground">Maybe a one-time code, so its numbers are hidden</p>
      ) : null}
    </ItemContent>
  );
  return (
    <li>
      {picking ? (
        <Item size="sm" className="relative min-h-16 flex-nowrap items-start rounded-none text-base active:bg-accent">
          <Checkbox
            id={id}
            checked={picked}
            onCheckedChange={(v) => onPick(v === true)}
            className="relative z-[1] mt-1"
          />
          <label htmlFor={id} className="min-w-0 flex-1 after:absolute after:inset-0">
            {body}
          </label>
        </Item>
      ) : (
        <Item size="sm" className="min-h-16 rounded-none text-base">
          {body}
        </Item>
      )}
    </li>
  );
}
