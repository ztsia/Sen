import { describe, expect, it } from 'vitest';
import { readEnv } from './env';

const secret = 's'.repeat(48);
const neon = 'postgresql://neondb_owner:pw@ep-x-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

describe('the API’s environment', () => {
  it('connects each role with its own derived password on Vercel, never the owner’s', () => {
    const env = readEnv({ VERCEL_ENV: 'preview', BETTER_AUTH_SECRET: secret, DATABASE_URL: neon });
    expect(env.target).toBe('preview');
    expect(new URL(env.urls.app_user).username).toBe('app_user');
    expect(new URL(env.urls.sen_auth).username).toBe('sen_auth');
    expect(Object.values(env.urls).join()).not.toContain('neondb_owner');
    expect(Object.values(env.urls).join()).not.toContain(':pw@');
  });
  it('refuses to start in production without Sen’s Gmail', () => {
    expect(() => readEnv({ VERCEL_ENV: 'production', BETTER_AUTH_SECRET: secret, DATABASE_URL: neon })).toThrow(
      /GMAIL/,
    );
    const env = readEnv({
      VERCEL_ENV: 'production',
      BETTER_AUTH_SECRET: secret,
      DATABASE_URL: neon,
      GMAIL_USER: 'sen@example.com',
      GMAIL_APP_PASSWORD: 'x',
    });
    expect(env.target).toBe('production');
  });
  it('keeps a local server off any database but the local one', () => {
    expect(readEnv({}).target).toBe('local');
    expect(() => readEnv({ APP_DATABASE_URL: neon })).toThrow(/local Postgres/);
    expect(() => readEnv({ SEN_LOCAL_DATABASE: neon })).toThrow(/local Postgres/);
  });
});
