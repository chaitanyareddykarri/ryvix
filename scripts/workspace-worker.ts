import {ensurePreviewGateway} from '../services/src/workspace/preview-gateway';
import {createWorkerPool} from './worker-database';
import { RepositoryJobStore } from '../backend/src/services/repository-job-store';
import { serveRepositoryWorker } from '../services/src/workspace/repository-worker';
import { verifyWorkerDocker } from '../services/src/workspace/worker-preflight';
import { workerHostConfiguration } from '../services/src/workspace/worker-host';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const {hostId}=workerHostConfiguration();
  await verifyWorkerDocker();
  const pool=createWorkerPool('Workspace',5,undefined,true);
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  const hostLease=await pool.connect();
  // The allocator is process-local: one process may own a stable Docker host.
  hostLease.on('error',()=>{console.error('Worker host lock lost; stopping execution.');process.exit(1);});
  try {
    const lock=await hostLease.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS owned',[`ryvix-worker:${hostId}`]);
    if(!lock.rows[0]?.owned)throw new Error('Another worker already owns this Docker host');
    await ensurePreviewGateway();
    if(process.env.RYVIX_REQUIRE_PUBLIC_PREVIEW==='true'){
      try{const response=await fetch('https://00000000-0000-0000-0000-000000000000.'+process.env.PREVIEW_BASE_DOMAIN,{redirect:'manual',signal:AbortSignal.timeout(15000)});
        const body=await response.text();
        if(response.status!==404||body!=='Preview unavailable.')throw Error('Gateway mismatch');
      }catch{throw Error('Public preview HTTPS does not reach this gateway. Fix wildcard DNS, tunnel and TLS before starting jobs.');}
    }
    await serveRepositoryWorker(new RepositoryJobStore(pool,hostId),controller.signal);
  } finally { clearInterval(health);await hostLease.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`ryvix-worker:${hostId}`]).catch(()=>{});hostLease.release();await pool.end(); }
}
main().catch((err) => { console.error('Workspace worker could not start. Check database session access, Docker, matching preview settings and wildcard HTTPS.'); process.exitCode=1; });
