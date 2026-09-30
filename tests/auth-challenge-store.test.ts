import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { safeOAuthReturn } from '../web/utils/oauth-return';

export async function testAuthChallengeStore() {
  for (const value of ['https://attacker.test','//attacker.test','/\\attacker.test','/\nattacker.test']) assert.equal(safeOAuthReturn(value),'/dashboard');
  assert.equal(safeOAuthReturn('/dashboard?tab=connections'),'/dashboard?tab=connections');
  const api: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/auth-security.ts','utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022},
  }).outputText, { exports:api, Buffer, Date, process:{env:{AUTH_CHALLENGE_SECRET:crypto.randomBytes(32).toString('hex')}},
    require: (name: string) => name==='server-only'?{}:crypto });
  const calls: Array<{sql:string; params:unknown[]}> = [];
  let allowed = true;
  const store: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/auth-challenge-store.ts','utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText, { exports:store, require(name:string) {
    if(name==='server-only') return {};
    if(name==='node:crypto') return crypto;
    if(name==='./auth-security') return api;
    if(name==='./direct-db') return { queryDirectDb:async(sql:string,params:unknown[])=>{
      calls.push({sql,params}); return allowed ? [{subject_hash:'stored',consumed:params[3]===true}] : [];
    } };
    throw new Error(name);
  } });
  const email='owner@example.test';
  const token=api.createLoginOtpChallenge(email,'123456','sensitive-password');
  assert.equal(await store.registerAuthChallenge(token,email,'login'),true);
  assert.ok(calls[0].sql.includes('ON CONFLICT') && calls[0].sql.includes("interval '1 minute'"));
  assert.ok(calls[0].sql.includes('attempts<5'), 'Restarting flow cannot reset guessing budget');
  assert.ok(!JSON.stringify(calls[0].params).includes(email));
  assert.ok(!JSON.stringify(calls[0].params).includes('sensitive-password'));
  assert.ok(!JSON.stringify(calls[0].params).includes(token));
  assert.equal(await store.consumeAuthChallenge(token,email,'login',false),false);
  assert.ok(calls.at(-1)!.sql.includes('attempts=attempts+1'));
  assert.equal(await store.consumeAuthChallenge(token,email,'login',true),true);
  allowed=false;
  assert.equal(await store.consumeAuthChallenge(token,email,'login',true),false);
  assert.equal(await store.registerAuthChallenge(token,email,'login'),false);
  allowed=true;
  const next=api.renewLoginChallenge(token,email,'654321');
  assert.equal(await store.registerAuthChallenge(next,email,'login',token),true);
  assert.ok(calls.at(-1)!.sql.includes('token_hash=$5') && calls.at(-1)!.sql.includes('expires_at=$4'));
  const before=calls.length;
  assert.equal(await store.consumeAuthChallenge(token,'other@example.test','login',true),false);
  assert.equal(await store.consumeAuthChallenge(token,email,'signup',true),false);
  assert.equal(calls.length,before);
}
