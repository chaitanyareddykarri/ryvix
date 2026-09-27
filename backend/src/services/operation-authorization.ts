/** Supplied by trusted backend code after tenant/role and persisted approval checks. */
export interface OperationAuthorization {
  actorId: string;
  approvalId: string;
  recordAudit: (event: { action: string; target: string; status: 'requested' | 'success' | 'failure'; detail?: string }) => Promise<void>;
}
export function requireAuthorization(auth?: OperationAuthorization): asserts auth is OperationAuthorization {
  if (!auth?.actorId || !auth.approvalId || typeof auth.recordAudit !== 'function') {
    throw new Error('Verified approval and audit writer are required');
  }
}
