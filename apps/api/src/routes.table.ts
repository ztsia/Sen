/**
 * Every route the API serves, for the route sweep (apps/api/test/sweep.test.ts, D139). The sweep fires
 * the same bad requests at each: signed out, as someone without the right, another person's id, a
 * foreign or `null` Origin, not JSON, a NUL, deep nesting, an oversized body, the wrong method and an
 * unknown path. A route the app registers that isn't listed here fails the sweep, so a new route gets
 * every check by being listed. Nothing here is read in production.
 */

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Who may call it:
 * - `public`: anyone (health)
 * - `auth`: Better Auth's own, or Sen's sign-in route: open, but writes only from Sen's pages, as JSON
 * - `person`: a signed-in person, as themselves (RLS)
 * - `admin`: the admin only (D52); everyone else gets 403
 * - `scheduler`: the Cloudflare Worker, with the scheduler secret as a bearer token (D99); no browser
 *   calls it, so it isn't held to the same-origin and JSON checks, and it reads no body
 */
export type Access = 'public' | 'auth' | 'person' | 'admin' | 'scheduler';

export interface RouteSpec {
  method: Method;
  /** As Hono registers it, under /api. */
  path: string;
  access: Access;
  /** The paths actually called, when `path` is a pattern (`/api/auth/*`); defaults to `path`. */
  calls?: string[];
  /** A body the route accepts, for a write: sent first, so the bad variants hit a route that works. */
  body?: unknown;
}

export const ROUTES: RouteSpec[] = [
  { method: 'GET', path: '/api/health', access: 'public' },
  { method: 'POST', path: '/api/jobs/tick', access: 'scheduler' },
  { method: 'GET', path: '/api/health/jobs', access: 'public' },
  {
    method: 'POST',
    path: '/api/auth/email-otp/send-verification-otp',
    access: 'auth',
    body: { email: '<member>', type: 'sign-in' },
  },
  // Better Auth's handler; the sweep calls the endpoints Sen's pages use (apps/web/src/data/auth.ts)
  { method: 'GET', path: '/api/auth/*', access: 'auth', calls: ['/api/auth/get-session'] },
  {
    method: 'POST',
    path: '/api/auth/*',
    access: 'auth',
    calls: ['/api/auth/sign-in/email-otp', '/api/auth/sign-out', '/api/auth/revoke-sessions'],
  },
  { method: 'GET', path: '/api/me', access: 'person' },
  { method: 'GET', path: '/api/settings', access: 'person' },
  {
    method: 'POST',
    path: '/api/commands',
    access: 'person',
    body: { type: 'setting.set', key: 'you.payday', value: { kind: 'none' } },
  },
  { method: 'PUT', path: '/api/push/token', access: 'person', body: { token: 'sweep-fcm-token' } },
  { method: 'DELETE', path: '/api/push/token', access: 'person', body: { token: 'sweep-fcm-token' } },
  { method: 'POST', path: '/api/push/test', access: 'person', body: {} },
  { method: 'POST', path: '/api/realtime/token', access: 'person', body: {} },
  { method: 'POST', path: '/api/jobs/test', access: 'person', body: {} },
  { method: 'GET', path: '/api/admin/members', access: 'admin' },
];

/**
 * The generic resource routes (resource.ts), relative to where a table mounts them. Every one takes an
 * id the client made, so each is also called with another person's id.
 */
export const RESOURCE_ROUTES: { method: Method; path: string }[] = [
  { method: 'GET', path: '/' },
  { method: 'GET', path: '/:id' },
  { method: 'PUT', path: '/:id' },
  { method: 'PATCH', path: '/:id' },
  { method: 'DELETE', path: '/:id' },
];
