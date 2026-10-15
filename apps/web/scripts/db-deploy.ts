// The database's part of a Vercel build (B05, D122): migrations, the roles' passwords, and the seed,
// before the web app is built, so a failed migration fails the deploy. Skipped off Vercel: locally
// and in CI the database is scripts/local-db.sh's. Runs with tsx, for the web app's `@/` paths.
import { deploy } from '@sen/db';
import type { PreviewPerson } from '@sen/db';
import { weiMing } from '../src/data/fake/scenario';

const target = process.env.VERCEL_ENV;
if (!process.env.VERCEL || (target !== 'production' && target !== 'preview')) {
  console.log('db-deploy: not a Vercel production or preview build, skipped');
  process.exit(0);
}
const ownerUrl = process.env.DATABASE_URL_UNPOOLED;
const secret = process.env.BETTER_AUTH_SECRET;
if (!ownerUrl || !secret)
  throw new Error('db-deploy: DATABASE_URL_UNPOOLED and BETTER_AUTH_SECRET must be set in Vercel');

/** Wei Ming (B03's scenario), as B05's tables hold a person. */
function previewPeople(): PreviewPerson[] {
  const db = weiMing();
  const s = db.settings;
  const payday = s.you.payday;
  return [
    {
      id: db.userId,
      name: 'Wei Ming',
      email: s.email,
      admin: s.admin,
      features: {
        shell: true,
        capture: db.capture,
        agent: db.agent,
        splits: true,
        email: true,
        calendar: true,
        claims: db.claims,
      },
      ownNames: s.you.bankNames,
      expectedPayday:
        payday.kind === 'day' ? String(payday.day) : payday.kind === 'last-working' ? 'last-working' : null,
    },
  ];
}

await deploy({
  target,
  ownerUrl,
  secret,
  ownerEmail: target === 'production' ? process.env.SEN_OWNER_EMAIL : undefined,
  preview: target === 'preview' ? previewPeople : undefined,
});
