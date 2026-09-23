import { NextRequest, NextResponse } from "next/server";
import * as crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { Client } = require("pg");
    const client = new Client({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:CR%24%24Reddy2006@db.tsoyrpgifovzwqtgpkkb.supabase.co:5432/postgres",
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const orgRes = await client.query(`
      SELECT id, name, slug, created_at, updated_at
      FROM organizations
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const keyRes = await client.query(`
      SELECT id, name, key_prefix, scopes, created_at, expires_at
      FROM api_keys
      WHERE revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const membersRes = await client.query(`
      SELECT om.id, om.role, p.full_name, COALESCE(u.email, p.full_name || '@company.com') as email
      FROM organization_members om
      LEFT JOIN profiles p ON p.id = om.user_id
      LEFT JOIN auth.users u ON u.id = om.user_id
      LIMIT 10
    `);

    await client.end();

    const org = orgRes.rows[0] || {
      id: "f796c1ea-53c0-48f3-9bb1-56fd7841e744",
      name: "Nova Studio",
      slug: "nova-studio",
      billing_tier: "enterprise",
    };

    return NextResponse.json({
      success: true,
      organization: org,
      apiKeys: keyRes.rows || [],
      members: membersRes.rows || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, orgName, orgId } = body;

    const { Client } = require("pg");
    const client = new Client({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:CR%24%24Reddy2006@db.tsoyrpgifovzwqtgpkkb.supabase.co:5432/postgres",
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    if (action === "update_org" && orgName) {
      await client.query("UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2", [
        orgName,
        orgId || "f796c1ea-53c0-48f3-9bb1-56fd7841e744",
      ]);
      await client.end();
      return NextResponse.json({ success: true, message: "Organization updated successfully" });
    }

    if (action === "generate_key") {
      const rawSecret = `ryvix_live_${crypto.randomBytes(24).toString("hex")}`;
      const prefix = rawSecret.slice(0, 16);
      const hash = crypto.createHash("sha256").update(rawSecret).digest("hex");

      const insertRes = await client.query(
        `INSERT INTO api_keys (id, organization_id, name, key_prefix, hashed_secret, scopes, expires_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, ARRAY['read', 'write', 'deploy', 'ai'], NOW() + INTERVAL '1 year', NOW())
         RETURNING id, name, key_prefix, created_at, expires_at`,
        [orgId || "f796c1ea-53c0-48f3-9bb1-56fd7841e744", body.keyName || "Platform API Key", prefix, hash]
      );
      await client.end();

      return NextResponse.json({
        success: true,
        rawKey: rawSecret,
        key: insertRes.rows[0],
      });
    }

    await client.end();
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
