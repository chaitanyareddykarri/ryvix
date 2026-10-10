import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateStaticTree,validateStaticChanges,STATIC_CHECK} from '../services/src/workspace/static-policy';
import {workspaceCapacity} from '../services/src/workspace/host-budget';
import {DockerWorkspaceManager} from '../services/src/workspace/docker-workspace.manager';
const file=(name:string,size=10)=>({path:name,mode:'100644',type:'blob',size});
test('static mode rejects dependencies, executable files, symlinks, traversal and oversized trees',()=>{
  validateStaticTree([file('index.html'),file('assets/main.js')]);
  for(const extra of [file('package.json'),file('.env'),file('../escape.js'),file('a.sh'),file('x.js',32769),
    {...file('link.html'),mode:'120000'},{...file('run.js'),mode:'100755'},{...file('submodule'),type:'commit'}])
    assert.throws(()=>validateStaticTree([file('index.html'),extra]));
  assert.throws(()=>validateStaticTree([file('main.js')]));
  assert.throws(()=>validateStaticTree([file('index.html'),...Array.from({length:64},(_,i)=>file(`${i}.js`))]));
  assert.throws(()=>validateStaticTree([file('index.html'),...Array.from({length:9},(_,i)=>file(`${i}.js`,32768))]));
  for(const change of [{path:'package.json',action:'create',content:'{}'},{path:'index.html',action:'delete'},{path:'a.js',action:'modify',content:'\0'}])
    assert.throws(()=>validateStaticChanges([change]));
});
test('small host budget admits only one bounded session and preserves normal host minimum',async()=>{
  const env={RYVIX_WORKSPACE_MODE:'static',RYVIX_WORKSPACE_MAX_SESSIONS:'1',RYVIX_WORKSPACE_MEMORY_BUDGET_MB:'320',RYVIX_WORKSPACE_CPU_BUDGET:'0.75'};
  const empty=async()=>({exitCode:0,stdout:'',stderr:''});
  assert.equal(await workspaceCapacity(empty,0.25,192,env),true);
  assert.equal(await workspaceCapacity(empty,1,2048,env),false);
  await assert.rejects(workspaceCapacity(empty,0.25,192,{...env,RYVIX_WORKSPACE_MAX_SESSIONS:'2'}));
  await assert.rejects(workspaceCapacity(empty,0.25,192,{...env,RYVIX_WORKSPACE_MODE:'standard'}));
  const inspection=[{Config:{Labels:{'ryvix.workspace':'true','ryvix.session':'s'}},HostConfig:{NanoCpus:250000000,Memory:192*1048576}}];
  assert.equal(await workspaceCapacity(async args=>({exitCode:0,stderr:'',stdout:args[0]==='ps'?'abcdef123456':JSON.stringify(inspection)}),0.25,192,env),false);
});
test('static manager refuses repository command execution and egress before Docker',async()=>{
  const before=process.env.RYVIX_WORKSPACE_MODE;process.env.RYVIX_WORKSPACE_MODE='static';
  try {
    const manager=new DockerWorkspaceManager(async()=>{throw Error('Docker must not run');});
    await assert.rejects(manager.executeCommand('fixture','npm install'),/disabled/);
    await assert.rejects(manager.withRestrictedEgress('fixture',async()=>{}),/outbound/);
    await assert.rejects(manager.startPreview('fixture','node customer.js','https://preview.test'),/trusted/);
    await assert.rejects(manager.createSession({taskId:'t',projectId:'p',baseImage:'node:22-alpine'}),/bounded/);
    await assert.rejects(manager.executeCommand('fixture',STATIC_CHECK),/not active/);
  } finally {if(before===undefined)delete process.env.RYVIX_WORKSPACE_MODE;else process.env.RYVIX_WORKSPACE_MODE=before;}
});
test('trusted static checker parses JS without running it and rejects invalid syntax',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'ryvix-static-test-'));
  try {
    writeFileSync(path.join(folder,'index.html'),'<!doctype html><h1>fixture</h1>');
    writeFileSync(path.join(folder,'app.js'),'throw new Error("must not execute");');
    const tool=path.resolve('infrastructure/workspaces/static-site.cjs');
    assert.equal(spawnSync(process.execPath,[tool,'check'],{cwd:folder}).status,0);
    writeFileSync(path.join(folder,'app.js'),'function ( {');
    assert.notEqual(spawnSync(process.execPath,[tool,'check'],{cwd:folder}).status,0);
    writeFileSync(path.join(folder,'package.json'),'{}');
    assert.notEqual(spawnSync(process.execPath,[tool,'check'],{cwd:folder}).status,0);
  } finally {rmSync(folder,{recursive:true,force:true});}
});
