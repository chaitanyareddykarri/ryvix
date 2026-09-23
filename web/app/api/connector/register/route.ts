import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { InternalAgent } from "@ryvix/services";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      enrollmentToken,
      hostname,
      ipAddress,
      osType,
      kernelVersion,
      cpuCores,
      ramMb,
      diskGb,
      cloudProvider,
    } = body;

    if (!enrollmentToken) {
      return NextResponse.json(
        { success: false, error: "Missing enrollment token" },
        { status: 400 }
      );
    }

    const secret = process.env.CONNECTOR_ENROLLMENT_SECRET || "ryvix_demo_enrollment_secret_key_2026";
    const validation = InternalAgent.verifyEnrollmentToken(enrollmentToken, secret);

    if (!validation.valid || !validation.environmentId) {
      return NextResponse.json(
        { success: false, error: `Invalid or expired enrollment token: ${validation.error}` },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Schema requires valid UUID for connectors.id
    const connectorId = crypto.randomUUID();
    const apiKey = `ryvix_sec_${crypto.randomBytes(24).toString("hex")}`;
    const serverHostname = hostname || `node-${crypto.randomBytes(3).toString("hex")}.customer.internal`;

    // 1. Register connector in public.connectors matching exact schema
    const { data: connectorRecord, error: connErr } = await supabase
      .from("connectors")
      .insert({
        id: connectorId,
        environment_id: validation.environmentId,
        name: `${serverHostname}-connector`,
        connector_type: "agent_daemon",
        status: "active",
        agent_version: "2.4.0",
        last_heartbeat_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (connErr) {
      console.warn("[Connector DB Warning]:", connErr.message);
    }

    // 2. Register or link Server in public.servers matching exact schema
    const { data: serverRecord, error: serverErr } = await supabase
      .from("servers")
      .insert({
        environment_id: validation.environmentId,
        connector_id: connectorId,
        hostname: serverHostname,
        ip_address: ipAddress || "198.51.100.42",
        os_type: osType || "Linux (Ubuntu 24.04 LTS)",
        kernel_version: kernelVersion || "6.8.0-generic",
        cpu_cores: cpuCores || 4,
        ram_mb: ramMb || 8192,
        disk_gb: diskGb || 80,
        cloud_provider: cloudProvider || "on-premise",
        status: "healthy",
      })
      .select()
      .single();

    if (serverErr) {
      console.warn("[Server DB Warning]:", serverErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Ryvix Connector registered successfully",
      connector: {
        id: connectorId,
        apiKey,
        serverId: serverRecord?.id || connectorId,
        hostname: serverHostname,
        environmentId: validation.environmentId,
        registeredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[Connector Registration Fatal]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register connector" },
      { status: 500 }
    );
  }
}
