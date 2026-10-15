import nodemailer from 'nodemailer';

export interface Mailer {
  sendCode(to: string, code: string): Promise<void>;
}

/**
 * Sign-in codes go out from Sen's own Gmail (D54), through its app password. Plain and short, which
 * is what reaches an inbox rather than spam (Q14). The code is in the subject, so it shows in the
 * phone's notification.
 */
export function gmailMailer(gmail: { user: string; password: string }): Mailer {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmail.user, pass: gmail.password },
  });
  return {
    async sendCode(to, code) {
      await transport.sendMail({
        from: { name: 'Sen', address: gmail.user },
        to,
        subject: `${code} is your Sen code`,
        text: `Your code to sign in to Sen is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, ignore this email: nobody can sign in without it.\n`,
      });
    },
  };
}

/** Previews and a local server send nothing: their code is always PREVIEW_CODE, which the dev panel says. */
export const PREVIEW_CODE = '123456';
export const noMail: Mailer = { sendCode: async () => undefined };
