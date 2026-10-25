import { describe, expect, it } from 'vitest';
import { screenTarget } from './push';

describe('where a push opens', () => {
  it('names a screen of the registry', () => {
    expect(screenTarget({ open: 'settings/data' })).toEqual({ id: 'settings/data' });
  });
  it('takes a tab to its own path', () => {
    expect(screenTarget({ open: 'review' })).toEqual({ to: '/review' });
    expect(screenTarget({ open: 'home' })).toEqual({ to: '/' });
  });
  it('ignores anything else', () => {
    for (const data of [undefined, null, 'settings/data', {}, { open: 3 }, { open: 'nowhere' }, { open: 'cycle' }])
      expect(screenTarget(data)).toBeNull();
  });
});
