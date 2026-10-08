import type { AvatarState } from '@sen/looks';
import { Avatar } from '@/components/look/avatar';

/** Sen's button (D68): its avatar in its current state, 60 px, bottom right on the five tab screens. */
export function SenButton({ state, onOpen }: { state: AvatarState; onOpen: () => void }) {
  return (
    <button type="button" className="fab absolute right-4 bottom-[calc(100%+12px)] z-[var(--z-index-fab)]" aria-label="Ask Sen" onClick={onOpen}>
      <Avatar state={state} size={60} />
    </button>
  );
}
