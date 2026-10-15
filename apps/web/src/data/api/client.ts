/** An error the API sent (spec §16): `{ code, message, field? }`, with its status. */
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

const signedOutListeners = new Set<() => void>();

/** Called whenever the API says the session is gone (401), so the app can go to sign-in. */
export function onSignedOut(fn: () => void): () => void {
  signedOutListeners.add(fn);
  return () => signedOutListeners.delete(fn);
}

/**
 * One call to the API, on the web app's own origin (/api, spec §16), with the session cookie. JSON in
 * and out; any answer but 2xx throws an ApiFailure, and no connection throws one with status 0.
 */
export async function apiCall<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      headers: init.body === undefined ? {} : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiFailure(0, 'offline', 'Sen can’t reach its server. Check the connection.');
  }
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const e = (body ?? {}) as { code?: string; message?: string; field?: string };
    if (res.status === 401 && e.code === 'signed_out') for (const fn of signedOutListeners) fn();
    throw new ApiFailure(res.status, e.code ?? 'http', e.message ?? res.statusText, e.field);
  }
  return body as T;
}
