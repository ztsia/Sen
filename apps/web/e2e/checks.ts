import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// What can be measured on a screen is checked by script, on every screen in every look and mode, every
// run (D137): what a person shouldn't have to spot. The catalogue runs them all on each entry; the
// journeys run the cover check at every screenshot, where toasts happen.

export type CheckId = 'axe' | 'target' | 'clipped' | 'overlap' | 'covered' | 'keyboard' | 'focus';
export interface Finding {
  check: CheckId;
  /** What and where, in one line: `button "Save" 120×40 under div.toast`. */
  detail: string;
}

/** The interactive elements patterns.md §8 sizes: the selector `smallTargets`, overlap and cover all share. */
const TARGETS =
  'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
/** What the keyboard check types into. */
const FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="hidden"]):not([type="range"]):not([type="color"]):not([type="image"]), textarea';
/** The height Android leaves a 844 px screen when the keyboard is open. */
const KEYBOARD_HEIGHT = 508;
const FOCUS_STOPS = 30;

/** Every visible interactive element under 48 px on either side, as "tag "name" w×h" (patterns.md §8). */
export const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const sel =
      'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return false;
        if (el.closest('.sr-only, [aria-hidden="true"]')) return false;
        // the dev panel's handle: previews only, a strip in the side gutter
        if (el.hasAttribute('data-dev-handle')) return false;
        // a toggle group's own box holds its toggles, each a target of its own
        if (el.matches('[data-slot="toggle-group"]')) return false;
        // a checkbox in a row's <label> is tapped by the whole row (split's items, patterns.md §7): the
        // label's box is the target, as it is for a finger
        const box = el.closest('label')?.getBoundingClientRect() ?? r;
        // a control drawn smaller keeps a 48 px target through `tap`'s invisible extension (D129)
        const tap = getComputedStyle(el, '::after');
        const w = Math.max(box.width, tap.content !== 'none' ? parseFloat(tap.width) || 0 : 0);
        const h = Math.max(box.height, tap.content !== 'none' ? parseFloat(tap.height) || 0 : 0);
        return w < 47.5 || h < 47.5;
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`,
      );
  });

type ProbeKind =
  'clipped' | 'overlap' | 'covered' | 'fields' | 'focusField' | 'reach' | 'tabReset' | 'tabStep' | 'save' | 'restore';
interface Probe {
  kind: ProbeKind;
  /** Which field, for the keyboard check. */
  i?: number;
  targets: string;
  fields: string;
}
interface ScrollState {
  win: [number, number];
  boxes: [Element, number, number][];
}
interface Marked extends Window {
  __senScroll?: ScrollState;
  __senSeen?: Set<Element>;
}

/**
 * Everything the checks measure in the page, in one function so the helpers are written once (it runs
 * in the browser, so it can't import anything). Returns lines for the findings, or a count.
 */
const probe = (a: Probe): string[] | number => {
  const w = window as Marked;
  const out: string[] = [];
  const SKIP = '.sr-only, [aria-hidden="true"]';
  const round = (n: number) => Math.round(n);
  const tag = (el: Element) => el.tagName.toLowerCase();
  const textOf = (el: Element) => {
    const labelled = (el as HTMLInputElement).labels?.[0]?.textContent;
    const raw =
      el.getAttribute('aria-label') ||
      labelled ||
      (el as HTMLInputElement).placeholder ||
      el.textContent ||
      el.getAttribute('name') ||
      '';
    return raw.replace(/\s+/g, ' ').trim().slice(0, 30);
  };
  const size = (r: DOMRect) => `${round(r.width)}×${round(r.height)}`;
  /** `button "Save" 120×40` */
  const label = (el: Element) => `${tag(el)} "${textOf(el)}" ${size(el.getBoundingClientRect())}`;
  /** What sits on top of a target: `div.toast "Saved"`, by the name the app gave it, else its first class. */
  const cover = (el: Element) => {
    const id =
      el.getAttribute('data-slot') ||
      el.getAttribute('data-testid') ||
      el.id ||
      (typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '');
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return `${tag(el)}${id ? `.${id}` : ''}${t ? ` "${t}"` : ''}`;
  };
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || el.closest(SKIP)) return false;
    // not drawn at all (display, visibility, opacity, or the inside of a closed <details>)
    if (!el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return false;
    // the dev panel's handle: previews only, a strip in the side gutter
    return !el.hasAttribute('data-dev-handle');
  };
  const isTarget = (el: Element) => shown(el) && !el.matches('[data-slot="toggle-group"]');
  type Box = { l: number; t: number; r: number; b: number };
  const box = (r: DOMRect | Box): Box =>
    'left' in r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : { l: r.l, t: r.t, r: r.r, b: r.b };
  /**
   * The box with the ancestors that cut it off applied: those that scroll or hide their overflow, sideways
   * and, when `down` is set, vertically too. Null when nothing of it is left to see. A fixed box ignores
   * them.
   */
  const clip = (el: Element, from: Box, down: boolean): Box | null => {
    const b = { ...from };
    for (let n: Element | null = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (n !== el) {
        const r = n.getBoundingClientRect();
        const cuts = (v: string) => v === 'hidden' || v === 'clip' || v === 'scroll' || v === 'auto';
        if (cuts(cs.overflowX)) {
          b.l = Math.max(b.l, r.left);
          b.r = Math.min(b.r, r.right);
        }
        if (down && cuts(cs.overflowY)) {
          b.t = Math.max(b.t, r.top);
          b.b = Math.min(b.b, r.bottom);
        }
      }
      if (cs.position === 'fixed') break;
    }
    return b.r > b.l && b.b > b.t ? b : null;
  };
  /** Whether an element is a scroll container: it holds the page's content rather than being a control. */
  const scrolls = (el: Element) => {
    const cs = getComputedStyle(el);
    const by = (v: string) => v === 'auto' || v === 'scroll';
    return (
      (by(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) ||
      (by(cs.overflowX) && el.scrollWidth > el.clientWidth + 1)
    );
  };
  /**
   * The layer an element lives in: pinned (a fixed or sticky box around it), the content of the scroller
   * it sits in, or the page. What scrolls under what is pinned or floats above it is `covered`'s to find.
   */
  const layer = (el: Element): Element | string => {
    for (let n: Element | null = el; n; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return 'pinned';
      if (n !== el && scrolls(n)) return n;
    }
    return 'page';
  };
  /** The boxes of the lines an element's own text is set in, each the height of the font: line spacing
   *  tighter than the font (leading-none) overlaps the lines' own boxes, and the glyphs don't. */
  const ownText = (el: Element) => {
    const lines: Box[] = [];
    const cs = getComputedStyle(el);
    const own = el.getBoundingClientRect();
    const hides = (v: string) => v === 'hidden' || v === 'clip';
    for (const n of el.childNodes) {
      if (n.nodeType !== Node.TEXT_NODE || !n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const fs = parseFloat(cs.fontSize) || 0;
      for (const r of range.getClientRects()) {
        if (r.width === 0 || r.height === 0) continue;
        const mid = (r.top + r.bottom) / 2;
        const line = { l: r.left, t: Math.max(r.top, mid - fs / 2), r: r.right, b: Math.min(r.bottom, mid + fs / 2) };
        // lines a clamp or a hidden edge cuts off aren't seen (a clamped paragraph keeps its other lines' boxes)
        if (hides(cs.overflowY)) {
          line.t = Math.max(line.t, own.top);
          line.b = Math.min(line.b, own.bottom);
        }
        if (hides(cs.overflowX)) {
          line.l = Math.max(line.l, own.left);
          line.r = Math.min(line.r, own.right);
        }
        if (line.r > line.l && line.b > line.t) lines.push(line);
      }
    }
    return lines;
  };
  const touch = (x: Box, y: Box) =>
    Math.min(x.r, y.r) - Math.max(x.l, y.l) > 2 && Math.min(x.b, y.b) - Math.max(x.t, y.t) > 2;
  const depth = (x: Box, y: Box) =>
    `${round(Math.min(x.r, y.r) - Math.max(x.l, y.l))}×${round(Math.min(x.b, y.b) - Math.max(x.t, y.t))}`;

  const targets = () => [...document.querySelectorAll(a.targets)].filter(isTarget);
  const scrollers = () =>
    [document.documentElement, ...document.querySelectorAll('*')].filter(
      (e) => e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth,
    );
  // not innerWidth: a phone's layout viewport widens to take in whatever sticks out sideways
  const screenWidth = () => document.documentElement.clientWidth;
  const inView = (r: DOMRect) =>
    r.left >= -1 && r.top >= -1 && r.right <= screenWidth() + 1 && r.bottom <= window.innerHeight + 1;
  /** What is on top at the middle of a target, when it isn't the target or part of it; null when it is. */
  const coveredBy = (el: Element): Element | null | undefined => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    if (!top) return undefined; // off the screen: not tested here
    if (top === el || el.contains(top)) return null;
    // a label names its control, and a tap on it is a tap on the control
    const lab = top.closest('label');
    if (lab && (lab.contains(el) || (lab as HTMLLabelElement).control === el)) return null;
    return top;
  };
  /** The cover after trying again from where scrolling would put the target; null when it is free. */
  const covering = (el: Element) => {
    const first = coveredBy(el);
    if (first === null) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    return coveredBy(el) || null;
  };

  if (a.kind === 'save') {
    w.__senScroll = {
      win: [window.scrollX, window.scrollY],
      boxes: scrollers().map((e) => [e, e.scrollLeft, e.scrollTop]),
    };
    return 0;
  }
  if (a.kind === 'restore') {
    const s = w.__senScroll;
    delete w.__senScroll;
    for (const [e, x, y] of s?.boxes ?? []) {
      e.scrollLeft = x;
      e.scrollTop = y;
    }
    if (s) window.scrollTo(s.win[0], s.win[1]);
    return 0;
  }

  if (a.kind === 'clipped') {
    for (const el of document.querySelectorAll('body *')) {
      if (!shown(el)) continue;
      const lines = ownText(el);
      if (!lines.length) continue;
      const cs = getComputedStyle(el);
      const here = label(el);
      // cut off by its own box, unless it ends in an ellipsis or a line clamp on purpose
      const hidden = (v: string) => v === 'hidden' || v === 'clip';
      const onPurpose = cs.textOverflow === 'ellipsis' || cs.getPropertyValue('-webkit-line-clamp') !== 'none';
      if (!onPurpose) {
        if (hidden(cs.overflowX) && el.scrollWidth > el.clientWidth + 1)
          out.push(`${here} text cut off sideways (content ${el.scrollWidth} px in ${el.clientWidth} px)`);
        else if (hidden(cs.overflowY) && el.scrollHeight > el.clientHeight + 1)
          out.push(`${here} text cut off below (content ${el.scrollHeight} px in ${el.clientHeight} px)`);
      }
      // past the screen's side, as far as a scroller or a hidden edge around it lets it show
      const all = lines.reduce((m, l) => ({
        l: Math.min(m.l, l.l),
        t: Math.min(m.t, l.t),
        r: Math.max(m.r, l.r),
        b: Math.max(m.b, l.b),
      }));
      const seen = clip(el, all, false);
      if (seen && (seen.l < -1 || seen.r > screenWidth() + 1))
        out.push(
          `${here} text runs past the ${seen.l < -1 ? 'left' : 'right'} edge (x ${round(seen.l)} to ${round(seen.r)} of ${screenWidth()})`,
        );
    }
    return out;
  }

  if (a.kind === 'overlap') {
    const seen = (el: Element) => clip(el, box(el.getBoundingClientRect()), true);
    const hit = (kind: string, x: Element, y: Element, bx: Box[], by: Box[]) => {
      if (x.contains(y) || y.contains(x)) return;
      // something that scrolls under a fixed bar, or has a button floating over it, is covered, not overlapped
      if (layer(x) !== layer(y)) return;
      for (const p of bx)
        for (const q of by)
          if (touch(p, q)) {
            out.push(`${kind} ${label(x)} overlaps ${label(y)} by ${depth(p, q)}`);
            return;
          }
    };
    // a scroll container with a tab stop (for the keyboard) holds controls; it isn't one
    // (nor is anything holding other controls, such as main or a card: its parts are what overlap)
    const ts = targets().filter((el) => !scrolls(el) && !el.querySelector(a.targets) && seen(el));
    for (let i = 0; i < ts.length; i++)
      for (let j = i + 1; j < ts.length; j++) {
        const x = ts[i]!;
        const y = ts[j]!;
        hit('target', x, y, [seen(x)!], [seen(y)!]);
      }
    const texts = [...document.querySelectorAll('body *')]
      .filter((el) => shown(el))
      .map((el) => ({ el, lines: ownText(el) }))
      .filter((t) => t.lines.length > 0 && seen(t.el));
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++)
        hit('text', texts[i]!.el, texts[j]!.el, texts[i]!.lines, texts[j]!.lines);
    return out;
  }

  if (a.kind === 'covered') {
    const saved = [
      window.scrollX,
      window.scrollY,
      scrollers().map((e) => [e, e.scrollLeft, e.scrollTop] as const),
    ] as const;
    for (const el of targets()) {
      // a disabled control takes no taps (pointer-events: none), so nothing covers it
      if (getComputedStyle(el).pointerEvents === 'none') continue;
      const over = covering(el);
      // a "Simulated: …" toast stands in, in previews, for what Android itself would do; a phone never
      // shows it
      if (over?.closest('[data-sonner-toast]')?.textContent?.trim().startsWith('Simulated:')) continue;
      if (over) out.push(`${label(el)} under ${cover(over)}`);
    }
    for (const [e, x, y] of saved[2]) {
      e.scrollLeft = x;
      e.scrollTop = y;
    }
    window.scrollTo(saved[0], saved[1]);
    return out;
  }

  // the keyboard check
  const fields = () => [...document.querySelectorAll<HTMLInputElement>(a.fields)].filter(isTarget);
  if (a.kind === 'fields') return Math.min(fields().length, 6);
  if (a.kind === 'focusField') {
    fields()[a.i ?? 0]?.focus({ preventScroll: true });
    return 0;
  }
  if (a.kind === 'reach') {
    const field = fields()[a.i ?? 0];
    if (!field) return out;
    /** In the screen once scrolled to, and not under something. */
    const reach = (el: Element) => {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      if (!inView(r))
        out.push(
          `${label(el)} out of reach: ${round(r.top)} to ${round(r.bottom)} in a ${window.innerHeight} px screen`,
        );
      else if (getComputedStyle(el).pointerEvents !== 'none') {
        const over = coveredBy(el);
        if (over) out.push(`${label(el)} under ${cover(over)}`);
      }
    };
    reach(field);
    // the form's main button: its submit, else the last one that can be pressed in the form or sheet
    const scope = field.form ?? field.closest('[role="dialog"], [role="alertdialog"]');
    const buttons = scope
      ? [...scope.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && shown(b))
      : [];
    const main = scope?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? buttons[buttons.length - 1];
    if (main) reach(main);
    return out;
  }

  // the focus check: Tab from the top, and look at what is focused
  if (a.kind === 'tabReset') {
    // the browser carries on from where focus last was; focusing the body first starts it from the top
    (document.activeElement as HTMLElement | null)?.blur();
    const had = document.body.getAttribute('tabindex');
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    if (had === null) document.body.removeAttribute('tabindex');
    else document.body.setAttribute('tabindex', had);
    window.scrollTo(0, 0);
    w.__senSeen = new Set();
    return 0;
  }
  /** A transition would still be at its start: jump each to its end to read the look it is heading for. */
  const finish = () => {
    for (const t of document.getAnimations())
      if (t instanceof CSSTransition)
        try {
          t.finish();
        } catch {
          /* one that can't finish isn't a ring */
        }
  };
  finish();
  const el = document.activeElement as HTMLElement | null;
  const seen = (w.__senSeen ??= new Set());
  if (!el || el === document.body || seen.has(el)) return ['cycled'];
  seen.add(el);
  if (!shown(el)) return out;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  /** Any CSS colour as sRGB with alpha; the canvas knows oklch and colour-mix too. */
  const rgba = (c: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
  };
  /** What is painted behind an element: backgrounds laid over each other up to the first opaque one. */
  const behind = (e: Element): [number, number, number] => {
    const layers: [number, number, number, number][] = [];
    for (let n: Element | null = e; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] === 1) break;
    }
    let base: [number, number, number] = [255, 255, 255];
    for (const [r, g, b, al] of layers.reverse())
      base = [r * al + base[0] * (1 - al), g * al + base[1] * (1 - al), b * al + base[2] * (1 - al)];
    return base;
  };
  /** A ring is drawn outside the control, over what is behind it, or inside it over the control itself. */
  const differs = (node: Element, c: string, inside: boolean) => {
    const bg = behind(inside || !node.parentElement ? node : node.parentElement);
    const [r, g, b, al] = rgba(c);
    if (al === 0) return false;
    // on top of the background, ten of 255 on any channel is a difference to see
    return (
      Math.max(
        Math.abs(r * al + bg[0] * (1 - al) - bg[0]),
        Math.abs(g * al + bg[1] * (1 - al) - bg[1]),
        Math.abs(b * al + bg[2] * (1 - al) - bg[2]),
      ) >= 10
    );
  };
  /** An outline, or with `shadows` a shadow with some reach, in a colour that shows against what is behind it. */
  const drawn = (node: Element, cs: CSSStyleDeclaration, shadows: boolean) => {
    if (
      cs.outlineStyle !== 'none' &&
      parseFloat(cs.outlineWidth) >= 1 &&
      differs(node, cs.outlineColor, parseFloat(cs.outlineOffset) < 0)
    )
      return true;
    if (!shadows || cs.boxShadow === 'none') return false;
    // split the shadows at the commas outside brackets, and read each one's colour and reach
    const parts: string[] = [];
    let level = 0;
    let from = 0;
    [...cs.boxShadow].forEach((ch, k, all) => {
      if (ch === '(') level++;
      if (ch === ')') level--;
      if ((ch === ',' && level === 0) || k === all.length - 1) {
        parts.push(cs.boxShadow.slice(from, ch === ',' ? k : k + 1).trim());
        from = k + 1;
      }
    });
    return parts.some((sh) => {
      const colour = sh.match(/(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/)?.[0] ?? sh.split(' ')[0]!;
      const lengths =
        sh
          .replace(colour, '')
          .match(/-?[\d.]+px/g)
          ?.map(parseFloat) ?? [];
      return (lengths[2] ?? 0) >= 1 || (lengths[3] ?? 0) >= 1 ? differs(node, colour, /\binset\b/.test(sh)) : false;
    });
  };
  const pseudo = (node: Element, shadows: boolean) =>
    ['::before', '::after'].some((p) => {
      const cs = getComputedStyle(node, p);
      return cs.content !== 'none' && drawn(node, cs, shadows);
    });
  // an outline on the control is a ring as it stands
  if (drawn(el, getComputedStyle(el), false) || pseudo(el, false)) return out;

  // Otherwise look at what changes when focus leaves: a shadow or a border a control always has (shadcn's
  // soft shadow, a card's edge) isn't a focus ring. A field can show focus by the edge of what wraps it (an
  // underline that darkens, a box that takes a ring), so the wrappers that hold the focus are looked at too.
  const wraps = [el];
  for (let n = el.parentElement; n && n !== document.body && wraps.length < 4; n = n.parentElement)
    if (n.matches(':focus-within')) wraps.push(n);
  const edges = (n: Element) => {
    const cs = getComputedStyle(n);
    return ['Top', 'Right', 'Bottom', 'Left'].map(
      (side) =>
        `${cs.getPropertyValue(`border-${side.toLowerCase()}-style`)} ${cs.getPropertyValue(`border-${side.toLowerCase()}-width`)} ${cs.getPropertyValue(`border-${side.toLowerCase()}-color`)}`,
    );
  };
  const look = (n: Element) => {
    const cs = getComputedStyle(n);
    const side = ['::before', '::after'].map((p) => {
      const ps = getComputedStyle(n, p);
      return `${ps.content} ${ps.outlineStyle} ${ps.outlineWidth} ${ps.outlineColor} ${ps.boxShadow}`;
    });
    return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.boxShadow} ${edges(n).join('|')} ${side.join('|')}`;
  };
  const focused = wraps.map(look);
  const focusedEdges = wraps.map(edges);
  el.blur();
  finish();
  const plain = wraps.map(look);
  const plainEdges = wraps.map(edges);
  el.focus({ preventScroll: true });
  finish();
  const ring = wraps.some((n, i) => {
    if (focused[i] === plain[i]) return false;
    if (drawn(n, getComputedStyle(n), true) || pseudo(n, true)) return true;
    return focusedEdges[i]!.some((e, k) => {
      if (e === plainEdges[i]![k]) return false;
      const [style, width, ...colour] = e.split(' ');
      return style !== 'none' && parseFloat(width!) >= 1 && differs(n, colour.join(' '), false);
    });
  });
  if (!ring) out.push(`${label(el)} takes focus with no ring to see`);
  return out;
};

const args = (kind: ProbeKind, i?: number): Probe => ({ kind, i, targets: TARGETS, fields: FIELDS });
const lines = (page: Page, kind: ProbeKind, i?: number) => page.evaluate(probe, args(kind, i)) as Promise<string[]>;
const count = (page: Page, kind: ProbeKind) => page.evaluate(probe, args(kind)) as Promise<number>;
const found = (check: CheckId, details: string[]): Finding[] => details.map((detail) => ({ check, detail }));

async function axe(page: Page): Promise<Finding[]> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.flatMap((v) =>
    v.nodes.map((n) => ({
      check: 'axe' as const,
      detail: `${v.id} (${v.impact}) ${n.target.join(' ')}: ${(n.any[0]?.message ?? n.all[0]?.message ?? n.none[0]?.message ?? v.help).replace(/\s+/g, ' ')}`,
    })),
  );
}

/** The frame the browser draws after a layout change, twice, so the page has settled into it. */
const frames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

/**
 * Waits for what is moving to stop (a reveal, a sheet sliding in), up to three seconds, and for a view
 * transition to hand the page back, up to five: a person can't tap a button under one either, but nothing
 * is wrong with the page once it's over. Animations that never end (a spinner, the tab bar's strip) are
 * left out.
 */
const calm = async (page: Page) => {
  await page.evaluate(async () => {
    const ends = document
      .getAnimations()
      .filter((x) => x.effect?.getComputedTiming().endTime !== Infinity)
      .map((x) => x.finished.catch(() => undefined));
    await Promise.race([Promise.all(ends), new Promise((done) => setTimeout(done, 3000))]);
  });
  // under a view transition the whole page answers a tap as the root element
  await page
    .waitForFunction(
      (sel) =>
        ![...document.querySelectorAll(sel)].some((el) => {
          const r = el.getBoundingClientRect();
          const x = (r.left + r.right) / 2;
          const y = (r.top + r.bottom) / 2;
          return (
            r.width > 0 &&
            r.height > 0 &&
            x >= 0 &&
            y >= 0 &&
            x < innerWidth &&
            y < innerHeight &&
            document.elementFromPoint(x, y) === document.documentElement
          );
        }),
      TARGETS,
      { timeout: 5000 },
    )
    .catch(() => undefined);
};

/** A field, and its form's main button, reachable with the keyboard open (Android shrinks the viewport). */
async function keyboard(page: Page): Promise<Finding[]> {
  const found: Finding[] = [];
  const n = await count(page, 'fields');
  if (n === 0) return found;
  const was = page.viewportSize() ?? { width: 390, height: 844 };
  try {
    await page.setViewportSize({ width: was.width, height: KEYBOARD_HEIGHT });
    for (let i = 0; i < n; i++) {
      await page.evaluate(probe, args('focusField', i));
      await frames(page);
      // each field of one form reaches the same button: say it once
      for (const detail of await lines(page, 'reach', i))
        if (!found.some((f) => f.detail === detail)) found.push({ check: 'keyboard', detail });
    }
  } finally {
    await page.setViewportSize(was);
    await frames(page);
  }
  return found;
}

/** Tab through the page: every control that takes focus shows a ring. */
async function focus(page: Page): Promise<Finding[]> {
  const found: Finding[] = [];
  await page.evaluate(probe, args('tabReset'));
  for (let i = 0; i < FOCUS_STOPS; i++) {
    await page.keyboard.press('Tab');
    const stop = await lines(page, 'tabStep');
    if (stop[0] === 'cycled') break;
    for (const detail of stop) found.push({ check: 'focus', detail });
  }
  return found;
}

/**
 * Every check on the page as it is now, at the phone viewport. The keyboard and focus checks change
 * the page (a smaller viewport, focus moved), so they run last and put the viewport back.
 */
export async function runChecks(page: Page): Promise<Finding[]> {
  const all: Finding[] = [];
  await calm(page);
  all.push(...(await axe(page)));
  all.push(
    ...found(
      'target',
      (await smallTargets(page)).map((s) => `${s} under 48 px`),
    ),
  );
  all.push(...found('clipped', await lines(page, 'clipped')));
  all.push(...found('overlap', await lines(page, 'overlap')));
  all.push(...(await coveredTargets(page)));
  await page.evaluate(probe, args('save'));
  try {
    all.push(...(await keyboard(page)));
    all.push(...(await focus(page)));
  } finally {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(probe, args('restore'));
  }
  return all;
}

/** Targets under something fixed (a toast, the tab bar, a sheet's footer) that scrolling can't free. */
export async function coveredTargets(page: Page): Promise<Finding[]> {
  await calm(page);
  return found('covered', await lines(page, 'covered'));
}
