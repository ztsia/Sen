import { useEffect, useRef, useState } from 'react';
import { PaperclipIcon, SendHorizontalIcon, XIcon } from 'lucide-react';
import type { SenView } from '@sen/core/views';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSen, useWrite } from '@/data/hooks';
import { useUi } from '@/frame/ui-store';
import { shortDay } from '@/lib/dates';
import { newId } from '@/lib/uid';
import { Loaded, useGo } from '../kit';
import { FileChip, Message } from './parts';

/**
 * The body of `sen`'s sheet (screens.md, spec §12.5): the one conversation, then the composer with its
 * clip button for a photo, screenshot or PDF (D109), and suggested questions that fit the screen it
 * was opened from. Streaming, offline and paused each say so in words (§9.6).
 */
export default function Conversation({ from }: { from: string }) {
  const q = useSen(from);
  return (
    <Loaded q={q} what="your chat with Sen" skeleton={<ListSkeleton rows={3} />}>
      {(v) => <Body v={v} from={from} />}
    </Loaded>
  );
}

const kindOf = (f: File): 'pdf' | 'image' => (f.type === 'application/pdf' ? 'pdf' : 'image');

function Body({ v, from }: { v: SenView; from: string }) {
  const write = useWrite();
  const go = useGo();
  const setSenOpen = useUi((s) => s.setSenOpen);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  // a reply is on its way: streaming, or yours is the last message and Sen hasn't started yet
  const streaming = v.messages.some((m) => m.streaming) || v.messages.at(-1)?.role === 'you';
  const ready = v.state === 'ready';
  const canSend = ready && !streaming && (text.trim() !== '' || file !== null);

  // the newest message stays in view as it arrives and as it streams
  const last = v.messages.at(-1);
  const lastSize = last?.parts.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [v.messages.length, lastSize, last?.streaming]);

  const send = (said: string, attached: File | null) => {
    void write(
      {
        type: 'sen.send',
        id: newId(),
        text: said,
        file: attached ? { name: attached.name, kind: kindOf(attached) } : null,
        from,
      },
      { quiet: true },
    );
  };
  const submit = () => {
    if (!canSend) return;
    send(text.trim(), file);
    setText('');
    setFile(null);
  };
  // closes the sheet, replacing its history step as Scan's long-press sheet does, then opens the screen
  const open = (screen: string, id: string | null) => {
    setSenOpen(false);
    go(screen, id ? { id } : {}, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="scroll-area min-h-0 flex-1 pb-2">
        {v.messages.length ? (
          <ol className="flex flex-col gap-4 py-2" aria-label="Conversation" aria-live="polite">
            {v.messages.map((m) => (
              <Message key={m.id} message={m} onOpen={open} />
            ))}
          </ol>
        ) : (
          <EmptyState line="Ask about your money. Sen only states figures it has looked up, and shows you where a file's figure came from." />
        )}
        <div ref={end} />
      </div>
      {v.state === 'offline' ? (
        <Alert>
          <AlertDescription>
            Sen needs a connection. Everything else works, and what you add waits until you&apos;re back online.
          </AlertDescription>
        </Alert>
      ) : null}
      {v.state === 'paused' ? (
        <Alert>
          <AlertDescription>
            Sen is paused until {v.pausedUntil ? shortDay(v.pausedUntil) : 'your credit renews'}; everything else works.
          </AlertDescription>
        </Alert>
      ) : null}
      {ready && !streaming && !text && !file && v.suggestions.length ? (
        <div
          className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]"
          role="group"
          aria-label="Suggested questions"
        >
          {v.suggestions.map((s) => (
            <Button key={s} variant="outline" size="chip" className="shrink-0" onClick={() => send(s, null)}>
              {s}
            </Button>
          ))}
        </div>
      ) : null}
      {file ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <FileChip name={file.name} kind={kindOf(file)} />
          </div>
          <Button variant="ghost" size="icon" aria-label={`Remove ${file.name}`} onClick={() => setFile(null)}>
            <XIcon />
          </Button>
        </div>
      ) : null}
      <form
        className="flex items-end gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={picker}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Add a photo, screenshot or PDF"
          disabled={!ready || streaming}
          onClick={() => picker.current?.click()}
        >
          <PaperclipIcon />
        </Button>
        <Textarea
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          // sen.send takes 4000 characters at most (QA B04 run 2, 20)
          maxLength={4000}
          placeholder={ready ? 'Ask Sen' : 'Sen is not answering right now'}
          aria-label="Message to Sen"
          disabled={!ready}
          className="max-h-32 min-h-12 flex-1 resize-none"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={!canSend}>
          <SendHorizontalIcon />
        </Button>
      </form>
    </div>
  );
}
