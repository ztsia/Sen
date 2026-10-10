import { describe, expect, it } from 'vitest';
import { LOOK_IDS, loadLook } from '@sen/looks';

// Home's column as the app draws it, in the parts a look's decorate reaches for.
const column = () => {
  const root = document.createElement('div');
  root.setAttribute('data-payday', '');
  root.innerHTML = `<div data-slot="card"><p>Payday</p></div>
    <div class="hero"><span class="hero-fig"></span><span class="strip"></span></div>
    <button data-testid="quiet"><div data-slot="item-title">RM1</div></button>`;
  return root;
};

describe.each(LOOK_IDS)('%s on Home', (id) => {
  it('adds its material and takes all of it away again', async () => {
    const look = await loadLook(id);
    if (!look.decorate) return; // Instrument and Copper decorate nothing: only their payday effect, and Copper's patina
    const root = column();
    const before = root.innerHTML;
    const off = look.decorate(root, 'light');
    expect(root.innerHTML, 'it drew something').not.toBe(before);
    off();
    expect(root.innerHTML).toBe(before);
  });

  it('hides what it draws from assistive tech', async () => {
    const look = await loadLook(id);
    if (!look.decorate) return;
    const root = column();
    const mark = root.cloneNode(true) as HTMLElement;
    const off = look.decorate(root, 'dark');
    const added = [...root.querySelectorAll('.wm-rosette, .micro, .seal, .room, .beads, .sky')];
    for (const el of added) expect(el.getAttribute('aria-hidden')).toBe('true');
    off();
    expect(root.innerHTML).toBe(mark.innerHTML);
  });
});
