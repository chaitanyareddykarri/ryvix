import { NextResponse } from "next/server";
import {
  InternalAgent,
  CloudRecoveryBridge,
  LocalSecurityEngine,
  ServerAccessManager,
  ServerClassifier,
} from "@ryvix/services";

export const dynamic = "force-dynamic";

interface ServerState {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  provider: string;
  status: "healthy" | "degraded" | "unreachable";
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  lastHeartbeat: string;
  services: Array<{ name: string; status: "active" | "inactive" | "failed" }>;
}

let mockServers: ServerState[] = [
  {
    id: "srv_prod_01",
    hostname: "app-prod-worker-01",
    ip: "198.51.100.24",
    os: "Ubuntu 24.04 LTS (x86_64)",
    provider: "AWS (us-east-1)",
    status: "healthy",
    cpuPercent: 24,
    memoryPercent: 58,
    diskPercent: 32,
    lastHeartbeat: new Date().toISOString(),
    services: [
      { name: "nginx", status: "active" },
      { name: "docker", status: "active" },
      { name: "postgresql", status: "active" },
      { name: "node-app", status: "active" },
    ],
  },
  {
    id: "srv_prod_02",
    hostname: "db-replica-01",
    ip: "198.51.100.89",
    os: "Debian 12 Bookworm",
    provider: "DigitalOcean (nyc3)",
    status: "healthy",
    cpuPercent: 42,
    memoryPercent: 71,
    diskPercent: 64,
    lastHeartbeat: new Date(Date.now() - 8000).toISOString(),
    services: [
      { name: "postgresql", status: "active" },
      { name: "redis", status: "active" },
      { name: "docker", status: "active" },
    ],
  },
  {
    id: "srv_staging_01",
    hostname: "staging-api-box",
    ip: "203.0.113.15",
    os: "Ubuntu 22.04 LTS",
    provider: "Hetzner (fsn1)",
    status: "degraded",
    cpuPercent: 91,
    memoryPercent: 88,
    diskPercent: 82,
    lastHeartbeat: new Date(Date.now() - 14000).toISOString(),
    services: [
      { name: "nginx", status: "active" },
      { name: "python-api", status: "failed" },
      { name: "docker", status: "active" },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    servers: mockServers,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, serverId, environmentId, capability, params } = body;

    // Action A: Generate single-line agent enrollment script
    if (action === "generate_enrollment") {
      const secret = "ryvix_demo_enrollment_secret_key_2026";
      const token = InternalAgent.generateEnrollmentToken(
        environmentId || "env_prod_ecommerce",
        secret,
        24
      );
      const installScript = InternalAgent.generateInstallScript(token);

      return NextResponse.json({
        success: true,
        token,
        installScript,
        expiresIn: "24 hours",
      });
    }

    // Action B: Execute remote capability against whitelisted internal agent
    if (action === "execute_capability") {
      const agent = new InternalAgent(serverId, "target-host");
      const result = await agent.executeCapability(capability, params || {});

      // If restart was executed on a failed service, update mock status
      if (capability === "service.restart" && params?.unit) {
        mockServers = mockServers.map((s) => {
          if (s.id === serverId) {
            return {
              ...s,
              status: "healthy",
              services: s.services.map((svc) =>
                svc.name === params.unit ? { ...svc, status: "active" as const } : svc
              ),
            };
          }
          return s;
        });
      }

      return NextResponse.json({
        success: true,
        result,
      });
    }

    // Action C: Execute out-of-band cloud recovery reboot
    if (action === "oob_cloud_reboot") {
      const bridge = new CloudRecoveryBridge();
      const result = await bridge.executePowerAction(
        params?.provider || "aws",
        params?.instanceId || "i-09ab7c12d45ef",
        "hard_reset"
      );

      return NextResponse.json({
        success: true,
        result,
      });
    }

    // Action D: Real-time Neural Threat & Metric Diagnosis (<0.02ms)
    if (action === "diagnose_threat_neural") {
      const analysis = LocalSecurityEngine.analyze(params || {});
      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Action E: Generate Ed25519 SSH Keypair for Agentless Server Access
    if (action === "generate_ssh_keypair") {
      const keypair = ServerAccessManager.generateSshKeypair(params?.label || "ryvix-automation");
      return NextResponse.json({
        success: true,
        keypair,
      });
    }

    // Action F: AI Connection Error Diagnosis & Step-by-Step Fixes
    if (action === "diagnose_access_error") {
      const diagnosis = ServerAccessManager.diagnoseAccessError(
        params?.accessType || "SSH_CREDENTIAL",
        params?.errorOutput || "",
        params?.context
      );
      return NextResponse.json({
        success: true,
        diagnosis,
      });
    }

    // Action G: Classify Server Archetype & Active Internal Modules
    if (action === "inspect_server_archetype_modules") {
      const features = ServerClassifier.classify(params || {});
      return NextResponse.json({
        success: true,
        features,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process server action" },
      { status: 500 }
    );
  }
}
