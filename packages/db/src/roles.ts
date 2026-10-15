import { createHmac } from 'node:crypto';

/** The two roles that log in besides the owner (spec §17). */
export type LoginRole = 'app_user' | 'sen_auth';

/**
 * A role's password, derived from Better Auth's secret, so the owner adds no variable and no session
 * ever sees one: the deploy step sets it (deploy.ts), the API derives the same one to connect. Rotating
 * BETTER_AUTH_SECRET rotates both at the next deploy. 256 bits, well past Neon's 60-bit minimum.
 */
export function rolePassword(secret: string, role: LoginRole): string {
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET is too short to derive a database password from');
  return createHmac('sha256', secret).update(`sen database role ${role}`).digest('base64url');
}

/**
 * The URL a role connects with: the owner's (pooled) URL with its credentials replaced. Only the host,
 * port, database and parameters are kept; the owner's name and password never reach a connection.
 */
export function roleUrl(ownerUrl: string, role: LoginRole, password: string | null): string {
  const u = new URL(ownerUrl);
  u.username = role;
  u.password = password ?? '';
  return u.toString();
}
