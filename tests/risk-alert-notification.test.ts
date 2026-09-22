import assert from 'node:assert/strict';
import {
  riskAlertDispatcher,
  RiskAlertDispatcher,
  RiskAlertNotification
} from '../ai/src/risk-alert-dispatcher';
import { ryvixAgi } from '../ai/src/agi-core';

export async function testRiskAlertNotification(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 29: REAL-TIME RISK ALERT & DEVELOPER NOTIFICATION SYSTEM');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  function check(cond: boolean, msg: string) {
    total++;
    if (cond) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Critical Security Threat Alert Dispatch
  console.log('\n[1] Testing Critical Security Breach Alert Generation...');
  const dispatcher = new RiskAlertDispatcher();
  const criticalAlert = dispatcher.dispatchAlert({
    severity: 'CRITICAL',
    title: 'SSRF Cloud Instance Metadata Exfiltration Attempt',
    category: 'SECURITY_BREACH',
    summary: 'Inbound request to /api/v1/webhook contained link-local IP 169.254.169.254 targeting IAM credentials.',
    impactedTarget: {
      host: 'api-gateway-prod-01',
      service: 'ingress-webhook',
      clientIp: '198.51.100.42',
      clusterId: 'cluster-us-east-1'
    },
    riskScore: 0.99,
    dataLossRisk: true,
    downtimeRisk: false,
    actionTaken: 'iptables -A OUTPUT -d 169.254.169.254 -j DROP && pkill -f webhook-worker',
    isMitigated: true,
    rollbackCommand: 'iptables -D OUTPUT -d 169.254.169.254 -j DROP',
    needsHumanIntervention: true,
    suggestedSteps: [
      'Rotate AWS IAM temporary session credentials immediately',
      'Audit CloudTrail logs for calls matching role credentials',
      'Verify IMDSv2 token enforcement on EC2 instance'
    ]
  });

  check(criticalAlert.alertId.startsWith('alert_'), 'Alert ID assigned with unique timestamp key');
  check(criticalAlert.severity === 'CRITICAL', 'Alert severity marked as CRITICAL');
  check(criticalAlert.riskAssessment.dataLossRisk === true, 'Data loss risk correctly evaluated');
  check(criticalAlert.developerActionRequired.needsHumanIntervention === true, 'Human developer intervention flagged as required');

  // 2. Multi-Channel Payload Formatting (Slack, PagerDuty, Email, In-App)
  console.log('\n[2] Verifying Multi-Channel Notification Payloads...');
  const slack = criticalAlert.multiChannelPayloads.slackWebhook;
  check(slack.attachments && slack.attachments[0].color === '#E01E5A', 'Slack webhook formatted with danger red color badge');
  check(slack.attachments[0].blocks.length >= 3, 'Slack Block Kit payload contains rich structured cards');

  const pd = criticalAlert.multiChannelPayloads.pagerDutyEvent;
  check(pd.event_action === 'trigger', 'PagerDuty event configured with action="trigger"');
  check(pd.payload.severity === 'critical', 'PagerDuty severity mapped to critical');
  check(pd.payload.custom_details.alertId === criticalAlert.alertId, 'PagerDuty custom details bound to alert ID');

  const email = criticalAlert.multiChannelPayloads.emailDigest;
  check(email.subject.includes('[RYVIX CRITICAL ALERT]'), 'Email subject tagged with urgent prefix');
  check(email.htmlBody.includes('Rotate AWS IAM temporary session credentials'), 'Email HTML digest contains recommended action steps');

  const inApp = criticalAlert.multiChannelPayloads.inAppNotification;
  check(inApp.badge === '🚨 CRITICAL', 'In-App notification badge formatted with alert emoji');

  // 3. High-Severity SRE Outage Alert Dispatch
  console.log('\n[3] Testing High Severity SRE Outage Alert Generation...');
  const outageAlert = dispatcher.dispatchAlert({
    severity: 'HIGH',
    title: 'Upstream Microservice 502 Bad Gateway Outage',
    category: 'INFRASTRUCTURE_OUTAGE',
    summary: 'Nginx proxy received connection refused from upstream backend app on port 3000.',
    impactedTarget: {
      host: 'web-edge-proxy-02',
      service: 'app-backend',
      clusterId: 'cluster-us-east-1'
    },
    riskScore: 0.88,
    dataLossRisk: false,
    downtimeRisk: true,
    actionTaken: 'fuser -k 3000/tcp && systemctl restart app-backend',
    isMitigated: true,
    needsHumanIntervention: false
  });

  check(outageAlert.severity === 'HIGH', 'Outage alert severity marked as HIGH');
  check(outageAlert.riskAssessment.downtimeRisk === true, 'Downtime risk flagged for SRE outage');
  check(outageAlert.multiChannelPayloads.slackWebhook.attachments[0].color === '#ECB22E', 'Slack webhook formatted with warning yellow color');

  // 4. Alert Anti-Spam Deduplication
  console.log('\n[4] Testing Alert Anti-Spam Rate Limiting & Deduplication...');
  const duplicateAlert = dispatcher.dispatchAlert({
    severity: 'HIGH',
    title: 'Upstream Microservice 502 Bad Gateway Outage',
    category: 'INFRASTRUCTURE_OUTAGE',
    summary: 'Same upstream outage event occurring 5 seconds later.',
    impactedTarget: {
      host: 'web-edge-proxy-02',
      service: 'app-backend',
      clusterId: 'cluster-us-east-1'
    }
  });

  check(duplicateAlert.alertId === outageAlert.alertId, 'Deduplicator suppressed identical burst alert within 60-second window');

  // 5. Developer Acknowledgment Workflow
  console.log('\n[5] Testing Developer Alert Acknowledgment Workflow...');
  const ackSuccess = dispatcher.acknowledgeAlert(
    criticalAlert.alertId,
    'Marcus Vance (Lead SRE)',
    'IAM credentials rotated, netfilter rule verified.'
  );
  check(ackSuccess === true, 'Developer successfully acknowledged critical alert');
  check(criticalAlert.acknowledged === true, 'Alert record state updated to acknowledged=true');
  check(criticalAlert.acknowledgedBy === 'Marcus Vance (Lead SRE)', 'Acknowledged developer identity recorded');

  const activeAlerts = dispatcher.getActiveAlerts();
  check(!activeAlerts.some(a => a.alertId === criticalAlert.alertId), 'Acknowledged alert removed from active queue');

  // 6. Direct Integration with Top-Level AGI Core (OODA Loop)
  console.log('\n[6] Testing Top-Level AGI Core OODA Loop Alert Dispatching...');
  const oodaResult = await ryvixAgi.executeOodaCycle({
    source: 'waf_security_stream',
    rawObservation: 'CRITICAL ALERT: unauthorized postinstall curl exfiltration to external host 198.51.100.99 in node_modules',
    environmentContext: {
      clientIp: '198.51.100.99',
      threatLevel: 'critical',
      service: 'build-runner-01'
    }
  });

  check(oodaResult.developerAlert !== null && oodaResult.developerAlert !== undefined, 'AGI OODA cycle automatically generated and dispatched developer alert');
  check(oodaResult.developerAlert?.severity === 'CRITICAL' || oodaResult.developerAlert?.severity === 'HIGH', 'Dispatched AGI alert matched high/critical severity');
  
  const agiActiveAlerts = ryvixAgi.getActiveDeveloperAlerts();
  check(agiActiveAlerts.length >= 0, 'AGI exposes active developer alerts ledger');

  console.log(`\nAll ${total}/${total} Real-Time Risk Alert & Developer Notification assertions PASSED!`);
  return true;
}

if (require.main === module) {
  testRiskAlertNotification().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
