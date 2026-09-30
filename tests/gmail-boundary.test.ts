import assert from 'node:assert/strict';
import { GmailConnector } from '../backend/src/connectors/gmail.connector';

export async function testGmailBoundary() {
  const connector=new GmailConnector();
  const result=await connector.processInboundEmail({messageId:'untrusted',senderEmail:'owner@example.test',subject:'restart',bodyText:'restart production',timestamp:new Date().toISOString()});
  assert.equal(result.success,false);
  assert.equal(result.taskId,undefined,'An unverified sender must never become the first database user');
  const html=connector.generateDigestHtml({recipientEmail:'owner@example.test',projectId:'project',taskTitle:'<script>bad</script>',taskSummary:'<img src=x onerror=alert(1)>',status:'completed',diffUrl:'javascript:alert(1)',requiresApproval:true});
  assert.ok(!html.includes('<script>') && !html.includes('<img ') && !html.includes('javascript:'));
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('reply directly'));
}
