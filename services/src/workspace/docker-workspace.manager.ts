import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type { WorkspaceSession } from '@ryvix/database';
import { measuredFileDiff, type ChangedFile } from './task-artifacts';

export interface CommandExecutionResult {
  command: string; exitCode: number; stdout: string; stderr: string; durationMs: number; success: boolean;
}
export interface AppliedDiffResult { filePath: string; applied: boolean; bytesWritten: number; timestamp: string }
export interface CreateSessionOptions {
  taskId: string; projectId: string; profileId?: string | null; baseImage?: string;
  cpu?: number; ramMb?: number; ttlMinutes?: number; timeoutMinutes?: number;
}
export interface DockerResult { exitCode: number; stdout: string; stderr: string; timedOut?: boolean }
export type DockerRunner = (args: string[], timeoutMs: number, input?: string) => Promise<DockerResult>;

/** Only Docker executes on the worker; customer commands run inside the container. */
export const runDocker: DockerRunner = (args, timeoutMs, input) => new Promise((resolve, reject) => {
  const child = spawn('docker', args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '', size = 0, timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
  const collect = (chunk: Buffer, error: boolean) => {
    size += chunk.length;
    if (size > 1024 * 1024) { timedOut = true; child.kill(); return; }
    if (error) stderr += chunk.toString(); else stdout += chunk.toString();
  };
  child.stdout.on('data', chunk => collect(chunk, false));
  child.stderr.on('data', chunk => collect(chunk, true));
  child.on('error', () => { clearTimeout(timer); reject(new Error('Docker CLI unavailable on this worker')); });
  child.on('close', code => { clearTimeout(timer); resolve({ exitCode: code ?? 124, stdout, stderr, timedOut }); });
  child.stdin.on('error', () => {});
  child.stdin.end(input);
});

const DEFAULT_IMAGES = ['node:22-alpine', 'node:20-alpine', 'python:3.11-slim', 'golang:1.22-alpine', 'rust:1-slim'];
export class DockerWorkspaceManager {
  private activeSessions = new Map<string, WorkspaceSession>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private allocatedPorts = new Set<number>();
  private busy = new Set<string>();
  private prepared = new Set<string>();
  constructor(private readonly run: DockerRunner = runDocker,
    private readonly allowedImages = (process.env.RYVIX_WORKSPACE_IMAGES || '').split(',').filter(Boolean).concat(DEFAULT_IMAGES)) {}

  private async checked(args: string[], timeout = 30000, input?: string) {
    const result = await this.run(args, timeout, input);
    if (result.exitCode !== 0 || result.timedOut) throw new Error(`Docker ${args[0]} failed (exit ${result.exitCode})`);
    return result;
  }
  private session(id: string) {
    const session = this.activeSessions.get(id);
    if (!session || !['active', 'executing'].includes(session.status)) throw new Error('Workspace is not active');
    if (Date.parse(session.expires_at) <= Date.now()) throw new Error('Workspace has expired');
    return session;
  }
  private filePath(value: string) {
    if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0') ||
        value.split('/').some(part => !part || part === '..' || part === '.' || part.toLowerCase() === '.git') || /^[A-Za-z]:/.test(value)) {
      throw new Error('Invalid workspace-relative path');
    }
    return `/workspace/${value}`;
  }

  async createSession(taskIdOrOptions: string | CreateSessionOptions, projectId?: string,
    stackImage = 'node:22-alpine', timeoutMinutes = 15): Promise<WorkspaceSession> {
    const options = typeof taskIdOrOptions === 'string'
      ? { taskId: taskIdOrOptions, projectId: projectId || '', baseImage: stackImage, ttlMinutes: timeoutMinutes }
      : taskIdOrOptions;
    const image = options.baseImage || stackImage;
    const cpu = options.cpu ?? 1, ram = options.ramMb ?? 2048, ttl = options.ttlMinutes ?? options.timeoutMinutes ?? 15;
    if (!options.taskId || !options.projectId) throw new Error('Task and project are required');
    if (!this.allowedImages.includes(image)) throw new Error('Workspace image is not approved');
    if (!Number.isFinite(cpu) || cpu <= 0 || cpu > 2 || !Number.isInteger(ram) || ram < 128 || ram > 4096 ||
        !Number.isFinite(ttl) || ttl <= 0 || ttl > 15) throw new Error('Workspace resource limits exceeded');
    const id = crypto.randomUUID(), container = `ryvix_sbx_${id.replace(/-/g, '')}`, network = `${container}_net`;
    let port = 3100;
    while (this.allocatedPorts.has(port) && port <= 3999) port++;
    if (port > 3999) throw new Error('Workspace preview ports exhausted');
    this.allocatedPorts.add(port);
    let networkCreated = false;
    try {
      await this.checked(['network', 'create', '--internal', '--label', 'ryvix.workspace=true', network]);
      networkCreated = true;
      await this.checked(['run', '--detach', '--rm', '--name', container,
        '--label', 'ryvix.workspace=true', '--user', '1000:1000', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--read-only', '--pids-limit', '128',
        '--cpus', String(cpu), '--memory', `${ram}m`, '--memory-swap', `${ram}m`,
        '--network', network, '--publish', `127.0.0.1:${port}:3000`,
        '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m',
        '--tmpfs', '/workspace:rw,nosuid,nodev,uid=1000,gid=1000,mode=0700,size=1024m',
        '--workdir', '/workspace', '--env', 'HOME=/tmp', '--entrypoint', '/bin/sh',
        image, '-c', `sleep ${Math.ceil(ttl * 60)}`], 120000);
      const now = Date.now();
      const session: WorkspaceSession = {
        id, task_id: options.taskId, project_id: options.projectId, profile_id: options.profileId || null,
        container_id: container, status: 'active', preview_url: null, preview_port: port,
        allocated_cpu: cpu, allocated_ram_mb: ram, workspace_path: '/workspace',
        created_at: new Date(now).toISOString(), expires_at: new Date(now + ttl * 60000).toISOString(),
      };
      this.activeSessions.set(id, session);
      const timer = setTimeout(() => { void this.terminateSession(id).catch(() => console.error('Workspace expiry cleanup failed')); }, ttl * 60000);
      timer.unref(); this.timers.set(id, timer);
      return { ...session };
    } catch (error) {
      await this.run(['rm', '--force', container], 10000).catch(() => {});
      if (networkCreated) await this.run(['network', 'rm', network], 10000).catch(() => {});
      this.allocatedPorts.delete(port);
      throw error;
    }
  }

  async mountFiles(id: string, files: { path: string; content: string }[]): Promise<number> {
    for (const file of files) await this.applyDiff(id, file.path, file.content);
    return files.length;
  }
  async withRestrictedEgress<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const session = this.session(id);
    const network = process.env.RYVIX_WORKSPACE_EGRESS_NETWORK;
    if (!network || !/^[a-zA-Z0-9_-]+$/.test(network)) throw new Error('A restricted workspace egress network is required');
    const inspection = await this.checked(['network', 'inspect', '--format', '{{index .Labels "ryvix.egress"}}', network]);
    if (inspection.stdout.trim() !== 'restricted') throw new Error('Workspace egress network is not approved');
    await this.checked(['network', 'connect', network, session.container_id]);
    try { return await operation(); }
    finally {
      try { await this.checked(['network', 'disconnect', network, session.container_id]); }
      catch { await this.terminateSession(id); throw new Error('Workspace egress isolation failed; sandbox terminated'); }
    }
  }
  async cloneRepository(id: string, fullName: string, branch: string, token: string, baseSha: string) {
    const session = this.session(id);
    if (this.prepared.has(id)) throw new Error('Repository already prepared');
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(fullName) || !branch || /[\r\n\0]/.test(branch) ||
        !/^[a-f0-9]{40,64}$/.test(baseSha) || !token || /[\r\n]/.test(token)) throw new Error('Invalid repository checkout');
    await this.withRestrictedEgress(id, async () => {
      // Stdin is consumed by Git before any repository code runs. No credentials are persisted.
      await this.checked(['exec', '-i', session.container_id, '/bin/sh', '-c',
        'read -r header; export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="$header" GIT_TERMINAL_PROMPT=0; git -c core.hooksPath=/dev/null -c protocol.file.allow=never clone --depth=1 --single-branch --no-tags --branch "$1" -- "$2" /workspace',
        'clone-repository', branch, `https://github.com/${fullName}.git`], 120000,
        `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}\n`);
    });
    const head = await this.checked(['exec', session.container_id, 'git', 'rev-parse', 'HEAD']);
    if (head.stdout.trim() !== baseSha) throw new Error('Repository changed during checkout; retry');
    this.prepared.add(id);
  }
  async deleteFile(id: string, filename: string) {
    const session = this.session(id), target = this.filePath(filename);
    await this.checked(['exec', session.container_id, 'rm', '--', target]);
  }
  async applyDiff(id: string, file: string | { filePath: string; patchContent?: string; newContent?: string; isNewFile?: boolean }, newContent?: string): Promise<AppliedDiffResult> {
    const session = this.session(id);
    const relative = typeof file === 'string' ? file : file.filePath;
    const content = typeof file === 'string' ? newContent : file.newContent ?? file.patchContent;
    if (typeof content !== 'string') throw new Error('Full file content is required');
    if (content.startsWith('diff --git ') || content.startsWith('--- ')) throw new Error('Unified patches must be resolved to full file contents before writing');
    const target = this.filePath(relative);
    await this.checked(['exec', '-i', session.container_id, '/bin/sh', '-c',
      'parent=$(dirname -- "$1"); mkdir -p -- "$parent" || exit 1; resolved=$(realpath "$parent") || exit 1; case "$resolved" in /workspace|/workspace/*) ;; *) exit 1;; esac; [ ! -L "$1" ] || exit 1; cat > "$1"', 'write-file', target], 10000, content);
    return { filePath: relative, applied: true, bytesWritten: Buffer.byteLength(content), timestamp: new Date().toISOString() };
  }
  async readFile(id: string, file: string): Promise<string | null> {
    const session = this.session(id), target = this.filePath(file);
    const result = await this.run(['exec', session.container_id, 'cat', '--', target], 10000);
    if (result.exitCode !== 0) throw new Error('Unable to read workspace file');
    return result.stdout;
  }
  /** Capture the actual Git working tree. Never infer files or counts from a prompt. */
  async captureDiff(id: string): Promise<ChangedFile[]> {
    const session = this.session(id);
    const git = async (args: string[]) => this.checked(['exec', session.container_id, 'git',
      '-c', 'core.hooksPath=/dev/null', '-c', 'diff.external=', ...args]);
    await git(['add', '--intent-to-add', '--all']);
    const names = await git(['diff', '--name-only', '-z', 'HEAD', '--']);
    const paths = names.stdout.split('\0').filter(Boolean);
    if (paths.length > 100) throw new Error('Patch exceeds 100 changed files');
    const files: ChangedFile[] = [];
    for (const filename of paths) {
      this.filePath(filename);
      const stat = await this.checked(['exec', session.container_id, '/bin/sh', '-c',
        'if [ -L "$1" ]; then exit 1; elif [ -f "$1" ]; then printf file; elif [ ! -e "$1" ]; then printf deleted; else exit 1; fi',
        'inspect-file', `/workspace/${filename}`]);
      const prior = await git(['ls-tree', 'HEAD', '--', filename]);
      if (prior.stdout && !/^100(644|755) blob /.test(prior.stdout)) throw new Error('Only regular text files may be changed');
      const action = stat.stdout === 'deleted' ? 'delete' : prior.stdout ? 'modify' : 'create';
      const patch = await git(['diff', '--no-ext-diff', '--no-textconv', '--no-renames', 'HEAD', '--', filename]);
      const content = action === 'delete' ? undefined : (await this.readFile(id, filename)) ?? undefined;
      files.push(measuredFileDiff(filename, patch.stdout, content, action));
    }
    return files;
  }
  async startPreview(id: string, command: string, origin: string): Promise<void> {
    const session = this.session(id);
    if (!command || command.length > 1024 || !origin.startsWith('https://')) throw new Error('Invalid preview configuration');
    await this.checked(['exec', '-d', '--env', 'PORT=3000', '--env', 'HOST=0.0.0.0', session.container_id,
      '/bin/sh', '-lc', `${command} > /tmp/ryvix-preview.log 2>&1`]);
    const deadline = Math.min(Date.now() + 30000, Date.parse(session.expires_at));
    while (Date.now() < deadline) {
      try {
        const result = await fetch(`http://127.0.0.1:${session.preview_port}/`, { redirect: 'manual', signal: AbortSignal.timeout(1000) });
        await result.body?.cancel();
        if (result.status < 500) { session.preview_url = origin; return; }
      } catch { /* Process may still be starting. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Preview application did not become ready before timeout');
  }
  async executeCommand(id: string, command: string, timeoutMs = 30000): Promise<CommandExecutionResult> {
    const session = this.session(id);
    if (!command || command.length > 8192 || command.includes('\0')) throw new Error('Invalid command');
    if (this.busy.has(id)) throw new Error('Workspace already executing a command');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid command timeout');
    const timeout = Math.min(timeoutMs, 900000, Date.parse(session.expires_at) - Date.now());
    const start = Date.now(); this.busy.add(id); session.status = 'executing';
    try {
      const result = await this.run(['exec', session.container_id, '/bin/sh', '-lc', command], timeout);
      if (result.timedOut) await this.terminateSession(id);
      return { command, exitCode: result.timedOut ? 124 : result.exitCode,
        stdout: result.stdout, stderr: result.timedOut ? 'Command exceeded time/output limit; workspace terminated' : result.stderr,
        durationMs: Date.now() - start, success: result.exitCode === 0 && !result.timedOut };
    } catch (error) {
      await this.terminateSession(id);
      throw error;
    } finally { this.busy.delete(id); if (session.status === 'executing') session.status = 'active'; }
  }
  async terminateSession(id: string): Promise<WorkspaceSession> {
    const session = this.activeSessions.get(id);
    if (!session) throw new Error('Workspace not found');
    if (session.status === 'destroyed') return { ...session };
    session.status = 'terminating';
    clearTimeout(this.timers.get(id)); this.timers.delete(id);
    const removed = await this.run(['rm', '--force', session.container_id], 10000);
    if (removed.exitCode !== 0 && !removed.stderr.includes('No such container')) throw new Error('Workspace container cleanup failed');
    const network = await this.run(['network', 'rm', `${session.container_id}_net`], 10000);
    if (network.exitCode !== 0 && !network.stderr.includes('not found')) throw new Error('Workspace network cleanup failed');
    session.status = 'destroyed'; if (session.preview_port) this.allocatedPorts.delete(session.preview_port);
    return { ...session };
  }
  listSessions(): WorkspaceSession[] { return [...this.activeSessions.values()].map(session => ({ ...session })); }
  getSession(id: string): WorkspaceSession | null { const session = this.activeSessions.get(id); return session ? { ...session } : null; }
}
export const dockerWorkspaceManager = new DockerWorkspaceManager();
