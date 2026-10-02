import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { serverTelemetry } from '../web/utils/server-telemetry';
import { SystemTopologyGraph } from '../ai/src/graph-rag';
export async function testDiagnosticContext() {
  let queries = 0, fail = false, hasDeployment = false;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/diagnostic-context.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require(name: string) {
    if (name === 'server-only') return {};
    if (name.endsWith('/graph-rag')) return {SystemTopologyGraph};
    if (name === './server-telemetry') return { serverTelemetry };
    if (name === './direct-db') return { queryDirectDb: async (sql: string, args: string[]) => {
      queries++;
      assert.match(sql, /p.organization_id=\$1/); assert.match(sql, /m.user_id=\$2/);
      assert.equal(args.join(','), 'verified-org,verified-user');
      assert.doesNotMatch(sql, /SELECT\s+\*\s+FROM\s+(?:vault|connector_credentials)/i);
      if (fail) throw new Error('Database unavailable');
      if (hasDeployment && sql.includes('FROM deployment_events')) return [{ state: 'success', commit_sha: 'a'.repeat(40) }];
      return [];
    } };
    throw new Error(name);
  } });
  const result = await exports.diagnosticContext('verified-org', 'verified-user');
  assert.equal(queries, 8); assert.equal(result.servers.length, 0);
  assert.equal(result.topology.relationships.length,0,'No seeded topology enters tenant context');
  assert.equal(result.deployments.recordsAvailable, false);
  hasDeployment = true;
  const observed = await exports.diagnosticContext('verified-org', 'verified-user');
  assert.equal(observed.deployments.recordsAvailable, true);
  assert.equal(observed.deployments.records[0].state, 'success');
  assert.equal(observed.deployments.runtimeHealthVerified, false, 'Provider success cannot certify application health');
  fail = true;
  await assert.rejects(() => exports.diagnosticContext('verified-org', 'verified-user'));
}
