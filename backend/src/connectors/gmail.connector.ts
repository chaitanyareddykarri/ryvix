/**
 * Ryvix Gmail Communication Connector
 * 
 * Implements the asynchronous communication channel specified in:
 * docs/integrations/GMAIL.md
 * 
 * KEY ARCHITECTURAL INVARIANTS:
 * 1. Transactional Separation: This connector is for operational/task notifications only.
 *    User authentication OTPs are NEVER delivered via personal/workspace Gmail.
 * 2. Credential Protection: Gmail OAuth tokens are managed strictly on the backend.
 *    Raw credentials or tokens are NEVER passed to the AI Model.
 * 3. Auditability: All inbound instructions and outbound alerts are logged to audit_events.
 */

import type { Task } from '@ryvix/database';

export interface InboundEmailPayload {
  messageId: string;
  threadId?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  bodyText: string;
  timestamp: string;
}

export interface OutboundDigestPayload {
  recipientEmail: string;
  recipientName?: string;
  projectId: string;
  taskTitle: string;
  taskSummary: string;
  status: Task['status'];
  diffUrl?: string;
  requiresApproval?: boolean;
}

export class GmailConnector {
  /**
   * Processes an inbound email from an authorized customer.
   * Resolves the sender to their Ryvix Profile and Organization, then enqueues a Task.
   */
  async processInboundEmail(payload: InboundEmailPayload): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }> {
    // Raw sender headers are not proof of identity. No verified Gmail transport
    // is configured here; do not resolve the first profile or enqueue any work.
    return { success: false, error: 'Verified Gmail OAuth delivery and project sender mapping are not configured.' };
  }

  /**
   * Generates a clean HTML email notification digest for completed tasks or approval requests.
   */
  generateDigestHtml(payload: OutboundDigestPayload): string {
    const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]!));
    let diffUrl = '';
    try { const url = new URL(payload.diffUrl || ''); if (url.protocol === 'https:' && !url.username && !url.password) diffUrl = escape(url.toString()); } catch {}
    const statusColor = payload.status === 'completed' ? '#10b981' : payload.status === 'failed' ? '#ef4444' : '#6366f1';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #030712; color: #f9fafb; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: rgba(99,102,241,0.15); color: ${statusColor}; border: 1px solid ${statusColor}; }
          h2 { margin-top: 16px; margin-bottom: 8px; font-size: 20px; font-weight: 700; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0 0 16px 0; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; }
          .footer { margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">${escape(payload.status)}</span>
          <h2>${escape(payload.taskTitle)}</h2>
          <p>${escape(payload.taskSummary)}</p>
          ${diffUrl ? `<p><a href="${diffUrl}" class="btn">View Unified Diff & Preview</a></p>` : ''}
          ${payload.requiresApproval ? `<p><strong>Action Required:</strong> Open Ryvix to review the changes and approve the action.</p>` : ''}
          <div class="footer">
            Ryvix Autonomous Software &amp; Infrastructure Operations Platform
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const gmailConnector = new GmailConnector();
