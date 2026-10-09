import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactMessages,BudgetMessage} from '../ai/src/context/message-budget';
test('context keeps instructions and latest request unchanged and bounds history',()=>{
 const messages:BudgetMessage[]=[{role:'system',content:'system policy'},{role:'user',content:'x'.repeat(3000)},{role:'assistant',content:'y'.repeat(3000)},{role:'user',content:'current request'}];
 const result=compactMessages(messages,2048);
 assert.equal(result[0],messages[0]);assert.equal(result.at(-1),messages.at(-1));
 assert.ok(result.reduce((n,m)=>n+m.content.length,0)<=2048);assert.ok(result.some(m=>m.content.includes('omitted')));
 assert.deepEqual(messages[1].content,'x'.repeat(3000));
 assert.throws(()=>compactMessages([{role:'user',content:'x'.repeat(3000)}],2048),/narrow/);
 assert.equal(compactMessages(messages),messages);
});
