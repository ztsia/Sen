import { ChevronRightIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { DEV_TOOLS } from '@/lib/env';
import { SCREENS, showsSenButton, type ScreenDef } from './registry';

/**
 * A screen that isn't built yet. In production it says "Not built yet" and shows no data (modules.md,
 * rule 6). Every screen is one of these until its slice makes it real. A tab lists the screens it
 * leads to, so every screen can be reached.
 */
export function Placeholder({ screen }: { screen: ScreenDef }) {
  // A tab lists the screens pushed from it; Settings lists its own sections (settings/…), which the More
  // tab leaves to it, so no title shows twice there. A step inside a section (settings/capture/apps) is
  // reached from that section.
  const children =
    screen.kind === 'tab'
      ? SCREENS.filter((d) => d.tab === screen.id && d.kind === 'pushed' && !d.id.startsWith('settings/'))
      : screen.id === 'settings'
        ? SCREENS.filter((d) => d.id.startsWith('settings/') && d.id.split('/').length === 2)
        : [];
  return (
    <Screen bar={<AppBar title={screen.title} home={screen.id === 'home'} />} senRoom={showsSenButton(screen)}>
      {screen.id === 'home' ? <h2 className="sr-only">Home</h2> : null}
      <div className="flex flex-col gap-1 px-5 pt-4 pb-6">
        <p className="text-lg font-medium" data-testid="not-built">
          Not built yet
        </p>
        {DEV_TOOLS ? (
          <p className="text-sm text-muted-foreground">
            <code>{screen.id}</code> is a skeleton. {screen.slice} builds it.
          </p>
        ) : null}
      </div>
      {children.length ? (
        <ItemGroup>
          {children.map((d) => (
            <Item key={d.id} asChild size="sm" className="min-h-14 rounded-none text-base active:bg-accent">
              <Link to="/s/$" params={{ _splat: d.id }}>
                <ItemContent>
                  <ItemTitle className="text-base font-normal">{d.title}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
                </ItemActions>
              </Link>
            </Item>
          ))}
        </ItemGroup>
      ) : null}
    </Screen>
  );
}
