// Every screen in docs/screens.md, by its id, with where it sits and whether it's built (B01).
// A `skeleton` screen shows "Not built yet" in production, and never shows data there (modules.md,
// rule 6). A slice that makes a screen real changes its status here.

export type ScreenStatus = 'skeleton' | 'real';
/** tab: one of the five; pushed: opened from a tab, with the tab bar; task: a task with an end, full screen, no tab bar; sheet: opens over a screen; outside: outside the tabs. */
export type ScreenKind = 'tab' | 'pushed' | 'task' | 'sheet' | 'outside';
export type TabId = 'home' | 'review' | 'insights' | 'more';

export interface ScreenDef {
  id: string;
  title: string;
  kind: ScreenKind;
  /** The tab it belongs to, for the tab bar's active state. */
  tab?: TabId;
  status: ScreenStatus;
  /** The slice that builds it (docs/modules.md). */
  slice: string;
}

// The screens a slice has made real (screens/real.ts holds their components).
const BUILT = new Set([
  'settings/capture',
  'settings/capture/apps',
  'settings/capture/access',
  'settings/capture/running',
  'settings/capture/captured',
  'settings/account',
]);

const s = (id: string, title: string, kind: ScreenKind, tab: TabId | undefined, slice: string): ScreenDef => ({
  id,
  title,
  kind,
  tab,
  status: BUILT.has(id) ? 'real' : 'skeleton',
  slice,
});

export const SCREENS: ScreenDef[] = [
  // the five tabs (D68); Scan's is a task screen
  s('home', 'Home', 'tab', 'home', 'B03, B13'),
  s('review', 'Review', 'tab', 'review', 'B03, B10'),
  s('insights', 'Insights', 'tab', 'insights', 'B03, B20'),
  s('more', 'More', 'tab', 'more', 'B03'),
  // Home
  s('cycle', 'This cycle', 'sheet', 'home', 'B13'),
  s('payday', 'Payday', 'task', undefined, 'B30'),
  // Review
  s('skipped', 'Skipped notifications', 'pushed', 'review', 'B10'),
  s('manual', 'Add expense', 'task', undefined, 'B08'),
  // Scan
  s('scan', 'Scan', 'task', undefined, 'B15'),
  s('scan-more', 'Scan, from gallery, or add', 'sheet', undefined, 'B03'),
  s('crop', 'Crop', 'task', undefined, 'B15'),
  s('reading', 'Reading', 'task', undefined, 'B15'),
  s('confirm', 'Confirm the receipt', 'task', undefined, 'B16'),
  // Shared bills
  s('split', 'Split', 'pushed', 'more', 'B17'),
  s('split-public', 'Split link', 'outside', undefined, 'B18'),
  s('shared', 'Shared bills', 'pushed', 'more', 'B17'),
  // Insights
  s('budgets', 'Budgets', 'pushed', 'insights', 'B21'),
  s('subscriptions', 'Subscriptions', 'pushed', 'insights', 'B22'),
  s('goals', 'Goals', 'pushed', 'insights', 'B21'),
  s('goal', 'Goal', 'pushed', 'insights', 'B21'),
  s('insights/year', 'The year', 'pushed', 'insights', 'B20'),
  // Sen
  s('sen', 'Sen', 'sheet', undefined, 'B27'),
  s('agent/memory', 'What Sen remembers', 'pushed', undefined, 'B28'),
  s('agent/research', 'Research', 'pushed', undefined, 'B32'),
  s('agent/usage', 'Usage', 'pushed', undefined, 'B38'),
  // More
  s('payments', 'Payments', 'pushed', 'more', 'B13'),
  s('txn', 'Payment', 'pushed', 'more', 'B13'),
  s('receipt', 'Receipt', 'pushed', 'more', 'B16'),
  s('accounts', 'Accounts', 'pushed', 'more', 'B08'),
  s('account', 'Account', 'pushed', 'more', 'B08'),
  s('balance-check', 'Balance check', 'task', undefined, 'B13'),
  s('claims', 'Claims', 'pushed', 'more', 'B25'),
  s('claim', 'Claim', 'pushed', 'more', 'B25'),
  s('settings', 'Settings', 'pushed', 'more', 'B04'),
  s('settings/appearance', 'Appearance', 'pushed', 'more', 'B04'),
  s('settings/capture', 'Capture', 'pushed', 'more', 'B02, B09'),
  // Capture's steps (B02); B08 shows the first three in first-run too
  s('settings/capture/apps', 'Your apps', 'pushed', 'more', 'B02'),
  s('settings/capture/access', 'Notification access', 'pushed', 'more', 'B02'),
  s('settings/capture/running', 'Keep Sen running', 'pushed', 'more', 'B02'),
  s('settings/capture/captured', 'Captured on this phone', 'pushed', 'more', 'B02; B07 replaces it'),
  s('settings/you', 'You', 'pushed', 'more', 'B08'),
  s('settings/categories', 'Categories and rules', 'pushed', 'more', 'B12'),
  s('settings/email', 'Receipts by email', 'pushed', 'more', 'B19'),
  s('settings/claims', 'Claims', 'pushed', 'more', 'B25'),
  s('settings/sen', 'Sen', 'pushed', 'more', 'B27'),
  s('settings/members', 'Members', 'pushed', 'more', 'B38'),
  s('settings/data', 'Data', 'pushed', 'more', 'B37'),
  s('settings/account', 'Account', 'pushed', 'more', 'B05'),
  // outside the tabs
  s('sign-in', 'Sign in', 'outside', undefined, 'B05'),
  s('first-run', 'Welcome', 'outside', undefined, 'B08'),
  s('new-look', 'A new look', 'outside', undefined, 'B14'),
];

export const screenById = new Map(SCREENS.map((d) => [d.id, d]));

/** The tab bar shows on the tabs and the screens pushed from them, and hides during a task with an end (patterns.md §6). */
export const showsTabBar = (d: ScreenDef | undefined) => !!d && (d.kind === 'tab' || d.kind === 'pushed');
/** Sen's button floats on the five tab screens, and nowhere else (D68). */
export const showsSenButton = (d: ScreenDef | undefined) => !!d && d.kind === 'tab';
