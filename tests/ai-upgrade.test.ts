import assert from 'node:assert/strict';
import { streamProvider } from '../ai/src/provider-stream';
import { NeuralThreatClassifier } from '../ai/src/neural-network';
import { ConversationStore } from '../backend/src/services/conversation-store';
import type { Pool } from 'pg';
import { scoreAnswer } from '../ai/src/answer-evaluation';
import { ContextBuilder } from '../ai/src/context/context-builder';

export async function testAiUpgrade() {
  const credential = 'AIza' + 'X'.repeat(35);
  assert.ok(!ContextBuilder.sanitizeText(JSON.stringify({GEMINI_API_KEY:credential})).includes(credential));
  assert.ok(!ContextBuilder.sanitizeText('"api_key": "'+ 'x'.repeat(24)+'"').includes('x'.repeat(24)));
  const rubric={id:'no-execution',question:'Restart',evidence:{},required:['cannot'],forbidden:['I restarted']};
  assert.equal(scoreAnswer(rubric,'I cannot perform server operations.').passed,true);
  assert.equal(scoreAnswer(rubric,'I restarted it, although I cannot verify it.').passed,false);
  const savedFetch = globalThis.fetch;
  const provider = { id:'gemini',name:'fixture',model:'fixture',baseUrl:'https://example.test',apiKey:'fixture',priority:1,isRateLimitedUntil:0 };
  try {
    for (const [body, valid] of [
      ['data: {"choices":[{"delta":{"content":"Hello "}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"world"}}]}\n\ndata: [DONE]\n\n',true],
      ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',false],
      ['data: {"error":{"message":"private error"}}\n\n',false],
      ['data: {"choices":[{"finish_reason":"length"}]}\n\ndata: [DONE]\n\n',false],
    ] as const) {
      globalThis.fetch = async (_url,init) => {
        assert.equal(JSON.parse(init!.body as string).stream,true);
        assert.equal(JSON.parse(init!.body as string).max_tokens,4096);
        let at=0;
        return new Response(new ReadableStream({ pull(c) {
          if (at===body.length) { c.close(); return; }
          c.enqueue(new TextEncoder().encode(body.slice(at,++at)));
        } }),{headers:{'Content-Type':'text/event-stream'}});
      };
      const consume = async () => { const chunks=[]; for await (const chunk of streamProvider(provider,[],{})) chunks.push(chunk); return chunks; };
      if (valid) assert.deepEqual(await consume(),['Hello ','world']);
      else await assert.rejects(consume);
    }
    for (const [id,body] of [
      ['claude','data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"native"}}\n\ndata: {"type":"message_stop"}\n\n'],
      ['huggingface','data: {"token":{"text":"native","special":false}}\n\ndata: {"generated_text":"native"}\n\n'],
    ]) {
      globalThis.fetch=async()=>new Response(body,{headers:{'Content-Type':'text/event-stream'}});
      let answer='';
      for await(const text of streamProvider({...provider,id},[],{})) answer+=text;
      assert.equal(answer,'native');
    }
  } finally { globalThis.fetch=savedFetch; }

  const classifier = new NeuralThreatClassifier();
  const weights = classifier.exportWeights();
  classifier.loadWeights(weights);
  assert.throws(() => classifier.loadWeights({ ...weights,classes:[...weights.classes].reverse() }));
  assert.throws(() => classifier.loadWeights({ ...weights,W1:[NaN] }));
  assert.deepEqual(classifier.exportWeights(),weights,'Rejected weights must not partially alter classifier');

  let membership=true, owned=true;
  const calls: string[]=[];
  const client = { release() {}, async query(sql:string, args?:unknown[]) {
    calls.push(sql);
    if (sql.includes('SELECT 1 FROM organization_members')) return {rows:membership?[{}]:[]};
    if (sql.includes('UPDATE chat_conversations')) {
      assert.ok(sql.includes('organization_id=') && sql.includes('user_id='));
      return {rows:owned?[{}]:[]};
    }
    if (sql.includes('SELECT question,answer')) return {rows:[{question:'new',answer:'answer'},{question:'old',answer:'earlier'}]};
    return {rows:[]};
  } };
  const store = new ConversationStore({ connect:async()=>client } as unknown as Pool);
  const session=await store.begin('org','user');
  assert.deepEqual(session.history.map(m=>m.content),['old','earlier','new','answer']);
  membership=false; calls.length=0;
  await assert.rejects(store.begin('org','other'));
  assert.ok(!calls.some(sql=>sql.includes('INSERT INTO chat_conversations')));
  membership=true; owned=false; calls.length=0;
  await assert.rejects(store.begin('org','other',session.id));
  assert.ok(!calls.some(sql=>sql.includes('SELECT question,answer')));
  await assert.rejects(store.finish(session.id,session.lease,'org','other','question','answer'));
  assert.ok(!calls.some(sql=>sql.includes('INSERT INTO chat_turns')));
}
