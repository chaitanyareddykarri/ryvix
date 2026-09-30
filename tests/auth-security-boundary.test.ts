import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

export function loadSecurity(secret?: string) {
  const exports: any = {};
  let now = 1_800_000_000_000;
  const env: Record<string, string | undefined> = {
    AUTH_CHALLENGE_SECRET: secret,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key-must-never-encrypt-passwords',
  };
  const code = ts.transpileModule(fs.readFileSync('web/utils/auth-security.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Buffer, process: { env }, Date: class extends Date { static now() { return now; } },
    require: (name: string) => {
      if (name === 'server-only') return {};
      if (name === 'crypto' || name === 'node:crypto') return crypto;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { api: exports, env, advance: (ms: number) => { now += ms; } };
}

export async function testAuthSecurityBoundary() {
  for (const key of [undefined, 'short']) {
    const { api } = loadSecurity(key);
    assert.throws(() => api.createLoginOtpChallenge('owner@example.test', '123456', 'test-password'), /AUTH_CHALLENGE_SECRET/);
  }
  const { api, advance, env } = loadSecurity(crypto.randomBytes(32).toString('hex'));
  const login = api.createLoginOtpChallenge('Owner@example.test', '123456', 'test-password');
  assert.equal(api.verifyLoginOtpChallenge(login, 'owner@example.test', '123456').valid, true);
  assert.equal(api.verifyLoginOtpChallenge(login, 'other@example.test', '123456').valid, false);
  assert.equal(api.verifyLoginOtpChallenge(login, 'owner@example.test', '654321').valid, false);
  assert.equal(api.verifySignupChallenge(login, 'owner@example.test', '123456').valid, false);
  const tampered = Buffer.from(login, 'base64url');
  tampered[30] ^= 1;
  assert.equal(api.verifyLoginOtpChallenge(tampered.toString('base64url'), 'owner@example.test', '123456').valid, false);
  const renewed = api.renewLoginChallenge(login, 'owner@example.test', '654321');
  assert.equal(api.verifyLoginOtpChallenge(renewed, 'owner@example.test', '654321').password, 'test-password');
  assert.throws(() => api.renewLoginChallenge(login, 'other@example.test', '654321'));
  const signup = api.createSignupChallenge({ email: 'owner@example.test', fullName: 'Owner', password: 'test-password', otp: '123456' });
  assert.equal(api.verifyLoginOtpChallenge(signup, 'owner@example.test', '123456').valid, false);
  assert.throws(() => api.renewSignupChallenge(signup, 'other@example.test', '654321'));
  const renewedSignup = api.renewSignupChallenge(signup, 'owner@example.test', '654321');
  assert.equal(api.verifySignupChallenge(renewedSignup, 'owner@example.test', '654321').userData.fullName, 'Owner');
  advance(10 * 60 * 1000);
  assert.equal(api.verifyLoginOtpChallenge(login, 'owner@example.test', '123456').valid, false);
  assert.throws(() => api.renewLoginChallenge(login, 'owner@example.test', '654321'));
  assert.throws(() => api.renewSignupChallenge(signup, 'owner@example.test', '654321'));
  advance(-20 * 60 * 1000);
  assert.equal(api.verifyLoginOtpChallenge(login, 'owner@example.test', '123456').valid, false);
  advance(10 * 60 * 1000);
  env.AUTH_CHALLENGE_SECRET = crypto.randomBytes(32).toString('hex');
  assert.equal(api.verifyLoginOtpChallenge(login, 'owner@example.test', '123456').valid, false);
}
