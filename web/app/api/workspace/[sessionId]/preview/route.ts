import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { dockerWorkspaceManager } from '../../../../../../services/src/workspace/docker-workspace.manager';
import { previewLaunchUrl } from '../../../../../../services/src/workspace/preview-gateway';

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { db, organizationId } = await requireTenant();
    const { sessionId } = await context.params;
    const session = dockerWorkspaceManager.getSession(sessionId);
    if (!session) throw new RequestError('Preview unavailable.', 404);
    const project = await db.from('projects').select('id').eq('id', session.project_id).eq('organization_id', organizationId).single();
    if (project.error || !project.data) throw new RequestError('Preview unavailable.', 404);
    const url = await previewLaunchUrl(sessionId);
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Preview unavailable.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
