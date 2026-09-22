import assert from 'node:assert/strict';
import { LocalSecurityEngine } from '../ai/src/local-security-engine';
import { DEEP_THREAT_DATABASE } from '../ai/src/deep-threat-knowledge';
import { neuralThreatClassifier, NEURAL_THREAT_CLASSES } from '../ai/src/neural-network';
import { brainDeliberativeReasoner } from '../ai/src/brain-deliberative-reasoner';
import { ryvixAgi } from '../ai/src/agi-core';

export async function testWebHttpsFolderInternalApiThreats(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 28: WEB, HTTPS, FOLDER BRUTE-FORCE & INTERNAL API AUTH');
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

  // -------------------------------------------------------------------------
  // 1. WEB & HTTPS INFRASTRUCTURE ATTACKS
  // -------------------------------------------------------------------------
  console.log('\n[1] Testing Web & HTTPS Infrastructure Attack Recognitions...');
  
  // A. HTTPS TLS Downgrade
  const tlsRes = LocalSecurityEngine.analyze({
    serverId: 'srv_web_01',
    hostname: 'edge-ingress-tls-01',
    metrics: { cpuPercent: 65, memPercent: 50, diskPercent: 20 },
    recentLogs: ['tls handshake downgrade attempt: client requested unsupported protocol version sslv3 with weak cipher suite 3des-ede-cbc-sha']
  });
  check(tlsRes.threatType === 'HTTPS_TLS_DOWNGRADE_ATTACK', 'Detected HTTPS TLS Downgrade Attack');
  check(tlsRes.remediationCommand.includes('ssl_protocols TLSv1.2 TLSv1.3'), 'Remediation enforces modern TLS 1.2/1.3 protocols');

  // B. SNI & Host Header Routing Mismatch
  const sniRes = LocalSecurityEngine.analyze({
    serverId: 'srv_web_02',
    hostname: 'edge-proxy-02',
    metrics: { cpuPercent: 55, memPercent: 45, diskPercent: 20 },
    recentLogs: ['virtual host routing ambiguity injection: sni and host header mismatch detected for target internal-admin.lan']
  });
  check(sniRes.threatType === 'SNI_HOST_HEADER_ROUTING_INJECTION', 'Detected SNI & Host Header Routing Mismatch Injection');

  // C. Insecure CORS Reflection
  const corsRes = LocalSecurityEngine.analyze({
    serverId: 'srv_api_01',
    hostname: 'public-api-01',
    metrics: { cpuPercent: 40, memPercent: 40, diskPercent: 15 },
    recentLogs: ['cors reflection of arbitrary origin with credentials detected: attacker.evil.com mirrored in Access-Control-Allow-Origin']
  });
  check(corsRes.threatType === 'CORS_MISCONFIG_CREDENTIAL_LEAK', 'Detected Insecure Dynamic CORS Reflection with Credentials');

  // D. HTTP Parameter Pollution (HPP)
  const hppRes = LocalSecurityEngine.analyze({
    serverId: 'srv_api_02',
    hostname: 'checkout-api-02',
    metrics: { cpuPercent: 70, memPercent: 50, diskPercent: 20 },
    recentLogs: ['http parameter pollution pattern detected: duplicate query parameter in single http request ?tenantId=101&tenantId=999']
  });
  check(hppRes.threatType === 'HTTP_PARAMETER_POLLUTION_HPP', 'Detected HTTP Parameter Pollution (HPP)');

  // -------------------------------------------------------------------------
  // 2. DIRECTORY, FOLDER & FILE SERVICE ATTACKS
  // -------------------------------------------------------------------------
  console.log('\n[2] Testing Directory Bruteforce, Folder Sweeps & Arbitrary Uploads...');

  // A. Directory & Folder Bruteforce (Gobuster / Feroxbuster)
  const dirRes = LocalSecurityEngine.analyze({
    serverId: 'srv_web_03',
    hostname: 'frontend-nginx-01',
    metrics: { cpuPercent: 88, memPercent: 70, diskPercent: 25 },
    recentLogs: [
      'rapid 404 scan hitting sensitive paths',
      'directory enumeration gobuster user-agent detected',
      'access attempt to /.env file detected from ip 198.51.100.42'
    ]
  });
  check(dirRes.threatType === 'DIRECTORY_BRUTEFORCE_DISCOVERY', 'Detected Directory Bruteforce & Forced Browsing (Gobuster/Feroxbuster)');
  check(dirRes.remediationCommand.includes('iptables') && dirRes.remediationCommand.includes('fail2ban'), 'Remediation applies netfilter IP drop and fail2ban jail');

  // B. Arbitrary File Upload Webshell
  const uploadRes = LocalSecurityEngine.analyze({
    serverId: 'srv_app_01',
    hostname: 'media-uploader-01',
    metrics: { cpuPercent: 75, memPercent: 60, diskPercent: 50 },
    recentLogs: ['file upload mime type spoofing detected: multipart/form-data with php extension in filename avatar.php.jpg in /uploads']
  });
  check(uploadRes.threatType === 'ARBITRARY_FILE_UPLOAD_WEBSHELL', 'Detected Arbitrary File Upload Leading to Web Shell');
  check(uploadRes.remediationCommand.includes('chmod -R a-x') || uploadRes.remediationCommand.includes('delete'), 'Remediation strips execution bits from uploads folder');

  // C. WebDAV PROPFIND & Arbitrary Write
  const davRes = LocalSecurityEngine.analyze({
    serverId: 'srv_web_04',
    hostname: 'docs-server-01',
    metrics: { cpuPercent: 45, memPercent: 40, diskPercent: 30 },
    recentLogs: ['unauthorized http put request to upload directory via webdav propfind method executed on web root']
  });
  check(davRes.threatType === 'WEBDAV_PROPFIND_ARBITRARY_WRITE', 'Detected WebDAV PROPFIND & Arbitrary HTTP Write');

  // -------------------------------------------------------------------------
  // 3. INTERNAL API & AUTHENTICATION BYPASS ATTACKS
  // -------------------------------------------------------------------------
  console.log('\n[3] Testing Internal API Gateway Bypass, BFLA & Auth Attacks...');

  // A. Internal API Header Spoofing Gateway Bypass
  const gatewayRes = LocalSecurityEngine.analyze({
    serverId: 'srv_gw_01',
    hostname: 'api-gateway-edge',
    metrics: { cpuPercent: 80, memPercent: 70, diskPercent: 20 },
    recentLogs: ['microservice gateway auth bypass attempt: x-internal-service header from external client detected on public ingress /api/v1/billing']
  });
  check(gatewayRes.threatType === 'INTERNAL_API_AUTH_HEADER_BYPASS', 'Detected Internal API Auth Header Gateway Bypass');
  check(gatewayRes.severity === 'critical', 'Classified internal auth gateway bypass as CRITICAL');

  // B. Broken Function Level Authorization (BFLA)
  const bflaRes = LocalSecurityEngine.analyze({
    serverId: 'srv_mgmt_01',
    hostname: 'tenant-mgmt-01',
    metrics: { cpuPercent: 50, memPercent: 60, diskPercent: 20 },
    recentLogs: ['bfla violation non-admin accessed administrative api: unauthorized role escalation on internal endpoint /api/internal/tenants/purge']
  });
  check(bflaRes.threatType === 'INTERNAL_API_BFLA_ADMIN_TAKEOVER', 'Detected Broken Function Level Authorization (BFLA) on Internal APIs');

  // C. SSRF Cloud Metadata Exfiltration
  const ssrfRes = LocalSecurityEngine.analyze({
    serverId: 'srv_worker_01',
    hostname: 'pdf-converter-01',
    metrics: { cpuPercent: 85, memPercent: 65, diskPercent: 30 },
    recentLogs: ['ssrf attempt to 169.254.169.254 detected: request to /latest/meta-data/iam/security-credentials via webhook url parameter']
  });
  check(ssrfRes.threatType === 'SSRF_CLOUD_METADATA_EXFIL', 'Detected SSRF Cloud Instance Metadata Exfiltration');
  check(ssrfRes.remediationCommand.includes('169.254.169.254 -j DROP'), 'Remediation blocks outbound traffic to 169.254.169.254');

  // D. Credential Stuffing & HTTP Login Brute Force
  const bruteRes = LocalSecurityEngine.analyze({
    serverId: 'srv_auth_01',
    hostname: 'auth-idp-01',
    metrics: { cpuPercent: 95, memPercent: 80, diskPercent: 20 },
    recentLogs: ['credential stuffing burst detected: high frequency failed logins on /api/auth across 400 user accounts']
  });
  check(bruteRes.threatType === 'CREDENTIAL_STUFFING_HTTP_BRUTE', 'Detected Distributed Credential Stuffing & HTTP Login Brute Force');

  // E. Mass Assignment Entity Over-Posting
  const massRes = LocalSecurityEngine.analyze({
    serverId: 'srv_user_01',
    hostname: 'user-profile-01',
    metrics: { cpuPercent: 40, memPercent: 45, diskPercent: 20 },
    recentLogs: ['mass assignment detected: unpermitted isAdmin attribute submitted in client profile update payload']
  });
  check(massRes.threatType === 'MASS_ASSIGNMENT_ROLE_OVERPOSTING', 'Detected Mass Assignment & Entity Role Over-Posting');

  // F. Session Fixation
  const sessRes = LocalSecurityEngine.analyze({
    serverId: 'srv_auth_02',
    hostname: 'auth-session-01',
    metrics: { cpuPercent: 50, memPercent: 50, diskPercent: 20 },
    recentLogs: ['session id unchanged across privilege boundary: pre-authentication session token reused in post-auth request']
  });
  check(sessRes.threatType === 'SESSION_FIXATION_HIJACKING', 'Detected Session Fixation & Pre-Auth Cookie Hijacking');

  // G. API Key Query Parameter Leakage
  const keyLeakRes = LocalSecurityEngine.analyze({
    serverId: 'srv_web_05',
    hostname: 'public-cdn-01',
    metrics: { cpuPercent: 30, memPercent: 40, diskPercent: 15 },
    recentLogs: ['api key in query parameter in access log: bearer token exposed in uri path /api/data?api_key=sk_live_99818291829']
  });
  check(keyLeakRes.threatType === 'API_KEY_LEAKAGE_QUERY_PARAM', 'Detected API Key Exposure in URL Query Parameters');

  // H. Subdomain Takeover Dangling CNAME
  const dnsRes = LocalSecurityEngine.analyze({
    serverId: 'srv_dns_01',
    hostname: 'dns-zone-01',
    metrics: { cpuPercent: 30, memPercent: 30, diskPercent: 10 },
    recentLogs: ['dangling cname record pointing to unclaimed cloud bucket: unclaimed s3 bucket subdomain takeover signature for dev.ryvix.com']
  });
  check(dnsRes.threatType === 'SUBDOMAIN_TAKEOVER_DANGLING_CNAME', 'Detected Subdomain Takeover via Dangling DNS CNAME');

  // -------------------------------------------------------------------------
  // 4. NEURAL TENSOR EMBEDDING & ADAM BACKPROPAGATION CONVERGENCE
  // -------------------------------------------------------------------------
  console.log('\n[4] Testing Neural Network Backpropagation on Web/Internal API Classes...');
  check(NEURAL_THREAT_CLASSES.length >= 90, `Neural Network covers >=90 classes (actual: ${NEURAL_THREAT_CLASSES.length})`);
  
  const testClasses = [
    'DIRECTORY_BRUTEFORCE_DISCOVERY',
    'INTERNAL_API_AUTH_HEADER_BYPASS',
    'SSRF_CLOUD_METADATA_EXFIL',
    'HTTPS_TLS_DOWNGRADE_ATTACK',
    'CREDENTIAL_STUFFING_HTTP_BRUTE'
  ];

  for (const tc of testClasses) {
    const dummyVec = new Float32Array(64);
    dummyVec[0] = 0.9;
    dummyVec[1] = 0.85;
    dummyVec[20] = 0.7;

    const initLoss = neuralThreatClassifier.trainSample(dummyVec, tc, 0.05);
    let finalLoss = initLoss;
    for (let step = 0; step < 15; step++) {
      finalLoss = neuralThreatClassifier.trainSample(dummyVec, tc, 0.05);
    }
    check(finalLoss < initLoss, `Adam backpropagation converged on '${tc}' (Loss: ${initLoss.toFixed(4)} -> ${finalLoss.toFixed(4)})`);
  }

  // -------------------------------------------------------------------------
  // 5. DEEP AGI & DUAL-PROCESS DELIBERATION ON INTERNAL API AUTH BYPASS
  // -------------------------------------------------------------------------
  console.log('\n[5] Testing Top-Level AGI & Human-Brain Deliberation on Internal API Auth Bypass...');
  const ooda = await ryvixAgi.executeOodaCycle({
    source: 'api_gateway_waf',
    rawObservation: 'CRITICAL ALERT: microservice gateway auth bypass attempt: x-internal-service header from external client detected on public ingress /api/v1/tenants/purge',
    environmentContext: {
      clientIp: '198.51.100.88',
      threatLevel: 'critical',
      service: 'api-gateway'
    }
  });

  check(ooda.orient.primaryDomain === 'security_defense', 'AGI oriented to security_defense');
  check(ooda.deliberativeThoughtReport !== undefined, 'Embedded full deliberative thought report in OODA cycle');
  check(ooda.displayThoughtStream !== undefined && ooda.displayThoughtStream.length > 50, 'Synthesized formatted visual thought stream');
  check(ooda.decide.safeguardsEnforced === true, 'Enforced containment safeguards on critical internal auth threat');
  check(ooda.act.actionsExecuted.length > 0, 'Dispatched containment actions');

  console.log(`\nAll ${total}/${total} Web, HTTPS, Folder & Internal API Threat assertions PASSED!`);
  return true;
}

if (require.main === module) {
  testWebHttpsFolderInternalApiThreats().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
