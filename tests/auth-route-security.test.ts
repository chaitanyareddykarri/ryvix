import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadSecurity } from './auth-security-boundary.test';

// Execute production handlers, replacing only external database/auth/mail I/O.
function loadRoute(file: string, security: any, token: string, signInResult: any) {
  const exports: any = {};
  let sent = 0;
  let signIns = 0;
  const cookieStore = { get: () => ({ value: token }), getAll: () => [], set: () => {}, delete: () => {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, process: { env: { DATABASE_URL: 'provided-by-test-adapter' } },
    require: (name: string) => {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: { status: number }) => ({
        body, status: init?.status || 200, cookies: { set: () => {}, delete: () => {} },
      }) } };
      if (name === 'next/headers') return { cookies: async () => cookieStore };
      if (name === '@/utils/auth-security') return security;
      if (name === '@/utils/email-service') return { sendOtpEmail: async () => { sent++; return { success: true }; } };
      if (name === '@supabase/ssr') return { createServerClient: () => ({ auth: {
        signInWithPassword: async () => { signIns++; return signInResult; },
      } }) };
      if (name === '@/utils/direct-db') return { getDirectDbPool: () => ({ connect: async () => ({
        on: () => {}, release: () => {}, query: async () => ({ rowCount: 1, rows: [{ id: 'existing-test-user' }] }),
      }) }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { post: exports.POST, sent: () => sent, signIns: () => signIns };
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
  }
  const emptyPassword = loadRoute('web/app/api/auth/login/step2/route.ts', {
    verifyLoginOtpChallenge: () => ({ valid: true, password: '' }),
  }, login, null);
  assert.equal((await emptyPassword.post(request)).status, 400);
  assert.equal(emptyPassword.signIns(), 0);
}
