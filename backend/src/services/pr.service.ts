import * as crypto from 'node:crypto';
import type { PullRequest } from '@ryvix/database';
import { requireAuthorization, type OperationAuthorization } from './operation-authorization';

export interface FileChangeItem { path: string; content?: string; action?: 'create' | 'modify' | 'delete' }
export interface CreatePullRequestParams {
  repositoryId?: string; repoUrl?: string; taskId?: string; taskPrompt?: string; title?: string;
  description?: string; baseBranch?: string; branchName?: string; summary?: string;
  changedFiles?: string[]; changes?: FileChangeItem[]; githubToken?: string;
  expectedBaseSha?: string;
  authorization?: OperationAuthorization;
}
export interface PullRequestResult extends PullRequest {
  prUrl: string; prNumber: number; branchName: string; commitSha: string;
  summary: { filesChanged: number; additions: number; deletions: number };
  apiStatus: 'created_via_github_api';
}
export class PullRequestService {
  static parseRepoCoordinates(value?: string): { owner: string; repo: string } | null {
    if (!value) return null;
    let path = value.trim();
    if (path.startsWith('https://')) {
      const url = new URL(path);
      if (url.hostname !== 'github.com' || url.username || url.password || url.search || url.hash) return null;
      path = url.pathname.slice(1);
    } else if (path.startsWith('git@github.com:')) path = path.slice('git@github.com:'.length);
    path = path.replace(/\.git$/, '');
    const match = path.match(/^([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9_.-]+)$/);
    return match && match[2] !== '.' && match[2] !== '..' ? { owner: match[1], repo: match[2] } : null;
  }
  static async verifyGitHubToken(token: string): Promise<{ valid: boolean; user?: string; error?: string }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      if (!response.ok) return { valid: false, error: `GitHub HTTP ${response.status}` };
      const data = await response.json();
      return { valid: true, user: data.login };
    } catch { return { valid: false, error: 'GitHub token verification unavailable' }; }
  }

  static async createPullRequest(params: CreatePullRequestParams, request: typeof fetch = fetch): Promise<PullRequestResult> {
    requireAuthorization(params.authorization);
    const auth = params.authorization;
    const coords = this.parseRepoCoordinates(params.repoUrl);
    if (!coords) throw new Error('Valid GitHub repository is required');
    // Token must be selected for this tenant by the backend, never a global fallback.
    const token = params.githubToken;
    if (!token) throw new Error('Repository-scoped GitHub token is required');
    const base = params.baseBranch || 'main';
    const branch = params.branchName || `ryvix/task-${crypto.randomUUID()}`;
    if (!branch.startsWith('ryvix/') || branch === base || /[\s~^:?*\[\\]|\.\.|@\{|\/\//.test(branch) || /[/.]$/.test(branch)) {
      throw new Error('Use a valid, separate ryvix/ working branch');
    }
    const changes = params.changes || [];
    const paths = new Set<string>();
    for (const change of changes) {
      if (!change.path || change.path.startsWith('/') || change.path.includes('\\') || change.path.includes('\0') ||
        change.path.split('/').some(part => !part || part === '..' || part === '.' || part.toLowerCase() === '.git') || paths.has(change.path)) {
        throw new Error('Invalid or duplicate changed file path');
      }
      if (change.action !== 'delete' && typeof change.content !== 'string') throw new Error('Changed files require full content');
      paths.add(change.path);
    }
    const target = `${coords.owner}/${coords.repo}`;
    const api = async (suffix: string, method = 'GET', body?: unknown): Promise<any> => {
      let response: Response;
      try {
        response = await request(`https://api.github.com/repos/${target}/${suffix}`, {
          method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
          body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect: 'error',
        });
      } catch { throw new Error(`GitHub ${method} ${suffix.split('/')[0]} request failed`); }
      if (!response.ok) throw new Error(`GitHub ${method} ${suffix.split('/')[0]} failed (HTTP ${response.status})`);
      return response.json();
    };
    await auth.recordAudit({ action: 'github.create_pr', target, status: 'requested' });
    try {
      let commitSha = '';
      if (changes.length) {
        const ref = await api(`git/ref/heads/${encodeURIComponent(base)}`);
        if (!ref.object?.sha) throw new Error('GitHub base reference is missing');
        if (params.expectedBaseSha && ref.object.sha !== params.expectedBaseSha) throw new Error('Repository changed since generation. Regenerate and review the patch.');
        const parent = await api(`git/commits/${ref.object.sha}`);
        if (!parent.tree?.sha) throw new Error('GitHub base tree is missing');
        // Preserve executable file modes and reject symlink/submodule modifications.
        const tree = await api(`git/trees/${parent.tree.sha}?recursive=1`);
        if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Repository tree is incomplete');
        const entries = changes.map(change => {
          const previous = tree.tree.find((item: any) => item.path === change.path);
          if (previous && !['100644', '100755'].includes(previous.mode)) throw new Error('Only regular files may be changed');
          if (change.action === 'delete' && !previous) throw new Error('Cannot delete a missing file');
          return { path: change.path, mode: previous?.mode || '100644', type: 'blob',
            ...(change.action === 'delete' ? { sha: null } : { content: change.content }) };
        });
        const nextTree = await api('git/trees', 'POST', { base_tree: parent.tree.sha, tree: entries });
        if (!nextTree.sha || nextTree.sha === parent.tree.sha) throw new Error('No repository changes to publish');
        const commit = await api('git/commits', 'POST', { message: params.title || 'Ryvix approved changes', tree: nextTree.sha, parents: [ref.object.sha] });
        if (!commit.sha) throw new Error('GitHub did not return a commit');
        // Creation fails on collision. Never overwrite an existing branch.
        commitSha = commit.sha;
        try {
          await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
        } catch (error) {
          if (!params.expectedBaseSha || !(error instanceof Error) || !error.message.includes('HTTP 422')) throw error;
          const existing = await api(`git/ref/heads/${encodeURIComponent(branch)}`);
          const existingCommit = await api(`git/commits/${existing.object?.sha}`);
          if (existingCommit.tree?.sha !== nextTree.sha || existingCommit.parents?.length !== 1 ||
              existingCommit.parents[0].sha !== params.expectedBaseSha) throw new Error('Working branch contains different changes; manual review required');
          commitSha = existing.object.sha;
        }
      } else {
        const head = await api(`git/ref/heads/${encodeURIComponent(branch)}`);
        if (!head.object?.sha) throw new Error('Existing working branch is required');
        commitSha = head.object.sha;
      }
      let data: any;
      try {
        data = await api('pulls', 'POST', { title: params.title || `Ryvix: ${params.taskPrompt || 'Approved changes'}`,
          head: branch, base, body: params.description || params.summary || 'Approved Ryvix changes' });
      } catch (error) {
        if (!params.expectedBaseSha || !(error instanceof Error) || !error.message.includes('HTTP 422')) throw error;
        const existing = await api(`pulls?state=open&head=${encodeURIComponent(coords.owner + ':' + branch)}&base=${encodeURIComponent(base)}`);
        data = existing.find((pr: any) => pr.head?.sha === commitSha && pr.base?.repo?.full_name === target);
        if (!data) throw error;
      }
      if (!Number.isInteger(data.number) || !data.html_url || data.state !== 'open') throw new Error('GitHub returned an invalid pull request');
      await auth.recordAudit({ action: 'github.create_pr', target, status: 'success', detail: `PR #${data.number}` });
      return { id: String(data.id), repository_id: params.repositoryId || target, task_id: params.taskId || null,
        pr_number: data.number, prNumber: data.number, branch_name: branch, branchName: branch, commitSha,
        title: data.title, status: 'open', html_url: data.html_url, prUrl: data.html_url,
        created_at: data.created_at, updated_at: data.updated_at,
        summary: { filesChanged: data.changed_files ?? changes.length, additions: data.additions ?? 0, deletions: data.deletions ?? 0 },
        apiStatus: 'created_via_github_api' };
    } catch (error) {
      await auth.recordAudit({ action: 'github.create_pr', target, status: 'failure', detail: error instanceof Error ? error.message : 'GitHub operation failed' });
      throw error;
    }
  }
  async createPullRequest(params: CreatePullRequestParams): Promise<PullRequestResult> { return PullRequestService.createPullRequest(params); }
}
export const pullRequestService = new PullRequestService();
