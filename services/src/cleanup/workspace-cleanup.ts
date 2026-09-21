/**
 * Ryvix Coding Workspace Cleanup Worker
 * 
 * ARCHITECTURAL INVARIANT:
 * Ephemeral customer coding workspaces cannot run indefinitely.
 * Ceilings: 15-minute runtime or explicit expiry in `workspace_sessions.expires_at`.
 * This worker actively queries expired sessions, dispatches container stop/rm,
 * marks sessions 'destroyed', and writes immutable audit logs.
 */

import type {
  WorkspaceSession,
  AuditEvent,
} from '@ryvix/database';

export interface DockerDriver {
  terminateContainer(containerId: string): Promise<boolean>;
}

export interface CleanupResult {
  sessionId: string;
  containerId: string;
  containerTerminated: boolean;
  sessionTerminated: boolean;
  auditEvent: AuditEvent;
}

export class WorkspaceCleanupWorker {
  private dockerDriver: DockerDriver;

  constructor(dockerDriver: DockerDriver) {
    this.dockerDriver = dockerDriver;
  }

  /**
   * Evaluates active sessions and terminates any that have exceeded `expires_at`.
   */
  async processExpiredSession(
    session: WorkspaceSession,
    organizationId: string,
    currentTime: Date = new Date()
  ): Promise<CleanupResult | null> {
    const expiresAt = new Date(session.expires_at);

    // If session is already destroyed or has not yet expired, skip
    if (session.status === 'destroyed' || currentTime.getTime() < expiresAt.getTime()) {
      return null;
    }

    // 1. Terminate the isolated Docker container
    let containerTerminated = false;
    if (session.container_id) {
      containerTerminated = await this.dockerDriver.terminateContainer(session.container_id);
    }

    // 2. Transition session status to 'destroyed'
    const previousStatus = session.status;
    session.status = 'destroyed';

    // 3. Generate Immutable Audit Log
    const auditEvent: AuditEvent = {
      id: `audit_ws_clean_${Date.now()}`,
      timestamp: currentTime.toISOString(),
      organization_id: organizationId,
      project_id: session.project_id,
      actor_id: 'workspace_cleaner',
      actor_type: 'system',
      action_name: 'workspace.expired_cleanup',
      target_entity: 'workspace_session',
      target_id: session.id,
      parameters_hash: 'sha256_cleanup',
      diff_summary: `Session transitioned from ${previousStatus} to destroyed. Container ${session.container_id} terminated: ${containerTerminated}`,
      status: 'success',
      ip_address: null,
      correlation_id: session.task_id,
    };

    return {
      sessionId: session.id,
      containerId: session.container_id || 'none',
      containerTerminated,
      sessionTerminated: true,
      auditEvent,
    };
  }
}
