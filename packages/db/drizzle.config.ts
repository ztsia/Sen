import { defineConfig } from 'drizzle-kit';

// `drizzle-kit generate` writes SQL from the schema; it never connects. Migrations run through
// src/migrate.ts (the deploy step, tests and scripts/local-db.sh), as the owner role.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
});
