import {RepositoryAnalyzer} from '../backend/src/connectors/github.connector';
import {verifiedTelegramPhone} from '../services/src/communication/telegram-identity';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ModelGateway} from '../ai/src/model-gateway';
import {boundedRepositoryFiles} from '../ai/src/context/repository-budget';
import {providerFailureReason} from '../ai/src/provider-errors';

test('coding context skips oversized files without presenting truncated files as complete',()=>{
  const files=[{path:'large.ts',content:'x'.repeat(60000)},{path:'small.ts',content:'export const a=1;'}];
  assert.deepEqual(boundedRepositoryFiles(files,20000),[files[1]]);
  assert.throws(()=>boundedRepositoryFiles([files[0]],20000),/No complete source file/);
  assert.throws(()=>boundedRepositoryFiles(files,NaN),/Invalid/);
});

test('provider diagnostics never expose arbitrary error text',()=>{
  assert.equal(providerFailureReason(new Error('HTTP 401 secret-token')),'authentication or permission rejected');
  assert.equal(providerFailureReason(new Error('https://secret.example/token')),'network or provider request failed');
});

test('provider rejection reports safe causes and honors rate-limit retry-after',async()=>{
  const old={...process.env},fetch=globalThis.fetch;
  try{
    process.env.RYVIX_MODEL_PROVIDER='gemini';process.env.RYVIX_MODEL_FALLBACK_ORDER='gemini';delete process.env.RYVIX_CHAT_PROVIDER;
    process.env.GEMINI_MODEL='fixture-model';process.env.GEMINI_API_KEY='fixture-key';
    globalThis.fetch=async()=>Response.json({error:'sensitive provider body'},{status:401});
    await assert.rejects(new ModelGateway().complete([{role:'user',content:'test'}],{onAttempt:async()=>{}}),error=>{
      assert.match((error as Error).message,/authentication or permission/);assert.doesNotMatch((error as Error).message,/sensitive|fixture-key/);return true;
    });
    globalThis.fetch=async()=>new Response(null,{status:429,headers:{'retry-after':'180'}});
    const before=Date.now();
    await assert.rejects(new ModelGateway().complete([{role:'user',content:'test'}],{onAttempt:async()=>{}}),error=>{
      assert.ok((error as any).retryAt>=before+180000);return true;
    });
  }finally{globalThis.fetch=fetch;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});

test('Telegram identity rejects typed numbers, foreign contacts and group chats',()=>{
 const message={chat:{type:'private',id:101},from:{id:101},contact:{user_id:101,phone_number:'+919876543210'}};
 assert.equal(verifiedTelegramPhone(message),'+919876543210');
 assert.equal(verifiedTelegramPhone({...message,contact:undefined,text:'+919876543210'}),null);
 assert.equal(verifiedTelegramPhone({...message,contact:{...message.contact,user_id:202}}),null);
 assert.equal(verifiedTelegramPhone({...message,chat:{type:'group',id:101}}),null);
});

test('plain websites get a real preview and generic repositories never claim echo tests passed',()=>{
 const profile=RepositoryAnalyzer.detectStack(['index.html','css/style.css','.gitignore']);
 assert.equal(profile.stack,'static');assert.match(profile.devCommand,/static-site.*serve --standard/);
 const generic=RepositoryAnalyzer.detectStack(['README.md']);assert.equal(generic.testCommand,'');assert.equal(generic.buildCommand,'');
});
