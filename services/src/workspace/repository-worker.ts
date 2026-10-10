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
    const githubToken = await store.credentials(job,workerId);
    const lessons=await store.learningContext(job);
    const result = await executeRepositoryTask({ taskId: job.task_id,projectId: job.project_id,
      fullName: job.full_name,branch: job.default_branch,prompt: job.user_prompt,githubToken,lessons,
      signal:cancellation.signal,onAttempt:event=>store.modelAttempt(job,workerId,event),
      onProgress:event=>store.progress(job,workerId,event),
      onSession: async session => {
        sessionId = session.id;
        if (lostLease) throw new Error('Worker lease lost');
        await store.session(job,workerId,session);
      },
      onPlan: async (summary,steps) => { if (lostLease) throw new Error('Worker lease lost'); await store.plan(job,workerId,summary,steps); },
    });
    if (lostLease) throw new Error('Worker lease lost');
    await store.complete(job,workerId,result);

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const chatId = await store.getCreatorTelegramChatId(job.created_by);
        if (chatId) {
          const filesCount = result.files?.length || 0;
          const previewText = result.session?.preview_url
            ? `\n🌐 *Preview:* ${result.session.preview_url}`
            : (result.session?.preview_port ? `\n🌐 *Local Preview:* http://localhost:${result.session.preview_port}` : '');
          await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            chatId,
            `🎉 *Task #${job.task_id.slice(0, 8)} Completed in Sandbox!*\n\n` +
            `📂 *Repo:* \`${job.full_name}\`\n` +
            `📝 *Plan:* ${result.summary || 'Code modifications applied'}\n` +
            `📁 *Files Changed:* ${filesCount}\n` +
            `🧪 *Verification:* Checks passed inside container sandbox${previewText}\n\n` +
            `📊 *Review & Merge:* https://ryvix.co.in/dashboard`,
            { parseMode: 'Markdown' }
          );
        }
      } catch (tgErr) {
        console.warn('[Telegram Worker Notice] Could not send completion alert:', tgErr);
      }
    }
  } catch (error) {
    let cleaned=true;
    if (sessionId) try {await dockerWorkspaceManager.terminateSession(sessionId);await store.markDestroyed(sessionId);}catch{cleaned=false;}
    const deferred=error instanceof ModelQuotaError&&!lostLease&&cleaned
      ? await store.deferQuota(job,workerId,error.retryAt).catch(()=>false):false;
    if(!deferred)await store.fail(job,workerId);

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const chatId = await store.getCreatorTelegramChatId(job.created_by);
        if (chatId) {
          await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            chatId,
            `⚠️ *Task #${job.task_id.slice(0, 8)} Stopped in Sandbox*\n\n` +
            `📂 *Repo:* \`${job.full_name}\`\n` +
            `❌ *Error:* ${error instanceof Error ? error.message : 'Execution failed'}\n\n` +
            `📊 Check logs: https://ryvix.co.in/dashboard`
          );
        }
      } catch (tgErr) {
        console.warn('[Telegram Worker Notice] Could not send failure alert:', tgErr);
      }
    }
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
