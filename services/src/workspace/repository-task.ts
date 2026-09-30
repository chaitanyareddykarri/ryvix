import { RepositoryAnalyzer } from '../../../backend/src/connectors/github.connector';
import { codingAssistant } from '@ryvix/ai';
import { dockerWorkspaceManager as manager } from './docker-workspace.manager';
import { previewOrigin, ensurePreviewGateway } from './preview-gateway';
import { repositoryPreviewCommand } from './preview-command';

/** Worker orchestration; customer commands are executed exclusively by DockerWorkspaceManager. */
export async function executeRepositoryTask(input: {
  taskId: string; projectId: string; fullName: string; branch: string; githubToken: string; prompt: string;
  onPlan: (summary: string, steps: string[]) => Promise<void>;
  onSession?: (session: Awaited<ReturnType<typeof manager.createSession>>) => Promise<void>;
}) {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input.fullName)) throw new Error('Invalid GitHub repository');
  const api = async (suffix: string) => {
    const response = await fetch(`https://api.github.com/repos/${input.fullName}${suffix}`, {
      headers: { Authorization: `Bearer ${input.githubToken}`, Accept: 'application/vnd.github+json' },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GitHub repository request failed (HTTP ${response.status})`);
    return response.json();
  };
  const metadata = await api('');
  if (metadata.full_name?.toLowerCase() !== input.fullName.toLowerCase() || metadata.archived) throw new Error('Repository unavailable or archived');
  const ref = await api(`/git/ref/heads/${encodeURIComponent(input.branch)}`);
  const baseSha = ref.object?.sha;
  if (!/^[a-f0-9]{40,64}$/.test(baseSha)) throw new Error('Repository revision unavailable');
  const tree = await api(`/git/trees/${baseSha}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Repository tree too large for safe analysis');
  const entries = tree.tree.filter((f: any) => f.type === 'blob' && ['100644', '100755'].includes(f.mode));
  const packageEntry = entries.find((file: any) => file.path === 'package.json');
  let packageText: string | undefined;
  if (packageEntry) {
    const blob = await api(`/git/blobs/${packageEntry.sha}`);
    if (blob.size > 100000 || blob.encoding !== 'base64') throw new Error('Package manifest unavailable');
    packageText = Buffer.from(blob.content, 'base64').toString('utf8');
  }
  const profile = RepositoryAnalyzer.detectStack(entries.map((f: any) => f.path), packageText);
  const imageKey = profile.stack === 'nextjs' || profile.stack === 'nodejs' ? 'NODE' :
    profile.stack.startsWith('python') ? 'PYTHON' : profile.stack.toUpperCase();
  const image = process.env[`RYVIX_WORKSPACE_${imageKey}_IMAGE`];
  if (!image) throw new Error(`Approved workspace image is not configured for ${profile.stack}`);
  const session = await manager.createSession({ taskId: input.taskId, projectId: input.projectId, baseImage: image });
  try {
    await input.onSession?.(session);
    await manager.cloneRepository(session.id, input.fullName, input.branch, input.githubToken, baseSha);
    const terms = input.prompt.toLowerCase().split(/\W+/).filter(term => term.length > 3);
    const candidates = entries.filter((f: any) => /\.(tsx?|jsx?|py|go|rs|css|html|md)$/.test(f.path) &&
      !/(^|\/)(node_modules|vendor|dist|build|\.git|secrets?|credentials?)(\/|\.)/i.test(f.path) && f.size <= 20000)
      .sort((a: any, b: any) => terms.filter(t => b.path.toLowerCase().includes(t)).length - terms.filter(t => a.path.toLowerCase().includes(t)).length)
      .slice(0, 10);
    if (!candidates.length) throw new Error('No supported source files found; specify a supported repository');
    const files: Array<{ path: string; content: string }> = [];
    for (const file of candidates) files.push({ path: file.path, content: (await manager.readFile(session.id, file.path)) || '' });
    const plan = await codingAssistant.generateRepositoryChanges(input.prompt, profile.stack, files);
    await input.onPlan(plan.summary, plan.steps);
    for (const change of plan.changes) {
      if (change.action === 'create' && entries.some((file: any) => file.path === change.path)) throw new Error('AI attempted to overwrite an unreviewed file');
      if (change.action === 'delete') await manager.deleteFile(session.id, change.path);
      else await manager.applyDiff(session.id, change.path, change.content);
    }
    const verification: Array<{ command: string; success: boolean; exitCode: number; durationMs: number }> = [];
    const check = async (command: string) => {
      const result = await manager.executeCommand(session.id, command, 240000);
      verification.push({ command, success: result.success, exitCode: result.exitCode, durationMs: result.durationMs });
      if (!result.success) throw new Error(`Sandbox check failed (exit ${result.exitCode}): ${command}`);
    };
    if (profile.packageManager !== 'none') {
      const install = profile.packageManager === 'npm' && entries.some((f: any) => f.path === 'package-lock.json')
        ? 'npm ci --ignore-scripts' : profile.installCommand;
      await manager.withRestrictedEgress(session.id, () => check(install));
    }
    const pkg = packageText ? JSON.parse(packageText) : null;
    if (!pkg || pkg.scripts?.test) await check(profile.testCommand);
    if (pkg?.scripts?.typecheck) await check('npm run typecheck');
    if (!pkg || pkg.scripts?.build) await check(profile.buildCommand);
    const changes = await manager.captureDiff(session.id);
    if (!changes.length) throw new Error('Task produced no repository changes');
    let previewError: string | null = null;
    if (pkg?.scripts?.dev || pkg?.scripts?.start) {
      try {
        await ensurePreviewGateway();
        // PORT=3000 is supplied to the detected application's own start script.
        const command = repositoryPreviewCommand(profile.stack,profile.packageManager,pkg)!;
        await manager.startPreview(session.id, command, previewOrigin(session.id));
      } catch { previewError = 'Preview unavailable. Check the gateway configuration and application startup logs.'; }
    }
    return { session: manager.getSession(session.id)!, profile, files: changes, verification, baseSha, summary: plan.summary, previewError };
  } catch (error) {
    await manager.terminateSession(session.id);
    throw error;
  }
}
