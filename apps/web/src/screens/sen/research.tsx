import type { ResearchView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { useResearch } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `agent/research` (screens.md, spec §12.2 rule 6): the briefs Sen has researched, each with how many
 * findings it has and whether you have confirmed its figures. A draft is confirmed in the chat.
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
      <EmptyState line="Ask Sen to look something up, such as which card pays the most cashback. Its research shows here." />
    );
  return (
    <div className="flex flex-col pb-4">
      <p className="px-4 pt-1 pb-2 text-sm text-muted-foreground">
        What Sen finds on the web is a draft until you confirm it. Briefs are deleted after 2 years.
      </p>
      <ItemGroup>
        {v.briefs.map((b, i) => (
          <div key={b.id}>
            {i ? <ItemSeparator /> : null}
            <Item size="sm" className="min-h-16 flex-nowrap rounded-none text-base">
              <ItemContent className="min-w-0 gap-0.5">
                <ItemTitle className="w-full text-base font-normal text-pretty wrap-anywhere">{b.question}</ItemTitle>
                <ItemDescription>
                  {b.findings} {b.findings === 1 ? 'finding' : 'findings'} · {shortDay(dayOfInstant(b.at))}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant={b.confirmed ? 'default' : 'outline'}>{b.confirmed ? 'Confirmed' : 'Draft'}</Badge>
              </ItemActions>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </div>
  );
}
