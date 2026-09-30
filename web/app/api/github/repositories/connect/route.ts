import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireTenant, requireOperator, RequestError } from '@/utils/tenant-context';
import { getDirectDbPool } from '@/utils/direct-db';
import { RepositoryConnectionStore, RepositoryConnectionError } from '../../../../../../backend/src/services/repository-connection-store';

function failure(error: unknown) {
  const expected = error instanceof RequestError || error instanceof RepositoryConnectionError;
  return NextResponse.json({ success: false, error: expected ? error.message : 'Repository connection unavailable. Please retry.' },
    { status: expected ? error.status : 503 });
}
export async function GET() {
  try {
    const { user, organizationId } = await requireTenant();
    const result = await getDirectDbPool().query(`SELECT r.id,r.project_id,r.github_repo_id,r.full_name,r.default_branch,
      r.clone_url,r.is_private,r.detected_stack,r.created_at,r.updated_at FROM repositories r
      JOIN projects p ON p.id=r.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND m.user_id=$2 ORDER BY r.created_at DESC`, [organizationId, user.id]);
    return NextResponse.json({ success: true, repositories: result.rows, count: result.rows.length },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const { user, organizationId, role } = await requireTenant();
    requireOperator(role);
    const body = await request.json().catch(() => null);
    const fullName = body?.repo?.full_name || body?.repo?.fullName;
    if (typeof fullName !== 'string' || (body.branch !== undefined && typeof body.branch !== 'string'))
      throw new RequestError('Repository name and branch are required.', 400);
    const token = (await cookies()).get('gh_session_token')?.value || '';
    const repository = await new RepositoryConnectionStore(getDirectDbPool()).connect({
      organizationId, userId: user.id, fullName, branch: body.branch, token,
    });
    return NextResponse.json({ success: true, repository }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
