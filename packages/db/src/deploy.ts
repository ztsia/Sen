import pg from 'pg';
import { runMigrations } from './migrate';
import { rolePassword, scramVerifier, type LoginRole } from './roles';
import { seedOwner, seedPreview, type PreviewPerson } from './seed';

export interface DeployEnv {
  /** VERCEL_ENV: production deploys migrate and seed the owner; previews migrate and seed made-up people. */
  target: 'production' | 'preview';
  /** The owner role's direct URL (DATABASE_URL_UNPOOLED): migrations only. */
  ownerUrl: string;
  /** BETTER_AUTH_SECRET, which the roles' passwords derive from (roles.ts). */
  secret: string;
  /** SEN_OWNER_EMAIL, production only. */
  ownerEmail?: string;
  preview?: () => PreviewPerson[];
}

/**
 * The database's part of a deploy (D122, B05), run by the Vercel build before the web app is built:
 * a failed migration fails the deploy, so new code never runs on an old schema. The owner role's URL
 * stays in Vercel; nothing here runs from a laptop or from the public repo's Actions (spec §17).
 */
export async function deploy(env: DeployEnv, log: (s: string) => void = console.log): Promise<void> {
  await runMigrations(env.ownerUrl);
  log('db: migrations applied');
  const client = new pg.Client({ connectionString: env.ownerUrl });
  await client.connect();
  try {
    for (const role of ['app_user', 'sen_auth'] satisfies LoginRole[]) {
      const pw = client.escapeLiteral(scramVerifier(rolePassword(env.secret, role)));
      await client.query(`alter role ${client.escapeIdentifier(role)} with login password ${pw}`);
    }
    log('db: app_user and sen_auth can log in');
    if (env.target === 'production') {
      if (env.ownerEmail) log(`db: the owner's account ${await seedOwner(client, env.ownerEmail)}`);
      else log('db: SEN_OWNER_EMAIL is not set, so no owner account is made (docs/local.md)');
    } else if (env.preview) {
      const people = env.preview();
      await seedPreview(client, people);
      log(`db: preview seeded with ${people.length} made-up ${people.length === 1 ? 'person' : 'people'}`);
    }
  } finally {
    await client.end();
  }
}
