import { runMigrations } from './migrate';

// `tsx src/migrate-cli.ts <owner url>`: for the tests and local development.
const url = process.argv[2] ?? process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('migrate: give the owner role’s URL');
await runMigrations(url);
