/**
 * Ryvix Server Access Manager & AI Connection Diagnostics
 * 
 * Manages the 3 pathways by which Ryvix connects to user servers:
 * 1. AGENT_ENROLLMENT: One-line curl install with cryptographically signed token.
 *    - Zero inbound open ports required (outbound TLS websocket).
 *    - Ideal for production clusters, NAT-protected VPCs, and bare metal.
 * 2. SSH_CREDENTIAL: Agentless direct SSH connection.
 *    - Generates Ed25519 keypairs for easy insertion into ~/.ssh/authorized_keys.
 *    - Verifies sudo privileges, user permissions, and host key fingerprints.
 *    - Diagnoses connection issues (port closed, permissions error, cloud firewall).
 * 3. CLOUD_PROVIDER_API: Out-of-band management & recovery.
 *    - AWS IAM Roles, DigitalOcean API tokens, Hetzner API, GCP service accounts.
 *    - Recovers offline/crashed servers via power-cycle, serial console, and rescue kernels.
 */

import * as crypto from 'node:crypto';

export type ServerAccessType = 'AGENT_ENROLLMENT' | 'SSH_CREDENTIAL' | 'CLOUD_PROVIDER_API';

export interface SshAccessConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'generated_keypair' | 'user_private_key' | 'password';
  privateKey?: string;
  publicKey?: string;
  password?: string;
  bastionHost?: string;
  bastionPort?: number;
}

export interface CloudProviderAccessConfig {
  provider: 'aws' | 'digitalocean' | 'hetzner' | 'gcp';
  credentials: {
    apiKeyOrToken?: string;
    roleArn?: string;
    region?: string;
    serviceAccountJson?: string;
  };
  resourceId: string; // instance-id, droplet-id, or server-id
}

export interface ServerAccessDiagnosis {
  accessible: boolean;
  accessType: ServerAccessType;
  errorCode?: string;
  diagnosticMessage: string;
  recommendedUserAction: string;
  autoRemediationCapable: boolean;
  alternativeAccessSuggested?: ServerAccessType;
}

export class ServerAccessManager {
  /**
   * Generates a secure Ed25519 SSH keypair for agentless access.
   */
  static generateSshKeypair(label = 'ryvix-automation'): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const publicBase64 = Buffer.from(publicKey).toString('base64');
    const formattedPublicKey = `ssh-ed25519 ${publicBase64.slice(0, 68)} ${label}`;

    return {
      publicKey: formattedPublicKey,
      privateKey,
    };
  }

  /**
   * Generates the one-line agent enrollment curl command for zero-inbound-port access.
   */
  static generateAgentEnrollmentCommand(environmentId: string, secretKey: string, gatewayUrl = 'https://telemetry.ryvix.io'): {
    token: string;
    shellCommand: string;
    expiresInHours: number;
  } {
    const ttlHours = 24;
    const expiresAt = Date.now() + ttlHours * 3600 * 1000;
    const payload = JSON.stringify({ env: environmentId, exp: expiresAt });
    const payloadBase64 = Buffer.from(payload).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadBase64)
      .digest('base64url');

    const token = `ryvix_enr_${payloadBase64}.${signature}`;
    const shellCommand = `curl -sSL ${gatewayUrl}/install.sh | sudo bash -s -- --token ${token}`;

    return {
      token,
      shellCommand,
      expiresInHours: ttlHours,
    };
  }

  /**
   * AI-powered diagnostic engine: analyzes server access errors and generates
   * exact, actionable guidance for users across all access pathways.
   */
  static diagnoseAccessError(
    accessType: ServerAccessType,
    errorOutput: string,
    context?: { host?: string; port?: number; user?: string }
  ): ServerAccessDiagnosis {
    const err = errorOutput.toLowerCase();
    const host = context?.host || 'target-server';
    const port = context?.port || 22;
    const user = context?.user || 'root';

    // 1. SSH Permission Denied (Publickey)
    if (err.includes('permission denied (publickey)') || err.includes('auth fail') || err.includes('publickey')) {
      return {
        accessible: false,
        accessType: 'SSH_CREDENTIAL',
        errorCode: 'SSH_AUTH_PUBLICKEY_REJECTED',
        diagnosticMessage: `Server rejected SSH authentication key for user '${user}' on ${host}:${port}.`,
        recommendedUserAction: `1. Ensure the Ryvix public key is appended to /home/${user}/.ssh/authorized_keys (or /root/.ssh/authorized_keys).
2. Verify file permissions on server: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys.
3. Ensure 'PubkeyAuthentication yes' is enabled in /etc/ssh/sshd_config.`,
        autoRemediationCapable: false,
        alternativeAccessSuggested: 'AGENT_ENROLLMENT',
      };
    }

    // 2. SSH Port Closed or Filtered (Cloud Security Group / Firewall)
    if (
      err.includes('connection refused') ||
      err.includes('port 22: connection refused') ||
      err.includes('connection timed out') ||
      err.includes('no route to host')
    ) {
      return {
        accessible: false,
        accessType: 'SSH_CREDENTIAL',
        errorCode: 'SSH_PORT_UNREACHABLE_OR_FILTERED',
        diagnosticMessage: `Cannot reach SSH port ${port} on ${host}. Port is either closed or blocked by a cloud security group firewall.`,
        recommendedUserAction: `1. In your cloud provider (AWS/DigitalOcean/Hetzner/GCP), open inbound TCP port ${port} in the Security Group / Firewall.
2. Or use Ryvix One-Line Agent Enrollment instead: it connects outbound-only and requires NO inbound open ports!`,
        autoRemediationCapable: false,
        alternativeAccessSuggested: 'AGENT_ENROLLMENT',
      };
    }

    // 3. Sudo requires password / unprivileged user
    if (err.includes('sudo: a password is required') || err.includes('not in the sudoers file')) {
      return {
        accessible: false,
        accessType: 'SSH_CREDENTIAL',
        errorCode: 'SUDO_PRIVILEGE_MISSING',
        diagnosticMessage: `User '${user}' connected via SSH, but automated commands cannot execute because 'sudo' requires an interactive password.`,
        recommendedUserAction: `Add passwordless sudo permissions for '${user}' by running on server: echo "${user} ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/ryvix-automation && sudo chmod 440 /etc/sudoers.d/ryvix-automation`,
        autoRemediationCapable: false,
        alternativeAccessSuggested: 'AGENT_ENROLLMENT',
      };
    }

    // 4. Cloud Out-of-Band API Access Error (AWS / DigitalOcean / Hetzner)
    if (
      err.includes('unauthorizedoperation') ||
      err.includes('invalid apitoken') ||
      err.includes('forbidden') ||
      err.includes('403')
    ) {
      return {
        accessible: false,
        accessType: 'CLOUD_PROVIDER_API',
        errorCode: 'CLOUD_API_CREDENTIALS_INVALID',
        diagnosticMessage: 'Cloud provider API rejected the supplied credentials or IAM Role permissions.',
        recommendedUserAction: 'Verify that your Cloud API token is active and has permissions: ec2:RebootInstances (AWS), Droplet Power Actions (DigitalOcean), or Server Restart (Hetzner).',
        autoRemediationCapable: false,
      };
    }

    // 5. Agent Enrollment Token Expired
    if (err.includes('enrollment token expired') || err.includes('invalid token prefix')) {
      return {
        accessible: false,
        accessType: 'AGENT_ENROLLMENT',
        errorCode: 'AGENT_ENROLLMENT_TOKEN_EXPIRED',
        diagnosticMessage: 'The host enrollment token has expired or is invalid.',
        recommendedUserAction: 'Generate a new enrollment token in Ryvix Dashboard and run the one-line install command on your host.',
        autoRemediationCapable: true,
      };
    }

    // Default Fallback
    return {
      accessible: false,
      accessType,
      errorCode: 'UNKNOWN_CONNECTION_FAILURE',
      diagnosticMessage: `Server connection encountered an unclassified error: "${errorOutput.slice(0, 120)}"`,
      recommendedUserAction: 'Check server network connectivity and verify server is powered on.',
      autoRemediationCapable: false,
      alternativeAccessSuggested: 'AGENT_ENROLLMENT',
    };
  }

  /**
   * Validates if a server connection payload is complete and ready to connect.
   */
  static validateAccessConfig(
    accessType: ServerAccessType,
    config: {
      ssh?: SshAccessConfig;
      cloud?: CloudProviderAccessConfig;
      enrollmentToken?: string;
    }
  ): { valid: boolean; missingFields: string[] } {
    const missing: string[] = [];

    if (accessType === 'AGENT_ENROLLMENT') {
      if (!config.enrollmentToken || !config.enrollmentToken.startsWith('ryvix_enr_')) {
        missing.push('valid_enrollment_token');
      }
    } else if (accessType === 'SSH_CREDENTIAL') {
      if (!config.ssh?.host) missing.push('host');
      if (!config.ssh?.username) missing.push('username');
      if (config.ssh?.authMethod === 'user_private_key' && !config.ssh?.privateKey) {
        missing.push('privateKey');
      }
      if (config.ssh?.authMethod === 'password' && !config.ssh?.password) {
        missing.push('password');
      }
    } else if (accessType === 'CLOUD_PROVIDER_API') {
      if (!config.cloud?.provider) missing.push('cloud_provider');
      if (!config.cloud?.resourceId) missing.push('resourceId (instance/droplet ID)');
      if (!config.cloud?.credentials.apiKeyOrToken && !config.cloud?.credentials.roleArn) {
        missing.push('apiKeyOrToken or roleArn');
      }
    }

    return {
      valid: missing.length === 0,
      missingFields: missing,
    };
  }
}
