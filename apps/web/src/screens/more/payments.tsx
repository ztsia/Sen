import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PaymentFilters, PaymentRow } from '@sen/core/views';
import { DayHeader, ListRow } from '@/blocks/rows';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounts, useCategories, useInsights, useMe, usePayments } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant } from '@/lib/dates';
import { categoryIcon } from '../icons';
import { useGo, useScreenSearch } from '../kit';
import { FilterSheet } from './filter-sheet';

/**
 * Payments (screens.md `payments`): every transaction, newest first, by day, with search over payments,
 * merchants, notes and items, and filters for the cycle, account, category and Shared. A long list
 * (the scenario has about 900 rows) is virtualised: only the rows on screen are drawn.
 */
export default function Payments() {
  return (
    <Screen bar={<AppBar title="Payments" />}>
      <PaymentsBody />
    </Screen>
  );
}

interface Group {
  key: string;
  date: Date;
  spent: number;
  rows: PaymentRow[];
}
type Flat = { type: 'head'; day: number; key: string } | { type: 'row'; day: number; row: PaymentRow };

function groupByDay(rows: PaymentRow[]): Group[] {
  const groups: Group[] = [];
  for (const row of rows) {
    const key = dayOfInstant(row.at);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.rows.push(row);
      last.spent += row.spending;
    } else groups.push({ key, date: new Date(row.at), spent: row.spending, rows: [row] });
  }
  return groups;
}

type Picking = 'cycle' | 'account' | 'category' | null;

function PaymentsBody() {
  const search = useScreenSearch();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [cycle, setCycle] = useState<string | null>(search.cycle ?? null);
  const [accountId, setAccountId] = useState<string | null>(search.account ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(search.category ?? null);
  const [shared, setShared] = useState(!!search.shared);
  const [picking, setPicking] = useState<Picking>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  const me = useMe();
  const insights = useInsights();
  const accounts = useAccounts();
  const spendCats = useCategories('spend');
  const incomeCats = useCategories('income');

  const filters: PaymentFilters = {
    ...(cycle ? { cycle } : {}),
    ...(accountId ? { accountId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(shared ? { shared: true } : {}),
    ...(q ? { q } : {}),
  };
  const query = usePayments(filters);
  // while a new search loads, the last list stays up: no flash of skeletons on each keystroke
  const last = useRef(query.data);
  if (query.data) last.current = query.data;
  const data = query.data ?? last.current;

  const cycles = useMemo(
    () => [...(insights.data?.cycles ?? [])].sort((a, b) => b.start.localeCompare(a.start)),
    [insights.data],
  );
  const accountOptions = accounts.data?.accounts ?? [];
  const showAccount = !!me.data?.capture && accountOptions.length > 0;
  const categoryOptions = [...(spendCats.data ?? []), ...(incomeCats.data ?? [])];
  const nameOf = (list: { id: string; label: string }[], id: string | null) =>
    list.find((x) => x.id === id)?.label ?? null;

  const active = !!(cycle || accountId || categoryId || shared || q);
  const clear = () => {
    setText('');
    setQ('');
    setCycle(null);
    setAccountId(null);
    setCategoryId(null);
    setShared(false);
  };

  return (
    <PaymentsList
      controls={
        <div className="flex flex-col gap-3 px-4 pt-2 pb-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="payments-search" className="sr-only">
              Search payments
            </Label>
            <Input
              id="payments-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search, such as Grab or char kuey teow"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip on={!!cycle} onClick={() => setPicking('cycle')}>
              {cycle
                ? (nameOf(
                    cycles.map((c) => ({ id: c.id, label: c.label })),
                    cycle,
                  ) ?? 'Cycle')
                : 'All cycles'}
            </Chip>
            {showAccount ? (
              <Chip on={!!accountId} onClick={() => setPicking('account')}>
                {nameOf(accountOptions, accountId) ?? 'Any account'}
              </Chip>
            ) : null}
            <Chip on={!!categoryId} onClick={() => setPicking('category')}>
              {nameOf(categoryOptions, categoryId) ?? 'Any category'}
            </Chip>
            <Button
              variant={shared ? 'secondary' : 'outline'}
              aria-pressed={shared}
              onClick={() => setShared((s) => !s)}
            >
              Shared
            </Button>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {data
              ? `${data.rows.length} ${data.rows.length === 1 ? 'payment' : 'payments'}${active ? ' match' : ''}`
              : 'Loading'}
          </p>
          <FilterSheet
            open={picking === 'cycle'}
            onOpenChange={(o) => !o && setPicking(null)}
            title="Which cycle?"
            allLabel="All cycles"
            options={cycles.map((c) => ({ id: c.id, label: c.label }))}
            current={cycle}
            onPick={setCycle}
          />
          <FilterSheet
            open={picking === 'account'}
            onOpenChange={(o) => !o && setPicking(null)}
            title="Which account?"
            allLabel="Any account"
            options={accountOptions}
            current={accountId}
            onPick={setAccountId}
          />
          <FilterSheet
            open={picking === 'category'}
            onOpenChange={(o) => !o && setPicking(null)}
            title="Which category?"
            allLabel="Any category"
            options={categoryOptions}
            current={categoryId}
            onPick={setCategoryId}
          />
        </div>
      }
      rows={data?.rows ?? null}
      failed={query.isError && !data}
      retry={() => void query.refetch()}
      active={active}
      clear={clear}
    />
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <Button variant={on ? 'secondary' : 'outline'} onClick={onClick} className="max-w-full min-w-0">
      <span className="truncate">{children}</span>
      <ChevronDownIcon className="text-icon" aria-hidden="true" />
    </Button>
  );
}

const HEAD = 40;
const ROW = 64;

function PaymentsList({
  controls,
  rows,
  failed,
  retry,
  active,
  clear,
}: {
  controls: React.ReactNode;
  rows: PaymentRow[] | null;
  failed: boolean;
  retry: () => void;
  active: boolean;
  clear: () => void;
}) {
  const go = useGo();
  const [main, setMain] = useState<HTMLElement | null>(null);
  const [margin, setMargin] = useState(0);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  // the screen's own <main> scrolls (Screen), so the list borrows it as its scroll element
  const anchor = useCallback((el: HTMLDivElement | null) => setMain(el?.closest('main') ?? null), []);

  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const read = () => setMargin(el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groups = useMemo(() => groupByDay(rows ?? []), [rows]);
  const flat = useMemo(() => {
    const out: Flat[] = [];
    groups.forEach((g, day) => {
      out.push({ type: 'head', day, key: g.key });
      for (const row of g.rows) out.push({ type: 'row', day, row });
    });
    return out;
  }, [groups]);

  const v = useVirtualizer({
    count: flat.length,
    getScrollElement: () => main,
    estimateSize: (i) => (flat[i]?.type === 'head' ? HEAD : ROW),
    getItemKey: (i) => {
      const f = flat[i];
      return f ? (f.type === 'head' ? `h-${f.key}` : f.row.id) : i;
    },
    overscan: 8,
    scrollMargin: margin,
  });

  const items = v.getVirtualItems();
  const offset = v.scrollOffset ?? 0;
  // the day whose header has reached the top: the last item starting at or above the scroll position
  let current = items[0]?.index !== undefined ? (flat[items[0].index]?.day ?? 0) : 0;
  for (const it of items) if (it.start <= offset + 1) current = flat[it.index]?.day ?? current;
  const sticky = groups[current];

  return (
    <div ref={anchor}>
      <div ref={controlsRef}>{controls}</div>
      {failed ? (
        <EmptyState line="Couldn't load your payments." action={{ label: 'Try again', onSelect: retry }} />
      ) : rows === null ? (
        <ListSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          line={active ? 'No payments match.' : 'No payments yet.'}
          action={active ? { label: 'Clear the filters', onSelect: clear } : undefined}
        />
      ) : (
        <div className="relative w-full" style={{ height: v.getTotalSize() }}>
          {sticky ? (
            <div className="sticky top-0 z-[var(--z-index-sticky)] h-0" aria-hidden="true">
              <DayHeader date={sticky.date} spentSen={sticky.spent} />
            </div>
          ) : null}
          {items.map((it) => {
            const f = flat[it.index];
            if (!f) return null;
            const g = groups[f.day]!;
            return (
              <div
                key={it.key}
                data-index={it.index}
                ref={v.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${it.start - margin}px)` }}
              >
                {f.type === 'head' ? (
                  <DayHeader date={g.date} spentSen={g.spent} />
                ) : (
                  <ListRow
                    icon={categoryIcon(f.row.category)}
                    title={f.row.title}
                    secondary={[f.row.category, f.row.account, f.row.note].filter(Boolean).join(' · ')}
                    sen={f.row.amount}
                    kind={f.row.direction === 'in' ? 'in' : 'out'}
                    marks={f.row.marks}
                    onOpen={() => go('txn', { id: f.row.id })}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
