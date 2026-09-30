import 'server-only';
import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Returns a managed singleton pg.Pool configured with connection limits and
 * automatic suppression of idle socket termination errors (ECONNRESET).
 */
export function getDirectDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("[PostgreSQL Pool] DATABASE_URL environment variable is not set. Configure it in .env.local.");
    }

    const verifiedUrl = new URL(connectionString);
    for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) verifiedUrl.searchParams.delete(option);
    pool = new Pool({
      connectionString: verifiedUrl.toString(),
      ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // CRITICAL: Suppress unhandled EventEmitter errors on idle clients.
    // When Supabase / PostgreSQL drops an idle TLS socket with ECONNRESET or "Connection terminated unexpectedly",
    // this listener catches it cleanly and prevents Node.js from raising an uncaughtException!
    pool.on('error', (err) => {
      // Reclaim dead client gracefully without crashing the server process
      console.warn('[PostgreSQL Pool Notice] Reclaimed idle connection');
    });
  }

  return pool;
}

/**
 * Executes a SQL query against the direct PostgreSQL database using the managed pool.
 * Returns persisted rows. Database failures never masquerade as empty results.
 */
export async function queryDirectDb<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  const p = getDirectDbPool();
  try {
    const res = await p.query(queryText, params);
    return (res.rows || []) as T[];
  } catch (err: any) {
    throw new Error('Database operation failed');
  }
}
