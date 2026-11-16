/**
 * Database connection factory.
 *
 * Uses @neondatabase/serverless with the HTTP transport so this works
 * in Vercel's serverless functions without persistent TCP connections.
 * Each request opens a lightweight HTTPS connection to Neon — no
 * connection pool state survives between invocations, which is exactly
 * what serverless requires.
 *
 * Returns null when DATABASE_URL is not set. All callers must handle
 * null gracefully — demo mode runs entirely without a database.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type DbClient = ReturnType<typeof drizzleNeon<typeof schema>>;

let _client: DbClient | null = null;

export function getDbClient(): DbClient | null {
  if (_client !== null) return _client;

  // TEST_DATABASE_URL is only honored outside production to prevent an
  // accidentally-set env var from routing a live deployment to a test database.
  const url =
    (process.env.NODE_ENV !== 'production' && process.env.TEST_DATABASE_URL)
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL;
  if (!url) return null;

  try {
    const sql = neon(url);
    _client = drizzleNeon(sql, { schema });
    return _client;
  } catch (err) {
    console.error('[db-client] Failed to initialize Neon connection:', err);
    return null;
  }
}

export function isDbAvailable(): boolean {
  return getDbClient() !== null;
}
