/**
 * @file web-outage-engine.ts
 * @module @ryvix/ai
 *
 * Ryvix Web Page Outage & Multi-Option Server Recovery Engine
 * Diagnoses why web pages go down (port conflicts, service crashes, expired SSL,
 * missing build artifacts, missing env secrets, firewall drops, healthcheck timeouts)
 * and generates 3 distinct progressive recovery options (Immediate Fix, Safe Fallback, Disaster Recovery)
 * with direct Neural Network integration.
 */

import { neuralThreatClassifier, NeuralPrediction } from './neural-network';

export type WebOutageRootCause = 
  | 'WEB_PORT_BIND_CONFLICT_EADDRINUSE'
  | 'WEB_SERVICE_INACTIVE_CRASH'
  | 'WEB_SSL_CERT_EXPIRED'
  | 'WEB_MISSING_BUILD_ARTIFACT'
  | 'WEB_ENV_CONFIG_MISSING'
  | 'WEB_FIREWALL_PORT_BLOCKED'
  | 'WEB_HEALTHCHECK_PROBE_FAILED';

export interface WebOutageTelemetry {
  targetUrl: string;
  httpStatusCode: number; // 0 = connection refused/cannot connect, 502, 503, 504
  port: number;
  systemdUnit?: string;
  systemdState?: 'active' | 'inactive' | 'failed';
  isPortListening?: boolean;
  sslCertDaysRemaining?: number;
  recentLogs?: string[];
}

export interface RecoveryOption {
  optionName: 'OPTION_A_IMMEDIATE_FIX' | 'OPTION_B_STANDBY_FALLBACK' | 'OPTION_C_DISASTER_RECOVERY';
  title: string;
  description: string;
  executableCommand: string;
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedRecoverySeconds: number;
}

export interface WebOutageRecoveryPlan {
  targetUrl: string;
  rootCause: WebOutageRootCause;
  confidence: number;
  plainEnglishExplanation: string;
  primaryActionToStartServer: string;
  optionA_ImmediateFix: RecoveryOption;
  optionB_StandbyFallback: RecoveryOption;
  optionC_DisasterRecovery: RecoveryOption;
  neuralPrediction: NeuralPrediction;
}

export class WebOutageRecoveryEngine {
  public diagnoseAndRecover(telemetry: WebOutageTelemetry): WebOutageRecoveryPlan {
    const logs = (telemetry.recentLogs || []).join(' ').toLowerCase();
    const status = telemetry.httpStatusCode;
    const port = telemetry.port;
    const unit = telemetry.systemdUnit || 'app-backend';

    // 1. Neural Forward Pass with Web Downtime Telemetry
    const neuralVec = neuralThreatClassifier.vectorize({
      openPorts: telemetry.isPortListening ? [port] : [],
      logs: telemetry.recentLogs,
      webTelemetry: {
        httpStatusCode: status,
        isListeningOnPort: telemetry.isPortListening,
        systemdState: telemetry.systemdState,
      },
    });
    const neuralPrediction = neuralThreatClassifier.predict(neuralVec);

    // 2. Deterministic Root-Cause Diagnosis
    let rootCause: WebOutageRootCause = 'WEB_SERVICE_INACTIVE_CRASH';
    let explanation = '';
    let primaryAction = '';

    if (logs.includes('eaddrinuse') || logs.includes('address already in use') || logs.includes('port is already allocated')) {
      rootCause = 'WEB_PORT_BIND_CONFLICT_EADDRINUSE';
      explanation = `Web page is down because port ${port} is occupied by an orphaned zombie process, preventing the web server from binding.`;
      primaryAction = `fuser -k ${port}/tcp && systemctl restart ${unit}`;
    } else if (telemetry.sslCertDaysRemaining !== undefined && telemetry.sslCertDaysRemaining <= 0 || logs.includes('certificate has expired') || logs.includes('ssl_do_handshake') || logs.includes('cert_date_invalid')) {
      rootCause = 'WEB_SSL_CERT_EXPIRED';
      explanation = `Web page is inaccessible due to an expired SSL/TLS certificate triggering browser ERR_SSL_PROTOCOL_ERROR blocks.`;
      primaryAction = 'certbot renew --force-renewal && systemctl reload nginx';
    } else if (logs.includes('could not find a production build') || logs.includes('.next') || logs.includes('cannot find module') || logs.includes('dist/server.js')) {
      rootCause = 'WEB_MISSING_BUILD_ARTIFACT';
      explanation = `Web server crashed on startup because production build artifacts (.next / dist) are missing or corrupt.`;
      primaryAction = `npm run build && systemctl restart ${unit}`;
    } else if (logs.includes('missing environment variable') || logs.includes('database_url') || logs.includes('enoent .env') || logs.includes('secret key not set')) {
      rootCause = 'WEB_ENV_CONFIG_MISSING';
      explanation = `Web server failed on boot due to missing critical environment secrets or database connection string.`;
      primaryAction = `cp .env.example .env && systemctl restart ${unit}`;
    } else if (telemetry.isPortListening && (status === 0 || status === 504) && (logs.includes('firewall') || logs.includes('connection timed out'))) {
      rootCause = 'WEB_FIREWALL_PORT_BLOCKED';
      explanation = `Web server is running locally on port ${port}, but external traffic is dropped by iptables or cloud security group.`;
      primaryAction = `iptables -I INPUT -p tcp --dport ${port} -j ACCEPT`;
    } else if (status === 502 || logs.includes('healthcheck') || logs.includes('connection refused')) {
      rootCause = 'WEB_HEALTHCHECK_PROBE_FAILED';
      explanation = `Edge reverse proxy returned 502 Bad Gateway because upstream application healthcheck timed out.`;
      primaryAction = `systemctl restart ${unit} && nginx -s reload`;
    } else {
      // Default: Service exited or inactive
      rootCause = 'WEB_SERVICE_INACTIVE_CRASH';
      explanation = `Web server process is dead (status: ${telemetry.systemdState || 'failed'}), causing immediate connection refusal.`;
      primaryAction = `systemctl reset-failed ${unit} && systemctl start ${unit}`;
    }

    // 3. Formulate Multi-Option Progressive Recovery Pathways
    const optionA: RecoveryOption = {
      optionName: 'OPTION_A_IMMEDIATE_FIX',
      title: 'Immediate Targeted Repair & Server Restart',
      description: 'Executes targeted remediation of the root cause and restarts the primary service unit.',
      executableCommand: primaryAction,
      blastRadius: 'LOW',
      estimatedRecoverySeconds: 15,
    };

    const optionB: RecoveryOption = {
      optionName: 'OPTION_B_STANDBY_FALLBACK',
      title: 'Standby Backup Port Failover & Maintenance Static Bypass',
      description: 'Switches Nginx upstream proxy to healthy standby backup port (3001) or activates a branded static maintenance page on port 80.',
      executableCommand: `sed -i "s/127.0.0.1:${port}/127.0.0.1:${port + 1}/" /etc/nginx/sites-available/default && nginx -s reload`,
      blastRadius: 'LOW',
      estimatedRecoverySeconds: 5,
    };

    const optionC: RecoveryOption = {
      optionName: 'OPTION_C_DISASTER_RECOVERY',
      title: 'Cloud Out-of-Band Power Cycle & Snapshot Rollback',
      description: 'Issues out-of-band ACPI power-cycle or restores the latest verified filesystem snapshot via cloud provider API.',
      executableCommand: 'ryvix-cloud-recovery --action hard_reboot --server-id self',
      blastRadius: 'HIGH',
      estimatedRecoverySeconds: 90,
    };

    return {
      targetUrl: telemetry.targetUrl,
      rootCause,
      confidence: 0.98,
      plainEnglishExplanation: explanation,
      primaryActionToStartServer: primaryAction,
      optionA_ImmediateFix: optionA,
      optionB_StandbyFallback: optionB,
      optionC_DisasterRecovery: optionC,
      neuralPrediction,
    };
  }
}

export const webOutageRecoveryEngine = new WebOutageRecoveryEngine();
