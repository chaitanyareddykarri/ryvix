import 'server-only';
import { cookies } from 'next/headers';
import { getDirectDbPool } from './direct-db';
import { RequestError } from './tenant-context';

/** Only call after authorizing the task/project. Never return this value to clients or AI. */
export async function githubTokenForProject(projectId: string, organizationId: string, userId: string): Promise<string> {
  const connected = await getDirectDbPool().query(`SELECT secret.decrypted_secret FROM connectors c
    JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id
    JOIN connector_credentials credential ON credential.connector_id=c.id AND credential.credential_type='oauth_token'
    JOIN vault.decrypted_secrets secret ON secret.id::text=credential.vault_secret_ref
    WHERE p.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')
      AND c.connector_type='github' AND c.status='active'
      AND (credential.expires_at IS NULL OR credential.expires_at>now())
    ORDER BY c.updated_at DESC LIMIT 1`, [projectId, organizationId, userId]);
  if (connected.rows[0]?.decrypted_secret) return connected.rows[0].decrypted_secret;
  // Retain the existing server-only OAuth/PAT session when no persisted connection exists.
  const sessionToken = (await cookies()).get('gh_session_token')?.value;
  if (!sessionToken) throw new RequestError('Connect GitHub before running this operation.', 409);
  return sessionToken;
}
