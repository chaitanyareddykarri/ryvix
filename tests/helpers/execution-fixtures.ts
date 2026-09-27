import type { DockerRunner } from '../../services/src/workspace/docker-workspace.manager';
import type { CloudProviderAdapter } from '../../services/src/connector/cloud-provider.adapters';
import type { HypervisorProbeResult } from '../../services/src/connector/cloud-recovery.bridge';
import type { OperationAuthorization } from '../../backend/src/services/operation-authorization';

// Explicit unit-test dependencies. Production singletons never import these fixtures.
export const fakeDocker: DockerRunner = async () => ({ exitCode: 0, stdout: 'fixture command output', stderr: '' });
export const testApproval: OperationAuthorization = { actorId: 'test-user', approvalId: 'test-approval', recordAudit: async () => {} };
export const healthyProbe: HypervisorProbeResult = { provider: 'aws', instanceId: 'i-0123456789abcdef0', state: 'running', hypervisorResponsive: true,
  statusChecks: { systemCheck: 'ok', instanceCheck: 'ok' }, checkedAt: new Date(0).toISOString() };
export const fakeCloud: CloudProviderAdapter = {
  probe: async id => ({ ...healthyProbe, instanceId: id }),
  execute: async () => ({ id: 'provider-request-1', status: 'dispatched' }),
};
export const fakeGitHub: typeof fetch = async (input, init) => {
  const url = String(input);
  let data: unknown;
  if (url.endsWith('/pulls')) {
    const body = JSON.parse(String(init?.body));
    const target = url.split('/repos/')[1].replace('/pulls', '');
    data = { id: 123, number: 7, title: body.title, state: 'open', html_url: `https://github.com/${target}/pull/7`,
      created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString(), changed_files: 1, additions: 1, deletions: 0 };
  } else if (url.includes('/git/ref/')) data = { object: { sha: 'parent' } };
  else if (url.includes('/git/commits/') && init?.method === 'GET') data = { tree: { sha: 'base-tree' } };
  else if (url.includes('?recursive=1')) data = { truncated: false, tree: [] };
  else if (url.endsWith('/git/trees')) data = { sha: 'new-tree' };
  else if (url.endsWith('/git/commits')) data = { sha: 'new-commit' };
  else if (url.endsWith('/git/refs')) data = { ref: 'refs/heads/ryvix/test' };
  else throw new Error(`Unexpected fixture request: ${url}`);
  return new Response(JSON.stringify(data), { status: init?.method === 'POST' ? 201 : 200 });
};
