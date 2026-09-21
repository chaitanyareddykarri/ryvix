import assert from 'node:assert/strict';
import { WorkspaceCleanupWorker } from '../services/src/cleanup/workspace-cleanup';
import type { WorkspaceSession } from '@ryvix/database';

export async function testWorkspaceCleanupFlow() {
  console.log('[TEST] Running Coding Workspace Expiry & Container Cleanup Test...');

  let terminatedContainerId: string | null = null;
  const mockDockerDriver = {
    terminateContainer: async (containerId: string) => {
      terminatedContainerId = containerId;
      return true;
    },
  };

  const worker = new WorkspaceCleanupWorker(mockDockerDriver);
  const now = new Date('2026-09-21T14:00:00Z');

  // Case 1: Active session that has NOT expired
  const activeSession: WorkspaceSession = {
    id: 'ws_session_active',
    task_id: 'task_code_fix',
    project_id: 'proj_ecommerce',
    profile_id: 'prof_nextjs',
    container_id: 'docker_cont_active_99',
    status: 'active',
    preview_url: 'http://localhost:3000',
    preview_port: 3000,
    allocated_cpu: 2,
    allocated_ram_mb: 4096,
    created_at: new Date('2026-09-21T13:50:00Z').toISOString(),
    expires_at: new Date('2026-09-21T14:05:00Z').toISOString(), // 5 min in future
  };

  const activeResult = await worker.processExpiredSession(activeSession, 'org_acme', now);
  assert.equal(activeResult, null, 'Active unexpired session should not be processed');
  assert.equal(activeSession.status, 'active', 'Session should remain active');
  assert.equal(terminatedContainerId, null, 'Container should not be terminated');

  // Case 2: Session that HAS expired (15m ceiling exceeded)
  const expiredSession: WorkspaceSession = {
    id: 'ws_session_expired',
    task_id: 'task_code_fix',
    project_id: 'proj_ecommerce',
    profile_id: 'prof_nextjs',
    container_id: 'docker_cont_expired_42',
    status: 'active',
    preview_url: 'http://localhost:3000',
    preview_port: 3000,
    allocated_cpu: 2,
    allocated_ram_mb: 4096,
    created_at: new Date('2026-09-21T13:30:00Z').toISOString(),
    expires_at: new Date('2026-09-21T13:45:00Z').toISOString(), // 15 min in past
  };

  const cleanupResult = await worker.processExpiredSession(expiredSession, 'org_acme', now);
  assert.ok(cleanupResult, 'Expired session must return cleanup result');
  assert.equal(terminatedContainerId, 'docker_cont_expired_42', 'Docker container termination command must be dispatched');
  assert.equal(expiredSession.status, 'destroyed', 'Session status must transition to destroyed');
  assert.equal(cleanupResult.auditEvent.action_name, 'workspace.expired_cleanup');
  assert.equal(cleanupResult.auditEvent.status, 'success');

  console.log('✓ Coding Workspace Expiry & Container Cleanup Test PASSED (expiry check, container kill, session destroyed, audit log).');
}
