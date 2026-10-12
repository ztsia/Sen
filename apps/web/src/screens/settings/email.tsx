import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/blocks/rows';
import { ListSkeleton } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { useSettings } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, Section } from '../kit';

/** Copies text to the clipboard, or says why it can't (a browser without permission, an old webview). */
async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toastDone(`${what} copied`);
  } catch {
    toastDone(`Couldn’t copy. Select the ${what.toLowerCase()} and copy it by hand.`);
  }
}

/**
 * Settings → Receipts by email (screens.md; D56): your forwarding address, to copy, the steps to set
 * the Gmail forward, and Gmail's confirmation code once it reaches Sen's inbox.
 */
export default function Email() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Receipts by email" />}>
      <Loaded q={q} what="your address" skeleton={<ListSkeleton rows={3} />}>
        {(v) => {
          const { address, code, received } = v.receiptsByEmail;
          return (
            <div className="flex flex-col pb-6">
              <Section title="Your address">
                <div className="flex flex-col gap-3 px-4 pt-1">
                  <p className="text-base break-all select-all" data-testid="forward-address">
                    {address}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => void copyText(address, 'Address')}
                  >
                    <CopyIcon aria-hidden="true" />
                    Copy address
                  </Button>
                </div>
              </Section>
              <Section title="Set up Gmail">
                <ol className="list-decimal space-y-2 pt-1 pr-4 pl-10 text-base">
                  <li>Copy the address above.</li>
                  <li>In Gmail, open Settings, then Forwarding and POP/IMAP, and add it as a forwarding address.</li>
                  <li>Gmail sends a confirmation code to Sen. It shows below once it arrives.</li>
                  <li>Make a filter for your receipts, such as from their senders, to forward them to this address.</li>
                </ol>
              </Section>
              <Section title="Confirmation">
                {code ? (
                  <div className="flex flex-col gap-3 px-4 pt-1">
                    <p className="text-sm text-muted-foreground">Gmail’s code. Type it into Gmail to confirm.</p>
                    <p className="num text-4xl font-semibold tracking-widest select-all" data-testid="gmail-code">
                      {code}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="self-start"
                      onClick={() => void copyText(code, 'Code')}
                    >
                      <CopyIcon aria-hidden="true" />
                      Copy code
                    </Button>
                  </div>
                ) : (
                  <p className="px-4 pt-1 text-sm text-muted-foreground">
                    No code yet. It appears here as soon as Gmail sends it to Sen.
                  </p>
                )}
              </Section>
              <Section title="Received">
                <SettingsRow label="Received by email" value={String(received)} />
              </Section>
            </div>
          );
        }}
      </Loaded>
    </Screen>
  );
}
