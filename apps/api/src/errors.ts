import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';

/** Every error the API sends (spec §16): `{ code, message, field? }`. */
export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export const signedOut = () => new ApiError(401, 'signed_out', 'Sign in to Sen.');
export const forbidden = () => new ApiError(403, 'forbidden', 'Only the admin can do that.');
export const notFound = () => new ApiError(404, 'not_found', 'That isn’t here.');
export const suspended = () =>
  new ApiError(403, 'suspended', 'Your access to Sen is paused. Ask the person who invited you.');
export const notBuilt = (slice: string) => new ApiError(501, 'not_built', `That arrives with ${slice}.`);

/** zod's first problem, as the field it's about. */
export function invalid(error: z.ZodError): ApiError {
  const issue = error.issues[0];
  const field = issue?.path.length ? issue.path.join('.') : undefined;
  return new ApiError(400, 'invalid', issue?.message ?? 'That isn’t valid.', field);
}

/** Parses `data` with `schema`, or throws the 400 the client shows by the field. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw invalid(r.error);
  return r.data;
}

/** The request's JSON body, or a 400 when it isn't JSON (QA B05 run 1, 5). */
export async function readJson(c: Context): Promise<unknown> {
  let text: string;
  try {
    text = await c.req.text();
  } catch {
    throw new ApiError(400, 'invalid', 'That isn’t valid JSON.');
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, 'invalid', 'That isn’t valid JSON.');
  }
  if (hasNul(value)) throw nulRefused();
  return value;
}

/**
 * Postgres keeps no NUL character, in text or JSON (QA B05 run 2, 20): one anywhere in a body is a
 * 400. Only a real NUL counts, not the text `\u0000` (run 3, 34).
 */
export function hasNul(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('\0');
  if (Array.isArray(value)) return value.some(hasNul);
  if (value && typeof value === 'object') return Object.entries(value).some(([k, v]) => k.includes('\0') || hasNul(v));
  return false;
}
export const nulRefused = () => new ApiError(400, 'invalid', 'That has a character Sen can’t keep.');

/** A request from Sen's own pages, or with no Origin at all; a malformed or `null` Origin isn't (run 3, 33). */
export function sameOrigin(c: Context): boolean {
  const origin = c.req.header('origin');
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === new URL(c.req.url).host;
  } catch {
    return false;
  }
}

/** Hono's onError: known errors keep their shape; anything else is a 500 that says nothing of why. */
export function onError(err: Error, c: Context) {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = { code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) };
    return c.json(body, err.status);
  }
  if (err instanceof HTTPException) return c.json({ code: 'http', message: err.message }, err.status);
  // RLS refusing a write reaches here as SQLSTATE 42501: to the client, it's simply not theirs
  // (drizzle wraps Postgres' error in its own, with the original as `cause`)
  const pgCode = (err as { code?: string }).code ?? (err.cause as { code?: string } | undefined)?.code;
  if (pgCode === '42501') return c.json({ code: 'forbidden', message: 'That isn’t yours.' }, 403);
  console.error(err);
  return c.json({ code: 'server', message: 'Something went wrong on Sen’s side.' }, 500);
}
