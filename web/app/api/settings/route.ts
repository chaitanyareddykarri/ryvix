import { NextRequest, NextResponse } from "next/server";
import { queryDirectDb, getDirectDbPool } from "@/utils/direct-db";
import { SettingsStore, SettingsError } from '../../../../backend/src/services/settings-store';
import { requireTenant, RequestError } from '@/utils/tenant-context';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, organizationId, role } = await requireTenant();

    let orgId: string | null = organizationId;
    let userFullName: string = "Account Owner";
    let userEmail: string = "";

    if (user) {
      userEmail = user.email || "";
      userFullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Account Owner";

      const profileRes = await queryDirectDb<{ organization_id: string; full_name: string }>(
        `SELECT organization_id, full_name FROM profiles WHERE id = $1`,
        [user.id]
      );

      if (profileRes[0]?.full_name) {
        userFullName = profileRes[0].full_name;
      }
    }

    if (!orgId) {
      return NextResponse.json({
        success: true,
        organization: {
          id: user?.id || "individual-workspace",
          name: `${userFullName}'s Workspace`,
          slug: "individual-workspace",
          billing_tier: "individual",
        },
        apiKeys: [],
        members: user
          ? [
              {
                id: user.id,
                role: "Owner",
                full_name: userFullName,
                email: userEmail,
              },
            ]
          : [],
      });
    }

    // 1. Fetch user's genuine organization
    const orgRes = await queryDirectDb(
      `SELECT id, name, slug, created_at, updated_at
       FROM organizations
       WHERE id = $1`,
      [orgId]
    );

    // 2. Fetch user's organization API keys
    const keyRes = await queryDirectDb(
      `SELECT id, name, key_prefix, scopes, created_at, expires_at
       FROM api_keys
       WHERE organization_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 10`,
      [orgId]
    );

    // 3. Fetch ONLY members of this specific organization
    const membersRes = await queryDirectDb(
      `SELECT om.id, om.role, COALESCE(p.full_name, split_part(u.email, '@', 1)) as full_name, u.email
       FROM organization_members om
       LEFT JOIN profiles p ON p.id = om.user_id
       LEFT JOIN auth.users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.created_at ASC`,
      [orgId]
    );

    let finalMembers = membersRes || [];
    if (finalMembers.length === 0 && user) {
      finalMembers = [
        {
          id: user.id,
          role: "Owner",
          full_name: userFullName,
          email: userEmail,
        },
      ];
    }

    const org = orgRes[0] || {
      id: orgId,
      name: `${userFullName}'s Workspace`,
      slug: "workspace",
      billing_tier: "individual",
    };

    return NextResponse.json({
      success: true,
      organization: org,
      apiKeys: keyRes || [],
      currentRole: role,
      members: finalMembers,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof RequestError ? err.message : 'Settings unavailable.' }, { status: err instanceof RequestError ? err.status : 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Invalid request.',400);
    const result = await new SettingsStore(getDirectDbPool()).mutate(organizationId,user.id,body);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    const known = error instanceof RequestError || error instanceof SettingsError;
    return NextResponse.json({success:false,error:known ? error.message : 'Settings update unavailable.'},
      {status:known ? error.status : 503});
  }
}
