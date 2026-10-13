import { ChevronDownIcon, CopyIcon, InboxIcon, KeyRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupCard, GroupLabel, NavRow } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { Steps } from '@/blocks/steps';
import { toastDone } from '@/blocks/toast';
import { useSettings } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded } from '../kit';

/** Copies text to the clipboard, or says why it can't (a browser without permission, an old webview). */
async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toastDone(`${what} copied`);
  } catch {
    toastDone(`Couldn’t copy. Select the ${what.toLowerCase()} and copy it by hand.`);
  }
}

const GMAIL_STEPS = [
  { title: 'Copy the address above.' },
  { title: 'In Gmail, open Settings, then Forwarding and POP/IMAP, and add it as a forwarding address.' },
  { title: 'Gmail sends a confirmation code to Sen. It shows below once it arrives.' },
  { title: 'Make a filter for your receipts, such as from their senders, to forward them to this address.' },
];

/**
 * Settings → Receipts by email (screens.md; D56): your forwarding address, to copy, the steps to set
 * the Gmail forward (folded away once Gmail is confirmed), and Gmail's confirmation code once it
 * reaches Sen's inbox.
 */
export default function Email() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Receipts by email" />}>
      <Loaded q={q} what="your address" skeleton={<ListSkeleton rows={3} />}>
        {(v) => {
          const { address, code, received } = v.receiptsByEmail;
          // no code waiting and mail already arriving: Gmail is set up, so its steps fold away
          const confirmed = !code && received > 0;
          return (
            <div className="flex flex-col gap-5 pt-2 pb-8">
              <section className="flex flex-col gap-2 px-4" aria-label="Your address">
                <GroupLabel>Your address</GroupLabel>
                <Card className="flex-row items-center gap-2 py-3 pr-2 pl-4">
                  <p className="min-w-0 flex-1 text-base break-all select-all" data-testid="forward-address">
                    {address}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy address"
                    onClick={() => void copyText(address, 'Address')}
                  >
                    <CopyIcon aria-hidden="true" />
                  </Button>
                </Card>
              </section>
              <section className="flex flex-col gap-2" aria-label="Set up Gmail">
                {confirmed ? (
                  <details className="group px-4">
                    <summary className="tap flex cursor-pointer list-none items-center justify-between gap-2 px-1 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                      Set up Gmail
                      <ChevronDownIcon
                        className="size-4 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="-mx-4 pt-2">
                      <Steps steps={GMAIL_STEPS.map((s) => ({ ...s, done: false }))} />
                    </div>
                  </details>
                ) : (
                  <>
                    <div className="px-4">
                      <GroupLabel>Set up Gmail</GroupLabel>
                    </div>
                    <Steps steps={GMAIL_STEPS} />
                  </>
                )}
              </section>
              <section className="flex flex-col gap-2 px-4" aria-label="Confirmation">
                <GroupLabel>Confirmation</GroupLabel>
                {code ? (
                  <Card className="gap-1 px-4">
                    <p className="text-sm text-muted-foreground">Gmail’s code. Type it into Gmail to confirm.</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="num text-4xl font-semibold tracking-widest select-all" data-testid="gmail-code">
                        {code}
                      </p>
                      <Button variant="secondary" size="sm" onClick={() => void copyText(code, 'Code')}>
                        <CopyIcon aria-hidden="true" />
                        Copy code
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card className="flex-row items-center gap-3 px-4">
                    <KeyRoundIcon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No code yet. It appears here as soon as Gmail sends it to Sen.
                    </p>
                  </Card>
                )}
              </section>
              <GroupCard label="Received">
                <NavRow icon={InboxIcon} title="Received by email" value={String(received)} />
              </GroupCard>
            </div>
          );
        }}
      </Loaded>
    </Screen>
  );
}
