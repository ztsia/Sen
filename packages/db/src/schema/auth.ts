import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authOnly } from './rls';

/**
 * Better Auth's own tables (D54), prefixed `auth_` so they're never confused with bank accounts
 * (§15). Its core schema for v1, with UUID ids. Only `sen_auth` reaches them; `app_user` has no grant.
 */
const at = (name: string) => timestamp(name, { withTimezone: true });
const stamps = {
  createdAt: at('created_at').notNull().defaultNow(),
  updatedAt: at('updated_at').notNull().defaultNow(),
};

export const authUser = pgTable(
  'auth_user',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    ...stamps,
  },
  () => authOnly('auth_user'),
).enableRLS();

export const authSession = pgTable(
  'auth_session',
  {
    id: uuid('id').primaryKey(),
    expiresAt: at('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    ...stamps,
  },
  (t) => [index('auth_session_user_id_idx').on(t.userId), ...authOnly('auth_session')],
).enableRLS();

export const authAccount = pgTable(
  'auth_account',
  {
    id: uuid('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: at('access_token_expires_at'),
    refreshTokenExpiresAt: at('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    ...stamps,
  },
  (t) => [index('auth_account_user_id_idx').on(t.userId), ...authOnly('auth_account')],
).enableRLS();

export const authVerification = pgTable(
  'auth_verification',
  {
    id: uuid('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: at('expires_at').notNull(),
    ...stamps,
  },
  (t) => [index('auth_verification_identifier_idx').on(t.identifier), ...authOnly('auth_verification')],
).enableRLS();
