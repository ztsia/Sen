// The words and states of the two drawings. build.mjs turns each state into a phone.
// A row is patterns.md's NavRow: { icon, tone, title, line, then one of badge / button / more / chevron }.

const INTRO = "Sen signs in to ESS, your employer's self-service site, on this phone only, and your password never leaves it.";
const INTRO_WEB = "ESS is your employer's self-service site. Here Sen only reads its emails: signing in, fetching your payslip and submitting claims need the Sen app on your phone.";
const ADDRESS = 'ess-noreply@example.com';
const FETCHED = 'Wed, 30 Sept';
const FORGET = {
  title: 'Forget your ESS password?',
  about: "Sen signs out of ESS and deletes the password from this phone. It can't be undone: you would sign in again.",
  action: 'Forget password',
  cancel: 'Keep it',
};

// ---------- A: one card, one row shape ----------
const aMail = { icon: 'mail', title: 'ESS emails come from', line: ADDRESS, chevron: true };
const aIn = (more = true) => ({ icon: 'user-check', tone: 'accent', title: 'Signed in', line: 'Sen signs in by itself when needed', more });
const aTodo = (icon, title, extra = {}) => ({ icon, title, line: 'Not set up yet', button: { kind: 'secondary', label: 'Set up' }, ...extra });
const aFetchReady = { icon: 'file-text', tone: 'accent', title: 'Fetch payslip', line: `Ready · last fetched ${FETCHED}`, more: true };
const aSubmitReady = { icon: 'send', tone: 'accent', title: 'Submit claims', line: 'Ready · sent only when you tap', more: true };
const aCard = (rows, intro = INTRO) => [{ label: 'ESS', intro, rows }];

const A = {
  key: 'A',
  title: 'One card, every row the same shape',
  idea: 'Everything about ESS is one card you read top to bottom. Each row is a tile, a name, a line that says its state in words, and one control at the end: a button when something is left to do, ⋯ when it is done.',
  states: [
    {
      id: 'signed-out', n: '1', name: 'Signed out',
      says: 'The two jobs are listed but dimmed, with no controls. The one button is Sign in to ESS.',
      groups: aCard([
        { icon: 'log-in', title: 'Not signed in', button: { label: 'Sign in to ESS' } },
        { icon: 'file-text', title: 'Fetch payslip', line: 'By itself on payday, once you sign in', off: true },
        { icon: 'send', title: 'Submit claims', line: 'With one tap, once you sign in', off: true },
        aMail,
      ]),
    },
    {
      id: 'nothing-set-up', n: '2', name: 'Signed in, nothing set up',
      says: 'Each job says Not set up yet and offers one button.',
      groups: aCard([aIn(), aTodo('file-text', 'Fetch payslip'), aTodo('send', 'Submit claims'), aMail]),
    },
    {
      id: 'payslip-ready', n: '3', name: 'Payslip ready, claims not set up',
      says: 'The ready row says what last happened, where the separate fact row used to be.',
      groups: aCard([aIn(), aFetchReady, aTodo('send', 'Submit claims'), aMail]),
    },
    {
      id: 'all-ready', n: '4', name: 'Everything ready',
      says: 'No buttons left. ⋯ on a ready row holds Show Sen the steps again and Import steps.',
      groups: aCard([aIn(), aFetchReady, aSubmitReady, aMail]),
    },
    {
      id: 'set-up', n: '5', name: 'Setting up Submit claims',
      says: 'Set up opens a menu beside it with the two ways (D155).',
      groups: aCard([
        aIn(), aFetchReady,
        aTodo('send', 'Submit claims', {
          button: { kind: 'secondary', label: 'Set up', pressed: true },
          menu: [{ icon: 'sen', label: 'Show Sen the steps' }, { icon: 'file-down', label: 'Import steps from a file' }],
        }),
        aMail,
      ]),
    },
    {
      id: 'forget', n: '6', name: 'Where Forget password lives',
      says: 'Behind ⋯ beside Signed in, under a line, away from the steps. It opens the dialog shown in B6.',
      groups: aCard([
        { ...aIn('open'), menu: [{ icon: 'log-in', label: 'Sign in again' }, '-', { icon: 'key-round', label: 'Forget password', danger: true }] },
        aFetchReady, aTodo('send', 'Submit claims'), aMail,
      ]),
    },
    {
      id: 'browser', n: '7', name: 'In a browser',
      says: 'Only the address row, and a line saying the rest needs the phone app.',
      groups: aCard([aMail], INTRO_WEB),
    },
    { id: 'payslip-ready-dark', n: '3', name: 'Payslip ready, claims not set up', mode: 'dark', says: 'State 3 in Minted dark.', groups: aCard([aIn(), aFetchReady, aTodo('send', 'Submit claims'), aMail]) },
    { id: 'all-ready-dark', n: '4', name: 'Everything ready', mode: 'dark', says: 'State 4 in Minted dark.', groups: aCard([aIn(), aFetchReady, aSubmitReady, aMail]) },
  ],
  verdict: [
    ['Makes clear', 'One card, read top to bottom: signed in, the two jobs, the address. Every row has the same four parts, so nothing looks half-built, and the next thing to press is a button.'],
    ['Costs', 'No room to say why Sen wants the address, or what each way of setting up involves: a menu holds names only. Once everything is ready, three ⋯ sit in a column and say nothing about what is behind them.'],
    ['Leans on', 'A new action, Sign in again, so the ⋯ beside Signed in holds two things as D155 asks. A small button inside a row, as today.'],
  ],
};

// ---------- B: a status first, then what Sen does, then the address ----------
const bIn = { status: { icon: 'circle-check', state: 'Signed in', title: 'Sen can reach ESS whenever it needs to.' } };
const bOut = { status: { icon: 'circle-dashed', idle: true, state: 'Not signed in', title: 'Sign in once, and Sen can fetch your payslip on payday and submit your claims for you.', button: { kind: 'lg wide', label: 'Sign in to ESS' } } };
const bTop = (s, intro = INTRO) => ({ label: 'ESS', intro, ...s });
const bFetchTodo = { icon: 'file-text', title: 'Fetch payslip', line: 'Sen needs the steps first', badge: { label: 'Not set up' }, chevron: true };
const bFetchReady = { icon: 'file-text', tone: 'accent', title: 'Fetch payslip', line: `Last fetched ${FETCHED}`, badge: { tone: 'accent', label: 'Ready' }, chevron: true };
const bSubmitTodo = { icon: 'send', title: 'Submit claims', line: 'Sen needs the steps first', badge: { label: 'Not set up' }, chevron: true };
const bSubmitReady = { icon: 'send', tone: 'accent', title: 'Submit claims', line: 'Sent only when you tap', badge: { tone: 'accent', label: 'Ready' }, chevron: true };
const bDoes = (...rows) => ({ label: 'What Sen does on ESS', rows });
const bMail = { label: 'Emails from ESS', rows: [{ icon: 'mail', title: 'Sender address', line: ADDRESS, chevron: true }], footer: 'Sen reads emails from this address to mark your claims approved or rejected.' };
const bForget = { rows: [{ icon: 'key-round', tone: 'warn', title: 'Forget ESS password', danger: true }] };
const b3 = [bTop(bIn), bDoes(bFetchReady, bSubmitTodo), bMail, bForget];
const b4 = [bTop(bIn), bDoes(bFetchReady, bSubmitReady), bMail, bForget];

const B = {
  key: 'B',
  title: 'A status first, then what Sen does, then the address',
  idea: 'Each of the three questions gets its own place. A status card says whether Sen is signed in. A short list says what Sen does on ESS and whether each thing is ready; a row is one control, and tapping it opens a sheet with room to explain. The address sits apart with its reason, and Forget ESS password sits alone at the bottom.',
  states: [
    {
      id: 'signed-out', n: '1', name: 'Signed out',
      says: 'The status card says what signing in gets you and holds the one button. No list of jobs yet.',
      groups: [bTop(bOut), bMail],
    },
    {
      id: 'nothing-set-up', n: '2', name: 'Signed in, nothing set up',
      says: 'Both jobs say Not set up; tapping a row sets it up.',
      groups: [bTop(bIn), bDoes(bFetchTodo, bSubmitTodo), bMail, bForget],
    },
    { id: 'payslip-ready', n: '3', name: 'Payslip ready, claims not set up', says: 'A badge says the state; the line says what last happened or what is missing.', groups: b3 },
    { id: 'all-ready', n: '4', name: 'Everything ready', says: 'Tapping a ready row opens the same sheet, to show Sen the steps again.', groups: b4 },
    {
      id: 'set-up', n: '5', name: 'Setting up Submit claims',
      says: 'A short sheet with the two ways as rows, each with a line saying what it involves.',
      groups: b3,
      overlay: {
        sheet: {
          title: 'Set up Submit claims',
          about: 'Sen needs the steps on your ESS before it can do this. There are two ways to give them.',
          rows: [
            { icon: 'sen', tone: 'accent', title: 'Show Sen the steps', line: 'Submit one claim yourself in ESS while Sen watches. Once is enough.', chevron: true },
            { icon: 'file-down', title: 'Import steps', line: 'Use a file someone at your company made. It holds steps, never amounts.', chevron: true },
          ],
        },
      },
    },
    {
      id: 'forget', n: '6', name: 'Where Forget password lives',
      says: 'Its own row at the bottom (see 2 to 4), in no menu. Tapping it opens this dialog, unchanged.',
      groups: b3,
      overlay: { dialog: FORGET },
    },
    {
      id: 'browser', n: '7', name: 'In a browser',
      says: 'Only the address row, and a line saying the rest needs the phone app.',
      groups: [{ label: 'ESS', intro: INTRO_WEB, rows: bMail.rows, footer: bMail.footer }],
    },
    { id: 'payslip-ready-dark', n: '3', name: 'Payslip ready, claims not set up', mode: 'dark', says: 'State 3 in Minted dark.', groups: b3 },
    { id: 'all-ready-dark', n: '4', name: 'Everything ready', mode: 'dark', says: 'State 4 in Minted dark.', groups: b4 },
  ],
  verdict: [
    ['Makes clear', 'Each question has its own place, in order: connected or not, what is ready, where the emails come from and why. The sheet has room to say what showing Sen the steps means, which a menu has not.'],
    ['Costs', 'It is taller: it fills the screen and pushes Schemes off the top. Setting up is the row itself, with no button, so the next step is quieter, and a sheet is one more thing to close than a menu.'],
    ['Leans on', 'Forget ESS password as a red row always in view, as Account shows Sign out, where patterns §7 puts a rare action behind ⋯. A badge and a chevron share the end of a row.'],
  ],
};

export const OPTIONS = [A, B];

// every word that changed: [today, in the drawings]
export const WORDS = [
  ['Recorded', 'Ready'],
  ['Not recorded', 'Not set up (A: Not set up yet)'],
  ['Sen knows these steps.', 'Ready, then what last happened'],
  ['Teach Sen', 'Show Sen the steps, behind Set up (new)'],
  ['Teach again: Fetch payslip', "Show Sen the steps again, in that row's own menu or sheet"],
  ['Import recipe', 'Import steps (A: Import steps from a file)'],
  ['recipe', 'steps'],
  ['Last payslip fetched · Wed, 30 Sept', 'Last fetched Wed, 30 Sept, on the Fetch payslip row'],
  ['Signed in to ESS, with a Signed in badge', 'Signed in, said once'],
  ['ESS email address', 'A: ESS emails come from. B: Sender address, under Emails from ESS'],
  ['Forget password', 'A: unchanged, in a menu. B: Forget ESS password, since the row stands alone'],
];

export const PICK = 'B: it answers the three questions in three places, explains the one unfamiliar idea (showing Sen the steps) where there is room for a sentence, and keeps forgetting the password out of every menu. If its rows leave the next step too quiet, give a row that is not set up A’s Set up button in place of its badge and chevron.';
