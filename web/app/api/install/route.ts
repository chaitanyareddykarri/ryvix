import { agentInstallScript } from '../../../../backend/src/services/agent-installer';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return new Response(agentInstallScript(), { headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return Response.json({ error: 'A versioned, integrity-verified agent release is not configured.' }, { status: 503 });
  }
}
