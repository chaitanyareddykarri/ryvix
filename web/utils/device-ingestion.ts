import 'server-only';
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getDirectDbPool } from './direct-db';
import { DeviceError, deviceUuid, digest, devicePublicKey, measuredTelemetry, verifyDeviceRequest } from '../../backend/src/services/device-protocol';

export async function boundedDeviceBody(request: Request, max = 262144) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new DeviceError('JSON content type required.', 415);
  if (request.headers.get('content-encoding') && request.headers.get('content-encoding') !== 'identity')
    throw new DeviceError('Compressed payloads are not accepted.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DeviceError('Request body required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); throw new DeviceError('Request too large.', 413); }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}
async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getDirectDbPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '10s'");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
async function audit(client: PoolClient, project: string, actor: string | null, action: string, id: string) {
  await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,$3,$4,$5,$6,'success')`, [project, actor, actor ? 'user' : 'system', action, digest(id), action]);
}
export async function issueEnrollment(context: { organizationId: string; userId: string }, environmentId: unknown, hostname: unknown) {
  if (typeof environmentId !== 'string' || !deviceUuid.test(environmentId)
    || typeof hostname !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/.test(hostname))
    throw new DeviceError('Select an environment and provide the server hostname.');
  return transaction(async client => {
    const scoped = await client.query(`SELECT e.id,p.id AS project_id FROM environments e JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id WHERE e.id=$1 AND p.organization_id=$2
      AND m.user_id=$3 AND m.role IN ('owner','admin','developer') FOR UPDATE OF e FOR SHARE OF m`,
    [environmentId, context.organizationId, context.userId]);
    if (!scoped.rows[0]) throw new DeviceError('Environment access denied.', 403);
    const count = await client.query(`SELECT count(*)::int AS count FROM connector_enrollments n JOIN connectors c ON c.id=n.connector_id
      WHERE c.environment_id=$1 AND n.expires_at>now() AND n.consumed_at IS NULL`, [environmentId]);
    if (count.rows[0].count >= 10) throw new DeviceError('Too many outstanding enrollments; wait for expiry.', 429);
    const connector = await client.query(`INSERT INTO connectors(environment_id,name,connector_type,status)
      VALUES($1,$2,'server_inband','enrolling') RETURNING id`, [environmentId, hostname]);
    const server = await client.query(`INSERT INTO servers(environment_id,connector_id,hostname,os_type,status)
      VALUES($1,$2,$3,'unknown','unreachable') RETURNING id`, [environmentId, connector.rows[0].id, hostname]);
    const token = randomBytes(32).toString('base64url');
    const enrollment = await client.query(`INSERT INTO connector_enrollments(connector_id,server_id,token_hash,created_by,expires_at)
      VALUES($1,$2,$3,$4,now()+interval '10 minutes') RETURNING id,expires_at`,
    [connector.rows[0].id, server.rows[0].id, digest(token), context.userId]);
    await audit(client, scoped.rows[0].project_id, context.userId, 'connector.enrollment.issue', server.rows[0].id);
    return { enrollmentId: enrollment.rows[0].id, serverId: server.rows[0].id, token, expiresAt: enrollment.rows[0].expires_at };
  });
}
export async function registerDevice(body: Record<string, unknown>) {
  if (typeof body.enrollmentToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.enrollmentToken)
    || typeof body.osType !== 'string' || !body.osType.trim() || body.osType.length > 120
    || typeof body.agentVersion !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(body.agentVersion))
    throw new DeviceError('Valid enrollment token, OS and agent version required.');
  devicePublicKey(body.publicKey);
  return transaction(async client => {
    const result = await client.query(`SELECT n.id,n.server_id,n.connector_id,c.environment_id,p.id AS project_id
      FROM connector_enrollments n JOIN connectors c ON c.id=n.connector_id
      JOIN servers s ON s.id=n.server_id AND s.connector_id=c.id AND s.environment_id=c.environment_id
      JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=n.created_by
      WHERE n.token_hash=$1 AND n.consumed_at IS NULL AND n.expires_at>now() AND c.status='enrolling'
      AND m.role IN ('owner','admin','developer') FOR UPDATE OF n,c FOR SHARE OF m`, [digest(body.enrollmentToken as string)]);
    const enrollment = result.rows[0];
    if (!enrollment) throw new DeviceError('Enrollment is expired, consumed or unauthorized.', 403);
    await client.query(`UPDATE connectors SET device_public_key=$2,public_key_fingerprint=$3,agent_version=$4,
      status='active',updated_at=now() WHERE id=$1`, [enrollment.connector_id, body.publicKey, digest(body.publicKey as string), body.agentVersion]);
    await client.query('UPDATE servers SET os_type=$2 WHERE id=$1', [enrollment.server_id, body.osType]);
    await client.query('UPDATE connector_enrollments SET consumed_at=now() WHERE id=$1', [enrollment.id]);
    await audit(client, enrollment.project_id, null, 'connector.register', enrollment.server_id);
    return { id: enrollment.connector_id, serverId: enrollment.server_id, environmentId: enrollment.environment_id };
  });
}
export async function ingestDevice(body: Buffer, headers: Headers) {
  const sample = measuredTelemetry(body);
  return transaction(async client => {
    const result = await client.query(`SELECT c.id,c.device_public_key FROM connectors c JOIN servers s ON s.connector_id=c.id
      AND s.environment_id=c.environment_id WHERE s.id=$1 AND c.connector_type='server_inband'
      AND c.status='active' AND c.device_public_key IS NOT NULL FOR UPDATE OF c`, [sample.serverId]);
    const connector = result.rows[0];
    if (!connector) throw new DeviceError('Device not enrolled or revoked.', 401);
    const nonce = verifyDeviceRequest(body, headers, connector.device_public_key);
    await client.query(`DELETE FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at<now()-interval '10 minutes'`, [connector.id]);
    const replay = await client.query('SELECT 1 FROM connector_telemetry_receipts WHERE connector_id=$1 AND nonce=$2', [connector.id, nonce]);
    if (replay.rows.length) throw new DeviceError('Telemetry replay rejected.', 409);
    const rate = await client.query(`SELECT count(*)::int AS count FROM connector_telemetry_receipts
      WHERE connector_id=$1 AND received_at>now()-interval '1 minute'`, [connector.id]);
    if (rate.rows[0].count >= 200) throw new DeviceError('Device telemetry rate limit exceeded.', 429);
    await client.query('INSERT INTO connector_telemetry_receipts(connector_id,nonce) VALUES($1,$2)', [connector.id, nonce]);
    await client.query(`INSERT INTO telemetry_metric_rollups(server_id,bucket_timestamp,cpu_avg,cpu_max,ram_used_mb,ram_percent,
      disk_used_percent,authenticated,sample_count,last_sample_at,iops_read,iops_write,net_rx_kb,net_tx_kb)
      VALUES($1,date_trunc('minute',$2::timestamptz),$3,$3,$4,$5,$6,true,1,$2,NULL,NULL,NULL,NULL)
      ON CONFLICT(server_id,bucket_timestamp) WHERE authenticated DO UPDATE SET
      cpu_avg=(telemetry_metric_rollups.cpu_avg*telemetry_metric_rollups.sample_count+EXCLUDED.cpu_avg)/(telemetry_metric_rollups.sample_count+1),
      cpu_max=greatest(telemetry_metric_rollups.cpu_max,EXCLUDED.cpu_max),sample_count=telemetry_metric_rollups.sample_count+1,
      ram_used_mb=CASE WHEN EXCLUDED.last_sample_at>=telemetry_metric_rollups.last_sample_at THEN EXCLUDED.ram_used_mb ELSE telemetry_metric_rollups.ram_used_mb END,
      ram_percent=CASE WHEN EXCLUDED.last_sample_at>=telemetry_metric_rollups.last_sample_at THEN EXCLUDED.ram_percent ELSE telemetry_metric_rollups.ram_percent END,
      disk_used_percent=CASE WHEN EXCLUDED.last_sample_at>=telemetry_metric_rollups.last_sample_at THEN EXCLUDED.disk_used_percent ELSE telemetry_metric_rollups.disk_used_percent END,
      last_sample_at=greatest(telemetry_metric_rollups.last_sample_at,EXCLUDED.last_sample_at)`,
    [sample.serverId, sample.timestamp, sample.cpu, sample.memoryMb, sample.memory, sample.disk]);
    await client.query('UPDATE connectors SET last_heartbeat_at=now(),updated_at=now() WHERE id=$1', [connector.id]);
    for(const item of sample.inventory)await client.query(`INSERT INTO services_inventory(server_id,service_name,unit_type,status,last_seen_at)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(server_id,service_name,unit_type) DO UPDATE SET status=EXCLUDED.status,last_seen_at=EXCLUDED.last_seen_at
      WHERE services_inventory.last_seen_at<=EXCLUDED.last_seen_at`,[sample.serverId,item.name,item.type,item.status,sample.timestamp]);
    await client.query(`UPDATE servers SET status=$2,updated_at=$3 WHERE id=$1 AND updated_at<=$3`,
      [sample.serverId, Math.max(sample.cpu, sample.memory, sample.disk) >= 95 ? 'critical'
        : Math.max(sample.cpu, sample.memory, sample.disk) >= 85 ? 'warning' : 'healthy', sample.timestamp]);
    return { success: true, heartbeatAck: true, timestamp: sample.timestamp.toISOString() };
  });
}
