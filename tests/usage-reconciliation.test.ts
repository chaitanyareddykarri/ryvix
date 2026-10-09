import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcileUsage} from '../ai/src/usage-reconciliation';
test('reconciliation distinguishes missing usage, mismatch, aggregation and scope errors',()=>{
 const row={provider:'fixture',model:'fixture',promptTokens:10,completionTokens:5,requests:1};
 const scope={localAccount:'test-account',providerAccount:'test-account',localStart:'2026-01-01',providerStart:'2026-01-01',localEnd:'2026-02-01',providerEnd:'2026-02-01'};
 assert.equal(reconcileUsage([row],[row],scope)[0].status,'matched');
 assert.equal(reconcileUsage([row,row],[{...row,promptTokens:20,completionTokens:10,requests:2}],scope)[0].status,'matched');
 assert.equal(reconcileUsage([{...row,promptTokens:null}],[row],scope)[0].status,'unknown');
 assert.equal(reconcileUsage([row],[],scope)[0].status,'unknown');
 assert.equal(reconcileUsage([row],[{...row,requests:2}],scope)[0].status,'mismatch');
 assert.throws(()=>reconcileUsage([row],[row],{...scope,providerAccount:'other'}));
});
