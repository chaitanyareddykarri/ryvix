import { requireTenant, RequestError } from '@/utils/tenant-context';
import { GET as serverSnapshot } from '../../servers/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const active = new Map<string, number>();

/** Browser SSE observes the existing signed ingestion/rollup pipeline. */
export async function GET(request: Request) {
  try {
    const { user, organizationId } = await requireTenant();
    const key = `${organizationId}:${user.id}`;
    if ((active.get(key) || 0) >= 4) return Response.json({ error: 'Too many telemetry streams.' }, { status: 429 });
    active.set(key, (active.get(key) || 0) + 1);
    let finished = false;
    let first = true;
    let wake: (() => void) | undefined;
    const expires = Date.now() + 55000;
    const encoder = new TextEncoder();
    const release = () => {
      if (finished) return;
      finished = true;
      const remaining = (active.get(key) || 1) - 1;
      if (remaining) active.set(key, remaining); else active.delete(key);
      wake?.();
      request.signal.removeEventListener('abort', release);
      clearTimeout(deadline);
    };
    const deadline = setTimeout(release, 55000);
    request.signal.addEventListener('abort', release, { once: true });
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          if (!first && !finished) await new Promise<void>(resolve => {
            const timer = setTimeout(done, 5000);
            function done() { clearTimeout(timer); wake = undefined; resolve(); }
            wake = done;
          });
          first = false;
          if (request.signal.aborted || finished || Date.now() >= expires) { release(); controller.close(); return; }
          // Revalidates session and membership on every read; query results never cross tenants.
          const response = await serverSnapshot();
          if (finished) { controller.close(); return; }
          if (!response.ok) {
            controller.enqueue(encoder.encode(`event: unavailable\ndata: ${JSON.stringify({ error: 'Telemetry unavailable. Reconnect after verifying access.' })}\n\n`));
            release(); controller.close(); return;
          }
          controller.enqueue(encoder.encode(`retry: 5000\nevent: telemetry\ndata: ${JSON.stringify(await response.json())}\n\n`));
        } catch {
          release(); controller.error(new Error('Telemetry stream unavailable.'));
        }
      },
      cancel() { release(); },
    }, { highWaterMark: 0 });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  } catch (error) {
    return Response.json({ error: error instanceof RequestError ? error.message : 'Telemetry stream unavailable.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
