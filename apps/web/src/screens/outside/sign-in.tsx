import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { OfflineBanner } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useOnline } from '@/lib/online';
import { useGo } from '../kit';
import { EMAIL_MESSAGES, checkCode, checkEmail, inviteEmail } from './logic';

/**
 * `sign-in` (screens.md, D13, D52): your email, then the 6-digit code it was sent. An invitation's link
 * lands with the email filled in. Made-up behaviour until B05: 123456 signs in, 000000 has expired,
 * anything else is wrong, and `stranger@…` was never invited.
 */
export default function SignIn() {
  const go = useGo();
  const online = useOnline();
  return (
    <Screen bar={<AppBar title="Sign in" home />}>
      {online ? null : <OfflineBanner>You’re offline. Signing in needs a connection.</OfflineBanner>}
      <div className="flex flex-col gap-6 px-4 pt-6">
        <SignInFlow onDone={() => go('home', {}, { replace: true })} />
      </div>
    </Screen>
  );
}

/** The two steps of signing in, also first run's first step. */
export function SignInFlow({ onDone }: { onDone: () => void }) {
  const online = useOnline();
  const [email, setEmail] = useState(() => inviteEmail(window.location.search));
  const [sentTo, setSentTo] = useState<string | null>(null);
  return sentTo ? (
    <CodeStep email={sentTo} online={online} onChangeEmail={() => setSentTo(null)} onDone={onDone} />
  ) : (
    <EmailStep email={email} setEmail={setEmail} online={online} onSent={setSentTo} />
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
  const [error, setError] = useState<string>();
  const submit = () => {
    const r = checkEmail(email);
    if (r.ok) onSent(r.email);
    else setError(EMAIL_MESSAGES[r.reason]);
  };
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-2xl font-semibold text-balance">Sign in to Sen</h2>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="email">Your email</FieldLabel>
        <Input
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
      <Button type="submit" size="lg" disabled={!online}>
        Send the code
      </Button>
    </form>
  );
}

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
  const [problem, setProblem] = useState<'wrong' | 'expired' | 'incomplete'>();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const submit = () => {
    const r = checkCode(code);
    if (r === 'ok') onDone();
    else {
      setProblem(r);
      input.current?.focus();
    }
  };
  const resend = () => {
    setCode('');
    setProblem(undefined);
    toastDone(`A new code is on its way to ${email}.`);
    input.current?.focus();
  };
  const message =
    problem === 'expired'
      ? 'That code has expired.'
      : problem === 'wrong'
        ? 'That’s not the right code. Check the email and try again.'
        : problem === 'incomplete'
          ? 'The code is 6 digits.'
          : undefined;
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-2xl font-semibold text-balance">Type the code</h2>
      <p className="text-base text-pretty">
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
          {message ? <FieldError>{message}</FieldError> : null}
        </div>
      </Field>
      <Button type="submit" size="lg" disabled={!online}>
        Sign in
      </Button>
      <div className="flex flex-col gap-1">
        <Button type="button" variant={problem === 'expired' ? 'default' : 'outline'} onClick={resend}>
          Send a new code
        </Button>
        <Button type="button" variant="ghost" onClick={onChangeEmail}>
          Use a different email
        </Button>
      </div>
    </form>
  );
}
