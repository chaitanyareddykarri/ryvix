import { randomUUID } from 'node:crypto';
import { RepositoryJobStore } from '../../../backend/src/services/repository-job-store';
import { dockerWorkspaceManager } from './docker-workspace.manager';
import { executeRepositoryTask } from './repository-task';
import { ensurePreviewGateway } from './preview-gateway';

export async function runRepositoryJob(store: RepositoryJobStore, workerId: string): Promise<boolean> {
  const job = await store.claim(workerId);
  if (!job) return false;
  let sessionId: string | undefined;
  let lostLease = false;
  let heartbeatBusy = false;
  const heartbeat = setInterval(async () => {
    if (heartbeatBusy) return;
    heartbeatBusy = true;
    try { if (!await store.heartbeat(job.task_id,workerId)) lostLease = true; }
    catch { lostLease = true; }
    finally { heartbeatBusy = false; }
    if (lostLease && sessionId) await dockerWorkspaceManager.terminateSession(sessionId).catch(() => {});
  }, 10000);
  try {
    const githubToken = await store.credentials(job,workerId);
    const result = await executeRepositoryTask({ taskId: job.task_id,projectId: job.project_id,
      fullName: job.full_name,branch: job.default_branch,prompt: job.user_prompt,githubToken,
      onSession: async session => {
        sessionId = session.id;
        if (lostLease) throw new Error('Worker lease lost');
        await store.session(job,workerId,session);
      },
      onPlan: async (summary,steps) => { if (lostLease) throw new Error('Worker lease lost'); await store.plan(job,workerId,summary,steps); },
    });
    if (lostLease) throw new Error('Worker lease lost');
    await store.complete(job,workerId,result);
  } catch {
    if (sessionId) await dockerWorkspaceManager.terminateSession(sessionId).catch(() => {});
    await store.fail(job,workerId);
  } finally { clearInterval(heartbeat); }
  return true;
}

export async function serveRepositoryWorker(store: RepositoryJobStore, signal: AbortSignal) {
  const workerId = randomUUID();
  while (!signal.aborted) {
    try {
      await store.expireLeases();
      for (const session of await store.cleanupSessions()) {
        try { await dockerWorkspaceManager.cleanupPersistedSession(session); await store.markDestroyed(session.id); }
        catch { console.error('Workspace cleanup will retry when its Docker host is available.'); }
      }
      for (const session of await store.previewSessions()) {
        if (!dockerWorkspaceManager.getSession(session.id)) {
          try { await dockerWorkspaceManager.restoreSession(session); await ensurePreviewGateway(); }
          catch { console.error('Persisted preview could not be restored on this worker.'); }
        }
      }
      if (await runRepositoryJob(store,workerId)) continue;
    } catch { console.error('Workspace worker cycle failed; retrying.'); }
    await new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); signal.removeEventListener('abort',done); resolve(); };
      const timer = setTimeout(done,2000);
      signal.addEventListener('abort',done,{ once: true });
    });
  }
}
