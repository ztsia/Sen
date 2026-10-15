import { describe, expect, it } from 'vitest';
import { rolePassword, roleUrl, scramVerifier } from './roles';

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
  it('writes a SCRAM verifier Postgres accepts (RFC 7677 test vector)', () => {
    // RFC 7677 §3: user "user", password "pencil", salt W22ZaJ0SNY7soEsUEjb6gQ==, 4096 iterations
    const v = scramVerifier('pencil', Buffer.from('W22ZaJ0SNY7soEsUEjb6gQ==', 'base64'));
    expect(v).toBe(
      'SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$WG5d8oPm3OtcPnkdi4Uo7BkeZkBFzpcXkuLmtbsT4qY=:wfPLwcE6nTWhTAmQ7tl2KeoiWGPlZqQxSrmfPwDl2dU=',
    );
  });
});
