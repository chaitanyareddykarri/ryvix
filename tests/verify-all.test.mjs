import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verificationPlan,runVerification} from '../scripts/verify-all.mjs';

test('verification defaults exclude live mutations and require explicit read-only checks',()=>{
 const plan=verificationPlan();
 assert.deepEqual(plan,['security:secrets','typecheck','lint','test:offline','test:browser']);
 assert.deepEqual(verificationPlan(['--database','--runtime']).slice(-2),['verify:database','verify:runtime']);
 assert.throws(()=>verificationPlan(['--live']));
});
test('verification is sequential, reports failures, and keeps independent checks running',async()=>{
 let active=0;const seen=[],logs=[];
 const result=await runVerification(['one','two','three'],async command=>{
  assert.equal(active++,0);seen.push(command);await Promise.resolve();active--;
  if(command==='two')throw new Error('fixture failure');return 0;
 },line=>logs.push(line));
 assert.equal(result,1);assert.deepEqual(seen,['one','two','three']);
 assert.ok(logs.some(line=>line.startsWith('FAIL two')));
 assert.equal(await runVerification(['one'],async()=>0,()=>{}),0);
});
