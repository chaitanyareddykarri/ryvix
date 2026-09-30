import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export async function testTelemetryStream() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false, reads = 0;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/telemetry/stream/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Response, ReadableStream, TextEncoder, setTimeout, clearTimeout,
    require(name: string) {
      if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
        if (denied) throw new RequestError('Authentication required.', 401);
        return { user: { id: 'test-user' }, organizationId: 'test-org' };
      } };
      if (name === '../../servers/route') return { GET: async () => { reads++; return Response.json({ success: true, servers: [] }); } };
      throw new Error(name);
    } });
  denied = true;
  assert.equal((await exports.GET(new Request('https://example.test'))).status, 401);
  assert.equal(reads, 0);
  denied = false;
  const streams = [];
  try {
    for (let i = 0; i < 4; i++) streams.push(await exports.GET(new Request('https://example.test')));
    assert.equal((await exports.GET(new Request('https://example.test'))).status, 429);
    assert.equal(reads, 0, 'Backpressure must prevent work before a stream is read');
    const reader = streams[0].body.getReader();
    const chunk = await reader.read();
    assert.match(new TextDecoder().decode(chunk.value), /event: telemetry/);
    assert.equal(reads, 1);
    await reader.cancel();
    reader.releaseLock();
  } finally { for (const stream of streams) await stream.body.cancel(); }
  const replacement = await exports.GET(new Request('https://example.test'));
  assert.equal(replacement.status, 200, 'Cancelled streams release their limit');
  await replacement.body.cancel();
}
