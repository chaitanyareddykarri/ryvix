import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { queryDirectDb } from '@/utils/direct-db';

export async function GET(request: Request) {
  try {
    const {organizationId,user} = await requireTenant();
    const parameters = new URL(request.url).searchParams;
    const severity = parameters.get('severity') || 'all';
    const limit = Number(parameters.get('limit') || '60');
    if (!['all','info','warning','critical','security'].includes(severity) || !Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new RequestError('Use a supported severity and a limit between 1 and 100.',400);
    const logs = await queryDirectDb(`WITH authorized_projects AS (
      SELECT p.id,p.name FROM projects p JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND m.user_id=$2
    ), observations AS (
      SELECT 'host-'||l.server_id::text||'-'||l.event_id::text AS id,l.observed_at AS timestamp,'HOST' AS type,
        host.hostname||' / '||l.source AS source,l.severity,l.message
      FROM host_log_entries l JOIN servers host ON host.id=l.server_id
      JOIN environments e ON e.id=host.environment_id JOIN authorized_projects p ON p.id=e.project_id
      WHERE l.received_at>now()-interval '7 days'
      UNION ALL
      SELECT 'audit-'||a.id::text AS id,a.timestamp,'AUDIT' AS type,p.name AS source,
        CASE WHEN a.status='success' THEN 'info' ELSE 'warning' END AS severity,
        a.action_name||' ('||a.status||')' AS message
      FROM audit_events a JOIN authorized_projects p ON p.id=a.project_id
      UNION ALL
      SELECT 'security-'||s.id::text,s.detected_at,'SECURITY',p.name,
        CASE WHEN s.severity='critical' THEN 'critical' WHEN s.severity IN ('high','medium') THEN 'warning' ELSE 'info' END,
        s.event_type||' ('||s.status||')'
      FROM security_events s JOIN servers host ON host.id=s.server_id
      JOIN environments e ON e.id=host.environment_id JOIN authorized_projects p ON p.id=e.project_id
      UNION ALL
      SELECT 'health-'||h.id::text,h.last_checked_at,'HEALTH',p.name,
        CASE WHEN h.status='failing' THEN 'critical' WHEN h.status='degraded' THEN 'warning' ELSE 'info' END,
        h.name||': latest recorded check '||h.status
      FROM health_checks h JOIN environments e ON e.id=h.environment_id
      JOIN authorized_projects p ON p.id=e.project_id WHERE h.last_checked_at IS NOT NULL
    ) SELECT id,timestamp,type,source,severity,message FROM observations
      WHERE ($3='all' OR ($3='security' AND type='SECURITY') OR severity=$3)
      ORDER BY timestamp DESC,id LIMIT $4`, [organizationId,user.id,severity,limit]);
    return NextResponse.json({success:true,logs,count:logs.length}, {headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return NextResponse.json({success:false,error:error instanceof RequestError ? error.message : 'Observability records unavailable. Please retry.'},
      {status:error instanceof RequestError ? error.status : 503});
  }
}
