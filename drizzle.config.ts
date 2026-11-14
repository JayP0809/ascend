import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:    './lib/schema.ts',
  out:       './drizzle/migrations',
  dialect:   'postgresql',
  // For Neon, drizzle-kit uses the standard postgresql dialect.
  // The @neondatabase/serverless driver is used only at runtime (not by drizzle-kit).
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict:  true,
});
