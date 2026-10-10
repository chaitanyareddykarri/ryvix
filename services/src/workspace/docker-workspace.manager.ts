import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type { WorkspaceSession } from '@ryvix/database';
import { measuredFileDiff, type ChangedFile } from './task-artifacts';
import { workspaceCapacity } from './host-budget';
import {staticWorkspaceMode, STATIC_MEMORY_MB, STATIC_CPU, STATIC_CHECK, STATIC_PREVIEW, validateStaticChanges} from './static-policy';

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
  private relays = new Set<string>();
  private egress = new Set<string>();
  private allocating = false;
  async hasCapacity(cpu = staticWorkspaceMode() ? STATIC_CPU : 1, ramMb = staticWorkspaceMode() ? STATIC_MEMORY_MB : 2048) { return !this.allocating && await workspaceCapacity(this.run,cpu,ramMb); }
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
    if (staticWorkspaceMode() && (image !== process.env.RYVIX_WORKSPACE_STATIC_IMAGE || cpu !== STATIC_CPU || ram !== STATIC_MEMORY_MB))
      throw new Error('Static host only accepts its bounded static profile');
    if (!options.taskId || !options.projectId) throw new Error('Task and project are required');
    if (!this.allowedImages.includes(image)) throw new Error('Workspace image is not approved');
    if (!Number.isFinite(cpu) || cpu <= 0 || cpu > 2 || !Number.isInteger(ram) || ram < 128 || ram > 4096 ||
        !Number.isFinite(ttl) || ttl <= 0 || ttl > 15) throw new Error('Workspace resource limits exceeded');
    if (this.allocating) throw new Error('Workspace allocation already in progress');
    this.allocating = true;
    try {
      if (!await workspaceCapacity(this.run,cpu,ram)) throw new Error('Workspace host capacity exhausted; retry after preview expiry');
      return await this.allocate(options,image,cpu,ram,ttl);
    } finally { this.allocating = false; }
  }
  private async allocate(options: CreateSessionOptions,image: string,cpu: number,ram: number,ttl: number): Promise<WorkspaceSession> {
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
        '--label', 'ryvix.workspace=true', '--label', `ryvix.session=${id}`,
        '--label', `ryvix.task=${options.taskId}`, '--label', `ryvix.project=${options.projectId}`,
        '--user', '1000:1000', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--read-only', '--pids-limit', '128',
        '--cpus', String(cpu), '--memory', `${ram}m`, '--memory-swap', `${ram}m`,
        '--network', network,
        '--tmpfs', `/tmp:rw,nosuid,nodev,size=${staticWorkspaceMode() ? 16 : 256}m`,
        '--tmpfs', `/workspace:rw,nosuid,nodev,uid=1000,gid=1000,mode=0700,size=${staticWorkspaceMode() ? 16 : 1024}m`,
        '--workdir', '/workspace', '--env', 'HOME=/tmp',
        '--env', `HTTPS_PROXY=http://${container}_egress:3128`, '--env', `https_proxy=http://${container}_egress:3128`,
        '--env', 'NO_PROXY=localhost,127.0.0.1', '--env', 'no_proxy=localhost,127.0.0.1', '--entrypoint', '/bin/sh',
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
  /** Materialize a bounded API snapshot; never clone history or run repository hooks. */
  async prepareStaticSnapshot(id: string, files: {path:string;content:string}[]) {
    if (!staticWorkspaceMode() || this.prepared.has(id)) throw new Error('Static snapshot unavailable');
    if (files.length > 64 || files.reduce((sum,file)=>sum+Buffer.byteLength(file.content),0)>262144)
      throw new Error('Static snapshot exceeds bounds');
    validateStaticChanges(files.map(file=>({...file,action:'create'})));
    await this.mountFiles(id,files);
    const session = this.session(id);
    await this.checked(['exec',session.container_id,'/bin/sh','-c',
      'git -c core.hooksPath=/dev/null init && git -c core.hooksPath=/dev/null add --all && git -c core.hooksPath=/dev/null -c user.name=Ryvix -c user.email=snapshot@ryvix.invalid commit -m snapshot'],10000);
    this.prepared.add(id);
  }
  async withRestrictedEgress<T>(id: string, operation: () => Promise<T>): Promise<T> {
    if (staticWorkspaceMode()) throw new Error('Static workspaces cannot enable outbound networking');
    const session = this.session(id);
    const image = process.env.RYVIX_WORKSPACE_EGRESS_IMAGE;
    if (!image || !this.allowedImages.includes(image)) throw new Error('An approved workspace egress broker image is required');
    if (this.egress.has(id)) throw new Error('Workspace egress phase is already active');
    const name = `${session.container_id}_egress`;
    await this.checked(['run','--detach','--rm','--name',name,
      '--label','ryvix.workspace=true','--label',`ryvix.session=${id}`,'--label','ryvix.role=egress-broker',
      '--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only',
      '--pids-limit','32','--memory','128m','--memory-swap','128m','--cpus','0.5',
      '--network','bridge','--env',`RYVIX_EGRESS_TTL_MS=${Math.max(1,Date.parse(session.expires_at)-Date.now())}`,image],120000);
    this.egress.add(id);
    try {
      await this.checked(['network','connect',`${session.container_id}_net`,name]);
      await this.checked(['exec',name,'node','-e',
        "const n=require('net');let tries=0;function check(){const s=n.connect(3128,'127.0.0.1',()=>{s.destroy();process.exit(0)});s.on('error',()=>{s.destroy();if(++tries===30)process.exit(1);setTimeout(check,100)})}check()"],10000);
      return await operation();
    }
    finally {
      try { await this.checked(['rm','--force',name]); this.egress.delete(id); }
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
    if (staticWorkspaceMode()) validateStaticChanges([{path:filename,action:'delete'}]);
    const session = this.session(id), target = this.filePath(filename);
    await this.checked(['exec', session.container_id, '/bin/sh', '-c',
      'path="$1"; while [ "$path" != /workspace ]; do [ ! -L "$path" ] || exit 1; path=$(dirname -- "$path"); done; rm -- "$1"', 'delete-file', target]);
  }
  async applyDiff(id: string, file: string | { filePath: string; patchContent?: string; newContent?: string; isNewFile?: boolean }, newContent?: string): Promise<AppliedDiffResult> {
    const session = this.session(id);
    const relative = typeof file === 'string' ? file : file.filePath;
    const content = typeof file === 'string' ? newContent : file.newContent ?? file.patchContent;
    if (staticWorkspaceMode()) validateStaticChanges([{path:relative,action:'modify',content}]);
    if (typeof content !== 'string') throw new Error('Full file content is required');
    if (content.startsWith('diff --git ') || content.startsWith('--- ')) throw new Error('Unified patches must be resolved to full file contents before writing');
    const target = this.filePath(relative);
    await this.checked(['exec', '-i', session.container_id, '/bin/sh', '-c',
      'path="$1"; while [ "$path" != /workspace ]; do [ ! -L "$path" ] || exit 1; path=$(dirname -- "$path"); done; parent=$(dirname -- "$1"); mkdir -p -- "$parent" || exit 1; cat > "$1"', 'write-file', target], 10000, content);
    return { filePath: relative, applied: true, bytesWritten: Buffer.byteLength(content), timestamp: new Date().toISOString() };
  }
  async readFile(id: string, file: string): Promise<string | null> {
    const session = this.session(id), target = this.filePath(file);
    const result = await this.run(['exec', session.container_id, '/bin/sh', '-c',
      'path="$1"; while [ "$path" != /workspace ]; do [ ! -L "$path" ] || exit 1; path=$(dirname -- "$path"); done; cat -- "$1"', 'read-file', target], 10000);
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
    if (staticWorkspaceMode() && command !== STATIC_PREVIEW) throw new Error('Only the trusted static preview is allowed');
    const session = this.session(id);
    if (!command || command.length > 1024 || !origin.startsWith('https://')) throw new Error('Invalid preview configuration');
    await this.checked(['exec', '-d', '--env', 'PORT=3000', '--env', 'HOST=0.0.0.0', session.container_id,
      '/bin/sh', '-lc', `${command} > /tmp/ryvix-preview.log 2>&1`]);
    // Docker does not publish ports for internal-only networks. A trusted relay
    // bridges inbound traffic; the customer container never joins the public bridge.
    const relay = `${session.container_id}_preview`;
    const relayImage = process.env.RYVIX_PREVIEW_RELAY_IMAGE || 'node:22-alpine';
    if (!this.allowedImages.includes(relayImage)) throw new Error('Preview relay image is not approved');
    const lifetime = Math.max(1,Date.parse(session.expires_at)-Date.now());
    const relayCode = `const net=require('node:net');const server=net.createServer(client=>{const upstream=net.connect(3000,${JSON.stringify(session.container_id)});client.setTimeout(15000);upstream.setTimeout(15000);const close=()=>{client.destroy();upstream.destroy()};client.on('error',close);upstream.on('error',close);client.on('timeout',close);upstream.on('timeout',close);client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());client.pipe(upstream).pipe(client)});server.maxConnections=128;server.listen(3000,'0.0.0.0');setTimeout(()=>process.exit(0),${lifetime});`;
    await this.checked(['run','--detach','--rm','--name',relay,
      '--label','ryvix.workspace=true','--label',`ryvix.session=${id}`,'--label','ryvix.role=preview-relay',
      '--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only',
      '--pids-limit','32','--memory','128m','--memory-swap','128m','--cpus','0.5',
      '--network','bridge','--publish',`127.0.0.1:${session.preview_port}:3000`,
      '--entrypoint','node',relayImage,'-e',relayCode],120000);
    this.relays.add(id);
    try { await this.checked(['network','connect',`${session.container_id}_net`,relay]); }
    catch (error) { await this.run(['rm','--force',relay],10000); this.relays.delete(id); throw error; }
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
    if (staticWorkspaceMode() && command !== STATIC_CHECK) throw new Error('Repository commands are disabled in static mode');
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
    if (this.egress.has(id)) {
      const removed = await this.run(['rm','--force',`${session.container_id}_egress`],10000);
      if (removed.exitCode !== 0 && !removed.stderr.includes('No such container')) throw new Error('Egress broker cleanup failed');
      this.egress.delete(id);
    }
    if (this.relays.has(id)) {
      const removedRelay = await this.run(['rm','--force',`${session.container_id}_preview`],10000);
      if (removedRelay.exitCode !== 0 && !removedRelay.stderr.includes('No such container')) throw new Error('Preview relay cleanup failed');
      this.relays.delete(id);
    }
    const removed = await this.run(['rm', '--force', session.container_id], 10000);
    if (removed.exitCode !== 0 && !removed.stderr.includes('No such container')) throw new Error('Workspace container cleanup failed');
    const network = await this.run(['network', 'rm', `${session.container_id}_net`], 10000);
    if (network.exitCode !== 0 && !network.stderr.includes('not found')) throw new Error('Workspace network cleanup failed');
    session.status = 'destroyed'; session.preview_url = null;
    this.prepared.delete(id);
    if (session.preview_port) this.allocatedPorts.delete(session.preview_port);
    return { ...session };
  }

  /** Restore only a persisted session whose Docker identity matches this worker. */
  async restoreSession(persisted: WorkspaceSession): Promise<WorkspaceSession> {
    const existing = this.activeSessions.get(persisted.id);
    if (existing) {
      if (existing.task_id !== persisted.task_id || existing.project_id !== persisted.project_id)
        throw new Error('Workspace identity mismatch');
      return { ...existing };
    }
    if (!/^[a-f0-9-]{36}$/.test(persisted.id) ||
        persisted.container_id !== `ryvix_sbx_${persisted.id.replace(/-/g, '')}` ||
        !Number.isFinite(Date.parse(persisted.expires_at))) throw new Error('Invalid persisted workspace');
    const inspection = await this.checked(['inspect', persisted.container_id]);
    const container = JSON.parse(inspection.stdout)[0];
    const labels = container?.Config?.Labels;
    if (labels?.['ryvix.workspace'] !== 'true' || labels?.['ryvix.session'] !== persisted.id ||
        labels?.['ryvix.task'] !== persisted.task_id || labels?.['ryvix.project'] !== persisted.project_id ||
        !container.State?.Running || container.Config.User !== '1000:1000')
      throw new Error('Workspace is not available on this worker');
    if (persisted.preview_url) {
      const relayInspection = await this.checked(['inspect',`${persisted.container_id}_preview`]);
      const relay = JSON.parse(relayInspection.stdout)[0];
      const binding = relay?.NetworkSettings?.Ports?.['3000/tcp'];
      if (relay?.Config?.Labels?.['ryvix.session'] !== persisted.id || relay.Config.Labels['ryvix.role'] !== 'preview-relay' ||
          !Array.isArray(binding) || binding.length!==1 || binding[0].HostIp!=='127.0.0.1' || Number(binding[0].HostPort)!==persisted.preview_port)
        throw new Error('Preview relay identity mismatch');
      this.relays.add(persisted.id);
    }
    const session = { ...persisted };
    this.activeSessions.set(session.id, session);
    if (session.preview_port) this.allocatedPorts.add(session.preview_port);
    const timer = setTimeout(() => { void this.terminateSession(session.id).catch(() => console.error('Workspace expiry cleanup failed')); },
      Math.max(1, Date.parse(session.expires_at) - Date.now()));
    timer.unref(); this.timers.set(session.id, timer);
    return { ...session };
  }
  async cleanupPersistedSession(session: WorkspaceSession): Promise<void> {
    if (!/^[a-f0-9-]{36}$/.test(session.id) || session.container_id !== `ryvix_sbx_${session.id.replace(/-/g, '')}`)
      throw new Error('Invalid persisted workspace');
    if (this.activeSessions.has(session.id)) { await this.terminateSession(session.id); return; }
    // A worker can crash between creating a broker and persisting preview_url.
    // Recover deterministic names only after verifying their ownership labels.
    for (const [suffix, role] of [['egress','egress-broker'],['preview','preview-relay']]) {
      const name = `${session.container_id}_${suffix}`;
      const result = await this.run(['inspect',name],10000);
      if (result.exitCode === 0) {
        const labels = JSON.parse(result.stdout)[0]?.Config?.Labels;
        if (labels?.['ryvix.workspace'] !== 'true' || labels?.['ryvix.session'] !== session.id || labels?.['ryvix.role'] !== role)
          throw new Error('Workspace broker identity mismatch');
        await this.checked(['rm','--force',name]);
      } else if (!/No such (object|container)/i.test(result.stderr)) throw new Error('Workspace broker cleanup unavailable');
    }
    const inspected = await this.run(['inspect',session.container_id],10000);
    if (inspected.exitCode === 0) {
      await this.restoreSession({...session,preview_url:null});
      await this.terminateSession(session.id);
      return;
    }
    if (!/No such (object|container)/i.test(inspected.stderr)) throw new Error('Workspace worker unavailable');
    const network = `${session.container_id}_net`;
    const inspection = await this.run(['network','inspect','--format','{{index .Labels "ryvix.workspace"}}',network],10000);
    if (inspection.exitCode === 0) {
      if (inspection.stdout.trim() !== 'true') throw new Error('Workspace network identity mismatch');
      await this.checked(['network','rm',network]);
    } else if (!/not found|No such network/i.test(inspection.stderr)) throw new Error('Workspace network cleanup unavailable');
  }
  listSessions(): WorkspaceSession[] { return [...this.activeSessions.values()].map(session => ({ ...session })); }
  getSession(id: string): WorkspaceSession | null { const session = this.activeSessions.get(id); return session ? { ...session } : null; }
}
export const dockerWorkspaceManager = new DockerWorkspaceManager();
