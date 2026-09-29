import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { requireTenant, requireOperator, RequestError } from '@/utils/tenant-context';
import { getDirectDbPool } from '@/utils/direct-db';
import { PullRequestService } from '../../../../backend/src/services/pr.service';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Connection storage unavailable. Please retry.' },
    { status: error instanceof RequestError ? error.status : 503 });
}
export async function GET() {
  try {
    const { user, organizationId } = await requireTenant();
    const pool = getDirectDbPool();
    const scope = `FROM environments e JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND m.user_id=$2`;
    const environments = await pool.query(`SELECT e.id,e.name,p.name AS project_name ${scope}`, [organizationId, user.id]);
    const connections = await pool.query(`SELECT c.id,c.name,c.connector_type AS type,c.status,c.environment_id,
      c.last_heartbeat_at,c.created_at FROM connectors c WHERE c.environment_id IN (SELECT e.id ${scope})
      AND c.status<>'revoked' ORDER BY c.created_at DESC`, [organizationId, user.id]);
    return NextResponse.json({ connections: connections.rows, environments: environments.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
async function mutate(request: Request, mode: 'create'|'update'|'revoke') {
  let client: PoolClient | undefined;
  try {
    const { user, organizationId, role } = await requireTenant();
    requireOperator(role);
    const body = await request.json().catch(() => null);
    if (!body || !uuid.test(body.environmentId || '') || (mode !== 'create' && !uuid.test(body.id || '')))
      throw new RequestError('Valid connection and environment identifiers are required.', 400);
    if (mode !== 'revoke' && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120))
      throw new RequestError('Provide a connection name of at most 120 characters.', 400);
    if (mode === 'create' && body.type !== 'github')
      throw new RequestError('Use the provider-specific OAuth, webhook or server enrollment flow for this connection type.', 422);
    const token = body.config?.token;
    if ((mode === 'create' || token !== undefined) && (typeof token !== 'string' || !token.trim() || token.length > 4096 || /[\r\n]/.test(token)))
      throw new RequestError('Provide a valid GitHub token.', 400);
    client = await getDirectDbPool().connect();
    await client.query('BEGIN');
    const scope = await client.query(`SELECT e.id,p.id AS project_id FROM environments e JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id WHERE e.id=$1 AND p.organization_id=$2
      AND m.user_id=$3 AND m.role IN ('owner','admin','developer') FOR SHARE OF m`, [body.environmentId, organizationId, user.id]);
    if (!scope.rows[0]) throw new RequestError('Environment access denied.', 403);
    let connection;
    if (mode !== 'create') {
      const selected = await client.query(`SELECT id,name,connector_type AS type,status,environment_id FROM connectors
        WHERE id=$1 AND environment_id=$2 AND status<>'revoked' FOR UPDATE`, [body.id, body.environmentId]);
      connection = selected.rows[0];
      if (!connection) throw new RequestError('Connection unavailable.', 404);
      if (token !== undefined && connection.type !== 'github') throw new RequestError('Use the provider-specific credential flow.', 422);
    }
    if (mode !== 'revoke' && token !== undefined) {
      const verification = await PullRequestService.verifyGitHubToken(token);
      if (!verification.valid) throw new RequestError(verification.error || 'GitHub credentials rejected.', 422);
    }
    if (mode === 'create') {
      const inserted = await client.query(`INSERT INTO connectors(environment_id,name,connector_type,status)
        VALUES($1,$2,'github','active') RETURNING id,name,connector_type AS type,status,environment_id`, [body.environmentId, body.name.trim()]);
      connection = inserted.rows[0];
    } else {
      const updated = await client.query(`UPDATE connectors SET name=$2,status=$3,updated_at=now() WHERE id=$1
        RETURNING id,name,connector_type AS type,status,environment_id`, [connection.id, mode === 'revoke' ? connection.name : body.name.trim(),
        mode === 'revoke' ? 'revoked' : connection.status]);
      connection = updated.rows[0];
    }
    if (mode === 'revoke' || token !== undefined) {
      const refs = await client.query('SELECT vault_secret_ref FROM connector_credentials WHERE connector_id=$1', [connection.id]);
      for (const ref of refs.rows) {
        if (uuid.test(ref.vault_secret_ref)) await client.query('DELETE FROM vault.secrets WHERE id=$1', [ref.vault_secret_ref]);
      }
      await client.query('DELETE FROM connector_credentials WHERE connector_id=$1', [connection.id]);
      if (mode !== 'revoke') {
        const secret = await client.query('SELECT vault.create_secret($1,$2) AS id', [token, `connection-${connection.id}`]);
        await client.query(`INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref)
          VALUES($1,'oauth_token',$2)`, [connection.id, secret.rows[0].id]);
      }
    }
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user',$3,$4,$5,'success')`, [scope.rows[0].project_id, user.id, `connection.${mode}`,
      createHash('sha256').update(connection.id).digest('hex'), `Connection ${mode}`]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true, connection });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return failure(error);
  } finally { client?.release(); }
}
export const POST = (request: Request) => mutate(request, 'create');
export const PATCH = (request: Request) => mutate(request, 'update');
export const DELETE = (request: Request) => mutate(request, 'revoke');
