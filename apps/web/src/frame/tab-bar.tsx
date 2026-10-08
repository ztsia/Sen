import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { TABS, type IconTab, type Look, type Mode } from '@sen/looks';
import { LookMarkup } from '@/components/look/look-markup';
import { useLongPress } from '@/lib/long-press';
import { useSvgId } from '@/lib/uid';
import { useLook } from '@/theme/look';
import { useMode, useReducedMotion } from '@/theme/store';
import type { TabId } from '@/screens/registry';

const PATHS: Record<TabId, '/' | '/review' | '/insights' | '/more'> = { home: '/', review: '/review', insights: '/insights', more: '/more' };

/** Review's badge text: the count, up to 99+ (D83). */
export const badgeText = (n: number) => (n > 99 ? '99+' : String(n));
/** How the badge is read out (patterns.md §6). */
export const badgeLabel = (n: number) => `${n > 99 ? 'More than 99' : n} to review`;

interface Props {
  /** The tab whose screen is showing, or none during a pushed screen of no tab. */
  active: TabId | null;
  /** Needs you only (D72). */
  reviewCount: number;
  onScan: () => void;
  onScanMore: () => void;
}

/**
 * The tab bar: Home · Review · Scan · Insights · More (D68), drawn by the look on the shared outlines
 * (D80). The active tab is marked three ways: the look's active icon, its indicator and aria-current.
 * Leaving Home pushes one history step; moving between the other tabs replaces it, so back on any
 * tab but Home goes to Home, and back on Home leaves (patterns.md §6).
 */
export function TabBar({ active, reviewCount, onScan, onScanMore }: Props) {
  const look = useLook();
  const mode = useMode();
  const reduced = useReducedMotion();
  const uid = useSvgId('tb');
  const bar = useRef<HTMLElement>(null);
  const prev = useRef<TabId | null>(active);
  const [fresh, setFresh] = useState<TabId | null>(null);
  const scan = useLongPress(onScan, onScanMore);
  const index = active ? TABS.findIndex(([k]) => k === active) : -1;

  // a change of tab plays the look's own motion; reduced motion settles straight to the new tab
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = active;
    if (!active || from === active || reduced) return;
    setFresh(active);
    const t = window.setTimeout(() => setFresh(null), 1900);
    const el = bar.current;
    if (el && look?.tabs.switch) {
      const fromEl = from ? el.querySelector<HTMLElement>(`[data-k="${from}"]`) : null;
      const toEl = el.querySelector<HTMLElement>(`[data-k="${active}"]`);
      if (toEl) look.tabs.switch(el, fromEl, toEl);
    }
    return () => window.clearTimeout(t);
  }, [active, look, reduced]);

  return (
    <nav ref={bar} className="tabbar" aria-label="Tabs" data-on={active ?? ''} style={{ ['--i' as string]: Math.max(0, index) }}>
      {look?.tabs.bar ? <LookMarkup html={look.tabs.bar(mode, `${uid}b`)} /> : null}
      <span className="tab-ind" aria-hidden="true" hidden={index < 0} dangerouslySetInnerHTML={{ __html: look?.tabs.ind ? look.tabs.ind(mode, `${uid}i`) : '' }} />
      {TABS.map(([k, label]) => {
        if (k === 'scan')
          return (
            <button key={k} type="button" className="tab tab-scan" data-k="scan" aria-label="Scan a receipt" {...scan}>
              <span className={look ? 'scanbtn cs' : 'scanbtn'}>{look ? <LookMarkup html={look.tabs.scan(mode, `${uid}s`)} /> : null}</span>
              <span className="tl" aria-hidden="true">
                {label}
              </span>
            </button>
          );
        const on = k === active;
        return (
          <Link
            key={k}
            to={PATHS[k]}
            replace={active !== null && active !== 'home' && k !== 'home'}
            className={`tab${on ? ' on' : ''}${fresh === k ? ' fresh' : ''}`}
            data-k={k}
            aria-current={on ? 'page' : undefined}
          >
            <TabIcon look={look} k={k} mode={mode} uid={`${uid}${k}`} />
            <span className="tl">{label}</span>
            {k === 'review' && reviewCount > 0 ? <ReviewBadge look={look} count={reviewCount} mode={mode} uid={`${uid}bd`} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ look, k, mode, uid }: { look: Look | null; k: IconTab; mode: Mode; uid: string }) {
  if (!look) return <span className="ti" aria-hidden="true" />;
  return (
    <span className="ti" aria-hidden="true">
      <span className="i-off" dangerouslySetInnerHTML={{ __html: look.tabs.icon(k, false, mode, `${uid}0`) }} />
      <span className="i-on" dangerouslySetInnerHTML={{ __html: look.tabs.icon(k, true, mode, `${uid}1`) }} />
    </span>
  );
}

function ReviewBadge({ look, count, mode, uid }: { look: Look | null; count: number; mode: Mode; uid: string }) {
  const text = badgeText(count);
  return (
    <>
      <span className="sr-only">, {badgeLabel(count)}</span>
      {look?.tabs.badge ? (
        <span className="badge cb" aria-hidden="true" data-testid="review-badge" data-count={text} dangerouslySetInnerHTML={{ __html: look.tabs.badge(text, mode, uid) }} />
      ) : (
        <span className="badge" aria-hidden="true" data-testid="review-badge" data-count={text}>
          {text}
        </span>
      )}
    </>
  );
}
