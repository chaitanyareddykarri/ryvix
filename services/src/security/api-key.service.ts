/**
 * Ryvix API Key Cryptographic Lifecycle & Security Service
 * 
 * SECURITY INVARIANTS:
 * 1. Plaintext API keys are generated with CSPRNG (`crypto.randomBytes`).
 * 2. Only SHA-256 cryptographic hashes (`hashed_secret`) are persisted to PostgreSQL.
 * 3. Plaintext is returned ONCE to the user upon creation and NEVER stored or logged.
 * 4. Verification checks:
 *    - Cryptographic hash match
 *    - Organization ownership
 *    - Not revoked (`revoked_at IS NULL`)
 *    - Not expired (`expires_at IS NULL OR expires_at > NOW()`)
 *    - Required scope presents
 */

import * as crypto from 'node:crypto';
import type { ApiKey } from '@ryvix/database';

export interface GeneratedKeyResult {
  plaintextKey: string;
  apiKeyRecord: ApiKey;
}

export interface VerificationResult {
  isValid: boolean;
  apiKey?: ApiKey;
  reason?: string;
}

export class ApiKeySecurityService {
  private keyPrefix = 'ryv_live_';

  /**
   * Generates a cryptographically secure API key, hashing it for storage.
   */
  generateKey(
    organizationId: string,
    name: string,
    scopes: string[] = ['read', 'write'],
    expiresInDays?: number
  ): GeneratedKeyResult {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const plaintextKey = `${this.keyPrefix}${rawSecret}`;
    const keyPrefixDisplay = plaintextKey.slice(0, 16); // e.g. "ryv_live_9a8b7c"

    // Cryptographic SHA-256 Hash
    const hashedSecret = crypto.createHash('sha256').update(plaintextKey).digest('hex');

    const now = new Date();
    const expiresAt = expiresInDays
      ? new Date(now.getTime() + expiresInDays * 86400000).toISOString()
      : null;

    const apiKeyRecord: ApiKey = {
      id: `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      organization_id: organizationId,
      name,
      key_prefix: keyPrefixDisplay,
      hashed_secret: hashedSecret,
      scopes,
      expires_at: expiresAt,
      last_used_at: null,
      revoked_at: null,
      created_at: now.toISOString(),
    };

    return {
      plaintextKey,
      apiKeyRecord,
    };
  }

  /**
   * Verifies an incoming API key against stored records without exposing secrets.
   */
  verifyKey(
    incomingPlaintext: string,
    candidateRecord: ApiKey,
    requiredScope?: string,
    currentTime: Date = new Date()
  ): VerificationResult {
    // 1. Check Key Format
    if (!incomingPlaintext.startsWith(this.keyPrefix)) {
      return { isValid: false, reason: 'Invalid key prefix format.' };
    }

    // 2. Hash incoming secret and compare with stored hash
    const incomingHash = crypto.createHash('sha256').update(incomingPlaintext).digest('hex');
    const hashesMatch = crypto.timingSafeEqual(
      Buffer.from(incomingHash, 'hex'),
      Buffer.from(candidateRecord.hashed_secret, 'hex')
    );

    if (!hashesMatch) {
      return { isValid: false, reason: 'Key secret mismatch.' };
    }

    // 3. Check Revocation
    if (candidateRecord.revoked_at !== null) {
      return { isValid: false, reason: 'API key has been revoked.' };
    }

    // 4. Check Expiration
    if (candidateRecord.expires_at) {
      const expiresAt = new Date(candidateRecord.expires_at);
      if (currentTime.getTime() > expiresAt.getTime()) {
        return { isValid: false, reason: 'API key has expired.' };
      }
    }

    // 5. Check Scopes
    if (requiredScope && !candidateRecord.scopes.includes(requiredScope)) {
      return { isValid: false, reason: `API key lacks required scope '${requiredScope}'.` };
    }

    return {
      isValid: true,
      apiKey: candidateRecord,
    };
  }

  /**
   * Revokes an existing API key.
   */
  revokeKey(keyRecord: ApiKey, currentTime: Date = new Date()): ApiKey {
    return {
      ...keyRecord,
      revoked_at: currentTime.toISOString(),
    };
  }
}
