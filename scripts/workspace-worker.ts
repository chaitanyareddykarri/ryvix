import { Pool } from 'pg';
import { RepositoryJobStore } from '../backend/src/services/repository-job-store';
import { serveRepositoryWorker } from '../services/src/workspace/repository-worker';
import { verifyWorkerDocker } from '../services/src/workspace/worker-preflight';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  await verifyWorkerDocker();
  const url = new URL(process.env.DATABASE_URL);
  for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name);
  const pool = new Pool({ connectionString: url.toString(), max: 5, connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) } });
  pool.on('error', () => console.error('Workspace worker database connection unavailable.'));
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  try { await serveRepositoryWorker(new RepositoryJobStore(pool),controller.signal); }
  finally { await pool.end(); }
}
main().catch(() => { console.error('Workspace worker could not start. Check runtime configuration.'); process.exitCode=1; });
