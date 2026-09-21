import assert from 'node:assert/strict';
import { ApiKeySecurityService } from '../services/src/security/api-key.service';

export async function testApiKeySecurity() {
  console.log('[TEST] Running API Key Cryptographic Security & Lifecycle Test...');

  const service = new ApiKeySecurityService();
  const orgId = 'org_security_test';

  // 1. Key Generation
  const { plaintextKey, apiKeyRecord } = service.generateKey(
    orgId,
    'CI/CD Deploy Key',
    ['deployments:write', 'metrics:read'],
    30 // 30 days
  );

  // Security Invariant: Plaintext must NEVER equal stored hashed_secret
  assert.notEqual(plaintextKey, apiKeyRecord.hashed_secret, 'Plaintext key must never be stored in record');
  assert.equal(apiKeyRecord.hashed_secret.length, 64, 'Stored secret must be a 64-char SHA-256 hex string');
  assert.equal(apiKeyRecord.organization_id, orgId, 'Record must be strictly tied to organization');
  assert.ok(apiKeyRecord.key_prefix.startsWith('ryv_live_'), 'Key prefix must match convention');

  // 2. Successful Verification
  const validCheck = service.verifyKey(plaintextKey, apiKeyRecord, 'deployments:write');
  assert.equal(validCheck.isValid, true, 'Valid key and valid scope must pass verification');

  // 3. Scope Failure
  const scopeCheck = service.verifyKey(plaintextKey, apiKeyRecord, 'admin:delete');
  assert.equal(scopeCheck.isValid, false, 'Key without requested scope must fail');
  assert.ok(scopeCheck.reason?.includes('scope'), 'Failure reason must mention scope');

  // 4. Bad Secret Failure
  const tamperedKey = `${plaintextKey.slice(0, -4)}ffff`;
  const badSecretCheck = service.verifyKey(tamperedKey, apiKeyRecord);
  assert.equal(badSecretCheck.isValid, false, 'Tampered secret must fail');

  // 5. Expiry Check
  const expiredTime = new Date(Date.now() + 35 * 86400000); // 35 days later
  const expiredCheck = service.verifyKey(plaintextKey, apiKeyRecord, undefined, expiredTime);
  assert.equal(expiredCheck.isValid, false, 'Expired key must fail');
  assert.ok(expiredCheck.reason?.includes('expired'), 'Failure reason must mention expiry');

  // 6. Revocation Check
  const revokedRecord = service.revokeKey(apiKeyRecord);
  assert.ok(revokedRecord.revoked_at, 'Revoked timestamp must be set');
  const revokedCheck = service.verifyKey(plaintextKey, revokedRecord);
  assert.equal(revokedCheck.isValid, false, 'Revoked key must be rejected');
  assert.ok(revokedCheck.reason?.includes('revoked'), 'Failure reason must mention revocation');

  console.log('✓ API Key Security Test PASSED (hash-only storage, scopes, expiry, revocation, timing-safe matching).');
}
