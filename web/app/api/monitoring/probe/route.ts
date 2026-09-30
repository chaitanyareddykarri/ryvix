import { NextResponse } from 'next/server';
import { requireTenant, requireOperator, RequestError } from '@/utils/tenant-context';
import { queryDirectDb } from '@/utils/direct-db';
import { correlateProbe, probePublicEndpoint, ProbeTargetError } from '../../../../../services/src/monitoring/public-probe';

export async function POST(request: Request) {
  try {
    const {organizationId,user,role} = await requireTenant();
    requireOperator(role);
    const body = await request.json().catch(() => null);
    if (typeof body?.targetUrl !== 'string' || !body.targetUrl.trim() || body.targetUrl.length > 2048)
      throw new RequestError('Provide the public endpoint URL to probe.', 400);
    let heartbeat: string | null = null;
    if (body.serverId !== undefined) {
      if (typeof body.serverId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.serverId)) throw new RequestError('Invalid server identifier.',400);
      const rows = await queryDirectDb(`SELECT c.last_heartbeat_at,
        EXISTS(SELECT 1 FROM health_checks h WHERE h.environment_id=e.id AND h.target_url_or_ip=$4) AS endpoint_registered
        FROM servers s
        JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
        JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
        LEFT JOIN connectors c ON c.id=s.connector_id AND c.environment_id=s.environment_id
          AND c.status='active' AND c.device_public_key IS NOT NULL
        WHERE p.organization_id=$1 AND s.id=$3`, [organizationId,user.id,body.serverId,body.targetUrl]);
      if (!rows[0]) throw new RequestError('Server unavailable.',404);
      heartbeat = rows[0].endpoint_registered && rows[0].last_heartbeat_at ? new Date(rows[0].last_heartbeat_at).toISOString() : null;
    }
    const probe = await probePublicEndpoint(body.targetUrl);
    return NextResponse.json({success:true,probe,evaluation:correlateProbe(probe.isReachable,heartbeat),persisted:false},
      {headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    return NextResponse.json({success:false,error:error instanceof RequestError || error instanceof ProbeTargetError ? error.message : 'Endpoint probe unavailable.'},
      {status:error instanceof RequestError ? error.status : error instanceof ProbeTargetError ? 400 : 503});
  }
}
