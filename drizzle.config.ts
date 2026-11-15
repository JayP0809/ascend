import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:    './lib/schema.ts',
  out:       './drizzle/migrations',
  dialect:   'postgresql',
  // drizzle-kit uses the postgres package (TCP).
  // For migrations use `npm run db:migrate` which calls scripts/migrate.mjs instead,
  // avoiding TCP connection-reset issues with Neon's HTTP-only environments.
  dbCredentials: {
    url: (process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL)!,
  },
  verbose: true,
  strict:  true,
});
