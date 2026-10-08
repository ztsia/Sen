// What a look supplies (patterns.md §1): one object, `DIR`, per look. Everything in it is material;
// layout, words, icons and meanings are the app's and never vary.

export type LookId = 'minted' | 'instrument' | 'firefly' | 'line' | 'mercury' | 'copper';
export type Mode = 'light' | 'dark';
export type TabKey = 'home' | 'review' | 'scan' | 'insights' | 'more';
export type IconTab = Exclude<TabKey, 'scan'>;

/** Sen's eight states (D76). */
export const AVATAR_STATES = [
  'resting',
  'note',
  'listening',
  'thinking',
  'helpers',
  'speaking',
  'paused',
  'done',
] as const;
export type AvatarState = (typeof AVATAR_STATES)[number];

/** What the large figure and the strip know about the cycle. Amounts in integer sen. */
export interface FigureState {
  /** Over budget: the figure is drawn in the warning colour. */
  over?: boolean;
  /** Spent so far this cycle, and the cycle's income: some looks age with the share spent. */
  spent?: number;
  income?: number;
  /** What had been spent by the end of each day of the cycle so far, in sen (Copper's strip keeps each day's patina). */
  spentByDay?: number[];
}

export interface LookTabs {
  /** One tab's icon, idle or active, on the shared outlines (D80). `uid` keeps SVG ids unique on the page. */
  icon(k: IconTab, on: boolean, mode: Mode, uid: string): string;
  /** The scan button. */
  scan(mode: Mode, uid: string): string;
  /** Review's badge around its text (`5`, `99+`). Without one, the app draws a plain badge. */
  badge?(text: string, mode: Mode, uid: string): string;
  /** Material along the bar itself, behind the tabs. */
  bar?(mode: Mode, uid: string): string;
  /** The active-tab indicator, which moves to the chosen tab. */
  ind?(mode: Mode, uid: string): string;
  /** Extra motion when the tab changes; never called under reduced motion. */
  switch?(bar: HTMLElement, from: HTMLElement | null, to: HTMLElement): void;
}

export interface Look {
  id: LookId;
  name: string;
  /** shadcn's --radius. The tokens themselves come from docs/ui/directions/assets/<look>/theme.css. */
  radius: string;
  /** The shared lucide set's weight (at 24 px), line ends and corners (patterns.md §5, D81). */
  icons: { weight: number; cap: 'butt' | 'round' | 'square'; join: 'miter' | 'round' };
  /** The launcher icon's layers on Android's 108 dp canvas, and the 24 dp notification silhouette. */
  icon: {
    background(p: string): string;
    foreground(p: string): string;
    monochrome(p: string): string;
    small(): string;
  };
  /** The wordmark in the app bar, as markup. It carries its own label: Sen. */
  wordmark(mode: Mode): string;
  /** The one large figure, drawn in the look's material. The app puts the readable text beside it. */
  heroFigure(sen: number, mode: Mode, state: FigureState): string;
  /** The cycle strip: how much of the cycle has gone. */
  strip(day: number, days: number, mode: Mode, state: FigureState): string;
  avatar: { draw(ctx: CanvasRenderingContext2D, size: number, t: number, state: AvatarState, mode: Mode): void };
  tabs: LookTabs;
  /**
   * Starts the look's live drawing (a figure or wordmark drawn on a canvas) for everything inside
   * `root`, and returns a function that stops it. Looks drawn wholly in SVG have none.
   */
  mount?(root: HTMLElement): () => void;
  /** How the look arrives in `new-look` (patterns.md §9). Built in B14. */
  reveal: null;
}
