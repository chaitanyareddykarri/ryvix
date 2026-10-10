import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { persistedPreviewLaunchUrl } from '../../../../../../services/src/workspace/preview-grants';

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { db, organizationId } = await requireTenant();
    const { sessionId } = await context.params;
    const persisted = await db.from('workspace_sessions').select('*').eq('id', sessionId).single();
    const session = persisted.data;
    if (persisted.error || !session || session.status !== 'active' || Date.parse(session.expires_at) <= Date.now())
      throw new RequestError('Preview unavailable.', 404);
    const project = await db.from('projects').select('id').eq('id', session.project_id).eq('organization_id', organizationId).single();
    if (project.error || !project.data) throw new RequestError('Preview unavailable.', 404);
    const url = persistedPreviewLaunchUrl(session);
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Preview unavailable.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
