import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { scanText } from '../scripts/check-secrets.mjs';

test('password candidate arrays are rejected without revealing candidates', () => {
  const secret = randomBytes(24).toString('hex');
  for (const name of ['passwords', 'passwordCandidates', 'candidatePasswords']) {
    for (const separator of ['', '\n']) {
      const source = `const ${name} = [${separator}'${secret}'${separator}];`;
      const findings = scanText('scripts/probe.js', source);
      assert.equal(findings[0]?.rule, 'hardcoded-password-candidates');
      assert.equal(JSON.stringify(findings).includes(secret), false);
    }
  }
  assert.equal(scanText('scripts/check.js', 'const passwords = [process.env.DATABASE_PASSWORD];').length, 0);
});

test('database credentials are rejected without returning their value', () => {
  const secret = randomBytes(24).toString('hex');
  const url = ['postgresql:', '//postgres:', secret, '@db.example.test:5432/postgres'].join('');
  const findings = scanText('web/utils/database.ts', `const url = '${url}';`);
  assert.equal(findings[0]?.rule, 'database-password-in-url');
  assert.equal(JSON.stringify(findings).includes(secret), false);
  assert.equal(scanText('docs/setup.md', url).length, 1);
});

test('known examples are allowed only in documentation and tests', () => {
  const url = ['postgresql:', '//postgres:password', '@localhost:5432/postgres'].join('');
  assert.equal(scanText('.env.example', url).length, 0);
  assert.equal(scanText('tests/example.test.ts', url).length, 0);
  assert.equal(scanText('backend/src/db.ts', url).length, 1);
});

test('privileged JWTs are blocked while public JWTs are allowed', () => {
  const jwt = role => [Buffer.from('{"alg":"HS256"}').toString('base64url'),
    Buffer.from(JSON.stringify({ role })).toString('base64url'), randomBytes(32).toString('base64url')].join('.');
  assert.equal(scanText('web/config.ts', jwt('service_role'))[0]?.rule, 'supabase-service-role-jwt');
  assert.equal(scanText('web/config.ts', jwt('anon')).length, 0);
});

test('provider tokens and dedicated encryption keys are detected', () => {
  assert.equal(scanText('web/config.ts', 'sb_' + 'secret_' + randomBytes(24).toString('hex'))[0]?.rule, 'provider-secret');
  assert.equal(scanText('.env.example', 'AUTH_CHALLENGE_SECRET=' + randomBytes(32).toString('hex'))[0]?.rule, 'otp-encryption-key');
});

test('reviewed redaction fixtures do not exempt modified lines', () => {
  const file = 'tests/ai-understanding-refinement-planning.test.ts';
  const content = fs.readFileSync(file, 'utf8');
  assert.equal(scanText(file, content).length, 0);
  const lines = content.split('\n');
  lines[196] += ' sb_' + 'secret_' + randomBytes(24).toString('hex');
  assert.ok(scanText(file, lines.join('\n')).some(finding => finding.rule === 'provider-secret'));
});
