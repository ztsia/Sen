import { formatSen } from '@sen/core/money';
import type { MemoryView, ResearchView, SenMessage, SenPart, SenRun, SenView, UsageView } from '@sen/core/views';
import { nowIso } from '@/lib/clock';
import type { Db } from '../db';
import { at, rm } from '../scenario';
import type { AreaApply } from './ctx';

// Sen (B04): the one conversation, what Sen remembers, research briefs and AI credit, on made-up data,
// and the sen.*, proposal.*, research.* and memory.* commands. Every figure in Sen's text is written
// here as it would come from a tool; a figure marked `unchecked` shows what code does with one it
// couldn't trace (D108), and one marked `file` was read from a file you sent (D109).

export interface SenState {
  messages: SenMessage[];
  memory: { id: string; text: string; at: string }[];
  /** Research briefs older than this chat; the ones in the chat are read from its messages. */
  older?: { id: string; question: string; at: string; findings: number; confirmed: boolean }[];
}

const money = (text: string) => formatSen(rm(text));
const t = (text: string, mark: SenRun['mark'] = null): SenRun => ({ text, mark });
const say = (...runs: (string | SenRun)[]): SenPart => ({
  type: 'text',
  runs: runs.map((r) => (typeof r === 'string' ? t(r) : r)),
});

/** The proposal in Review (`r:zus`) is the same one as the card here, so answering either drops both. */
export const PROPOSAL_ID = 'r:zus';
const GAP_ASK = 'ask:gap';

export function seedSen(db: Db): SenState {
  void db;
  const msg = (id: string, role: 'you' | 'sen', when: string, parts: SenPart[], checkin = false): SenMessage => ({
    id,
    role,
    at: when,
    checkin,
    parts,
    streaming: false,
  });
  return {
    messages: [
      // last night's check-in (§12.4): the note on Home is the same one
      msg(
        'm:checkin',
        'sen',
        at('2026-10-17', '21:00'),
        [say('Groceries are ', t(`${money('96.00')} under`), ' last month by this date. Meals are about the same.')],
        true,
      ),
      msg('m:q1', 'you', at('2026-10-18', '09:12'), [say('How much have I spent on meals out this cycle?')]),
      msg('m:a1', 'sen', at('2026-10-18', '09:12'), [
        say(
          `You've spent ${money('412.60')} on meals out this cycle, over 31 payments. That's about ${money('21.70')} a day, and at that pace it comes to `,
          t(money('650.00'), 'unchecked'),
          ' by payday.',
        ),
      ]),
      msg('m:p1', 'sen', at('2026-10-18', '09:13'), [
        say('I noticed two coffee places you always put in the same category.'),
        {
          type: 'proposal',
          id: PROPOSAL_ID,
          title: 'ZUS COFFEE, CHAGEE → Drinks & desserts, from now on',
          why: 'You chose Drinks & desserts the last 6 times. 14 past payments stay as they are.',
          status: 'open',
        },
      ]),
      // a file you sent (D109): the figure from it says so
      msg('m:q2', 'you', at('2026-10-18', '18:30'), [
        { type: 'file', name: 'phone-bill-oct.pdf', kind: 'pdf' },
        say('Is this bill more than usual?'),
      ]),
      msg('m:a2', 'sen', at('2026-10-18', '18:31'), [
        say(
          'This bill is for ',
          t(money('98.00'), 'file'),
          ', due 25 Oct. September was ',
          t(money('88.00')),
          ', so it is higher. Nothing in the file says why.',
        ),
      ]),
      // research (§12.2 rule 6): the findings unedited with their sources, then Sen's own comment
      msg('m:q3', 'you', at('2026-10-18', '19:10'), [say('Which cards give cashback on groceries?')]),
      msg('m:r1', 'sen', at('2026-10-18', '19:11'), [
        {
          type: 'research',
          question: 'Cashback cards for groceries in Malaysia',
          findings: [
            { text: 'Pelita Everyday gives 5% cashback at supermarkets, capped at RM50 a month.', source: 1 },
            { text: 'Setia Plus gives 3% on groceries with no cap, and charges an annual fee of RM120.', source: 2 },
            { text: 'Pelita Everyday waives its annual fee with 12 purchases in a year.', source: 1 },
          ],
          sources: [
            {
              n: 1,
              title: 'Pelita Everyday card: rates and fees',
              site: 'pelita.example',
              url: 'https://pelita.example/cards/everyday',
              checkedOn: '2026-10-18',
            },
            {
              n: 2,
              title: 'Setia Plus cashback card',
              site: 'setia.example',
              url: 'https://setia.example/cards/plus',
              checkedOn: '2026-10-18',
            },
          ],
          confirmed: false,
        },
      ]),
      msg('m:r1c', 'sen', at('2026-10-18', '19:11'), [
        say(
          "These are drafts from the web, not figures I've checked. Confirm the ones you trust, and I'll compare them with what you spend on groceries.",
        ),
      ]),
      // the gap (flows.md): a question with options, then a button that opens manual with the day filled in
      msg('m:gap', 'sen', at('2026-10-18', '20:00'), [
        say('Nothing was captured on Sat 4 Oct, and your cash balance moved. Did you pay for anything that day?'),
        {
          type: 'ask',
          id: GAP_ASK,
          question: 'Did you pay for something on Sat 4 Oct?',
          options: [
            { label: 'Yes, I did', tradeoff: 'Opens a new payment with the day filled in.', recommended: true },
            { label: 'No, nothing', tradeoff: 'I stop asking about that day.', recommended: false },
            { label: 'Ask me again later', tradeoff: 'The gap stays on your balance check.', recommended: false },
          ],
          answer: null,
        },
        { type: 'open', label: 'Add a payment for Sat 4 Oct', screen: 'manual', id: null },
      ]),
    ],
    memory: [
      { id: 'mem:1', text: 'You are paid on the last working day of the month.', at: at('2026-09-30', '21:05') },
      {
        id: 'mem:2',
        text: 'Lunch at the hawker stall near work is meals, not groceries.',
        at: at('2026-10-02', '13:20'),
      },
      {
        id: 'mem:3',
        text: "You're saving for a trip in December. Keep that in mind before suggesting cuts.",
        at: at('2026-10-09', '21:10'),
      },
      { id: 'mem:4', text: 'Saturday dinners are usually split with Mei.', at: at('2026-10-14', '22:30') },
    ],
    older: [
      {
        id: 'brief:fd',
        question: 'Fixed deposit rates at banks in Malaysia',
        at: at('2026-09-12', '20:15'),
        findings: 4,
        confirmed: true,
      },
      {
        id: 'brief:digital',
        question: 'Savings accounts with daily interest',
        at: at('2026-08-21', '21:40'),
        findings: 5,
        confirmed: false,
      },
    ],
  };
}

/** Questions that fit the screen Sen was opened from (screens.md). */
const SUGGESTIONS: Record<string, string[]> = {
  Home: ['How am I doing this cycle?', 'What is due before payday?', 'Where did most of my money go?'],
  Review: ['What needs me most?', 'Why do these keep coming up?', 'Which of these can wait?'],
  Insights: ['What changed since last cycle?', 'Where could I spend less?', 'Am I on track for my goals?'],
  More: ['What did I pay last Friday?', 'Find a payment for me', 'What are my subscriptions?'],
  Scan: ['What can I do with a receipt?', 'Why was my last receipt unclear?'],
};

export function senView(db: Db, from: string, offline: boolean): SenView {
  return {
    // a copy: the query cache compares by value, and messages change in place (a streaming reply)
    messages: structuredClone(db.sen.messages),
    state: offline ? 'offline' : db.aiPausedUntil ? 'paused' : 'ready',
    pausedUntil: db.aiPausedUntil,
    suggestions: SUGGESTIONS[from] ?? SUGGESTIONS.Home!,
  };
}

export function memoryView(db: Db): MemoryView {
  return { notes: [...db.sen.memory].sort((a, b) => b.at.localeCompare(a.at)) };
}

export function researchView(db: Db): ResearchView {
  const inChat = db.sen.messages.flatMap((m) =>
    m.parts.flatMap((p) =>
      p.type === 'research'
        ? [{ id: m.id, question: p.question, at: m.at, findings: p.findings.length, confirmed: p.confirmed }]
        : [],
    ),
  );
  return { briefs: [...inChat, ...(db.sen.older ?? [])].sort((a, b) => b.at.localeCompare(a.at)) };
}

export function usageView(db: Db): UsageView {
  const paused = db.aiPausedUntil;
  if (db.settings.admin) {
    // the owner has no ledger: tokens (carried in `sen` here, as plain counts), and an estimate (§9.6)
    return {
      owner: true,
      unlimited: true,
      balance: 0,
      allowance: 0,
      allowanceLeft: 0,
      pausedUntil: paused,
      byUse: [
        { label: 'Chat', sen: 182_400 },
        { label: 'Receipts', sen: 96_100 },
        { label: 'Evening notes', sen: 41_700 },
      ],
      estimate: rm('3.80'),
    };
  }
  return {
    owner: false,
    unlimited: false,
    balance: paused ? 0 : rm('6.40'),
    allowance: rm('2.00'),
    allowanceLeft: paused ? 0 : rm('1.10'),
    pausedUntil: paused,
    byUse: [
      { label: 'Chat', sen: rm('0.62') },
      { label: 'Receipts', sen: rm('0.18') },
      { label: 'Evening notes', sen: rm('0.10') },
    ],
    estimate: null,
  };
}

/** What Sen says back, by what you asked: canned, with no figure it couldn't have got from a tool. */
function replyTo(text: string, file: boolean): SenPart[] {
  if (file)
    return [say("I've read your file. Tell me what you'd like to know about it, and I'll only quote what it says.")];
  if (/cashback|card|rate|deposit/i.test(text))
    return [say("I can look that up for you. It would take a minute, and I'd show you every source.")];
  return [
    say(
      "I looked at this cycle's payments. Nothing stands out, so I'd leave things as they are. Ask me about a category or a day and I'll check it.",
    ),
  ];
}

export const applySen: AreaApply = (db, cmd, ctx) => {
  switch (cmd.type) {
    case 'sen.send': {
      // a retried send with the same id is a no-op (§12.5)
      if (db.sen.messages.some((m) => m.id === cmd.id)) return { said: 'Sent', touched: [] };
      if (ctx.offline) throw new Error('Sen needs a connection.');
      if (db.aiPausedUntil) throw new Error('Sen is paused until your AI credit renews.');
      const parts: SenPart[] = [];
      if (cmd.file) parts.push({ type: 'file', name: cmd.file.name, kind: cmd.file.kind });
      if (cmd.text.trim()) parts.push(say(cmd.text.trim()));
      db.sen.messages.push({ id: cmd.id, role: 'you', at: nowIso(), checkin: false, parts, streaming: false });
      const replyId = `${cmd.id}:reply`;
      const full = replyTo(cmd.text, !!cmd.file);
      const reply = (parts: SenPart[], streaming: boolean) => (d: Db) => {
        // undone meanwhile: nothing to reply to
        if (!d.sen.messages.some((m) => m.id === cmd.id)) return;
        const mine = d.sen.messages.find((m) => m.id === replyId);
        if (mine) {
          mine.parts = parts;
          mine.streaming = streaming;
        } else d.sen.messages.push({ id: replyId, role: 'sen', at: nowIso(), checkin: false, parts, streaming });
      };
      // the words arrive first, then the finished message (§12.5)
      const first = full[0];
      const half =
        first?.type === 'text'
          ? [
              say(
                first.runs
                  .map((r) => r.text)
                  .join('')
                  .slice(0, 60)
                  .trimEnd() + '…',
              ),
            ]
          : full;
      ctx.later(700, reply(half, true));
      ctx.later(2200, reply(full, false));
      return { said: 'Sent', touched: [] };
    }
    case 'sen.answer': {
      for (const m of db.sen.messages)
        for (const p of m.parts) if (p.type === 'ask' && p.id === cmd.askId) p.answer = cmd.answer;
      return { said: `Answered: ${cmd.answer}`, touched: [] };
    }
    case 'proposal.answer': {
      for (const m of db.sen.messages)
        for (const p of m.parts)
          if (p.type === 'proposal' && p.id === cmd.id) p.status = cmd.answer === 'apply' ? 'applied' : 'dismissed';
      // the same proposal waits in Review: answering one answers both
      db.review = db.review.filter((r) => r.id !== cmd.id);
      return {
        said: cmd.answer === 'apply' ? 'Applied. 14 past payments stay as they are' : 'Dismissed',
        touched: [],
      };
    }
    case 'research.confirm': {
      for (const m of db.sen.messages)
        if (m.id === cmd.messageId) for (const p of m.parts) if (p.type === 'research') p.confirmed = true;
      return { said: 'Figures confirmed', touched: [] };
    }
    case 'memory.forget': {
      db.sen.memory = db.sen.memory.filter((n) => n.id !== cmd.id);
      return { said: 'Forgotten', touched: [] };
    }
    default:
      return null;
  }
};
