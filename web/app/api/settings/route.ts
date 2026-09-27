import { NextRequest, NextResponse } from "next/server";
import * as crypto from "node:crypto";
import { queryDirectDb } from "@/utils/direct-db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let orgId: string | null = null;
    let userFullName: string = "Account Owner";
    let userEmail: string = "";

    if (user) {
      userEmail = user.email || "";
      userFullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Account Owner";

      const profileRes = await queryDirectDb<{ organization_id: string; full_name: string }>(
        `SELECT organization_id, full_name FROM profiles WHERE id = $1`,
        [user.id]
      );

      if (profileRes[0]?.organization_id) {
        orgId = profileRes[0].organization_id;
      }
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
      members: finalMembers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profileRes = await queryDirectDb<{ organization_id: string }>(
      `SELECT organization_id FROM profiles WHERE id = $1`,
      [user.id]
    );
    const userOrgId = profileRes[0]?.organization_id;

    const body = await req.json().catch(() => ({}));
    const { action, orgName } = body;
    const targetOrgId = userOrgId;

    if (!targetOrgId) {
      return NextResponse.json({ success: false, error: "No organization found" }, { status: 400 });
    }

    const membership = await queryDirectDb<{ role: string }>(
      "SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2",
      [targetOrgId, user.id]
    );
    if (!membership.some(({ role }) => role === "owner" || role === "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (action === "update_org" && orgName) {
      await queryDirectDb("UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2", [
        orgName,
        targetOrgId,
      ]);
      return NextResponse.json({ success: true, message: "Organization updated successfully" });
    }

    if (action === "generate_key") {
      const rawSecret = `ryvix_live_${crypto.randomBytes(24).toString("hex")}`;
      const prefix = rawSecret.slice(0, 16);
      const hash = crypto.createHash("sha256").update(rawSecret).digest("hex");

      const insertRes = await queryDirectDb(
        `INSERT INTO api_keys (id, organization_id, name, key_prefix, hashed_secret, scopes, expires_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, ARRAY['read', 'write', 'deploy', 'ai'], NOW() + INTERVAL '1 year', NOW())
         RETURNING id, name, key_prefix, created_at, expires_at`,
        [targetOrgId, body.keyName || "Platform API Key", prefix, hash]
      );

      return NextResponse.json({
        success: true,
        rawKey: rawSecret,
        key: insertRes[0],
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
