import { useEffect, useRef, useState } from 'react';
import { auth, signedOutReason, type SendResult } from '@/data/auth';
import { queryClient } from '@/data';
import { Avatar } from '@/components/look/avatar';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toastDone } from '@/blocks/toast';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { DEV_TOOLS } from '@/lib/env';
import { useOnline } from '@/lib/online';
import { useGo } from '../kit';
import { EMAIL_MESSAGES, EXPIRED_ASK, checkEmail, inviteEmail, signInState } from './logic';

const OFFLINE = 'Sen can’t reach its server. Check the connection.';
const FAILED = 'Something went wrong on Sen’s side. Try again.';
const TOO_MANY_SENT = 'Too many codes asked for. Wait a few minutes, then try again.';
const WAIT = 'Too many tries in a minute. Wait a minute, then try again.';
const PAUSED = 'Your access to Sen is paused. Ask the person who invited you.';
const ENDED = 'You were signed out. Sign in again to carry on.';
const MAIL_FAILED = 'Sen couldn’t send the email. Try again in a minute.';
const PREVIEW_CODE = '123456';
// A preview's one person, made up and seeded by db-deploy.ts: the review app opens on sign-in, so the
// address is filled in for whoever reviews it (previews hold only made-up data, spec §17).
const PREVIEW_EMAIL = 'weiming@example.com';

/**
 * `sign-in` (screens.md, D13, D52): your email, then the 6-digit code it was sent. An invitation's link
 * lands with the email filled in. The code is checked by the server (B05); on the made-up backend 123456
 * signs in, 000000 has expired, anything else is wrong, and `stranger@…` was never invited.
 */
export default function SignIn() {
  const go = useGo();
  const [expired] = useState(() => signInState(window.location.search, DEV_TOOLS) === 'expired');
  return (
    <Screen bar={<AppBar title="Sign in" home />}>
      <div className="flex flex-col items-center gap-6 px-4 pt-8">
        {expired ? <ExpiredInvitation /> : <SignInFlow onDone={() => go('home', {}, { replace: true })} />}
      </div>
    </Screen>
  );
}

/** An invitation's link past its time: it says who to ask, and sends nothing (D52). */
function ExpiredInvitation() {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <Avatar state="resting" size={96} />
      <h2 className="text-2xl font-semibold text-balance">This invitation has expired</h2>
      <p className="text-base text-pretty">An invitation works for a few days. This one is past that.</p>
      <Button onClick={() => toastDone(EXPIRED_ASK)}>Ask for a new invitation</Button>
    </div>
  );
}

/** The two steps of signing in, also first run's first step. */
export function SignInFlow({ onDone }: { onDone: () => void }) {
  const online = useOnline();
  const [email, setEmail] = useState(
    () => inviteEmail(window.location.search) || (__SEN_BACKEND__ === 'api' && DEV_TOOLS ? PREVIEW_EMAIL : ''),
  );
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Avatar state="resting" size={96} />
      {sentTo ? (
        <CodeStep email={sentTo} online={online} onChangeEmail={() => setSentTo(null)} onDone={onDone} />
      ) : (
        <EmailStep email={email} setEmail={setEmail} online={online} onSent={setSentTo} />
      )}
    </div>
  );
}

function EmailStep({
  email,
  setEmail,
  online,
  onSent,
}: {
  email: string;
  setEmail: (e: string) => void;
  online: boolean;
  onSent: (email: string) => void;
}) {
  // the one field is ready to type in (patterns §7 Forms; QA B05 run 2, 24)
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  // sent here because access was paused, or the session ended: say so (QA B05 run 1, 10; lived-in)
  const [error, setError] = useState<string | undefined>(() =>
    signedOutReason() === 'paused' ? PAUSED : signedOutReason() === 'ended' ? ENDED : undefined,
  );
  const [waiting, setWaiting] = useState(false);
  const submit = async () => {
    const r = checkEmail(email);
    if (!r.ok) return setError(EMAIL_MESSAGES[r.reason]);
    // enabled offline, saying what's missing (patterns §7, QA B05 run 1, 9)
    if (!online) return setError(OFFLINE);
    setWaiting(true);
    const sent = await auth.send(r.email);
    setWaiting(false);
    if (sent === 'sent') onSent(r.email);
    else setError(sendMessage(sent));
  };
  return (
    <form
      className="flex w-full flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-center text-2xl font-semibold text-balance">Sign in to Sen</h2>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="email">Your email</FieldLabel>
        <Input
          ref={field}
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="send"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          aria-invalid={error ? true : undefined}
          aria-describedby="email-msg"
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
        />
        <div id="email-msg" aria-live="polite">
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>Sen emails you a 6-digit code. There’s no password.</FieldDescription>
          )}
        </div>
      </Field>
      <Button type="submit" disabled={waiting} aria-busy={waiting || undefined}>
        <Pending on={waiting} label="Sending the code…">
          Send the code
        </Pending>
      </Button>
    </form>
  );
}

function sendMessage(r: Exclude<SendResult, 'sent'>): string {
  const said: Record<Exclude<SendResult, 'sent'>, string> = {
    'not-invited': EMAIL_MESSAGES['invitation-only'],
    suspended: PAUSED,
    'too-many': TOO_MANY_SENT,
    'mail-failed': MAIL_FAILED,
    offline: OFFLINE,
    failed: FAILED,
  };
  return said[r];
}

type Problem = 'wrong' | 'expired' | 'incomplete' | 'too-many' | 'wait' | 'offline' | 'failed' | 'send';

function CodeStep({
  email,
  online,
  onChangeEmail,
  onDone,
}: {
  email: string;
  online: boolean;
  onChangeEmail: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<Problem>();
  const [sendProblem, setSendProblem] = useState<string>();
  // Which request is on its way: the buttons wait for both, and the one that sent it says so.
  const [busy, setBusy] = useState<'verify' | 'send'>();
  const waiting = busy !== undefined;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const submit = async () => {
    input.current?.focus();
    if (!/^\d{6}$/.test(code)) return setProblem('incomplete');
    if (!online) return setProblem('offline');
    setBusy('verify');
    const r = await auth.verify(email, code);
    if (r === 'ok') {
      await queryClient.resetQueries();
      setBusy(undefined);
      onDone();
      return;
    }
    setBusy(undefined);
    setProblem(r);
  };
  const resend = async () => {
    setCode('');
    setProblem(undefined);
    setSendProblem(undefined);
    input.current?.focus();
    setBusy('send');
    const r = await auth.send(email);
    setBusy(undefined);
    if (r === 'sent') toastDone(`A new code is on its way to ${email}.`);
    else {
      setSendProblem(sendMessage(r));
      setProblem('send');
    }
  };
  const message =
    problem === 'expired'
      ? 'That code has expired.'
      : problem === 'wrong'
        ? 'That’s not the right code. Check the email and try again.'
        : problem === 'incomplete'
          ? 'The code is 6 digits.'
          : problem === 'wait'
            ? WAIT
            : problem === 'too-many'
              ? 'That code has had too many tries. Send a new code.'
              : problem === 'offline'
                ? OFFLINE
                : problem === 'failed'
                  ? FAILED
                  : problem === 'send'
                    ? sendProblem
                    : undefined;
  return (
    <form
      className="flex w-full flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-center text-2xl font-semibold text-balance">Type the code</h2>
      <p className="text-center text-base text-pretty">
        Sen sent a 6-digit code to <span className="font-semibold wrap-anywhere">{email}</span>.
      </p>
      <Field data-invalid={message ? true : undefined}>
        <FieldLabel htmlFor="code">6-digit code</FieldLabel>
        <Input
          ref={input}
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          maxLength={6}
          pattern="[0-9]*"
          className="num h-14 text-center text-3xl tracking-[0.4em]"
          placeholder="------"
          value={code}
          aria-invalid={message ? true : undefined}
          aria-describedby="code-msg"
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setProblem(undefined);
          }}
        />
        <div id="code-msg" aria-live="polite">
          {message ? (
            <FieldError>{message}</FieldError>
          ) : __SEN_BACKEND__ === 'api' && DEV_TOOLS ? (
            <FieldDescription>Previews have no email: the code is {PREVIEW_CODE}.</FieldDescription>
          ) : null}
        </div>
      </Field>
      <Button type="submit" disabled={waiting} aria-busy={busy === 'verify' || undefined}>
        <Pending on={busy === 'verify'} label="Signing in…">
          Sign in
        </Pending>
      </Button>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant={problem === 'expired' || problem === 'too-many' ? 'default' : 'outline'}
          disabled={waiting}
          aria-busy={busy === 'send' || undefined}
          onClick={() => void resend()}
        >
          <Pending on={busy === 'send'} label="Sending…">
            Send a new code
          </Pending>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onChangeEmail}>
          Use a different email
        </Button>
      </div>
    </form>
  );
}

/**
 * A button's label while its request is on its way: a spinner and words saying what's happening, so a
 * slow server never looks like a tap that did nothing (qa/escapes.md E2).
 */
function Pending({ on, label, children }: { on: boolean; label: string; children: React.ReactNode }) {
  if (!on) return children;
  return (
    <>
      <Spinner aria-hidden />
      {label}
    </>
  );
}
