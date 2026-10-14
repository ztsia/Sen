import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import type { ResearchView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useResearch } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { SearchIcon } from 'lucide-react';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `agent/research` (screens.md, spec §12.2 rule 6): the briefs Sen has researched, each as a card with
 * how many findings it has and whether you have confirmed its figures. A draft is confirmed in the chat.
 */
export default function Research() {
  const q = useResearch();
  return (
    <Screen bar={<AppBar title="Research" />}>
      <Loaded q={q} what="your research">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: ResearchView }) {
  if (!v.briefs.length)
    return (
      <EmptyState
        icon={SearchIcon}
        title="No research yet"
        line="Ask Sen to look something up, such as which card pays the most cashback."
        action={{ label: 'Ask Sen', icon: SenMark, onSelect: () => useUi.getState().askSen('Look into this for me: ') }}
      />
    );
  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      <p className="px-4 text-sm text-muted-foreground">
        What Sen finds on the web is a draft until you confirm it. Briefs are deleted after 2 years.
      </p>
      <ul className="flex flex-col gap-2 px-4">
        {v.briefs.map((b) => (
          <li key={b.id}>
            <Card className="gap-0 py-0">
              <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-base font-medium text-pretty wrap-anywhere">{b.question}</p>
                  <p className="text-sm text-muted-foreground">
                    {b.findings} {b.findings === 1 ? 'finding' : 'findings'} · {shortDay(dayOfInstant(b.at))}
                  </p>
                </div>
                <Badge variant={b.confirmed ? 'accent' : 'outline'}>{b.confirmed ? 'Confirmed' : 'Draft'}</Badge>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
