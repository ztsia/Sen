import { describe, expect, it } from 'vitest';
import { rolePassword, roleUrl } from './roles';

const secret = 'x'.repeat(48);

describe('database roles', () => {
  it('derives a stable, distinct password per role', () => {
    expect(rolePassword(secret, 'app_user')).toBe(rolePassword(secret, 'app_user'));
    expect(rolePassword(secret, 'app_user')).not.toBe(rolePassword(secret, 'sen_auth'));
    expect(rolePassword(secret, 'app_user')).toMatch(/^[\w-]{43}$/);
    expect(() => rolePassword('short', 'app_user')).toThrow();
  });
  it('keeps only the host, database and parameters of the owner URL', () => {
    const u = roleUrl(
      'postgresql://neondb_owner:s3cret@ep-x-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'app_user',
      'p/w',
    );
    expect(u).toBe('postgresql://app_user:p%2Fw@ep-x-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
    expect(u).not.toContain('s3cret');
  });
});
