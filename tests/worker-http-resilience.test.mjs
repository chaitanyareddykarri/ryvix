import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';

function load(file,require,globals={}){
 const {code}=transformSync(readFileSync(file,'utf8'),{loader:'ts',format:'cjs'});
 const module={exports:{}};
 new Function('require','module','exports',...Object.keys(globals),code)(require,module,module.exports,...Object.values(globals));
 return module.exports;
}

test('worker pools handle idle errors, preserve TLS and never retry queries',async()=>{
 let options,queries=0;const logs=[];
 class Pool extends EventEmitter{
  constructor(config){super();options=config;}
  async query(){queries++;throw new Error('ambiguous disconnect');}
 }
 const {createWorkerPool}=load('scripts/worker-database.ts',()=>({Pool}),{
  process:{env:{DATABASE_URL:'postgresql://fixture@localhost/fixture?sslmode=disable',DATABASE_CA_CERT:'fixture-ca'}},
  console:{error:text=>logs.push(text)}
 });
 const pool=createWorkerPool('Operations',3,15000);
 assert.equal(options.keepAlive,true);assert.equal(options.keepAliveInitialDelayMillis,10000);
 assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.ssl.ca,'fixture-ca');
 assert.equal(options.statement_timeout,15000);assert.equal(options.max,3);
 assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);
 assert.doesNotThrow(()=>pool.emit('error',new Error('private connection details')));
 assert.deepEqual(logs,['Operations worker database connection unavailable.']);
 await assert.rejects(pool.query('UPDATE fixture SET count=count+1'));assert.equal(queries,1);
 for(const name of ['operations','workspace','experience','gmail','whatsapp-assistant']){
  const source=readFileSync(`scripts/${name}-worker.ts`,'utf8');
  assert.match(source,/createWorkerPool\(/);assert.doesNotMatch(source,/new Pool\(/);
 }
});

function analysisFixture(hangAt,cancel=false){
 const timeout=new AbortController(),caller=new AbortController();let calls=0;const signals=[];
 const require=name=>{
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init?.status||200})}};
  if(name==='next/headers')return {cookies:async()=>({get:()=>({value:'fixture-token'}),delete(){}})};
  if(name==='@/utils/tenant-context')return {requireTenant:async()=>({}),RequestError:class extends Error{}};
  if(name==='@/utils/repository-analyzer')return {RepositoryAnalyzer:{analyze:()=>({})}};
  throw new Error(name);
 };
 const route=load('web/app/api/github/repositories/analyze/route.ts',require,{
  AbortSignal:{timeout:ms=>{assert.equal(ms,15000);return timeout.signal;},any:signals=>AbortSignal.any(signals)},
  console:{error(){}},
  fetch:async(url,options)=>{
   calls++;signals.push(options.signal);
   const fail=()=>{(cancel?caller:timeout).abort();return Promise.reject(new Error('private provider failure'));};
   if(calls===hangAt)return fail();
   if(calls===1)return {ok:true,json:async()=>({default_branch:'main'})};
   if(calls===2)return {ok:false,status:500}; // exercise the contents fallback too
   if(calls===3)return {ok:true,json:async()=>[{name:'package.json'}]};
   return {ok:true,text:async()=>{if(hangAt===5)return fail();return '{}';}};
  }
 });
 return {run:()=>route.GET(new Request('http://fixture.test?owner=fixture&repo=app',{signal:caller.signal})),signals};
}

test('repository analysis bounds all four fetch paths and manifest body reads',async()=>{
 for(const stage of [1,2,3,4,5]){
  const fixture=analysisFixture(stage);const result=await fixture.run();
  assert.equal(result.status,504);assert.equal(result.body.success,false);
  assert.match(result.body.error,/timed out/);assert.doesNotMatch(result.body.error,/private/);
  assert.ok(fixture.signals.length>0);assert.ok(fixture.signals.every(s=>s===fixture.signals[0]));
 }
 const success=await analysisFixture(0).run();assert.equal(success.status,200);
 const cancelled=await analysisFixture(4,true).run();assert.equal(cancelled.status,408);
});
