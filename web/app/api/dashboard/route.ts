import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';

export async function GET() {
  try {
    const { db, organizationId } = await requireTenant();
    const projects = await db.from('projects').select('id').eq('organization_id', organizationId);
    if (projects.error) throw new Error('Projects could not be loaded.');
    const projectIds = (projects.data || []).map(p => p.id);
    const empty = { incidents: [], securityEvents: [], auditEvents: [], healthChecks: [] };
    if (!projectIds.length) return NextResponse.json(empty);
    const environments = await db.from('environments').select('id').in('project_id', projectIds);
    if (environments.error) throw new Error('Environments could not be loaded.');
    const environmentIds = (environments.data || []).map(e => e.id);
    const audit = await db.from('audit_events').select('*').in('project_id', projectIds)
      .order('timestamp', { ascending: false }).limit(100);
    if (audit.error) throw new Error('Audit activity could not be loaded.');
    if (!environmentIds.length) return NextResponse.json({ ...empty, auditEvents: audit.data });
    const [incidents, health, servers] = await Promise.all([
      db.from('incidents').select('*').in('environment_id', environmentIds).order('created_at', { ascending: false }).limit(100),
      db.from('health_checks').select('*').in('environment_id', environmentIds).order('last_checked_at', { ascending: false }).limit(100),
      db.from('servers').select('id').in('environment_id', environmentIds),
    ]);
    if (incidents.error || health.error || servers.error) throw new Error('Monitoring data could not be loaded.');
    const serverIds = (servers.data || []).map(s => s.id);
    const security = serverIds.length
      ? await db.from('security_events').select('*').in('server_id', serverIds).order('detected_at', { ascending: false }).limit(100)
      : { data: [], error: null };
    if (security.error) throw new Error('Security events could not be loaded.');
    return NextResponse.json({ incidents: incidents.data, securityEvents: security.data,
      auditEvents: audit.data, healthChecks: health.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Dashboard data unavailable. Please retry.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
