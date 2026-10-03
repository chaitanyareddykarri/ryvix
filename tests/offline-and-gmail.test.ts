import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {SystemTopologyGraph} from '../ai/src/graph-rag';
import {scheduledGmailIds,pollScheduledGmail} from '../backend/src/services/gmail-scheduler';
import {repositoryContext} from '../services/src/workspace/repository-context';
import {verifyWithOneRepair} from '../services/src/workspace/repair-checks';

export async function testOfflineAndGmail():Promise<void>{
  const result=spawnSync(process.execPath,['--import','tsx','-e',`
    const assert=require('node:assert/strict');
    const {neuralWeightsStatus}=require('./ai/src/neural-network.ts');
    const {semanticMemory}=require('./ai/src/memory/semantic-memory.ts');
    const {longTermMemory}=require('./ai/src/memory/long-term-memory.ts');
    const {SystemTopologyGraph}=require('./ai/src/graph-rag.ts');
    assert.equal(neuralWeightsStatus.loaded,false);
    assert.match(neuralWeightsStatus.reason,/disabled in production/);
    assert.throws(()=>semanticMemory.recall('test'),/unavailable in production/);
    assert.throws(()=>semanticMemory.remember('test','test'),/unavailable in production/);
    assert.throws(()=>longTermMemory.searchFacts('global','test'),/unavailable in production/);
    assert.throws(()=>new SystemTopologyGraph(true),/unavailable in production/);
  `],{env:{...process.env,NODE_ENV:'production'},encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);
  assert.equal(new SystemTopologyGraph().getNode('svc_node_backend'),undefined);
  const id='11111111-1111-4111-8111-111111111111';
  assert.deepEqual(scheduledGmailIds(`${id},${id}`),[id]);
  assert.throws(()=>scheduledGmailIds(''),/explicit/);
  assert.throws(()=>scheduledGmailIds('invalid'),/explicit/);
  let owned=true,authorized=true,releaseCount=0,unlockCount=0,calls=0;
  const client={query:async(sql:string)=>{
    if(sql.includes('pg_try_advisory_lock'))return {rows:[{owned}]};
    if(sql.includes('pg_advisory_unlock')){unlockCount++;return {rows:[]};}
    assert.match(sql,/m.role IN/);return {rows:authorized?[{organization_id:'org',owner_id:'owner'}]:[]};
  },release:()=>{releaseCount++;}};
  const pool={connect:async()=>client} as any;
  const poll=async(_pool:any,org:string,user:string,connector:string)=>{
    assert.equal(org,'org');assert.equal(user,'owner');assert.equal(connector,id);calls++;
    return {received:0,reviewRequired:true};
  };
  assert.deepEqual(await pollScheduledGmail(pool,[id],new AbortController().signal,poll),{polled:1,failed:0});
  owned=false;await pollScheduledGmail(pool,[id],new AbortController().signal,poll);assert.equal(calls,1);
  owned=true;authorized=false;await pollScheduledGmail(pool,[id],new AbortController().signal,poll);assert.equal(calls,1);
  authorized=true;
  assert.deepEqual(await pollScheduledGmail(pool,[id],new AbortController().signal,async()=>{throw new Error('provider failed');}),{polled:0,failed:1});
  assert.equal(unlockCount,3);assert.equal(releaseCount,4);
  const aborted=new AbortController();aborted.abort();await pollScheduledGmail(pool,[id],aborted.signal,poll);assert.equal(releaseCount,4);
  const entries=[{path:'src/login.ts',size:100},...Array.from({length:15},(_,i)=>({path:`src/other${i}.ts`,size:10})),
    {path:'z/dependency.ts',size:20},{path:'secrets/token.ts',size:10},{path:'src/large.ts',size:40000}];
  const readPaths:string[]=[];
  const context=await repositoryContext(entries,'fix login',async path=>{
    readPaths.push(path);return path==='src/login.ts'?"import {value} from '../z/dependency'; import '../secrets/token';":'export const value=1;';
  });
  assert.equal(context[0].path,'src/login.ts');assert.ok(context.some(f=>f.path==='z/dependency.ts'));
  assert.ok(!readPaths.includes('secrets/token.ts'));assert.ok(!readPaths.includes('src/large.ts'));
  const bounded=await repositoryContext(Array.from({length:20},(_,i)=>({path:`x${i}.ts`,size:30000})),
    'test',async()=> 'x'.repeat(30000));
  assert.ok(bounded.reduce((sum,f)=>sum+Buffer.byteLength(f.content),0)<=160000);
  let repairs=0;const commandsRun:string[]=[];
  const checked=await verifyWithOneRepair(['test','build'],async command=>{
    commandsRun.push(command);return {success:command==='test'||repairs===1,exitCode:command==='build'&&repairs===0?1:0,
      durationMs:1,stdout:'',stderr:'compile failure'};
  },async()=>{repairs++;});
  assert.equal(repairs,1);assert.deepEqual(commandsRun,['test','build','test','build']);
  assert.equal(checked[1].success,true);assert.equal(checked[1].previousAttempts?.[0].success,false);
  repairs=0;
  await assert.rejects(verifyWithOneRepair(['build'],async()=>({success:false,exitCode:1,durationMs:1,stdout:'',stderr:''}),async()=>{repairs++;}),/after one bounded repair/);
  assert.equal(repairs,1);
  await assert.rejects(verifyWithOneRepair(['build'],async()=>{throw new Error('lease lost');},async()=>{throw new Error('must not repair');}),/lease lost/);
}
