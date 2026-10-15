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

/** Hono's onError: known errors keep their shape; anything else is a 500 that says nothing of why. */
export function onError(err: Error, c: Context) {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = { code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) };
    return c.json(body, err.status);
  }
  if (err instanceof HTTPException) return c.json({ code: 'http', message: err.message }, err.status);
  // RLS refusing a write reaches here as SQLSTATE 42501: to the client, it's simply not theirs
  if ((err as { code?: string }).code === '42501')
    return c.json({ code: 'forbidden', message: 'That isn’t yours.' }, 403);
  console.error(err);
  return c.json({ code: 'server', message: 'Something went wrong on Sen’s side.' }, 500);
}
