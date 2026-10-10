import type { QueryClient } from '@tanstack/react-query';
import { useUi } from '@/frame/ui-store';
import { createFake } from './index';
import { SCENARIOS, type ScenarioId } from './variants';

/**
 * Wires the fake to the dev panel and the page: its scenario and screen state (?scenario= and ?state=
 * pick them on load, for links and tests), the connection, and "something changed", which refetches
 * every screen (D100).
 */
export function connect(client: QueryClient) {
  const fake = createFake(useUi.getState().scenario);
  const apply = () => {
    const { scenario, devState } = useUi.getState();
    fake.reset(scenario, { empty: devState === 'empty', offline: devState === 'offline' || !navigator.onLine });
    fake.setReadMode(devState === 'loading' ? 'loading' : devState === 'error' ? 'error' : 'normal');
  };
  apply();
  useUi.subscribe((s, prev) => {
    if (s.scenario === prev.scenario && s.devState === prev.devState) return;
    apply();
    void client.resetQueries();
  });
  const online = () => fake.setOffline(useUi.getState().devState === 'offline' || !navigator.onLine);
  window.addEventListener('online', online);
  window.addEventListener('offline', online);
  fake.subscribe(() => void client.invalidateQueries());
  return fake;
}

export const isScenario = (x: unknown): x is ScenarioId => SCENARIOS.includes(x as ScenarioId);
