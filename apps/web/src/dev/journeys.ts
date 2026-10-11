import type { ScenarioId } from '../data/fake/variants';
import type { DevState } from '../frame/ui-store';
import { uid } from '../data/fake/ids';
import type { SurfaceId } from './native/ids';

// Every journey in docs/flows.md, by its id, as the screens it walks in order (B04). The dev panel's
// guided list plays them, and B04's Playwright run walks the same list. Pure data: no React, so a test
// can import it. Ids are the made-up scenario's (data/fake/scenario.ts); captions are flows.md's.

export interface JourneyStep {
  /** A screen id from docs/screens.md. A sheet (`sen`) opens over the screen before it. */
  screen: string;
  /** What the screen is about, as the router's search carries it. */
  search?: { id?: string; cycle?: string; category?: string; account?: string; shared?: boolean };
  /** The made-up scenario to change to. Each journey starts in its own, or Wei Ming's month. */
  scenario?: ScenarioId;
  /** A screen state; normal unless a step says otherwise. */
  state?: DevState;
  /** One line from flows.md. */
  caption: string;
  /** A native stand-in that appears over the screen, as Android would draw it. */
  surface?: SurfaceId;
  /** The widgets' stand-ins open instead of a surface. */
  widgets?: boolean;
  /** Reading and confirming need a draft: `new` starts one for `search.id`'s payment, `same` keeps it. */
  draft?: 'new' | 'same';
}

export interface Journey {
  id: string;
  title: string;
  /** The group in flows.md's contents. */
  group: string;
  /** Walked in every QA run (D124). */
  core?: boolean;
  scenario?: ScenarioId;
  steps: JourneyStep[];
}

const ROTI = uid('txn:roti-bakar');
const NASI = uid('txn:nasi-kandar');
const BBQ = uid('split:bbq');
const HAIDILAO = uid('split:haidilao');
const GOAL = uid('goal:japan');
const MEALS = uid('category:Meals');

export const JOURNEYS: Journey[] = [
  // Setting up
  {
    id: 'first-run',
    title: 'First run',
    group: 'Setting up',
    core: true,
    scenario: 'before-salary',
    steps: [
      { screen: 'sign-in', caption: 'Email, then the 6-digit code.' },
      {
        screen: 'first-run',
        caption: 'Choose your apps, give access, keep Sen running, set up accounts, your name and payday.',
      },
      { screen: 'home', caption: 'Home reads Spent since you started until the first salary lands.' },
    ],
  },
  {
    id: 'invited',
    title: "An invited friend's first day",
    group: 'Setting up',
    scenario: 'month',
    steps: [
      { screen: 'sign-in', caption: 'The invitation link opens sign-in with the email filled in; then the code.' },
      { screen: 'first-run', caption: 'The short first run: the categories, any of which can be switched off.' },
      { screen: 'home', caption: "This month's spending, no balances." },
    ],
  },
  // Everyday capture
  {
    id: 'pay-known',
    title: 'Paying at a known merchant',
    group: 'Everyday capture',
    steps: [
      { screen: 'home', caption: 'The rule files it silently, with no review.' },
      {
        screen: 'home',
        surface: 'prompt-scan',
        caption: 'If the quiet scan prompt is on: RM58.30 · NASI KANDAR ABC, with Scan receipt.',
      },
      { screen: 'scan', search: { id: NASI }, caption: 'Tapping it opens scan for that payment.' },
    ],
  },
  {
    id: 'pay-new',
    title: 'Paying at a new merchant',
    group: 'Everyday capture',
    core: true,
    steps: [
      {
        screen: 'home',
        surface: 'prompt-category',
        caption: 'The category prompt: RM9.50 · ROTI BAKAR 88, the two best guesses and Scan receipt.',
      },
      { screen: 'review', caption: 'Swiped away, it waits in Review.' },
      { screen: 'scan', search: { id: ROTI }, caption: 'Or Scan receipt: the payment takes its items’ categories.' },
    ],
  },
  {
    id: 'hawker',
    title: 'Paying a hawker',
    group: 'Everyday capture',
    steps: [
      {
        screen: 'home',
        surface: 'prompt-category',
        caption: 'A stall whose name is the owner’s own is a merchant like any other: it asks once.',
      },
      { screen: 'review', caption: 'Next time it files itself silently.' },
    ],
  },
  {
    id: 'money-in',
    title: 'Money in from someone',
    group: 'Everyday capture',
    steps: [
      { screen: 'review', caption: 'Whose split share is it? The open shares it fits, and Not a split.' },
      { screen: 'review', caption: 'Otherwise Review asks Income, Transfer or Refund of….' },
    ],
  },
  {
    id: 'own-transfer',
    title: 'Moving money between your own accounts',
    group: 'Everyday capture',
    steps: [
      {
        screen: 'review',
        caption: 'Public Bank doesn’t notify money out, so the first time Review asks where it came from.',
      },
      { screen: 'payments', caption: 'Next time the missing side is filled in, marked Filled in.' },
    ],
  },
  {
    id: 'refund',
    title: 'A refund',
    group: 'Everyday capture',
    steps: [
      { screen: 'review', caption: 'Money in from a merchant: Review offers Refund of… the recent payments.' },
      { screen: 'payments', caption: 'The refund lowers that purchase’s spending; it’s never income.' },
    ],
  },
  // Receipts
  {
    id: 'scan-after',
    title: 'Scanning a receipt after paying',
    group: 'Receipts',
    core: true,
    steps: [
      { screen: 'home', surface: 'prompt-scan', caption: 'The quiet scan prompt, a widget or the Scan tab starts it.' },
      {
        screen: 'scan',
        search: { id: NASI },
        caption: 'The scanner finds the edges; save while the receipt is in your hand.',
      },
      { screen: 'crop', search: { id: NASI }, caption: 'Adjust the crop.' },
      { screen: 'reading', search: { id: NASI }, draft: 'new', caption: 'Reading the receipt.' },
      {
        screen: 'confirm',
        search: { id: NASI },
        draft: 'same',
        caption: 'One screen, and the list is the receipt. How many people ate? Then Done.',
      },
      { screen: 'txn', search: { id: NASI }, caption: 'Matching finds the payment: Attached to RM58.30, with Undo.' },
    ],
  },
  {
    id: 'receipt-first',
    title: 'A receipt before its payment',
    group: 'Receipts',
    steps: [
      {
        screen: 'confirm',
        search: { id: ROTI },
        draft: 'new',
        caption: 'A receipt confirmed with no payment to match.',
      },
      { screen: 'review', caption: 'Waiting for its payment, under Waiting on others.' },
    ],
  },
  {
    id: 'email-setup',
    title: 'Setting up forwarded receipts',
    group: 'Receipts',
    steps: [
      { screen: 'settings', caption: 'More → Settings → Receipts by email.' },
      {
        screen: 'settings/email',
        caption: 'Copy your address; Gmail’s code shows here; a filter forwards the senders.',
      },
    ],
  },
  // Shared bills
  {
    id: 'split-mine',
    title: 'Splitting a bill you paid',
    group: 'Shared bills',
    steps: [
      { screen: 'confirm', search: { id: ROTI }, draft: 'new', caption: 'Confirm → Split → Who paid? I paid.' },
      { screen: 'split', search: { id: BBQ }, caption: 'Still changing, with a QR for the table. Tick what you had.' },
      { screen: 'split-public', search: { id: BBQ }, caption: 'Ali scans the QR and ticks his, then Done.' },
      {
        screen: 'split',
        search: { id: BBQ },
        caption: 'Everyone is done and every item claimed: it locks, and your share is your spending.',
      },
    ],
  },
  {
    id: 'paid-back',
    title: 'Getting paid back',
    group: 'Shared bills',
    steps: [
      { screen: 'review', caption: 'RM20.99 from a name Sen hasn’t seen: Whose split share is it? → Ali.' },
      { screen: 'split', search: { id: BBQ }, caption: 'His share ticks; tick Mei yourself if she paid cash.' },
    ],
  },
  {
    id: 'split-theirs',
    title: 'A bill a friend paid',
    group: 'Shared bills',
    steps: [
      { screen: 'review', caption: 'After the lock, you owe Mei RM24.40. It’s in Review.' },
      { screen: 'home', surface: 'owe-reminder', caption: 'An hour later, if unpaid, Sen reminds you once.' },
      { screen: 'split', search: { id: HAIDILAO }, caption: 'Mei’s tick list is read-only to you.' },
      {
        screen: 'home',
        surface: 'prompt-payback',
        caption: 'You send Mei RM25.00 from TNG: Paying back: BBQ PLACE comes first, even offline.',
      },
    ],
  },
  {
    id: 'split-stuck',
    title: 'A stuck split',
    group: 'Shared bills',
    steps: [
      {
        screen: 'split',
        search: { id: BBQ },
        caption: 'An item nobody ticked, or someone who left: settle it as the payer, or Lock without waiting.',
      },
    ],
  },
  {
    id: 'lend',
    title: 'Lending',
    group: 'Shared bills',
    steps: [
      { screen: 'txn', search: { id: ROTI }, caption: 'From a payment: Split, then give the friend the whole amount.' },
      { screen: 'split', search: { id: BBQ }, caption: 'Their repayment ticks it like any share.' },
    ],
  },
  // Fixing things
  {
    id: 'manual',
    title: 'Entering a payment Sen missed',
    group: 'Fixing things',
    steps: [
      { screen: 'review', caption: 'Review’s Missing a payment?, or the Add expense shortcut.' },
      { screen: 'manual', caption: 'Type the amount, pick a category, Save, with Undo.' },
    ],
  },
  {
    id: 'new-wording',
    title: 'A notification no template reads',
    group: 'Fixing things',
    steps: [
      { screen: 'review', caption: 'New TNG wording: paid RM6.50 to KEDAI MAJU. Right?' },
      { screen: 'manual', caption: 'No offers Enter it by hand.' },
    ],
  },
  {
    id: 'fix',
    title: 'Fixing a payment',
    group: 'Fixing things',
    steps: [
      {
        screen: 'txn',
        search: { id: ROTI },
        caption: 'Change the category, correct the amount, Mark as…, or Delete. Every change has Undo.',
      },
      { screen: 'payments', caption: 'Changes land in Changes.' },
    ],
  },
  // The cycle
  {
    id: 'daily',
    title: 'The daily glance',
    group: 'The cycle',
    steps: [
      {
        screen: 'home',
        widgets: true,
        caption: 'Morning: the widget shows what’s left and the spent-against-elapsed meter.',
      },
      { screen: 'home', caption: 'Opening Sen: Home answers what’s left.' },
      { screen: 'review', caption: 'Review’s badge says what needs you.' },
      { screen: 'home', surface: 'push-sen', caption: '9pm: Sen’s note, only on days worth a word.' },
    ],
  },
  {
    id: 'payday',
    title: 'Payday',
    group: 'The cycle',
    scenario: 'payday',
    steps: [
      { screen: 'home', surface: 'push-payday', caption: 'A salary credit lands, and Home shows the Payday card.' },
      { screen: 'payday', caption: 'Claims, balance check, last cycle, then this cycle’s plan.' },
      { screen: 'balance-check', caption: 'Type what each bank app shows, or Matches.' },
      { screen: 'home', caption: 'The plan’s progress stays on Home until every move is done.' },
    ],
  },
  {
    id: 'balance-check',
    title: 'Checking balances',
    group: 'The cycle',
    steps: [
      { screen: 'accounts', caption: 'From Review, payday or Accounts.' },
      { screen: 'balance-check', caption: 'Save books each difference as Unaccounted.' },
      { screen: 'home', caption: 'The gap shows on Home.' },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    group: 'The cycle',
    steps: [
      { screen: 'insights', caption: 'Each card asks a question and answers with a chart and one line.' },
      { screen: 'sen', caption: 'Ask Sen about this opens Sen with the question ready.' },
      { screen: 'payments', search: { category: MEALS }, caption: 'A category opens Payments, filtered.' },
    ],
  },
  {
    id: 'budget',
    title: 'Budgets',
    group: 'The cycle',
    steps: [
      { screen: 'insights', caption: 'Add a budget from its card.' },
      { screen: 'budgets', caption: 'A category and an amount per cycle; warnings at 80% and over.' },
    ],
  },
  {
    id: 'goal',
    title: 'Goals',
    group: 'The cycle',
    steps: [
      { screen: 'goals', caption: 'Goals and buckets, with feasibility against median surplus.' },
      { screen: 'goal', search: { id: GOAL }, caption: 'Projected finish and sample size.' },
    ],
  },
  {
    id: 'subscription',
    title: 'Subscriptions',
    group: 'The cycle',
    steps: [{ screen: 'subscriptions', caption: 'Declared; each expected charge is a forecast, matched or missed.' }],
  },
  {
    id: 'claims',
    title: "The month's claims",
    group: 'The cycle',
    steps: [
      { screen: 'more', caption: 'The 1st: each scheme’s claim drafts itself, in More → Claims.' },
      {
        screen: 'claims',
        surface: 'push-claim',
        caption: 'Reminders by code: Review, pushes 3 days before and on the day.',
      },
      { screen: 'claim', caption: 'Review, then Send to ESS, or copy each value and tap Submitted.' },
    ],
  },
  // Sen
  {
    id: 'ask',
    title: 'Asking',
    group: 'Sen',
    steps: [
      { screen: 'home', caption: 'The Sen button on any tab.' },
      { screen: 'sen', caption: 'Sen knows the screen it opened over; every figure comes from a tool.' },
    ],
  },
  {
    id: 'proposal',
    title: 'A proposal',
    group: 'Sen',
    steps: [
      { screen: 'home', caption: 'Sen’s button.' },
      { screen: 'sen', caption: 'A card: Apply changes it, recorded as Sen’s, with Undo.' },
      { screen: 'review', caption: 'The same card shows in Review.' },
    ],
  },
  {
    id: 'research',
    title: 'Research',
    group: 'Sen',
    steps: [
      { screen: 'sen', caption: 'A draft arrives with each source and date, unconfirmed.' },
      { screen: 'agent/research', caption: 'You confirm the figures you trust; Sen re-checks monthly.' },
    ],
  },
  {
    id: 'gap',
    title: 'Closing the gap',
    group: 'Sen',
    steps: [
      { screen: 'home', caption: 'The gap grows; Sen asks about days with nothing captured.' },
      { screen: 'sen', caption: 'Yes, add it…' },
      { screen: 'manual', caption: '…opens Add expense with the day filled in.' },
    ],
  },
  // When things break
  {
    id: 'capture-off',
    title: 'Capture switched off',
    group: 'When things break',
    scenario: 'capture-off',
    steps: [
      { screen: 'home', surface: 'push-health', caption: 'Within a day the watchdog pushes Capture may be off.' },
      { screen: 'home', widgets: true, caption: 'Every widget goes dark with Fix, and Home shows Capture is off.' },
      {
        screen: 'settings/capture/access',
        caption: 'Fix opens the setting; the listener re-reads what’s still showing.',
      },
    ],
  },
  {
    id: 'offline',
    title: 'Offline',
    group: 'When things break',
    steps: [
      {
        screen: 'home',
        state: 'offline',
        caption: 'Capture, prompts, manual entry, Review and scanning still work: Not synced yet.',
      },
      { screen: 'review', state: 'offline', caption: 'Review still answers.' },
      {
        screen: 'sen',
        state: 'offline',
        caption: 'Sen, reading receipts and starting a split need a connection, and say so.',
      },
    ],
  },
  {
    id: 'lost-phone',
    title: 'A lost phone',
    group: 'When things break',
    steps: [
      { screen: 'sign-in', caption: 'From any browser: sign in.' },
      { screen: 'settings/account', caption: 'Settings → Account → Sign out everywhere.' },
    ],
  },
  // Admin and data
  {
    id: 'invite',
    title: 'Inviting a friend',
    group: 'Admin and data',
    steps: [
      { screen: 'settings/members', caption: 'Invite: their email, switches and monthly AI cap.' },
      { screen: 'sign-in', caption: 'They get the invitation link.' },
      { screen: 'settings/members', caption: 'Members shows the invitation and their AI usage, never their money.' },
    ],
  },
  {
    id: 'calendar',
    title: 'Connecting Google Calendar',
    group: 'Admin and data',
    steps: [{ screen: 'settings/sen', caption: 'Settings → Sen → Connect; back in Sen: Connected.' }],
  },
  {
    id: 'export',
    title: 'Exporting everything',
    group: 'Admin and data',
    steps: [
      { screen: 'settings/data', caption: 'Settings → Data → Export everything.' },
      {
        screen: 'settings/data',
        surface: 'push-export',
        caption: 'A push says when the link is ready; it works for 24 hours.',
      },
    ],
  },
];

export const journeyById = new Map(JOURNEYS.map((j) => [j.id, j]));
