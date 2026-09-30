import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { PullRequestService } from './pr.service';

export class RepositoryConnectionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
interface ConnectionInput {
  organizationId: string; userId: string; fullName: string; token: string; branch?: string;
}

/** Persist repository selection and its worker credential as one audited operation. */
export class RepositoryConnectionStore {
  constructor(private readonly pool: Pool, private readonly request: typeof fetch = fetch) {}
  async connect(input: ConnectionInput) {
    const coords = PullRequestService.parseRepoCoordinates(input.fullName);
    if (!coords || input.fullName !== `${coords.owner}/${coords.repo}`)
      throw new RepositoryConnectionError('Provide a valid GitHub repository name.', 400);
    if (!input.token || input.token.length > 4096 || /[\r\n]/.test(input.token))
      throw new RepositoryConnectionError('Reconnect GitHub before selecting a repository.', 401);
    const read = async (path: string) => {
      const response = await this.request(`https://api.github.com/repos/${coords.owner}/${coords.repo}${path}`, {
        headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/vnd.github+json' },
        redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new RepositoryConnectionError('GitHub repository or branch access could not be verified.', 422);
      return response.json();
    };
    const repository = await read('');
    if (!Number.isSafeInteger(repository.id) || repository.id <= 0 ||
      typeof repository.full_name !== 'string' || !PullRequestService.parseRepoCoordinates(repository.full_name) ||
      typeof repository.private !== 'boolean') throw new RepositoryConnectionError('Invalid GitHub repository response.', 502);
    const branch = input.branch || repository.default_branch;
    if (typeof branch !== 'string' || !branch || branch.length > 255 || /[\x00-\x1f]/.test(branch))
      throw new RepositoryConnectionError('A valid branch is required.', 400);
    const verifiedBranch = await read(`/branches/${encodeURIComponent(branch)}`);
    if (verifiedBranch.name !== branch) throw new RepositoryConnectionError('GitHub branch verification failed.', 422);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize onboarding per organization and recheck permission at mutation time.
      await client.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [input.organizationId]);
      const membership = await client.query(`SELECT role FROM organization_members WHERE organization_id=$1
        AND user_id=$2 AND role IN ('owner','admin','developer') FOR SHARE`, [input.organizationId, input.userId]);
      if (!membership.rows[0]) throw new RepositoryConnectionError('Repository connection access denied.', 403);
      const existing = await client.query(`SELECT r.project_id FROM repositories r JOIN projects p ON p.id=r.project_id
        WHERE p.organization_id=$1 AND r.github_repo_id=$2`, [input.organizationId, repository.id]);
      if (existing.rows.length > 1) throw new RepositoryConnectionError('Repository belongs to multiple projects. Manage its existing connections from project settings.', 409);
      let projectId = existing.rows[0]?.project_id;
      if (projectId) {
        const shared = await client.query('SELECT id FROM repositories WHERE project_id=$1 AND github_repo_id<>$2 LIMIT 1', [projectId, repository.id]);
        if (shared.rows[0]) throw new RepositoryConnectionError('This project contains multiple repositories. Manage its shared GitHub credential in Connections.', 409);
      }
      if (!projectId) {
        const project = await client.query(`INSERT INTO projects(organization_id,name,slug,environment)
          VALUES($1,$2,$3,'development') ON CONFLICT (organization_id,slug) DO UPDATE SET updated_at=now() RETURNING id`,
        [input.organizationId, repository.full_name, `github-${repository.id}`]);
        projectId = project.rows[0].id;
      }
      const environment = await client.query(`INSERT INTO environments(project_id,name,slug,is_production)
        VALUES($1,'Development','development',false) ON CONFLICT (project_id,slug) DO UPDATE SET updated_at=now() RETURNING id`, [projectId]);
      const connectionName = `GitHub: ${repository.full_name}`;
      const previous = await client.query(`SELECT id FROM connectors WHERE environment_id=$1 AND connector_type='github'
        AND name=$2 AND status<>'revoked' ORDER BY created_at LIMIT 1 FOR UPDATE`, [environment.rows[0].id, connectionName]);
      let connectionId = previous.rows[0]?.id;
      if (!connectionId) {
        const connection = await client.query(`INSERT INTO connectors(environment_id,name,connector_type,status)
          VALUES($1,$2,'github','active') RETURNING id`, [environment.rows[0].id, connectionName]);
        connectionId = connection.rows[0].id;
      }
      const refs = await client.query('SELECT vault_secret_ref FROM connector_credentials WHERE connector_id=$1', [connectionId]);
      await client.query('DELETE FROM connector_credentials WHERE connector_id=$1', [connectionId]);
      for (const ref of refs.rows) await client.query('DELETE FROM vault.secrets WHERE id::text=$1', [ref.vault_secret_ref]);
      const secret = await client.query('SELECT vault.create_secret($1,$2) AS id', [input.token, `connection-${connectionId}`]);
      await client.query(`INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref)
        VALUES($1,'oauth_token',$2)`, [connectionId, secret.rows[0].id]);
      await client.query("UPDATE connectors SET status='active',updated_at=now() WHERE id=$1", [connectionId]);
      const saved = await client.query(`INSERT INTO repositories(project_id,github_repo_id,full_name,default_branch,clone_url,is_private)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (project_id, github_repo_id) DO UPDATE SET
        full_name=EXCLUDED.full_name,default_branch=EXCLUDED.default_branch,clone_url=EXCLUDED.clone_url,
        is_private=EXCLUDED.is_private,updated_at=now()
        RETURNING id,project_id,github_repo_id,full_name,default_branch,clone_url,is_private,detected_stack`,
      [projectId, repository.id, repository.full_name, branch, `https://github.com/${repository.full_name}.git`, repository.private]);
      await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,$2,'user','repository.connect',$3,$4,'success')`, [projectId, input.userId,
        createHash('sha256').update(String(repository.id)).digest('hex'), `Connected repository ${repository.full_name}`]);
      await client.query('COMMIT');
      return saved.rows[0];
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
}
