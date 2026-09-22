import assert from 'node:assert/strict';
import {
  customerHealthQueryAgent,
  type HealthAgentResponse,
} from '../ai/src/customer-health-query-agent';
import {
  customerHealthStore,
  type HealthQuerySecurityContext,
} from '../services/src/health-query-tools';

export async function testCustomerServerHealthAgent() {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 34: RYVIX CUSTOMER SERVER & WEBSITE HEALTH QUERY AGENT');
  console.log('======================================================================\n');

  const validContext: HealthQuerySecurityContext = {
    userId: 'usr_admin_01',
    organizationId: 'org_ryvix_demo',
    userRole: 'admin',
    sourceChannel: 'web',
  };

  const rogueContext: HealthQuerySecurityContext = {
    userId: 'usr_hacker_99',
    organizationId: 'org_malicious_tenant',
    userRole: 'viewer',
    sourceChannel: 'web',
  };

  // -------------------------------------------------------------------------
  // [1] Healthy Server Query
  // -------------------------------------------------------------------------
  console.log('[1] Testing Healthy Server Query...');
  const res1 = await customerHealthQueryAgent.handleHealthQuery('How is srv_prod_01?', validContext);
  assert.strictEqual(res1.domain, 'SERVER_HEALTH', 'Domain must be SERVER_HEALTH');
  assert.strictEqual(res1.isOutOfScope, false, 'Must not be out of scope');
  assert.ok(res1.response.includes('Server: srv_prod_01'), 'Must format server ID');
  assert.ok(res1.response.includes('Status: Healthy'), 'Must report healthy status');
  assert.ok(res1.response.includes('CPU: 31%'), 'Must report CPU 31%');
  assert.ok(res1.response.includes('Memory: 54%'), 'Must report Memory 54%');
  assert.ok(res1.response.includes('Disk: 61%'), 'Must report Disk 61%');
  assert.ok(res1.response.includes('Uptime: 6d 14h'), 'Must report Uptime 6d 14h');
  assert.strictEqual(res1.isStale, false, 'Telemetry must be fresh');
  console.log('  ✓ Healthy server query passed with concise format.');

  // -------------------------------------------------------------------------
  // [2] Unhealthy / Degraded Server Query
  // -------------------------------------------------------------------------
  console.log('[2] Testing Unhealthy / Overloaded Server Query...');
  const res2 = await customerHealthQueryAgent.handleHealthQuery('Check srv_prod_02', validContext);
  assert.ok(res2.response.includes('CPU: 94%'), 'Must report high CPU 94%');
  assert.ok(res2.response.includes('Memory: 89%'), 'Must report high Memory 89%');
  assert.ok(res2.response.includes('Status: Degraded'), 'Must report degraded status');
  console.log('  ✓ Unhealthy server query passed with accurate metrics.');

  // -------------------------------------------------------------------------
  // [3] Stale Telemetry Warning
  // -------------------------------------------------------------------------
  console.log('[3] Testing Stale Telemetry Handling (> 2 mins old)...');
  const res3 = await customerHealthQueryAgent.handleHealthQuery('Check srv_prod_stale', validContext);
  assert.strictEqual(res3.isStale, true, 'Must flag telemetry as stale');
  assert.ok(
    res3.response.includes('The latest telemetry available is 45 minutes old') ||
    res3.response.includes("cannot confirm the server's current state"),
    'Must refuse to present stale data as current'
  );
  console.log('  ✓ Stale telemetry correctly flagged and warned.');

  // -------------------------------------------------------------------------
  // [4] Connector Offline Handling (Distinguished from Total Server Down)
  // -------------------------------------------------------------------------
  console.log('[4] Testing Connector Offline vs Server Down Distinction...');
  const res4 = await customerHealthQueryAgent.handleHealthQuery('How is srv_conn_down_site_up?', validContext);
  assert.strictEqual(res4.connectorOffline, true, 'Must identify connector as offline');
  assert.ok(res4.response.includes('Connector: OFFLINE'), 'Must state connector is offline');
  console.log('  ✓ Connector offline identified.');

  // -------------------------------------------------------------------------
  // [5] External Probe Healthy While Connector Offline
  // -------------------------------------------------------------------------
  console.log('[5] Testing External Probe Healthy While Connector Offline...');
  assert.strictEqual(res4.externalProbeOk, true, 'Must verify external probe is OK');
  assert.ok(
    res4.response.includes('The connector is currently unavailable, but the website is still responding to the external health probe.'),
    'Must explicitly state website is still responding despite connector failure'
  );
  console.log('  ✓ External probe success correctly prevents false server down alarm.');

  // -------------------------------------------------------------------------
  // [6] Website Down / 502 Error Explanation
  // -------------------------------------------------------------------------
  console.log('[6] Testing Website Down & 502 Error Explanation...');
  const res6 = await customerHealthQueryAgent.handleHealthQuery('Why is api.down-site.com throwing 502 errors?', validContext);
  assert.strictEqual(res6.domain, 'WEBSITE_HEALTH', 'Domain must be WEBSITE_HEALTH');
  assert.ok(res6.response.includes('[OBSERVED FACTS]'), 'Must include [OBSERVED FACTS]');
  assert.ok(res6.response.includes('[POSSIBLE CAUSE / INFERENCE]'), 'Must include [POSSIBLE CAUSE / INFERENCE]');
  assert.ok(res6.response.includes('[UNKNOWN DATA]'), 'Must include [UNKNOWN DATA]');
  assert.ok(res6.observedFacts.some(f => f.includes('502')), 'Facts must note HTTP 502');
  console.log('  ✓ Website 502 explained with strict fact vs inference separation.');

  // -------------------------------------------------------------------------
  // [7] Port Availability Check
  // -------------------------------------------------------------------------
  console.log('[7] Testing Port Availability (Open vs Closed)...');
  const res7Open = await customerHealthQueryAgent.handleHealthQuery('Is port 3000 open on srv_prod_01?', validContext);
  assert.strictEqual(res7Open.domain, 'PORT_CONNECTIVITY', 'Domain must be PORT_CONNECTIVITY');
  assert.ok(res7Open.response.includes('Port 3000 is OPEN'), 'Must report port 3000 open');
  assert.ok(res7Open.response.includes('node-app'), 'Must report bound service node-app');

  const res7Closed = await customerHealthQueryAgent.handleHealthQuery('Is port 9999 open on srv_prod_01?', validContext);
  assert.ok(res7Closed.response.includes('CLOSED or UNREACHABLE'), 'Must report port 9999 closed');
  console.log('  ✓ Port availability accurately diagnosed.');

  // -------------------------------------------------------------------------
  // [8] High CPU Utilization Detection
  // -------------------------------------------------------------------------
  console.log('[8] Testing High CPU Resource Query...');
  const res8 = await customerHealthQueryAgent.handleHealthQuery('Is my server under heavy load? Check CPU on srv_prod_02.', validContext);
  assert.ok(res8.observedFacts.some(f => f.includes('94%')), 'Observed facts must state CPU 94%');
  assert.ok(res8.inferences.some(i => i.includes('exceeding safe baseline')), 'Inference must note baseline exceeded');
  console.log('  ✓ High CPU condition diagnosed.');

  // -------------------------------------------------------------------------
  // [9] High Memory Pressure
  // -------------------------------------------------------------------------
  console.log('[9] Testing Memory Pressure Analysis...');
  const res9 = await customerHealthQueryAgent.handleHealthQuery('Check memory on srv_prod_02.', validContext);
  assert.ok(res9.observedFacts.some(f => f.includes('89%')), 'Observed facts must report RAM 89%');
  console.log('  ✓ High memory pressure verified.');

  // -------------------------------------------------------------------------
  // [10] Disk Storage Pressure
  // -------------------------------------------------------------------------
  console.log('[10] Testing Disk Storage Pressure...');
  const res10 = await customerHealthQueryAgent.handleHealthQuery('Check disk usage on srv_prod_02.', validContext);
  assert.ok(res10.observedFacts.some(f => f.includes('88%')), 'Observed facts must report Disk 88%');
  console.log('  ✓ Disk pressure verified.');

  // -------------------------------------------------------------------------
  // [11] Recent Deployment Successful
  // -------------------------------------------------------------------------
  console.log('[11] Testing Successful Deployment Query...');
  const res11 = await customerHealthQueryAgent.handleHealthQuery('Did my latest GitHub deployment succeed?', validContext);
  assert.strictEqual(res11.domain, 'DEPLOYMENT', 'Domain must be DEPLOYMENT');
  assert.ok(res11.response.includes('Status: Successful'), 'Must report status successful');
  assert.ok(res11.response.includes('Commit: abc1234'), 'Must report commit SHA');
  assert.ok(res11.response.includes('Branch: main'), 'Must report branch main');
  assert.ok(res11.response.includes('Runtime health: Healthy'), 'Must report runtime health');
  console.log('  ✓ Successful deployment query verified.');

  // -------------------------------------------------------------------------
  // [12] Deployment Failed
  // -------------------------------------------------------------------------
  console.log('[12] Testing Failed Deployment Query...');
  const res12 = await customerHealthQueryAgent.handleHealthQuery('What happened to my last backend deployment?', validContext);
  assert.ok(res12.response.includes('Deployment Status: FAILED'), 'Must report deployment failed');
  assert.ok(res12.response.includes('badc0de'), 'Must report failing commit badc0de');
  assert.ok(res12.response.includes('EADDRINUSE :::3000'), 'Must report container error details');
  assert.ok(res12.response.includes('Rollback Candidate Available: YES'), 'Must report rollback availability');
  console.log('  ✓ Deployment failure and rollback availability verified.');

  // -------------------------------------------------------------------------
  // [13] Recent Application Errors / Log Analysis
  // -------------------------------------------------------------------------
  console.log('[13] Testing Application Error Log Analysis...');
  const res13 = await customerHealthQueryAgent.handleHealthQuery('Show me the latest server errors on srv_prod_02.', validContext);
  assert.strictEqual(res13.domain, 'LOGS_ERRORS', 'Domain must be LOGS_ERRORS');
  assert.ok(res13.observedFacts.some(f => f.includes('Connection timeout')), 'Must report connection timeout log');
  assert.ok(res13.observedFacts.some(f => f.includes('High CPU alert')), 'Must report high CPU log');
  console.log('  ✓ Server logs analyzed with facts vs inferences.');

  // -------------------------------------------------------------------------
  // [14] Historical Incident Query
  // -------------------------------------------------------------------------
  console.log('[14] Testing Historical Incident Query...');
  const res14 = await customerHealthQueryAgent.handleHealthQuery('What happened during the last incident on srv_prod_01?', validContext);
  assert.strictEqual(res14.domain, 'INCIDENT_STATUS', 'Domain must be INCIDENT_STATUS');
  assert.ok(res14.observedFacts.some(f => f.includes('inc_20260920_01')), 'Must find incident ID');
  assert.ok(res14.observedFacts.some(f => f.includes('somaxconn queue defaulted to 128')), 'Must find root cause');
  console.log('  ✓ Historical incident retrieved and analyzed.');

  // -------------------------------------------------------------------------
  // [15] Cross-Tenant Access Denial (Security Violation Attempt)
  // -------------------------------------------------------------------------
  console.log('[15] Testing Multi-Tenant Security (Cross-Tenant Access Denial)...');
  const res15 = await customerHealthQueryAgent.handleHealthQuery('Check srv_tenant_secret', validContext);
  assert.ok(
    res15.response.includes('Access denied') || res15.response.includes('not authorized'),
    'Must strictly reject cross-tenant telemetry access'
  );
  console.log('  ✓ Multi-tenant boundary successfully enforced (Cross-tenant access blocked).');

  // -------------------------------------------------------------------------
  // [16] Missing Telemetry
  // -------------------------------------------------------------------------
  console.log('[16] Testing Missing Telemetry Response...');
  const emptyContext: HealthQuerySecurityContext = {
    userId: 'usr_new_user',
    organizationId: 'org_brand_new_empty',
    userRole: 'admin',
  };
  const res16 = await customerHealthQueryAgent.handleHealthQuery('Which of my servers has the highest CPU usage?', emptyContext);
  assert.ok(
    res16.response.includes('no connected servers registered'),
    'Must clearly state that no servers are registered'
  );
  console.log('  ✓ Missing telemetry gracefully handled without hallucination.');

  // -------------------------------------------------------------------------
  // [17] Ambiguous Resource Name
  // -------------------------------------------------------------------------
  console.log('[17] Testing Ambiguous Server Query...');
  const res17 = await customerHealthQueryAgent.handleHealthQuery('Check server prod', validContext);
  assert.ok(
    res17.response.includes('Ambiguous server query') || res17.response.includes('Multiple servers matched'),
    'Must alert user of ambiguous matches'
  );
  console.log('  ✓ Ambiguous resource name detected and clarified.');

  // -------------------------------------------------------------------------
  // [18] Unknown Server ID
  // -------------------------------------------------------------------------
  console.log('[18] Testing Unknown Server Query...');
  const res18 = await customerHealthQueryAgent.handleHealthQuery('Check srv_non_existent_999', validContext);
  assert.ok(res18.response.includes('not found in your organization'), 'Must state server not found');
  console.log('  ✓ Unknown server ID handled cleanly.');

  // -------------------------------------------------------------------------
  // [19] Unauthorized Request (Missing Session)
  // -------------------------------------------------------------------------
  console.log('[19] Testing Unauthorized Request (Missing Session Context)...');
  const res19 = await customerHealthQueryAgent.handleHealthQuery('Check srv_prod_01', { userId: '', organizationId: '', userRole: 'viewer' });
  assert.ok(res19.response.includes('Access denied'), 'Must reject unauthenticated queries');
  console.log('  ✓ Missing session token rejected.');

  // -------------------------------------------------------------------------
  // [20] Out-of-Scope General Question (Guardrail Verification)
  // -------------------------------------------------------------------------
  console.log('[20] Testing Out-of-Scope General Questions...');
  const outOfScopeQueries = [
    'What is Python?',
    'Write me a poem about love',
    "What's today's weather in Tokyo?",
    'Explain quantum physics in detail',
    'Who is the president of the United States?',
    'Teach me mathematics',
  ];

  for (const q of outOfScopeQueries) {
    const res = await customerHealthQueryAgent.handleHealthQuery(q, validContext);
    assert.strictEqual(res.domain, 'OUT_OF_SCOPE', `"${q}" must be classified as OUT_OF_SCOPE`);
    assert.strictEqual(res.isOutOfScope, true, 'isOutOfScope must be true');
    assert.strictEqual(
      res.response,
      'I can help with your connected website, server, application, deployment, telemetry, logs, connectivity, and operational health.',
      'Must return standard concise scope guardrail message'
    );
  }
  console.log('  ✓ Out-of-scope queries strictly blocked by guardrail.');

  // -------------------------------------------------------------------------
  // [21] Security-Event Interpretation (Fact vs Inference)
  // -------------------------------------------------------------------------
  console.log('[21] Testing Security-Event Interpretation (Fact vs Inference)...');
  const res21 = await customerHealthQueryAgent.handleHealthQuery('Did the server show signs of brute-force activity on srv_prod_01?', validContext);
  assert.strictEqual(res21.domain, 'SECURITY_DIAGNOSTICS', 'Domain must be SECURITY_DIAGNOSTICS');
  assert.ok(
    res21.observedFacts.some(f => f.includes('183 repeated attempts') || f.includes('Failed password')),
    'Observed facts must note 183 repeated failed login attempts'
  );
  assert.ok(
    res21.inferences.some(i => i.includes('No confirmed attack was detected from the available telemetry') || i.includes('may indicate a distributed credential-stuffing')),
    'Inference must NOT claim confirmed attack without proof and distinguish interpretation'
  );
  console.log('  ✓ Security event interpretation correctly distinguishes observation from inference.');

  // -------------------------------------------------------------------------
  // [22] Action Request Routing (Section 14 Guardrail)
  // -------------------------------------------------------------------------
  console.log('[22] Testing Action Request Routing (Restart srv_prod_01)...');
  const res22 = await customerHealthQueryAgent.handleHealthQuery('Restart my server srv_prod_01', validContext);
  assert.strictEqual(res22.domain, 'ACTION_REQUEST', 'Domain must be ACTION_REQUEST');
  assert.strictEqual(res22.isActionRequest, true, 'isActionRequest must be true');
  assert.ok(res22.actionDetails, 'Must contain action details');
  assert.strictEqual(res22.actionDetails?.action, 'restart_server', 'Action must be restart_server');
  assert.strictEqual(res22.actionDetails?.requiresApproval, true, 'Action must require approval');
  assert.strictEqual(res22.actionDetails?.blastRadius, 'HIGH', 'Blast radius must be HIGH');
  assert.ok(
    res22.response.includes('Action Execution Gating Notice') &&
    res22.response.includes('Authorized Self-Healing & Operations Gateway'),
    'Must explain action gating and route through approval gateway'
  );
  console.log('  ✓ Action commands properly routed to approval system rather than executed as health query.');

  console.log('\n======================================================================');
  console.log(' TEST SUITE 34 PASSED: 22/22 SCENARIOS 100% VERIFIED!');
  console.log('======================================================================\n');
}
