import { useEffect, useMemo, useState } from 'react';
import { HeartPulseIcon, InboxIcon, TriangleAlertIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { NavRow } from '@/blocks/group';
import { Marks } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ErrorState, ListSkeleton } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { useCaptured } from '@/data/hooks';
import { backend } from '@/data';
import { momentLabel } from '@/lib/dates';
import type { CapturedView } from '@sen/core/sync';
import { SenCapture, captureReachable, type Beat } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { BottomAction, CaptureScreen } from './common';

const PAGE = 50;
/** How many of the phone's own events are looked through to find the ones a server row can be shared as. */
const HELD = 200;

const BEATS: Record<Beat['kind'], string> = {
  connected: 'Listener connected',
  disconnected: 'Listener disconnected',
  beat: 'Hourly check',
  boot: 'Phone started',
  updated: 'Sen updated',
  otp: 'Dropped a one-time code',
  unread: 'Skipped a notification Sen couldn’t read or store',
};

/** One notification as the list shows it: the server's, or still on this phone's outbox. */
interface Row {
  key: string;
  /** The phone's own id for it, when this phone has it: only these can be shared (*Share samples*). */
  phoneId: number | null;
  package: string;
  at: number;
  title: string | null;
  text: string | null;
  bigText: string | null;
  maybeOtp: boolean;
  /** `pending`: not synced yet; `refused`: the server won't take it; `synced`: the server has it. */
  state: 'pending' | 'refused' | 'synced';
  reason: string | null;
}

/** What identifies a notification across the phone and the server: the same app, moment and words. */
const same = (e: { package: string; title: string | null; text: string | null }, at: number) =>
  [e.package, at, e.title, e.text].join('\u0000');

/**
 * Captured on this phone (brief B02, B07): the server's `bank_events`, raw and masked, newest first, exactly
 * as the bank apps wrote them. Real data. In the shell, this phone's own events still waiting to sync show
 * first, marked *Not synced yet*, and one the server won't take is marked *Not accepted* with why. *Share
 * samples* sends the ones chosen as text through Android's share sheet, for a session to anonymise into
 * docs/notifications.md; only the phone can share, so only the notifications it holds can be ticked.
 */
export default function CapturedOnPhone() {
  const navigate = useNavigate();
  const server = useCaptured();
  const phone = useBridge(async () => {
    if (!captureReachable()) return null;
    const [waiting, held, apps, status] = await Promise.all([
      SenCapture.events({ limit: PAGE, pending: true }),
      SenCapture.events({ limit: HELD }),
      SenCapture.apps({ icons: false }),
      SenCapture.status(),
    ]);
    return { waiting, held, apps, status };
  });
  const [older, setOlder] = useState<{ events: CapturedView['events']; next: string | null } | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const first = server.data;
  // a fresh first page (after a change or a resume) starts the list over
  useEffect(() => setOlder(null), [first]);
  const label = useMemo(() => new Map(phone.data?.apps.apps.map((a) => [a.package, a.label])), [phone.data]);

  const rows = useMemo<Row[]>(() => {
    const held = new Map((phone.data?.held.events ?? []).map((e) => [same(e, e.postTime), e.id]));
    const onServer: Row[] = [...(first?.events ?? []), ...(older?.events ?? [])].map((e) => {
      const at = Date.parse(e.postedAt);
      return {
        key: e.id,
        phoneId: held.get(same(e, at)) ?? null,
        package: e.package,
        at,
        title: e.title,
        text: e.text,
        bigText: e.bigText,
        maybeOtp: e.maybeOtp,
        state: 'synced',
        reason: null,
      };
    });
    const have = new Set(onServer.map((r) => same(r, r.at)));
    const waiting: Row[] = (phone.data?.waiting.events ?? [])
      .filter((e) => !e.synced && !have.has(same(e, e.postTime)))
      .map((e) => ({
        key: `phone-${e.id}`,
        phoneId: e.id,
        package: e.package,
        at: e.postTime,
        title: e.title,
        text: e.text,
        bigText: e.bigText,
        maybeOtp: e.maybeOtp,
        state: e.refused ? 'refused' : 'pending',
        reason: e.refused ?? null,
      }));
    return [...waiting, ...onServer];
  }, [first, older, phone.data]);
  const next = older ? older.next : (first?.next ?? null);
  const shareable = rows.some((r) => r.phoneId !== null);

  const more = async () => {
    if (!next) return;
    const r = await (await backend()).captured(next);
    setOlder((o) => ({ events: [...(o?.events ?? []), ...r.events], next: r.next }));
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

  const loading = server.isPending && !rows.length;
  return (
    <CaptureScreen
      title="Captured on this phone"
      action={
        <Button variant="ghost" size="icon" aria-label="Heartbeat" onClick={() => void openBeats()}>
          <HeartPulseIcon />
        </Button>
      }
    >
      {loading ? <ListSkeleton rows={5} /> : null}
      {!loading ? (
        <div className="flex min-h-full flex-col">
          {server.isError ? (
            <div className="p-4 pb-0">
              <ErrorState
                title="Couldn't load the list from the server"
                detail={
                  rows.length
                    ? 'The notifications still waiting on this phone are below.'
                    : 'Check the connection and try again.'
                }
                action="Try again"
                onAction={() => void server.refetch()}
              />
            </div>
          ) : null}
          <p className="px-4 pt-2 pb-2 text-sm text-muted-foreground">
            {rows.length === 1 ? '1 notification' : `${rows.length}${next ? '+' : ''} notifications`}, newest first,
            numbers hidden.
          </p>
          {rows.length === 0 && !server.isError ? (
            <EmptyState
              icon={InboxIcon}
              title="Nothing captured yet"
              line="Notifications from your chosen apps appear here as they arrive."
              action={
                phone.data?.status.chosen.length
                  ? undefined
                  : {
                      label: 'Choose your apps',
                      onSelect: () => void navigate({ to: '/s/$', params: { _splat: 'settings/capture/apps' } }),
                    }
              }
            />
          ) : (
            <Card className="mx-4 gap-0 overflow-hidden py-0">
              <ul className="flex flex-col divide-y divide-border">
                {rows.map((e) => (
                  <EventRow
                    key={e.key}
                    e={e}
                    app={label.get(e.package) ?? e.package}
                    picking={picking}
                    picked={e.phoneId !== null && picked.has(e.phoneId)}
                    onPick={(on) =>
                      setPicked((p) => {
                        const n = new Set(p);
                        if (e.phoneId === null) return n;
                        if (on) n.add(e.phoneId);
                        else n.delete(e.phoneId);
                        return n;
                      })
                    }
                  />
                ))}
              </ul>
            </Card>
          )}
          {next ? (
            <div className="px-4 pt-2">
              <Button variant="outline" size="sm" onClick={() => void more()}>
                Show older
              </Button>
            </div>
          ) : null}
          {shareable ? (
            <BottomAction>
              {picking ? (
                <>
                  <Button onClick={() => void share()}>
                    {picked.size
                      ? `Share ${picked.size} ${picked.size === 1 ? 'sample' : 'samples'}`
                      : 'Tick the ones to share'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => (setPicking(false), setPicked(new Set()))}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setPicking(true)}>
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
            <NavRow
              key={`${b.at}-${i}`}
              title={
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
  e: Row;
  app: string;
  picking: boolean;
  picked: boolean;
  onPick: (on: boolean) => void;
}) {
  const id = `ev-${e.key}`;
  const body = (
    <ItemContent className="min-w-0 gap-1">
      <ItemDescription className="flex justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{app}</span>
        <span className="shrink-0 text-xs">{momentLabel(new Date(e.at))}</span>
      </ItemDescription>
      {e.title ? (
        <ItemTitle className="selectable w-full text-base wrap-anywhere whitespace-pre-line">{e.title}</ItemTitle>
      ) : null}
      {e.text ? <p className="selectable text-base wrap-anywhere whitespace-pre-line">{e.text}</p> : null}
      {e.bigText && e.bigText !== e.text ? (
        <p className="selectable text-sm wrap-anywhere whitespace-pre-line text-muted-foreground">{e.bigText}</p>
      ) : null}
      {e.maybeOtp ? (
        <p className="text-sm text-muted-foreground">Maybe a one-time code, so its numbers are hidden</p>
      ) : null}
      {e.state === 'pending' ? <Marks marks={['pending']} /> : null}
      {e.state === 'refused' ? (
        <p className="flex items-start gap-1 text-xs text-money-warning">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>Not accepted{e.reason ? `: ${e.reason}` : ''}</span>
        </p>
      ) : null}
    </ItemContent>
  );
  return (
    <li>
      {picking && e.phoneId !== null ? (
        <Item size="sm" className="relative min-h-16 flex-nowrap items-start rounded-none text-base">
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
