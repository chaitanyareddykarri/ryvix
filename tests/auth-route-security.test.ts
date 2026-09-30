import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadSecurity } from './auth-security-boundary.test';

// Execute production handlers, replacing only external database/auth/mail I/O.
function loadRoute(file: string, security: any, token: string, signInResult: any, ledgerAllowed = true, mail: 'success' | 'failure' | 'throw' = 'success') {
  const exports: any = {};
  let sent = 0;
  let signIns = 0;
  const cookieWrites: Array<{ name: string; value: string }> = [];
  let reservedToken = '';
  const cookieStore = { get: () => ({ value: token }), getAll: () => [], set: () => {}, delete: () => {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, process: { env: { DATABASE_URL: 'provided-by-test-adapter' } },
    require: (name: string) => {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: { status: number }) => ({
        body, status: init?.status || 200, cookies: { set: (name: string, value: string) => cookieWrites.push({ name, value }), delete: () => {} },
      }) } };
      if (name === 'next/headers') return { cookies: async () => cookieStore };
      if (name === '@/utils/auth-security') return security;
      if (name === '@/utils/auth-challenge-store') return {
        registerAuthChallenge: async (next: string) => { if (ledgerAllowed) reservedToken = next; return ledgerAllowed; },
        consumeAuthChallenge: async (_token: string, _email: string, _kind: string, correct: boolean) => ledgerAllowed && correct,
      };
      if (name === '@/utils/email-service') return { sendOtpEmail: async () => { sent++; if (mail === 'throw') throw new Error('mail transport failed'); return { success: mail === 'success' }; } };
      if (name === '@supabase/ssr') return { createServerClient: () => ({ auth: {
        signInWithPassword: async () => { signIns++; return signInResult; },
      } }) };
      if (name === '@/utils/direct-db') return { getDirectDbPool: () => ({ connect: async () => ({
        on: () => {}, release: () => {}, query: async () => ({ rowCount: 1, rows: [{ id: 'existing-test-user' }] }),
      }) }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { post: exports.POST, sent: () => sent, signIns: () => signIns, cookieWrites, reservedToken: () => reservedToken };
}

export async function testAuthRouteSecurity() {
  const { api } = loadSecurity(crypto.randomBytes(32).toString('hex'));
  const request = { json: async () => ({ email: 'owner@example.test', token: '123456' }) };
  const login = api.createLoginOtpChallenge('owner@example.test', '123456', 'test-password');
  const signup = api.createSignupChallenge({ email: 'owner@example.test', fullName: 'Owner', password: 'test-password', otp: '123456' });
  for (const [kind, token] of [['login', login], ['signup', signup]]) {
    const file = `web/app/api/auth/${kind}/step2/route.ts`;
    for (const result of [
      { error: { message: 'rejected' }, data: null },
      { error: null, data: { session: null, user: null } },
      { error: null, data: { session: {}, user: null } },
    ]) {
      const route = loadRoute(file, api, token, result);
      const response = await route.post(request);
      assert.equal(response.status, 401, `${kind} must not succeed without a real session and user`);
      assert.notEqual(response.body.success, true);
      assert.equal(route.signIns(), 1);
    }
    const success = loadRoute(file, api, token, { error: null, data: { session: {}, user: { id: 'test-user' } } });
    assert.equal((await success.post(request)).body.success, true);
    const invalid = loadRoute(file, api, 'tampered', null);
    assert.equal((await invalid.post(request)).status, 400);
    assert.equal(invalid.signIns(), 0);

    const resendFile = `web/app/api/auth/${kind}/resend/route.ts`;
    const wrongEmail = loadRoute(resendFile, api, token, null);
    assert.equal((await wrongEmail.post({ json: async () => ({ email: 'attacker@example.test' }) })).status, 401);
    assert.equal(wrongEmail.sent(), 0, 'Never send an OTP before validating the challenge identity');
    const validResend = loadRoute(resendFile, api, token, null);
    assert.equal((await validResend.post(request)).status, 200);
    assert.equal(validResend.sent(), 1);
    for (const mode of ['failure', 'throw'] as const) {
      const failedMail = loadRoute(resendFile, api, token, null, true, mode);
      const failedResponse = await failedMail.post(request);
      assert.equal(failedResponse.status, 502);
      assert.notEqual(failedResponse.body.success, true);
      const cookie = failedMail.cookieWrites.find(item => item.name === `ryvix_${kind}_challenge`);
      assert.ok(cookie, 'Delivery failure must return the challenge reserved in the ledger');
      assert.equal(cookie.value, failedMail.reservedToken());
      assert.notEqual(cookie.value, token, 'Never revive the superseded OTP');
      assert.equal(api.challengeMetadata(cookie.value, 'owner@example.test', kind).expiresAt,
        api.challengeMetadata(token, 'owner@example.test', kind).expiresAt, 'Resends preserve original expiry');
      const retry = loadRoute(resendFile, api, cookie.value, null);
      assert.equal((await retry.post(request)).status, 200, 'Renewed cookie remains usable for a later allowed retry');
    }
    const replay = loadRoute(file, api, token, null, false);
    assert.equal((await replay.post(request)).status, 400);
    assert.equal(replay.signIns(), 0, 'Consumed or exhausted challenges cannot create sessions');
    const throttled = loadRoute(resendFile, api, token, null, false);
    assert.equal((await throttled.post(request)).status, 429);
    assert.equal(throttled.sent(), 0, 'Rate-limited resends must not dispatch mail');
  }
  const emptyPassword = loadRoute('web/app/api/auth/login/step2/route.ts', {
    verifyLoginOtpChallenge: () => ({ valid: true, password: '' }),
  }, login, null);
  assert.equal((await emptyPassword.post(request)).status, 400);
  assert.equal(emptyPassword.signIns(), 0);
}
