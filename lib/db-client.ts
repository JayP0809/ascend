import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _client: DbClient | null = null;
let _attempted = false;

/**
 * Returns a Drizzle db instance when DATABASE_URL is configured.
 * Returns null when DATABASE_URL is absent — callers must handle this case
 * (demo mode stays functional without a database connection).
 */
export function getDbClient(): DbClient | null {
  if (_attempted) return _client;
  _attempted = true;

  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }

  try {
    const sql = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: url.includes('neon.tech') ? 'require' : undefined,
    });
    _client = drizzle(sql, { schema });
    return _client;
  } catch (err) {
    console.error('[db-client] Failed to initialize database connection:', err);
    return null;
  }
}

export function isDbAvailable(): boolean {
  return getDbClient() !== null;
}
