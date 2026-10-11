import {publicTaskError} from './task-error';
import { randomUUID } from 'node:crypto';
import {ModelQuotaError} from '../../../ai/src/model-capacity';
import { RepositoryJobStore } from '../../../backend/src/services/repository-job-store';
import { dockerWorkspaceManager } from './docker-workspace.manager';
import { executeRepositoryTask } from './repository-task';
import { ensurePreviewGateway } from './preview-gateway';

import { sendTelegramMessage } from '../communication/telegram';

export async function runRepositoryJob(store: RepositoryJobStore, workerId: string): Promise<boolean> {
  if (!await dockerWorkspaceManager.hasCapacity()) return false;
  const job = await store.claim(workerId);
  if (!job) return false;
  let sessionId: string | undefined;
  let lostLease = false;
  let heartbeatBusy = false;
  const cancellation=new AbortController();
  const heartbeat = setInterval(async () => {
    if (heartbeatBusy) return;
    heartbeatBusy = true;
    try { if (!await store.heartbeat(job.task_id,workerId)) lostLease = true; }
    catch { lostLease = true; }
    finally { heartbeatBusy = false; }
    if(lostLease)cancellation.abort();
    if (lostLease && sessionId) await dockerWorkspaceManager.terminateSession(sessionId).catch(() => {});
  }, 10000);
  try {
    console.log(`\n======================================================`);
    console.log(`[Ryvix Worker] 📦 Claimed Task #${job.task_id.slice(0, 8)}`);
    console.log(`[Ryvix Worker] 📂 Repository: ${job.full_name} (${job.default_branch})`);
    console.log(`======================================================`);
    const githubToken = await store.credentials(job,workerId);
    const lessons=await store.learningContext(job);
    const result = await executeRepositoryTask({ taskId: job.task_id,projectId: job.project_id,
      fullName: job.full_name,branch: job.default_branch,prompt: job.user_prompt,githubToken,lessons,
      signal:cancellation.signal,onAttempt:event=>store.modelAttempt(job,workerId,event),
      onProgress:event=>{
        console.log(`[Ryvix Worker] ⚙️  Stage [${event.stage.toUpperCase()}]: ${event.status}${event.detail ? ` (${event.detail})` : ''}`);
        return store.progress(job,workerId,event);
      },
      onSession: async session => {
        sessionId = session.id;
        if (lostLease) throw new Error('Worker lease lost');
        console.log(`[Ryvix Worker] 🐳 Container sandbox active: ${session.container_id} (port ${session.preview_port || 'none'})`);
        await store.session(job,workerId,session);
      },
      onPlan: async (summary,steps) => {
        if (lostLease) throw new Error('Worker lease lost');
        console.log('[Ryvix Worker] Plan recorded; review it in the authenticated dashboard.');
        await store.plan(job,workerId,summary,steps);
      },
    });
    if (lostLease) throw new Error('Worker lease lost');
    await store.complete(job,workerId,result);
    console.log(`[Ryvix Worker] 🎉 Task #${job.task_id.slice(0, 8)} COMPLETED successfully!`);
    console.log(`[Ryvix Worker] 📁 Files changed: ${result.files?.length || 0}`);

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const chatId = await store.getCreatorTelegramChatId(job.created_by);
        if (chatId) {
          const filesCount = result.files?.length || 0;
          const previewText = '\nOpen the authenticated Ryvix dashboard to view an available preview.';
          await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            chatId,
            `🎉 *Task #${job.task_id.slice(0, 8)} Completed in Sandbox!*\n\n` +
            `📂 *Repo:* \`${job.full_name}\`\n` +
            `📝 *Plan:* ${'Code modifications recorded for review'}\n` +
            `📁 *Files Changed:* ${filesCount}\n` +
            `🧪 *Verification:* Checks passed inside container sandbox${previewText}\n\n` +
            `📊 *Review & Merge:* https://ryvix.co.in/dashboard`,
            { parseMode: 'Markdown' }
          );
        }
      } catch (tgErr) {
        console.warn('[Telegram Worker Notice] Could not send completion alert.');
      }
    }
  } catch (error) {
    const errorMsg = publicTaskError(error);
    console.error(`[Ryvix Worker] ❌ Task #${job.task_id.slice(0, 8)} failed:`, errorMsg);
    let cleaned=true;
    if (sessionId) try {await dockerWorkspaceManager.terminateSession(sessionId);await store.markDestroyed(sessionId);}catch{cleaned=false;}
    const deferred=error instanceof ModelQuotaError&&!lostLease&&cleaned
      ? await store.deferQuota(job,workerId,error.retryAt).catch(()=>false):false;
    if(!deferred)await store.fail(job,workerId,false,errorMsg);

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const chatId = await store.getCreatorTelegramChatId(job.created_by);
        if (chatId) {
          await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            chatId,
            `⚠️ *Task #${job.task_id.slice(0, 8)} Stopped in Sandbox*\n\n` +
            `📂 *Repo:* \`${job.full_name}\`\n` +
            `❌ *Error:* ${errorMsg}\n\n` +
            `📊 Check logs: https://ryvix.co.in/dashboard`
          );
        }
      } catch (tgErr) {
        console.warn('[Telegram Worker Notice] Could not send failure alert.');
      }
    }
  } finally { clearInterval(heartbeat); }
  return true;
}

export async function serveRepositoryWorker(store: RepositoryJobStore, signal: AbortSignal) {
  const workerId = randomUUID();
  console.log(`[Ryvix Worker] 🚀 Worker active (ID: ${workerId.slice(0, 8)}, Host: ${store.workerHost()})`);
  console.log(`[Ryvix Worker] 📡 Polling for pending repository tasks from Telegram & Web...`);
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
